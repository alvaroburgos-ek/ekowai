/**
 * ATV-A-704E / DWA-A 704E ("Operating Methods for Wastewater Analysis") — REAL
 * save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * each of the standard's 26 live BLOCK gates by driving it through the REAL
 * enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every
 *                                      block condition against the SAVED values
 *                                      and lists the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts) — local field
 * symbols plus the conflict-free project-wide fallback. A gate is proven
 * ENFORCING only when shown BOTH ways: a persisted state where it does NOT block,
 * and a persisted state where it DOES (the F-4 lesson).
 *
 *   - 22 attestation gates `attest_… == True` — pass with True, VIOLATE with False.
 *   - 3 cross-worksheet ordering acompares `deviation_*_pct <= qa_quality_target_pct`
 *     (CR-019 host WS09, CR-022/023 host WS10): `qa_quality_target_pct` lives on WS08,
 *     so it resolves via the project-wide fallback exactly as in the deployed app.
 *   - CR-025 compound range, CR-026 simple ordering — both ways.
 *
 * The 4 WARN gates (CR-013, CR-028, CR-029, CR-030) are shown NEVER to appear in the
 * approval-gate block set — the 3 empty-condition ones are `manual` no-ops AND warn.
 *
 * The 6 equations are driven through the REAL evaluateFormula: EQ-02..06 COMPUTE;
 * EQ-01 (`SUM(single_result_i)/n_determinations`) is engine-unsupported → NR.
 *
 * Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-a704e'; // top-level-await: PG + seedA704E BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getA704EHarness } from './_harness-env-a704e';
import { A704E_GATES, A704E_EQUATIONS } from './seed-a704e';
import { evaluateFormula } from '@/lib/eval/formula';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getA704EHarness();

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

/** Every BLOCK gate code the test actually drives — asserted to cover all 26. */
const DRIVEN = new Set<string>();

/** Persist a symbol→value map through the REAL saveWorksheet, partitioned by each
 *  symbol's home worksheet. Value `type` is the field's real data_type. */
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

/** Whether `code` is in the block-gate failing list for worksheet `ws` given the
 *  CURRENT persisted project state (the real approval-gate read path). */
async function gateBlocks(ws: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[ws]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

/** Prove a BLOCK gate ENFORCING both ways through the real save path. */
async function proveBothWays(
  ws: string,
  code: string,
  passState: Record<string, Val>,
  violateState: Record<string, Val>,
): Promise<void> {
  DRIVEN.add(code);
  await saveSymbols(passState);
  expect(await gateBlocks(ws, code), `${code} should NOT block in passing state`).toBe(false);
  await saveSymbols(violateState);
  expect(await gateBlocks(ws, code), `${code} SHOULD block in violating state`).toBe(true);
}

// ────────────────────────────────────────────────────────────────────────────
// Seed sanity — topology matches prod
// ────────────────────────────────────────────────────────────────────────────
describe('ATV-A-704E — seed sanity (12 worksheets, 26 block gates, 4 warn, 6 equations)', () => {
  it('seeds 12 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(12);
  });
  it('has 26 block gates + 4 warn gates verbatim from prod', () => {
    expect(A704E_GATES.filter((g) => g.sev === 'block').length).toBe(26);
    expect(A704E_GATES.filter((g) => g.sev === 'warn').length).toBe(4);
  });
  it('no literal-TRUE / != null / == null / != "" block gate present (trap-2 audit clean)', () => {
    const blocks = A704E_GATES.filter((g) => g.sev === 'block');
    expect(blocks.some((g) => g.cond.trim() === 'TRUE')).toBe(false);
    expect(blocks.some((g) => /!=\s*''|!=\s*""|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
    // No IN {...} and no IF…THEN block gates in this standard (traps 3 & 4 N/A).
    expect(blocks.some((g) => /\bIN\b\s*\{/i.test(g.cond))).toBe(false);
    expect(blocks.some((g) => /\bIF\b/i.test(g.cond))).toBe(false);
  });
  it('has 6 equations', () => {
    expect(A704E_EQUATIONS.length).toBe(6);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WS01 — 8 attestation gates
// ────────────────────────────────────────────────────────────────────────────
describe('ATV-A-704E-01 — scope & requirements attestations', () => {
  const WS = 'ATV-A-704E-01';
  for (const n of ['001', '002', '003', '004', '005', '006', '007', '008']) {
    const sym = `attest_atv_a_704e_01_cr_${n}`;
    it(`CR-${n}  ${sym} == True`, async () => {
      await proveBothWays(WS, `CR-${n}`, { [sym]: true }, { [sym]: false });
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// WS03 — 4 attestation gates
// ────────────────────────────────────────────────────────────────────────────
describe('ATV-A-704E-03 — method selection & instruction attestations', () => {
  const WS = 'ATV-A-704E-03';
  for (const n of ['009', '010', '011', '012']) {
    const sym = `attest_atv_a_704e_03_cr_${n}`;
    it(`CR-${n}  ${sym} == True`, async () => {
      await proveBothWays(WS, `CR-${n}`, { [sym]: true }, { [sym]: false });
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// WS05 — 2 attestation gates
// ────────────────────────────────────────────────────────────────────────────
describe('ATV-A-704E-05 — QC & plausibility attestations', () => {
  const WS = 'ATV-A-704E-05';
  it('CR-014  attest_atv_a_704e_05_cr_014 == True', async () => {
    await proveBothWays(WS, 'CR-014', { attest_atv_a_704e_05_cr_014: true }, { attest_atv_a_704e_05_cr_014: false });
  });
  it('CR-015  attest_atv_a_704e_05_cr_015 == True', async () => {
    await proveBothWays(WS, 'CR-015', { attest_atv_a_704e_05_cr_015: true }, { attest_atv_a_704e_05_cr_015: false });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WS07 — 3 attestation gates
// ────────────────────────────────────────────────────────────────────────────
describe('ATV-A-704E-07 — documentation attestations', () => {
  const WS = 'ATV-A-704E-07';
  for (const n of ['016', '017', '018']) {
    const sym = `attest_atv_a_704e_07_cr_${n}`;
    it(`CR-${n}  ${sym} == True`, async () => {
      await proveBothWays(WS, `CR-${n}`, { [sym]: true }, { [sym]: false });
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// WS08 — 4 attestation gates
// ────────────────────────────────────────────────────────────────────────────
describe('ATV-A-704E-08 — IQC framework attestations', () => {
  const WS = 'ATV-A-704E-08';
  for (const n of ['020', '021', '024', '027']) {
    const sym = `attest_atv_a_704e_08_cr_${n}`;
    it(`CR-${n}  ${sym} == True`, async () => {
      await proveBothWays(WS, `CR-${n}`, { [sym]: true }, { [sym]: false });
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// WS09/WS10 — cross-worksheet ordering acompares against qa_quality_target_pct (WS08)
// ────────────────────────────────────────────────────────────────────────────
describe('ATV-A-704E-09/10 — deviation ≤ quality-target (cross-worksheet acompare via project-wide fallback)', () => {
  it('CR-019  deviation_single_pct <= qa_quality_target_pct', async () => {
    await proveBothWays('ATV-A-704E-09', 'CR-019',
      { deviation_single_pct: 5, qa_quality_target_pct: 10 },
      { deviation_single_pct: 15, qa_quality_target_pct: 10 });
  });
  it('CR-022  deviation_equivalency_pct <= qa_quality_target_pct', async () => {
    await proveBothWays('ATV-A-704E-10', 'CR-022',
      { deviation_equivalency_pct: 5, qa_quality_target_pct: 10 },
      { deviation_equivalency_pct: 15, qa_quality_target_pct: 10 });
  });
  it('CR-023  deviation_parallel_pct <= qa_quality_target_pct', async () => {
    await proveBothWays('ATV-A-704E-10', 'CR-023',
      { deviation_parallel_pct: 5, qa_quality_target_pct: 10 },
      { deviation_parallel_pct: 15, qa_quality_target_pct: 10 });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WS11 — testing-equipment monitoring (compound range + simple ordering)
// ────────────────────────────────────────────────────────────────────────────
describe('ATV-A-704E-11 — testing-equipment tolerances', () => {
  const WS = 'ATV-A-704E-11';
  it('CR-025  (vol<=0.5 AND dev<=2) OR (vol>=1.0 AND dev<=1)', async () => {
    await proveBothWays(WS, 'CR-025',
      { pipette_tested_volume: 0.4, pipette_deviation_pct: 1.5 },  // first disjunct true → pass
      { pipette_tested_volume: 0.4, pipette_deviation_pct: 3 });   // both disjuncts false → fail
  });
  it('CR-026  heating_device_deviation <= 3', async () => {
    await proveBothWays(WS, 'CR-026',
      { heating_device_deviation: 2 },
      { heating_device_deviation: 5 });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WARN gates never block (CR-013 boolean warn; CR-028/029/030 empty-condition no-op warns)
// ────────────────────────────────────────────────────────────────────────────
describe('ATV-A-704E — 4 WARN gates never appear in the approval-gate block set', () => {
  it('CR-013 (WS04, warn) does not block even when training_courses_attended == false', async () => {
    await saveSymbols({ training_courses_attended: false });
    expect(await gateBlocks('ATV-A-704E-04', 'CR-013')).toBe(false);
  });
  it('CR-029 (WS05), CR-028 (WS07), CR-030 (WS08) — empty-condition warns never block', async () => {
    expect(await gateBlocks('ATV-A-704E-05', 'CR-029')).toBe(false);
    expect(await gateBlocks('ATV-A-704E-07', 'CR-028')).toBe(false);
    expect(await gateBlocks('ATV-A-704E-08', 'CR-030')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// (B) EQUATIONS — through the REAL evaluateFormula
// ────────────────────────────────────────────────────────────────────────────
function runEq(num: string, inputs: Record<string, number>) {
  const e = A704E_EQUATIONS.find((x) => x.num === num)!;
  return evaluateFormula({
    equationId: `A704E-${num}`,
    formula: e.formula,
    inputSymbols: e.inputs,
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('ATV-A-704E — 6 IQC equations through the REAL engine', () => {
  it('EQ-01  mean_value = SUM(single_result_i)/n_determinations  → SUM unsupported → manual_required (NR)', () => {
    const r = runEq('EQ-01', { single_result_i: 10, n_determinations: 3 });
    expect(r.kind).toBe('manual_required');
  });
  it('EQ-02  deviation_single_pct = 100*(single_result_i - mean_value)/mean_value  → COMPUTES', () => {
    const r = runEq('EQ-02', { single_result_i: 11, mean_value: 10 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(10, 6);
  });
  it('EQ-03  calculated_value = (total_volume/sample_volume)*measured_value_diluted_sample  → COMPUTES', () => {
    const r = runEq('EQ-03', { total_volume: 100, sample_volume: 10, measured_value_diluted_sample: 5 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(50, 6);
  });
  it('EQ-04  NSS = (v_s*m_o + v_std*c_std)/(v_s + v_std)  → COMPUTES', () => {
    const r = runEq('EQ-04', {
      volume_sample: 100, measured_value_original_sample: 2,
      volume_standard: 10, concentration_standard: 20,
    });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(400 / 110, 6);
  });
  it('EQ-05  deviation_equivalency_pct = 100*(op - nom)/nom  → COMPUTES', () => {
    const r = runEq('EQ-05', { measured_value_operating: 11, nominal_value_reference: 10 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(10, 6);
  });
  it('EQ-06  deviation_parallel_pct = 100*(op - ref)/ref  → COMPUTES', () => {
    const r = runEq('EQ-06', { measured_value_operating: 11, measured_value_reference: 10 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(10, 6);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Coverage — every one of the 26 block gates was driven (undriven list MUST be empty)
// ────────────────────────────────────────────────────────────────────────────
describe('ATV-A-704E — all 26 block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every block gate code in prod topology', () => {
    const blockCodes = A704E_GATES.filter((g) => g.sev === 'block').map((g) => g.code).sort();
    const undriven = blockCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(DRIVEN.size).toBe(26);
  });
});
