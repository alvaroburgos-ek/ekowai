/**
 * DWA-A 138-1 Mulde pilot script — FULL end-to-end through the REAL saveWorksheet
 * (self-provided embedded Postgres). Every assertion goes through the real save
 * path + the real compliance evaluator / approval gate — no pure-helper proxies.
 *
 * Guideline is ground truth. Cited inline:
 *   Gl.7  §5.3.3.x  A_S,m = (A_S,min + A_S,max)/2                (direct method)
 *   Gl.9  §5.3.3.7  q_S,AC = (k_i·A_S,m·1000 + Q_Dr)/A_C · 10⁴ ≥ 2 l/(s·ha)
 *   Gl.15 §6.3.2    V_M = A_S,m · h_M                            (Mulde Speichervolumen)
 *   Gl.16           A_S,m Mulde geometry sweep (governing Dauerstufe)
 *   Tab.14 §6.3.2   t_E ≤ 84 h at n=1/a                          (Entleerungszeit)
 *   REQ-19 §6/Tab.14  phase_4_gate_result IN {PASS, CONDITIONAL} (block gate)
 *
 * The four pilot steps run in ORDER against one seeded DB (module-level harness):
 *   1. Summary GREEN — the h_M materialize persists V_M + a q_S,AC-only FAIL summary.
 *   2. Verdict engineer-entry + REQ-19 — FAIL blocks engineer_approve; PASS/CONDITIONAL allow.
 *   3. Verdict flip — a q_S,AC ≥ 2 variant flips PASS; t_E=92 → CONDITIONAL; restore → FAIL.
 *   4. Baseline restore — method geometry→direct (A_S_m=45) + facility mulde→flaeche;
 *      the A138-12 Tab.6 regression reference re-derives (ac_as_ratio=107.476…, check='fail').
 */
// @vitest-environment node
import './_harness-env'; // top-level-await: starts PG + seeds BEFORE @/lib/db loads
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { getHarness } from './_harness-env';
import { computeMuldeGeometrySweep } from '@/lib/eval/materialize-asm';
import { PLT_HS_01 } from './seed-plt-hs01';

const { harness, fixture } = getHarness();
const sql = harness.sql;

afterAll(async () => {
  await harness.stop();
});

// Authoritative expected sizing (recomputed from the pure sweep so the assertion
// cannot drift from the server rule) — matches the prod PLT-HS-01 baseline.
const EXPECTED_A_S_M = computeMuldeGeometrySweep(PLT_HS_01.RAIN_ROWS, {
  A_C: PLT_HS_01.A_C, h_M: PLT_HS_01.h_M, f_Z: PLT_HS_01.f_Z, k_i: PLT_HS_01.k_i,
}).A_S_m!; // 943.4338711204341
const EXPECTED_V_M = EXPECTED_A_S_M * PLT_HS_01.h_M; // 283.0301613361302 (Gl.15)

// Gl.9 fixture q_S,AC — computed verbatim from the guideline formula (Q_Dr=0).
const EXPECTED_QSAC = (PLT_HS_01.k_i * EXPECTED_A_S_M * 1000) / PLT_HS_01.A_C * 1e4; // 0.15566…

type Row = {
  field_id: string;
  value_number: string | null;
  value_text: string | null;
  value_boolean: boolean | null;
  value_enum: string | null;
  source_type: string;
};

/** Read the full A138-23 summary rows keyed by field id. */
async function readSummary() {
  const rows = await sql<Row[]>`
    SELECT field_id, value_number, value_text, value_boolean, value_enum, source_type
    FROM project_parameters
    WHERE project_id = ${fixture.projectId}
      AND field_id IN (
        ${fixture.f_dimensioned}, ${fixture.f_volume}, ${fixture.f_footprint},
        ${fixture.f_meets_qsac}, ${fixture.f_complete},
        ${fixture.f_recommended}, ${fixture.f_reasons})`;
  const by = (id: string) => rows.find((r) => r.field_id === id);
  return { rows, by };
}

// The pilot runs strictly in order — a single materialize state is threaded through.
describe.sequential('DWA-A 138-1 Mulde pilot script — real save path', () => {
  beforeAll(async () => {
    // STEP-0 (the Finding-H h_M nudge): fire the asm producer → geometry sweep
    // materializes A_S_m + step-6b materializes V_M=283.03; the summary chain-fires.
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const save = await saveWorksheet({
      instanceId: fixture.ws17InstanceId,
      values: { [fixture.hMFieldId]: { type: 'number', value: PLT_HS_01.h_M } },
    });
    expect(save.ok).toBe(true);
  });

  // ── STEP 1: Summary GREEN (post-Finding-H) ────────────────────────────────
  it('Step 1 — summary GREEN: mulde/943.43/283.03/complete + qSac-only FAIL (no fehlende-V_M clause)', async () => {
    const { by } = await readSummary();

    // Value-column per data type (standing rule): text→value_text, number→value_number, boolean→value_boolean, enum→value_enum.
    expect(by(fixture.f_dimensioned)?.value_text).toBe('mulde');

    const footprint = by(fixture.f_footprint)?.value_number;
    expect(footprint == null ? null : Number(footprint)).toBeCloseTo(943.4339, 4);

    const volume = by(fixture.f_volume)?.value_number;
    expect(volume == null ? null : Number(volume)).toBeCloseTo(283.0302, 4);

    expect(by(fixture.f_complete)?.value_boolean).toBe(true);

    // q_S,AC ≈ 0.16 < 2 (Gl.9) → meetsQsac=false.
    expect(EXPECTED_QSAC).toBeCloseTo(0.1557, 4);
    expect(by(fixture.f_meets_qsac)?.value_boolean).toBe(false);

    // Recommendation FAIL, reasons = q_S,AC-only. NO "fehlende V_M"/"unvollständig" clause
    // (that would mean V_M failed to persist — the Finding-H regression).
    expect(by(fixture.f_recommended)?.value_enum).toBe('FAIL');
    const reasons = by(fixture.f_reasons)?.value_text ?? '';
    expect(reasons).toContain('q_S,AC');
    expect(reasons).toContain('< 2 l/(s·ha)');
    expect(reasons).not.toContain('unvollständig');
    expect(reasons).not.toContain('V_M');
    expect(reasons).not.toContain('fehlende');

    // All summary rows are engine-derived.
    expect(by(fixture.f_recommended)?.source_type).toBe('derived');
  });

  // ── STEP 2: Verdict engineer-entry + REQ-19 gate ──────────────────────────
  it('Step 2 — engineer FAIL persists + REQ-19 blocks engineer_approve; PASS/CONDITIONAL allow', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');

    // Engineer enters the A138-23 verdict = FAIL via the REAL save path.
    const save = await saveWorksheet({
      instanceId: fixture.ws23InstanceId,
      values: { [fixture.f_gate_result]: { type: 'enum', value: 'FAIL' } },
    });
    expect(save.ok).toBe(true);

    // It persists as value_enum (enum data type — standing rule).
    const [entered] = await sql<{ value_enum: string | null; source_type: string }[]>`
      SELECT value_enum, source_type FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${fixture.f_gate_result}`;
    expect(entered?.value_enum).toBe('FAIL');
    expect(entered?.source_type).toBe('entered');

    // REQ-19 (block, condition `phase_4_gate_result IN {PASS, CONDITIONAL}`) evaluated
    // through the REAL approval-gate path → FAIL fails the condition → gate refuses approve.
    const gateFail = await checkApprovalGate(fixture.ws23InstanceId);
    expect(gateFail.ok).toBe(false);
    expect(gateFail.failingBlockConditions.map((c) => c.code)).toContain('A138-REQ-19');

    // PASS ⇒ REQ-19 passes ⇒ gate would allow the transition.
    const savePass = await saveWorksheet({
      instanceId: fixture.ws23InstanceId,
      values: { [fixture.f_gate_result]: { type: 'enum', value: 'PASS' } },
    });
    expect(savePass.ok).toBe(true);
    const gatePass = await checkApprovalGate(fixture.ws23InstanceId);
    expect(gatePass.failingBlockConditions.map((c) => c.code)).not.toContain('A138-REQ-19');
    expect(gatePass.ok).toBe(true);

    // CONDITIONAL also satisfies REQ-19.
    await saveWorksheet({
      instanceId: fixture.ws23InstanceId,
      values: { [fixture.f_gate_result]: { type: 'enum', value: 'CONDITIONAL' } },
    });
    const gateCond = await checkApprovalGate(fixture.ws23InstanceId);
    expect(gateCond.failingBlockConditions.map((c) => c.code)).not.toContain('A138-REQ-19');

    // Restore the engineer verdict to FAIL (the fixture's true state).
    await saveWorksheet({
      instanceId: fixture.ws23InstanceId,
      values: { [fixture.f_gate_result]: { type: 'enum', value: 'FAIL' } },
    });
  });

  // ── STEP 3: Verdict flip (PASS / CONDITIONAL demonstrable) ─────────────────
  it('Step 3 — q_S,AC≥2 flips recommendation to PASS; t_E=92>84 → CONDITIONAL; restore → FAIL', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // Gl.9 verdict-flip fixture math: the summary derives meetsQsac from the persisted
    // q_S,AC. The fixture's q_S,AC = k_i·A_S,m·1000/A_C·10⁴ = 0.1557 < 2 → FAIL.
    // To make q_S,AC ≥ 2 through the SAME Gl.9 with the SAME A_S,m=943.4339 and k_i, we
    // shrink A_C. The threshold A_C (q_S,AC = 2) is A_C* = k_i·A_S,m·1000·10⁴ / 2 = 376.43.
    // Shrink A_C to 0.8·A_C* → q_S,AC = 2.5 (a clear ≥ 2 margin; avoids a floating-point
    // ULP landing at 1.9999…). We compute the flipped q_S,AC from Gl.9 and persist it as
    // the measured performance → the real summary recomputes meetsQsac=true.
    const A_C_threshold = (PLT_HS_01.k_i * EXPECTED_A_S_M * 1000 * 1e4) / 2; // q_S,AC = 2 here
    const A_C_flip = A_C_threshold * 0.8; // smaller catchment → higher q_S,AC
    const QSAC_FLIP = (PLT_HS_01.k_i * EXPECTED_A_S_M * 1000) / A_C_flip * 1e4; // = 2.5
    expect(QSAC_FLIP).toBeCloseTo(2.5, 9);
    expect(QSAC_FLIP).toBeGreaterThanOrEqual(2);

    // Persist q_S,AC ≥ 2 (fires the summary producer branch — q_S_AC ∈ PHASE4_SUMMARY_INPUT_SYMBOLS).
    const saveFlip = await saveWorksheet({
      instanceId: fixture.ws17InstanceId,
      values: { [fixture.qSacFieldId]: { type: 'number', value: QSAC_FLIP } },
    });
    expect(saveFlip.ok).toBe(true);

    let s = await readSummary();
    expect(s.by(fixture.f_meets_qsac)?.value_boolean).toBe(true);
    // No Tab.14 flag applicable yet (t_E null) → PASS.
    expect(s.by(fixture.f_recommended)?.value_enum).toBe('PASS');

    // t_E = 92 h > 84 h (Tab.14, §6.3.2) → CONDITIONAL with the t_E reason.
    const saveTE = await saveWorksheet({
      instanceId: fixture.ws17InstanceId,
      values: { [fixture.tEFieldId]: { type: 'number', value: 92 } },
    });
    expect(saveTE.ok).toBe(true);

    s = await readSummary();
    expect(s.by(fixture.f_recommended)?.value_enum).toBe('CONDITIONAL');
    const condReasons = s.by(fixture.f_reasons)?.value_text ?? '';
    expect(condReasons).toContain('t_E = 92 h > 84 h');

    // Restore the perturbation: clear t_E and restore the FAIL-driving q_S,AC → verdict back to FAIL.
    await saveWorksheet({
      instanceId: fixture.ws17InstanceId,
      values: { [fixture.tEFieldId]: { type: 'number', value: null } },
    });
    await saveWorksheet({
      instanceId: fixture.ws17InstanceId,
      values: { [fixture.qSacFieldId]: { type: 'number', value: PLT_HS_01.q_S_AC } },
    });

    s = await readSummary();
    expect(s.by(fixture.f_meets_qsac)?.value_boolean).toBe(false);
    expect(s.by(fixture.f_recommended)?.value_enum).toBe('FAIL');
  });

  // ── STEP 4: Baseline restore (A138-12 Tab.6 regression reference) ──────────
  it('Step 4 — restore geometry→direct (A_S_m=45) + mulde→flaeche: A138-12 ratio=107.476, check=fail', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // Switch the facility selector mulde→flaeche (A138-15).
    const saveFt = await saveWorksheet({
      instanceId: fixture.ws15InstanceId,
      values: { [fixture.facilityTypeFieldId]: { type: 'enum', value: 'flaeche' } },
    });
    expect(saveFt.ok).toBe(true);

    // Restore method geometry→direct with A_S_min=A_S_max=45 (Gl.7 → A_S_m=45) on A138-12.
    // This is an A138-12 owner save → asm materializes A_S_m, then the Tab.6 loading
    // block re-derives ac_as_ratio + check in the SAME transaction.
    const saveDirect = await saveWorksheet({
      instanceId: fixture.ws12InstanceId,
      values: {
        [fixture.methodFieldId]: { type: 'enum', value: 'direct' },
        [fixture.aSminFieldId]: { type: 'number', value: 45 },
        [fixture.aSmaxFieldId]: { type: 'number', value: 45 },
      },
    });
    expect(saveDirect.ok).toBe(true);

    // A_S_m re-derived = 45 (Gl.7).
    const [asm] = await sql<{ value_number: string | null; source_type: string }[]>`
      SELECT value_number, source_type FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${fixture.aSmOwnerFieldId}`;
    expect(asm?.value_number == null ? null : Number(asm.value_number)).toBe(45);
    expect(asm?.source_type).toBe('derived');

    // Tab.6 regression reference: ac_as_ratio = A_C/A_S_m = 4836.43/45 = 107.47622…, check='fail'
    // (V2 → tier2, bbz=0.2 m < 0.30 → thin band → limit 30; 107.476 > 30 → fail).
    const [check] = await sql<{ value_text: string | null }[]>`
      SELECT value_text FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${fixture.acAsCheckFieldId}`;
    expect(check?.value_text).toBe('fail');

    // Confirm the ratio value itself re-derived (read the ac_as_ratio field by symbol via join).
    const [ratio] = await sql<{ value_number: string | null }[]>`
      SELECT pp.value_number FROM project_parameters pp
      JOIN fields f ON f.id = pp.field_id
      JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
      WHERE pp.project_id = ${fixture.projectId}
        AND f.symbol = 'ac_as_ratio' AND wt.standard_id = ${fixture.standardId}`;
    expect(ratio?.value_number == null ? null : Number(ratio.value_number)).toBeCloseTo(107.47622, 5);
  });
});
