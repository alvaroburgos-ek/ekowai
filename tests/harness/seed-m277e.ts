/**
 * DWA-M-277E (Merkblatt DWA-M 277 — Hinweise zur Auslegung von Anlagen zur
 * Behandlung und Nutzung von Grauwasser und Grauwasserteilströmen; English
 * Edition, October 2017) — minimal fixture for the REAL save-path
 * gate-execution-proof harness.
 *
 * PROOF MANDATE: M-277E's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's live BLOCK gates (every compliance_requirement with
 * severity='block' + a non-empty condition) through the REAL `saveWorksheet` (values
 * persist to project_parameters) and the REAL `checkApprovalGate` (the engineer-approve
 * enforcement read path that replays each block condition against the saved values).
 * Each gate is demonstrated BOTH ways — a state that PASSES it and a state that
 * VIOLATES it, reaching a definite `fail` — so a gate that fires but never enforces
 * (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard DWA-M-277E =
 * 4ed1a6f6-52c0-40af-aed2-61b1bfacd8d2, project vadsmshzebefjreqcicl, this session):
 *   - 24 worksheet_templates (M277E-01 … M277E-24); 198 active fields; 22 equations;
 *     62 compliance_requirements — 49 severity='block' with a non-empty condition.
 *   - The fixture seeds the 12 worksheets that host a live BLOCK gate OR a gate
 *     symbol's single home: M277E-01,02,03,04,06,07,08,09,10,11,14,23.
 *
 * SINGLE-HOME TOPOLOGY (load-bearing — mirrors prod's cross-worksheet fallback):
 *   In prod most gate symbols live on TWO worksheets (e.g. `quality_category` on
 *   M277E-04 AND M277E-14; `Q_GW` on M277E-07 AND M277E-17). To exercise the
 *   conflict-free project-wide fallback (approval-gate.ts buildFallbackValues /
 *   makeGateLookup) faithfully AND avoid fallback conflicts, each symbol is seeded
 *   exactly ONCE, on the SYMBOL_HOME worksheet below. A gate on the symbol's home
 *   resolves it locally; a gate on any OTHER worksheet resolves it via fallback —
 *   e.g. the guarded gates `IF quality_category == C2 THEN …` on M277E-10/23 read
 *   `quality_category` (home M277E-14) via fallback, and REQ-07 on M277E-14 reads
 *   Q_WB/Q_GW/Q_SW (homes M277E-08/07/06) entirely via fallback. Conditions are
 *   verbatim from prod; nothing is applied to prod.
 *
 * DUPLICATE CODES are real prod state and are BOTH driven, never de-duped:
 *   - same-worksheet condition-identical pairs: REQ-02/REQ-02-2 (M277E-02),
 *     REQ-11/REQ-11-2 (M277E-08), REQ-10/REQ-10-2 (M277E-10), REQ-13/REQ-13-2
 *     (M277E-11), REQ-32/REQ-32-2 (M277E-04), and the REQ-12/-16/-17/-18/-26/-27
 *     True/true variant pairs on M277E-09.
 *   - same-code / different-worksheet / DIFFERENT-condition: REQ-03 (M277E-02 vs 14),
 *     REQ-07 (M277E-06 vs 14), REQ-24 (M277E-03 attest vs M277E-04 DIN flag),
 *     REQ-30 (M277E-03 vs 06), REQ-08/09/14/15/23/25 (M277E-10 vs 23),
 *     REQ-20/22 (M277E-10 attest vs M277E-11 real-symbol). checkApprovalGate scopes
 *     each to its own worksheet, so all are driven independently.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum';

/** Single home worksheet per gate symbol (verbatim data_type from prod fields). */
export const SYMBOL_HOME: Record<string, { ws: string; dataType: DType }> = {
  // M277E-01 project registration / MBO threshold
  storage_capacity_m3: { ws: 'M277E-01', dataType: 'number' },
  MBO_notification_only: { ws: 'M277E-01', dataType: 'boolean' },
  MBO_authorisation_required: { ws: 'M277E-01', dataType: 'boolean' },
  building_type: { ws: 'M277E-01', dataType: 'enum' },
  // M277E-02 classification
  greywater_type: { ws: 'M277E-02', dataType: 'enum' },
  // M277E-14 quality-category decision (fallback source for the guard gates)
  quality_category: { ws: 'M277E-14', dataType: 'enum' },
  // M277E-03 NASS attestation
  attest_m277e_03_req_24: { ws: 'M277E-03', dataType: 'boolean' },
  // M277E-04 legal-framework inputs
  DIN_19650_class_documented: { ws: 'M277E-04', dataType: 'boolean' },
  use_category: { ws: 'M277E-04', dataType: 'enum' },
  // water-balance chain
  Q_SW: { ws: 'M277E-06', dataType: 'number' },
  Q_GW: { ws: 'M277E-07', dataType: 'number' },
  Q_WB: { ws: 'M277E-08', dataType: 'number' },
  BOD5: { ws: 'M277E-08', dataType: 'number' },
  pH_value: { ws: 'M277E-08', dataType: 'number' },
  // M277E-09 components / backfeed / labelling
  drinking_water_option_available: { ws: 'M277E-09', dataType: 'boolean' },
  automatic_backfeed_present: { ws: 'M277E-09', dataType: 'boolean' },
  network_separation_per_DIN_EN_1717: { ws: 'M277E-09', dataType: 'boolean' },
  service_water_labelled: { ws: 'M277E-09', dataType: 'boolean' },
  service_water_isolated_from_drinking_water: { ws: 'M277E-09', dataType: 'boolean' },
  installation_frost_free: { ws: 'M277E-09', dataType: 'boolean' },
  auto_switch_to_backfeed: { ws: 'M277E-09', dataType: 'boolean' },
  auto_fault_report: { ws: 'M277E-09', dataType: 'boolean' },
  attest_m277e_09_req_26: { ws: 'M277E-09', dataType: 'boolean' },
  attest_m277e_09_req_27: { ws: 'M277E-09', dataType: 'boolean' },
  // M277E-10 treated-water quality (Table 4) + handover
  turbidity_NTU: { ws: 'M277E-10', dataType: 'number' },
  o2_saturation_pct: { ws: 'M277E-10', dataType: 'number' },
  total_coliforms_treated: { ws: 'M277E-10', dataType: 'number' },
  p_aeruginosa: { ws: 'M277E-10', dataType: 'number' },
  attest_m277e_10_req_20: { ws: 'M277E-10', dataType: 'boolean' },
  attest_m277e_10_req_22: { ws: 'M277E-10', dataType: 'boolean' },
  discharge_into_water_body: { ws: 'M277E-10', dataType: 'boolean' },
  WHG_permit_present: { ws: 'M277E-10', dataType: 'boolean' },
  attest_m277e_10_req_25: { ws: 'M277E-10', dataType: 'boolean' },
  // M277E-11 commissioning / handover
  authority_notification_sent: { ws: 'M277E-11', dataType: 'boolean' },
  handover_certificate_present: { ws: 'M277E-11', dataType: 'boolean' },
  user_manual_handed_over: { ws: 'M277E-11', dataType: 'boolean' },
  maintenance_contract_present: { ws: 'M277E-11', dataType: 'boolean' },
  // M277E-23 operation attestation
  attest_m277e_23_req_25: { ws: 'M277E-23', dataType: 'boolean' },
};

/** Worksheets that must exist as instances (gate homes + field homes). */
export const M277E_WORKSHEETS = [
  'M277E-01', 'M277E-02', 'M277E-03', 'M277E-04', 'M277E-06', 'M277E-07',
  'M277E-08', 'M277E-09', 'M277E-10', 'M277E-11', 'M277E-14', 'M277E-23',
] as const;

/** All 49 live BLOCK gates (non-empty condition), verbatim from prod
 *  compliance_requirements (worksheet_template.code, code, condition). */
export const M277E_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M277E-01 Projekt-Registrierung & Geltungsbereich — MBO 50 m³ authorisation threshold
  { ws: 'M277E-01', code: 'REQ-29', cond: '(storage_capacity_m3 <= 50 AND MBO_notification_only == true) OR (storage_capacity_m3 > 50 AND MBO_authorisation_required == true)', sev: 'block' },
  // M277E-02 Begriffe & Symbole — greywater type + quality category
  { ws: 'M277E-02', code: 'REQ-02', cond: 'greywater_type IN {A1, A2, B1, B2}', sev: 'block' },
  { ws: 'M277E-02', code: 'REQ-02-2', cond: 'greywater_type IN {A1, A2, B1, B2}', sev: 'block' },
  { ws: 'M277E-02', code: 'REQ-03', cond: '(quality_category == C1 AND greywater_type IN {A1, A2}) OR quality_category == C2', sev: 'block' },
  // M277E-03 Einordnung in NASS
  { ws: 'M277E-03', code: 'REQ-24', cond: 'attest_m277e_03_req_24 == True', sev: 'block' },
  { ws: 'M277E-03', code: 'REQ-30', cond: 'IF building_type == rented_apartment THEN drinking_water_option_available == true', sev: 'block' },
  // M277E-04 Rechtsrahmen — Table 4 limits + DIN 19650 + laundry
  { ws: 'M277E-04', code: 'REQ-09', cond: 'IF quality_category == C2 THEN BOD5 < 5', sev: 'block' },
  { ws: 'M277E-04', code: 'REQ-24', cond: 'DIN_19650_class_documented == true', sev: 'block' },
  { ws: 'M277E-04', code: 'REQ-32', cond: 'IF use_category == laundry_private THEN quality_category == C2', sev: 'block' },
  { ws: 'M277E-04', code: 'REQ-32-2', cond: 'IF use_category == laundry_private THEN quality_category == C2', sev: 'block' },
  // M277E-06 Grauwasser-Quellenklassifikation — water balance + tenant option
  { ws: 'M277E-06', code: 'REQ-07', cond: 'Q_WB == (Q_GW - Q_SW)', sev: 'block' },
  { ws: 'M277E-06', code: 'REQ-30', cond: 'IF building_type == rented_apartment THEN drinking_water_option_available == true', sev: 'block' },
  // M277E-08 Grauwasser-Qualitätsdaten — pH range (Table 4)
  { ws: 'M277E-08', code: 'REQ-11', cond: 'pH_value >= 6.5 AND pH_value <= 9.5', sev: 'block' },
  { ws: 'M277E-08', code: 'REQ-11-2', cond: 'pH_value >= 6.5 AND pH_value <= 9.5', sev: 'block' },
  // M277E-09 Mikrobiologische Belastung & Annex B — backfeed / separation / labelling / frost
  { ws: 'M277E-09', code: 'REQ-12', cond: 'automatic_backfeed_present == True', sev: 'block' },
  { ws: 'M277E-09', code: 'REQ-12-2', cond: 'automatic_backfeed_present == true', sev: 'block' },
  { ws: 'M277E-09', code: 'REQ-16', cond: 'network_separation_per_DIN_EN_1717 == True', sev: 'block' },
  { ws: 'M277E-09', code: 'REQ-16-2', cond: 'network_separation_per_DIN_EN_1717 == true', sev: 'block' },
  { ws: 'M277E-09', code: 'REQ-17', cond: 'service_water_labelled == True AND service_water_isolated_from_drinking_water == True', sev: 'block' },
  { ws: 'M277E-09', code: 'REQ-17-2', cond: 'service_water_labelled == true AND service_water_isolated_from_drinking_water == true', sev: 'block' },
  { ws: 'M277E-09', code: 'REQ-18', cond: 'installation_frost_free == True', sev: 'block' },
  { ws: 'M277E-09', code: 'REQ-18-2', cond: 'installation_frost_free == true', sev: 'block' },
  { ws: 'M277E-09', code: 'REQ-21-2', cond: 'auto_switch_to_backfeed == true AND auto_fault_report == true', sev: 'block' },
  { ws: 'M277E-09', code: 'REQ-26', cond: 'attest_m277e_09_req_26 == True', sev: 'block' },
  { ws: 'M277E-09', code: 'REQ-26-2', cond: 'automatic_backfeed_present == true', sev: 'block' },
  { ws: 'M277E-09', code: 'REQ-27', cond: 'attest_m277e_09_req_27 == True', sev: 'block' },
  { ws: 'M277E-09', code: 'REQ-27-2', cond: 'automatic_backfeed_present == true', sev: 'block' },
  { ws: 'M277E-09', code: 'REQ-28-2', cond: 'auto_switch_to_backfeed == true', sev: 'block' },
  // M277E-10 Nutzungsart Toilettenspülung — Table 4 numeric limits + handover + discharge
  { ws: 'M277E-10', code: 'REQ-08', cond: 'IF quality_category == C2 THEN turbidity_NTU < 2', sev: 'block' },
  { ws: 'M277E-10', code: 'REQ-10', cond: 'o2_saturation_pct > 50', sev: 'block' },
  { ws: 'M277E-10', code: 'REQ-10-2', cond: 'o2_saturation_pct > 50', sev: 'block' },
  { ws: 'M277E-10', code: 'REQ-14', cond: 'IF quality_category == C2 THEN total_coliforms_treated < 10000', sev: 'block' },
  { ws: 'M277E-10', code: 'REQ-15', cond: 'IF quality_category == C2 THEN p_aeruginosa < 100', sev: 'block' },
  { ws: 'M277E-10', code: 'REQ-20', cond: 'attest_m277e_10_req_20 == True', sev: 'block' },
  { ws: 'M277E-10', code: 'REQ-22', cond: 'attest_m277e_10_req_22 == True', sev: 'block' },
  { ws: 'M277E-10', code: 'REQ-23', cond: 'IF discharge_into_water_body == True THEN WHG_permit_present == True', sev: 'block' },
  { ws: 'M277E-10', code: 'REQ-25', cond: 'attest_m277e_10_req_25 == True', sev: 'block' },
  // M277E-11 Nutzungsart Bewässerung — commissioning notification + handover + maintenance
  { ws: 'M277E-11', code: 'REQ-13', cond: 'authority_notification_sent == True', sev: 'block' },
  { ws: 'M277E-11', code: 'REQ-13-2', cond: 'authority_notification_sent == true', sev: 'block' },
  { ws: 'M277E-11', code: 'REQ-20', cond: 'handover_certificate_present == true AND user_manual_handed_over == true', sev: 'block' },
  { ws: 'M277E-11', code: 'REQ-22', cond: 'maintenance_contract_present == true', sev: 'block' },
  // M277E-14 Qualitätskategorie C1/C2 Entscheidung — quality category + water balance
  { ws: 'M277E-14', code: 'REQ-03', cond: '(quality_category == C1 AND greywater_type IN {A1, A2}) OR quality_category == C2', sev: 'block' },
  { ws: 'M277E-14', code: 'REQ-07', cond: 'Q_WB == (Q_GW - Q_SW)', sev: 'block' },
  // M277E-23 Betrieb, Wartung & Eigenüberwachung — Table 4 limits (re-hosted) + discharge + attest
  { ws: 'M277E-23', code: 'REQ-08', cond: 'IF quality_category == C2 THEN turbidity_NTU < 2', sev: 'block' },
  { ws: 'M277E-23', code: 'REQ-09', cond: 'IF quality_category == C2 THEN BOD5 < 5', sev: 'block' },
  { ws: 'M277E-23', code: 'REQ-14', cond: 'IF quality_category == C2 THEN total_coliforms_treated < 10000', sev: 'block' },
  { ws: 'M277E-23', code: 'REQ-15', cond: 'IF quality_category == C2 THEN p_aeruginosa < 100', sev: 'block' },
  { ws: 'M277E-23', code: 'REQ-23', cond: 'IF discharge_into_water_body == true THEN WHG_permit_present == true', sev: 'block' },
  { ws: 'M277E-23', code: 'REQ-25', cond: 'attest_m277e_23_req_25 == True', sev: 'block' },
] as const;

export type M277EFixture = {
  projectId: string;
  userId: string;
  standardId: string;
  instances: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
  /** symbol → home worksheet code (single-home topology) */
  symbolHome: Record<string, string>;
};

export async function seedM277E(sql: postgres.Sql, userId: string): Promise<M277EFixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm277e-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M277E Harness Org', ${'m277e-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M277E-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-277E', 'DWA-M 277E (harness)', 'harness') RETURNING id`;

  // Group home fields by worksheet.
  const fieldsByWs: Record<string, Array<{ symbol: string; dataType: DType }>> = {};
  for (const ws of M277E_WORKSHEETS) fieldsByWs[ws] = [];
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) {
    fieldsByWs[home.ws].push({ symbol, dataType: home.dataType });
  }

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of M277E_WORKSHEETS) {
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
    for (const f of fieldsByWs[ws]) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the live BLOCK gates against their home worksheet templates.
  for (const g of M277E_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  const symbolHome: Record<string, string> = {};
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) symbolHome[symbol] = home.ws;

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
