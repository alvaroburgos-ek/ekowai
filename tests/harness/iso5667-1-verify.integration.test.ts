/**
 * ISO 5667-1 ("Water quality — Sampling — Part 1: Guidance on the design of
 * sampling programmes", 1980 edition) — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * each of the standard's 13 live BLOCK gates by driving it through the REAL
 * enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every
 *                                      block condition against the SAVED values
 *                                      and lists the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition — local field symbols plus the conflict-free
 * project-wide fallback. A gate is proven ENFORCING only when shown BOTH ways:
 * a persisted state where it does NOT block, and one where it DOES (the F-4 lesson).
 *
 *   - 5 existence gates `symbol IS NOT NULL` (+ CR-016 AND of two): absent → BLOCK,
 *     present → pass. (`IS NOT NULL` is the ENFORCING `exists` node, not the
 *     `!= null` no-op.)
 *   - 5 boolean attestations `== true|True`: pass True, VIOLATE False.
 *   - 2 numeric thresholds `pipe_nominal_bore >= 25` (§8, 25 mm) and
 *     `sludge_pipe_diameter >= 50` (§12, 50 mm) — both ways.
 *   - 1 equation-output threshold `n > 0` (CR-023): `n` lives on WS07, gate on
 *     WS06 → resolves via the project-wide fallback (worked-example n≈61 passes,
 *     n=0 blocks).
 *
 * The 14 WARN gates are shown NEVER to appear in the approval-gate block set
 * (spot-checked; the 4 empty-condition ones are `manual` no-ops AND warn).
 *
 * The 3 equations are driven through the REAL evaluateFormula: Eq.2/Eq.3 COMPUTE;
 * Eq.1 (`s = sqrt( SUM(...) / (n-1) )`) uses SUM → engine-unsupported → NR.
 *
 * Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-iso5667-1'; // top-level-await: PG + seedISO5667_1 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO5667_1Harness } from './_harness-env-iso5667-1';
import { ISO5667_1_GATES, ISO5667_1_EQUATIONS } from './seed-iso5667-1';
import { evaluateFormula } from '@/lib/eval/formula';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO5667_1Harness();

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

/** Every BLOCK gate code the test actually drives — asserted to cover all 13. */
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
 *  ABSENCE — so we assert it blocks BEFORE the operand symbols are ever saved,
 *  then save them present and assert it clears. Must run before any save of these
 *  symbols (each is unique to its gate). */
async function proveExistenceGate(
  ws: string,
  code: string,
  presentState: Record<string, Val>,
): Promise<void> {
  DRIVEN.add(code);
  // Nothing saved yet for these operands → absent → exists=false → definite fail → BLOCK.
  expect(await gateBlocks(ws, code), `${code} SHOULD block when operand(s) absent`).toBe(true);
  await saveSymbols(presentState);
  expect(await gateBlocks(ws, code), `${code} should NOT block once operand(s) present`).toBe(false);
}

// ────────────────────────────────────────────────────────────────────────────
// Seed sanity — topology matches prod
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-1 — seed sanity (8 worksheets, 13 block gates, 14 warn, 3 equations)', () => {
  it('seeds 8 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(8);
  });
  it('has 13 block gates + 14 warn gates verbatim from prod', () => {
    expect(ISO5667_1_GATES.filter((g) => g.sev === 'block').length).toBe(13);
    expect(ISO5667_1_GATES.filter((g) => g.sev === 'warn').length).toBe(14);
  });
  it('no literal-TRUE / != null / == null / != "" block gate present (trap-2 audit clean)', () => {
    const blocks = ISO5667_1_GATES.filter((g) => g.sev === 'block');
    expect(blocks.some((g) => g.cond.trim() === 'TRUE')).toBe(false);
    expect(blocks.some((g) => /!=\s*''|!=\s*""|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
    // No IN {...} and no IF…THEN block gates in this standard (traps 3 & 4 N/A).
    expect(blocks.some((g) => /\bIN\b\s*\{/i.test(g.cond))).toBe(false);
    expect(blocks.some((g) => /\bIF\b/i.test(g.cond))).toBe(false);
  });
  it('has 3 equations', () => {
    expect(ISO5667_1_EQUATIONS.length).toBe(3);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Existence (IS NOT NULL) BLOCK gates — absent → block, present → pass
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-1 — existence block gates (IS NOT NULL enforces via the exists node)', () => {
  it('CR-002 (WS01)  programme_purpose IS NOT NULL', async () => {
    await proveExistenceGate('ISO-5667-1-01', 'CR-002', { programme_purpose: 'quality_surveillance' });
  });
  it('CR-015 (WS05)  water_situation_type IS NOT NULL', async () => {
    await proveExistenceGate('ISO-5667-1-05', 'CR-015', { water_situation_type: 'natural_water_river' });
  });
  it('CR-016 (WS05)  groundwater_purged IS NOT NULL AND sampling_depth IS NOT NULL', async () => {
    await proveExistenceGate('ISO-5667-1-05', 'CR-016', { groundwater_purged: true, sampling_depth: 5 });
  });
  it('CR-021 (WS06)  programme_type IS NOT NULL', async () => {
    await proveExistenceGate('ISO-5667-1-06', 'CR-021', { programme_type: 'quality_control' });
  });
  it('CR-026 (WS08)  flow_aspect IS NOT NULL', async () => {
    await proveExistenceGate('ISO-5667-1-08', 'CR-026', { flow_aspect: 'load_calculation' });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Boolean attestation BLOCK gates — pass True, VIOLATE False
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-1 — boolean attestation block gates', () => {
  it('CR-003 (WS02)  preliminary_survey_done == true', async () => {
    await proveBothWays('ISO-5667-1-02', 'CR-003', { preliminary_survey_done: true }, { preliminary_survey_done: false });
  });
  it('CR-007 (WS03)  safety_regulations_considered == true', async () => {
    await proveBothWays('ISO-5667-1-03', 'CR-007', { safety_regulations_considered: true }, { safety_regulations_considered: false });
  });
  it('CR-008 (WS03)  hazardous_atmosphere_tested == True', async () => {
    await proveBothWays('ISO-5667-1-03', 'CR-008', { hazardous_atmosphere_tested: true }, { hazardous_atmosphere_tested: false });
  });
  it('CR-009 (WS03)  electrical_hazard_minimized == True', async () => {
    await proveBothWays('ISO-5667-1-03', 'CR-009', { electrical_hazard_minimized: true }, { electrical_hazard_minimized: false });
  });
  it('CR-014 (WS04)  weather_recorded == True', async () => {
    await proveBothWays('ISO-5667-1-04', 'CR-014', { weather_recorded: true }, { weather_recorded: false });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Numeric threshold BLOCK gates — printed pipe-bore minima (25 mm §8, 50 mm §12)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-1 — numeric threshold block gates (verbatim printed minima)', () => {
  it('CR-012 (WS04)  pipe_nominal_bore >= 25  (§8, "conducto nominal mínimo de 25 mm")', async () => {
    await proveBothWays('ISO-5667-1-04', 'CR-012', { pipe_nominal_bore: 25 }, { pipe_nominal_bore: 24 });
  });
  it('CR-017 (WS05)  sludge_pipe_diameter >= 50  (§12, "al menos 50 mm de diámetro")', async () => {
    await proveBothWays('ISO-5667-1-05', 'CR-017', { sludge_pipe_diameter: 50 }, { sludge_pipe_diameter: 40 });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Equation-output threshold BLOCK gate — cross-worksheet via project-wide fallback
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-1 — statistics gate (cross-worksheet fallback)', () => {
  it('CR-023 (host WS06)  n > 0  with n (Eq.3 output) on WS07', async () => {
    // pass: worked-example n≈61 (K=1.96, sigma=10, L=5 → 61.47); violate: n=0.
    await proveBothWays('ISO-5667-1-06', 'CR-023', { n: 61 }, { n: 0 });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WARN gates never block (spot-check across shapes: boolean warn + empty no-ops)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-1 — WARN gates never appear in the approval-gate block set', () => {
  it('CR-004 (WS01, warn) does not block even when normative_references_consulted == false', async () => {
    await saveSymbols({ normative_references_consulted: false });
    expect(await gateBlocks('ISO-5667-1-01', 'CR-004')).toBe(false);
  });
  it('CR-024 (WS07, warn) L > 0 does not block even when L == 0', async () => {
    await saveSymbols({ L: 0 });
    expect(await gateBlocks('ISO-5667-1-07', 'CR-024')).toBe(false);
  });
  it('CR-006 (WS01), CR-020 (WS06), CR-025 (WS06), CR-027 (WS08) — empty-condition warns never block', async () => {
    expect(await gateBlocks('ISO-5667-1-01', 'CR-006')).toBe(false);
    expect(await gateBlocks('ISO-5667-1-06', 'CR-020')).toBe(false);
    expect(await gateBlocks('ISO-5667-1-06', 'CR-025')).toBe(false);
    expect(await gateBlocks('ISO-5667-1-08', 'CR-027')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// (B) EQUATIONS — through the REAL evaluateFormula
// ────────────────────────────────────────────────────────────────────────────
function runEq(num: string, inputs: Record<string, number>) {
  const e = ISO5667_1_EQUATIONS.find((x) => x.num === num)!;
  return evaluateFormula({
    equationId: `ISO5667-1-${num}`,
    formula: e.formula,
    inputSymbols: e.inputs,
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('ISO 5667-1 — 3 statistics equations through the REAL engine (§16.4/§16.5)', () => {
  it('Eq.1  s = sqrt( SUM((x_i - x_mean)^2) / (n-1) )  → SUM unsupported → manual_required (NR)', () => {
    const r = runEq('1', { x_i: 12, x_mean: 10, n: 5 });
    expect(r.kind).toBe('manual_required');
  });
  it('Eq.2  L = 2 * K * sigma / sqrt(n)  → COMPUTES', () => {
    const r = runEq('2', { K: 1.96, sigma: 10, n: 4 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(2 * 1.96 * 10 / Math.sqrt(4), 6); // 19.6
  });
  it('Eq.3  n = (2 * K * sigma / L)^2  → COMPUTES (worked example n≈61)', () => {
    const r = runEq('3', { K: 1.96, sigma: 10, L: 5 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo((2 * 1.96 * 10 / 5) ** 2, 6); // 61.4656
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Coverage — every one of the 13 block gates was driven (undriven list MUST be empty)
// ────────────────────────────────────────────────────────────────────────────
describe('ISO 5667-1 — all 13 block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every block gate code in prod topology', () => {
    const blockCodes = ISO5667_1_GATES.filter((g) => g.sev === 'block').map((g) => g.code).sort();
    const undriven = blockCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(DRIVEN.size).toBe(13);
  });
});
