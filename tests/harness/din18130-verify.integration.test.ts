/**
 * DIN-18130-1 · STEP-2 pilot-1 — MAP-DRIVEN verification harness.
 *
 * The reasoning map (Obsidian reasoning-maps/DIN-18130-1) is the PLAN: its eight
 * equation nodes Gl.(1)-(4),(6),(7),(8),(9) each name a computable chain and the
 * RENDERED PDF page its value must be checked against (SR-3). This test walks
 * that node list and, for each equation node:
 *   (A) drives the chain through the REAL shared engine `evaluateFormula`
 *       (src/lib/eval/formula.ts) and asserts the produced value equals the
 *       value the VERBATIM PDF formula yields for clean synthetic inputs;
 *   (B) for the k / k_10 result, round-trips it through the REAL `saveWorksheet`
 *       and confirms the output symbol is classified `derived` (not `entered`)
 *       via the REAL `derivedOutputSymbols`.
 * Then it fires all seven CR nodes through the REAL `evaluateCondition`.
 *
 * SR-1 note: synthetic inputs test the ENCODING'S ARITHMETIC (does the engine
 * reproduce the standard's printed formula), NOT a standard value. The §9 worked
 * examples are exemplary (dp-01-worked-examples) and are deliberately NOT used as
 * inputs. Formula strings are verbatim from prod; page refs are the rendered PDF.
 */
// @vitest-environment node
import './_harness-env-din18130'; // top-level-await: PG + seedDin18130 BEFORE @/lib/db
import { describe, it, expect, afterAll } from 'vitest';
import { getDin18130Harness } from './_harness-env-din18130';
import { evaluateFormula } from '@/lib/eval/formula';
import { derivedOutputSymbols } from '@/lib/eval/derived-output-symbols';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import { DIN18130_EQUATIONS, DIN18130_CRS } from './seed-din18130-1';

const { harness, fixture } = getDin18130Harness();
const sql = harness.sql;

afterAll(async () => {
  await harness.stop();
});

/** Run one equation node's chain through the REAL engine. */
function runEq(num: string, inputs: Record<string, number>) {
  const e = DIN18130_EQUATIONS.find((x) => x.num === num)!;
  return evaluateFormula({
    equationId: fixture.equationIds[num],
    formula: e.formula,
    inputSymbols: Object.keys(inputs),
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('DIN-18130-1 — equation-node chains through the REAL evaluateFormula (map-driven)', () => {
  it('Gl.(1) Q = V_w/t  [PDF Seite 3]', () => {
    const r = runEq('1', { V_w: 2.0e-4, t: 100 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(2.0e-6, 12); // 2e-4/100
  });

  it('Gl.(2) v = Q/A  [PDF Seite 3]', () => {
    const r = runEq('2', { Q: 2.0e-6, A: 0.01 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(2.0e-4, 12);
  });

  it('Gl.(3) i = h/l  [PDF Seite 3]', () => {
    const r = runEq('3', { h: 0.5, l: 0.1 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(5.0, 12);
  });

  it('Gl.(4) k = v/i  [PDF Seite 3, DARCY]', () => {
    const r = runEq('4', { v: 2.0e-4, i: 5.0 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(4.0e-5, 12);
  });

  it('Gl.(6) k_10 = 1,359/(1+0,0337T+0,00022T^2)·k_T  [PDF Seite 5] — α(T=10) cross-checks Tab.2 = 1,000', () => {
    // At T=10 the closed form gives α = 1.359 / (1 + 0.337 + 0.022) = 1.359/1.359 = 1.000,
    // exactly Tab.2's discrete α(10)=1,000 (rendered PDF Seite 5). k_T=3e-8 → k_10=3e-8.
    const r = runEq('6', { T: 10, k_T: 3.0e-8 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') {
      expect(r.value).toBeCloseTo(3.0e-8, 12);
      // isolate α by dividing out k_T — must equal Tab.2 α(10)
      expect(r.value / 3.0e-8).toBeCloseTo(1.0, 6);
    }
  });

  it('Gl.(7) h = h_0(γ_w−γ_org)/γ_w  [PDF Seite 5] — buoyancy head correction', () => {
    const r = runEq('7', { h_0: 1.0, gamma_w: 10.0, gamma_org: 8.0 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(0.2, 12); // 1·(10-8)/10
  });

  it('Gl.(8) k = Q·l/(A·h)  [PDF Seite 16] constant-head — the governing k for CR chain', () => {
    const r = runEq('8', { Q: 1.0e-6, l: 0.1, A: 0.01, h: 0.5 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(2.0e-5, 12); // (1e-6·0.1)/(0.01·0.5)
  });

  it('Gl.(9) k = (a·l_0)/(A·t)·ln(h_1/h_2)  [PDF Seite 16] falling-head — NOW computes (ln() is engine-supported)', () => {
    // CORRECTED: the in-tree arithmetic parser supports ln/log/log10/exp/sqrt/abs (not
    // only min/max — arithmetic.ts FUNCTIONS_1ARG), and `ln(h_1/h_2)` (multi-token arg)
    // was never touched by normalizeFormula's FN_LIKE. So the falling-head permeability
    // computes end-to-end; VA per PDF Seite 16. (a·l_0)/(A·t)·ln(h_1/h_2) with the values
    // below = 1e-5 · ln(2) ≈ 6.931e-6.
    const r = runEq('9', { a: 1.0e-4, l_0: 0.1, A: 0.01, t: 100, h_1: 0.5, h_2: 0.25 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo((1.0e-4 * 0.1) / (0.01 * 100) * Math.log(0.5 / 0.25), 12);
  });
});

describe('DIN-18130-1 — k derived value round-trips through the REAL saveWorksheet', () => {
  it('classifies the equation output symbols as derived (not entered) via the REAL derivedOutputSymbols', () => {
    // The map says every equation OUTPUT (Q,v,i,k,k_10,h) is `derived` and must
    // never be persisted as an engineer input. Assert against the REAL function.
    const eqRows = DIN18130_EQUATIONS.map((e) => ({ id: fixture.equationIds[e.num], outputSymbol: e.out }));
    const derived = derivedOutputSymbols(eqRows, new Set<string>());
    for (const out of ['Q', 'v', 'i', 'k', 'k_10', 'h']) {
      expect(derived.has(out)).toBe(true);
    }
  });

  it('persists a constant-head k result through the REAL saveWorksheet and reads it back', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const f = fixture.fields04;
    // Persist the inputs to Gl.(8) + the engine-computed k (client write-back).
    const kComputed = 2.0e-5; // Gl.(8) with the synthetic inputs above
    const res = await saveWorksheet({
      instanceId: fixture.ws04InstanceId,
      values: {
        [f['Q']]: { type: 'number', value: 1.0e-6 },
        [f['l']]: { type: 'number', value: 0.1 },
        [f['A']]: { type: 'number', value: 0.01 },
        [f['h']]: { type: 'number', value: 0.5 },
        [f['k']]: { type: 'number', value: kComputed },
      },
    });
    expect(res.ok).toBe(true);

    const [kRow] = await sql<{ value_number: string | null; source_type: string }[]>`
      SELECT value_number, source_type FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${f['k']}`;
    expect(kRow?.value_number == null ? null : Number(kRow.value_number)).toBeCloseTo(kComputed, 12);
    // k is an equation output on THIS worksheet → saveWorksheet must tag it derived.
    expect(kRow?.source_type).toBe('derived');
  });
});

describe('DIN-18130-1 — all 7 CR nodes through the REAL evaluateCondition (pass + fail)', () => {
  const cond = (code: string) => DIN18130_CRS.find((c) => c.code === code)!.cond;
  const lk = (vals: Record<string, string | number | boolean | null>) =>
    (sym: string) => (sym in vals ? vals[sym] : undefined);

  it('CR-01 max_d & A_min present → pass; missing → fail  [Seite 5]', () => {
    expect(evaluateCondition(cond('DIN-18130-1-CR-01'), lk({ max_d: 2, A_min: 100 })).kind).toBe('pass');
    expect(evaluateCondition(cond('DIN-18130-1-CR-01'), lk({ max_d: 2 })).kind).toBe('fail');
  });
  it('CR-02 umlaeufigkeit_verhindert==true → pass; false → fail  [Seite 8]', () => {
    expect(evaluateCondition(cond('DIN-18130-1-CR-02'), lk({ umlaeufigkeit_verhindert: true })).kind).toBe('pass');
    expect(evaluateCondition(cond('DIN-18130-1-CR-02'), lk({ umlaeufigkeit_verhindert: false })).kind).toBe('fail');
  });
  it('CR-03 saettigung OR versuchsklasse∈{2,3} → pass; neither → fail  [Seite 8; Tab.3/4]', () => {
    expect(evaluateCondition(cond('DIN-18130-1-CR-03'), lk({ saettigung_aufgebracht: true, versuchsklasse: 1 })).kind).toBe('pass');
    expect(evaluateCondition(cond('DIN-18130-1-CR-03'), lk({ saettigung_aufgebracht: false, versuchsklasse: 2 })).kind).toBe('pass');
    expect(evaluateCondition(cond('DIN-18130-1-CR-03'), lk({ saettigung_aufgebracht: false, versuchsklasse: 1 })).kind).toBe('fail');
  });
  it('CR-04 V_w>0 AND t>0 → pass; V_w=0 → fail  [Seite 6]', () => {
    expect(evaluateCondition(cond('DIN-18130-1-CR-04'), lk({ V_w: 2e-4, t: 100 })).kind).toBe('pass');
    expect(evaluateCondition(cond('DIN-18130-1-CR-04'), lk({ V_w: 0, t: 100 })).kind).toBe('fail');
  });
  it('CR-05 k_10>0 → pass; k_10=0 → fail  [Seite 16]', () => {
    expect(evaluateCondition(cond('DIN-18130-1-CR-05'), lk({ k_10: 3e-8 })).kind).toBe('pass');
    expect(evaluateCondition(cond('DIN-18130-1-CR-05'), lk({ k_10: 0 })).kind).toBe('fail');
  });
  it('CR-06 report complete AND k_10>0 → pass; incomplete → fail  [Seite 16]', () => {
    expect(evaluateCondition(cond('DIN-18130-1-CR-06'), lk({ versuchsbericht_vollstaendig: true, k_10: 3e-8 })).kind).toBe('pass');
    expect(evaluateCondition(cond('DIN-18130-1-CR-06'), lk({ versuchsbericht_vollstaendig: false, k_10: 3e-8 })).kind).toBe('fail');
  });
  it('CR-07 k_f present → pass; missing → fail  [Seite 16]', () => {
    expect(evaluateCondition(cond('DIN-18130-1-CR-07'), lk({ k_f: 2e-5 })).kind).toBe('pass');
    expect(evaluateCondition(cond('DIN-18130-1-CR-07'), lk({})).kind).toBe('fail');
  });
});
