/**
 * ISO 5667-16 ("Water quality — Sampling — Part 16: Guidance on biotesting of
 * samples", First edition 1998-10-01) — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * each of the standard's 2 live BLOCK gates by driving it through the REAL
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
 *   - CR-002 boolean attestation `normative_references_consulted == true`
 *     (WS01, §2 "Normative references … constitute provisions"): pass True, VIOLATE False.
 *   - CR-020 enum membership `dilution_water_type IN {chlorine_free_tapwater,
 *     synthetic_fresh_water, natural_sea_water}` (WS05, §9.1 "… shall be used"):
 *     pass 'synthetic_fresh_water', VIOLATE 'deionized_water' (which §9.1 forbids).
 *
 * ADVISORY-HEAVY standard by design: only 2 of 35 gates enforce. The 33 WARN
 * gates are shown NEVER to appear in the approval-gate block set (spot-checked
 * across shapes, incl. the EMPTY-condition warn CR-030 which the evaluator
 * returns as `manual`).
 *
 * The 2 equations are driven through the REAL evaluateFormula: both COMPUTE
 * (§11.2 Eq.1 BCF = c_1/c_2 p.18; §11.2 Eq.2 CT_50 = ln2/k_2 p.18, prod
 * materialises ln2 as 0.6931). No comma-decimals, no SUM.
 *
 * Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-iso5667-16'; // top-level-await: PG + seedISO5667_16 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO5667_16Harness } from './_harness-env-iso5667-16';
import { ISO5667_16_GATES, ISO5667_16_EQUATIONS } from './seed-iso5667-16';
import { evaluateFormula } from '@/lib/eval/formula';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO5667_16Harness();

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

/** Every BLOCK gate code the test actually drives — asserted to cover all 2. */
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

// ────────────────────────────────────────────────────────────────────────────
// Seed sanity — topology matches prod
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-16 — seed sanity (9 worksheets, 2 block gates, 33 warn, 2 equations)', () => {
  it('seeds 9 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(9);
  });
  it('has 2 block gates + 33 warn gates verbatim from prod', () => {
    expect(ISO5667_16_GATES.filter((g) => g.sev === 'block').length).toBe(2);
    expect(ISO5667_16_GATES.filter((g) => g.sev === 'warn').length).toBe(33);
  });
  it('no literal-TRUE / != null / == null / != "" block gate present (trap audit clean)', () => {
    const blocks = ISO5667_16_GATES.filter((g) => g.sev === 'block');
    expect(blocks.some((g) => g.cond.trim() === 'TRUE')).toBe(false);
    expect(blocks.some((g) => /!=\s*''|!=\s*""|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
    // No IF…THEN block gate (trap 4 N/A). The one IN block gate (CR-020) is
    // audited separately: its members are byte-identical to the field enum values.
    expect(blocks.some((g) => /\bIF\b/i.test(g.cond))).toBe(false);
    // No empty-condition BLOCK gate (CR-030's empty condition is WARN).
    expect(blocks.some((g) => g.cond.trim() === '')).toBe(false);
  });
  it('the sole IN block gate uses lowercase enum members (no Titlecase trap)', () => {
    const inBlock = ISO5667_16_GATES.find((g) => g.sev === 'block' && /\bIN\b/i.test(g.cond))!;
    expect(inBlock.code).toBe('CR-020');
    // members exactly as the field's enum values (all lowercase / snake_case)
    expect(inBlock.cond).toContain('{chlorine_free_tapwater,synthetic_fresh_water,natural_sea_water}');
    expect(/[A-Z]/.test(inBlock.cond.split('{')[1] ?? '')).toBe(false);
  });
  it('has 2 equations', () => {
    expect(ISO5667_16_EQUATIONS.length).toBe(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Boolean attestation BLOCK gate — pass True, VIOLATE False
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-16 — boolean attestation block gate (§2 normative references)', () => {
  it('CR-002 (WS01)  normative_references_consulted == true', async () => {
    await proveBothWays(
      'ISO-5667-16-01', 'CR-002',
      { normative_references_consulted: true },
      { normative_references_consulted: false },
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Enum membership BLOCK gate — pass in-set, VIOLATE out-of-set (§9.1 "shall")
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-16 — enum membership block gate (§9.1 dilution water "shall be used")', () => {
  it('CR-020 (WS05)  dilution_water_type IN {…} — pass synthetic_fresh_water, VIOLATE deionized_water', async () => {
    await proveBothWays(
      'ISO-5667-16-05', 'CR-020',
      { dilution_water_type: 'synthetic_fresh_water' },
      { dilution_water_type: 'deionized_water' }, // §9.1: deionized water forbidden → out of set → fail
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WARN gates never block (spot-check across shapes, incl. empty-condition warn)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-16 — WARN gates never appear in the approval-gate block set', () => {
  it('CR-030 (WS07, warn, EMPTY condition → manual) never blocks', async () => {
    expect(await gateBlocks('ISO-5667-16-07', 'CR-030')).toBe(false);
  });
  it('CR-005 (WS02, warn) sample_volume range does not block even when 50 (out of 0..10)', async () => {
    await saveSymbols({ sample_volume: 50 });
    expect(await gateBlocks('ISO-5667-16-02', 'CR-005')).toBe(false);
  });
  it('CR-008 (WS03, warn) storage_temperature range does not block even when 99 (out of -18..25)', async () => {
    await saveSymbols({ storage_temperature: 99 });
    expect(await gateBlocks('ISO-5667-16-03', 'CR-008')).toBe(false);
  });
  it('CR-016 (WS04, warn) centrifugation_force range does not block even when 100 (out of 3000..6000)', async () => {
    await saveSymbols({ centrifugation_force: 100 });
    expect(await gateBlocks('ISO-5667-16-04', 'CR-016')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// (B) EQUATIONS — through the REAL evaluateFormula
// ────────────────────────────────────────────────────────────────────────────
function runEq(out: string, inputs: Record<string, number>) {
  const e = ISO5667_16_EQUATIONS.find((x) => x.out === out)!;
  return evaluateFormula({
    equationId: `ISO5667-16-${out}`,
    formula: e.formula,
    inputSymbols: e.inputs,
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('ISO 5667-16 — 2 equations through the REAL engine (§11.2 bioaccumulation, doc p.18)', () => {
  it('Eq.1  BCF = c_1 / c_2  → COMPUTES (bioconcentration factor)', () => {
    const r = runEq('BCF', { c_1: 500, c_2: 10 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(500 / 10, 6); // 50
  });
  it('Eq.2  CT_50 = 0.6931 / k_2  → COMPUTES (clearance time, ln2 materialised)', () => {
    const r = runEq('CT_50', { k_2: 0.1 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(0.6931 / 0.1, 6); // 6.931
  });
  it('Eq.1  BCF with c_2 = 0 → NOT a false compute (division-by-zero → manual_required)', () => {
    const r = runEq('BCF', { c_1: 500, c_2: 0 });
    expect(r.kind).toBe('manual_required');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Coverage — every one of the 2 block gates was driven (undriven list MUST be empty)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-16 — all 2 block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every block gate code in prod topology', () => {
    const blockCodes = ISO5667_16_GATES.filter((g) => g.sev === 'block').map((g) => g.code).sort();
    const undriven = blockCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(DRIVEN.size).toBe(2);
  });
});
