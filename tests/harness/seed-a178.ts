/**
 * DWA-A-178 (Retentionsbodenfilteranlagen) — minimal fixture for the REAL
 * save-path execution-proof harness.
 *
 * PROOF MANDATE: A-178's prior "14 of 19 runnable" was ASSESSED, never executed.
 * This fixture drives the standard's 20 live BLOCK gates through the REAL
 * `saveWorksheet` (values persist to project_parameters) and the REAL
 * `checkApprovalGate` (the engineer-approve enforcement read path that replays
 * each block condition against the saved values). Each gate is demonstrated BOTH
 * ways — a state that PASSES it and a state that VIOLATES it — so a gate that
 * fires but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology is pulled verbatim from prod (standard 77694afd-…, this session, R-2):
 *   - 19 worksheet_templates; the fixture seeds the 16 that host a gate symbol.
 *   - Every symbol each block condition references is seeded as a field ON ITS
 *     REAL HOME WORKSHEET (e.g. system_type→A178-02, h_RR→A178-11, A_E_b_a→
 *     A178-04, langzeitsimulation_dauer→A178-05, A_F→A178-10, B_RBFA_ab→A178-14),
 *     so `checkApprovalGate`'s local-symbol + conflict-free project-wide fallback
 *     resolves cross-worksheet guards exactly as the deployed app does.
 *   - Conditions are verbatim from prod compliance_requirements.
 *
 * Parked engine gaps (NOT fixed here — demonstrated as honest blockers):
 *   - Gl.2/Gl.3  B_RBF_zu = SUM_over_i(…)     → arithmetic engine has no
 *     SUM_over_i (SUPPORTED_FUNCTIONS={min,max}) → fails loud (manual_required).
 *     B_RBF_zu ALSO exists as a hand-entry field on A178-09, so A_F (Gl.1)
 *     degrades to hand-entry and still computes — proven below.
 *   - Gl.9  b_F_im_bereich = "4 <= b_F <= b_krit = 7"  → malformed two-sided
 *     criterion, not a computable RHS → manual_required. Unused by any gate.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

/** The 20 live BLOCK gates, grouped by worksheet, conditions verbatim from prod. */
export const A178_BLOCK_GATES = [
  { ws: 'A178-01', code: 'REQ-02', cond: 'treatment_need_confirmed == True' },
  { ws: 'A178-02', code: 'REQ-16', cond: "IF system_type == 'strasse' THEN h_RR >= 0.5" },
  { ws: 'A178-06', code: 'REQ-07', cond: 'feststoffeintrag_alarm == false' },
  { ws: 'A178-07', code: 'REQ-13', cond: 'filter_U < 5 AND filter_feinanteil <= 3 AND filter_ueberkornanteil <= 15 AND filter_calcium_carbonate >= 20' },
  { ws: 'A178-07', code: 'REQ-14', cond: 'q_Dr_RBF <= 0.05' },
  { ws: 'A178-07', code: 'REQ-25', cond: 'abdichtung_kdb_staerke >= 2' },
  { ws: 'A178-07', code: 'REQ-26', cond: 'geotextil_zwischen_filter_drane == False' },
  { ws: 'A178-07', code: 'REQ-27', cond: 'pflanzdichte >= 4 AND pflanzdichte <= 8' },
  { ws: 'A178-09', code: 'REQ-18', cond: "IF system_type == 'trenn' AND h_N_a_m > 1000 THEN A_F >= 100 * A_E_b_a" },
  { ws: 'A178-11', code: 'REQ-15', cond: 'h_RR >= 0.3 AND h_RR <= 2' },
  { ws: 'A178-12', code: 'REQ-09', cond: "IF system_type == 'misch' THEN (e_0 <= 55 AND n_RBF >= 10)" },
  { ws: 'A178-12', code: 'REQ-10', cond: "IF system_type IN {'trenn','strasse'} THEN v_spez_grobstoff >= 0.5" },
  { ws: 'A178-12', code: 'REQ-11', cond: 'attest_a178_12_req_11 == True' },
  { ws: 'A178-12', code: 'REQ-12', cond: "(IF system_type == 'misch' THEN h_FK_required >= 0.75) AND (IF system_type IN {'trenn','strasse'} THEN h_FK_required >= 0.5)" },
  { ws: 'A178-12', code: 'REQ-23', cond: 'langzeitsimulation_dauer >= 10' },
  { ws: 'A178-13', code: 'REQ-19', cond: '4 <= b_F AND b_F <= 7' },
  { ws: 'A178-16', code: 'REQ-20', cond: 'B_RBFA_ab / A_E_b_a <= b_R_e_zul' },
  { ws: 'A178-16', code: 'REQ-21', cond: "IF system_type == 'misch' THEN t_RR_E_n1 <= 48" },
  { ws: 'A178-17', code: 'REQ-22', cond: 'n_RBF >= 10' },
  { ws: 'A178-18', code: 'REQ-24', cond: 'convergence_achieved == True' },
] as const;

/**
 * Fields to seed per worksheet — each gate symbol on its REAL home worksheet
 * (data_type verbatim from prod). Worksheets that host a gate but no gate symbol
 * (A178-09, A178-16) get an instance with no fields — their guards resolve via
 * the project-wide fallback, exactly as in the deployed app.
 */
export const A178_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'A178-01': [{ symbol: 'treatment_need_confirmed', dataType: 'boolean' }],
  'A178-02': [{ symbol: 'system_type', dataType: 'enum' }],
  'A178-04': [{ symbol: 'A_E_b_a', dataType: 'number' }],
  'A178-05': [
    { symbol: 'h_N_a_m', dataType: 'number' },
    { symbol: 'langzeitsimulation_dauer', dataType: 'number' },
  ],
  'A178-06': [{ symbol: 'feststoffeintrag_alarm', dataType: 'boolean' }],
  'A178-07': [
    { symbol: 'filter_U', dataType: 'number' },
    { symbol: 'filter_feinanteil', dataType: 'number' },
    { symbol: 'filter_ueberkornanteil', dataType: 'number' },
    { symbol: 'filter_calcium_carbonate', dataType: 'number' },
    { symbol: 'q_Dr_RBF', dataType: 'number' },
    { symbol: 'abdichtung_kdb_staerke', dataType: 'number' },
    { symbol: 'geotextil_zwischen_filter_drane', dataType: 'boolean' },
    { symbol: 'pflanzdichte', dataType: 'number' },
    { symbol: 'e_0', dataType: 'number' },
    { symbol: 'b_R_e_zul', dataType: 'number' },
    { symbol: 'h_FK_required', dataType: 'number' },
    { symbol: 'v_spez_grobstoff', dataType: 'number' },
  ],
  'A178-09': [],
  'A178-10': [{ symbol: 'A_F', dataType: 'number' }],
  'A178-11': [{ symbol: 'h_RR', dataType: 'number' }],
  'A178-12': [{ symbol: 'attest_a178_12_req_11', dataType: 'boolean' }],
  'A178-13': [{ symbol: 'b_F', dataType: 'number' }],
  'A178-14': [{ symbol: 'B_RBFA_ab', dataType: 'number' }],
  'A178-15': [],
  'A178-16': [],
  'A178-17': [
    { symbol: 'n_RBF', dataType: 'number' },
    { symbol: 't_RR_E_n1', dataType: 'number' },
  ],
  'A178-18': [{ symbol: 'convergence_achieved', dataType: 'boolean' }],
};

/**
 * Equations driven directly through the REAL `evaluateFormula` to demonstrate:
 *   (a) the two PARKED engine gaps fail loud (never fabricate a value), and
 *   (b) the DERIVED gate-inputs (A_F, B_RBFA_ab, eta_F, b_F) DO compute once
 *       their upstream is hand-entered — so the gates reading them are genuinely
 *       runnable, not blocked.
 * `homeWs` only records provenance; evaluateFormula is template-agnostic.
 * Formula strings verbatim from prod equations rows.
 */
export const A178_EQUATIONS = [
  { num: '2', out: 'B_RBF_zu', homeWs: 'A178-09', formula: 'B_RBF_zu = SUM_over_i(A_E_b_a_i * b_R_a)', cls: 'gap-sum' },
  { num: '3', out: 'B_RBF_zu', homeWs: 'A178-09', formula: 'B_RBF_zu = SUM_over_i(A_E_b_a_i * b_R_a * e_0)', cls: 'gap-sum' },
  { num: '1', out: 'A_F', homeWs: 'A178-10', formula: 'A_F = (B_RBF_zu / b_krit) * eta_B_soll', cls: 'pure' },
  { num: '11', out: 'B_RBFA_ab', homeWs: 'A178-14', formula: 'B_RBFA_ab = B_VS + B_Dr_RBF + B_FU + B_RRL', cls: 'pure' },
  { num: '13', out: 'eta_F', homeWs: 'A178-15', formula: 'eta_F = ((C_RBF_zu * VQ_Dr_RBF) - (B_RBF_ab * 1000)) / (C_RBF_zu * VQ_RBF_zu)', cls: 'pure' },
  { num: '5', out: 'b_F', homeWs: 'A178-13', formula: 'b_F = ((VQ_Dr_RBF * eta_F) * C_RBFA_zu * (1 - eta_VS)) / (A_F * 1000)', cls: 'pure' },
  { num: '9', out: 'b_F_im_bereich', homeWs: 'A178-16', formula: '4 <= b_F <= b_krit = 7   [kg/(m^2*a)]', cls: 'gap-malformed' },
] as const;

export type A178Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** symbol → field id */
  fields: Record<string, string>;
  /** symbol → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
  /** equation number → equation id */
  equationIds: Record<string, string>;
};

export async function seedA178(sql: postgres.Sql, userId: string): Promise<A178Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'a178-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('A178 Harness Org', ${'a178-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'A178-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-A-178', 'DWA-A 178 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const [ws, wsFields] of Object.entries(A178_FIELDS)) {
    const [t] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_templates (standard_id, code, title_de)
      VALUES (${std.id}, ${ws}, ${ws + ' (harness)'}) RETURNING id`;
    templateByWs[ws] = t.id;
    const [sec] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_sections (worksheet_template_id, code, title_de)
      VALUES (${t.id}, ${'S-' + ws}, ${'S-' + ws}) RETURNING id`;
    const [inst] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_instances (project_id, worksheet_template_id)
      VALUES (${proj.id}, ${t.id}) RETURNING id`;
    instances[ws] = inst.id;

    let oi = 1;
    for (const f of wsFields) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fields[f.symbol] = row.id;
      fieldMeta[f.symbol] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the block gates against their worksheet templates.
  for (const g of A178_BLOCK_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, 'block')`;
  }

  // Seed the demonstration equations on their home templates.
  const equationIds: Record<string, string> = {};
  for (const e of A178_EQUATIONS) {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO equations (worksheet_template_id, equation_number, formula, output_symbol)
      VALUES (${templateByWs[e.homeWs]}, ${e.num}, ${e.formula}, ${e.out}) RETURNING id`;
    equationIds[e.num] = row.id;
  }

  return {
    projectId: proj.id,
    userId,
    standardId: std.id,
    instances,
    fields,
    fieldMeta,
    equationIds,
  };
}
