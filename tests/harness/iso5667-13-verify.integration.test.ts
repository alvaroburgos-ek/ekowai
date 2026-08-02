/**
 * ISO 5667-13 ("Water quality — Sampling — Part 13: Guidance on sampling of
 * sludges", 2011 second edition) — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * each of the standard's 4 live BLOCK gates by driving it through the REAL
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
 *   - 3 boolean attestations `symbol == true` (CR-001 safety_practices_established
 *     § WARNING p.1; CR-003 normative_references_consulted §2 "indispensable";
 *     CR-022 safety_regulations_observed §8): pass True, VIOLATE False.
 *   - 1 compound numeric range AND gate CR-017 `n_sp >= 4 AND n_sp <= 30` (§6.3.6,
 *     "should lie between 4 and 30"): pass mid-range 10, VIOLATE one operand (2).
 *
 * WARN-HEAVY standard by design: only 4 of 23 gates enforce. The 19 WARN gates
 * are shown NEVER to appear in the approval-gate block set (spot-checked across
 * shapes, incl. the EMPTY-condition warn CR-005 which the evaluator returns as
 * `manual`).
 *
 * The 3 equations are driven through the REAL evaluateFormula: all COMPUTE
 * (§6.1.3 Eq.1 p.5; §6.1.4.2 Eq.2 p.6 confirmed by Annex D p.22 worked example
 * (1,96·39,7/30)²=2,60²=6,73→7; §6.3.6 Eq.3 p.9). No comma-decimals, no SUM.
 *
 * Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-iso5667-13'; // top-level-await: PG + seedISO5667_13 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO5667_13Harness } from './_harness-env-iso5667-13';
import { ISO5667_13_GATES, ISO5667_13_EQUATIONS } from './seed-iso5667-13';
import { evaluateFormula } from '@/lib/eval/formula';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO5667_13Harness();

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

/** Every BLOCK gate code the test actually drives — asserted to cover all 4. */
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
describe('ISO 5667-13 — seed sanity (8 worksheets, 4 block gates, 19 warn, 3 equations)', () => {
  it('seeds 8 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(8);
  });
  it('has 4 block gates + 19 warn gates verbatim from prod', () => {
    expect(ISO5667_13_GATES.filter((g) => g.sev === 'block').length).toBe(4);
    expect(ISO5667_13_GATES.filter((g) => g.sev === 'warn').length).toBe(19);
  });
  it('no literal-TRUE / != null / == null / != "" block gate present (trap audit clean)', () => {
    const blocks = ISO5667_13_GATES.filter((g) => g.sev === 'block');
    expect(blocks.some((g) => g.cond.trim() === 'TRUE')).toBe(false);
    expect(blocks.some((g) => /!=\s*''|!=\s*""|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
    // No IN {...} and no IF…THEN block gates in this standard (traps 3 & 4 N/A).
    expect(blocks.some((g) => /\bIN\b\s*\{/i.test(g.cond))).toBe(false);
    expect(blocks.some((g) => /\bIF\b/i.test(g.cond))).toBe(false);
    // No empty-condition BLOCK gate (CR-005's empty condition is WARN).
    expect(blocks.some((g) => g.cond.trim() === '')).toBe(false);
  });
  it('has 3 equations', () => {
    expect(ISO5667_13_EQUATIONS.length).toBe(3);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Boolean attestation BLOCK gates — pass True, VIOLATE False
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-13 — boolean attestation block gates', () => {
  it('CR-001 (WS01)  safety_practices_established == true  (§ WARNING p.1)', async () => {
    await proveBothWays('ISO-5667-13-01', 'CR-001', { safety_practices_established: true }, { safety_practices_established: false });
  });
  it('CR-003 (WS01)  normative_references_consulted == true  (§2 "indispensable")', async () => {
    await proveBothWays('ISO-5667-13-01', 'CR-003', { normative_references_consulted: true }, { normative_references_consulted: false });
  });
  it('CR-022 (WS08)  safety_regulations_observed == true  (§8)', async () => {
    await proveBothWays('ISO-5667-13-08', 'CR-022', { safety_regulations_observed: true }, { safety_regulations_observed: false });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Compound numeric range AND BLOCK gate — pass mid-range, VIOLATE one operand
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-13 — compound numeric range block gate (§6.3.6 "between 4 and 30")', () => {
  it('CR-017 (WS06)  n_sp >= 4 AND n_sp <= 30  — pass 10, VIOLATE 2', async () => {
    await proveBothWays('ISO-5667-13-06', 'CR-017', { n_sp: 10 }, { n_sp: 2 });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WARN gates never block (spot-check across shapes, incl. empty-condition warn)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-13 — WARN gates never appear in the approval-gate block set', () => {
  it('CR-005 (WS01, warn, EMPTY condition → manual) never blocks', async () => {
    expect(await gateBlocks('ISO-5667-13-01', 'CR-005')).toBe(false);
  });
  it('CR-012 (WS05, warn) t > 0 does not block even when t == -5', async () => {
    await saveSymbols({ t: -5 });
    expect(await gateBlocks('ISO-5667-13-05', 'CR-012')).toBe(false);
  });
  it('CR-004 (WS03, warn) monitoring_objective IS NOT NULL does not block even when absent', async () => {
    expect(await gateBlocks('ISO-5667-13-03', 'CR-004')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// (B) EQUATIONS — through the REAL evaluateFormula
// ────────────────────────────────────────────────────────────────────────────
function runEq(num: string, inputs: Record<string, number>) {
  const e = ISO5667_13_EQUATIONS.find((x) => x.num === num)!;
  return evaluateFormula({
    equationId: `ISO5667-13-${num}`,
    formula: e.formula,
    inputSymbols: e.inputs,
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('ISO 5667-13 — 3 equations through the REAL engine (§6.1.3 p.5; §6.1.4.2 p.6/Annex D p.22; §6.3.6 p.9)', () => {
  it('Eq.1  t = (60 * m) / (q * n)  → COMPUTES (max time-basis interval, min)', () => {
    const r = runEq('1', { m: 10, q: 5, n: 4 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo((60 * 10) / (5 * 4), 6); // 30
  });
  it('Eq.2  n = (1.96 * s / E)^2  → COMPUTES (Annex D: s=39.7, E=30 → 6.727→7)', () => {
    const r = runEq('2', { s: 39.7, E: 30 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo((1.96 * 39.7 / 30) ** 2, 6); // 6.727...
  });
  it('Eq.3  n_sp = sqrt(V) / 2  → COMPUTES (stockpile sub-sample count)', () => {
    const r = runEq('3', { V: 400 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(Math.sqrt(400) / 2, 6); // 10
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Coverage — every one of the 4 block gates was driven (undriven list MUST be empty)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-13 — all 4 block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every block gate code in prod topology', () => {
    const blockCodes = ISO5667_13_GATES.filter((g) => g.sev === 'block').map((g) => g.code).sort();
    const undriven = blockCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(DRIVEN.size).toBe(4);
  });
});
