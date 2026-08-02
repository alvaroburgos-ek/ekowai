/**
 * DWA-A-138-1 — the GOLD-COPY reference standard — CONSOLIDATED EXECUTION-PROOF
 * harness. The ONE owned standard that lacked the uniform both-ways harness the
 * other 70 have; this is that harness.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. A single green run
 * proves the whole standard:
 *   (C) each of the 29 BLOCK gates driven BOTH ways through the REAL enforcement
 *       chain against a disposable embedded Postgres —
 *         saveWorksheet(instance, values) → project_parameters
 *         checkApprovalGate(instance)     → replays each block condition, lists fails
 *       a PASS state (not blocked) and a VIOLATE state (definite fail) per gate, so
 *       a gate that fires but never enforces (the F-4 lesson) cannot hide.
 *       `checkApprovalGate` is the SAME read path the deployed app uses to refuse
 *       the `engineer_approve` transition (src/lib/actions/approval-gate.ts).
 *   (B) each of the 46 equations driven through the REAL `evaluateFormula`, kind
 *       recorded (computed / manual_required / error) and asserted.
 *   + the 6 WARN gates shown never-block; + undriven-block-gate list empty (29/29).
 *
 * 138-SPECIFIC ENGINE FACTS (NOT defects): `D` is engine-injected (harness feeds it
 * as an input); `r_D(n)`/`r_5(n)`/`r_D(n_R)`/`r_D(T_n_Ue)` are rewritten by
 * normalize-formula.ts to the `_`-accessor form; `pi` resolves via CONSTANTS.
 *
 * Conditions + formula strings verbatim from prod; NOTHING is applied to prod.
 */
// @vitest-environment node
import './_harness-env-a138'; // top-level-await: PG + seedA138 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getA138Harness } from './_harness-env-a138';
import { evaluateFormula, type EvalState } from '@/lib/eval/formula';
import {
  A138_BLOCK_GATES, A138_WARN_GATES, A138_EQUATIONS, A138_VALS,
} from './seed-a138';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getA138Harness();
const sql = harness.sql;

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  // Compact per-equation kind table (the B deliverable), printed from the RUN.
  const rows = eqKinds.map((r) => `  ${r.kind.padEnd(16)} ${r.out.padEnd(12)} ${r.anchor}`);
  // eslint-disable-next-line no-console
  console.log(
    `\n[A138-EQ-KINDS] ${eqKinds.length}/46 driven — `
    + `computed=${eqKinds.filter((r) => r.kind === 'computed').length} `
    + `manual_required=${eqKinds.filter((r) => r.kind === 'manual_required').length} `
    + `error=${eqKinds.filter((r) => r.kind === 'error').length}\n`
    + rows.join('\n'),
  );
  // eslint-disable-next-line no-console
  console.log(`[A138-GATES] block gates driven both-ways: ${driven.size}/29`);
  await harness.stop();
});

// ── shared helpers (mirror the M-820-1 reference harness) ────────────────────
type Val = number | boolean | string | null | Record<string, unknown>;
type Save = { ws: string; values: Record<string, Val> };

/** Persist symbols to their HOME worksheet through the REAL saveWorksheet. */
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
async function applySaves(saves: Save[]): Promise<void> {
  for (const s of saves) await saveSymbols(s.ws, s.values);
}
/** Whether `code` is in the block-gate failing list for worksheet `ws` given the
 *  CURRENT persisted project state (the real approval-gate read path). */
async function gateBlocks(ws: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[ws]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

const driven = new Set<string>();
/** Prove a gate ENFORCING both ways: passing saves → NOT blocked; violating
 *  saves → blocked (definite fail). Records the code as driven for the 29/29 audit. */
async function proveBothWays(gateWs: string, code: string, passSaves: Save[], violateSaves: Save[]): Promise<void> {
  await applySaves(passSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} should NOT block in passing state`).toBe(false);
  await applySaves(violateSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} SHOULD block in violating state`).toBe(true);
  driven.add(code);
}

// ── B. EQUATIONS — drive all 46 through the REAL evaluateFormula ─────────────
const eqKinds: Array<{ out: string; kind: string; anchor: string }> = [];
function runEq(e: (typeof A138_EQUATIONS)[number]): EvalState {
  // A fresh equationId that matches NO registered aggregator/rewrite/profile
  // (those are keyed by prod UUIDs) → the pure arithmetic path runs.
  return evaluateFormula({
    equationId: `a138-harness-${e.out}-${Math.random().toString(36).slice(2)}`,
    formula: e.formula,
    inputSymbols: e.need,
    outputSymbol: e.out,
    inputs: e.need.map((s) => ({ symbol: s, value: s in A138_VALS ? A138_VALS[s] : null, unit: null })),
  });
}

describe('DWA-A-138-1 — B. all 46 equations through the REAL evaluateFormula', () => {
  it('drives every equation and records its kind (computed / manual_required / error)', () => {
    for (const e of A138_EQUATIONS) {
      const r = runEq(e);
      eqKinds.push({ out: e.out, kind: r.kind, anchor: e.anchor });
      expect(r.kind, `${e.out} (${e.anchor}) expected ${e.kind}, got ${r.kind}`).toBe(e.kind);
      if (e.kind === 'computed' && r.kind === 'computed') {
        expect(Number.isFinite(r.value), `${e.out} value not finite`).toBe(true);
        if (e.expect !== undefined) expect(r.value).toBeCloseTo(e.expect, 6);
      }
    }
  });
  it('classification totals: 37 computed / 8 manual_required / 1 error (reference-clean)', () => {
    const c = (k: string) => A138_EQUATIONS.filter((e) => e.kind === k).length;
    expect(A138_EQUATIONS.length).toBe(46);
    expect(c('computed')).toBe(37);
    expect(c('manual_required')).toBe(8);
    expect(c('error')).toBe(1);
  });
});

// ── C. seed sanity ───────────────────────────────────────────────────────────
describe('DWA-A-138-1 — seed sanity (live topology mirrored)', () => {
  it('28 worksheet instances, 35 gates (29 block + 6 warn), 41 gate fields', async () => {
    const [{ n: nInst }] = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM worksheet_instances WHERE project_id = ${fixture.projectId}`;
    expect(nInst).toBe(28);
    const [{ n: nBlock }] = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM compliance_requirements c
      JOIN worksheet_templates t ON t.id = c.worksheet_template_id
      JOIN standards s ON s.id = t.standard_id
      WHERE s.id = ${fixture.standardId} AND c.severity = 'block'`;
    expect(nBlock).toBe(29);
    const [{ n: nWarn }] = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM compliance_requirements c
      JOIN worksheet_templates t ON t.id = c.worksheet_template_id
      WHERE t.standard_id = ${fixture.standardId} AND c.severity = 'warn'`;
    expect(nWarn).toBe(6);
    expect(Object.keys(fixture.fieldMeta).length).toBe(41);
  });
});

// ── C. 29 BLOCK gates BOTH WAYS through saveWorksheet → checkApprovalGate ─────
const jSurf = { rows: [{ A_E: 100, C: 0.9 }] };
const jTab = { rows: [{ D: 10, r: 200 }] };

describe('DWA-A-138-1 — Phase 1/2 scope & data gates', () => {
  it('REQ-01  a138_applicable == TRUE', () =>
    proveBothWays('A138-01', 'A138-REQ-01',
      [{ ws: 'A138-01', values: { a138_applicable: true } }],
      [{ ws: 'A138-01', values: { a138_applicable: false } }]));
  it('REQ-02  feasibility_determination IN {feasible, conditional}', () =>
    proveBothWays('A138-02', 'A138-REQ-02',
      [{ ws: 'A138-02', values: { feasibility_determination: 'feasible' } }],
      [{ ws: 'A138-02', values: { feasibility_determination: 'not_feasible' } }]));
  it('REQ-03  k_f IS NOT NULL AND permeability_test_method IS NOT NULL (cross-worksheet)', () =>
    proveBothWays('A138-04', 'A138-REQ-03',
      [{ ws: 'A138-05', values: { k_f: 1e-5 } }, { ws: 'A138-03', values: { permeability_test_method: 'feldversuch' } }],
      [{ ws: 'A138-03', values: { permeability_test_method: null } }]));
  it('REQ-04  gw_clearance >= 1.0', () =>
    proveBothWays('A138-02', 'A138-REQ-04',
      [{ ws: 'A138-02', values: { gw_clearance: 1.5 } }],
      [{ ws: 'A138-02', values: { gw_clearance: 0.5 } }]));
  it('REQ-05  r_D_n_table IS NOT NULL AND kostra_grid_cell IS NOT NULL (json carrier + cross-worksheet)', () =>
    proveBothWays('A138-04', 'A138-REQ-05',
      [{ ws: 'A138-04', values: { r_D_n_table: jTab } }, { ws: 'A138-01', values: { kostra_grid_cell: '7130-21' } }],
      [{ ws: 'A138-04', values: { r_D_n_table: null } }]));
  it('REQ-06  surface_inventory IS NOT NULL (json carrier)', () =>
    proveBothWays('A138-07', 'A138-REQ-06',
      [{ ws: 'A138-07', values: { surface_inventory: jSurf } }],
      [{ ws: 'A138-07', values: { surface_inventory: null } }]));
  it('REQ-07  belastungskategorie IS NOT NULL', () =>
    proveBothWays('A138-06', 'A138-REQ-07',
      [{ ws: 'A138-06', values: { belastungskategorie: 'BK_I' } }],
      [{ ws: 'A138-06', values: { belastungskategorie: null } }]));
  it('REQ-08  n IN {0.1, 0.2, 0.33, 0.5} (numeric membership)', () =>
    proveBothWays('A138-08', 'A138-REQ-08',
      [{ ws: 'A138-08', values: { n: 0.2 } }],
      [{ ws: 'A138-08', values: { n: 0.25 } }]));
  it('REQ-09  phase_2_gate_result IN {PASS, CONDITIONAL}', () =>
    proveBothWays('A138-09', 'A138-REQ-09',
      [{ ws: 'A138-09', values: { phase_2_gate_result: 'PASS' } }],
      [{ ws: 'A138-09', values: { phase_2_gate_result: 'FAIL' } }]));
});

describe('DWA-A-138-1 — Phase 3 general-calc gate', () => {
  it('REQ-15  q_S_AC >= 2 AND (q_S_AC > 5 OR f_Z == 1.2)  (cross-worksheet, disjunction)', () =>
    proveBothWays('A138-10', 'A138-REQ-15',
      [{ ws: 'A138-13', values: { q_S_AC: 6 } }, { ws: 'A138-08', values: { f_Z: 1.0 } }],
      [{ ws: 'A138-13', values: { q_S_AC: 1 } }]));
  it('REQ-16  phase_3_gate_result IN {PASS, CONDITIONAL}', () =>
    proveBothWays('A138-14', 'A138-REQ-16',
      [{ ws: 'A138-14', values: { phase_3_gate_result: 'PASS' } }],
      [{ ws: 'A138-14', values: { phase_3_gate_result: 'FAIL' } }]));
});

describe('DWA-A-138-1 — Phase 4 facility-selection & summary gates', () => {
  it('REQ-17  facility_type_selected IS NOT NULL', () =>
    proveBothWays('A138-15', 'A138-REQ-17',
      [{ ws: 'A138-15', values: { facility_type_selected: 'flaeche' } }],
      [{ ws: 'A138-15', values: { facility_type_selected: null } }]));
  it('REQ-18  attest_a138_15_a138_req_18 == True', () =>
    proveBothWays('A138-15', 'A138-REQ-18',
      [{ ws: 'A138-15', values: { attest_a138_15_a138_req_18: true } }],
      [{ ws: 'A138-15', values: { attest_a138_15_a138_req_18: false } }]));
  it('REQ-19  phase_4_gate_result IN {PASS, CONDITIONAL}', () =>
    proveBothWays('A138-23', 'A138-REQ-19',
      [{ ws: 'A138-23', values: { phase_4_gate_result: 'PASS' } }],
      [{ ws: 'A138-23', values: { phase_4_gate_result: 'FAIL' } }]));
  it('REQ-20  attest_a138_24_a138_req_20 == True', () =>
    proveBothWays('A138-24', 'A138-REQ-20',
      [{ ws: 'A138-24', values: { attest_a138_24_a138_req_20: true } }],
      [{ ws: 'A138-24', values: { attest_a138_24_a138_req_20: false } }]));
  it('REQ-21  design_adequacy_result IN {PASS, NA}', () =>
    proveBothWays('A138-25', 'A138-REQ-21',
      [{ ws: 'A138-25', values: { design_adequacy_result: 'PASS' } }],
      [{ ws: 'A138-25', values: { design_adequacy_result: 'FAIL' } }]));
});

describe('DWA-A-138-1 — Überflutungsnachweis (A138-26) gates', () => {
  it('REQ-22  IF flood_check_trigger THEN V_Rueck IS NOT NULL  (#22-guard, cross-worksheet)', async () => {
    await proveBothWays('A138-26', 'A138-REQ-22',
      [{ ws: 'A138-07', values: { flood_check_trigger: true } }, { ws: 'A138-26', values: { V_Rueck: 1500 } }],
      [{ ws: 'A138-26', values: { V_Rueck: null } }]);
  });
  it('REQ-22  vacuously passes when the guard is false (flood_check_trigger = false)', async () => {
    await applySaves([{ ws: 'A138-07', values: { flood_check_trigger: false } }, { ws: 'A138-26', values: { V_Rueck: null } }]);
    expect(await gateBlocks('A138-26', 'A138-REQ-22')).toBe(false);
    // restore trigger-true + V_Rueck for a clean downstream state
    await applySaves([{ ws: 'A138-07', values: { flood_check_trigger: true } }, { ws: 'A138-26', values: { V_Rueck: 1500 } }]);
  });
  it('REQ-23  flood_check_result IN {PASS, NA}', () =>
    proveBothWays('A138-26', 'A138-REQ-23',
      [{ ws: 'A138-26', values: { flood_check_result: 'PASS' } }],
      [{ ws: 'A138-26', values: { flood_check_result: 'FAIL' } }]));
  it('REQ-24  attest_a138_26_a138_req_24 == True', () =>
    proveBothWays('A138-26', 'A138-REQ-24',
      [{ ws: 'A138-26', values: { attest_a138_26_a138_req_24: true } }],
      [{ ws: 'A138-26', values: { attest_a138_26_a138_req_24: false } }]));
  it('REQ-26  attest_a138_26_a138_req_26 == True', () =>
    proveBothWays('A138-26', 'A138-REQ-26',
      [{ ws: 'A138-26', values: { attest_a138_26_a138_req_26: true } }],
      [{ ws: 'A138-26', values: { attest_a138_26_a138_req_26: false } }]));
});

describe('DWA-A-138-1 — attestation & cross-reference gates (A138-01, A138-04)', () => {
  it('REQ-25  attest_a138_01_a138_req_25 == True', () =>
    proveBothWays('A138-01', 'A138-REQ-25',
      [{ ws: 'A138-01', values: { attest_a138_01_a138_req_25: true } }],
      [{ ws: 'A138-01', values: { attest_a138_01_a138_req_25: false } }]));
  it('REQ-27  attest_a138_01_a138_req_27 == True', () =>
    proveBothWays('A138-01', 'A138-REQ-27',
      [{ ws: 'A138-01', values: { attest_a138_01_a138_req_27: true } }],
      [{ ws: 'A138-01', values: { attest_a138_01_a138_req_27: false } }]));
  it('REQ-28  attest_a138_04_a138_req_28 == True', () =>
    proveBothWays('A138-04', 'A138-REQ-28',
      [{ ws: 'A138-04', values: { attest_a138_04_a138_req_28: true } }],
      [{ ws: 'A138-04', values: { attest_a138_04_a138_req_28: false } }]));
  it('REQ-29  attest_a138_01_a138_req_29 == True', () =>
    proveBothWays('A138-01', 'A138-REQ-29',
      [{ ws: 'A138-01', values: { attest_a138_01_a138_req_29: true } }],
      [{ ws: 'A138-01', values: { attest_a138_01_a138_req_29: false } }]));
});

describe('DWA-A-138-1 — facility hydraulics gates (arithmetic-in-condition, Gl. 13/25/38)', () => {
  it('REQ-31  k_i > r_D_n_used * 10^-7  (Gl.13, acompare, cross-worksheet k_i)', () =>
    proveBothWays('A138-16', 'A138-REQ-31',
      [{ ws: 'A138-11', values: { k_i: 2e-5 } }, { ws: 'A138-16', values: { r_D_n_used: 100 } }],
      [{ ws: 'A138-11', values: { k_i: 5e-8 } }]));
  it('REQ-32  L_VS * q_VS >= r_5_n * A_C * 10^-4  (Gl.25, acompare, cross-worksheet A_C)', () =>
    proveBothWays('A138-18', 'A138-REQ-32',
      [{ ws: 'A138-18', values: { L_VS: 100, q_VS: 1, r_5_n: 200 } }, { ws: 'A138-10', values: { A_C: 100 } }],
      [{ ws: 'A138-18', values: { L_VS: 0.001 } }]));
  it('REQ-33  IF shaft_type == typ_B THEN A_S_FS*k_f_FS >= A_S_Schacht*k_i  (Gl.38 dual-role guard)', async () => {
    await proveBothWays('A138-21', 'A138-REQ-33',
      [{ ws: 'A138-11', values: { k_i: 1e-5 } }, { ws: 'A138-21', values: { shaft_type: 'typ_B', A_S_FS: 1, k_f_FS: 1e-4, A_S_Schacht: 1 } }],
      [{ ws: 'A138-21', values: { k_f_FS: 1e-8 } }]);
  });
  it('REQ-33  vacuously passes for shaft_type typ_A (guard false)', async () => {
    await saveSymbols('A138-21', { shaft_type: 'typ_A', k_f_FS: 1e-8 });
    expect(await gateBlocks('A138-21', 'A138-REQ-33')).toBe(false);
    await saveSymbols('A138-21', { shaft_type: 'typ_B', k_f_FS: 1e-4 }); // restore
  });
});

describe('DWA-A-138-1 — water-protection COV gates (bare-ident enum-equality, verified enforcing)', () => {
  it('REQ-COV-01  water_protection_zone != zone_I AND != zone_II', () =>
    proveBothWays('A138-01', 'A138-REQ-COV-01',
      [{ ws: 'A138-01', values: { water_protection_zone: 'none' } }],
      [{ ws: 'A138-01', values: { water_protection_zone: 'zone_I' } }]));
  it('REQ-COV-01  ALSO blocks Zone II', async () => {
    await saveSymbols('A138-01', { water_protection_zone: 'zone_II' });
    expect(await gateBlocks('A138-01', 'A138-REQ-COV-01')).toBe(true);
    await saveSymbols('A138-01', { water_protection_zone: 'none' });
  });
  it('REQ-COV-02  direct_gw_injection == false', () =>
    proveBothWays('A138-02', 'A138-REQ-COV-02',
      [{ ws: 'A138-02', values: { direct_gw_injection: false } }],
      [{ ws: 'A138-02', values: { direct_gw_injection: true } }]));
});

// ── 6 WARN gates never block ─────────────────────────────────────────────────
describe('DWA-A-138-1 — the 6 WARN gates never enter the block-enforcement path', () => {
  it('REQ-10..14 (A138-10, empty condition) never block, even in a violating project state', async () => {
    // A138-10 hosts REQ-15 (block) currently violated (q_S_AC=1 from above) — the
    // warn gates must still not appear among failingBlockConditions.
    const result = await checkApprovalGate(fixture.instances['A138-10']);
    for (const g of A138_WARN_GATES.filter((w) => w.ws === 'A138-10')) {
      expect(result.failingBlockConditions.some((c) => c.code === g.code)).toBe(false);
    }
  });
  it('REQ-30 (A138-28, non-empty warn condition) never blocks even when its condition is unsatisfiable', async () => {
    // final_compliance_verdict left null → REQ-30 condition is false, but severity=warn
    // → checkApprovalGate (which reads severity=block only) never lists it.
    const result = await checkApprovalGate(fixture.instances['A138-28']);
    expect(result.failingBlockConditions.some((c) => c.code === 'A138-REQ-30')).toBe(false);
  });
});

// ── undriven-block-gate audit MUST be empty (29/29) ──────────────────────────
describe('DWA-A-138-1 — 29/29 block-gate coverage audit', () => {
  it('every block gate was driven BOTH ways (undriven list empty)', () => {
    const allBlock = A138_BLOCK_GATES.map((g) => g.code);
    const undriven = allBlock.filter((c) => !driven.has(c));
    expect(undriven, `undriven block gates: ${undriven.join(', ')}`).toEqual([]);
    expect(driven.size).toBe(29);
  });
});
