/**
 * DWA-M-708 (Abwasser aus der Milchverarbeitung, Gelbdruck 2025) — minimal
 * fixture for the REAL save-path execution-proof harness.
 *
 * PROOF MANDATE: M-708's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 12 live BLOCK gates (non-empty condition)
 * through the REAL `saveWorksheet` (values persist to project_parameters) and
 * the REAL `checkApprovalGate` (the engineer-approve enforcement read path that
 * replays each block condition against the saved values). Each gate is
 * demonstrated BOTH ways — a state that PASSES it and a state that VIOLATES it,
 * reaching a definite `fail` — so a gate that fires but never enforces (the F-4
 * lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard DWA-M-708, this session):
 *   - 27 worksheet_templates (M708-01 … M708-27); the fixture seeds the 7 that
 *     host or supply a BLOCK gate: M708-01, M708-02, M708-04, M708-06, M708-11,
 *     M708-12, M708-25. Symbols + data_types verbatim from prod fields.
 *   - Conditions are verbatim from prod compliance_requirements.
 *
 * CROSS-WORKSHEET FALLBACK (the load-bearing topology here): the M708-06
 * Direkteinleitung gates compare measured concentrations against limits, but the
 * concentrations (c_bsb5, c_csb, afs, c_nh4_n, c_n_ges, c_p, ph_wert) are fields
 * on M708-04 and the trigger flag `ied_anlage` is a field on M708-02 — NOT on
 * M708-06 where the gate lives. checkApprovalGate resolves those non-local
 * symbols through the conflict-free project-wide fallback. The fixture seeds each
 * symbol on its REAL prod home worksheet so the fallback resolver is exercised
 * exactly as in prod. The limits + roh-load triggers (limit_*_direkt,
 * bsb5_roh_je_tag, nges_roh, pges_roh) are M708-06-local.
 *
 * WARN gates REQ-708-08 / REQ-708-09 (M708-12) carry an EMPTY condition and
 * severity='warn' — checkApprovalGate loads only severity='block', so they are
 * not driven (nothing to enforce). Recorded as residue, not seeded.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 12 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const M708_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M708-01 Anlagenregistrierung — existence AND (number + 2 enums)
  { ws: 'M708-01', code: 'REQ-708-06', cond: 'eingehende_milchmenge IS NOT NULL AND einleitungsart IS NOT NULL AND haupterzeugnis IS NOT NULL', sev: 'block' },
  // M708-02 Genehmigungsrechtliche Einordnung — NOT/OR boolean logic
  { ws: 'M708-02', code: 'REQ-708-12', cond: '(NOT wasserwiederverwendung_geplant) OR wasserwiederverwendung_genehmigung', sev: 'block' },
  { ws: 'M708-02', code: 'REQ-708-13', cond: '(NOT awsv_anwendbar) OR (awsv_anzeige_eingereicht AND eignungsfeststellung_vorliegend)', sev: 'block' },
  { ws: 'M708-02', code: 'REQ-708-14', cond: '(NOT bimschv_12_schwelle_ueberschritten) OR stoerfall_klasse_eingeordnet', sev: 'block' },
  // M708-06 Direkteinleitung — cross-worksheet ordering compares (c_* on M708-04, limit_* local)
  { ws: 'M708-06', code: 'REQ-708-01', cond: 'c_bsb5 <= limit_bsb5_direkt AND c_csb <= limit_csb_direkt AND afs <= limit_afs_direkt AND c_nh4_n <= limit_nh4_n_direkt AND c_n_ges <= limit_nges_direkt AND c_p <= limit_pges_direkt AND ph_wert <= limit_ph_direkt', sev: 'block' },
  { ws: 'M708-06', code: 'REQ-708-02', cond: 'IF bsb5_roh_je_tag >= 3 THEN c_bsb5 <= limit_bsb5_direkt', sev: 'block' },
  { ws: 'M708-06', code: 'REQ-708-03', cond: 'IF ied_anlage OR nges_roh > 100 THEN c_n_ges <= limit_nges_direkt AND c_nh4_n <= limit_nh4_n_direkt', sev: 'block' },
  { ws: 'M708-06', code: 'REQ-708-04', cond: 'IF ied_anlage OR pges_roh > 20 THEN c_p <= limit_pges_direkt', sev: 'block' },
  // M708-11 Energie/Abluft — guarded AND on dust
  { ws: 'M708-11', code: 'REQ-708-07', cond: 'IF staub_massenstrom > 0.4 THEN staub_konzentration <= 10 AND staub_konzentration_trocknung <= 10', sev: 'block' },
  // M708-12 Vorbehandlung — attestation
  { ws: 'M708-12', code: 'REQ-708-10', cond: 'attest_m708_12_req_708_10 == True', sev: 'block' },
  // M708-25 Selbstueberwachung — existence (text IS NOT EMPTY + enum IS NOT NULL) & attestation
  { ws: 'M708-25', code: 'REQ-708-05', cond: 'ueberwachung_haeufigkeit IS NOT EMPTY AND probenahmestellen IS NOT EMPTY AND ablauf_konformitaet IS NOT NULL', sev: 'block' },
  { ws: 'M708-25', code: 'REQ-708-11', cond: 'attest_m708_25_req_708_11 == True', sev: 'block' },
] as const;

/**
 * Fields to seed per worksheet — each gate symbol on its REAL home worksheet
 * (symbol + data_type verbatim from prod). c_* + ph_wert + afs live on M708-04;
 * ied_anlage lives on M708-02; the M708-06 gates read them via the project-wide
 * fallback. limit_*_direkt + the roh-load triggers are M708-06-local.
 */
export const M708_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'M708-01': [
    { symbol: 'eingehende_milchmenge', dataType: 'number' },
    { symbol: 'einleitungsart', dataType: 'enum' },
    { symbol: 'haupterzeugnis', dataType: 'enum' },
  ],
  'M708-02': [
    { symbol: 'wasserwiederverwendung_geplant', dataType: 'boolean' },
    { symbol: 'wasserwiederverwendung_genehmigung', dataType: 'boolean' },
    { symbol: 'awsv_anwendbar', dataType: 'boolean' },
    { symbol: 'awsv_anzeige_eingereicht', dataType: 'boolean' },
    { symbol: 'eignungsfeststellung_vorliegend', dataType: 'boolean' },
    { symbol: 'bimschv_12_schwelle_ueberschritten', dataType: 'boolean' },
    { symbol: 'stoerfall_klasse_eingeordnet', dataType: 'boolean' },
    { symbol: 'ied_anlage', dataType: 'boolean' },
  ],
  'M708-04': [
    { symbol: 'c_bsb5', dataType: 'number' },
    { symbol: 'c_csb', dataType: 'number' },
    { symbol: 'afs', dataType: 'number' },
    { symbol: 'c_nh4_n', dataType: 'number' },
    { symbol: 'c_n_ges', dataType: 'number' },
    { symbol: 'c_p', dataType: 'number' },
    { symbol: 'ph_wert', dataType: 'number' },
  ],
  'M708-06': [
    { symbol: 'limit_bsb5_direkt', dataType: 'number' },
    { symbol: 'limit_csb_direkt', dataType: 'number' },
    { symbol: 'limit_afs_direkt', dataType: 'number' },
    { symbol: 'limit_nh4_n_direkt', dataType: 'number' },
    { symbol: 'limit_nges_direkt', dataType: 'number' },
    { symbol: 'limit_pges_direkt', dataType: 'number' },
    { symbol: 'limit_ph_direkt', dataType: 'number' },
    { symbol: 'bsb5_roh_je_tag', dataType: 'number' },
    { symbol: 'nges_roh', dataType: 'number' },
    { symbol: 'pges_roh', dataType: 'number' },
  ],
  'M708-11': [
    { symbol: 'staub_massenstrom', dataType: 'number' },
    { symbol: 'staub_konzentration', dataType: 'number' },
    { symbol: 'staub_konzentration_trocknung', dataType: 'number' },
  ],
  'M708-12': [
    { symbol: 'attest_m708_12_req_708_10', dataType: 'boolean' },
  ],
  'M708-25': [
    { symbol: 'ueberwachung_haeufigkeit', dataType: 'text' },
    { symbol: 'probenahmestellen', dataType: 'text' },
    { symbol: 'ablauf_konformitaet', dataType: 'enum' },
    { symbol: 'attest_m708_25_req_708_11', dataType: 'boolean' },
  ],
};

export type M708Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** "ws:symbol" → field id */
  fields: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
};

export async function seedM708(sql: postgres.Sql, userId: string): Promise<M708Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm708-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M708 Harness Org', ${'m708-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M708-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-708', 'DWA-M 708 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const [ws, wsFields] of Object.entries(M708_FIELDS)) {
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
      fields[`${ws}:${f.symbol}`] = row.id;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the gates against their home worksheet templates.
  for (const g of M708_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
