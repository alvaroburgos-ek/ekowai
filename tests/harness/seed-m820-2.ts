/**
 * DWA-M-820-2 (Merkblatt DWA-M 820-2 — "Qualität von Ingenieurleistungen optimieren
 * — Teil 2: Durchführung"; April 2023, 1. Auflage, Weißdruck / final Merkblatt,
 * ISBN 978-3-96862-577-5 Print / 978-3-96862-578-2 E-Book) — minimal fixture for
 * the REAL save-path gate-execution-proof harness.
 *
 * PROOF MANDATE: M-820-2's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's live BLOCK gates (every compliance_requirement with
 * severity='block' + a non-empty condition) through the REAL `saveWorksheet` (values
 * persist to project_parameters) and the REAL `checkApprovalGate` (the engineer-approve
 * enforcement read path that replays each block condition against the saved values).
 * Each gate is demonstrated BOTH ways — a state that PASSES it and a state that
 * VIOLATES it, reaching a definite `fail` — so a gate that fires but never enforces
 * (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard DWA-M-820-2 =
 * b7acc0ab-00c5-4393-94a5-3aaa6f20b997, project vadsmshzebefjreqcicl, this session):
 *   - 28 worksheet_templates (820-2-01 … 820-2-28); 113 active fields; 0 equations;
 *     59 compliance_requirements — 43 severity='block' with a non-empty condition.
 *   - Every M-820-2 block gate is WORKSHEET-LOCAL (no cross-worksheet symbol), so the
 *     fixture seeds the 22 worksheets that host a live BLOCK gate. Fields are seeded
 *     exactly once on their home worksheet (single-home topology, mirrors prod).
 *
 * Conditions verbatim from prod; nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/** Single home worksheet per gate symbol (verbatim data_type from prod fields). */
export const SYMBOL_HOME: Record<string, { ws: string; dataType: DType }> = {
  // 820-2-01 Projektregistrierung und Umfang (REQ-01 §1 Anwendungsbereich)
  primary_sector: { ws: '820-2-01', dataType: 'enum' },
  included_hoai_phases: { ws: '820-2-01', dataType: 'json' },
  // 820-2-04 Regulatorischer Rahmen und Normen (REQ-53 §6.3.2)
  regulations_current_check: { ws: '820-2-04', dataType: 'boolean' },
  // 820-2-05 Projektorganisation und Handbuch (REQ-04 §4.3.2, REQ-05 §4.3.3, REQ-07 §4.3.5)
  bauherr_tasks_defined: { ws: '820-2-05', dataType: 'boolean' },
  decision_competencies_mapped: { ws: '820-2-05', dataType: 'boolean' },
  project_handbook_complete: { ws: '820-2-05', dataType: 'boolean' },
  // 820-2-06 Statusberichte und Änderungsmanagement (REQ-09 §4.3.7)
  change_log_present: { ws: '820-2-06', dataType: 'boolean' },
  change_impact_documented: { ws: '820-2-06', dataType: 'boolean' },
  // 820-2-07 Terminmanagement (REQ-10 §4.4.2, REQ-11 §4.4.3)
  master_schedule_present: { ws: '820-2-07', dataType: 'boolean' },
  detailed_schedule_present: { ws: '820-2-07', dataType: 'boolean' },
  contractor_schedule_resources: { ws: '820-2-07', dataType: 'boolean' },
  // 820-2-08 Kostenmanagement (REQ-12 §4.5.2, REQ-14 §4.5.4)
  cost_planning_din276: { ws: '820-2-08', dataType: 'boolean' },
  cost_control_documented: { ws: '820-2-08', dataType: 'boolean' },
  // 820-2-09 Vertrags- und Qualitätsmanagement (REQ-16 §4.6.1, REQ-17 §4.6.2, REQ-18 §4.7.1, REQ-19 §4.7.2)
  contract_amendments_tracked: { ws: '820-2-09', dataType: 'boolean' },
  approval_procedure_defined: { ws: '820-2-09', dataType: 'boolean' },
  quality_monitoring_active: { ws: '820-2-09', dataType: 'boolean' },
  qs_plan_lph8_present: { ws: '820-2-09', dataType: 'boolean' },
  // 820-2-10 Risikomanagement (REQ-03 §3, REQ-20 §4.8.2)
  risk_distribution_fair: { ws: '820-2-10', dataType: 'boolean' },
  risk_register_present: { ws: '820-2-10', dataType: 'boolean' },
  // 820-2-11 Bedarfsplanung LPH 0 (REQ-21 §5.2.2, REQ-22 §5.2.3)
  framework_conditions_clarified: { ws: '820-2-11', dataType: 'boolean' },
  forward_planning_done: { ws: '820-2-11', dataType: 'boolean' },
  // 820-2-12 Planungsorganisation und Entscheidungen (REQ-24 §5.3.1, REQ-25 §5.3.2, REQ-27 §5.3.4)
  meeting_protocols_active: { ws: '820-2-12', dataType: 'boolean' },
  decisions_documented: { ws: '820-2-12', dataType: 'boolean' },
  planning_duration_realistic: { ws: '820-2-12', dataType: 'boolean' },
  // 820-2-13 Drittbeteiligung und Koordination (REQ-28 §5.3.5, REQ-29 §5.3.6, REQ-31 §5.3.8)
  third_parties_engaged_early: { ws: '820-2-13', dataType: 'boolean' },
  decision_competencies_clear: { ws: '820-2-13', dataType: 'boolean' },
  lot_strategy_documented: { ws: '820-2-13', dataType: 'boolean' },
  // 820-2-14 Planungsrisiken und Öffentlichkeitsarbeit (REQ-30 §5.3.7/5.3.11, REQ-33 §5.3.10/5.6.5)
  risk_analysis_performed: { ws: '820-2-14', dataType: 'boolean' },
  public_relations_strategy: { ws: '820-2-14', dataType: 'boolean' },
  // 820-2-16 Genehmigungen und Erlaubnisse (REQ-34 §5.4.2, REQ-36 §5.4.4, REQ-37 §5.4.5)
  genehmigungsfaehigkeit: { ws: '820-2-16', dataType: 'boolean' },
  property_rights_secured: { ws: '820-2-16', dataType: 'boolean' },
  permit_conditions_tracked: { ws: '820-2-16', dataType: 'boolean' },
  // 820-2-17 Nebenangebote und Eignungen (REQ-38 §5.5.1, REQ-39 §5.5.2)
  nebenangebote_conditions: { ws: '820-2-17', dataType: 'boolean' },
  eignungskriterien_set: { ws: '820-2-17', dataType: 'boolean' },
  // 820-2-18 Leistungsbeschreibung und Terminpläne (REQ-41 §5.5.4)
  rahmenterminplan_attached: { ws: '820-2-18', dataType: 'boolean' },
  // 820-2-20 Baucontrolling und Qualität (REQ-43 §5.6.2, REQ-44 §5.6.3)
  quality_supervision_active: { ws: '820-2-20', dataType: 'boolean' },
  bauueberwachung_competencies: { ws: '820-2-20', dataType: 'boolean' },
  // 820-2-22 Testbetrieb und Abnahme (REQ-46 §5.7.2/Bild 3, REQ-47 §5.7.3/Bild 4)
  testbetrieb_planned: { ws: '820-2-22', dataType: 'boolean' },
  abnahme_per_bild4: { ws: '820-2-22', dataType: 'boolean' },
  // 820-2-23 Dokumentation und Einweisung (REQ-48 §5.7.4, REQ-49 §5.7.5)
  operating_manuals_complete: { ws: '820-2-23', dataType: 'boolean' },
  training_complete: { ws: '820-2-23', dataType: 'boolean' },
  // 820-2-24 Gewährleistungsmanagement (REQ-51 §5.8.2, REQ-52 §5.8.3)
  warranty_start_date: { ws: '820-2-24', dataType: 'date' },
  warranty_end_date: { ws: '820-2-24', dataType: 'date' },
  defect_tracking_active: { ws: '820-2-24', dataType: 'boolean' },
  // 820-2-25 Richtlinienverwaltung (REQ-54 §6.3.3)
  approval_release_process: { ws: '820-2-25', dataType: 'boolean' },
  // 820-2-26 Innovationsmanagement (REQ-56 §7.6)
  ip_rights_defined: { ws: '820-2-26', dataType: 'boolean' },
  // 820-2-27 Digitale Planung und BIM (REQ-58 §8.2.2)
  data_quality_checked: { ws: '820-2-27', dataType: 'boolean' },
};

/** Worksheets that must exist as instances (gate homes = field homes). */
export const M820_2_WORKSHEETS = [
  '820-2-01', '820-2-04', '820-2-05', '820-2-06', '820-2-07', '820-2-08',
  '820-2-09', '820-2-10', '820-2-11', '820-2-12', '820-2-13', '820-2-14',
  '820-2-16', '820-2-17', '820-2-18', '820-2-20', '820-2-22', '820-2-23',
  '820-2-24', '820-2-25', '820-2-26', '820-2-27',
] as const;

/** All 43 live BLOCK gates (non-empty condition), verbatim from prod
 *  compliance_requirements (worksheet_template.code, code, condition). */
export const M820_2_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // 820-2-01 Projektregistrierung (§1 Anwendungsbereich) — enum existence + json IS NOT EMPTY
  { ws: '820-2-01', code: 'REQ-01', cond: 'primary_sector IS NOT NULL AND included_hoai_phases IS NOT EMPTY', sev: 'block' },
  // 820-2-04 Regulatorischer Rahmen (§6.3.2)
  { ws: '820-2-04', code: 'REQ-53', cond: 'regulations_current_check == true', sev: 'block' },
  // 820-2-05 Projektorganisation und Handbuch (§4.3.2 / §4.3.3 / §4.3.5, Anhang B)
  { ws: '820-2-05', code: 'REQ-04', cond: 'bauherr_tasks_defined == true', sev: 'block' },
  { ws: '820-2-05', code: 'REQ-05', cond: 'decision_competencies_mapped == true', sev: 'block' },
  { ws: '820-2-05', code: 'REQ-07', cond: 'project_handbook_complete == true', sev: 'block' },
  // 820-2-06 Statusberichte und Änderungsmanagement (§4.3.7, §2.1) — two-conjunct AND
  { ws: '820-2-06', code: 'REQ-09', cond: 'change_log_present == true AND change_impact_documented == true', sev: 'block' },
  // 820-2-07 Terminmanagement (§4.4.2 / §4.4.3)
  { ws: '820-2-07', code: 'REQ-10', cond: 'master_schedule_present == true AND detailed_schedule_present == true', sev: 'block' },
  { ws: '820-2-07', code: 'REQ-11', cond: 'contractor_schedule_resources == true', sev: 'block' },
  // 820-2-08 Kostenmanagement (§4.5.2 / §4.5.4)
  { ws: '820-2-08', code: 'REQ-12', cond: 'cost_planning_din276 == true', sev: 'block' },
  { ws: '820-2-08', code: 'REQ-14', cond: 'cost_control_documented == true', sev: 'block' },
  // 820-2-09 Vertrags- und Qualitätsmanagement (§4.6.1 / §4.6.2 / §4.7.1 / §4.7.2)
  { ws: '820-2-09', code: 'REQ-16', cond: 'contract_amendments_tracked == true', sev: 'block' },
  { ws: '820-2-09', code: 'REQ-17', cond: 'approval_procedure_defined == true', sev: 'block' },
  { ws: '820-2-09', code: 'REQ-18', cond: 'quality_monitoring_active == true', sev: 'block' },
  { ws: '820-2-09', code: 'REQ-19', cond: 'qs_plan_lph8_present == true', sev: 'block' },
  // 820-2-10 Risikomanagement (§3 / §4.8.2)
  { ws: '820-2-10', code: 'REQ-03', cond: 'risk_distribution_fair == true', sev: 'block' },
  { ws: '820-2-10', code: 'REQ-20', cond: 'risk_register_present == true', sev: 'block' },
  // 820-2-11 Bedarfsplanung LPH 0 (§5.2.2 / §5.2.3)
  { ws: '820-2-11', code: 'REQ-21', cond: 'framework_conditions_clarified == true', sev: 'block' },
  { ws: '820-2-11', code: 'REQ-22', cond: 'forward_planning_done == true', sev: 'block' },
  // 820-2-12 Planungsorganisation und Entscheidungen (§5.3.1 / §5.3.2 / §5.3.4)
  { ws: '820-2-12', code: 'REQ-24', cond: 'meeting_protocols_active == true', sev: 'block' },
  { ws: '820-2-12', code: 'REQ-25', cond: 'decisions_documented == true', sev: 'block' },
  { ws: '820-2-12', code: 'REQ-27', cond: 'planning_duration_realistic == true', sev: 'block' },
  // 820-2-13 Drittbeteiligung und Koordination (§5.3.5 / §5.3.6 / §5.3.8)
  { ws: '820-2-13', code: 'REQ-28', cond: 'third_parties_engaged_early == true', sev: 'block' },
  { ws: '820-2-13', code: 'REQ-29', cond: 'decision_competencies_clear == true', sev: 'block' },
  { ws: '820-2-13', code: 'REQ-31', cond: 'lot_strategy_documented == true', sev: 'block' },
  // 820-2-14 Planungsrisiken und Öffentlichkeitsarbeit (§5.3.7/5.3.11 / §5.3.10/5.6.5)
  { ws: '820-2-14', code: 'REQ-30', cond: 'risk_analysis_performed == true', sev: 'block' },
  { ws: '820-2-14', code: 'REQ-33', cond: 'public_relations_strategy == true', sev: 'block' },
  // 820-2-16 Genehmigungen und Erlaubnisse (§5.4.2 / §5.4.4 / §5.4.5)
  { ws: '820-2-16', code: 'REQ-34', cond: 'genehmigungsfaehigkeit == true', sev: 'block' },
  { ws: '820-2-16', code: 'REQ-36', cond: 'property_rights_secured == true', sev: 'block' },
  { ws: '820-2-16', code: 'REQ-37', cond: 'permit_conditions_tracked == true', sev: 'block' },
  // 820-2-17 Nebenangebote und Eignungen (§5.5.1 / §5.5.2)
  { ws: '820-2-17', code: 'REQ-38', cond: 'nebenangebote_conditions == true', sev: 'block' },
  { ws: '820-2-17', code: 'REQ-39', cond: 'eignungskriterien_set == true', sev: 'block' },
  // 820-2-18 Leistungsbeschreibung und Terminpläne (§5.5.4)
  { ws: '820-2-18', code: 'REQ-41', cond: 'rahmenterminplan_attached == true', sev: 'block' },
  // 820-2-20 Baucontrolling und Qualität (§5.6.2 / §5.6.3)
  { ws: '820-2-20', code: 'REQ-43', cond: 'quality_supervision_active == true', sev: 'block' },
  { ws: '820-2-20', code: 'REQ-44', cond: 'bauueberwachung_competencies == true', sev: 'block' },
  // 820-2-22 Testbetrieb und Abnahme (§5.7.2/Bild 3 / §5.7.3/Bild 4)
  { ws: '820-2-22', code: 'REQ-46', cond: 'testbetrieb_planned == true', sev: 'block' },
  { ws: '820-2-22', code: 'REQ-47', cond: 'abnahme_per_bild4 == true', sev: 'block' },
  // 820-2-23 Dokumentation und Einweisung (§5.7.4 / §5.7.5)
  { ws: '820-2-23', code: 'REQ-48', cond: 'operating_manuals_complete == true', sev: 'block' },
  { ws: '820-2-23', code: 'REQ-49', cond: 'training_complete == true', sev: 'block' },
  // 820-2-24 Gewährleistungsmanagement (§5.8.2 / §5.8.3)
  //   REQ-51 uses `!= null` (NOT `IS NOT NULL`) — see the DEFECT test: `null`
  //   tokenizes to the NULL literal → the compare path returns pass when the date
  //   is set and PENDING when it is absent, so REQ-51 NEVER reaches a definite fail
  //   and NEVER blocks (non-enforcing block gate).
  { ws: '820-2-24', code: 'REQ-51', cond: 'warranty_start_date != null AND warranty_end_date != null', sev: 'block' },
  { ws: '820-2-24', code: 'REQ-52', cond: 'defect_tracking_active == true', sev: 'block' },
  // 820-2-25 Richtlinienverwaltung (§6.3.3)
  { ws: '820-2-25', code: 'REQ-54', cond: 'approval_release_process == true', sev: 'block' },
  // 820-2-26 Innovationsmanagement (§7.6)
  { ws: '820-2-26', code: 'REQ-56', cond: 'ip_rights_defined == true', sev: 'block' },
  // 820-2-27 Digitale Planung und BIM (§8.2.2)
  { ws: '820-2-27', code: 'REQ-58', cond: 'data_quality_checked == true', sev: 'block' },
] as const;

export type M820_2Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  instances: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
  /** symbol → home worksheet code (single-home topology) */
  symbolHome: Record<string, string>;
};

export async function seedM820_2(sql: postgres.Sql, userId: string): Promise<M820_2Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm820-2-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M820-2 Harness Org', ${'m820-2-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M820-2-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-820-2', 'DWA-M 820-2 (harness)', 'harness') RETURNING id`;

  // Group home fields by worksheet.
  const fieldsByWs: Record<string, Array<{ symbol: string; dataType: DType }>> = {};
  for (const ws of M820_2_WORKSHEETS) fieldsByWs[ws] = [];
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) {
    fieldsByWs[home.ws].push({ symbol, dataType: home.dataType });
  }

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of M820_2_WORKSHEETS) {
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
      // active=true; is_required deliberately FALSE in the fixture so the per-gate
      // proof isolates the block-CONDITION path (checkApprovalGate's separate
      // missing-required-field list is not what we are proving here).
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the live BLOCK gates against their home worksheet templates.
  for (const g of M820_2_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  const symbolHome: Record<string, string> = {};
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) symbolHome[symbol] = home.ws;

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
