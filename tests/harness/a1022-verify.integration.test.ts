/**
 * DWA-A-102-2 · STEP-2 pilot-2 (COMPLEX) — MAP-DRIVEN verification harness.
 *
 * The reasoning map (Obsidian reasoning-maps/DWA-A-102-2) is the PLAN. Its 62
 * equation nodes are pre-classified BY THE MAP (not hand-picked here):
 *   - PURE-arithmetic + PDF-attested + no external root  → VA: run through the
 *     REAL engine, assert the value the verbatim PDF formula yields.
 *   - relational (`<=`/`>=`) with a PURE RHS             → VA: the engine's
 *     rhs() strips the LHS at the comparator; assert the RHS value.
 *   - chain roots in h_Na → KOSTRA-DWD (external)         → NR: the ARITHMETIC is
 *     proven but the value is NOT source-VA (logged, not upgraded).
 *   - ENGINE-GAP (ln / Sum / `Max(a; b)` semicolon)      → assert the engine
 *     FAILS LOUD (manual_required/error), never fabricates. Instructive result.
 * Then it fires the block CR nodes through the REAL `evaluateCondition`, and
 * round-trips one derived value through the REAL `saveWorksheet`.
 *
 * SR-1 note: synthetic inputs test the ENCODING'S ARITHMETIC (does the engine
 * reproduce the standard's printed formula), NOT a standard value. Formula
 * strings + CR conditions are verbatim from prod; page refs are the rendered PDF.
 */
// @vitest-environment node
import './_harness-env-a1022'; // top-level-await: PG + seedA1022 BEFORE @/lib/db
import { describe, it, expect, afterAll } from 'vitest';
import { getA1022Harness } from './_harness-env-a1022';
import { evaluateFormula } from '@/lib/eval/formula';
import { derivedOutputSymbols } from '@/lib/eval/derived-output-symbols';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import { A1022_EQUATIONS, A1022_CRS } from './seed-a1022';

const { harness, fixture } = getA1022Harness();
const sql = harness.sql;

afterAll(async () => {
  await harness.stop();
});

function runEq(num: string, inputs: Record<string, number>) {
  const e = A1022_EQUATIONS.find((x) => x.num === num)!;
  return evaluateFormula({
    equationId: fixture.equationIds[num],
    formula: e.formula,
    inputSymbols: Object.keys(inputs),
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('DWA-A-102-2 — PURE-arithmetic equation chains reach VA through the REAL engine (map-driven)', () => {
  it('Gl.(1) A_b_a = A_E_k_b − A_E_k_b_na  [PDF p.28]', () => {
    const r = runEq('1', { A_E_k_b: 1000, A_E_k_b_na: 200 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(800, 9);
  });
  it('Gl.(5) b_R_a_AFS63 = B_R_a_AFS63 / A_b_a  [PDF p.34]', () => {
    const r = runEq('5', { B_R_a_AFS63: 384000, A_b_a: 800 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(480, 9);
  });
  it('Gl.(8) B_R_e_AFS63 = (1 − eta_ges)·B_R_a_AFS63  [PDF p.35]', () => {
    const r = runEq('8', { eta_ges: 0.5, B_R_a_AFS63: 384000 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(192000, 6);
  });
  it('Gl.(9) q_A_b = q_A_max·15/r_krit  [PDF p.41]', () => {
    const r = runEq('9', { q_A_max: 6, r_krit: 7.5 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(12, 9);
  });
  it('Gl.(10) A_RKB = 3.6·Q_Bem_Tr/q_A_Bem  [PDF p.42]', () => {
    const r = runEq('10', { Q_Bem_Tr: 100, q_A_Bem: 6 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(60, 9);
  });
  it('Gl.(11) V_RKB = A_RKB·h_RKB  [PDF p.42]', () => {
    const r = runEq('11', { A_RKB: 60, h_RKB: 2 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(120, 9);
  });
  it('Gl.(12) A_eff = 3.6·Q_Bem_Tr/q_A_max  [PDF p.43]', () => {
    const r = runEq('12', { Q_Bem_Tr: 100, q_A_max: 10 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(36, 9);
  });
  it('Gl.(19) C_e_CSB = (C_R_CSB·m + C_b_CSB)/(m+1)  [PDF p.49]', () => {
    const r = runEq('19', { C_R_CSB: 107, m: 7, C_b_CSB: 120 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(108.625, 6);
  });
  it('Gl.(27) m_Rue = (Q_Dr − Q_T_aM)/Q_T_aM  [PDF p.55]', () => {
    const r = runEq('27', { Q_Dr: 80, Q_T_aM: 10 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(7, 9);
  });
  it('Gl.(B.1) Q_R_krit = r_krit·A_b_a·f_D  [PDF p.79]', () => {
    const r = runEq('B.1', { r_krit: 7.5, A_b_a: 800, f_D: 0.9 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(5400, 6);
  });
  it('Gl.(B.2) Q_Bem_Tr = Q_R_krit + Q_F  [PDF p.79]', () => {
    const r = runEq('B.2', { Q_R_krit: 5400, Q_F: 50 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(5450, 6);
  });
  it('Gl.(B.7) Q_R_Dr = Q_M − Q_T_aM − Q_R_Tr  [PDF p.87]', () => {
    const r = runEq('B.7', { Q_M: 200, Q_T_aM: 30, Q_R_Tr: 40 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(130, 9);
  });
  it('Gl.(B.14) C_b_CSB = 600·(a_c_CSB + a_h + a_a)  [PDF p.88]', () => {
    const r = runEq('B.14', { a_c_CSB: 1, a_h: 0.25, a_a: 0.5 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(1050, 6);
  });
  it('Gl.(B.20) tau = 430·(q_T_aM/f_D)^0.45·d_I  [PDF p.90] — engine ^ power', () => {
    const r = runEq('B.20', { q_T_aM: 2, f_D: 0.9, d_I: 0.003 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(430 * Math.pow(2 / 0.9, 0.45) * 0.003, 6);
  });
  it('Gl.(B.21) a_a = (24/x_a)^2·(2−tau)/10  [PDF p.90] — engine ^ power', () => {
    const r = runEq('B.21', { x_a: 48, tau: 0.5 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(0.0375, 9);
  });
  it('Gl.(B.22) b_R_a_AFS63 = (p_I·280 + p_II·530 + p_III·760)/100  [PDF p.90]', () => {
    const r = runEq('B.22', { p_I: 10, p_II: 20, p_III: 70 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(666, 6);
  });
  it('Gl.(T6.H1) H1 = (4000 + 25·q_R_Dr/f_D)/(0.551 + q_R_Dr/f_D)  [PDF p.51, Tab.6]', () => {
    const r = runEq('T6.H1', { q_R_Dr: 130, f_D: 0.9 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed')
      expect(r.value).toBeCloseTo((4000 + 25 * 130 / 0.9) / (0.551 + 130 / 0.9), 6);
  });
  it('Gl.(T6.V) V = V_s·A_b_a·f_D  [PDF p.51, Tab.6]', () => {
    const r = runEq('T6.V', { V_s: 15, A_b_a: 800, f_D: 0.9 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(10800, 6);
  });
});

describe('DWA-A-102-2 — relational (<=/>=) equations: engine rhs() strips LHS → VA on the pure RHS', () => {
  it('Gl.(18) e_0 <= … = 3700/(C_e_CSB − 70)  [PDF p.49] — FINDING F-3: two-sided formula string, engine fails loud', () => {
    // FINDING (prod data hygiene): the encoded string is a TWO-SIDED derivation
    // `e_0 <= (107-70)/(C_e_CSB-70)*100 = 3700/(C_e_CSB-70)`. rhs() strips only
    // the first comparator, leaving a stray `=` → the arithmetic engine throws.
    // Correct fail-loud behaviour; the equation is NOT engine-executable as
    // encoded. Its compute chain is staged, not VA. (Would need the DB string
    // split into a single evaluable RHS.)
    const r = runEq('18', { C_e_CSB: 108.625 });
    expect(r.kind).not.toBe('computed');
  });
  it('Gl.(28) Q_Dr >= (m_Rue + 1)·Q_T_aM  [PDF p.55] — RHS pure → VA', () => {
    const r = runEq('28', { m_Rue: 7, Q_T_aM: 10 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(80, 9);
  });
});

describe('DWA-A-102-2 — NR boundary: arithmetic proven, but chain roots in h_Na → KOSTRA-DWD (capped NR)', () => {
  it('Gl.(2) V_R_aM = h_Na·A_b_a·psi_aM·10  [PDF p.29] — arithmetic OK; h_Na is KOSTRA-DWD → value NOT source-VA (NR)', () => {
    // The ENGINE computes it fine; the doctrine cap is on the SOURCE of h_Na
    // (external DWD/KOSTRA-2020, in_library:false), not on the math. We assert
    // the arithmetic AND record that this value cannot reach VA without a
    // verbatim DWD rainfall-depth quote (SR-1/SR-3). This is the correct
    // instructive result — un-runnable-to-VA at the external boundary.
    const r = runEq('2', { h_Na: 800, A_b_a: 800, psi_aM: 0.7 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(4480000, 3); // 800·800·0.7·10
  });
  it('Gl.(16) B_R_e_zul_CSB = V_R_aM·C_R_CSB  [PDF p.49] — inherits the h_Na NR cap via V_R_aM', () => {
    const r = runEq('16', { V_R_aM: 4480000, C_R_CSB: 107 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(479360000, 0);
  });
});

describe('DWA-A-102-2 — ENGINE-GAP equations: the engine FAILS LOUD (never fabricates)', () => {
  it('Gl.(REG-Bild4) q_A_Bem = −8.333·ln(eta_ges) − 1.6629  [PDF p.41] — ln() NOW computes (normalizeFormula clobber fixed)', () => {
    // Previously ln(eta_ges) was mangled to `ln_eta_ges` by normalizeFormula's FN_LIKE
    // (r_D(n) accessor rule) → unknown symbol → manual_required. That [CODE] bug is fixed;
    // ln() reaches the evaluator, so this graph-regression now computes. (Whether the
    // Bild-4 graph FIT is the canonical source form remains a separate content ruling.)
    const r = runEq('REG-Bild4', { eta_ges: 0.5 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(-8.333 * Math.log(0.5) - 1.6629, 6);
  });
  it('Gl.(4) B_R_a_AFS63 = Sum(B_R_a_AFS63_i)  [PDF p.34] — Sum() unsupported', () => {
    const r = runEq('4', { B_R_a_AFS63_i: 100 });
    expect(r.kind).not.toBe('computed');
  });
  it('Gl.(B.17) d_I = Sum(...)/Sum(l_i)  [PDF p.89] — Sum() unsupported', () => {
    const r = runEq('B.17', { d_i: 1, I_S_i: 1, l_i: 1 });
    expect(r.kind).not.toBe('computed');
  });
  it('Gl.(6) eta_erf = Max(0; 1 − ...)  [PDF p.34] — NEW gap: prod stores Max with ";" separator (engine expects ",")', () => {
    // The complexity scale exposed this: prod's Max()/Min() use a SEMICOLON arg
    // separator, and normalize-formula.ts mangles the paren → the engine cannot
    // evaluate it. Fails loud (correct); flagged as a data-hygiene + engine gap.
    const r = runEq('6', { b_R_e_zul_AFS63: 240, b_R_a_AFS63: 480 });
    expect(r.kind).not.toBe('computed');
  });
  it('Gl.(T6.Vs) V_s = Max(H1/(e_0+6) − H2; V_S_min)  [PDF p.51] — same Max ";" gap', () => {
    const r = runEq('T6.Vs', { H1: 52, e_0: 20, H2: 10, V_S_min: 5 });
    expect(r.kind).not.toBe('computed');
  });
});

describe('DWA-A-102-2 — derived-output classification + saveWorksheet round-trip (REAL)', () => {
  it('classifies harnessed equation outputs as derived (not entered) via the REAL derivedOutputSymbols', () => {
    const eqRows = A1022_EQUATIONS.map((e) => ({ id: fixture.equationIds[e.num], outputSymbol: e.out }));
    const derived = derivedOutputSymbols(eqRows, new Set<string>());
    for (const out of ['A_b_a', 'A_RKB', 'V_RKB', 'C_e_CSB', 'Q_R_krit', 'C_b_CSB']) {
      expect(derived.has(out)).toBe(true);
    }
  });
  it('persists a derived A_RKB through the REAL saveWorksheet and reads it back (derived)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const f = fixture.fields;
    const res = await saveWorksheet({
      instanceId: fixture.calcInstanceId,
      values: {
        [f['Q_Bem_Tr']]: { type: 'number', value: 100 },
        [f['q_A_Bem']]: { type: 'number', value: 6 },
        [f['A_RKB']]: { type: 'number', value: 60 }, // Gl.(10) computed above
      },
    });
    expect(res.ok).toBe(true);
    const [row] = await sql<{ value_number: string | null; source_type: string }[]>`
      SELECT value_number, source_type FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${f['A_RKB']}`;
    expect(row?.value_number == null ? null : Number(row.value_number)).toBeCloseTo(60, 9);
    expect(row?.source_type).toBe('derived');
  });
});

describe('DWA-A-102-2 — block CR nodes through the REAL evaluateCondition (pass + fail)', () => {
  const cond = (code: string) => A1022_CRS.find((c) => c.code === code)!.cond;
  const lk = (vals: Record<string, string | number | boolean | null>) =>
    (sym: string) => (sym in vals ? vals[sym] : undefined);

  it('REQ-03 balance_area_size > 0  [PDF p.26]', () => {
    expect(evaluateCondition(cond('REQ-03'), lk({ balance_area_size: 5 })).kind).toBe('pass');
    expect(evaluateCondition(cond('REQ-03'), lk({ balance_area_size: 0 })).kind).toBe('fail');
  });
  it('REQ-04 A_b_a_I + A_b_a_II + A_b_a_III == A_b_a  [PDF p.30]', () => {
    expect(evaluateCondition(cond('REQ-04'), lk({ A_b_a_I: 300, A_b_a_II: 300, A_b_a_III: 200, A_b_a: 800 })).kind).toBe('pass');
    expect(evaluateCondition(cond('REQ-04'), lk({ A_b_a_I: 300, A_b_a_II: 300, A_b_a_III: 200, A_b_a: 900 })).kind).toBe('fail');
  });
  it('REQ-06 A_b_a_I>0 AND A_b_a_II>0 AND A_b_a_III>0  [PDF p.30]', () => {
    expect(evaluateCondition(cond('REQ-06'), lk({ A_b_a_I: 1, A_b_a_II: 1, A_b_a_III: 1 })).kind).toBe('pass');
    expect(evaluateCondition(cond('REQ-06'), lk({ A_b_a_I: 1, A_b_a_II: 0, A_b_a_III: 1 })).kind).toBe('fail');
  });
  it('REQ-08 f_D>0 AND f_D<=1  [PDF p.80]', () => {
    expect(evaluateCondition(cond('REQ-08'), lk({ f_D: 0.9 })).kind).toBe('pass');
    expect(evaluateCondition(cond('REQ-08'), lk({ f_D: 1.5 })).kind).toBe('fail');
  });
  it('REQ-15 a_R_AFS63>=1.0 AND a_R_AFS63<=1.20  [PDF p.53]', () => {
    expect(evaluateCondition(cond('REQ-15'), lk({ a_R_AFS63: 1.1 })).kind).toBe('pass');
    expect(evaluateCondition(cond('REQ-15'), lk({ a_R_AFS63: 1.3 })).kind).toBe('fail');
  });
  it('REQ-17 V_s >= V_S_min  [PDF p.51] — FINDING F-4: var-vs-var >= silently mis-evaluates (evaluateCondition bug)', () => {
    // FINDING F-4 (var-vs-var ordering gate) is now FIXED in evaluate.ts (L244-258:
    // an ordering op with a bare-ident RHS routes to numeric acompare and resolves
    // the RHS through the lookup). So `V_s >= V_S_min` now enforces correctly.
    // (Verified corpus-wide via the a1022b harness; these assertions updated from the
    // pre-fix buggy 'fail' to the corrected truth.)
    expect(evaluateCondition(cond('REQ-17'), lk({ V_s: 10, V_S_min: 5 })).kind).toBe('pass');
    expect(evaluateCondition(cond('REQ-17'), lk({ V_s: 3, V_S_min: 5 })).kind).toBe('fail');
  });
  it('REQ-22 eta_ges >= eta_erf  [PDF p.34] — F-4 var-vs-var now enforces', () => {
    expect(evaluateCondition(cond('REQ-22'), lk({ eta_ges: 0.8, eta_erf: 0.5 })).kind).toBe('pass');
    expect(evaluateCondition(cond('REQ-22'), lk({ eta_ges: 0.4, eta_erf: 0.5 })).kind).toBe('fail');
  });
  it('REQ-23 V_s >= 5  [PDF p.51]', () => {
    expect(evaluateCondition(cond('REQ-23'), lk({ V_s: 5 })).kind).toBe('pass');
    expect(evaluateCondition(cond('REQ-23'), lk({ V_s: 4 })).kind).toBe('fail');
  });
});
