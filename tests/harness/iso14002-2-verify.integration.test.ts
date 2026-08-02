/**
 * ISO 14002-2:2023 ("Environmental management systems — Guidelines for using
 * ISO 14001 … environmental topic area — Part 2: Water", First edition 2023-05)
 * — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner): "runnable" means RAN. This harness PROVES the encoding
 * end-to-end against a disposable embedded Postgres:
 *
 *  B. EQUATIONS — this is a GUIDANCE standard and prints NO formulas; prod carries
 *     0 equations. There is nothing to drive through evaluateFormula — the whole
 *     enforcement surface is the compliance layer, covered in (C). Recorded here so
 *     the absence is explicit, not an omission.
 *
 *  C. GATE EXECUTION PROOF — every one of the 13 live BLOCK gates is driven BOTH
 *     WAYS through the REAL `saveWorksheet` → `checkApprovalGate` chain: a persisted
 *     state that PASSES (gate absent from the block list) and one that VIOLATES
 *     (gate present → definite block). This catches the F-4 class (a gate that fires
 *     but never enforces). 10 gates are boolean attestations (`flag == true`); 3 are
 *     existence gates (`symbol IS NOT NULL`). CR-007 is hosted on worksheet -02 but
 *     reads `significant_aspect` from worksheet -03 — it is driven cross-worksheet
 *     (save on -03, check the gate on -02) to prove the project-wide fallback path
 *     enforces it.
 *
 * Conditions + severities are VERBATIM from prod; source anchors are the rendered
 * PDF Clauses 1/4/5/6/7 (SR-3). Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-iso14002-2'; // top-level-await: PG + seed BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO14002_2Harness } from './_harness-env-iso14002-2';
import { ISO14002_2_GATES } from './seed-iso14002-2';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO14002_2Harness();
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

const BLOCK_GATES = ISO14002_2_GATES.filter((g) => g.sev === 'block');
const WARN_GATES = ISO14002_2_GATES.filter((g) => g.sev === 'warn');

// ─────────────────────────────────────────────────────────────────────────────
// Seed sanity — topology matches prod
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 14002-2 — seed sanity (8 worksheets, 13 block, 13 warn, 0 equations)', () => {
  it('seeds 8 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(8);
  });
  it('has 13 block gates + 13 warn gates verbatim from prod', () => {
    expect(BLOCK_GATES.length).toBe(13);
    expect(WARN_GATES.length).toBe(13);
  });
  it('no empty-condition BLOCK gate', () => {
    expect(BLOCK_GATES.filter((g) => g.cond.trim() === '').map((g) => g.code)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Engine-trap audit — BLOCK gates only (evaluate.ts + live prod strings)
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 14002-2 — BLOCK gates carry no engine-trap / no-op shape', () => {
  it('no != null / == null / != "" trap-2 shape in any BLOCK gate', () => {
    expect(BLOCK_GATES.some((g) => /!=\s*''|!=\s*""|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
  });
  it('no literal-TRUE no-op, no IN, no IF/THEN in any BLOCK gate', () => {
    expect(BLOCK_GATES.some((g) => g.cond.trim().toUpperCase() === 'TRUE')).toBe(false);
    expect(BLOCK_GATES.some((g) => /\bIN\b/.test(g.cond))).toBe(false);
    expect(BLOCK_GATES.some((g) => /\bIF\b/.test(g.cond))).toBe(false);
  });
  it('every BLOCK gate is either a `== true` attestation or an `IS NOT NULL` existence gate', () => {
    const offenders = BLOCK_GATES.filter(
      (g) => !/==\s*true$/i.test(g.cond.trim()) && !/IS NOT NULL$/i.test(g.cond.trim()),
    ).map((g) => g.code);
    expect(offenders, `unexpected BLOCK-gate shapes: ${offenders.join(', ')}`).toEqual([]);
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
 *  worksheet whose gate is evaluated. They differ only for the cross-worksheet
 *  gate CR-007 (field on -03, gate on -02). */
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

describe('ISO 14002-2 (C) — 10 boolean-attestation BLOCK gates enforce both ways', () => {
  it('CR-001 iso14001_ems_in_place == true            [ws-01]', async () =>
    proveBothWays('ISO-14002-2-01', 'CR-001', { iso14001_ems_in_place: true }, { iso14001_ems_in_place: false }));
  it('CR-009 risks_opportunities_determined == true   [ws-04]', async () =>
    proveBothWays('ISO-14002-2-04', 'CR-009', { risks_opportunities_determined: true }, { risks_opportunities_determined: false }));
  it('CR-012 appropriate_actions_determined == true   [ws-05]', async () =>
    proveBothWays('ISO-14002-2-05', 'CR-012', { appropriate_actions_determined: true }, { appropriate_actions_determined: false }));
  it('CR-013 environmental_objective_set == true      [ws-05]', async () =>
    proveBothWays('ISO-14002-2-05', 'CR-013', { environmental_objective_set: true }, { environmental_objective_set: false }));
  it('CR-015 support_actions_provided == true         [ws-06]', async () =>
    proveBothWays('ISO-14002-2-06', 'CR-015', { support_actions_provided: true }, { support_actions_provided: false }));
  it('CR-019 operational_controls_applied == true     [ws-06]', async () =>
    proveBothWays('ISO-14002-2-06', 'CR-019', { operational_controls_applied: true }, { operational_controls_applied: false }));
  it('CR-021 emergency_preparedness_planned == true   [ws-06]', async () =>
    proveBothWays('ISO-14002-2-06', 'CR-021', { emergency_preparedness_planned: true }, { emergency_preparedness_planned: false }));
  it('CR-023 effectiveness_evaluated == true          [ws-07]', async () =>
    proveBothWays('ISO-14002-2-07', 'CR-023', { effectiveness_evaluated: true }, { effectiveness_evaluated: false }));
  it('CR-024 monitoring_measurement_defined == true   [ws-07]', async () =>
    proveBothWays('ISO-14002-2-07', 'CR-024', { monitoring_measurement_defined: true }, { monitoring_measurement_defined: false }));
  it('CR-026 improvement_actions_implemented == true  [ws-08]', async () =>
    proveBothWays('ISO-14002-2-08', 'CR-026', { improvement_actions_implemented: true }, { improvement_actions_implemented: false }));
});

describe('ISO 14002-2 (C) — 3 existence (IS NOT NULL) BLOCK gates enforce both ways', () => {
  it('CR-002 water_topic_area_scope IS NOT NULL       [ws-01, text]', async () =>
    proveBothWays('ISO-14002-2-01', 'CR-002',
      { water_topic_area_scope: 'Water withdrawal, use and discharge across all sites' },
      { water_topic_area_scope: null }));
  it('CR-005 compliance_obligations_water IS NOT NULL [ws-02, text]', async () =>
    proveBothWays('ISO-14002-2-02', 'CR-005',
      { compliance_obligations_water: 'Discharge permit no. 4711; abstraction licence' },
      { compliance_obligations_water: null }));
  it('CR-007 significant_aspect IS NOT NULL           [gate ws-02, field ws-03 — cross-ws fallback]', async () =>
    proveBothWays('ISO-14002-2-02', 'CR-007',
      { significant_aspect: true }, { significant_aspect: null },
      'ISO-14002-2-03'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Representative WARN gates never appear in the approval-gate block set
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 14002-2 — representative WARN gates never block', () => {
  it('CR-003 (WARN, boolean) never blocks even when false          [ws-01]', async () => {
    await save('ISO-14002-2-01', { life_cycle_perspective_applied: false });
    expect(await gateBlocks('ISO-14002-2-01', 'CR-003')).toBe(false);
  });
  it('CR-008 (WARN, boolean) never blocks even when false          [ws-03]', async () => {
    await save('ISO-14002-2-03', { water_dependency_assessed: false });
    expect(await gateBlocks('ISO-14002-2-03', 'CR-008')).toBe(false);
  });
  it('CR-020 (WARN, enum IS NOT NULL) never blocks even when null   [ws-06]', async () => {
    await save('ISO-14002-2-06', { control_hierarchy_type: null });
    expect(await gateBlocks('ISO-14002-2-06', 'CR-020')).toBe(false);
  });
  it('CR-025 (WARN, boolean) never blocks even when false          [ws-08]', async () => {
    await save('ISO-14002-2-08', { performance_indicators_tracked: false });
    expect(await gateBlocks('ISO-14002-2-08', 'CR-025')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Persistence read-back through the real save path
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 14002-2 — persistence read-back through the real save path', () => {
  it('a saved text scope value round-trips to project_parameters', async () => {
    await save('ISO-14002-2-01', { water_topic_area_scope: 'RB-01 scope roundtrip' });
    const fid = fixture.fieldByWs['ISO-14002-2-01']['water_topic_area_scope'].fieldId;
    const [row] = await sql<{ value_text: string | null }[]>`
      SELECT value_text FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${fid}`;
    expect(row?.value_text).toBe('RB-01 scope roundtrip');
  });
});

describe('ISO 14002-2 — all 13 block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every one of the 13 block gate codes', () => {
    const blockCodes = BLOCK_GATES.map((g) => g.code).sort();
    const undriven = blockCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(DRIVEN.size).toBe(13);
  });
});
