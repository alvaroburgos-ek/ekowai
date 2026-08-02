/**
 * ISO 59014 ("Environmental management and circular economy — Sustainability and
 * traceability of secondary materials recovery — Principles and requirements",
 * DRAFT INTERNATIONAL STANDARD ISO/DIS 59014:2023(E)) — REAL save-path execution
 * proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES all
 * 52 live BLOCK gates by driving each through the REAL enforcement chain against a
 * disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every
 *                                      block condition against the SAVED values
 *                                      and lists the ones that definitely `fail`.
 *
 * A gate is proven ENFORCING only when shown BOTH ways: a persisted state where it
 * does NOT block, and one where it DOES (the F-4 lesson). This is a REQUIREMENTS
 * standard (87 "shall" in the DIS) — the block-heavy encoding is correct, and every
 * one of the 52 gates traces to a printed "shall" (see wave report §A/§B).
 *
 * Shape mix (all 52 driven individually below):
 *   - 48 boolean-equality attestations `symbol == true` / `== True`
 *     (CR-011/017/018 use CAPITAL `True`; the engine lowercases keywords so it is a
 *     real boolean-literal RHS, not a string-coerce no-op): pass true, VIOLATE false.
 *   - 4 existence gates `IS NOT NULL` (CR-041 single number; CR-047 a-g / CR-048 h-j
 *     / CR-049 k-p multi-field AND): pass all present, VIOLATE first symbol null.
 *
 * 0 equations — nothing to drive through evaluateFormula (expected: no calculation
 * clauses, this is a principles/requirements standard). Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-iso59014'; // top-level-await: PG + seedISO59014 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO59014Harness } from './_harness-env-iso59014';
import { ISO59014_GATES } from './seed-iso59014';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO59014Harness();

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string | null;

/** Every BLOCK gate code the test actually drives — asserted to cover all 52. */
const DRIVEN = new Set<string>();

/** Persist a symbol→value map through the REAL saveWorksheet, partitioned by each
 *  symbol's home worksheet. Value `type` is the field's real data_type. `null`
 *  clears the field (used to violate an IS NOT NULL existence gate). */
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

/** Prove a BLOCK gate ENFORCING both ways: a persisted PASS state (no block), then
 *  a persisted VIOLATE state (definite fail → block). */
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

/** Non-null "present" value per data type (pass state). */
function passVal(type: string): Val {
  switch (type) {
    case 'boolean': return true;
    case 'number': return 1;
    default: return 'present'; // text / enum
  }
}

const BLOCK_GATES = ISO59014_GATES.filter((g) => g.sev === 'block');
const WARN_GATES = ISO59014_GATES.filter((g) => g.sev === 'warn');

// ────────────────────────────────────────────────────────────────────────────
// Seed sanity — topology matches prod
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 59014 — seed sanity (10 worksheets, 52 block gates, 2 warn, 0 equations)', () => {
  it('seeds 10 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(10);
  });
  it('has 52 block gates + 2 warn gates verbatim from prod', () => {
    expect(BLOCK_GATES.length).toBe(52);
    expect(WARN_GATES.length).toBe(2);
  });
  it('every block gate has a non-empty condition (no empty-condition BLOCK gate)', () => {
    expect(BLOCK_GATES.filter((g) => g.cond.trim() === '').map((g) => g.code)).toEqual([]);
  });
  it('no != null / == null / != "" trap-2 shape, no literal-TRUE, no IN / IF in any BLOCK gate', () => {
    expect(BLOCK_GATES.some((g) => /!=\s*''|!=\s*""|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
    expect(BLOCK_GATES.some((g) => g.cond.trim() === 'TRUE')).toBe(false);
    expect(BLOCK_GATES.some((g) => /\bIN\b/.test(g.cond))).toBe(false);
    expect(BLOCK_GATES.some((g) => /\bIF\b/.test(g.cond))).toBe(false);
  });
  it('every block gate declares its read symbols (drive coverage source)', () => {
    expect(BLOCK_GATES.filter((g) => !g.read || g.read.length === 0).map((g) => g.code)).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// EVERY block gate — driven individually, BOTH ways, through the real save path
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 59014 — all 52 BLOCK gates enforce both ways (real saveWorksheet → checkApprovalGate)', () => {
  for (const g of BLOCK_GATES) {
    const read = g.read!;
    it(`${g.code} (${g.ws}) [${g.kind}]  ${g.cond}`, async () => {
      // PASS state: every read symbol present (booleans true, numbers 1, text present).
      const passState: Record<string, Val> = {};
      for (const r of read) passState[r.symbol] = passVal(r.type);
      // VIOLATE state: flip / null the FIRST read symbol to force a definite fail.
      const first = read[0];
      const violateState: Record<string, Val> =
        g.kind === 'exists'
          ? { [first.symbol]: null }        // IS NOT NULL → absent ⇒ fail
          : { [first.symbol]: false };      // == true/True → false ⇒ fail
      await proveBothWays(g.ws, g.code, passState, violateState);
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// WARN gates never appear in the approval-gate block set (even when violated)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 59014 — the 2 WARN gates never block', () => {
  it('CR-001 (WS02, warn) principles_applied_true_fair_consistent==true never blocks even when false', async () => {
    await saveSymbols({ principles_applied_true_fair_consistent: false });
    expect(await gateBlocks('ISO-59014-02', 'CR-001')).toBe(false);
  });
  it('CR-002 (WS02, warn) principle_considered IS NOT NULL never blocks even when unset', async () => {
    await saveSymbols({ principle_considered: null });
    expect(await gateBlocks('ISO-59014-02', 'CR-002')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Regression — a representative CAPITAL-`True` gate + a multi-field existence gate
// still enforce after the unrelated warn-state writes above (#22-guard class).
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 59014 — spot regression after warn writes', () => {
  it('CR-011 (== True) still blocks with attest_iso_59014_04_cr_011=false persisted', async () => {
    await saveSymbols({ attest_iso_59014_04_cr_011: false });
    expect(await gateBlocks('ISO-59014-04', 'CR-011')).toBe(true);
    await saveSymbols({ attest_iso_59014_04_cr_011: true });
    expect(await gateBlocks('ISO-59014-04', 'CR-011')).toBe(false);
  });
  it('CR-047 (7-field IS NOT NULL) blocks when one upstream field is nulled, clears when refilled', async () => {
    await saveSymbols({ upstream_org_name_address: null });
    expect(await gateBlocks('ISO-59014-10', 'CR-047')).toBe(true);
    await saveSymbols({ upstream_org_name_address: 'present' });
    expect(await gateBlocks('ISO-59014-10', 'CR-047')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Coverage — every block gate was driven (undriven list MUST be empty)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 59014 — all block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every one of the 52 block gate codes in prod topology', () => {
    const blockCodes = BLOCK_GATES.map((g) => g.code).sort();
    const undriven = blockCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(DRIVEN.size).toBe(52);
  });
});
