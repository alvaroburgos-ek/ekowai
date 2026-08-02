/**
 * ISO 59004 ("Circular economy — Vocabulary, principles and guidance for
 * implementation", FINAL DRAFT ISO/FDIS 59004:2024(en)) — REAL save-path
 * execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * the standard's SINGLE live BLOCK gate by driving it through the REAL
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
 *   - CR-015 boolean attestation `hazardous_substance_risk_approach == true`
 *     (WS04, §5.3.4 "…a risk-based approach should be used to avoid exposure to
 *     hazardous substances."): pass true, VIOLATE false.
 *
 * ADVISORY-BY-CONSTRUCTION. Only 1 of 44 gates enforces. The source is a
 * vocabulary/principles/guidance ISO with exactly ONE "shall" in 62 pages (the
 * patent-disclaimer boilerplate) and §2 "There are no normative references in
 * this document." The 43 WARN gates are shown NEVER to appear in the
 * approval-gate block set (spot-checked across shapes, incl. an EMPTY-condition
 * warn which the evaluator returns as `manual`).
 *
 * 0 equations — nothing to drive through evaluateFormula (expected for a
 * vocabulary/principles standard).
 *
 * Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-iso59004'; // top-level-await: PG + seedISO59004 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO59004Harness } from './_harness-env-iso59004';
import { ISO59004_GATES } from './seed-iso59004';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO59004Harness();

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

/** Every BLOCK gate code the test actually drives — asserted to cover all 1. */
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
describe('ISO 59004 — seed sanity (6 worksheets, 1 block gate, 43 warn, 0 equations)', () => {
  it('seeds 6 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(6);
  });
  it('has 1 block gate + 43 warn gates verbatim from prod', () => {
    expect(ISO59004_GATES.filter((g) => g.sev === 'block').length).toBe(1);
    expect(ISO59004_GATES.filter((g) => g.sev === 'warn').length).toBe(43);
  });
  it('the sole block gate is CR-015, a real boolean-equality read (NOT a no-op)', () => {
    const blocks = ISO59004_GATES.filter((g) => g.sev === 'block');
    expect(blocks.length).toBe(1);
    expect(blocks[0].code).toBe('CR-015');
    expect(blocks[0].cond).toBe('hazardous_substance_risk_approach == true');
  });
  it('no literal-TRUE / != null / == null / != "" / empty / IN / IF block gate (trap audit clean)', () => {
    const blocks = ISO59004_GATES.filter((g) => g.sev === 'block');
    expect(blocks.some((g) => g.cond.trim() === 'TRUE')).toBe(false);
    expect(blocks.some((g) => /!=\s*''|!=\s*""|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
    expect(blocks.some((g) => g.cond.trim() === '')).toBe(false);
    expect(blocks.some((g) => /\bIN\b/i.test(g.cond))).toBe(false);
    expect(blocks.some((g) => /\bIF\b/i.test(g.cond))).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// The SOLE block gate — pass True, VIOLATE False (§5.3.4 hazardous substances)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 59004 — sole block gate (§5.3.4 risk-based approach to hazardous substances)', () => {
  it('CR-015 (WS04)  hazardous_substance_risk_approach == true — pass true, VIOLATE false', async () => {
    await proveBothWays(
      'ISO-59004-04', 'CR-015',
      { hazardous_substance_risk_approach: true },
      { hazardous_substance_risk_approach: false },
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WARN gates never block (spot-check across shapes, incl. empty-condition warn)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 59004 — WARN gates never appear in the approval-gate block set', () => {
  it('CR-002 (WS01, warn) ce_commitment==true never blocks even when false', async () => {
    await saveSymbols({ ce_commitment: false });
    expect(await gateBlocks('ISO-59004-01', 'CR-002')).toBe(false);
  });
  it('CR-003 (WS03, warn) ce_vision_statement IS NOT NULL never blocks even when unset', async () => {
    expect(await gateBlocks('ISO-59004-03', 'CR-003')).toBe(false);
  });
  it('CR-013 (WS04, warn) all_principles_considered==true never blocks even when false', async () => {
    await saveSymbols({ all_principles_considered: false });
    expect(await gateBlocks('ISO-59004-04', 'CR-013')).toBe(false);
  });
  it('CR-017 (WS04, warn) stocks_flows_monitored==true never blocks even when false', async () => {
    await saveSymbols({ stocks_flows_monitored: false });
    expect(await gateBlocks('ISO-59004-04', 'CR-017')).toBe(false);
  });
  it('CR-006 (WS04, warn, EMPTY condition → manual) never blocks', async () => {
    expect(await gateBlocks('ISO-59004-04', 'CR-006')).toBe(false);
  });
  it('CR-042 (WS06, warn) monitoring_review_process==true never blocks even when false', async () => {
    await saveSymbols({ monitoring_review_process: false });
    expect(await gateBlocks('ISO-59004-06', 'CR-042')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Regression guard — CR-015 must still enforce AFTER the warn-gate saves above
// (the #22-guard class: dual-role / cross-worksheet state must not silence it).
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 59004 — CR-015 still enforces after unrelated warn-state writes', () => {
  it('CR-015 blocks with hazardous_substance_risk_approach=false persisted', async () => {
    await saveSymbols({ hazardous_substance_risk_approach: false });
    expect(await gateBlocks('ISO-59004-04', 'CR-015')).toBe(true);
  });
  it('CR-015 clears with hazardous_substance_risk_approach=true persisted', async () => {
    await saveSymbols({ hazardous_substance_risk_approach: true });
    expect(await gateBlocks('ISO-59004-04', 'CR-015')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Coverage — the single block gate was driven (undriven list MUST be empty)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 59004 — all block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every block gate code in prod topology', () => {
    const blockCodes = ISO59004_GATES.filter((g) => g.sev === 'block').map((g) => g.code).sort();
    const undriven = blockCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(DRIVEN.size).toBe(1);
  });
});
