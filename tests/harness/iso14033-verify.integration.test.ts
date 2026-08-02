/**
 * ISO 14033 ("Environmental management — Quantitative environmental information
 * — Guidelines and examples", First edition 2019, ISO 14033:2019(E)) — REAL
 * save-path execution proof + equation compute proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This standard has
 * 0 BLOCK gates by construction (a "Guidelines and examples" ISO: 99 "should",
 * exactly 1 "shall" = patent-rights boilerplate in the Foreword; §2 normative
 * ref = ISO 14050 vocabulary only). So there is no block gate to prove both
 * ways. What this harness DOES prove by execution:
 *
 *   1. seed-sanity: 8 worksheets, 0 BLOCK gates (asserted absent), 27 WARN, 1 eq.
 *   2. the 1 EQUATION driven through the REAL `evaluateFormula` → `computed`
 *      (WS06 §6.3.3 / Annex A §A.2.4, doc p.23: activity data × emission/removal
 *      factor). Operator `*` is engine-supported → FAITHFUL. No comma-decimals.
 *   3. the compute surface persists: parameter_value round-trips through the
 *      REAL `saveWorksheet` → project_parameters and reads back.
 *   4. spot-checked WARN gates are proven NEVER to enter the approval-gate BLOCK
 *      set — even in states where their condition definitely FAILS — across
 *      shapes: boolean-equality, enum-IN, `!= ''`, arithmetic-equality, and the
 *      EMPTY-condition warn (evaluator → `manual`). This is the honest statement
 *      that the standard enforces nothing: `failingBlockConditions` is empty for
 *      every worksheet regardless of persisted state.
 *
 * Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-iso14033'; // top-level-await: PG + seedISO14033 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO14033Harness } from './_harness-env-iso14033';
import { ISO14033_GATES, ISO14033_EQUATIONS } from './seed-iso14033';
import { evaluateFormula } from '@/lib/eval/formula';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO14033Harness();

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

/** The full failing-block-condition list for a worksheet (should ALWAYS be empty
 *  for a 0-block-gate standard, no matter what is persisted). */
async function blockingCodes(ws: string): Promise<string[]> {
  const result = await checkApprovalGate(fixture.instances[ws]);
  return result.failingBlockConditions.map((c) => c.code);
}

// ────────────────────────────────────────────────────────────────────────────
// Seed sanity — topology matches prod (0 block gates is the headline)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 14033 — seed sanity (8 worksheets, 0 block gates, 27 warn, 1 equation)', () => {
  it('seeds 8 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(8);
  });
  it('has 0 BLOCK gates + 27 WARN gates verbatim from prod', () => {
    expect(ISO14033_GATES.filter((g) => g.sev === 'block').length).toBe(0);
    expect(ISO14033_GATES.filter((g) => g.sev === 'warn').length).toBe(27);
  });
  it('NOT A SINGLE gate carries severity=block (enforces-nothing posture asserted)', () => {
    expect(ISO14033_GATES.every((g) => g.sev === 'warn')).toBe(true);
  });
  it('has exactly 1 equation', () => {
    expect(ISO14033_EQUATIONS.length).toBe(1);
    expect(ISO14033_EQUATIONS[0].out).toBe('parameter_value');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// (B) THE 1 EQUATION — through the REAL evaluateFormula (§6.3.3 / Annex A §A.2.4)
// ────────────────────────────────────────────────────────────────────────────
function runEq(out: string, inputs: Record<string, number>) {
  const e = ISO14033_EQUATIONS.find((x) => x.out === out)!;
  return evaluateFormula({
    equationId: `ISO14033-${out}`,
    formula: e.formula,
    inputSymbols: e.inputs,
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('ISO 14033 — the 1 equation through the REAL engine (activity data × emission/removal factor, doc p.23)', () => {
  it('parameter_value = activity_data * emission_removal_factor → COMPUTES', () => {
    const r = runEq('parameter_value', { activity_data: 1200, emission_removal_factor: 0.45 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') {
      expect(r.value).toBeCloseTo(1200 * 0.45, 6); // 540
      expect(r.formulaEvaluated).toBe('activity_data * emission_removal_factor');
    }
  });
  it('a second input pair also computes (operator is real multiplication, not a coincidence)', () => {
    const r = runEq('parameter_value', { activity_data: 7, emission_removal_factor: 3 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBe(21);
  });
  it('a missing input is NOT a false compute (manual_required, never a hidden 0)', () => {
    const r = runEq('parameter_value', { activity_data: 1200 }); // emission_removal_factor absent
    expect(r.kind).toBe('manual_required');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// (C) PERSISTENCE — the compute surface round-trips through the REAL save path
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 14033 — compute-surface fields persist through the REAL saveWorksheet', () => {
  it('parameter_value round-trips through project_parameters', async () => {
    await saveSymbols({ activity_data: 1200, emission_removal_factor: 0.45, parameter_value: 540 });
    const rows = await harness.sql<{ value_number: string | null }[]>`
      SELECT pp.value_number
      FROM project_parameters pp
      JOIN fields f ON f.id = pp.field_id
      WHERE f.symbol = 'parameter_value'`;
    expect(rows.length).toBe(1);
    expect(Number(rows[0].value_number)).toBeCloseTo(540, 6);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// (D) WARN gates never block — even when their condition definitely FAILS.
// Across shapes: boolean-equality, enum-IN, `!= ''`, arithmetic-equality, empty.
// For a 0-block-gate standard the approval-gate block set is ALWAYS empty.
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 14033 — WARN gates never enter the approval-gate BLOCK set (enforces-nothing, proven)', () => {
  it('CR-004 (WS01, boolean == true) never blocks even when false', async () => {
    await saveSymbols({ normative_reference_iso14050: false });
    expect(await gateBlocks('ISO-14033-01', 'CR-004')).toBe(false);
  });
  it('CR-002 (WS01, enum IN {…}) never blocks even with an out-of-set value', async () => {
    await saveSymbols({ application_scope: 'none' }); // not in {internal,external,comparison}
    expect(await gateBlocks('ISO-14033-01', 'CR-002')).toBe(false);
  });
  it('CR-007 (WS02, boolean == true) never blocks even when false', async () => {
    await saveSymbols({ metadata_supplied: false });
    expect(await gateBlocks('ISO-14033-02', 'CR-007')).toBe(false);
  });
  it('CR-019 (WS06, arithmetic equality) never blocks even when parameter_value ≠ activity×factor', async () => {
    await saveSymbols({ activity_data: 1200, emission_removal_factor: 0.45, parameter_value: 999 });
    expect(await gateBlocks('ISO-14033-06', 'CR-019')).toBe(false);
  });
  it('CR-022 (WS07, boolean == true) never blocks even when false', async () => {
    await saveSymbols({ plan_do_correspondence: false });
    expect(await gateBlocks('ISO-14033-07', 'CR-022')).toBe(false);
  });
  it("CR-025 (WS07, EMPTY condition → manual) never blocks", async () => {
    expect(await gateBlocks('ISO-14033-07', 'CR-025')).toBe(false);
  });
  it("CR-027 (WS08, `improvement_actions != '' AND act_documented`) never blocks even when act_documented false", async () => {
    await saveSymbols({ improvement_actions: 'reduce CO2', act_documented: false });
    expect(await gateBlocks('ISO-14033-08', 'CR-027')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// The whole-standard invariant: NO worksheet ever has a failing block condition,
// in any persisted state. This is the 0-block-gate posture stated as one assertion.
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 14033 — every worksheet has an EMPTY block set in every persisted state', () => {
  it('after all the failing-warn writes above, no worksheet reports a failing BLOCK condition', async () => {
    for (const ws of Object.keys(fixture.instances)) {
      const codes = await blockingCodes(ws);
      expect(codes, `worksheet ${ws} unexpectedly has failing block conditions: ${codes.join(', ')}`).toEqual([]);
    }
  });
});
