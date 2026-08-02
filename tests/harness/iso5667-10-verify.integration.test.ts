/**
 * ISO 5667-10 ("Water quality — Sampling — Part 10: Guidance on sampling of
 * waste waters", 2020 second edition) — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * each of the standard's 29 live BLOCK gates by driving it through the REAL
 * enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every
 *                                      block condition against the SAVED values
 *                                      and lists the ones that definitely `fail`.
 *
 * A gate is proven ENFORCING only when shown BOTH ways: a persisted state where
 * it does NOT block, and one where it DOES (the F-4 lesson).
 *
 *   - 3 existence gates `symbol IS NOT NULL` (CR-001/010/028): absent → BLOCK,
 *     present → pass. (`IS NOT NULL` is the ENFORCING `exists` node, not the
 *     `!= null` no-op.)
 *   - 16 boolean attestations `== true|True`: pass True, VIOLATE False.
 *   - 5 single numeric thresholds + 5 compound numeric AND gates: pass all
 *     operands, VIOLATE one → whole AND false → blocks. Values are the printed
 *     minima/maxima (§3.4 5-samples/2 h/2 min; §5 3× diameters; §5.4 30 s;
 *     §7.2 5× diameters, ≤30 min, 9 mm/0,5 m/s, 25 ml/±10 %/±5 %/±15 %;
 *     §8 25 ml/±5 %; §9.4.3 (5±3) °C).
 *   - 5 gates read a field on a DIFFERENT worksheet than the gate host and
 *     resolve via the conflict-free project-wide fallback (CR-005/014/022/030/034).
 *
 * The 7 WARN gates are shown NEVER to appear in the approval-gate block set
 * (spot-checked).
 *
 * The 3 equations are driven through the REAL evaluateFormula: all COMPUTE
 * (§4.3.2 Formulas 1/2 p.5; §7.2.2.3 Formula 3 p.13). No comma-decimals, no SUM.
 *
 * Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-iso5667-10'; // top-level-await: PG + seedISO5667_10 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO5667_10Harness } from './_harness-env-iso5667-10';
import { ISO5667_10_GATES, ISO5667_10_EQUATIONS } from './seed-iso5667-10';
import { evaluateFormula } from '@/lib/eval/formula';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO5667_10Harness();

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

/** Every BLOCK gate code the test actually drives — asserted to cover all 29. */
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

/** Prove a value-driven BLOCK gate ENFORCING both ways: a persisted PASS state,
 *  then a persisted VIOLATE state. */
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

/** Prove an EXISTENCE (`IS NOT NULL`) BLOCK gate both ways. The VIOLATE state is
 *  ABSENCE — assert it blocks BEFORE the operand symbol is ever saved, then save
 *  it present and assert it clears. Must run before any save of these symbols. */
async function proveExistenceGate(
  ws: string,
  code: string,
  presentState: Record<string, Val>,
): Promise<void> {
  DRIVEN.add(code);
  expect(await gateBlocks(ws, code), `${code} SHOULD block when operand(s) absent`).toBe(true);
  await saveSymbols(presentState);
  expect(await gateBlocks(ws, code), `${code} should NOT block once operand(s) present`).toBe(false);
}

// ────────────────────────────────────────────────────────────────────────────
// Seed sanity — topology matches prod
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-10 — seed sanity (10 worksheets, 29 block gates, 7 warn, 3 equations)', () => {
  it('seeds 10 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(10);
  });
  it('has 29 block gates + 7 warn gates verbatim from prod', () => {
    expect(ISO5667_10_GATES.filter((g) => g.sev === 'block').length).toBe(29);
    expect(ISO5667_10_GATES.filter((g) => g.sev === 'warn').length).toBe(7);
  });
  it('no literal-TRUE / != null / == null / != "" block gate present (trap audit clean)', () => {
    const blocks = ISO5667_10_GATES.filter((g) => g.sev === 'block');
    expect(blocks.some((g) => g.cond.trim() === 'TRUE')).toBe(false);
    expect(blocks.some((g) => /!=\s*''|!=\s*""|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
    // No IN {...} and no IF…THEN block gates in this standard (traps 3 & 4 N/A).
    expect(blocks.some((g) => /\bIN\b\s*\{/i.test(g.cond))).toBe(false);
    expect(blocks.some((g) => /\bIF\b/i.test(g.cond))).toBe(false);
    // No empty-condition block gate.
    expect(blocks.some((g) => g.cond.trim() === '')).toBe(false);
  });
  it('has 3 equations', () => {
    expect(ISO5667_10_EQUATIONS.length).toBe(3);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Existence (IS NOT NULL) BLOCK gates — absent → block, present → pass.
// These MUST run before any save of their operand symbols.
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-10 — existence block gates (IS NOT NULL enforces via the exists node)', () => {
  it('CR-001 (WS01)  waste_water_type IS NOT NULL', async () => {
    await proveExistenceGate('ISO-5667-10-01', 'CR-001', { waste_water_type: 'industrial_treated' });
  });
  it('CR-010 (WS04)  specific_site_type IS NOT NULL', async () => {
    await proveExistenceGate('ISO-5667-10-04', 'CR-010', { specific_site_type: 'sewer' });
  });
  it('CR-028 (WS08)  max_storage_time IS NOT NULL', async () => {
    await proveExistenceGate('ISO-5667-10-08', 'CR-028', { max_storage_time: 24 });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Boolean attestation BLOCK gates — pass True, VIOLATE False
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-10 — boolean attestation block gates', () => {
  it('CR-005 (host WS01, field WS02)  sampling_point_documented == true  [project-wide fallback]', async () => {
    await proveBothWays('ISO-5667-10-01', 'CR-005', { sampling_point_documented: true }, { sampling_point_documented: false });
  });
  it('CR-004 (WS02)  well_mixed_section == true', async () => {
    await proveBothWays('ISO-5667-10-02', 'CR-004', { well_mixed_section: true }, { well_mixed_section: false });
  });
  it('CR-006 (WS02)  unusual_hydraulic_conditions_recorded == True', async () => {
    await proveBothWays('ISO-5667-10-02', 'CR-006', { unusual_hydraulic_conditions_recorded: true }, { unusual_hydraulic_conditions_recorded: false });
  });
  it('CR-014 (host WS05, field WS06)  sampling_objective_defined == true  [project-wide fallback]', async () => {
    await proveBothWays('ISO-5667-10-05', 'CR-014', { sampling_objective_defined: true }, { sampling_objective_defined: false });
  });
  it('CR-022 (host WS05, field WS07)  material_compatible == true  [project-wide fallback]', async () => {
    await proveBothWays('ISO-5667-10-05', 'CR-022', { material_compatible: true }, { material_compatible: false });
  });
  it('CR-023 (WS07)  sampler_refrigerated == True', async () => {
    await proveBothWays('ISO-5667-10-07', 'CR-023', { sampler_refrigerated: true }, { sampler_refrigerated: false });
  });
  it('CR-025 (WS08)  homogenization_done == true', async () => {
    await proveBothWays('ISO-5667-10-08', 'CR-025', { homogenization_done: true }, { homogenization_done: false });
  });
  it('CR-026 (WS08)  preservation_per_iso5667_3 == true', async () => {
    await proveBothWays('ISO-5667-10-08', 'CR-026', { preservation_per_iso5667_3: true }, { preservation_per_iso5667_3: false });
  });
  it('CR-029 (WS08)  sample_traceability == true', async () => {
    await proveBothWays('ISO-5667-10-08', 'CR-029', { sample_traceability: true }, { sample_traceability: false });
  });
  it('CR-030 (host WS08, field WS09)  written_contamination_instructions == true  [project-wide fallback]', async () => {
    await proveBothWays('ISO-5667-10-08', 'CR-030', { written_contamination_instructions: true }, { written_contamination_instructions: false });
  });
  it('CR-031 (WS09)  field_form_completed == true', async () => {
    await proveBothWays('ISO-5667-10-09', 'CR-031', { field_form_completed: true }, { field_form_completed: false });
  });
  it('CR-032 (WS09)  qa_qc_per_iso5667_14 == true', async () => {
    await proveBothWays('ISO-5667-10-09', 'CR-032', { qa_qc_per_iso5667_14: true }, { qa_qc_per_iso5667_14: false });
  });
  it('CR-033 (WS09)  report_items_recorded == true', async () => {
    await proveBothWays('ISO-5667-10-09', 'CR-033', { report_items_recorded: true }, { report_items_recorded: false });
  });
  it('CR-034 (host WS09, field WS10)  risk_assessed_before_sampling == true  [project-wide fallback]', async () => {
    await proveBothWays('ISO-5667-10-09', 'CR-034', { risk_assessed_before_sampling: true }, { risk_assessed_before_sampling: false });
  });
  it('CR-035 (WS10)  systematic_ppe_worn == true', async () => {
    await proveBothWays('ISO-5667-10-10', 'CR-035', { systematic_ppe_worn: true }, { systematic_ppe_worn: false });
  });
  it('CR-036 (WS10)  equipment_secured == True', async () => {
    await proveBothWays('ISO-5667-10-10', 'CR-036', { equipment_secured: true }, { equipment_secured: false });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Single numeric threshold BLOCK gates — printed minima/maxima
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-10 — single numeric threshold block gates (verbatim printed limits)', () => {
  it('CR-007 (WS03)  number_of_samples > 0', async () => {
    await proveBothWays('ISO-5667-10-03', 'CR-007', { number_of_samples: 12 }, { number_of_samples: 0 });
  });
  it('CR-011 (WS04)  restriction_downstream_diameters >= 3  (§5, "al menos tres veces el diámetro")', async () => {
    await proveBothWays('ISO-5667-10-04', 'CR-011', { restriction_downstream_diameters: 3 }, { restriction_downstream_diameters: 2 });
  });
  it('CR-012 (WS04)  cooling_runoff_time >= 30  (§5.4, "correr el agua durante al menos 30 s")', async () => {
    await proveBothWays('ISO-5667-10-04', 'CR-012', { cooling_runoff_time: 30 }, { cooling_runoff_time: 20 });
  });
  it('CR-015 (WS06)  sampling_line_length_diameters >= 5  (§7.3, "al menos cinco veces [el diámetro]")', async () => {
    await proveBothWays('ISO-5667-10-06', 'CR-015', { sampling_line_length_diameters: 5 }, { sampling_line_length_diameters: 4 });
  });
  it('CR-016 (WS06)  composite_interval <= 30  (§4.3.2, 24 h composite max 30 min)', async () => {
    await proveBothWays('ISO-5667-10-06', 'CR-016', { composite_interval: 30 }, { composite_interval: 31 });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Compound numeric AND BLOCK gates — pass all operands, VIOLATE one
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-10 — compound numeric AND block gates (violate one operand → blocks)', () => {
  it('CR-002 (WS01)  qualified_grab_count >= 5 AND window <= 2 AND interval >= 2  (§3.4)', async () => {
    await proveBothWays(
      'ISO-5667-10-01', 'CR-002',
      { qualified_grab_count: 5, qualified_grab_window: 2, qualified_grab_interval: 2 },
      { qualified_grab_count: 4, qualified_grab_window: 2, qualified_grab_interval: 2 },
    );
  });
  it('CR-017 (WS06)  tube_internal_diameter >= 9 AND suction_velocity >= 0.5  (§7.3, 9 mm / 0,5 m/s)', async () => {
    await proveBothWays(
      'ISO-5667-10-06', 'CR-017',
      { tube_internal_diameter: 9, suction_velocity: 0.5 },
      { tube_internal_diameter: 9, suction_velocity: 0.4 },
    );
  });
  it('CR-018 (WS06)  unit_volume >= 25 AND sampling_bias <= 10 AND repeatability_cv <= 5 AND flow_uncertainty_k2 <= 15', async () => {
    await proveBothWays(
      'ISO-5667-10-06', 'CR-018',
      { unit_volume: 25, sampling_bias: 10, repeatability_cv: 5, flow_uncertainty_k2: 15 },
      { unit_volume: 24, sampling_bias: 10, repeatability_cv: 5, flow_uncertainty_k2: 15 },
    );
  });
  it('CR-024 (WS07)  manual_min_volume >= 25 AND manual_repeatability_cv <= 5  (§8, 25 ml / ±5 %)', async () => {
    await proveBothWays(
      'ISO-5667-10-07', 'CR-024',
      { manual_min_volume: 25, manual_repeatability_cv: 5 },
      { manual_min_volume: 25, manual_repeatability_cv: 6 },
    );
  });
  it('CR-027 (WS08)  transport_temperature >= 2 AND transport_temperature <= 8  (§9.4.3, (5±3) °C)', async () => {
    await proveBothWays(
      'ISO-5667-10-08', 'CR-027',
      { transport_temperature: 5 },
      { transport_temperature: 10 },
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WARN gates never block (spot-check across shapes)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-10 — WARN gates never appear in the approval-gate block set', () => {
  it('CR-003 (WS02, warn) does not block even when sampling_strategy_defined == false', async () => {
    await saveSymbols({ sampling_strategy_defined: false });
    expect(await gateBlocks('ISO-5667-10-02', 'CR-003')).toBe(false);
  });
  it('CR-019 (WS06, warn) V_n >= 0 does not block even when V_n == -1', async () => {
    await saveSymbols({ V_n: -1 });
    expect(await gateBlocks('ISO-5667-10-06', 'CR-019')).toBe(false);
  });
  it('CR-021 (WS06, warn) homogeneity_deviation < 20 does not block even when == 50', async () => {
    await saveSymbols({ homogeneity_deviation: 50 });
    expect(await gateBlocks('ISO-5667-10-06', 'CR-021')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// (B) EQUATIONS — through the REAL evaluateFormula
// ────────────────────────────────────────────────────────────────────────────
function runEq(num: string, inputs: Record<string, number>) {
  const e = ISO5667_10_EQUATIONS.find((x) => x.num === num)!;
  return evaluateFormula({
    equationId: `ISO5667-10-${num}`,
    formula: e.formula,
    inputSymbols: e.inputs,
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('ISO 5667-10 — 3 equations through the REAL engine (§4.3.2 F1/F2 p.5; §7.2.2.3 F3 p.13)', () => {
  it('Eq.1  sampling_day_k = A + (365 * k) / number_of_samples  → COMPUTES', () => {
    const r = runEq('1', { A: 0, k: 1, number_of_samples: 365 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(0 + (365 * 1) / 365, 6); // 1
  });
  it('Eq.2  sampling_week_k = A + (52 * k) / number_of_samples  → COMPUTES', () => {
    const r = runEq('2', { A: 0, k: 1, number_of_samples: 52 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(0 + (52 * 1) / 52, 6); // 1
  });
  it('Eq.3  V_n = V_final * (M3_n / M3_total)  → COMPUTES (flow-proportional reconstitution)', () => {
    const r = runEq('3', { V_final: 100, M3_n: 2, M3_total: 10 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(100 * (2 / 10), 6); // 20
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Coverage — every one of the 29 block gates was driven (undriven list MUST be empty)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-10 — all 29 block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every block gate code in prod topology', () => {
    const blockCodes = ISO5667_10_GATES.filter((g) => g.sev === 'block').map((g) => g.code).sort();
    const undriven = blockCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(DRIVEN.size).toBe(29);
  });
});
