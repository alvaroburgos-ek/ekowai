/**
 * DWA-A-272E (Standard DWA-A 272E — Principles for the Planning and Implementation
 * of New Alternative Sanitation Systems (NASS); English Edition, 1st edition,
 * Hennef 2019 — Weißdruck/final) — minimal fixture for the REAL save-path
 * gate-execution-proof harness.
 *
 * PROOF MANDATE: A-272E's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's live BLOCK gates (every compliance_requirement with
 * severity='block' + a non-empty condition) through the REAL `saveWorksheet` (values
 * persist to project_parameters) and the REAL `checkApprovalGate` (the engineer-approve
 * enforcement read path that replays each block condition against the saved values).
 * Each gate is demonstrated BOTH ways — a state that PASSES it and a state that
 * VIOLATES it, reaching a definite `fail` — so a gate that fires but never enforces
 * (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard DWA-A-272E =
 * 5c5d38a1-91dd-4143-8697-d828bca54ef6, project vadsmshzebefjreqcicl, this session):
 *   - 25 worksheet_templates (A272E-01 … A272E-25); 186 active fields; 10 equations;
 *     36 compliance_requirements — 20 severity='block' with a non-empty condition.
 *   - The fixture seeds the 10 worksheets that host a live BLOCK gate:
 *     A272E-01,03,04,05,09,11,12,13,15,18.
 *
 * SINGLE-HOME TOPOLOGY: in prod EVERY block-gate symbol lives on exactly ONE
 * worksheet, and every gate's symbols all live on the gate's OWN worksheet — so all
 * 20 gates resolve LOCALLY (no cross-worksheet fallback is needed for A-272E; the
 * fallback path is still exercised by the general approval-gate machinery but no gate
 * depends on it here). Each symbol is nonetheless seeded exactly once, on the
 * SYMBOL_HOME worksheet below, mirroring prod. Conditions are verbatim from prod;
 * nothing is applied to prod.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum';

/** Single home worksheet per block-gate symbol (verbatim data_type from prod fields). */
export const SYMBOL_HOME: Record<string, { ws: string; dataType: DType }> = {
  // A272E-01 Projektregistrierung — scope-clarification gate (COMP-01)
  project_name: { ws: 'A272E-01', dataType: 'text' },
  client_name: { ws: 'A272E-01', dataType: 'text' },
  project_location: { ws: 'A272E-01', dataType: 'text' },
  building_use_type: { ws: 'A272E-01', dataType: 'enum' },
  E_population: { ws: 'A272E-01', dataType: 'number' },
  rationale_documented: { ws: 'A272E-01', dataType: 'boolean' },
  // A272E-03 NASS-Anwendbarkeits-Screening (COMP-02)
  favourable_conditions_count: { ws: 'A272E-03', dataType: 'number' },
  // A272E-04 Terminologie / Bio-Abfall + Dünger legal screening (COMP-03/24/25)
  material_flow_class: { ws: 'A272E-04', dataType: 'enum' },
  attest_a272e_04_comp_24: { ws: 'A272E-04', dataType: 'boolean' },
  attest_a272e_04_comp_25: { ws: 'A272E-04', dataType: 'boolean' },
  // A272E-05 Auswahl der Systemgruppe (COMP-04/15)
  system_group: { ws: 'A272E-05', dataType: 'enum' },
  // A272E-09 Rechtsrahmen-Bewertung (COMP-08)
  legal_WHG_ok: { ws: 'A272E-09', dataType: 'boolean' },
  legal_KrWG_ok: { ws: 'A272E-09', dataType: 'boolean' },
  legal_TrinkwV_ok: { ws: 'A272E-09', dataType: 'boolean' },
  legal_DuengG_ok: { ws: 'A272E-09', dataType: 'boolean' },
  // A272E-11 Auswahl der Behandlungstechnologie (COMP-18)
  attest_a272e_11_comp_18: { ws: 'A272E-11', dataType: 'boolean' },
  // A272E-12 Auswirkungen auf bestehende Infrastruktur (COMP-34)
  baseline_quantitative_expansion_documented: { ws: 'A272E-12', dataType: 'boolean' },
  baseline_qualitative_differentiation_documented: { ws: 'A272E-12', dataType: 'boolean' },
  // A272E-13 Definition der Bewertungskriterien (COMP-11/27)
  T_plan: { ws: 'A272E-13', dataType: 'number' },
  sensitivity_analysis_done: { ws: 'A272E-13', dataType: 'boolean' },
  scenario_analysis_done: { ws: 'A272E-13', dataType: 'boolean' },
  // A272E-15 Stakeholder-Integration (COMP-28..33)
  stakeholder_urban: { ws: 'A272E-15', dataType: 'boolean' },
  stakeholder_architecture: { ws: 'A272E-15', dataType: 'boolean' },
  stakeholder_water: { ws: 'A272E-15', dataType: 'boolean' },
  stakeholder_waste: { ws: 'A272E-15', dataType: 'boolean' },
  stakeholder_agri: { ws: 'A272E-15', dataType: 'boolean' },
  stakeholder_energy: { ws: 'A272E-15', dataType: 'boolean' },
  // A272E-18 Compliance- und Entscheidungs-Zusammenfassung (COMP-13/35)
  monitoring_program_defined: { ws: 'A272E-18', dataType: 'boolean' },
  compliance_decision: { ws: 'A272E-18', dataType: 'enum' },
};

/** Worksheets that must exist as instances (gate homes). */
export const A272E_WORKSHEETS = [
  'A272E-01', 'A272E-03', 'A272E-04', 'A272E-05', 'A272E-09',
  'A272E-11', 'A272E-12', 'A272E-13', 'A272E-15', 'A272E-18',
] as const;

/** All 20 live BLOCK gates (non-empty condition), verbatim from prod
 *  compliance_requirements (worksheet_template.code, code, condition). */
export const A272E_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // A272E-01 Projektregistrierung — §1 / §9.1 Step 1 scope clarification
  { ws: 'A272E-01', code: 'COMP-01', cond: 'project_name IS NOT EMPTY AND client_name IS NOT EMPTY AND project_location IS NOT EMPTY AND building_use_type IS NOT NULL AND E_population IS NOT NULL AND rationale_documented == true', sev: 'block' },
  // A272E-03 NASS-Anwendbarkeits-Screening — §5.1 / Table 4
  { ws: 'A272E-03', code: 'COMP-02', cond: 'favourable_conditions_count>=1', sev: 'block' },
  // A272E-04 §3 terminology + §8 legal screening
  { ws: 'A272E-04', code: 'COMP-03', cond: 'material_flow_class IN {service_water,bio_waste,brownwater,faecal_matter,faeces,yellowwater,greywater,domestic_sewage,rainwater,residues,wastewater,blackwater,urine,white_water}', sev: 'block' },
  { ws: 'A272E-04', code: 'COMP-24', cond: 'attest_a272e_04_comp_24 == True', sev: 'block' },
  { ws: 'A272E-04', code: 'COMP-25', cond: 'attest_a272e_04_comp_25 == True', sev: 'block' },
  // A272E-05 System group (§4.2 / Table 1)
  { ws: 'A272E-05', code: 'COMP-04', cond: 'system_group IN {one_material_flow,two_material_flows_greyblack,two_material_flows_UDT,three_material_flows_UDT,two_material_flows_drytoilet,three_material_flows_UDDT}', sev: 'block' },
  { ws: 'A272E-05', code: 'COMP-15', cond: 'system_group IN {one_material_flow,two_material_flows_greyblack,two_material_flows_UDT,three_material_flows_UDT,two_material_flows_drytoilet,three_material_flows_UDDT}', sev: 'block' },
  // A272E-09 Legal framework documented (§8)
  { ws: 'A272E-09', code: 'COMP-08', cond: 'legal_WHG_ok == true AND legal_KrWG_ok == true AND legal_TrinkwV_ok == true AND legal_DuengG_ok == true', sev: 'block' },
  // A272E-11 Blackwater + vacuum corrosion mitigation (§5.2)
  { ws: 'A272E-11', code: 'COMP-18', cond: 'attest_a272e_11_comp_18 == True', sev: 'block' },
  // A272E-12 Basic research adequacy (§9.1(3)-(4))
  { ws: 'A272E-12', code: 'COMP-34', cond: 'baseline_quantitative_expansion_documented == true AND baseline_qualitative_differentiation_documented == true', sev: 'block' },
  // A272E-13 Planning horizon plausibility + uncertainty inclusion (§7.3)
  { ws: 'A272E-13', code: 'COMP-11', cond: 'T_plan >= 10 AND T_plan <= 100', sev: 'block' },
  { ws: 'A272E-13', code: 'COMP-27', cond: 'sensitivity_analysis_done == true OR scenario_analysis_done == true', sev: 'block' },
  // A272E-15 Stakeholder coordination (§9.2.2 … §9.2.7)
  { ws: 'A272E-15', code: 'COMP-28', cond: 'stakeholder_urban == true', sev: 'block' },
  { ws: 'A272E-15', code: 'COMP-29', cond: 'stakeholder_architecture == true', sev: 'block' },
  { ws: 'A272E-15', code: 'COMP-30', cond: 'stakeholder_water == true', sev: 'block' },
  { ws: 'A272E-15', code: 'COMP-31', cond: 'stakeholder_waste == true', sev: 'block' },
  { ws: 'A272E-15', code: 'COMP-32', cond: 'stakeholder_agri == true', sev: 'block' },
  { ws: 'A272E-15', code: 'COMP-33', cond: 'stakeholder_energy == true', sev: 'block' },
  // A272E-18 Monitoring program + final decision (§9.1(8) / §10)
  { ws: 'A272E-18', code: 'COMP-13', cond: 'monitoring_program_defined == true', sev: 'block' },
  { ws: 'A272E-18', code: 'COMP-35', cond: 'compliance_decision == approved', sev: 'block' },
] as const;

export type A272EFixture = {
  projectId: string;
  userId: string;
  standardId: string;
  instances: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
  /** symbol → home worksheet code (single-home topology) */
  symbolHome: Record<string, string>;
};

export async function seedA272E(sql: postgres.Sql, userId: string): Promise<A272EFixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'a272e-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('A272E Harness Org', ${'a272e-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'A272E-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-A-272E', 'DWA-A 272E (harness)', 'harness') RETURNING id`;

  // Group home fields by worksheet.
  const fieldsByWs: Record<string, Array<{ symbol: string; dataType: DType }>> = {};
  for (const ws of A272E_WORKSHEETS) fieldsByWs[ws] = [];
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) {
    fieldsByWs[home.ws].push({ symbol, dataType: home.dataType });
  }

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of A272E_WORKSHEETS) {
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
      // active=true; is_required deliberately FALSE in the fixture so the
      // per-gate proof isolates the block-CONDITION path (checkApprovalGate's
      // separate missing-required-field list is not what we are proving here).
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the live BLOCK gates against their home worksheet templates.
  for (const g of A272E_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  const symbolHome: Record<string, string> = {};
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) symbolHome[symbol] = home.ws;

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
