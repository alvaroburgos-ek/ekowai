/**
 * DIN 1989-2 ("Regenwassernutzungsanlagen — Teil 2: Filter"; DIN 1989-2, 2004) —
 * REAL save-path execution proof.
 *
 * SOURCE NOTICE (corrected 2026-08-02): the dispatch premise said the DIN 1989-2 PDF
 * was NOT in the library; a live disk search this session found it present at
 * C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-1989-2\DIN-1989-2.pdf
 * (reversal reported per R-5). This harness is ENFORCEMENT-ONLY BY DESIGN regardless:
 * it proves gates block both-ways through the real save path; it does NOT verify any
 * threshold against the source. Conditions are verbatim from prod; no numeric value is
 * asserted "correct". Threshold verification against the printed page is a separate task.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES the
 * standard's 17 live BLOCK gates (severity='block' + non-empty condition) by driving
 * each through the REAL enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists
 *                                      the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven
 * ENFORCING only when shown BOTH ways: a persisted state where it does NOT block, and
 * a persisted state where it DOES (the F-4 lesson). Nothing is applied to prod here.
 *
 * COVERED GATE SHAPES (17 gates, all severity='block'):
 *   - existence IS NOT NULL (CR-01, CR-17, CR-11)        : `x IS NOT NULL`
 *   - boolean equality lowercase (CR-02,07,09,10,08,12..15): `flag == true`
 *   - arithmetic-literal RHS compare (CR-03, CR-04)      : `x >= Q * 25`
 *   - simple ordering compare (CR-05, CR-06)             : `x <= literal`
 *   - TRUE no-op literal (CR-16)                         : `TRUE` → always pass (logged)
 *
 * WORKSHEET-LOCAL: every DIN 1989-2 gate operand is a field on that gate's own home
 * worksheet — no cross-worksheet fallback is exercised (unlike A-226). Each gate is
 * therefore proven against checkApprovalGate(<its own home instance>).
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts): NONE of the 4 known engine traps
 * are present — see the header of seed-din1989-2.ts for the itemised result (no
 * field==field RHS; no `!= null` gate; no IN-set; no unparenthesised IF/THEN nest).
 * All 16 enforceable gates reach a definite `fail` in their violating state. CR-16 is a
 * structurally-unenforceable TRUE no-op — driven in its ONE reachable direction and
 * asserted to NEVER block.
 */
// @vitest-environment node
import './_harness-env-din1989-2'; // top-level-await: PG + seedDin19892 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDin19892Harness } from './_harness-env-din1989-2';
import { DIN19892_GATES } from './seed-din1989-2';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getDin19892Harness();

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

/** Persist a symbol→value map to worksheet `ws` (the symbol's HOME worksheet) through
 *  the REAL saveWorksheet. A null value clears the field. */
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

/** Prove a gate ENFORCING both ways: persist the passing saves → NOT blocked;
 *  persist the violating saves → blocked (definite fail). */
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

describe('DIN-1989-2 — seed sanity (topology matches the 17 prod block gates)', () => {
  it('seeds all 4 worksheet instances and 17 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'DIN-1989-2-01', 'DIN-1989-2-02', 'DIN-1989-2-03', 'DIN-1989-2-04',
    ]);
    expect(DIN19892_GATES.length).toBe(17);
    expect(DIN19892_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('DIN-1989-2-01 — Registrierung, Anwendungsbereich und Begriffe', () => {
  it('CR-01  filtertyp IS NOT NULL (existence, enum)', async () => {
    await proveBothWays('DIN-1989-2-01', 'DIN-1989-2-CR-01',
      [{ ws: 'DIN-1989-2-01', values: { filtertyp: 'volumenfilter' } }],
      [{ ws: 'DIN-1989-2-01', values: { filtertyp: null } }]);
  });
  it('CR-17  DN IS NOT NULL (existence, number)', async () => {
    await proveBothWays('DIN-1989-2-01', 'DIN-1989-2-CR-17',
      [{ ws: 'DIN-1989-2-01', values: { DN: 100 } }],
      [{ ws: 'DIN-1989-2-01', values: { DN: null } }]);
  });
  // CR-16 condition = `TRUE` → parses to a bare boolean literal → evaluator returns
  // `pass` unconditionally. It is a STRUCTURALLY-UNENFORCEABLE no-op gate: it cannot be
  // driven to `fail` by any persisted state, so it is proven in its ONE reachable
  // direction (never blocks) and LOGGED as a no-op. It is NOT counted as enforcing.
  it('CR-16  TRUE — no-op gate NEVER blocks (unenforceable, logged)', async () => {
    // Clear the whole worksheet-01 state; the gate must still not block.
    await applySaves([{ ws: 'DIN-1989-2-01', values: { filtertyp: null, DN: null } }]);
    expect(await gateBlocks('DIN-1989-2-01', 'DIN-1989-2-CR-16'),
      'CR-16 (`TRUE`) must never block — it is a no-op literal gate').toBe(false);
    // Populated state: still never blocks.
    await applySaves([{ ws: 'DIN-1989-2-01', values: { filtertyp: 'volumenfilter', DN: 100 } }]);
    expect(await gateBlocks('DIN-1989-2-01', 'DIN-1989-2-CR-16')).toBe(false);
  });
});

describe('DIN-1989-2-02 — Anforderungen an Filter (Werkstoffe, Hydraulik, Trennwirkung)', () => {
  it('CR-02  werkstoff_eignung_nachgewiesen == true (boolean eq, lowercase)', async () => {
    await proveBothWays('DIN-1989-2-02', 'DIN-1989-2-CR-02',
      [{ ws: 'DIN-1989-2-02', values: { werkstoff_eignung_nachgewiesen: true } }],
      [{ ws: 'DIN-1989-2-02', values: { werkstoff_eignung_nachgewiesen: false } }]);
  });
  it('CR-03  V_Rueck_A >= Q * 25 (arithmetic-literal RHS)', async () => {
    await proveBothWays('DIN-1989-2-02', 'DIN-1989-2-CR-03',
      [{ ws: 'DIN-1989-2-02', values: { V_Rueck_A: 250, Q: 10 } }],  // 250 >= 250
      [{ ws: 'DIN-1989-2-02', values: { V_Rueck_A: 100 } }]);        // 100 >= 250 false
  });
  it('CR-04  V_Rueck_B >= Q * 2 (arithmetic-literal RHS)', async () => {
    await proveBothWays('DIN-1989-2-02', 'DIN-1989-2-CR-04',
      [{ ws: 'DIN-1989-2-02', values: { V_Rueck_B: 20, Q: 10 } }],   // 20 >= 20
      [{ ws: 'DIN-1989-2-02', values: { V_Rueck_B: 5 } }]);          // 5 >= 20 false
  });
  it('CR-05  behaeltnis_masse <= 20 (simple ordering)', async () => {
    await proveBothWays('DIN-1989-2-02', 'DIN-1989-2-CR-05',
      [{ ws: 'DIN-1989-2-02', values: { behaeltnis_masse: 15 } }],
      [{ ws: 'DIN-1989-2-02', values: { behaeltnis_masse: 30 } }]);
  });
  it('CR-06  tiefe_gok_griff <= 60 (simple ordering)', async () => {
    await proveBothWays('DIN-1989-2-02', 'DIN-1989-2-CR-06',
      [{ ws: 'DIN-1989-2-02', values: { tiefe_gok_griff: 40 } }],
      [{ ws: 'DIN-1989-2-02', values: { tiefe_gok_griff: 80 } }]);
  });
  it('CR-07  querschnitt_nicht_eingeengt == true (boolean eq)', async () => {
    await proveBothWays('DIN-1989-2-02', 'DIN-1989-2-CR-07',
      [{ ws: 'DIN-1989-2-02', values: { querschnitt_nicht_eingeengt: true } }],
      [{ ws: 'DIN-1989-2-02', values: { querschnitt_nicht_eingeengt: false } }]);
  });
  it('CR-09  dichtheit_eingehalten == true (boolean eq)', async () => {
    await proveBothWays('DIN-1989-2-02', 'DIN-1989-2-CR-09',
      [{ ws: 'DIN-1989-2-02', values: { dichtheit_eingehalten: true } }],
      [{ ws: 'DIN-1989-2-02', values: { dichtheit_eingehalten: false } }]);
  });
  it('CR-10  standsicherheit_eingehalten == true (boolean eq)', async () => {
    await proveBothWays('DIN-1989-2-02', 'DIN-1989-2-CR-10',
      [{ ws: 'DIN-1989-2-02', values: { standsicherheit_eingehalten: true } }],
      [{ ws: 'DIN-1989-2-02', values: { standsicherheit_eingehalten: false } }]);
  });
  it('CR-11  eta_hydr_unbel_doku IS NOT NULL (existence, number)', async () => {
    await proveBothWays('DIN-1989-2-02', 'DIN-1989-2-CR-11',
      [{ ws: 'DIN-1989-2-02', values: { eta_hydr_unbel_doku: 0.9 } }],
      [{ ws: 'DIN-1989-2-02', values: { eta_hydr_unbel_doku: null } }]);
  });
});

describe('DIN-1989-2-03 — Pruefungen (hydraulischer Wirkungsgrad und Filtertrennwirkung)', () => {
  it('CR-08  filtertrennwirkung_nachgewiesen == true (boolean eq)', async () => {
    await proveBothWays('DIN-1989-2-03', 'DIN-1989-2-CR-08',
      [{ ws: 'DIN-1989-2-03', values: { filtertrennwirkung_nachgewiesen: true } }],
      [{ ws: 'DIN-1989-2-03', values: { filtertrennwirkung_nachgewiesen: false } }]);
  });
});

describe('DIN-1989-2-04 — Kennzeichnung, Konformitaetsbewertung, Einbau/Betrieb/Wartung', () => {
  it('CR-12  erstpruefung_bestanden == true (boolean eq)', async () => {
    await proveBothWays('DIN-1989-2-04', 'DIN-1989-2-CR-12',
      [{ ws: 'DIN-1989-2-04', values: { erstpruefung_bestanden: true } }],
      [{ ws: 'DIN-1989-2-04', values: { erstpruefung_bestanden: false } }]);
  });
  it('CR-13  wpk_eingerichtet == true (boolean eq)', async () => {
    await proveBothWays('DIN-1989-2-04', 'DIN-1989-2-CR-13',
      [{ ws: 'DIN-1989-2-04', values: { wpk_eingerichtet: true } }],
      [{ ws: 'DIN-1989-2-04', values: { wpk_eingerichtet: false } }]);
  });
  it('CR-14  kennzeichnung_vollstaendig == true (boolean eq)', async () => {
    await proveBothWays('DIN-1989-2-04', 'DIN-1989-2-CR-14',
      [{ ws: 'DIN-1989-2-04', values: { kennzeichnung_vollstaendig: true } }],
      [{ ws: 'DIN-1989-2-04', values: { kennzeichnung_vollstaendig: false } }]);
  });
  it('CR-15  anleitung_vorhanden == true (boolean eq)', async () => {
    await proveBothWays('DIN-1989-2-04', 'DIN-1989-2-CR-15',
      [{ ws: 'DIN-1989-2-04', values: { anleitung_vorhanden: true } }],
      [{ ws: 'DIN-1989-2-04', values: { anleitung_vorhanden: false } }]);
  });
});
