/**
 * DWA-M 179-1 (September 2024 GELBDRUCK / ENTWURF) — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner): "runnable" means RAN. This harness PROVES the encoding
 * end-to-end against a disposable embedded Postgres. Nothing is applied to prod;
 * nothing is committed. Provenance ceiling: VC (verified-vs-text, OCR extract) —
 * no rendered PDF; draft edition → no value fix is source-settled.
 *
 *  B. EQUATIONS — the 6 prod equations (Gl.1–Gl.5 + the Bild-4 ηBV regression)
 *     driven through the REAL evaluateFormula. All six compute; no comma-decimal
 *     formula string; kinds asserted.
 *
 *  C. GATE EXECUTION PROOF — every one of the 13 live BLOCK gates driven BOTH WAYS
 *     through the REAL `saveWorksheet` → `checkApprovalGate` chain: a persisted
 *     state that PASSES (gate absent from the block list) and one that VIOLATES
 *     (gate present → definite block). Four IF/THEN block gates (REQ-06/07/22/23)
 *     are driven with the guard TRUE so the body actually enforces. REQ-06/07/22/23
 *     read fields homed on OTHER worksheets → proven via the project-wide fallback.
 *
 *  REQ-30 is driven both ways (raw value 'ready' for the pass path) AND flagged: its
 *  `== ready` targets a value NOT in the field's declared enum domain → the pass
 *  state is UI-unreachable → over-enforcing permanent blocker (RULING, not fixed;
 *  Gelbdruck-deferred).
 *
 *  The 20 WARN gates are severity='warn' → structurally excluded from the approval-
 *  gate block query → never block. Four are spot-checked.
 */
// @vitest-environment node
import './_harness-env-m179-1'; // top-level-await: PG + seed BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM179Harness } from './_harness-env-m179-1';
import { M179_GATES, M179_EQUATIONS, BETRIEBSANWEISUNG_STATUS_ENUM } from './seed-m179-1';
import { evaluateFormula } from '@/lib/eval/formula';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM179Harness();
const sql = harness.sql;

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

const BLOCK_GATES = M179_GATES.filter((g) => g.sev === 'block');
const WARN_GATES = M179_GATES.filter((g) => g.sev === 'warn');

// ─────────────────────────────────────────────────────────────────────────────
// Seed sanity — topology matches prod
// ─────────────────────────────────────────────────────────────────────────────
describe('DWA-M 179-1 — seed sanity (17 worksheets, 13 block, 20 warn, 6 equations)', () => {
  it('seeds 17 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(17);
  });
  it('has 13 block gates + 20 warn gates', () => {
    expect(BLOCK_GATES.length).toBe(13);
    expect(WARN_GATES.length).toBe(20);
  });
  it('has 6 equations', () => {
    expect(Object.keys(fixture.equationIds).length).toBe(6);
    expect(M179_EQUATIONS.length).toBe(6);
  });
  it('no empty-condition BLOCK gate (all empty conditions are warn placeholders)', () => {
    expect(BLOCK_GATES.filter((g) => g.cond.trim() === '').map((g) => g.code)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Engine-trap audit — BLOCK gates only (evaluate.ts + live prod strings)
// ─────────────────────────────────────────────────────────────────────────────
describe('DWA-M 179-1 — BLOCK gates engine-trap / no-op audit', () => {
  it('trap-2: no != null / == null / != "" shape in any BLOCK gate', () => {
    expect(BLOCK_GATES.some((g) => /!=\s*''|!=\s*""|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
  });
  it('no literal-TRUE no-op BLOCK gate (reverses the prior "~1 TRUE no-op" corpus flag — R-5)', () => {
    expect(BLOCK_GATES.some((g) => g.cond.trim().toUpperCase() === 'TRUE')).toBe(false);
  });
  it('trap-3: no IN-membership BLOCK gate (the only IN gate, REQ-28, is warn)', () => {
    expect(BLOCK_GATES.filter((g) => /\bIN\b/.test(g.cond)).map((g) => g.code)).toEqual([]);
  });
  it('trap-4: no unparenthesised chained IF..THEN..AND..IF..THEN BLOCK gate', () => {
    expect(BLOCK_GATES.some((g) => (g.cond.match(/\bIF\b/g) ?? []).length > 1)).toBe(false);
  });
  it('trap-1: no bare-identifier-RHS field-vs-field under an ORDERING operator in any BLOCK gate', () => {
    // Ordering-op RHS in the 13 block gates are all numeric literals (5000/50/100/1/3/47/63/5).
    // The equality-RHS bare idents (II/III/fall_4/vollstrom/ready/False) are string/keyword
    // literals under `==`, NOT the ordering-op trap-1 shape.
    const orderingBareRhs = BLOCK_GATES.filter((g) =>
      /(>=|<=|>|<)\s*[A-Za-z_]\w*(\s|$)/.test(g.cond));
    expect(orderingBareRhs.map((g) => g.code)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. GATE EXECUTION PROOF — real saveWorksheet → checkApprovalGate, both ways
// ─────────────────────────────────────────────────────────────────────────────
async function save(ws: string, values: Record<string, Val>): Promise<void> {
  const wsFields = fixture.fieldByWs[ws];
  const batch: Record<string, { type: string; value: Val }> = {};
  for (const [symbol, value] of Object.entries(values)) {
    const meta = wsFields?.[symbol];
    if (!meta) throw new Error(`seed gap: no field for ${symbol} on ${ws}`);
    batch[meta.fieldId] = { type: meta.dataType, value };
  }
  const res = await saveWorksheet({
    instanceId: fixture.instances[ws],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: batch as any,
  });
  expect(res.ok, `saveWorksheet(${ws}) failed: ${JSON.stringify(res)}`).toBe(true);
}
async function saveMany(saves: Array<[string, Record<string, Val>]>): Promise<void> {
  for (const [ws, vals] of saves) await save(ws, vals);
}
async function gateBlocks(checkWs: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[checkWs]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

const DRIVEN = new Set<string>();
/** Prove a BLOCK gate ENFORCING both ways. `passSaves` / `violateSaves` are full
 *  multi-worksheet write plans (each entry saves through the REAL save path); the
 *  gate on `checkWs` is then evaluated. Multi-ws plans exercise the project-wide
 *  fallback for the cross-worksheet guard gates. */
async function proveBothWays(
  checkWs: string, code: string,
  passSaves: Array<[string, Record<string, Val>]>,
  violateSaves: Array<[string, Record<string, Val>]>,
): Promise<void> {
  DRIVEN.add(code);
  await saveMany(passSaves);
  expect(await gateBlocks(checkWs, code), `${code} should NOT block in passing state`).toBe(false);
  await saveMany(violateSaves);
  expect(await gateBlocks(checkWs, code), `${code} SHOULD block in violating state`).toBe(true);
}

describe('DWA-M 179-1 (C) — 9 local BLOCK gates enforce both ways', () => {
  it('REQ-01 A_b_a <= 5000 [M179-02]', async () =>
    proveBothWays('M179-02', 'REQ-01', [['M179-02', { A_b_a: 1000 }]], [['M179-02', { A_b_a: 6000 }]]));
  it("REQ-02 target_compartment == 'oberflaechengewaesser' [M179-01]", async () =>
    proveBothWays('M179-01', 'REQ-02',
      [['M179-01', { target_compartment: 'oberflaechengewaesser' }]],
      [['M179-01', { target_compartment: 'grundwasser' }]]));
  it('REQ-04 cat_I_mixing_violation == False [M179-03] — INVERTED (pass when false)', async () =>
    proveBothWays('M179-03', 'REQ-04',
      [['M179-03', { cat_I_mixing_violation: false }]],
      [['M179-03', { cat_I_mixing_violation: true }]]));
  it('REQ-08 eta_hyd >= 50 [M179-08]', async () =>
    proveBothWays('M179-08', 'REQ-08', [['M179-08', { eta_hyd: 60 }]], [['M179-08', { eta_hyd: 40 }]]));
  it('REQ-09 eta_hyd <= 100 [M179-08]', async () =>
    proveBothWays('M179-08', 'REQ-09', [['M179-08', { eta_hyd: 80 }]], [['M179-08', { eta_hyd: 120 }]]));
  it('REQ-24 Psi_s == 1 [M179-02]', async () =>
    proveBothWays('M179-02', 'REQ-24', [['M179-02', { Psi_s: 1 }]], [['M179-02', { Psi_s: 0.9 }]]));
  it('REQ-25 site_factor_sum <= 1 [M179-14]', async () =>
    proveBothWays('M179-14', 'REQ-25', [['M179-14', { site_factor_sum: 1 }]], [['M179-14', { site_factor_sum: 2 }]]));
  it('REQ-26 site_factor_sum < 3 [M179-14]', async () =>
    proveBothWays('M179-14', 'REQ-26', [['M179-14', { site_factor_sum: 2 }]], [['M179-14', { site_factor_sum: 3 }]]));
  it('REQ-30 funktionspruefung_done==True AND betriebsanweisung_status==ready [M179-16] — pass path uses raw "ready"', async () =>
    proveBothWays('M179-16', 'REQ-30',
      [['M179-16', { funktionspruefung_done: true, betriebsanweisung_status: 'ready' }]],
      [['M179-16', { funktionspruefung_done: false, betriebsanweisung_status: 'ready' }]]));
});

describe('DWA-M 179-1 (C) — 4 IF/THEN BLOCK gates enforce both ways with guard TRUE (cross-ws fallback)', () => {
  it('REQ-06 IF belastungskategorie==II THEN eta_ges_required>=47 [gate M179-04, guard field M179-03]', async () =>
    proveBothWays('M179-04', 'REQ-06',
      [['M179-03', { belastungskategorie: 'II' }], ['M179-04', { eta_ges_required: 50 }]],
      [['M179-03', { belastungskategorie: 'II' }], ['M179-04', { eta_ges_required: 40 }]]));
  it('REQ-07 IF belastungskategorie==III THEN eta_ges_required>=63 [gate M179-04, guard field M179-03]', async () =>
    proveBothWays('M179-04', 'REQ-07',
      [['M179-03', { belastungskategorie: 'III' }], ['M179-04', { eta_ges_required: 63 }]],
      [['M179-03', { belastungskategorie: 'III' }], ['M179-04', { eta_ges_required: 62 }]]));
  it('REQ-22 IF flow_split_case==fall_4 THEN Q_krit>=5 [gate M179-08, flow_split_case M179-05, Q_krit M179-10]', async () =>
    proveBothWays('M179-08', 'REQ-22',
      [['M179-05', { flow_split_case: 'fall_4' }], ['M179-10', { Q_krit: 6 }]],
      [['M179-05', { flow_split_case: 'fall_4' }], ['M179-10', { Q_krit: 4 }]]));
  it('REQ-23 IF Q_krit<=5 THEN flow_split_case==vollstrom [gate M179-08, cross-ws]', async () =>
    proveBothWays('M179-08', 'REQ-23',
      [['M179-10', { Q_krit: 4 }], ['M179-05', { flow_split_case: 'vollstrom' }]],
      [['M179-10', { Q_krit: 4 }], ['M179-05', { flow_split_case: 'fall_1' }]]));
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-30 defect: the pass state is UI-unreachable (enum gap) → permanent blocker
// ─────────────────────────────────────────────────────────────────────────────
describe('DWA-M 179-1 — REQ-30 is an over-enforcing permanent blocker (enum gap, RULING/deferred)', () => {
  it('the compared value "ready" is NOT among betriebsanweisung_status\'s declared enum options', () => {
    expect(BETRIEBSANWEISUNG_STATUS_ENUM).not.toContain('ready');
  });
  it('with every SELECTABLE enum option (+ funktionspruefung_done=true) the gate still BLOCKS', async () => {
    for (const opt of BETRIEBSANWEISUNG_STATUS_ENUM) {
      await save('M179-16', { funktionspruefung_done: true, betriebsanweisung_status: opt });
      expect(await gateBlocks('M179-16', 'REQ-30'), `REQ-30 should block for selectable option "${opt}"`).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WARN gates never appear in the approval-gate block set
// ─────────────────────────────────────────────────────────────────────────────
describe('DWA-M 179-1 — WARN gates never block (spot-check, even in would-violate state)', () => {
  it('REQ-13 (IF treatment_method==sedimentation THEN q_A_max<=4) never blocks even when violated', async () => {
    await save('M179-05', { treatment_method: 'sedimentation' });
    await save('M179-06', { q_A_max: 9 }); // would violate <= 4
    expect(await gateBlocks('M179-06', 'REQ-13')).toBe(false);
  });
  it('REQ-28 (monitoring_planned IN {True, False}) never blocks (boolean full-domain no-op, warn)', async () => {
    await save('M179-16', { monitoring_planned: false });
    expect(await gateBlocks('M179-16', 'REQ-28')).toBe(false);
  });
  it('REQ-27 (fachkundige AND wartungsvertrag) never blocks even when both false', async () => {
    await save('M179-16', { fachkundige_person_assigned: false, wartungsvertrag_present: false });
    expect(await gateBlocks('M179-16', 'REQ-27')).toBe(false);
  });
  it('REQ-05 (IF cat_II_III_mixing THEN eta_ges_required>=63) never blocks even when violated', async () => {
    await save('M179-03', { cat_II_III_mixing: true });
    await save('M179-04', { eta_ges_required: 10 }); // would violate >= 63
    expect(await gateBlocks('M179-04', 'REQ-05')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Trap demonstration — REQ-28 boolean full-domain membership is a no-op
// ─────────────────────────────────────────────────────────────────────────────
describe('DWA-M 179-1 — REQ-28 monitoring_planned IN {True, False} is a tautology (never fails)', () => {
  it('evaluateCondition returns pass for both boolean values (full-domain membership)', () => {
    const t = evaluateCondition('monitoring_planned IN {True, False}', (s) => (s === 'monitoring_planned' ? true : undefined));
    const f = evaluateCondition('monitoring_planned IN {True, False}', (s) => (s === 'monitoring_planned' ? false : undefined));
    expect(t.kind).toBe('pass');
    expect(f.kind).toBe('pass');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. EQUATIONS — driven through the REAL evaluateFormula
// ─────────────────────────────────────────────────────────────────────────────
function runEq(num: string, inputs: Record<string, number>) {
  const e = M179_EQUATIONS.find((x) => x.num === num)!;
  return evaluateFormula({
    equationId: fixture.equationIds[num],
    formula: e.formula,
    inputSymbols: Object.keys(inputs),
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('DWA-M 179-1 (B) — 6 equations compute through the REAL engine', () => {
  it('no equation formula string carries a comma-decimal (dot-only engine)', () => {
    for (const e of M179_EQUATIONS) expect(e.formula).not.toMatch(/\d,\d/);
  });
  it('Gl.(5) A_F = A_b_a * 0.01  → 8.3 for A_b_a=830', () => {
    const r = runEq('Gl5-A_F', { A_b_a: 830 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(8.3, 9);
  });
  it('Gl.(4) A_sed = 3.6 * Q_krit / q_A_max  → 9 for Q_krit=10, q_A_max=4', () => {
    const r = runEq('Gl4-A_sed', { Q_krit: 10, q_A_max: 4 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(9, 9);
  });
  it('ηBV = a * exp(-b * q_A_max)  → 95*exp(-0.4) for a=95, b=0.1, q=4', () => {
    const r = runEq('BV-eta_BV', { regression_a_AFS63: 95, regression_b_AFS63: 0.1, q_A_max: 4 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(95 * Math.exp(-0.4), 9);
  });
  it('Gl.(2) eta_hyd = eta_ges / eta_BV  → 2 for eta_ges=90, eta_BV=45', () => {
    const r = runEq('Gl2-eta_hyd', { eta_ges: 90, eta_BV: 45 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(2, 9);
  });
  it('Gl.(3) Q_krit = A_b_a * Psi_s * r_krit / 10000  → 8.3 for A_b_a=830, Psi_s=1, r_krit=100', () => {
    const r = runEq('Gl3-Q_krit', { A_b_a: 830, Psi_s: 1, r_krit: 100 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(8.3, 9);
  });
  it('Gl.(1) r_krit = 0.1201 * exp(0.0655 * eta_hyd)  for eta_hyd=91', () => {
    const r = runEq('Gl1-r_krit', { eta_hyd: 91 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(0.1201 * Math.exp(0.0655 * 91), 9);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Persistence read-back through the real save path
// ─────────────────────────────────────────────────────────────────────────────
describe('DWA-M 179-1 — persistence read-back through the real save path', () => {
  it('a saved numeric A_b_a value round-trips to project_parameters', async () => {
    await save('M179-02', { A_b_a: 4321 });
    const fid = fixture.fieldByWs['M179-02']['A_b_a'].fieldId;
    const [row] = await sql<{ value_number: string | null }[]>`
      SELECT value_number FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${fid}`;
    expect(Number(row?.value_number)).toBe(4321);
  });
});

describe('DWA-M 179-1 — all 13 block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every one of the 13 block gate codes', () => {
    const blockCodes = BLOCK_GATES.map((g) => g.code).sort();
    const undriven = blockCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(DRIVEN.size).toBe(13);
  });
});
