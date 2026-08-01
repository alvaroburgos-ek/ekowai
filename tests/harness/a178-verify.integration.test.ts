/**
 * DWA-A-178 (Retentionsbodenfilteranlagen) — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. A-178's prior
 * "14 of 19 runnable" was ASSESSED, never executed. This harness PROVES each of
 * the standard's 20 live BLOCK gates by driving it through the REAL enforcement
 * chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every
 *                                      block condition against the SAVED values
 *                                      and lists the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts) — local field
 * symbols plus the conflict-free project-wide fallback, so cross-worksheet guards
 * (system_type on A178-02, h_RR on A178-11, A_E_b_a on A178-04, …) resolve exactly
 * as in production. A gate is proven ENFORCING only when it is shown BOTH ways:
 * a persisted state where it does NOT block, and a persisted state where it DOES
 * (the F-4 lesson — gates that fire but never enforce are invisible to static
 * reading).
 *
 * The two PARKED engine gaps (B_RBF_zu SUM_over_i, malformed Gl.9) are driven
 * through the REAL `evaluateFormula` and shown to FAIL LOUD (never fabricate);
 * the derived gate-inputs (A_F, B_RBFA_ab, eta_F, b_F) are shown to COMPUTE once
 * their upstream is hand-entered — proving the gates that read them are runnable,
 * not blocked. Nothing is fixed here; conditions/formulas are verbatim from prod.
 */
// @vitest-environment node
import './_harness-env-a178'; // top-level-await: PG + seedA178 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getA178Harness } from './_harness-env-a178';
import { evaluateFormula } from '@/lib/eval/formula';
import { A178_EQUATIONS } from './seed-a178';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getA178Harness();

// The db-touching server actions are imported AFTER _harness-env's top-level
// await set DATABASE_URL, so @/lib/db connects to the harness Postgres.
let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string;

/**
 * Persist a symbol→value map through the REAL saveWorksheet, partitioned by each
 * symbol's home worksheet (saveWorksheet only accepts fields of the addressed
 * instance's template). Value `type` is taken from the field's real data_type.
 */
async function saveSymbols(values: Record<string, Val>): Promise<void> {
  const byWs = new Map<string, Record<string, { type: string; value: Val }>>();
  for (const [symbol, value] of Object.entries(values)) {
    const meta = fixture.fieldMeta[symbol];
    if (!meta) throw new Error(`seed gap: no field for symbol ${symbol}`);
    const batch = byWs.get(meta.ws) ?? {};
    batch[meta.fieldId] = { type: meta.dataType, value };
    byWs.set(meta.ws, batch);
  }
  for (const [ws, batch] of byWs) {
    const res = await saveWorksheet({
      instanceId: fixture.instances[ws],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      values: batch as any,
    });
    expect(res.ok, `saveWorksheet(${ws}) failed: ${JSON.stringify(res)}`).toBe(true);
  }
}

/** Returns whether `code` is in the block-gate failing list for worksheet `ws`
 * given the CURRENT persisted project state (the real approval-gate read path). */
async function gateBlocks(ws: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[ws]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

/** Assert a gate is proven ENFORCING both ways through the real save path. */
async function proveBothWays(
  ws: string,
  code: string,
  passState: Record<string, Val>,
  violateState: Record<string, Val>,
): Promise<void> {
  await saveSymbols(passState);
  expect(await gateBlocks(ws, code), `${code} should NOT block in passing state`).toBe(false);
  await saveSymbols(violateState);
  expect(await gateBlocks(ws, code), `${code} SHOULD block in violating state`).toBe(true);
}

describe('DWA-A-178 — 20 BLOCK gates proven ENFORCING both-ways through the REAL saveWorksheet + checkApprovalGate', () => {
  it('A178-01 REQ-02  treatment_need_confirmed == True', async () => {
    await proveBothWays('A178-01', 'REQ-02',
      { treatment_need_confirmed: true },
      { treatment_need_confirmed: false });
  });

  it("A178-02 REQ-16  IF system_type == 'strasse' THEN h_RR >= 0.5  (guard-true both ways)", async () => {
    await proveBothWays('A178-02', 'REQ-16',
      { system_type: 'strasse', h_RR: 0.6 },
      { system_type: 'strasse', h_RR: 0.4 });
  });

  it('A178-06 REQ-07  feststoffeintrag_alarm == false', async () => {
    await proveBothWays('A178-06', 'REQ-07',
      { feststoffeintrag_alarm: false },
      { feststoffeintrag_alarm: true });
  });

  it('A178-07 REQ-13  filter_U<5 AND feinanteil<=3 AND ueberkorn<=15 AND CaCO3>=20', async () => {
    const good = { filter_U: 4, filter_feinanteil: 2, filter_ueberkornanteil: 10, filter_calcium_carbonate: 25 };
    await proveBothWays('A178-07', 'REQ-13', good, { ...good, filter_U: 6 });
  });

  it('A178-07 REQ-14  q_Dr_RBF <= 0.05', async () => {
    await proveBothWays('A178-07', 'REQ-14', { q_Dr_RBF: 0.04 }, { q_Dr_RBF: 0.06 });
  });

  it('A178-07 REQ-25  abdichtung_kdb_staerke >= 2', async () => {
    await proveBothWays('A178-07', 'REQ-25', { abdichtung_kdb_staerke: 2.5 }, { abdichtung_kdb_staerke: 1.5 });
  });

  it('A178-07 REQ-26  geotextil_zwischen_filter_drane == False', async () => {
    await proveBothWays('A178-07', 'REQ-26',
      { geotextil_zwischen_filter_drane: false },
      { geotextil_zwischen_filter_drane: true });
  });

  it('A178-07 REQ-27  pflanzdichte >= 4 AND pflanzdichte <= 8', async () => {
    await proveBothWays('A178-07', 'REQ-27', { pflanzdichte: 5 }, { pflanzdichte: 3 });
  });

  it("A178-09 REQ-18  IF system_type=='trenn' AND h_N_a_m>1000 THEN A_F >= 100*A_E_b_a  (guard-true both ways)", async () => {
    // A_F is Gl.1-derived but B_RBF_zu degrades to hand-entry, so A_F is a real
    // persisted value here (its computability is proven in the equation block).
    await proveBothWays('A178-09', 'REQ-18',
      { system_type: 'trenn', h_N_a_m: 2000, A_E_b_a: 10, A_F: 1500 },
      { system_type: 'trenn', h_N_a_m: 2000, A_E_b_a: 10, A_F: 500 });
  });

  it('A178-11 REQ-15  h_RR >= 0.3 AND h_RR <= 2', async () => {
    await proveBothWays('A178-11', 'REQ-15', { h_RR: 1.0 }, { h_RR: 2.5 });
  });

  it("A178-12 REQ-09  IF system_type=='misch' THEN (e_0<=55 AND n_RBF>=10)  (guard-true both ways)", async () => {
    await proveBothWays('A178-12', 'REQ-09',
      { system_type: 'misch', e_0: 50, n_RBF: 12 },
      { system_type: 'misch', e_0: 60, n_RBF: 12 });
  });

  it("A178-12 REQ-10  IF system_type IN {trenn,strasse} THEN v_spez_grobstoff >= 0.5  (guard-true both ways)", async () => {
    await proveBothWays('A178-12', 'REQ-10',
      { system_type: 'trenn', v_spez_grobstoff: 0.6 },
      { system_type: 'trenn', v_spez_grobstoff: 0.4 });
  });

  it('A178-12 REQ-11  attest_a178_12_req_11 == True', async () => {
    await proveBothWays('A178-12', 'REQ-11',
      { attest_a178_12_req_11: true },
      { attest_a178_12_req_11: false });
  });

  it("A178-12 REQ-12  (IF misch THEN h_FK>=0.75) AND (IF trenn/strasse THEN h_FK>=0.5)  (misch branch both ways)", async () => {
    await proveBothWays('A178-12', 'REQ-12',
      { system_type: 'misch', h_FK_required: 0.8 },
      { system_type: 'misch', h_FK_required: 0.6 });
  });

  it('A178-12 REQ-23  langzeitsimulation_dauer >= 10', async () => {
    await proveBothWays('A178-12', 'REQ-23',
      { langzeitsimulation_dauer: 12 },
      { langzeitsimulation_dauer: 8 });
  });

  it('A178-13 REQ-19  4 <= b_F AND b_F <= 7', async () => {
    await proveBothWays('A178-13', 'REQ-19', { b_F: 5 }, { b_F: 8 });
  });

  it('A178-16 REQ-20  B_RBFA_ab / A_E_b_a <= b_R_e_zul', async () => {
    // B_RBFA_ab is Gl.11-derived (pure sum) — proven computable in the equation
    // block; here persisted as a real value to drive the ratio gate.
    await proveBothWays('A178-16', 'REQ-20',
      { B_RBFA_ab: 50, A_E_b_a: 10, b_R_e_zul: 6 },
      { B_RBFA_ab: 80, A_E_b_a: 10, b_R_e_zul: 6 });
  });

  it("A178-16 REQ-21  IF system_type=='misch' THEN t_RR_E_n1 <= 48  (guard-true both ways)", async () => {
    await proveBothWays('A178-16', 'REQ-21',
      { system_type: 'misch', t_RR_E_n1: 40 },
      { system_type: 'misch', t_RR_E_n1: 50 });
  });

  it('A178-17 REQ-22  n_RBF >= 10', async () => {
    await proveBothWays('A178-17', 'REQ-22', { n_RBF: 10 }, { n_RBF: 8 });
  });

  it('A178-18 REQ-24  convergence_achieved == True', async () => {
    await proveBothWays('A178-18', 'REQ-24',
      { convergence_achieved: true },
      { convergence_achieved: false });
  });
});

// ── Derived gate-inputs + parked engine gaps, through the REAL evaluateFormula ──

function runEq(num: string, inputs: Record<string, number>) {
  const e = A178_EQUATIONS.find((x) => x.num === num)!;
  return evaluateFormula({
    equationId: fixture.equationIds[num],
    formula: e.formula,
    inputSymbols: Object.keys(inputs),
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('DWA-A-178 — derived gate-inputs COMPUTE (gates runnable) via the REAL engine', () => {
  it('Gl.1  A_F = (B_RBF_zu / b_krit) * eta_B_soll  — computes from hand-entered B_RBF_zu', () => {
    const r = runEq('1', { B_RBF_zu: 700, b_krit: 7, eta_B_soll: 0.9 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo((700 / 7) * 0.9, 9); // 90
  });
  it('Gl.11  B_RBFA_ab = B_VS + B_Dr_RBF + B_FU + B_RRL  — pure sum, computes', () => {
    const r = runEq('11', { B_VS: 10, B_Dr_RBF: 20, B_FU: 15, B_RRL: 5 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(50, 9);
  });
  it('Gl.13  eta_F = ((C_RBF_zu·VQ_Dr_RBF) − (B_RBF_ab·1000)) / (C_RBF_zu·VQ_RBF_zu)  — computes', () => {
    const r = runEq('13', { C_RBF_zu: 100, VQ_Dr_RBF: 800, B_RBF_ab: 40, VQ_RBF_zu: 1000 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo((100 * 800 - 40 * 1000) / (100 * 1000), 9); // 0.4
  });
  it('Gl.5  b_F = ((VQ_Dr_RBF·eta_F)·C_RBFA_zu·(1−eta_VS)) / (A_F·1000)  — computes', () => {
    const r = runEq('5', { VQ_Dr_RBF: 800, eta_F: 0.4, C_RBFA_zu: 100, eta_VS: 0.2, A_F: 90 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo((800 * 0.4 * 100 * 0.8) / (90 * 1000), 9);
  });
});

describe('DWA-A-178 — PARKED engine gaps FAIL LOUD through the REAL engine (never fabricate)', () => {
  it('Gl.2  B_RBF_zu = SUM_over_i(A_E_b_a_i * b_R_a)  — SUM_over_i unsupported → not computed', () => {
    const r = runEq('2', { A_E_b_a_i: 5, b_R_a: 40 });
    expect(r.kind).not.toBe('computed'); // manual_required (Unbekannter Funktionsaufruf)
  });
  it('Gl.3  B_RBF_zu = SUM_over_i(A_E_b_a_i * b_R_a * e_0)  — SUM_over_i unsupported → not computed', () => {
    const r = runEq('3', { A_E_b_a_i: 5, b_R_a: 40, e_0: 55 });
    expect(r.kind).not.toBe('computed');
  });
  it('Gl.9  b_F_im_bereich = "4 <= b_F <= b_krit = 7"  — malformed two-sided criterion → not computed', () => {
    const r = runEq('9', { b_F: 5, b_krit: 7 });
    expect(r.kind).not.toBe('computed'); // manual_required (comparison/criterion formula)
  });
});
