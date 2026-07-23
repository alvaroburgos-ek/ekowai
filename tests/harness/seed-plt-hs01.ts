/**
 * PLT-HS-01-shaped minimal fixture for the Finding-H real-save-path harness.
 *
 * Seeds (directly via postgres.js, as the postgres role — the same role `db`
 * uses) exactly the rows a Mulde geometry materialize + A138-23 summary need:
 *   - profile + org + org_members (so BYPASS_AUTH user is an internal member)
 *   - project + DWA-A-138-1 standard
 *   - worksheet templates A138-04 (rainfall carrier), A138-07 (A_C), A138-12
 *     (A_S,m owner — Gl.7), A138-15 (facility_type_selected), A138-17 (Mulde
 *     producer — Gl.14/15/16, h_M, V_M, A_S_m), A138-23 (summary)
 *   - fields + equations + project_parameters
 *
 * Scalars are the documented prod PLT-HS-01 baseline (phase4-progress.md RED
 * BASELINE): A_C=4836.43, f_Z=1.2, k_i=7.98e-8, h_M=0.30, and a KOSTRA-shaped
 * r_D_n_table whose governing Dauerstufe (D=1440, r_D_n=5.8) yields
 * A_S_m=943.4338711204341 → V_M = A_S,m·h_M = 283.0301613361302 (Gl.15).
 *
 * The verified 138 equation ids are used verbatim so the server's topology
 * triggers (ASM_GL7_EQUATION_ID owner path; Gl.14 non-displayOnly → V_M in the
 * derived-symbol set → the client's null write-back is derived-eligible) fire
 * exactly as on prod.
 */
import type postgres from 'postgres';

// Verified 138 equation ids (must match src/lib/eval/asm-source.ts + equation-profiles.ts).
const GL7_A138_12 = '55151cb1-4a5a-48d1-b5c0-2312ef7b78ac'; // A_S,m direct owner (ASM_GL7_EQUATION_ID)
const GL16_A138_17 = '14999c2a-cdeb-42c1-98fd-fcdec65123da'; // Mulde geometry (A_S_m output)
const GL14_A138_17 = 'bfe6e59a-015f-4c95-b717-8599f80cb68a'; // V_M required (NOT displayOnly — the clobber source)
const GL15_A138_17 = '44fd56a8-b473-441a-be21-297d9f501226'; // V_M geometric (displayOnly)

/** The A138-17 equations that output V_M (client write-back candidates). */
export const A138_17_V_M_EQUATIONS = [GL14_A138_17, GL15_A138_17] as const;

// Documented prod PLT-HS-01 baseline scalars.
export const PLT_HS_01 = {
  A_C: 4836.43,
  f_Z: 1.2,
  k_i: 7.98e-8,
  h_M: 0.3,
  // Gl.9 (§5.3.3.7): q_S,AC = (k_i·A_S,m·1000 + Q_Dr)/A_C · 10⁴  (Q_Dr=0 here).
  // With A_S,m=943.4338711204341, A_C=4836.43, k_i=7.98e-8 → q_S,AC=0.1556644527… (< 2)
  // → facility_meets_qsac=false in this fixture (the FAIL driver of the pilot).
  q_S_AC: 0.15566445273768182,
  RAIN_ROWS: [
    { D_min: 5, r_D_n: 250 },
    { D_min: 10, r_D_n: 180 },
    { D_min: 60, r_D_n: 58 },
    { D_min: 360, r_D_n: 16 },
    { D_min: 720, r_D_n: 9 },
    { D_min: 1440, r_D_n: 5.8 }, // governing Dauerstufe → A_S_m=943.4338711204341
  ],
};

export type SeededFixture = {
  projectId: string;
  userId: string;
  standardId: string;
  ws17InstanceId: string;
  ws12InstanceId: string;
  ws15InstanceId: string;
  ws23InstanceId: string;
  // A138-17 field ids
  hMFieldId: string;
  vMFieldId: string;
  aSmFieldId: string;
  qSacFieldId: string;
  tEFieldId: string;
  acFieldId: string;
  // A138-12 owner fields (method + A_S_m owner) — for the baseline-restore step
  methodFieldId: string;
  aSmOwnerFieldId: string;
  aSminFieldId: string;
  aSmaxFieldId: string;
  acAsCheckFieldId: string;
  // A138-15 facility selector
  facilityTypeFieldId: string;
  // A138-23 output field ids
  f_dimensioned: string;
  f_volume: string;
  f_footprint: string;
  f_meets_qsac: string;
  f_complete: string;
  f_recommended: string;
  f_reasons: string;
  f_gate_result: string;
};

export async function seedPltHs01(
  sql: postgres.Sql,
  userId: string,
): Promise<SeededFixture> {
  // ── principal + project ──────────────────────────────────────────────────
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('Harness Org', ${'harness-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'PLT-HS-01', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-A-138-1', 'DWA-A 138-1', 'harness') RETURNING id`;

  const mkTemplate = async (code: string, title: string) => {
    const [t] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_templates (standard_id, code, title_de) VALUES (${std.id}, ${code}, ${title}) RETURNING id`;
    const [s] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_sections (worksheet_template_id, code, title_de) VALUES (${t.id}, ${'S-' + code}, ${'S-' + code}) RETURNING id`;
    const [i] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_instances (project_id, worksheet_template_id) VALUES (${proj.id}, ${t.id}) RETURNING id`;
    return { templateId: t.id, sectionId: s.id, instanceId: i.id };
  };
  const mkField = async (
    templateId: string, sectionId: string, symbol: string, dataType: string, oi: number,
  ) => {
    const [f] = await sql<{ id: string }[]>`
      INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
      VALUES (${templateId}, ${sectionId}, ${symbol}, ${symbol}, ${dataType}, true, ${oi}) RETURNING id`;
    return f.id;
  };
  const mkEquation = async (
    templateId: string, id: string, num: string, formula: string, outputSymbol: string,
  ) => {
    await sql`
      INSERT INTO equations (id, worksheet_template_id, equation_number, formula, output_symbol)
      VALUES (${id}, ${templateId}, ${num}, ${formula}, ${outputSymbol})`;
  };
  const insParam = async (
    fieldId: string, instanceId: string, cols: Record<string, unknown>,
  ) => {
    await sql`
      INSERT INTO project_parameters ${sql({
        project_id: proj.id,
        field_id: fieldId,
        source_worksheet_instance_id: instanceId,
        entered_by: userId,
        source_type: 'entered',
        ...cols,
      })}`;
  };

  // ── A138-04 rainfall carrier ──
  const t04 = await mkTemplate('A138-04', 'Rainfall');
  const rdnFieldId = await mkField(t04.templateId, t04.sectionId, 'r_D_n_table', 'json', 1);

  // ── A138-07 A_C ──
  const t07 = await mkTemplate('A138-07', 'Surface');
  const acFieldId = await mkField(t07.templateId, t07.sectionId, 'A_C', 'number', 1);

  // ── A138-12 A_S,m owner (Gl.7) — producer branch resolves A_S_m here ──
  const t12 = await mkTemplate('A138-12', 'A_S,m owner');
  const methodFieldId = await mkField(t12.templateId, t12.sectionId, 'a_s_m_determination_method', 'enum', 1);
  const aSmOwnerFieldId = await mkField(t12.templateId, t12.sectionId, 'A_S_m', 'number', 2);
  // Direct-method inputs (Gl.7): A_S_m = (A_S_min + A_S_max)/2. For the A138-12
  // regression reference (restore step) A_S_min=A_S_max=45 → A_S_m=45.
  const aSminFieldId = await mkField(t12.templateId, t12.sectionId, 'A_S_min', 'number', 3);
  const aSmaxFieldId = await mkField(t12.templateId, t12.sectionId, 'A_S_max', 'number', 4);
  // Tab.6 loading-check consumer fields on A138-12 (ac_as_ratio outputs) + the
  // cross-inputs (flaechengruppe/bbz_thickness) the loading materialize reads.
  const flaechengruppeFieldId = await mkField(t12.templateId, t12.sectionId, 'flaechengruppe', 'enum', 5);
  const bbzThicknessFieldId = await mkField(t12.templateId, t12.sectionId, 'bbz_thickness', 'number', 6);
  await mkField(t12.templateId, t12.sectionId, 'ac_as_ratio', 'number', 7);
  await mkField(t12.templateId, t12.sectionId, 'ac_as_ratio_limit', 'number', 8);
  const acAsCheckFieldId = await mkField(t12.templateId, t12.sectionId, 'ac_as_ratio_check', 'text', 9);
  await mkField(t12.templateId, t12.sectionId, 'ac_as_ratio_check_reason', 'text', 10);
  await mkEquation(t12.templateId, GL7_A138_12, 'Gl.7', '(A_S_min + A_S_max) / 2', 'A_S_m');

  // ── A138-15 facility_type_selected ──
  const t15 = await mkTemplate('A138-15', 'Facility select');
  const ftFieldId = await mkField(t15.templateId, t15.sectionId, 'facility_type_selected', 'enum', 1);

  // ── A138-17 Mulde producer (Gl.14/15/16) ──
  const t17 = await mkTemplate('A138-17', 'Mulde');
  const hMFieldId = await mkField(t17.templateId, t17.sectionId, 'h_M', 'number', 1);
  const fZFieldId = await mkField(t17.templateId, t17.sectionId, 'f_Z', 'number', 2);
  const kIFieldId = await mkField(t17.templateId, t17.sectionId, 'k_i', 'number', 3);
  const vMFieldId = await mkField(t17.templateId, t17.sectionId, 'V_M', 'number', 4);
  // q_S,AC (Phase-3 REQ-15 measured performance, Gl.9) + t_E (Tab.14 emptying time).
  // Both are PHASE4_SUMMARY_INPUT_SYMBOLS → saving them fires the summary re-materialize.
  const qSacFieldId = await mkField(t17.templateId, t17.sectionId, 'q_S_AC', 'number', 5);
  const tEFieldId = await mkField(t17.templateId, t17.sectionId, 't_E', 'number', 6);
  // NOTE: A138-17 has NO local A_S_m field (it inherits A_S_m from A138-12; matches prod).
  await mkEquation(t17.templateId, GL16_A138_17, 'Gl.16', '(A_C*1e-7*r_D_n)/(h_M/(D*60*f_Z)+k_i)', 'A_S_m');
  await mkEquation(t17.templateId, GL14_A138_17, 'Gl.14', 'A_C*A_VA*r_D_n*A_S_m*k_i*D*f_Z', 'V_M');
  await mkEquation(t17.templateId, GL15_A138_17, 'Gl.15', 'A_S_m*h_M', 'V_M');

  // ── A138-23 summary ──
  const t23 = await mkTemplate('A138-23', 'Phase-4 Summary');
  const f_dimensioned = await mkField(t23.templateId, t23.sectionId, 'facility_type_dimensioned', 'text', 1);
  const f_volume = await mkField(t23.templateId, t23.sectionId, 'facility_specific_volume_m3', 'number', 2);
  const f_footprint = await mkField(t23.templateId, t23.sectionId, 'facility_footprint_m2', 'number', 3);
  const f_meets_qsac = await mkField(t23.templateId, t23.sectionId, 'facility_meets_qsac', 'boolean', 4);
  const f_complete = await mkField(t23.templateId, t23.sectionId, 'facility_specific_dimensioning_complete', 'boolean', 5);
  await mkField(t23.templateId, t23.sectionId, 'facility_design_completion_date', 'date', 6);
  const f_recommended = await mkField(t23.templateId, t23.sectionId, 'recommended_phase_4_gate', 'enum', 7);
  const f_reasons = await mkField(t23.templateId, t23.sectionId, 'phase_4_recommendation_reasons', 'text', 8);
  const gateResultFieldId = await mkField(t23.templateId, t23.sectionId, 'phase_4_gate_result', 'enum', 9);

  // ── REQ-19 (§6, Tab.14) — block-severity gate on the engineer-entered verdict.
  //    Prod condition: phase_4_gate_result IN {PASS, CONDITIONAL}. A saved FAIL
  //    ⇒ evaluateCondition → 'fail' ⇒ checkApprovalGate refuses engineer_approve.
  await sql`
    INSERT INTO compliance_requirements
      (worksheet_template_id, code, title_de, condition, severity)
    VALUES (${t23.templateId}, 'A138-REQ-19',
      'Phase-4-Gate: Bemessung bestanden (PASS/CONDITIONAL)',
      'phase_4_gate_result IN {PASS, CONDITIONAL}', 'block')`;

  // ── persisted state ──
  await insParam(rdnFieldId, t04.instanceId, { value_json: sql.json({ rows: PLT_HS_01.RAIN_ROWS }) });
  await insParam(acFieldId, t07.instanceId, { value_number: String(PLT_HS_01.A_C) });
  await insParam(methodFieldId, t12.instanceId, { value_enum: 'geometry' });
  // Tab.6 loading-check inputs: V2 → tier2 (limit 30 thin / 50 thick); bbz<0.30 → thin.
  // With restored A_S_m=45 → ratio=A_C/A_S_m=107.476 > 30 → ac_as_ratio_check='fail'.
  await insParam(flaechengruppeFieldId, t12.instanceId, { value_enum: 'V2' });
  await insParam(bbzThicknessFieldId, t12.instanceId, { value_number: '0.2' });
  await insParam(ftFieldId, t15.instanceId, { value_enum: 'mulde' });
  await insParam(fZFieldId, t17.instanceId, { value_number: String(PLT_HS_01.f_Z) });
  await insParam(kIFieldId, t17.instanceId, { value_number: String(PLT_HS_01.k_i) });
  // q_S,AC (Gl.9) persisted as the measured Phase-3 performance → summary derives
  // meetsQsac = (q_S,AC ≥ 2) = false in this fixture.
  await insParam(qSacFieldId, t17.instanceId, { value_number: String(PLT_HS_01.q_S_AC) });
  // engineer-entered verdict — must never be overwritten by the materialize
  await insParam(gateResultFieldId, t23.instanceId, { value_enum: 'FAIL' });

  return {
    projectId: proj.id,
    userId,
    standardId: std.id,
    ws17InstanceId: t17.instanceId,
    ws12InstanceId: t12.instanceId,
    ws15InstanceId: t15.instanceId,
    ws23InstanceId: t23.instanceId,
    hMFieldId,
    vMFieldId,
    aSmFieldId: aSmOwnerFieldId,
    qSacFieldId,
    tEFieldId,
    acFieldId,
    methodFieldId,
    aSmOwnerFieldId,
    aSminFieldId,
    aSmaxFieldId,
    acAsCheckFieldId,
    facilityTypeFieldId: ftFieldId,
    f_dimensioned,
    f_volume,
    f_footprint,
    f_meets_qsac,
    f_complete,
    f_recommended,
    f_reasons,
    f_gate_result: gateResultFieldId,
  };
}
