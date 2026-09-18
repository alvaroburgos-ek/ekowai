/**
 * ISO 46001:2019 ("Water efficiency management systems — Requirements with guidance
 * for use", First edition 2019-07) — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner): "runnable" means RAN. This harness PROVES the encoding
 * end-to-end against a disposable embedded Postgres:
 *
 *  B. EQUATIONS — 4 Annex-C water-balance / recycling equations driven through the
 *     REAL evaluateFormula. All four compute (C.1 post its 2026-07-28 migration fix).
 *     No comma-decimal formula string. Kinds asserted.
 *
 *  C. GATE EXECUTION PROOF — every one of the 35 live BLOCK gates is driven BOTH
 *     WAYS through the REAL `saveWorksheet` → `checkApprovalGate` chain: a persisted
 *     state that PASSES (gate absent from the block list) and one that VIOLATES
 *     (gate present → definite block). This catches the F-4 class (a gate that fires
 *     but never enforces). 33 boolean attestation/flag `== true`/`== True`; 2 numeric
 *     `indicator >= 0` (CR-017/018, reach a fail only on a negative value).
 *     FIVE cross-worksheet gates (CR-005/017/018/027/029) are homed on a worksheet
 *     whose read field lives elsewhere — driven cross-ws to PROVE the conflict-free
 *     project-wide fallback (buildFallbackValues / makeGateLookup) enforces them.
 *     This EXECUTES the reversal of Wave-11's assessed claim that CR-005 is a dead
 *     block gate that never blocks.
 *
 *  The 5 WARN gates (CR-040/036/039 'manual'; CR-037 Win==Wout; CR-038 recycling>=0)
 *  are severity='warn' → excluded from the approval-gate block query → never block.
 *  CR-037's `Win == Wout` additionally hits the bare-identifier-RHS equality trap,
 *  demonstrated directly against the REAL evaluateCondition.
 *
 * Conditions + severities are the reconstructed prod state (see seed header — MCP
 * was down, so reconstructed from the 2026-06-23 encoding snapshot + the two applied
 * 2026-07-28 migrations). Source anchors: rendered PDF §4–§10 + Annex C (SR-3).
 * Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-iso46001'; // top-level-await: PG + seed BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO46001Harness } from './_harness-env-iso46001';
import { ISO46001_GATES, ISO46001_EQUATIONS } from './seed-iso46001';
import { evaluateFormula } from '@/lib/eval/formula';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO46001Harness();
const sql = harness.sql;

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

const BLOCK_GATES = ISO46001_GATES.filter((g) => g.sev === 'block');
const WARN_GATES = ISO46001_GATES.filter((g) => g.sev === 'warn');

// ─────────────────────────────────────────────────────────────────────────────
// Seed sanity — topology matches prod
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 46001 — seed sanity (10 worksheets, 35 block, 5 warn, 4 equations)', () => {
  it('seeds 10 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(10);
  });
  it('has 35 block gates + 5 warn gates', () => {
    expect(BLOCK_GATES.length).toBe(35);
    expect(WARN_GATES.length).toBe(5);
  });
  it('has 4 equations', () => {
    expect(Object.keys(fixture.equationIds).length).toBe(4);
    expect(ISO46001_EQUATIONS.length).toBe(4);
  });
  it('no empty-condition BLOCK gate', () => {
    expect(BLOCK_GATES.filter((g) => g.cond.trim() === '').map((g) => g.code)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Engine-trap audit — BLOCK gates only (evaluate.ts + live prod strings)
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 46001 — BLOCK gates carry no engine-trap / never-fail no-op shape', () => {
  it('trap-2: no != null / == null / != "" shape in any BLOCK gate', () => {
    expect(BLOCK_GATES.some((g) => /!=\s*''|!=\s*""|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
  });
  it('no literal-TRUE no-op and no IF/THEN in any BLOCK gate', () => {
    expect(BLOCK_GATES.some((g) => g.cond.trim().toUpperCase() === 'TRUE')).toBe(false);
    expect(BLOCK_GATES.some((g) => /\bIF\b/.test(g.cond))).toBe(false);
  });
  it('trap-3: no IN-membership BLOCK gate (no case-skew surface)', () => {
    expect(BLOCK_GATES.filter((g) => /\bIN\b/.test(g.cond)).map((g) => g.code)).toEqual([]);
  });
  it('trap-1: no bare-identifier-RHS equality/ordering field-vs-field BLOCK gate', () => {
    // All equality block gates compare to a boolean keyword (True/true); the two
    // ordering gates compare to the numeric literal 0. None compare field-vs-field.
    const bareIdentRhs = BLOCK_GATES.filter((g) =>
      /(==|!=|>=|<=|>|<)\s*[A-Za-z_]\w*\s*$/.test(g.cond) && !/(==|!=)\s*(true|false)\s*$/i.test(g.cond));
    expect(bareIdentRhs.map((g) => g.code)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. GATE EXECUTION PROOF — real saveWorksheet → checkApprovalGate, both ways
// ─────────────────────────────────────────────────────────────────────────────
async function save(ws: string, values: Record<string, Val>): Promise<void> {
  const wsFields = fixture.fieldByWs[ws];
  const batch: Record<string, { type: string; value: Val }> = {};
  for (const [symbol, value] of Object.entries(values)) {
    const meta = wsFields?.[symbol];
    if (!meta) throw new Error(`seed gap: no field for ${symbol} on ${ws}`);
    batch[meta.fieldId] = { type: meta.dataType, value };
  }
  const res = await saveWorksheet({
    instanceId: fixture.instances[ws],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: batch as any,
  });
  expect(res.ok, `saveWorksheet(${ws}) failed: ${JSON.stringify(res)}`).toBe(true);
}
async function gateBlocks(checkWs: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[checkWs]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

const DRIVEN = new Set<string>();
/** Prove a BLOCK gate ENFORCING both ways. `saveWs` (default = checkWs) is the
 *  worksheet whose real save path persists the read field; `checkWs` is the
 *  worksheet whose gate is evaluated. They differ for the cross-worksheet gates. */
async function proveBothWays(
  checkWs: string, code: string,
  passState: Record<string, Val>, violateState: Record<string, Val>,
  saveWs: string = checkWs,
): Promise<void> {
  DRIVEN.add(code);
  await save(saveWs, passState);
  expect(await gateBlocks(checkWs, code), `${code} should NOT block in passing state`).toBe(false);
  await save(saveWs, violateState);
  expect(await gateBlocks(checkWs, code), `${code} SHOULD block in violating state`).toBe(true);
}

// ── 30 LOCAL boolean BLOCK gates (gate + read field on the same worksheet) ──
const LOCAL_BOOL: Array<[code: string, ws: string, symbol: string]> = [
  ['CR-001', 'ISO-46001-01', 'attest_iso_46001_01_cr_001'],
  ['CR-002', 'ISO-46001-01', 'attest_iso_46001_01_cr_002'],
  ['CR-003', 'ISO-46001-01', 'attest_iso_46001_01_cr_003'],
  ['CR-004', 'ISO-46001-01', 'wems_established'],
  ['CR-006', 'ISO-46001-01', 'attest_iso_46001_01_cr_006'],
  ['CR-007', 'ISO-46001-01', 'attest_iso_46001_01_cr_007'],
  ['CR-008', 'ISO-46001-03', 'attest_iso_46001_03_cr_008'],
  ['CR-009', 'ISO-46001-03', 'attest_iso_46001_03_cr_009'],
  ['CR-010', 'ISO-46001-03', 'attest_iso_46001_03_cr_010'],
  ['CR-011', 'ISO-46001-03', 'planning_process_documented'],
  ['CR-012', 'ISO-46001-03', 'attest_iso_46001_03_cr_012'],
  ['CR-013', 'ISO-46001-03', 'attest_iso_46001_03_cr_013'],
  ['CR-014', 'ISO-46001-03', 'attest_iso_46001_03_cr_014'],
  ['CR-015', 'ISO-46001-03', 'attest_iso_46001_03_cr_015'],
  ['CR-016', 'ISO-46001-03', 'attest_iso_46001_03_cr_016'],
  ['CR-019', 'ISO-46001-03', 'attest_iso_46001_03_cr_019'],
  ['CR-020', 'ISO-46001-03', 'attest_iso_46001_03_cr_020'],
  ['CR-021', 'ISO-46001-06', 'resources_provided'],
  ['CR-022', 'ISO-46001-06', 'attest_iso_46001_06_cr_022'],
  ['CR-023', 'ISO-46001-06', 'awareness'],
  ['CR-024', 'ISO-46001-06', 'attest_iso_46001_06_cr_024'],
  ['CR-025', 'ISO-46001-06', 'attest_iso_46001_06_cr_025'],
  ['CR-026', 'ISO-46001-06', 'attest_iso_46001_06_cr_026'],
  ['CR-028', 'ISO-46001-06', 'attest_iso_46001_06_cr_028'],
  ['CR-030', 'ISO-46001-09', 'attest_iso_46001_09_cr_030'],
  ['CR-031', 'ISO-46001-09', 'compliance_evaluation'],
  ['CR-032', 'ISO-46001-09', 'attest_iso_46001_09_cr_032'],
  ['CR-033', 'ISO-46001-09', 'management_review'],
  ['CR-034', 'ISO-46001-10', 'attest_iso_46001_10_cr_034'],
  ['CR-035', 'ISO-46001-10', 'continual_improvement'],
];

describe('ISO 46001 (C) — 30 local boolean BLOCK gates enforce both ways', () => {
  for (const [code, ws, symbol] of LOCAL_BOOL) {
    it(`${code} ${symbol} == true  [${ws}]`, async () =>
      proveBothWays(ws, code, { [symbol]: true }, { [symbol]: false }));
  }
});

describe('ISO 46001 (C) — 5 cross-worksheet BLOCK gates enforce both ways via the project-wide fallback', () => {
  it('CR-005 leadership_commitment == true  [gate -01, field -02] — REVERSES Wave-11 "dead gate" claim', async () =>
    proveBothWays('ISO-46001-01', 'CR-005',
      { leadership_commitment: true }, { leadership_commitment: false }, 'ISO-46001-02'));
  it('CR-027 design_consideration == true   [gate -06, field -07]', async () =>
    proveBothWays('ISO-46001-06', 'CR-027',
      { design_consideration: true }, { design_consideration: false }, 'ISO-46001-07'));
  it('CR-029 maintenance_inspection == true  [gate -06, field -07]', async () =>
    proveBothWays('ISO-46001-06', 'CR-029',
      { maintenance_inspection: true }, { maintenance_inspection: false }, 'ISO-46001-07'));
  it('CR-017 water_efficiency_indicator >= 0  [gate -03, field -04] — fails only on negative', async () =>
    proveBothWays('ISO-46001-03', 'CR-017',
      { water_efficiency_indicator: 5 }, { water_efficiency_indicator: -1 }, 'ISO-46001-04'));
  it('CR-018 baseline_water_efficiency_indicator >= 0  [gate -03, field -04] — fails only on negative', async () =>
    proveBothWays('ISO-46001-03', 'CR-018',
      { baseline_water_efficiency_indicator: 0 }, { baseline_water_efficiency_indicator: -0.5 }, 'ISO-46001-04'));
});

// ─────────────────────────────────────────────────────────────────────────────
// WARN gates never appear in the approval-gate block set
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 46001 — all 5 WARN gates never block (even in a would-violate state)', () => {
  it('CR-040 (manual, -01) never blocks', async () => {
    expect(await gateBlocks('ISO-46001-01', 'CR-040')).toBe(false);
  });
  it('CR-036 + CR-039 (manual, -09) never block', async () => {
    expect(await gateBlocks('ISO-46001-09', 'CR-036')).toBe(false);
    expect(await gateBlocks('ISO-46001-09', 'CR-039')).toBe(false);
  });
  it('CR-037 (Win==Wout, -08) never blocks even with Win set to a would-fail value', async () => {
    await save('ISO-46001-08', { Win: 100, Wout: 100 });
    expect(await gateBlocks('ISO-46001-08', 'CR-037')).toBe(false);
  });
  it('CR-038 (recycling>=0, -08) never blocks even with a negative rate', async () => {
    await save('ISO-46001-08', { plant_recycling_rate: -1, process_recycling_rate: -1 });
    expect(await gateBlocks('ISO-46001-08', 'CR-038')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Trap demonstration — CR-037 `Win == Wout` bare-identifier-RHS equality (closed by plan3-T-13b for valued symbols)
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 46001 — CR-037 Win==Wout (bare-ident RHS): the balance check truly runs since plan3-T-13b (var-vs-var); the string trap survives only while Wout is UNSET', () => {
  it('evaluateCondition("Win == Wout") passes when both are set and equal, fails when unequal, and fails (RHS read as the literal "Wout") while Wout is unset', () => {
    // Plan 3 Task 22 (2026-09-18): the pre-T-13b pin ("always fails — RHS → string") was stale on this branch —
    // 7c82243 keeps the legacy var-vs-var rule for BARE identifiers, so a valued `Wout` resolves as the symbol.
    const both = (a: number, b: number) => (s: string): Val | undefined => (s === 'Win' ? a : s === 'Wout' ? b : undefined);
    expect(evaluateCondition('Win == Wout', both(100, 100)).kind).toBe('pass');
    expect(evaluateCondition('Win == Wout', both(100, 90)).kind).toBe('fail');
    // Wout unset ⇒ the bare RHS falls back to the string literal "Wout" ⇒ 100 == "Wout" ⇒ fail (never pending) — the
    // register-driven rewrite `IF water_streams_count >= 1 THEN Win_calc == Wout_calc` is STAGED (iso46001-G-4).
    expect(evaluateCondition('Win == Wout', (s: string): Val | undefined => (s === 'Win' ? 100 : undefined)).kind).toBe('fail');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. EQUATIONS — driven through the REAL evaluateFormula
// ─────────────────────────────────────────────────────────────────────────────
function runEq(num: string, inputs: Record<string, number>) {
  const e = ISO46001_EQUATIONS.find((x) => x.num === num)!;
  return evaluateFormula({
    equationId: fixture.equationIds[num],
    formula: e.formula,
    inputSymbols: Object.keys(inputs),
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('ISO 46001 (B) — 4 Annex-C equations compute through the REAL engine', () => {
  it('no equation formula string carries a comma-decimal (dot-only engine)', () => {
    for (const e of ISO46001_EQUATIONS) expect(e.formula).not.toMatch(/\d,\d/);
  });
  it('C.1  Win = WD + R1 + R2 + R3  → computed 135 (post-migration input side of Formula C.2)', () => {
    const r = runEq('C.1', { WD: 100, R1: 10, R2: 20, R3: 5 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(135, 9);
  });
  it('C.2b Wout = O1 + O2 + O3 + O4  → computed 135', () => {
    const r = runEq('C.2b', { O1: 50, O2: 40, O3: 30, O4: 15 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(135, 9);
  });
  it('C.3  plant_recycling_rate = (Rp+Rnp)/(Rp+Rnp+WD)*100  → computed 20', () => {
    const r = runEq('C.3', { Rp: 30, Rnp: 10, WD: 160 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo((40 / 200) * 100, 9); // 20
  });
  it('C.5  process_recycling_rate = Rp/(Wp+Rpp)*100  → computed 25', () => {
    const r = runEq('C.5', { Rp: 30, Wp: 100, Rpp: 20 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo((30 / 120) * 100, 9); // 25
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Persistence read-back through the real save path
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 46001 — persistence read-back through the real save path', () => {
  it('a saved numeric Win value round-trips to project_parameters', async () => {
    await save('ISO-46001-08', { Win: 12345 });
    const fid = fixture.fieldByWs['ISO-46001-08']['Win'].fieldId;
    const [row] = await sql<{ value_number: string | null }[]>`
      SELECT value_number FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${fid}`;
    expect(Number(row?.value_number)).toBe(12345);
  });
});

describe('ISO 46001 — all 35 block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every one of the 35 block gate codes', () => {
    const blockCodes = BLOCK_GATES.map((g) => g.code).sort();
    const undriven = blockCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(DRIVEN.size).toBe(35);
  });
});
