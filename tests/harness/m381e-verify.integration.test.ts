/**
 * DWA-M-381E ("Eindickung von Klärschlamm" / Thickening of sewage sludge; Merkblatt
 * DWA-M 381E, October 2007, English edition ISBN 978-3-941897-43-4) — REAL save-path
 * execution proof.
 *
 * SOURCE-ABSENT NOTICE: the DWA-M-381E source PDF is NOT in the library. This harness
 * proves ENFORCEMENT (gates block both-ways through the real save path); it does NOT verify
 * any threshold against a source, because there is none. Conditions are verbatim from prod;
 * no numeric value is asserted to be "correct".
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES the standard's
 * 20 live BLOCK gates (severity='block' + non-empty condition) by driving each DRIVABLE gate
 * through the REAL enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists the
 *                                      ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven
 * ENFORCING only when shown BOTH ways: a persisted state where it does NOT block, and a
 * persisted state where it DOES (the F-4 lesson). Nothing is applied to prod here.
 *
 * METRIC: 17 of 20 block gates are DRIVABLE both-ways and proven enforcing below. The other
 * 3 are structural no-ops that CANNOT reach `fail` and are documented (not "green") as such:
 *   - CR-017 `TRUE`  (M381E-07) — literal always-pass.
 *   - CR-018 `TRUE`  (M381E-07) — literal always-pass.
 *   - CR-020 `separate_liquor_treatment IN {true,false}` (M381E-09) — membership over the
 *     complete boolean domain; every non-null value passes, null → pending, never `fail`.
 * The "no-op gates" describe block below drives their PASS direction and asserts they never
 * enter the failing list — the executable form of the finding.
 *
 * COVERED GATE SHAPES (17 drivable):
 *   - two-conjunct existence IS NOT NULL (CR-001, CR-015)
 *   - single existence IS NOT NULL      (CR-016, CR-019, CR-010)
 *   - numeric range AND                 (CR-002, CR-007, CR-008, CR-012)
 *   - simple ordering compare           (CR-003, CR-004, CR-005, CR-011, CR-014)
 *   - arithmetic sum compare            (CR-006  H >= H_W + H_S + H_R)
 *   - boolean equality                  (CR-009  == true)
 *   - enum-equality AND boolean-equality (CR-013  reuse_pathway == 'agricultural' AND pam_used == false)
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod values): NONE of the 4 known
 * engine traps are present — see the header of seed-m381e.ts for the itemised result. All 17
 * drivable gates reach a definite `fail` in their violating state.
 */
// @vitest-environment node
import './_harness-env-m381e'; // top-level-await: PG + seedM381e BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM381eHarness } from './_harness-env-m381e';
import { M381E_GATES } from './seed-m381e';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM381eHarness();

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string | null;

/** Persist a symbol→value map to worksheet `ws` (the symbol's HOME worksheet) through the
 *  REAL saveWorksheet. A null value clears the field. */
async function saveSymbols(ws: string, values: Record<string, Val>): Promise<void> {
  const batch: Record<string, { type: string; value: Val }> = {};
  for (const [symbol, value] of Object.entries(values)) {
    const meta = fixture.fieldMeta[`${ws}:${symbol}`];
    if (!meta) throw new Error(`seed gap: no field for ${ws}:${symbol}`);
    batch[meta.fieldId] = { type: meta.dataType, value };
  }
  const res = await saveWorksheet({
    instanceId: fixture.instances[ws],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: batch as any,
  });
  expect(res.ok, `saveWorksheet(${ws}) failed: ${JSON.stringify(res)}`).toBe(true);
}

type Save = { ws: string; values: Record<string, Val> };
async function applySaves(saves: Save[]): Promise<void> {
  for (const s of saves) await saveSymbols(s.ws, s.values);
}

/** Whether `code` is in the block-gate failing list for worksheet `gateWs` given the
 *  CURRENT persisted project state (the real approval-gate read path). */
async function gateBlocks(gateWs: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[gateWs]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

/** Prove a gate ENFORCING both ways: persist the passing saves → NOT blocked; persist the
 *  violating saves → blocked (definite fail). */
async function proveBothWays(
  gateWs: string,
  code: string,
  passSaves: Save[],
  violateSaves: Save[],
): Promise<void> {
  await applySaves(passSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} should NOT block in passing state`).toBe(false);
  await applySaves(violateSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} SHOULD block in violating state`).toBe(true);
}

describe('DWA-M-381E — seed sanity (topology matches the 20 prod block gates)', () => {
  it('seeds all 10 worksheet instances and 20 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'M381E-01', 'M381E-02', 'M381E-03', 'M381E-04', 'M381E-05',
      'M381E-06', 'M381E-07', 'M381E-08', 'M381E-09', 'M381E-10',
    ]);
    expect(M381E_GATES.length).toBe(20);
    expect(M381E_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('DWA-M-381E — M381E-01 Anmeldung und Verfahrenswahl', () => {
  it('CR-001  thickening_principle IS NOT NULL AND sludge_type IS NOT NULL (two-conjunct existence)', async () => {
    await proveBothWays('M381E-01', 'CR-001',
      [{ ws: 'M381E-01', values: { thickening_principle: 'gravity', sludge_type: 'primary' } }],
      [{ ws: 'M381E-01', values: { sludge_type: null } }]); // second conjunct fails
  });
});

describe('DWA-M-381E — M381E-02 Schlammcharakterisierung und Eingangslasten', () => {
  it('CR-015  TS_percent IS NOT NULL AND TSS_In IS NOT NULL (two-conjunct existence)', async () => {
    await proveBothWays('M381E-02', 'CR-015',
      [{ ws: 'M381E-02', values: { TS_percent: 4, TSS_In: 35 } }],
      [{ ws: 'M381E-02', values: { TS_percent: null } }]); // first conjunct fails
  });
});

describe('DWA-M-381E — M381E-03 Bemessung Schwerkrafteindickung', () => {
  it('CR-002  SLR > 0 AND SLR <= 100 (range)', async () => {
    await proveBothWays('M381E-03', 'CR-002',
      [{ ws: 'M381E-03', values: { SLR: 50 } }],
      [{ ws: 'M381E-03', values: { SLR: 150 } }]); // above upper bound → AND false
  });
  it('CR-003  t_d <= 1.5', async () => {
    await proveBothWays('M381E-03', 'CR-003',
      [{ ws: 'M381E-03', values: { t_d: 1 } }],
      [{ ws: 'M381E-03', values: { t_d: 2 } }]);
  });
  it('CR-004  H_W >= 1.0', async () => {
    await proveBothWays('M381E-03', 'CR-004',
      [{ ws: 'M381E-03', values: { H_W: 1.5 } }],
      [{ ws: 'M381E-03', values: { H_W: 0.5 } }]);
  });
  it('CR-005  H_R >= 0.3', async () => {
    await proveBothWays('M381E-03', 'CR-005',
      [{ ws: 'M381E-03', values: { H_R: 0.5 } }],
      [{ ws: 'M381E-03', values: { H_R: 0.1 } }]);
  });
  it('CR-006  H >= H_W + H_S + H_R (arithmetic sum)', async () => {
    await proveBothWays('M381E-03', 'CR-006',
      [{ ws: 'M381E-03', values: { H: 5, H_W: 1.5, H_S: 1, H_R: 0.5 } }],   // 5 >= 3.0
      [{ ws: 'M381E-03', values: { H: 2, H_W: 1.5, H_S: 1, H_R: 0.5 } }]);  // 2 >= 3.0 false
  });
  it('CR-016  floor_slope IS NOT NULL (existence)', async () => {
    await proveBothWays('M381E-03', 'CR-016',
      [{ ws: 'M381E-03', values: { floor_slope: 30 } }],
      [{ ws: 'M381E-03', values: { floor_slope: null } }]);
  });
});

describe('DWA-M-381E — M381E-04 Bemessung Flotationseindickung', () => {
  it('CR-007  q_A >= 1 AND q_A <= 7.5 (range)', async () => {
    await proveBothWays('M381E-04', 'CR-007',
      [{ ws: 'M381E-04', values: { q_A: 4 } }],
      [{ ws: 'M381E-04', values: { q_A: 10 } }]);
  });
  it('CR-008  SLR_fl >= 5 AND SLR_fl <= 20 (range)', async () => {
    await proveBothWays('M381E-04', 'CR-008',
      [{ ws: 'M381E-04', values: { SLR_fl: 12 } }],
      [{ ws: 'M381E-04', values: { SLR_fl: 25 } }]);
  });
});

describe('DWA-M-381E — M381E-05 Bemessung mechanische Eindickung', () => {
  it('CR-009  flocculation_unit_present == true (boolean equality)', async () => {
    await proveBothWays('M381E-05', 'CR-009',
      [{ ws: 'M381E-05', values: { flocculation_unit_present: true } }],
      [{ ws: 'M381E-05', values: { flocculation_unit_present: false } }]);
  });
});

describe('DWA-M-381E — M381E-07 Konditionierung / Polymerdosierung', () => {
  it('CR-013  reuse_pathway == agricultural AND pam_used == false (enum-eq AND bool-eq)', async () => {
    await proveBothWays('M381E-07', 'CR-013',
      [{ ws: 'M381E-07', values: { reuse_pathway: 'agricultural', pam_used: false } }],
      [{ ws: 'M381E-07', values: { pam_used: true } }]); // second conjunct false
  });
  it('CR-014  conditioner_fraction <= 0.5', async () => {
    await proveBothWays('M381E-07', 'CR-014',
      [{ ws: 'M381E-07', values: { conditioner_fraction: 0.3 } }],
      [{ ws: 'M381E-07', values: { conditioner_fraction: 0.8 } }]);
  });
  it('CR-019  specific_flocculant_demand IS NOT NULL (existence)', async () => {
    await proveBothWays('M381E-07', 'CR-019',
      [{ ws: 'M381E-07', values: { specific_flocculant_demand: 10 } }],
      [{ ws: 'M381E-07', values: { specific_flocculant_demand: null } }]);
  });
});

describe('DWA-M-381E — M381E-08 Leistungsdaten und Nachweis', () => {
  it('CR-010  eta IS NOT NULL (existence)', async () => {
    await proveBothWays('M381E-08', 'CR-010',
      [{ ws: 'M381E-08', values: { eta: 90 } }],
      [{ ws: 'M381E-08', values: { eta: null } }]);
  });
  it('CR-011  eta >= 85', async () => {
    await proveBothWays('M381E-08', 'CR-011',
      [{ ws: 'M381E-08', values: { eta: 90 } }],
      [{ ws: 'M381E-08', values: { eta: 80 } }]);
  });
  it('CR-012  eta >= 92 AND eta <= 96 (range)', async () => {
    await proveBothWays('M381E-08', 'CR-012',
      [{ ws: 'M381E-08', values: { eta: 94 } }],
      [{ ws: 'M381E-08', values: { eta: 90 } }]); // below lower bound → AND false
  });
});

/**
 * The three no-op block gates — driven the PASS way and asserted UN-VIOLATABLE. This is the
 * executable form of the finding: these gates FIRE (they are severity='block', non-empty
 * condition) but can never enter the failing list, so they enforce nothing.
 */
describe('DWA-M-381E — non-drivable / TRUE no-op block gates (LOGGED, cannot reach fail)', () => {
  it('CR-017  TRUE — literal always-pass; never blocks', async () => {
    // Nothing to save; a literal TRUE evaluates to pass regardless of state.
    expect(await gateBlocks('M381E-07', 'CR-017')).toBe(false);
  });
  it('CR-018  TRUE — literal always-pass; never blocks', async () => {
    expect(await gateBlocks('M381E-07', 'CR-018')).toBe(false);
  });
  it('CR-020  separate_liquor_treatment IN {true,false} — total boolean domain, never fails', async () => {
    // Both booleans PASS (matched) …
    await applySaves([{ ws: 'M381E-09', values: { separate_liquor_treatment: true } }]);
    expect(await gateBlocks('M381E-09', 'CR-020'), 'true is in {true,false} → pass').toBe(false);
    await applySaves([{ ws: 'M381E-09', values: { separate_liquor_treatment: false } }]);
    expect(await gateBlocks('M381E-09', 'CR-020'), 'false is in {true,false} → pass').toBe(false);
    // … and null → pending (not a fail), so the gate STILL does not block.
    await applySaves([{ ws: 'M381E-09', values: { separate_liquor_treatment: null } }]);
    expect(await gateBlocks('M381E-09', 'CR-020'), 'null → pending, not fail').toBe(false);
    // There is no boolean value outside {true,false} → the gate can never reach `fail`.
  });
});
