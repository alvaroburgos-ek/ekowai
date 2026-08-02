/**
 * ISO 14019-1:2026 ("Sustainability information — Part 1: General principles and
 * requirements for validation and verification", First edition 2026-02) — REAL
 * save-path execution proof.
 *
 * PROOF MANDATE (owner): "runnable" means RAN. This harness PROVES the encoding
 * end-to-end against a disposable embedded Postgres:
 *
 *  B. EQUATIONS — this standard prints NO formulas; prod carries 0 equations.
 *     Nothing to drive through evaluateFormula — the whole enforcement surface is
 *     the compliance layer, covered in (C). Recorded so the absence is explicit.
 *
 *  C. GATE EXECUTION PROOF — every one of the 17 live BLOCK gates is driven BOTH
 *     WAYS through the REAL `saveWorksheet` → `checkApprovalGate` chain: a persisted
 *     state that PASSES (gate absent from the block list) and one that VIOLATES
 *     (gate present → definite block). This catches the F-4 class (a gate that fires
 *     but never enforces). Shapes:
 *       - 11 boolean `flag == true` attestations
 *       - 4 existence `symbol IS NOT NULL`
 *       - 1 membership `assurance_conclusion IN {4 lowercase-quoted}` (CR-024) —
 *         members == full enum domain, so it is an EFFECTIVE NO-OP under the UI
 *         (only an out-of-domain value fails; the save path does not reject one, so
 *         the harness injects one to reach the fail arm — see comment on the driver)
 *       - 1 disjunction (CR-025) — real-enforcing, driven cross-worksheet.
 *     CROSS-WORKSHEET: CR-001 (gate ws-04, field iso17029_conformance on ws-01) and
 *     CR-025 (gate ws-07, reads validation_verification_mode on ws-01) drive through
 *     checkApprovalGate's project-wide conflict-free fallback (makeGateLookup).
 *
 * Conditions + severities are VERBATIM from prod; source anchors are the rendered
 * PDF §4/§6/§7 (SR-3). Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-iso14019-1'; // top-level-await: PG + seed BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO14019_1Harness } from './_harness-env-iso14019-1';
import { ISO14019_1_GATES } from './seed-iso14019-1';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO14019_1Harness();
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

const BLOCK_GATES = ISO14019_1_GATES.filter((g) => g.sev === 'block');
const WARN_GATES = ISO14019_1_GATES.filter((g) => g.sev === 'warn');

// ─────────────────────────────────────────────────────────────────────────────
// Seed sanity — topology matches prod
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 14019-1 — seed sanity (8 worksheets, 17 block, 12 warn, 0 equations)', () => {
  it('seeds 8 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(8);
  });
  it('has 17 block gates + 12 warn gates verbatim from prod', () => {
    expect(BLOCK_GATES.length).toBe(17);
    expect(WARN_GATES.length).toBe(12);
  });
  it('no empty-condition BLOCK gate (the one empty condition CR-006 is a WARN)', () => {
    expect(BLOCK_GATES.filter((g) => g.cond.trim() === '').map((g) => g.code)).toEqual([]);
    expect(WARN_GATES.filter((g) => g.cond.trim() === '').map((g) => g.code)).toEqual(['CR-006']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Engine-trap audit — BLOCK gates only (evaluate.ts + live prod strings)
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 14019-1 — BLOCK gates carry no engine-trap / never-fail no-op shape', () => {
  it('no != null / == null / != "" trap-2 (never-fail) shape in any BLOCK gate', () => {
    // CR-025 uses `!= 'mixed'` — a string-literal comparison, NOT the empty/null
    // trap-2 shape — so it must NOT match here.
    expect(BLOCK_GATES.some((g) => /!=\s*''|!=\s*""|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
  });
  it('no literal-TRUE no-op and no IF/THEN in any BLOCK gate', () => {
    expect(BLOCK_GATES.some((g) => g.cond.trim().toUpperCase() === 'TRUE')).toBe(false);
    expect(BLOCK_GATES.some((g) => /\bIF\b/.test(g.cond))).toBe(false);
  });
  it('the only IN-membership BLOCK gate is CR-024 with lowercase-quoted members matching the enum domain (no trap-3 case skew)', () => {
    const inGates = BLOCK_GATES.filter((g) => /\bIN\b/.test(g.cond));
    expect(inGates.map((g) => g.code)).toEqual(['CR-024']);
    // members are lowercase-quoted, matching the lowercase enum domain values.
    expect(inGates[0].cond).toContain("'unmodified'");
    expect(/\{'unmodified','qualified','adverse','disclaimed'\}/.test(inGates[0].cond)).toBe(true);
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
 *  worksheet whose gate is evaluated. They differ for the cross-worksheet gates
 *  (CR-001: field on ws-01, gate on ws-04). */
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

describe('ISO 14019-1 (C) — 11 boolean-attestation BLOCK gates enforce both ways', () => {
  it('CR-010 confidentiality_safeguarded == true       [ws-03]', async () =>
    proveBothWays('ISO-14019-1-03', 'CR-010', { confidentiality_safeguarded: true }, { confidentiality_safeguarded: false }));
  it('CR-011 integrity_demonstrated == true            [ws-03]', async () =>
    proveBothWays('ISO-14019-1-03', 'CR-011', { integrity_demonstrated: true }, { integrity_demonstrated: false }));
  it('CR-014 programme_suitability_confirmed == true   [ws-04]', async () =>
    proveBothWays('ISO-14019-1-04', 'CR-014', { programme_suitability_confirmed: true }, { programme_suitability_confirmed: false }));
  it('CR-015 information_description_complete == true   [ws-04]', async () =>
    proveBothWays('ISO-14019-1-04', 'CR-015', { information_description_complete: true }, { information_description_complete: false }));
  it('CR-016 requirements_criteria_identified == true  [ws-05]', async () =>
    proveBothWays('ISO-14019-1-05', 'CR-016', { requirements_criteria_identified: true }, { requirements_criteria_identified: false }));
  it('CR-018 criteria_suitability_confirmed == true    [ws-05]', async () =>
    proveBothWays('ISO-14019-1-05', 'CR-018', { criteria_suitability_confirmed: true }, { criteria_suitability_confirmed: false }));
  it('CR-019 engagement_scope_agreed == true           [ws-05]', async () =>
    proveBothWays('ISO-14019-1-05', 'CR-019', { engagement_scope_agreed: true }, { engagement_scope_agreed: false }));
  it('CR-020 methodology_identified == true            [ws-06]', async () =>
    proveBothWays('ISO-14019-1-06', 'CR-020', { methodology_identified: true }, { methodology_identified: false }));
  it('CR-022 body_requirements_met == true             [ws-06]', async () =>
    proveBothWays('ISO-14019-1-06', 'CR-022', { body_requirements_met: true }, { body_requirements_met: false }));
  it('CR-026 deliverable_format_agreed == true         [ws-07]', async () =>
    proveBothWays('ISO-14019-1-07', 'CR-026', { deliverable_format_agreed: true }, { deliverable_format_agreed: false }));
  it('CR-001 iso17029_conformance == true              [gate ws-04, field ws-01 — cross-ws fallback]', async () =>
    proveBothWays('ISO-14019-1-04', 'CR-001',
      { iso17029_conformance: true }, { iso17029_conformance: false },
      'ISO-14019-1-01'));
});

describe('ISO 14019-1 (C) — 4 existence (IS NOT NULL) BLOCK gates enforce both ways', () => {
  it('CR-017 criteria_availability IS NOT NULL         [ws-05, enum]', async () =>
    proveBothWays('ISO-14019-1-05', 'CR-017',
      { criteria_availability: 'publicly' }, { criteria_availability: null }));
  it('CR-021 team_competence_criteria IS NOT NULL      [ws-06, text]', async () =>
    proveBothWays('ISO-14019-1-06', 'CR-021',
      { team_competence_criteria: 'Lead V/V per ISO 14019-4:2026 Annex A' }, { team_competence_criteria: null }));
  it('CR-027 deliverable_category_selected IS NOT NULL [ws-06, enum]', async () =>
    proveBothWays('ISO-14019-1-06', 'CR-027',
      { deliverable_category_selected: 'assurance_statement_opinion' }, { deliverable_category_selected: null }));
  it('CR-023 assurance_opinion IS NOT NULL             [ws-07, text]', async () =>
    proveBothWays('ISO-14019-1-07', 'CR-023',
      { assurance_opinion: 'Unmodified — limited level of assurance' }, { assurance_opinion: null }));
});

describe('ISO 14019-1 (C) — membership BLOCK gate CR-024 (effective NO-OP) reaches fail only out-of-domain', () => {
  // CR-024 members == the full enum domain {unmodified,qualified,adverse,disclaimed}
  // (§6.2.2, verbatim). ANY in-domain value passes; null → pending (never a fail).
  // It reaches a DEFINITE fail only on an out-of-domain value, which the save path
  // persists (no enum-domain validation). We drive it both ways with an injected
  // out-of-domain violate value; this documents that the gate's ONLY reachable fail
  // is unreachable through the real UI (dropdown constrains to the 4 domain values).
  it('CR-024 IN {domain}: passes on a domain value; blocks only on an out-of-domain value [ws-07]', async () =>
    proveBothWays('ISO-14019-1-07', 'CR-024',
      { assurance_conclusion: 'unmodified' },
      { assurance_conclusion: '__out_of_domain__' }));
});

describe('ISO 14019-1 (C) — disjunction BLOCK gate CR-025 enforces both ways (cross-ws)', () => {
  // `mixed_engagement_separation == true OR validation_verification_mode != 'mixed'`
  // Fails ONLY when mode == 'mixed' (§6.3.2) AND separation != true. We pin
  // validation_verification_mode = 'mixed' on ws-01 (read cross-ws by fallback), then
  // toggle mixed_engagement_separation on ws-07 (the gate's home worksheet).
  it('CR-025 blocks only when mode==mixed AND separation!=true [gate ws-07, mode field ws-01]', async () => {
    DRIVEN.add('CR-025');
    // Pin mode = 'mixed' project-wide (field on ws-01, resolved via fallback for the ws-07 gate).
    await save('ISO-14019-1-01', { validation_verification_mode: 'mixed' });
    // Pass arm: separation true → first disjunct true → gate passes.
    await save('ISO-14019-1-07', { mixed_engagement_separation: true });
    expect(await gateBlocks('ISO-14019-1-07', 'CR-025'), 'CR-025 should NOT block when separation=true').toBe(false);
    // Violate arm: separation false AND mode 'mixed' → both disjuncts false → gate blocks.
    await save('ISO-14019-1-07', { mixed_engagement_separation: false });
    expect(await gateBlocks('ISO-14019-1-07', 'CR-025'), 'CR-025 SHOULD block when mode=mixed & separation=false').toBe(true);
    // Control: flip mode away from 'mixed' → second disjunct true → gate passes even with separation=false.
    await save('ISO-14019-1-01', { validation_verification_mode: 'verification' });
    expect(await gateBlocks('ISO-14019-1-07', 'CR-025'), 'CR-025 should NOT block when mode!=mixed').toBe(false);
    // Restore mode='mixed' would re-block; leave as 'verification' so it does not
    // interfere with the summary re-drive below.
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Representative WARN gates never appear in the approval-gate block set
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 14019-1 — representative WARN gates never block', () => {
  it('CR-003 (WARN, boolean) never blocks even when false            [ws-02]', async () => {
    await save('ISO-14019-1-02', { raw_data_access: false });
    expect(await gateBlocks('ISO-14019-1-02', 'CR-003')).toBe(false);
  });
  it('CR-005 (WARN, boolean) never blocks even when false            [ws-03]', async () => {
    await save('ISO-14019-1-03', { evidence_based_approach: false });
    expect(await gateBlocks('ISO-14019-1-03', 'CR-005')).toBe(false);
  });
  it('CR-002 (WARN, multi-AND existence) never blocks even when unset [ws-02]', async () => {
    await save('ISO-14019-1-02', { declared_sustainability_information: null, information_type: null, time_orientation: null });
    expect(await gateBlocks('ISO-14019-1-02', 'CR-002')).toBe(false);
  });
  it('CR-028 (WARN, boolean) never blocks even when false            [ws-08]', async () => {
    await save('ISO-14019-1-08', { body_conformance_14019_4: false });
    expect(await gateBlocks('ISO-14019-1-08', 'CR-028')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Persistence read-back through the real save path
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 14019-1 — persistence read-back through the real save path', () => {
  it('a saved text assurance_opinion value round-trips to project_parameters', async () => {
    await save('ISO-14019-1-07', { assurance_opinion: 'RB-01 opinion roundtrip' });
    const fid = fixture.fieldByWs['ISO-14019-1-07']['assurance_opinion'].fieldId;
    const [row] = await sql<{ value_text: string | null }[]>`
      SELECT value_text FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${fid}`;
    expect(row?.value_text).toBe('RB-01 opinion roundtrip');
  });
});

describe('ISO 14019-1 — all 17 block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every one of the 17 block gate codes', () => {
    const blockCodes = BLOCK_GATES.map((g) => g.code).sort();
    const undriven = blockCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(DRIVEN.size).toBe(17);
  });
});
