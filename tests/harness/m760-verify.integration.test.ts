/**
 * DWA-M-760 (Fetthaltiges Abwasser; Weißdruck, April 2025) — REAL save-path
 * execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES each
 * of the standard's 7 live BLOCK gates (non-empty condition) by driving it through
 * the REAL enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists
 *                                      the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven
 * ENFORCING only when shown BOTH ways: a persisted state where it does NOT block, and
 * a persisted state where it DOES (the F-4 lesson). Conditions verbatim from prod;
 * nothing is applied to prod here.
 *
 * COVERED GATE SHAPES:
 *   - existence AND existence                     REQ-M760-01 (branchentyp, einleitungsart)
 *   - multi-term numeric band/limits              REQ-M760-04 (pH 6,5..10; T; AOX; lipophil; sed)
 *   - single numeric limit + DUPLICATE codes      REQ-M760-08 / REQ-M760-08-2 (H2S <= 5 ppm)
 *   - two-limit AND                               REQ-M760-10 on M760-10
 *   - existence AND existence via CROSS-WS fallback  REQ-M760-09 on M760-18 (ns, bauform)
 *   - three-limit AND via CROSS-WS fallback       REQ-M760-10 on M760-19 (dup code, different cond)
 *
 * DRAFT-FIX (NOT live in prod — headline SEV-1 gap): REQ-M760-13 sizing gate
 * (`ns_fettabscheider - NS >= 0`). Driven to prove the drafted subtraction-form fix
 * enforces AND to demonstrate that the live presence-only REQ-M760-09 lets an
 * undersized separator (ns < NS) through while REQ-M760-13 blocks it.
 */
// @vitest-environment node
import './_harness-env-m760'; // top-level-await: PG + seedM760 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM760Harness } from './_harness-env-m760';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM760Harness();

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

/** Persist a symbol→value map to worksheet `ws` through the REAL saveWorksheet,
 *  resolving each symbol against ITS home worksheet (`ws:symbol` key). A null value
 *  clears the field — used to VIOLATE existence gates. */
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

/** Whether `code` is in the block-gate failing list for worksheet `ws` given the
 *  CURRENT persisted project state (the real approval-gate read path). */
async function gateBlocks(ws: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[ws]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

/** Prove a gate ENFORCING both ways: persist the passing saves → NOT blocked;
 *  persist the violating saves → blocked (definite fail). Saves may span multiple
 *  worksheets (cross-worksheet fallback gates). */
async function proveBothWays(
  gateWs: string,
  code: string,
  passSaves: Save[],
  violateSaves: Save[],
): Promise<void> {
  await applySaves(passSaves);
  expect(await gateBlocks(gateWs, code), `${code} should NOT block in passing state`).toBe(false);
  await applySaves(violateSaves);
  expect(await gateBlocks(gateWs, code), `${code} SHOULD block in violating state`).toBe(true);
}

describe('DWA-M-760 — M760-01 Projektregistrierung (Anwendungsbereich)', () => {
  it('REQ-M760-01  branchentyp IS NOT NULL AND einleitungsart IS NOT NULL (§1)', async () => {
    await proveBothWays('M760-01', 'REQ-M760-01',
      [{ ws: 'M760-01', values: { branchentyp: 'grosskueche', einleitungsart: 'indirekt' } }],
      // clear branchentyp → existence fails → definite fail → blocks
      [{ ws: 'M760-01', values: { branchentyp: null } }]);
  });
  it('REQ-M760-01  ALSO blocks when einleitungsart is cleared', async () => {
    await saveSymbols('M760-01', { branchentyp: 'grosskueche', einleitungsart: 'indirekt' });
    expect(await gateBlocks('M760-01', 'REQ-M760-01')).toBe(false);
    await saveSymbols('M760-01', { einleitungsart: null });
    expect(await gateBlocks('M760-01', 'REQ-M760-01')).toBe(true);
  });
});

describe('DWA-M-760 — M760-04 Rechtliche Rahmenbedingungen (Tab.3 / DWA-M 115-2)', () => {
  it('REQ-M760-04  pH 6,5..10 AND T<=35 AND AOX<=1 AND lipophil<=300 AND sed<=10', async () => {
    await proveBothWays('M760-04', 'REQ-M760-04',
      [{ ws: 'M760-04', values: { ph_wert: 7.5, t_abwasser: 30, c_aox: 0.5, c_lipophil: 200, sed_stoffe: 5 } }],
      [{ ws: 'M760-04', values: { ph_wert: 11 } }]); // above 10 → block
  });
  it('REQ-M760-04  ALSO blocks below the pH lower bound (6,0 < 6,5)', async () => {
    await saveSymbols('M760-04', { ph_wert: 7.5, t_abwasser: 30, c_aox: 0.5, c_lipophil: 200, sed_stoffe: 5 });
    expect(await gateBlocks('M760-04', 'REQ-M760-04')).toBe(false);
    await saveSymbols('M760-04', { ph_wert: 6.0 });
    expect(await gateBlocks('M760-04', 'REQ-M760-04')).toBe(true);
  });
  it('REQ-M760-04  ALSO blocks when lipophilic load exceeds 300 mg/l', async () => {
    await saveSymbols('M760-04', { ph_wert: 7.5, c_lipophil: 200 });
    expect(await gateBlocks('M760-04', 'REQ-M760-04')).toBe(false);
    await saveSymbols('M760-04', { c_lipophil: 350 }); // > 300 → block
    expect(await gateBlocks('M760-04', 'REQ-M760-04')).toBe(true);
  });
});

describe('DWA-M-760 — M760-08 H2S workplace limit (AGW 5 ppm, §8.2.8)', () => {
  it('REQ-M760-08  c_h2s_ppm <= 5', async () => {
    await proveBothWays('M760-08', 'REQ-M760-08',
      [{ ws: 'M760-08', values: { c_h2s_ppm: 3 } }],
      [{ ws: 'M760-08', values: { c_h2s_ppm: 8 } }]);
  });
  it('REQ-M760-08-2  c_h2s_ppm <= 5 (DUPLICATE gate — both live, both enforce)', async () => {
    await proveBothWays('M760-08', 'REQ-M760-08-2',
      [{ ws: 'M760-08', values: { c_h2s_ppm: 3 } }],
      [{ ws: 'M760-08', values: { c_h2s_ppm: 8 } }]);
  });
});

describe('DWA-M-760 — M760-10 Praxishinweise (Entleer-/Generalinspektionsintervall)', () => {
  it('REQ-M760-10  entleerintervall_d <= 30 AND generalinspektion_intervall_a <= 5', async () => {
    await proveBothWays('M760-10', 'REQ-M760-10',
      [{ ws: 'M760-10', values: { entleerintervall_d: 14, generalinspektion_intervall_a: 5 } }],
      [{ ws: 'M760-10', values: { entleerintervall_d: 45 } }]); // > 30 → block
  });
  it('REQ-M760-10  ALSO blocks when general-inspection interval exceeds 5 a', async () => {
    await saveSymbols('M760-10', { entleerintervall_d: 14, generalinspektion_intervall_a: 5 });
    expect(await gateBlocks('M760-10', 'REQ-M760-10')).toBe(false);
    await saveSymbols('M760-10', { generalinspektion_intervall_a: 6 });
    expect(await gateBlocks('M760-10', 'REQ-M760-10')).toBe(true);
  });
});

describe('DWA-M-760 — M760-18 Weitergehende Behandlung (presence sizing gate, cross-ws)', () => {
  it('REQ-M760-09  ns_fettabscheider IS NOT NULL AND bauform_fa IS NOT NULL (fallback from M760-15)', async () => {
    // Both symbols live on M760-15 (not M760-18) → resolved via project-wide fallback.
    await proveBothWays('M760-18', 'REQ-M760-09',
      [{ ws: 'M760-15', values: { ns_fettabscheider: 10, bauform_fa: 'getrennt' } }],
      // clear bauform_fa → existence fails via fallback → definite fail → blocks
      [{ ws: 'M760-15', values: { bauform_fa: null } }]);
  });
});

describe('DWA-M-760 — M760-19 Bau und Einbau (3-limit intervals, cross-ws + dup code)', () => {
  it('REQ-M760-10  entleerintervall<=30 AND wartung<=1 AND generalinspektion<=5 (fallback from M760-10)', async () => {
    await proveBothWays('M760-19', 'REQ-M760-10',
      [{ ws: 'M760-10', values: { entleerintervall_d: 14, wartung_intervall_a: 1, generalinspektion_intervall_a: 5 } }],
      [{ ws: 'M760-10', values: { wartung_intervall_a: 2 } }]); // > 1 → block
  });
});

/**
 * DRAFT FIX — the SEV-1 headline gap. REQ-M760-13 is NOT live in prod (the migration
 * 20260708210000 is WRITTEN-NOT-APPLIED). These cases prove the drafted subtraction-form
 * gate would ENFORCE, and expose the gap in the live presence-only gate.
 */
describe('DWA-M-760 — DRAFT REQ-M760-13 sizing gate (ns >= NS) — NOT LIVE IN PROD', () => {
  it('REQ-M760-13  ns_fettabscheider - NS >= 0 enforces both ways (numeric acompare)', async () => {
    await proveBothWays('M760-15', 'REQ-M760-13',
      [{ ws: 'M760-15', values: { ns_fettabscheider: 10, NS: 7 } }], // 10-7=3 >= 0 → pass
      [{ ws: 'M760-15', values: { ns_fettabscheider: 4 } }]);        // 4-7=-3 < 0 → block
  });
  it('GAP: an undersized separator (ns=4 < NS=7) is NOT caught by the live presence gate REQ-M760-09, but IS caught by the draft REQ-M760-13', async () => {
    // Persist an undersized-but-present configuration.
    await saveSymbols('M760-15', { ns_fettabscheider: 4, NS: 7, bauform_fa: 'getrennt' });
    // Live presence-only gate on M760-18: both symbols present → does NOT block (the gap).
    expect(await gateBlocks('M760-18', 'REQ-M760-09'),
      'live presence gate lets ns < NS through').toBe(false);
    // Drafted enforcing gate on M760-15: ns - NS = -3 < 0 → blocks (the fix).
    expect(await gateBlocks('M760-15', 'REQ-M760-13'),
      'draft sizing gate catches ns < NS').toBe(true);
  });
  it('REQ-M760-13  stays PENDING (never false-fail) when NS is unfilled', async () => {
    // Fresh separator size but clear NS → arithmetic operand missing → pending, not fail.
    await saveSymbols('M760-15', { ns_fettabscheider: 10, NS: null });
    expect(await gateBlocks('M760-15', 'REQ-M760-13'),
      'missing NS must not produce a false block').toBe(false);
  });
});
