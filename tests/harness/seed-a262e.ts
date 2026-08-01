/**
 * DWA-A-262E (Kläranlagen mit bepflanzten/unbepflanzten Filtern —
 * constructed wetlands / Pflanzenkläranlagen) — minimal fixture for the REAL
 * save-path execution-proof harness.
 *
 * PROOF MANDATE: A-262E's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 52 live BLOCK gates through the REAL
 * `saveWorksheet` (values persist to project_parameters) and the REAL
 * `checkApprovalGate` (the engineer-approve enforcement read path that replays
 * each block condition against the saved values). Each gate is demonstrated BOTH
 * ways — a state that PASSES it and a state that VIOLATES it, reaching a definite
 * `fail` — so a gate that fires but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology is pulled verbatim from prod (standard da886be2-…, this session, R-2):
 *   - 33 worksheet_templates; the fixture seeds the 22 that host a BLOCK gate,
 *     plus A262-04 (w_s_d cross-home) and A262-06 (a flagged warn gate).
 *   - Every symbol each block condition references is seeded as a field ON ITS
 *     REAL HOME WORKSHEET, so `checkApprovalGate`'s local-symbol + conflict-free
 *     project-wide fallback resolves cross-worksheet guards exactly as in prod.
 *   - Conditions are verbatim from prod compliance_requirements.
 *
 * CROSS-WORKSHEET FALLBACK is genuinely exercised by REQ-12 (host A262-25):
 *   `if wastewater_type == greywater_only then w_s_d >= 75`
 * NEITHER `wastewater_type` (home A262-02) NOR `w_s_d` (home A262-04) is a field
 * on A262-25, so both resolve via the project-wide fallback path — the same
 * mechanism A-201/A-178 cross-worksheet fields used.
 *
 * FLAG ITEMS also seeded as their real WARN severity (so checkApprovalGate's
 * block-only query correctly EXCLUDES them — demonstrating they never block):
 *   - REQ-13 (A262-25) `B_d_TKN <= B_A_TKN_zul` — the prior ES-1 "bare-symbol-RHS
 *     always-pass" flag. It is a WARN gate, and its `<=` ordering shape routes
 *     through the engine's numeric acompare path (evaluate.ts L252-256), so it
 *     genuinely enforces when driven directly — proven both ways in the test.
 *   - REQ-06 (A262-06) `f_S_QM >= 6 AND f_S_QM <= 9` — the "A262-06:6 malformed
 *     assignment-constraint fusion" flag. It is a WARN, well-formed range check;
 *     NOT a malformed block gate. Proven parseable+enforcing in the test.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 52 live BLOCK gates + 2 flagged WARN gates, grouped by worksheet,
 *  conditions + severities verbatim from prod. */
export const A262_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // A262-01
  { ws: 'A262-01', code: 'REQ-02a', cond: 'wastewater_significantly_different == False', sev: 'block' },
  { ws: 'A262-01', code: 'REQ-22', cond: 'climate_zone != "permafrost"', sev: 'block' },
  // A262-02
  { ws: 'A262-02', code: 'REQ-01', cond: 'system_size_category IN {small_wwts, municipal_wwtp}', sev: 'block' },
  // A262-05
  { ws: 'A262-05', code: 'REQ-03', cond: 'x_Q_max == 8', sev: 'block' },
  { ws: 'A262-05', code: 'REQ-05', cond: 'm_multiplier >= 1', sev: 'block' },
  // A262-06 (flag item — warn)
  { ws: 'A262-06', code: 'REQ-06', cond: 'f_S_QM >= 6 AND f_S_QM <= 9', sev: 'warn' },
  // A262-07
  { ws: 'A262-07', code: 'REQ-08', cond: 'pretreatment_selected != none', sev: 'block' },
  { ws: 'A262-07', code: 'REQ-30', cond: 'aufenthaltszeit >= 2', sev: 'block' },
  // A262-08
  { ws: 'A262-08', code: 'REQ-19eff-a', cond: 'effluent_BOD5_mg_l <= 40', sev: 'block' },
  { ws: 'A262-08', code: 'REQ-19eff-b', cond: 'effluent_COD_mg_l <= 150', sev: 'block' },
  { ws: 'A262-08', code: 'REQ-20', cond: 'IF nitrification_required == True THEN effluent_S_NH4_mg_l <= 10', sev: 'block' },
  { ws: 'A262-08', code: 'REQ-20b', cond: 'IF nitrification_required == True THEN effluent_temperature_C >= 12', sev: 'block' },
  // A262-10
  { ws: 'A262-10', code: 'REQ-09', cond: 'attest_a262_10_req_09 == True', sev: 'block' },
  { ws: 'A262-10', code: 'REQ-33', cond: 'IF filter_type == raw_wastewater_filter THEN f_A_F_CSB <= 100', sev: 'block' },
  { ws: 'A262-10', code: 'REQ-34', cond: 'IF filter_type == raw_wastewater_filter THEN q_F_T <= 250', sev: 'block' },
  { ws: 'A262-10', code: 'REQ-35', cond: 'IF filter_type == raw_wastewater_filter THEN q_Beschickung_Fo >= 10', sev: 'block' },
  { ws: 'A262-10', code: 'REQ-36', cond: 'IF filter_type == raw_wastewater_filter THEN h_Beschickung_Fo >= 20 AND h_Beschickung_Fo <= 50', sev: 'block' },
  // A262-11
  { ws: 'A262-11', code: 'REQ-40', cond: 'A_Fo_spez_VFS_KA >= 4', sev: 'block' },
  { ws: 'A262-11', code: 'REQ-41', cond: 'A_Fo_min_VFS_KA >= 16', sev: 'block' },
  // A262-12
  { ws: 'A262-12', code: 'REQ-50', cond: 'A_Fo1_spez >= 1', sev: 'block' },
  { ws: 'A262-12', code: 'REQ-51', cond: 'A_Fo2_spez >= 1', sev: 'block' },
  // A262-13
  { ws: 'A262-13', code: 'REQ-60', cond: 'A_Fo_spez_VFG_KA >= 1', sev: 'block' },
  { ws: 'A262-13', code: 'REQ-61', cond: 'A_Fo_min_VFG_KA >= 4', sev: 'block' },
  // A262-14
  { ws: 'A262-14', code: 'REQ-70', cond: 'A_Fu_spez >= 1', sev: 'block' },
  { ws: 'A262-14', code: 'REQ-71', cond: 'A_Fu_min >= 4', sev: 'block' },
  // A262-15
  { ws: 'A262-15', code: 'REQ-81', cond: 'l_Rieselr >= 6', sev: 'block' },
  { ws: 'A262-15', code: 'REQ-82', cond: 'L_Rieselr <= 18', sev: 'block' },
  { ws: 'A262-15', code: 'REQ-83', cond: 'B_FGR >= 0.5', sev: 'block' },
  { ws: 'A262-15', code: 'REQ-84', cond: 'h_Beschickung_Fu >= 20', sev: 'block' },
  // A262-16
  { ws: 'A262-16', code: 'REQ-90', cond: 'A_F_spez_HFK_KA >= 1', sev: 'block' },
  { ws: 'A262-16', code: 'REQ-91', cond: 'f_A_ANF_CSB <= 200', sev: 'block' },
  { ws: 'A262-16', code: 'REQ-92', cond: 'L_HF_min >= 2', sev: 'block' },
  // A262-18
  { ws: 'A262-18', code: 'REQ-10', cond: 'attest_a262_18_req_10 == True', sev: 'block' },
  { ws: 'A262-18', code: 'REQ-103', cond: 'f_A_F_CSB_KomKA_in <= 20', sev: 'block' },
  { ws: 'A262-18', code: 'REQ-104', cond: 'q_F_T_KomKA_in <= 80', sev: 'block' },
  // A262-19
  { ws: 'A262-19', code: 'REQ-101', cond: 'f_A_F_CSB_Betrieb <= 27', sev: 'block' },
  { ws: 'A262-19', code: 'REQ-102', cond: 't_Sicker_min_aM >= 6', sev: 'block' },
  // A262-20
  { ws: 'A262-20', code: 'REQ-110', cond: 'A_Fo1_spez_KomKA >= 1', sev: 'block' },
  { ws: 'A262-20', code: 'REQ-111', cond: 'A_Fo2_spez_KomKA >= 1', sev: 'block' },
  { ws: 'A262-20', code: 'REQ-112', cond: 'f_A_F01_CSB <= 80', sev: 'block' },
  // A262-22
  { ws: 'A262-22', code: 'REQ-130', cond: 'A_Fu_spez_VFK_KomKA >= 1', sev: 'block' },
  { ws: 'A262-22', code: 'REQ-131', cond: 'f_V_CSB_VFK_KomKA <= 100', sev: 'block' },
  // A262-23
  { ws: 'A262-23', code: 'REQ-141', cond: 'q_F_T_Betrieb <= 240', sev: 'block' },
  { ws: 'A262-23', code: 'REQ-142', cond: 'q_AWF_aM <= 500', sev: 'block' },
  // A262-25
  { ws: 'A262-25', code: 'REQ-11', cond: 'f_red >= 0.5', sev: 'block' },
  { ws: 'A262-25', code: 'REQ-11b', cond: 't_Reg <= 6', sev: 'block' },
  { ws: 'A262-25', code: 'REQ-12', cond: 'if wastewater_type == greywater_only then w_s_d >= 75', sev: 'block' },
  { ws: 'A262-25', code: 'REQ-13', cond: 'B_d_TKN <= B_A_TKN_zul', sev: 'warn' }, // flag item
  // A262-26
  { ws: 'A262-26', code: 'REQ-02c', cond: 'Q_GW_taeglich >= 75', sev: 'block' },
  // A262-27
  { ws: 'A262-27', code: 'REQ-150', cond: 'f_A_Fu_CSB <= 16', sev: 'block' },
  // A262-29
  { ws: 'A262-29', code: 'REQ-15', cond: 'fines_fraction <= 2', sev: 'block' },
  { ws: 'A262-29', code: 'REQ-17', cond: 'IF lining_type IN {mineral_seal_clay, unsealed_subsoil} THEN k_f_subsoil_m_s <= 1e-8', sev: 'block' },
  { ws: 'A262-29', code: 'REQ-18a', cond: 'IF lining_type == geomembrane THEN geomembrane_thickness_mm >= 1.5', sev: 'block' },
  // A262-32
  { ws: 'A262-32', code: 'REQ-21', cond: 'maintenance_plan_documented == True', sev: 'block' },
] as const;

/**
 * Fields to seed per worksheet — each gate symbol on its REAL home worksheet
 * (symbol + data_type verbatim from prod). A262-02 also carries wastewater_type
 * and A262-04 carries w_s_d so REQ-12's cross-worksheet guard resolves via the
 * project-wide fallback exactly as in the deployed app.
 */
export const A262_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'A262-01': [
    { symbol: 'wastewater_significantly_different', dataType: 'boolean' },
    { symbol: 'climate_zone', dataType: 'enum' },
  ],
  'A262-02': [
    { symbol: 'system_size_category', dataType: 'enum' },
    { symbol: 'wastewater_type', dataType: 'enum' }, // REQ-12 cross-worksheet guard
  ],
  'A262-04': [
    { symbol: 'w_s_d', dataType: 'number' }, // REQ-12 cross-worksheet consequent (home A262-04)
  ],
  'A262-05': [
    { symbol: 'x_Q_max', dataType: 'number' },
    { symbol: 'm_multiplier', dataType: 'number' },
  ],
  'A262-06': [
    { symbol: 'f_S_QM', dataType: 'number' }, // REQ-06 flag item
  ],
  'A262-07': [
    { symbol: 'pretreatment_selected', dataType: 'enum' },
    { symbol: 'aufenthaltszeit', dataType: 'number' },
  ],
  'A262-08': [
    { symbol: 'effluent_BOD5_mg_l', dataType: 'number' },
    { symbol: 'effluent_COD_mg_l', dataType: 'number' },
    { symbol: 'effluent_S_NH4_mg_l', dataType: 'number' },
    { symbol: 'effluent_temperature_C', dataType: 'number' },
    { symbol: 'nitrification_required', dataType: 'boolean' },
  ],
  'A262-10': [
    { symbol: 'filter_type', dataType: 'enum' },
    { symbol: 'f_A_F_CSB', dataType: 'number' },
    { symbol: 'q_F_T', dataType: 'number' },
    { symbol: 'q_Beschickung_Fo', dataType: 'number' },
    { symbol: 'h_Beschickung_Fo', dataType: 'number' },
    { symbol: 'attest_a262_10_req_09', dataType: 'boolean' },
  ],
  'A262-11': [
    { symbol: 'A_Fo_spez_VFS_KA', dataType: 'number' },
    { symbol: 'A_Fo_min_VFS_KA', dataType: 'number' },
  ],
  'A262-12': [
    { symbol: 'A_Fo1_spez', dataType: 'number' },
    { symbol: 'A_Fo2_spez', dataType: 'number' },
  ],
  'A262-13': [
    { symbol: 'A_Fo_spez_VFG_KA', dataType: 'number' },
    { symbol: 'A_Fo_min_VFG_KA', dataType: 'number' },
  ],
  'A262-14': [
    { symbol: 'A_Fu_spez', dataType: 'number' },
    { symbol: 'A_Fu_min', dataType: 'number' },
  ],
  'A262-15': [
    { symbol: 'l_Rieselr', dataType: 'number' },
    { symbol: 'L_Rieselr', dataType: 'number' },
    { symbol: 'B_FGR', dataType: 'number' },
    { symbol: 'h_Beschickung_Fu', dataType: 'number' },
  ],
  'A262-16': [
    { symbol: 'A_F_spez_HFK_KA', dataType: 'number' },
    { symbol: 'f_A_ANF_CSB', dataType: 'number' },
    { symbol: 'L_HF_min', dataType: 'number' },
  ],
  'A262-18': [
    { symbol: 'attest_a262_18_req_10', dataType: 'boolean' },
    { symbol: 'f_A_F_CSB_KomKA_in', dataType: 'number' },
    { symbol: 'q_F_T_KomKA_in', dataType: 'number' },
  ],
  'A262-19': [
    { symbol: 'f_A_F_CSB_Betrieb', dataType: 'number' },
    { symbol: 't_Sicker_min_aM', dataType: 'number' },
  ],
  'A262-20': [
    { symbol: 'A_Fo1_spez_KomKA', dataType: 'number' },
    { symbol: 'A_Fo2_spez_KomKA', dataType: 'number' },
    { symbol: 'f_A_F01_CSB', dataType: 'number' },
  ],
  'A262-22': [
    { symbol: 'A_Fu_spez_VFK_KomKA', dataType: 'number' },
    { symbol: 'f_V_CSB_VFK_KomKA', dataType: 'number' },
  ],
  'A262-23': [
    { symbol: 'q_F_T_Betrieb', dataType: 'number' },
    { symbol: 'q_AWF_aM', dataType: 'number' },
  ],
  'A262-25': [
    { symbol: 'f_red', dataType: 'number' },
    { symbol: 't_Reg', dataType: 'number' },
    { symbol: 'B_d_TKN', dataType: 'number' },     // REQ-13 flag item
    { symbol: 'B_A_TKN_zul', dataType: 'number' }, // REQ-13 flag item
  ],
  'A262-26': [
    { symbol: 'Q_GW_taeglich', dataType: 'number' },
  ],
  'A262-27': [
    { symbol: 'f_A_Fu_CSB', dataType: 'number' },
  ],
  'A262-29': [
    { symbol: 'fines_fraction', dataType: 'number' },
    { symbol: 'lining_type', dataType: 'enum' },
    { symbol: 'k_f_subsoil_m_s', dataType: 'number' },
    { symbol: 'geomembrane_thickness_mm', dataType: 'number' },
  ],
  'A262-32': [
    { symbol: 'maintenance_plan_documented', dataType: 'boolean' },
  ],
};

export type A262Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** symbol → field id */
  fields: Record<string, string>;
  /** symbol → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
};

export async function seedA262(sql: postgres.Sql, userId: string): Promise<A262Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'a262-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('A262 Harness Org', ${'a262-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'A262-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-A-262E', 'DWA-A 262E (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const [ws, wsFields] of Object.entries(A262_FIELDS)) {
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

  // Seed the gates (block + the 2 flagged warn) against their worksheet templates.
  for (const g of A262_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return {
    projectId: proj.id,
    userId,
    standardId: std.id,
    instances,
    fields,
    fieldMeta,
  };
}
