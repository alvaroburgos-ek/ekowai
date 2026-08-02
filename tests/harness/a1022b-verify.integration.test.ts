/**
 * DWA-A-102-2/BWK-A 3-2 (Dez 2020 / korr. Aug 2022) — CURRENT-PROD execution
 * proof. Three proofs against a disposable embedded Postgres:
 *
 *  A. ENGINE SYMBOL-VERIFY — every one of the 62 prod equations is driven
 *     through the REAL `evaluateFormula`. Pure/min-max/pow/ln/relational-RHS
 *     equations must COMPUTE the value the verbatim source formula yields;
 *     Sum() aggregates must FAIL LOUD (manual_required) — never fabricate.
 *     (This supersedes the committed a1022-verify, whose Max(`;`)/two-sided-Gl.18/
 *     F-4 assertions describe an OLDER prod snapshot; see seed-a1022b header.)
 *
 *  B. GATE EXECUTION PROOF — every one of the 12 live BLOCK gates is driven
 *     BOTH WAYS through the REAL `saveWorksheet` → `checkApprovalGate` chain:
 *     a persisted state that PASSES (gate absent from the block list) and one
 *     that VIOLATES (gate present → definite block). This catches the F-4 class
 *     (a gate that fires but never enforces). REQ-17/22/24 are the var-vs-var
 *     gates the F-4 fix (evaluate.ts acompare routing) now enforces.
 *
 *  C. REQ-24 PROD-WIRING REPRODUCTION — `m >= m_min_required` is hosted on
 *     A1022-34, but `m` is a field on THREE worksheets (A1022-23/33/36) and
 *     `m_min_required` has NO producing equation. When the three `m` fields hold
 *     conflicting values the project-wide fallback OMITS `m` → the gate goes
 *     PENDING → an undersized mixing ratio does NOT block. Demonstrated, not
 *     asserted-away. (Fix = re-home + single-source `m`; judgment item.)
 *
 * SR-1: synthetic inputs test the ENCODING'S ARITHMETIC (does the engine
 * reproduce the printed formula), not a standard value. Formulas + conditions
 * are verbatim from prod; source anchors are the rendered PDF / its .md.
 */
// @vitest-environment node
import './_harness-env-a1022b'; // top-level-await: PG + seed BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getA1022bHarness } from './_harness-env-a1022b';
import { evaluateFormula } from '@/lib/eval/formula';
import { evalExpression } from '@/lib/eval/arithmetic';
import { A1022B_EQUATIONS, A1022B_GATES } from './seed-a1022b';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getA1022bHarness();
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

// ─────────────────────────────────────────────────────────────────────────────
// A. ENGINE SYMBOL-VERIFY
// ─────────────────────────────────────────────────────────────────────────────

function runEq(num: string, inputs: Record<string, number>) {
  const e = A1022B_EQUATIONS.find((x) => x.num === num)!;
  return evaluateFormula({
    equationId: `a1022b-${num}`, // synthetic id → no aggregator/rewrite registered
    formula: e.formula,
    inputSymbols: Object.keys(inputs),
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

/** Assert an equation computes and yields `expected` (9-dp unless overridden). */
function expectComputed(num: string, inputs: Record<string, number>, expected: number, dp = 9) {
  const r = runEq(num, inputs);
  expect(r.kind, `${num} should compute, got ${r.kind}`).toBe('computed');
  if (r.kind === 'computed') expect(r.value).toBeCloseTo(expected, dp);
}

describe('DWA-A-102-2 (A) — pure-arithmetic equations reach VA through the REAL engine', () => {
  it('Gl.(1)  A_b_a = A_E_k_b − A_E_k_b_na', () => expectComputed('1', { A_E_k_b: 1000, A_E_k_b_na: 200 }, 800));
  it('Gl.(3)  B_R_a_AFS63_i = A_b_a_i·b_R_a_AFS63_i', () => expectComputed('3', { A_b_a_i: 10, b_R_a_AFS63_i: 480 }, 4800));
  it('Gl.(5)  b_R_a_AFS63 = B_R_a_AFS63 / A_b_a', () => expectComputed('5', { B_R_a_AFS63: 384000, A_b_a: 800 }, 480));
  it('Gl.(7)  B_R_e_AFS63_i = A_b_a_i·(1−eta_i)·b_R_a_AFS63_i', () => expectComputed('7', { A_b_a_i: 10, eta_i: 0.5, b_R_a_AFS63_i: 480 }, 2400));
  it('Gl.(8)  B_R_e_AFS63 = (1−eta_ges)·B_R_a_AFS63', () => expectComputed('8', { eta_ges: 0.5, B_R_a_AFS63: 384000 }, 192000, 6));
  it('Gl.(9)  q_A_b = q_A_max·15 / r_krit', () => expectComputed('9', { q_A_max: 6, r_krit: 7.5 }, 12));
  it('Gl.(10) A_RKB = 3.6·Q_Bem_Tr / q_A_Bem', () => expectComputed('10', { Q_Bem_Tr: 100, q_A_Bem: 6 }, 60));
  it('Gl.(11) V_RKB = A_RKB·h_RKB', () => expectComputed('11', { A_RKB: 60, h_RKB: 2 }, 120));
  it('Gl.(12) A_eff = 3.6·Q_Bem_Tr / q_A_max', () => expectComputed('12', { Q_Bem_Tr: 100, q_A_max: 10 }, 36));
  it('Gl.(13) e_0 = V_e_MWUe / V_R_aM·100', () => expectComputed('13', { V_e_MWUe: 20, V_R_aM: 100 }, 20));
  it('Gl.(14) B_R_e = (V_R_aM·e_0·C_e + V_R_aM·(100−e_0)·C_KA)/100', () => expectComputed('14', { V_R_aM: 100, e_0: 40, C_e: 100, C_KA: 50 }, 7000, 6));
  it('Gl.(19) C_e_CSB = (C_R_CSB·m + C_b_CSB)/(m+1)', () => expectComputed('19', { C_R_CSB: 107, m: 7, C_b_CSB: 120 }, 108.625, 6));
  it('Gl.(20) C_e_CSB = (C_R_CSB·a_R_AFS63·m + C_b_CSB)/(m+1)', () => expectComputed('20', { C_R_CSB: 107, a_R_AFS63: 1.0, m: 7, C_b_CSB: 120 }, 108.625, 6));
  it('Gl.(B.24) C_e_CSB (Anhang-B variant)', () => expectComputed('B.24', { C_R_CSB: 107, a_R_AFS63: 1.0, m: 7, C_b_CSB: 120 }, 108.625, 6));
  it('Gl.(27) m_Rue = (Q_Dr − Q_T_aM)/Q_T_aM', () => expectComputed('27', { Q_Dr: 80, Q_T_aM: 10 }, 7));
  it('Gl.(B.1) Q_R_krit = r_krit·A_b_a·f_D', () => expectComputed('B.1', { r_krit: 7.5, A_b_a: 800, f_D: 0.9 }, 5400, 6));
  it('Gl.(B.2) Q_Bem_Tr = Q_R_krit + Q_F', () => expectComputed('B.2', { Q_R_krit: 5400, Q_F: 50 }, 5450, 6));
  it('Gl.(B.3) q_A_Bem = 3.6·Q_Bem_Tr / A_sed', () => expectComputed('B.3', { Q_Bem_Tr: 5450, A_sed: 100 }, 196.2, 6));
  it('Gl.(B.4) Q_M = f_S_QM·Q_S_aM + Q_F', () => expectComputed('B.4', { f_S_QM: 2, Q_S_aM: 30, Q_F: 50 }, 110));
  it('Gl.(B.7) Q_R_Dr = Q_M − Q_T_aM − Q_R_Tr', () => expectComputed('B.7', { Q_M: 200, Q_T_aM: 30, Q_R_Tr: 40 }, 130));
  it('Gl.(B.8) q_R_Dr = Q_R_Dr / A_b_a', () => expectComputed('B.8', { Q_R_Dr: 130, A_b_a: 800 }, 0.1625));
  it('Gl.(B.9) q_T_aM = Q_T_aM / A_b_a', () => expectComputed('B.9', { Q_T_aM: 376, A_b_a: 800 }, 0.47));
  it('Gl.(B.11) Q_R_e = V_e_MWUe/(D_e·3.6) + Q_R_Dr', () => expectComputed('B.11', { V_e_MWUe: 100, D_e: 10, Q_R_Dr: 130 }, 100 / 36 + 130, 6));
  it('Gl.(B.12) Q_R_e = a_f·(3.0·A_b_a·f_D + 3.2·Q_R_Dr)', () => expectComputed('B.12', { a_f: 0.885, A_b_a: 800, f_D: 0.9, Q_R_Dr: 130 }, 0.885 * (3.0 * 800 * 0.9 + 3.2 * 130), 6));
  it('Gl.(B.13) m = (Q_R_e + Q_R_Tr)/Q_T_aM', () => expectComputed('B.13', { Q_R_e: 374, Q_R_Tr: 40, Q_T_aM: 10 }, 41.4, 6));
  it('Gl.(24) m (Hauptteil variant)', () => expectComputed('24', { Q_R_e: 374, Q_R_Tr: 40, Q_T_aM: 10 }, 41.4, 6));
  it('Gl.(B.14) C_b_CSB = 600·(a_c_CSB + a_h + a_a)', () => expectComputed('B.14', { a_c_CSB: 1, a_h: 0.25, a_a: 0.5 }, 1050, 6));
  it('Gl.(B.18) d_I = 0.001·(1 + 2·(NG_m−1))', () => expectComputed('B.18', { NG_m: 3 }, 0.005));
  it('Gl.(B.19) x_a = 24·Q_T_aM / Q_T_h_max', () => expectComputed('B.19', { Q_T_aM: 10, Q_T_h_max: 5 }, 48));
  it('Gl.(B.22) b_R_a_AFS63 = (p_I·280 + p_II·530 + p_III·760)/100', () => expectComputed('B.22', { p_I: 10, p_II: 20, p_III: 70 }, 666, 6));
  it('Gl.(T6.H1) H1 = (4000 + 25·q_R_Dr/f_D)/(0.551 + q_R_Dr/f_D)', () => expectComputed('T6.H1', { q_R_Dr: 130, f_D: 0.9 }, (4000 + 25 * 130 / 0.9) / (0.551 + 130 / 0.9), 6));
  it('Gl.(T6.H2) H2 = (36.8 + 13.5·q_R_Dr/f_D)/(0.5 + q_R_Dr/f_D)', () => expectComputed('T6.H2', { q_R_Dr: 130, f_D: 0.9 }, (36.8 + 13.5 * 130 / 0.9) / (0.5 + 130 / 0.9), 6));
  it('Gl.(T6.V) V = V_s·A_b_a·f_D', () => expectComputed('T6.V', { V_s: 15, A_b_a: 800, f_D: 0.9 }, 10800, 6));
});

describe('DWA-A-102-2 (A) — min/max (comma-form) + power equations now compute (engine supports min/max/^)', () => {
  it('Gl.(6)  eta_erf = max(0, 1 − b_R_e_zul/b_R_a)·100 → 50', () => expectComputed('6', { b_R_e_zul_AFS63: 240, b_R_a_AFS63: 480 }, 50, 6));
  it('Gl.(6)  eta_erf floors at 0 when zul > vorhanden', () => expectComputed('6', { b_R_e_zul_AFS63: 600, b_R_a_AFS63: 480 }, 0, 6));
  it('Gl.(B.10) a_f = max(0.885, 0.50 + 50/(t_f+100)) → 1.0 at t_f=0', () => expectComputed('B.10', { t_f: 0 }, 1.0, 6));
  it('Gl.(B.10) a_f floors at 0.885 for large t_f', () => expectComputed('B.10', { t_f: 900 }, 0.885, 6));
  it('Gl.(T6.a_f) a_f = max(0.5 + 50/(t_f+100), 0.885)', () => expectComputed('T6.a_f', { t_f: 0 }, 1.0, 6));
  it('Gl.(B.15) a_c_CSB = max(1, C_T_aM_CSB/600)', () => expectComputed('B.15a', { C_T_aM_CSB: 900 }, 1.5, 6));
  it('Gl.(B.15) a_c_CSB floors at 1', () => expectComputed('B.15b', { C_T_aM_CSB: 300 }, 1.0, 6));
  it('Gl.(B.16) a_h = min(max(h_Na/800−1, −0.25), 0.25) → 0 at h_Na=800', () => expectComputed('B.16', { h_Na: 800 }, 0, 6));
  it('Gl.(B.16) a_h clamps to +0.25 for h_Na≥1000', () => expectComputed('B.16', { h_Na: 1200 }, 0.25, 6));
  it('Gl.(B.16) a_h clamps to −0.25 for h_Na≤600', () => expectComputed('B.16', { h_Na: 400 }, -0.25, 6));
  it('Gl.(21) a_R_AFS63 = min(max(b/478, 1.0), 1.20) → 1.0 at b=478', () => expectComputed('21a', { b_R_a_AFS63: 478 }, 1.0, 6));
  it('Gl.(21) a_R_AFS63 caps at 1.20', () => expectComputed('21b', { b_R_a_AFS63: 700 }, 1.20, 6));
  it('Gl.(B.23) a_R_AFS63 (Anhang-B variant)', () => expectComputed('B.23a', { b_R_a_AFS63: 500 }, 500 / 478, 6));
  it('Gl.(22) m_min = max(7, (C_T_aM_CSB−180)/60) → 7 at C=600', () => expectComputed('22', { C_T_aM_CSB: 600 }, 7, 6));
  it('Gl.(23) m_min exceeds 7 for high CSB', () => expectComputed('23', { C_T_aM_CSB: 900 }, (900 - 180) / 60, 6));
  it('Gl.(25) r_krit = max(7.5, 15·120/(t_f+120)) → 15 at t_f=0', () => expectComputed('25a', { t_f: 0 }, 15, 6));
  it('Gl.(25) r_krit floors at 7.5', () => expectComputed('25b', { t_f: 3000 }, 7.5, 6));
  it('Gl.(B.20) tau = 430·(q_T_aM/f_D)^0.45·d_I', () => expectComputed('B.20', { q_T_aM: 2, f_D: 0.9, d_I: 0.003 }, 430 * Math.pow(2 / 0.9, 0.45) * 0.003, 6));
  it('Gl.(B.21) a_a = max(0, (24/x_a)^2·(2−tau)/10)', () => expectComputed('B.21', { x_a: 48, tau: 0.5 }, 0.0375));
  it('Gl.(B.21) a_a floors at 0 when tau>2', () => expectComputed('B.21', { x_a: 48, tau: 3 }, 0));
  it('Gl.(T6.Vs) V_s = max(H1/(e_0+6) − H2, V_S_min)', () => expectComputed('T6.Vs', { H1: 2756, e_0: 40, H2: 34.84, V_S_min: 5 }, Math.max(2756 / 46 - 34.84, 5), 6));
});

describe('DWA-A-102-2 (A) — ln() regression (Zusatzdatei Bild 4): normalizeFormula [CODE] bug now FIXED', () => {
  it('Gl.(REG-Bild4) q_A_Bem = −8.333·ln(eta_ges) − 1.6629 NOW computes (normalizeFormula clobber fixed, commit 58308de)', () => {
    // The [CODE] bug this test originally documented is FIXED: normalize-formula.ts's
    // FN_LIKE (r_D(n)→r_D_n accessor) no longer clobbers the supported 1-arg calls
    // ln/log/log10/exp/sqrt/abs — so `ln(eta_ges)` reaches the evaluator and computes.
    // Source (Anwendungsbeispiel md L634, MINUS form): q_A,Bem = 5,68 m/h for eta_ges=0,414.
    const r = runEq('REG-Bild4', { eta_ges: 0.414 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(-8.333 * Math.log(0.414) - 1.6629, 6);
    // Sanity: the RAW arithmetic engine (evalExpression,
    // which does NOT run normalizeFormula) computes ln() fine and yields the source
    // value 5,68 m/h. So arithmetic.ts is correct; only the pre-normalise step breaks it.
    const raw = evalExpression('-8.333 * ln(eta_ges) - 1.6629', { eta_ges: 0.414 });
    expect(raw).toBeCloseTo(-8.333 * Math.log(0.414) - 1.6629, 9); // = 5.686 ≈ 5,68 m/h (worked example)
    expect(raw).toBeGreaterThan(5.6);
    expect(raw).toBeLessThan(5.75);
  });
});

describe('DWA-A-102-2 (A) — relational equations: rhs() strips LHS → pure RHS computes', () => {
  it('Gl.(15) e_0 <= (B_R_e_zul − V_R_aM·C_KA)/(V_R_aM·C_e − V_R_aM·C_KA)·100 → RHS', () => expectComputed('15', { B_R_e_zul: 8000, V_R_aM: 100, C_KA: 50, C_e: 100 }, 60, 6));
  it('Gl.(17) e_0 <= (C_R_CSB − C_KA_CSB)/(C_e_CSB − C_KA_CSB)·100 → RHS', () => expectComputed('17', { C_R_CSB: 107, C_KA_CSB: 70, C_e_CSB: 108.625 }, (107 - 70) / (108.625 - 70) * 100, 6));
  it('Gl.(18) (107−70)/(C_e_CSB−70)·100 [clean single-sided; old two-sided F-3 string is gone]', () => expectComputed('18', { C_e_CSB: 108.625 }, 3700 / (108.625 - 70), 6));
  it('Gl.(28) Q_Dr >= (m_Rue + 1)·Q_T_aM → RHS', () => expectComputed('28', { m_Rue: 7, Q_T_aM: 10 }, 80));
});

describe('DWA-A-102-2 (A) — NR boundary: arithmetic proven, chain roots in h_Na → KOSTRA-DWD (capped NR)', () => {
  it('Gl.(2) V_R_aM = h_Na·A_b_a·psi_aM·10 — arithmetic OK; h_Na external ⇒ value NOT source-VA (NR)', () => expectComputed('2', { h_Na: 800, A_b_a: 800, psi_aM: 0.7 }, 4480000, 3));
  it('Gl.(16) B_R_e_zul_CSB = V_R_aM·C_R_CSB — inherits the h_Na NR cap via V_R_aM', () => expectComputed('16', { V_R_aM: 4480000, C_R_CSB: 107 }, 479360000, 0));
});

describe('DWA-A-102-2 (A) — Sum() aggregates FAIL LOUD (engine never fabricates)', () => {
  it('Gl.(4)  B_R_a_AFS63 = Sum(B_R_a_AFS63_i) → not computed', () => {
    expect(runEq('4', { B_R_a_AFS63_i: 100 }).kind).not.toBe('computed');
  });
  it('Gl.(B.17) d_I = Sum(…)/Sum(l_i) → not computed', () => {
    expect(runEq('B.17', { d_i: 1, I_S_i: 1, l_i: 1 }).kind).not.toBe('computed');
  });
  it('Gl.(26) Q_Dr >= Q_T_aM + Q_R_krit + Sum(Q_Dr_i) → not computed (Sum in RHS)', () => {
    expect(runEq('26', { Q_T_aM: 10, Q_R_krit: 100, Q_Dr_i: 5 }).kind).not.toBe('computed');
  });
  it('FINDING — Gl.(B.5) Sum(Q_M_i) <= Q_M degenerates: rhs() strips the Sum-LHS → returns bare Q_M (identity, harmless but not a real check)', () => {
    const r = runEq('B.5', { Q_M: 110 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(110, 6); // returns the RHS symbol, not a sum-constraint
  });
  it('NOTE — Gl.(B.6) Q_R_Tr = Q_S_h_max_Tr is a pure symbol identity', () => expectComputed('B.6', { Q_S_h_max_Tr: 40 }, 40));
});

// ─────────────────────────────────────────────────────────────────────────────
// B. GATE EXECUTION PROOF — real saveWorksheet → checkApprovalGate, both ways
// ─────────────────────────────────────────────────────────────────────────────

type Val = number | boolean | string;

/** Persist a symbol→value map to a SPECIFIC worksheet through the REAL saveWorksheet. */
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

/** Whether `code` is currently in the block-gate failing list for host worksheet `ws`. */
async function gateBlocks(ws: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[ws]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

describe('DWA-A-102-2 (B) — straight-line BLOCK gates enforce BOTH ways (real save path)', () => {
  it('REQ-28 regulation_edition == "Dez 2020, korr. Aug 2022"  [host A1022-01]', async () => {
    await save('A1022-01', { regulation_edition: 'Dez 2020, korr. Aug 2022' });
    expect(await gateBlocks('A1022-01', 'REQ-28')).toBe(false);
    await save('A1022-01', { regulation_edition: 'Dez 2020' });
    expect(await gateBlocks('A1022-01', 'REQ-28')).toBe(true);
  });
  it('REQ-03 balance_area_size > 0  [host A1022-02]', async () => {
    await save('A1022-02', { balance_area_size: 5 });
    expect(await gateBlocks('A1022-02', 'REQ-03')).toBe(false);
    await save('A1022-02', { balance_area_size: 0 });
    expect(await gateBlocks('A1022-02', 'REQ-03')).toBe(true);
  });
  it('REQ-06 A_b_a_I>0 AND A_b_a_II>0 AND A_b_a_III>0  [host A1022-04]', async () => {
    await save('A1022-04', { A_b_a_I: 300, A_b_a_II: 300, A_b_a_III: 200 });
    expect(await gateBlocks('A1022-04', 'REQ-06')).toBe(false);
    await save('A1022-04', { A_b_a_I: 300, A_b_a_II: 0, A_b_a_III: 200 });
    expect(await gateBlocks('A1022-04', 'REQ-06')).toBe(true);
  });
  it('REQ-04 A_b_a_I + A_b_a_II + A_b_a_III == A_b_a  [host A1022-05; areas via fallback A1022-04]', async () => {
    await save('A1022-04', { A_b_a_I: 300, A_b_a_II: 300, A_b_a_III: 200 });
    await save('A1022-05', { A_b_a: 800 });
    expect(await gateBlocks('A1022-05', 'REQ-04')).toBe(false);
    await save('A1022-05', { A_b_a: 900 });
    expect(await gateBlocks('A1022-05', 'REQ-04')).toBe(true);
  });
  it('REQ-08 f_D>0 AND f_D<=1  [host A1022-09]', async () => {
    await save('A1022-09', { f_D: 0.9 });
    expect(await gateBlocks('A1022-09', 'REQ-08')).toBe(false);
    await save('A1022-09', { f_D: 1.5 });
    expect(await gateBlocks('A1022-09', 'REQ-08')).toBe(true);
  });
  it('REQ-15 a_R_AFS63>=1.0 AND a_R_AFS63<=1.20  [host A1022-26]', async () => {
    await save('A1022-26', { a_R_AFS63: 1.1 });
    expect(await gateBlocks('A1022-26', 'REQ-15')).toBe(false);
    await save('A1022-26', { a_R_AFS63: 1.3 });
    expect(await gateBlocks('A1022-26', 'REQ-15')).toBe(true);
  });
  it('REQ-23 V_s >= 5  [host A1022-30]', async () => {
    await save('A1022-30', { V_s: 5 });
    expect(await gateBlocks('A1022-30', 'REQ-23')).toBe(false);
    await save('A1022-30', { V_s: 4 });
    expect(await gateBlocks('A1022-30', 'REQ-23')).toBe(true);
  });
});

describe('DWA-A-102-2 (B) — var-vs-var gates the F-4 fix now ENFORCES (acompare RHS resolution)', () => {
  it('REQ-17 V_s >= V_S_min  [host A1022-30, both local] — passes when V_s≥V_S_min, blocks when below', async () => {
    // Pre-F-4-fix this gate blocked BOTH ways (bare-ident RHS stringified). It now resolves V_S_min.
    await save('A1022-30', { V_s: 10, V_S_min: 5 });
    expect(await gateBlocks('A1022-30', 'REQ-17')).toBe(false); // 10 >= 5 → pass (would have been a false block)
    await save('A1022-30', { V_s: 3, V_S_min: 5 });
    expect(await gateBlocks('A1022-30', 'REQ-17')).toBe(true);  // 3 >= 5 → block
  });
  it('REQ-22 eta_ges >= eta_erf  [host A1022-34; eta_ges←A1022-17, eta_erf←A1022-11 via fallback]', async () => {
    await save('A1022-17', { eta_ges: 0.8 });
    await save('A1022-11', { eta_erf: 0.5 });
    expect(await gateBlocks('A1022-34', 'REQ-22')).toBe(false); // 0.8 >= 0.5 → pass
    await save('A1022-17', { eta_ges: 0.4 });
    expect(await gateBlocks('A1022-34', 'REQ-22')).toBe(true);  // 0.4 >= 0.5 → block
  });
  it('REQ-24 m >= m_min_required  [host A1022-34] — enforces when m resolves uniquely (only A1022-36 populated)', async () => {
    // Clean case: m written only on A1022-36 (A1022-23/33 left unpopulated → no fallback conflict).
    await save('A1022-36', { m: 8, m_min_required: 7 });
    expect(await gateBlocks('A1022-34', 'REQ-24')).toBe(false); // 8 >= 7 → pass
    await save('A1022-36', { m: 5, m_min_required: 7 });
    expect(await gateBlocks('A1022-34', 'REQ-24')).toBe(true);  // 5 >= 7 → block
  });
});

describe('DWA-A-102-2 (B) — guarded gates (IF … THEN …): vacuous pass / guarded block', () => {
  it('REQ-07 IF misch_active THEN areas>0  [host A1022-04; misch_active←A1022-03 via fallback]', async () => {
    // guard FALSE → vacuous pass regardless of areas
    await save('A1022-03', { misch_active: false });
    await save('A1022-04', { A_b_a_I: 0, A_b_a_II: 0, A_b_a_III: 0 });
    expect(await gateBlocks('A1022-04', 'REQ-07')).toBe(false);
    // guard TRUE + body FALSE → block
    await save('A1022-03', { misch_active: true });
    expect(await gateBlocks('A1022-04', 'REQ-07')).toBe(true);
    // guard TRUE + body TRUE → pass
    await save('A1022-04', { A_b_a_I: 300, A_b_a_II: 300, A_b_a_III: 200 });
    expect(await gateBlocks('A1022-04', 'REQ-07')).toBe(false);
  });
  it('REQ-11 IF trenn_active THEN A_RKB>0 AND V_RKB>0  [host A1022-10; symbols←A1022-03/A1022-18 via fallback]', async () => {
    // guard FALSE → vacuous pass
    await save('A1022-03', { trenn_active: false });
    await save('A1022-18', { A_RKB: 0, V_RKB: 0 });
    expect(await gateBlocks('A1022-10', 'REQ-11')).toBe(false);
    // guard TRUE + body FALSE (A_RKB=0) → block
    await save('A1022-03', { trenn_active: true });
    expect(await gateBlocks('A1022-10', 'REQ-11')).toBe(true);
    // guard TRUE + body TRUE → pass
    await save('A1022-18', { A_RKB: 60, V_RKB: 120 });
    expect(await gateBlocks('A1022-10', 'REQ-11')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. REQ-24 prod-wiring reproduction + persistence read-back
// ─────────────────────────────────────────────────────────────────────────────

describe('DWA-A-102-2 (C) — REQ-24 wiring defect: multi-homed `m` + producerless `m_min_required`', () => {
  it('REPRODUCTION — conflicting `m` across A1022-23/33/36 makes the fallback OMIT `m` → REQ-24 goes PENDING → an undersized mixing ratio does NOT block', async () => {
    // Populate all three prod homes of `m` with DIFFERENT values (a realistic
    // multi-facility project) and an m_min_required the smallest m would violate.
    await save('A1022-23', { m: 9 });
    await save('A1022-33', { m: 8 });
    await save('A1022-36', { m: 5, m_min_required: 7 });
    // `m` conflicts project-wide → buildFallbackValues drops it → host A1022-34
    // cannot resolve `m` → REQ-24 evaluates to pending, NOT fail. So even though a
    // facility's m (5) is below the required 7, the gate does not block.
    expect(await gateBlocks('A1022-34', 'REQ-24')).toBe(false);
    // Sanity: the gate CAN block (proven in section B) — the non-block here is the
    // fallback-collision, not a dead gate. This is the judgment-item wiring defect:
    // fix = re-home REQ-24 to A1022-36 and single-source `m` vs `m_min_required`.
  });
});

describe('DWA-A-102-2 (C) — persistence read-back through the real save path', () => {
  it('a saved value round-trips to project_parameters and reads back', async () => {
    await save('A1022-30', { V_s: 12.5 });
    const fid = fixture.fieldByWs['A1022-30']['V_s'].fieldId;
    const [row] = await sql<{ value_number: string | null }[]>`
      SELECT value_number FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${fid}`;
    expect(row?.value_number == null ? null : Number(row.value_number)).toBeCloseTo(12.5, 9);
  });
});
