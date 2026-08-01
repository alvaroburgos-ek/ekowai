/**
 * DWA-A-201 (Abwasserteiche / biological pond treatment) — minimal fixture for
 * the REAL save-path execution-proof harness.
 *
 * PROOF MANDATE: A-201's "runnable" is claimable ONLY by EXECUTION. This fixture
 * drives the standard's 10 live BLOCK gates through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition against
 * the saved values). Each gate is demonstrated BOTH ways — a state that PASSES it
 * and a state that VIOLATES it, reaching a definite `fail` — so a gate that fires
 * but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology is pulled verbatim from prod (standard 353e4f03-…, this session, R-2):
 *   - 21 worksheet_templates; the fixture seeds the 13 that host a gate symbol or a
 *     gate. Every symbol each block condition references is seeded as a field ON ITS
 *     REAL HOME WORKSHEET, so `checkApprovalGate`'s local-symbol + conflict-free
 *     project-wide fallback resolves cross-worksheet guards exactly as the deployed
 *     app does.
 *   - Conditions are verbatim from prod compliance_requirements.
 *
 * CROSS-WORKSHEET FALLBACK is genuinely exercised. Notably CR-006 (host A201-08)
 * references absetz_vorstufe (home A201-02) AND A_EW_unbelueftet (home A201-10) —
 * NEITHER is a field on the gate's own worksheet, so both resolve via the
 * project-wide fallback path (approval-gate.ts makeGateLookup), the same mechanism
 * A-178's cross-worksheet fields used.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

/** The 10 live BLOCK gates, grouped by worksheet, conditions verbatim from prod. */
export const A201_BLOCK_GATES = [
  { ws: 'A201-01', code: 'CR-001', cond: 'abwasser_typ IN {haeuslich, gewerblich_vergleichbar}' },
  { ws: 'A201-05', code: 'CR-002', cond: 'EW_BSB5 <= 5000' },
  { ws: 'A201-08', code: 'CR-004', cond: 'V_erf_grobstoff >= Q_M * t_R_M and t_R_M == 0.5' },
  { ws: 'A201-08', code: 'CR-006', cond: '(IF absetz_vorstufe == true THEN A_EW_unbelueftet >= 8) AND (IF absetz_vorstufe == false THEN A_EW_unbelueftet >= 10)' },
  { ws: 'A201-09', code: 'CR-005', cond: 'V_EW_absetz>=0.5 and V_schlammraum_absetz>=0.15 and t_R_absetz>=1 and v_strom_absetz<=0.05' },
  { ws: 'A201-11', code: 'CR-007', cond: 'B_R_BSB <= 25 AND t_R_belueftet >= 5 AND OV_C_BSB >= 1.5 AND P_R >= 1 AND P_R <= 3' },
  { ws: 'A201-12', code: 'CR-008', cond: 't_R_nachklaer>=1 and A_min_nachklaer>=20 and h_nachklaer>=1.2' },
  { ws: 'A201-15', code: 'CR-010', cond: 'IF (k_f_boden >= k_f_sealing_threshold OR klueftiger_untergrund == true) THEN dichtung_erforderlich == true' },
  { ws: 'A201-19', code: 'CR-013', cond: 'min_wasser_ueber_schlamm_absetz >= 1.0 and min_wasser_ueber_schlamm_nachklaer >= 0.9' },
  { ws: 'A201-20', code: 'CR-014', cond: 'BSB5_ablauf <= BSB5_grenzwert AND CSB_ablauf <= CSB_grenzwert' },
] as const;

/**
 * Fields to seed per worksheet — each gate symbol on its REAL home worksheet
 * (symbol + data_type verbatim from prod). Worksheets that host a gate symbol but
 * no gate (A201-02, A201-04, A201-06, A201-10) still get seeded so their symbols
 * resolve via the project-wide fallback, exactly as in the deployed app.
 */
export const A201_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'A201-01': [
    { symbol: 'abwasser_typ', dataType: 'enum' },
    { symbol: 'BSB5_grenzwert', dataType: 'number' },
    { symbol: 'CSB_grenzwert', dataType: 'number' },
  ],
  'A201-02': [{ symbol: 'absetz_vorstufe', dataType: 'boolean' }],
  'A201-04': [{ symbol: 'Q_M', dataType: 'number' }],
  'A201-05': [{ symbol: 'EW_BSB5', dataType: 'number' }],
  'A201-06': [
    { symbol: 'k_f_boden', dataType: 'number' },
    { symbol: 'klueftiger_untergrund', dataType: 'boolean' },
  ],
  'A201-08': [
    { symbol: 't_R_M', dataType: 'number' },
    { symbol: 'V_erf_grobstoff', dataType: 'number' },
  ],
  'A201-09': [
    { symbol: 'V_EW_absetz', dataType: 'number' },
    { symbol: 'V_schlammraum_absetz', dataType: 'number' },
    { symbol: 't_R_absetz', dataType: 'number' },
    { symbol: 'v_strom_absetz', dataType: 'number' },
  ],
  'A201-10': [{ symbol: 'A_EW_unbelueftet', dataType: 'number' }],
  'A201-11': [
    { symbol: 'B_R_BSB', dataType: 'number' },
    { symbol: 't_R_belueftet', dataType: 'number' },
    { symbol: 'OV_C_BSB', dataType: 'number' },
    { symbol: 'P_R', dataType: 'number' },
  ],
  'A201-12': [
    { symbol: 't_R_nachklaer', dataType: 'number' },
    { symbol: 'A_min_nachklaer', dataType: 'number' },
    { symbol: 'h_nachklaer', dataType: 'number' },
  ],
  'A201-15': [
    { symbol: 'k_f_sealing_threshold', dataType: 'number' },
    { symbol: 'dichtung_erforderlich', dataType: 'boolean' },
  ],
  'A201-19': [
    { symbol: 'min_wasser_ueber_schlamm_absetz', dataType: 'number' },
    { symbol: 'min_wasser_ueber_schlamm_nachklaer', dataType: 'number' },
  ],
  'A201-20': [
    { symbol: 'BSB5_ablauf', dataType: 'number' },
    { symbol: 'CSB_ablauf', dataType: 'number' },
  ],
};

export type A201Fixture = {
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

export async function seedA201(sql: postgres.Sql, userId: string): Promise<A201Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'a201-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('A201 Harness Org', ${'a201-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'A201-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-A-201', 'DWA-A 201 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const [ws, wsFields] of Object.entries(A201_FIELDS)) {
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
  for (const g of A201_BLOCK_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, 'block')`;
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
