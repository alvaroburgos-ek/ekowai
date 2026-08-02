/**
 * ISO 5667-6 ("Water quality — Sampling — Part 6: Guidance on sampling of rivers
 * and streams", ISO 5667-6:2014 / NCh-ISO 5667/6:2015) — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * each of the standard's 6 live BLOCK gates by driving it through the REAL
 * enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every
 *                                      block condition against the SAVED values
 *                                      and lists the ones that definitely `fail`.
 *
 * A gate is proven ENFORCING only when shown BOTH ways: a persisted state where it
 * does NOT block, and one where it DOES (the F-4 lesson).
 *
 *   - 2 boolean attestations `== true` (CR-001/CR-002, WS01): pass true, VIOLATE false.
 *   - 1 AND of two booleans (CR-010, WS05): pass both true, VIOLATE one false.
 *   - 2 implication/OR gates (CR-011 systematic⇒cycle-avoided WS05; CR-015 bridge⇒
 *     checks-passed WS07): VIOLATE by selecting the antecedent enum + false consequent.
 *   - 1 AND of boolean-false + enum-inequality (CR-030, WS12).
 *
 * The 24 WARN gates are shown NEVER to appear in the approval-gate block set
 * (spot-checked; the 2 empty-condition ones CR-007/CR-028 are `manual` no-ops AND warn).
 *
 * The 2 equations are driven through the REAL evaluateFormula: Eq.2 (§7.3 depth
 * pass-through) COMPUTES; Eq.A.1 (Annex A mixing distance) carries COMMA decimals
 * (`0,13` / `0,7`) the in-tree arithmetic engine cannot tokenise → error (DEFECT,
 * reported, NOT fixed here — provenance ceiling: OCR source, not rendered PDF).
 *
 * Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-iso5667-6'; // top-level-await: PG + seedISO5667_6 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO5667_6Harness } from './_harness-env-iso5667-6';
import { ISO5667_6_GATES, ISO5667_6_EQUATIONS } from './seed-iso5667-6';
import { evaluateFormula } from '@/lib/eval/formula';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO5667_6Harness();

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

/** Every BLOCK gate code the test actually drives — asserted to cover all 6. */
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
describe('ISO 5667-6 — seed sanity (13 worksheets, 6 block gates, 24 warn, 2 equations)', () => {
  it('seeds 13 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(13);
  });
  it('has 6 block gates + 24 warn gates verbatim from prod', () => {
    expect(ISO5667_6_GATES.filter((g) => g.sev === 'block').length).toBe(6);
    expect(ISO5667_6_GATES.filter((g) => g.sev === 'warn').length).toBe(24);
  });
  it('no literal-TRUE / != null / == null / != "" block gate present (trap-2 audit clean)', () => {
    const blocks = ISO5667_6_GATES.filter((g) => g.sev === 'block');
    expect(blocks.some((g) => g.cond.trim() === 'TRUE')).toBe(false);
    expect(blocks.some((g) => /!=\s*''|!=\s*""|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
    // No IN {...} and no IF…THEN block gates in this standard (traps 3 & 4 N/A to block set).
    expect(blocks.some((g) => /\bIN\b\s*\{/i.test(g.cond))).toBe(false);
    expect(blocks.some((g) => /\bIF\b/i.test(g.cond))).toBe(false);
  });
  it('has 2 equations', () => {
    expect(ISO5667_6_EQUATIONS.length).toBe(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Boolean attestation BLOCK gates — pass true, VIOLATE false
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-6 — boolean attestation block gates (WS01, §1/§2)', () => {
  it('CR-001 (WS01)  matrix_excluded_check == true', async () => {
    await proveBothWays('ISO-5667-6-01', 'CR-001', { matrix_excluded_check: true }, { matrix_excluded_check: false });
  });
  it('CR-002 (WS01)  normative_references_consulted == true', async () => {
    await proveBothWays('ISO-5667-6-01', 'CR-002', { normative_references_consulted: true }, { normative_references_consulted: false });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AND-of-booleans BLOCK gate (§5.2)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-6 — statistically-designed programme block gate', () => {
  it('CR-010 (WS05)  statistical_design_done == true AND acceptable_error_defined == true', async () => {
    await proveBothWays(
      'ISO-5667-6-05',
      'CR-010',
      { statistical_design_done: true, acceptable_error_defined: true },
      { statistical_design_done: false, acceptable_error_defined: true },
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Implication / OR BLOCK gates — antecedent enum + false consequent violates
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-6 — implication block gates (enum antecedent ⇒ flag consequent)', () => {
  it('CR-011 (WS05)  sampling_strategy != systematic OR cycle_coincidence_avoided == true (§5.2)', async () => {
    await proveBothWays(
      'ISO-5667-6-05',
      'CR-011',
      { sampling_strategy: 'systematic', cycle_coincidence_avoided: true },
      { sampling_strategy: 'systematic', cycle_coincidence_avoided: false },
    );
  });
  it('CR-015 (WS07)  sampling_location_type != bridge OR bridge_checks_passed == true (§7.2/Tab.1)', async () => {
    await proveBothWays(
      'ISO-5667-6-07',
      'CR-015',
      { sampling_location_type: 'bridge', bridge_checks_passed: true },
      { sampling_location_type: 'bridge', bridge_checks_passed: false },
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AND boolean-false + enum-inequality BLOCK gate (§15 safety)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-6 — do-not-sample safety block gate', () => {
  it('CR-030 (WS12)  unsafe_condition_present == false AND risk_assessment_outcome != do_not_sample', async () => {
    await proveBothWays(
      'ISO-5667-6-12',
      'CR-030',
      { unsafe_condition_present: false, risk_assessment_outcome: 'safe' },
      { unsafe_condition_present: true, risk_assessment_outcome: 'safe' },
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WARN gates never block (spot-check across shapes: value warn + empty no-ops)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-6 — WARN gates never appear in the approval-gate block set', () => {
  it('CR-016 (WS07, warn) height_above_bed >= 30 does not block even when height_above_bed == 10', async () => {
    await saveSymbols({ height_above_bed: 10 });
    expect(await gateBlocks('ISO-5667-6-07', 'CR-016')).toBe(false);
  });
  it('CR-006 (WS03, warn) confluence_sites_count >= 2 does not block even when count == 1', async () => {
    await saveSymbols({ confluence_sites_count: 1 });
    expect(await gateBlocks('ISO-5667-6-03', 'CR-006')).toBe(false);
  });
  it('CR-007 (WS03), CR-028 (WS11) — empty-condition warns never block', async () => {
    expect(await gateBlocks('ISO-5667-6-03', 'CR-007')).toBe(false);
    expect(await gateBlocks('ISO-5667-6-11', 'CR-028')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// (B) EQUATIONS — through the REAL evaluateFormula
// ────────────────────────────────────────────────────────────────────────────
function runEq(num: string, inputs: Record<string, number>) {
  const e = ISO5667_6_EQUATIONS.find((x) => x.num === num)!;
  return evaluateFormula({
    equationId: `ISO5667-6-${num}`,
    formula: e.formula,
    inputSymbols: e.inputs,
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('ISO 5667-6 — 2 equations through the REAL engine', () => {
  it('Eq.2  sampling_depth_below_surface = preferred_subsurface_depth (§7.3) → COMPUTES (pass-through)', () => {
    const r = runEq('2', { preferred_subsurface_depth: 30 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(30, 6);
  });
  it('Eq.A.1  l = 0,13 * b^2 * c * (0,7*c + 2*g) / (g*d) → COMMA decimals unparsable → error (DEFECT)', () => {
    // DEFECT: European comma-decimal notation (0,13 / 0,7) is not tokenisable by the
    // in-tree arithmetic engine (dot decimals; comma = min/max arg separator). The engine
    // throws "Unerwartetes Token …" → evaluateFormula returns `error`. Reported, NOT fixed
    // (provenance ceiling: OCR source, and a computed-value change is an owner ruling).
    const r = runEq('A.1', { b: 5, c: 15, g: 9.81, d: 1 });
    expect(r.kind).toBe('error');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Coverage — every one of the 6 block gates was driven (undriven list MUST be empty)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-6 — all 6 block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every block gate code in prod topology', () => {
    const blockCodes = ISO5667_6_GATES.filter((g) => g.sev === 'block').map((g) => g.code).sort();
    const undriven = blockCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(DRIVEN.size).toBe(6);
  });
});
