/**
 * DWA-M-820-1 (Merkblatt DWA-M 820-1 — "Qualität von Ingenieurleistungen optimieren
 * — Teil 1: Vorbereitung und Vergabeverfahren"; März 2020, published Merkblatt /
 * Weißdruck-equivalent, ISBN 978-3-88721-948-2) — minimal fixture for the REAL
 * save-path gate-execution-proof harness.
 *
 * PROOF MANDATE: M-820-1's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's live BLOCK gates (every compliance_requirement with
 * severity='block' + a non-empty condition) through the REAL `saveWorksheet` (values
 * persist to project_parameters) and the REAL `checkApprovalGate` (the engineer-approve
 * enforcement read path that replays each block condition against the saved values).
 * Each gate is demonstrated BOTH ways — a state that PASSES it and a state that
 * VIOLATES it, reaching a definite `fail` — so a gate that fires but never enforces
 * (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard DWA-M-820-1 =
 * d55ee7d6-44aa-4176-a3a1-4ca6a1a7a038, project vadsmshzebefjreqcicl, this session):
 *   - 25 worksheet_templates (M820-01 … M820-25); 120 active fields; 0 equations;
 *     26 compliance_requirements — 20 severity='block' with a non-empty condition.
 *   - The fixture seeds the 17 worksheets that host a live BLOCK gate OR a gate
 *     symbol's single home: M820-01,04,05,09,10,11,12,13,14,16,17,18,20,21,23,24,25.
 *
 * SINGLE-HOME + CROSS-WORKSHEET TOPOLOGY (load-bearing — mirrors prod's fallback):
 *   Each gate symbol is seeded exactly ONCE, on the SYMBOL_HOME worksheet below. A
 *   gate whose symbols live on its own worksheet resolves them locally; a gate that
 *   reads a symbol homed on ANOTHER worksheet resolves it via the conflict-free
 *   project-wide fallback (approval-gate.ts buildFallbackValues / makeGateLookup).
 *   Genuine cross-worksheet gates in M-820-1:
 *     REQ-07 @M820-04 reads estimated_engineering_fee@M820-01 + eu_threshold_value/
 *            threshold_status@M820-09 (all via fallback);
 *     REQ-08 @M820-10 reads oberschwellig_check@M820-09 (fallback) + local procurement_procedure;
 *     REQ-09 @M820-16 reads procurement_procedure@M820-10 (fallback) + local bewertungskommission_size;
 *     REQ-18 @M820-17 reads procurement_procedure@M820-10 (fallback) + local publication_date/ted_notice_id.
 *
 * Conditions verbatim from prod; nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date';

/** Single home worksheet per gate symbol (verbatim data_type from prod fields). */
export const SYMBOL_HOME: Record<string, { ws: string; dataType: DType }> = {
  // M820-01 Projektregistrierung (REQ-01 sector scope, REQ-06 fee)
  sector: { ws: 'M820-01', dataType: 'enum' },
  estimated_engineering_fee: { ws: 'M820-01', dataType: 'number' },
  // M820-04 Bedarfsplanung Konzept (REQ-02 local; REQ-07 biconditional homed here)
  bedarfsplanung_konzept_complete: { ws: 'M820-04', dataType: 'boolean' },
  // M820-05 Bedarfsplanung Projekt (REQ-03 local)
  bedarfsplanung_projekt_complete: { ws: 'M820-05', dataType: 'boolean' },
  // M820-09 Schwellenwertbestimmung (fallback source for REQ-07/REQ-08)
  eu_threshold_value: { ws: 'M820-09', dataType: 'number' },
  threshold_status: { ws: 'M820-09', dataType: 'enum' },
  oberschwellig_check: { ws: 'M820-09', dataType: 'boolean' },
  // M820-10 Verfahrenswahl (REQ-08 local procedure; fallback source for REQ-09/REQ-18)
  procurement_procedure: { ws: 'M820-10', dataType: 'enum' },
  // M820-11 Qualitätsanforderungen (REQ-17 local)
  leistungswettbewerb_only: { ws: 'M820-11', dataType: 'boolean' },
  // M820-12 Ausschlusskriterien (REQ-10 local)
  exclusion_123_gwb_checked: { ws: 'M820-12', dataType: 'boolean' },
  // M820-13 Eignungskriterien (REQ-12 local)
  min_annual_revenue_multiplier: { ws: 'M820-13', dataType: 'number' },
  // M820-14 Zuschlagskriterien (REQ-15/REQ-16 local)
  price_weight_percent: { ws: 'M820-14', dataType: 'number' },
  festpreis_used: { ws: 'M820-14', dataType: 'boolean' },
  doppelbewertungsverbot_check: { ws: 'M820-14', dataType: 'boolean' },
  // M820-16 Bewertungskommission (REQ-09 local commission size)
  bewertungskommission_size: { ws: 'M820-16', dataType: 'number' },
  // M820-17 Bekanntmachung (REQ-18 local publication fields)
  publication_date: { ws: 'M820-17', dataType: 'date' },
  ted_notice_id: { ws: 'M820-17', dataType: 'text' },
  // M820-18 Bewerberprüfung (REQ-19 var-vs-var, both local)
  applicant_count: { ws: 'M820-18', dataType: 'number' },
  shortlisted_count: { ws: 'M820-18', dataType: 'number' },
  // M820-20 Verhandlungsprotokoll (REQ-20 local)
  negotiation_rounds: { ws: 'M820-20', dataType: 'number' },
  // M820-21 Vertragscheckliste (REQ-21 local)
  vertragsentwurf_in_unterlagen: { ws: 'M820-21', dataType: 'boolean' },
  // M820-23 Auftragserteilung (REQ-22 standstill + REQ-26 §135, all local)
  information_letters_sent: { ws: 'M820-23', dataType: 'boolean' },
  electronic_transmission: { ws: 'M820-23', dataType: 'boolean' },
  standstill_period_days: { ws: 'M820-23', dataType: 'number' },
  contract_invalidity_135_gwb_risk: { ws: 'M820-23', dataType: 'boolean' },
  // M820-24 Dokumentationsabschluss (REQ-23 local)
  vergabevermerk_complete: { ws: 'M820-24', dataType: 'boolean' },
  // M820-25 Konformitätszusammenfassung (REQ-25 local)
  compliance_verdict: { ws: 'M820-25', dataType: 'enum' },
};

/** Worksheets that must exist as instances (gate homes + field homes). */
export const M820_WORKSHEETS = [
  'M820-01', 'M820-04', 'M820-05', 'M820-09', 'M820-10', 'M820-11', 'M820-12',
  'M820-13', 'M820-14', 'M820-16', 'M820-17', 'M820-18', 'M820-20', 'M820-21',
  'M820-23', 'M820-24', 'M820-25',
] as const;

/** All 20 live BLOCK gates (non-empty condition), verbatim from prod
 *  compliance_requirements (worksheet_template.code, code, condition). */
export const M820_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M820-01 Projektregistrierung (§1 Anwendungsbereich; §8.5/§3 VgV)
  { ws: 'M820-01', code: 'REQ-01', cond: 'sector IN {wastewater,water_supply,flood_protection,waste,other}', sev: 'block' },
  { ws: 'M820-01', code: 'REQ-06', cond: 'estimated_engineering_fee > 0', sev: 'block' },
  // M820-04 Bedarfsplanung Konzept (§6.2) + Schwellenwert biconditional (§8.6 / Anh. B)
  { ws: 'M820-04', code: 'REQ-02', cond: 'bedarfsplanung_konzept_complete == true', sev: 'block' },
  { ws: 'M820-04', code: 'REQ-07', cond: "(IF estimated_engineering_fee >= eu_threshold_value THEN threshold_status == 'oberschwellig') AND (IF threshold_status == 'oberschwellig' THEN estimated_engineering_fee >= eu_threshold_value)", sev: 'block' },
  // M820-05 Bedarfsplanung Projekt (§6.4)
  { ws: 'M820-05', code: 'REQ-03', cond: 'bedarfsplanung_projekt_complete == true', sev: 'block' },
  // M820-10 Verfahrenswahl (§8.6)
  { ws: 'M820-10', code: 'REQ-08', cond: "IF oberschwellig_check == true THEN procurement_procedure == 'vgv_f'", sev: 'block' },
  // M820-11 Qualitätsanforderungen — Leistungswettbewerb (§76 Abs. 1 VgV, §8.7)
  { ws: 'M820-11', code: 'REQ-17', cond: 'leistungswettbewerb_only == true', sev: 'block' },
  // M820-12 Ausschlusskriterien (§123 GWB, Anh. E.1.1)
  { ws: 'M820-12', code: 'REQ-10', cond: 'exclusion_123_gwb_checked == true', sev: 'block' },
  // M820-13 Eignungskriterien — Mindestjahresumsatz (§45 Abs. 2 VgV, Anh. E.1.4.1)
  { ws: 'M820-13', code: 'REQ-12', cond: 'min_annual_revenue_multiplier <= 2.0', sev: 'block' },
  // M820-14 Zuschlagskriterien (Anh. E.2.8 max 20%; §58 Abs. 2 Doppelbewertungsverbot)
  { ws: 'M820-14', code: 'REQ-15', cond: 'price_weight_percent <= 20 OR festpreis_used=true', sev: 'block' },
  { ws: 'M820-14', code: 'REQ-16', cond: 'doppelbewertungsverbot_check == true', sev: 'block' },
  // M820-16 Bewertungskommission (§58 Abs. 5 VgV, §8.4)
  { ws: 'M820-16', code: 'REQ-09', cond: "IF procurement_procedure == 'vgv_f' THEN bewertungskommission_size >= 2", sev: 'block' },
  // M820-17 Bekanntmachung (§8.10.2.3)
  { ws: 'M820-17', code: 'REQ-18', cond: "IF procurement_procedure == 'vgv_f' THEN (publication_date IS NOT NULL AND ted_notice_id IS NOT NULL)", sev: 'block' },
  // M820-18 Bewerberprüfung (§8.10.2.4) — var-vs-var ordering (F-4 class)
  { ws: 'M820-18', code: 'REQ-19', cond: 'applicant_count >= shortlisted_count', sev: 'block' },
  // M820-20 Verhandlungsprotokoll (§17 Abs. 14 VgV, §8.10.3.4)
  { ws: 'M820-20', code: 'REQ-20', cond: 'negotiation_rounds >= 1', sev: 'block' },
  // M820-21 Vertragscheckliste (§8.10.3.5)
  { ws: 'M820-21', code: 'REQ-21', cond: 'vertragsentwurf_in_unterlagen == true', sev: 'block' },
  // M820-23 Auftragserteilung (§134 GWB standstill; §135 GWB invalidity)
  { ws: 'M820-23', code: 'REQ-22', cond: 'information_letters_sent == true AND ((electronic_transmission == true AND standstill_period_days >= 10) OR (electronic_transmission == false AND standstill_period_days >= 15))', sev: 'block' },
  { ws: 'M820-23', code: 'REQ-26', cond: 'information_letters_sent == true AND contract_invalidity_135_gwb_risk == false', sev: 'block' },
  // M820-24 Dokumentationsabschluss (§8 VgV, §8.3, Anh. F)
  { ws: 'M820-24', code: 'REQ-23', cond: 'vergabevermerk_complete == true', sev: 'block' },
  // M820-25 Konformitätszusammenfassung (§4.1, Bild 2-3)
  { ws: 'M820-25', code: 'REQ-25', cond: 'compliance_verdict IN {compliant,compliant_with_conditions}', sev: 'block' },
] as const;

export type M820Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  instances: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
  /** symbol → home worksheet code (single-home topology) */
  symbolHome: Record<string, string>;
};

export async function seedM820(sql: postgres.Sql, userId: string): Promise<M820Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm820-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M820 Harness Org', ${'m820-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M820-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-820-1', 'DWA-M 820-1 (harness)', 'harness') RETURNING id`;

  // Group home fields by worksheet.
  const fieldsByWs: Record<string, Array<{ symbol: string; dataType: DType }>> = {};
  for (const ws of M820_WORKSHEETS) fieldsByWs[ws] = [];
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) {
    fieldsByWs[home.ws].push({ symbol, dataType: home.dataType });
  }

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of M820_WORKSHEETS) {
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
  for (const g of M820_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  const symbolHome: Record<string, string> = {};
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) symbolHome[symbol] = home.ws;

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
