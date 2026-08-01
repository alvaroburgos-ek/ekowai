/**
 * DWA-M-205 (Merkblatt DWA-M 205 — Desinfektion von biologisch gereinigtem
 * Abwasser; Weißdruck, März 2013, Fachliche Aktualitätsprüfung 2019) — minimal
 * fixture for the REAL save-path gate-execution-proof harness.
 *
 * PROOF MANDATE: M-205's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's live BLOCK gates (every compliance_requirement with
 * severity='block' + a non-empty condition) through the REAL `saveWorksheet` (values
 * persist to project_parameters) and the REAL `checkApprovalGate` (the engineer-approve
 * enforcement read path that replays each block condition against the saved values).
 * Each gate is demonstrated BOTH ways — a state that PASSES it and a state that
 * VIOLATES it, reaching a definite `fail` — so a gate that fires but never enforces
 * (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard DWA-M-205 =
 * 01c46e30-92cb-45c8-9a6e-96ea58be317c, project vadsmshzebefjreqcicl, this session):
 *   - 26 worksheet_templates (M205-01 … M205-26); 72 compliance_requirements
 *     (70 severity='block', 2 severity='warn'); 24 equations.
 *   - The fixture seeds the 15 worksheets that host a live gate PLUS the one
 *     field-home worksheet a gate reads from by fallback (M205-11, home of
 *     `mehrstrassige_anlage`, which itself hosts no gate).
 *
 * SINGLE-HOME TOPOLOGY (load-bearing — mirrors prod's cross-worksheet fallback):
 *   In prod many symbols live on TWO worksheets (e.g. `ozon_konz` on M205-07 AND
 *   M205-17). The mega-worksheet M205-10 ("UV-Bestrahlung Bemessung") re-hosts ~21
 *   compliance conditions whose symbols mostly live on OTHER worksheets (M205-07/08/
 *   03/05/06/11/18); on M205-10 those symbols are NOT local fields and resolve via
 *   the conflict-free project-wide fallback (approval-gate.ts buildFallbackValues /
 *   makeGateLookup). To exercise that path faithfully AND avoid fallback conflicts,
 *   each symbol is seeded exactly ONCE, on the SYMBOL_HOME worksheet below. A gate on
 *   the symbol's home resolves it locally; a gate on any OTHER worksheet (M205-10 in
 *   particular, plus M205-06/CR-34 reading `afs`, and the OR gates reading
 *   `mehrstrassige_anlage`) resolves it via fallback. Conditions are verbatim from
 *   prod; nothing is applied to prod.
 *
 * DUPLICATE CODES are real prod state and are BOTH driven, never de-duped:
 *   - CR-06/CR-06-2 (afs<=20 on M205-03); CR-13/-2, CR-27/-2, CR-30/-2 (M205-09);
 *     CR-31/-2, CR-32/-2 (M205-07); CR-23/CR-23-2 (M205-08); CR-25/-2 (M205-14);
 *     CR-33/-2 (M205-12); CR-35/-2 (M205-17); CR-36/-2 (M205-22); and the whole
 *     CR-03-2 … CR-20-2 family on M205-10.
 *   - REQ-M205-ES1-11 / REQ-M205-ES1-11-2 (restchlor_betrieb>=0.2, BLOCK, M205-08) —
 *     the named ES-1 disposition block gate.
 *   - REQ-M205-ES1-04 / REQ-M205-ES1-04-2 (ozon_pro_doc<0.8, WARN, M205-07) — seeded
 *     so the harness can PROVE a warn gate does NOT block even when violated.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum';

/** Single home worksheet per gate symbol (verbatim data_type from prod fields). */
export const SYMBOL_HOME: Record<string, { ws: string; dataType: DType }> = {
  biologische_vorbehandlung: { ws: 'M205-01', dataType: 'boolean' },
  behoerdliche_freigabe: { ws: 'M205-02', dataType: 'boolean' },
  eignungsklasse_bewaesserung: { ws: 'M205-02', dataType: 'enum' },
  daly_wert: { ws: 'M205-02', dataType: 'number' },
  afs: { ws: 'M205-03', dataType: 'number' },
  durchfluss_max: { ws: 'M205-03', dataType: 'number' },
  uv_dosis: { ws: 'M205-05', dataType: 'number' },
  ip_schutzart: { ws: 'M205-05', dataType: 'text' },
  vorsiebung_erforderlich: { ws: 'M205-06', dataType: 'enum' },
  restozon_abluft: { ws: 'M205-07', dataType: 'number' },
  ozon_konz: { ws: 'M205-07', dataType: 'number' },
  ozon_aufenthaltszeit: { ws: 'M205-07', dataType: 'number' },
  ozon_pro_doc: { ws: 'M205-07', dataType: 'number' },
  wiederverkeimungsbeurteilung: { ws: 'M205-07', dataType: 'boolean' },
  gefaehrdungsbeurteilung_biostoffv: { ws: 'M205-07', dataType: 'boolean' },
  betriebsanweisung_biostoffv: { ws: 'M205-07', dataType: 'boolean' },
  ph_chlorung: { ws: 'M205-08', dataType: 'number' },
  restchlor: { ws: 'M205-08', dataType: 'number' },
  entchlorungsstufe: { ws: 'M205-08', dataType: 'boolean' },
  restchlor_betrieb: { ws: 'M205-08', dataType: 'number' },
  kontaktzeit_chlor: { ws: 'M205-08', dataType: 'number' },
  monatlicher_nachweis: { ws: 'M205-09', dataType: 'boolean' },
  kalibrierintervall_sensor: { ws: 'M205-09', dataType: 'number' },
  reinigungsintervall_sensor: { ws: 'M205-09', dataType: 'number' },
  chlorung_routine: { ws: 'M205-09', dataType: 'boolean' },
  e_coli_ablauf: { ws: 'M205-10', dataType: 'number' },
  enterokokken_ablauf: { ws: 'M205-10', dataType: 'number' },
  log_reduktion: { ws: 'M205-10', dataType: 'number' },
  mehrstrassige_anlage: { ws: 'M205-11', dataType: 'boolean' },
  hg_strahler_sonderentsorgung: { ws: 'M205-12', dataType: 'boolean' },
  pilotierung: { ws: 'M205-14', dataType: 'boolean' },
  reaktor_gasdicht: { ws: 'M205-17', dataType: 'boolean' },
  temperatur_ozonentfernung: { ws: 'M205-18', dataType: 'number' },
  katalytisch: { ws: 'M205-18', dataType: 'boolean' },
  bgv_b4_konformitaet: { ws: 'M205-22', dataType: 'boolean' },
  sicherheitsdatenblatt_pes: { ws: 'M205-22', dataType: 'boolean' },
};

/** Worksheets that must exist as instances (gate homes + the M205-11 field home). */
export const M205_WORKSHEETS = [
  'M205-01', 'M205-02', 'M205-03', 'M205-05', 'M205-06', 'M205-07', 'M205-08',
  'M205-09', 'M205-10', 'M205-11', 'M205-12', 'M205-14', 'M205-17', 'M205-18', 'M205-22',
] as const;

/** All 70 live BLOCK gates + the 2 live WARN gates, verbatim from prod
 *  compliance_requirements (worksheet_template.code, code, condition, severity). */
export const M205_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M205-01 Anwendungsbereich
  { ws: 'M205-01', code: 'CR-01', cond: 'biologische_vorbehandlung == True', sev: 'block' },
  // M205-02 Begriffe
  { ws: 'M205-02', code: 'CR-02', cond: 'behoerdliche_freigabe == True', sev: 'block' },
  { ws: 'M205-02', code: 'CR-18', cond: 'eignungsklasse_bewaesserung IN {1, 2, 3, 4}', sev: 'block' },
  { ws: 'M205-02', code: 'CR-19', cond: 'daly_wert <= 1e-6', sev: 'block' },
  // M205-03 Anforderungsanalyse
  { ws: 'M205-03', code: 'CR-06', cond: 'afs <= 20', sev: 'block' },
  { ws: 'M205-03', code: 'CR-06-2', cond: 'afs <= 20', sev: 'block' },
  { ws: 'M205-03', code: 'CR-28', cond: 'durchfluss_max <= 1000 OR mehrstrassige_anlage == True', sev: 'block' },
  // M205-05 Bewässerung
  { ws: 'M205-05', code: 'CR-07', cond: 'uv_dosis >= 300 AND uv_dosis <= 700', sev: 'block' },
  { ws: 'M205-05', code: 'CR-29', cond: 'ip_schutzart IN {IP54, IP55, IP56, IP65, IP66, IP67}', sev: 'block' },
  // M205-06 Trinkwassergewinnung
  { ws: 'M205-06', code: 'CR-34', cond: 'afs > 0 AND vorsiebung_erforderlich IN {ja, nein}', sev: 'block' },
  // M205-07 Brauchwassernutzung / Arbeitsschutz
  { ws: 'M205-07', code: 'CR-08', cond: 'restozon_abluft <= 0.02', sev: 'block' },
  { ws: 'M205-07', code: 'CR-09', cond: 'ozon_konz >= 2 AND ozon_konz <= 10', sev: 'block' },
  { ws: 'M205-07', code: 'CR-10', cond: 'ozon_aufenthaltszeit >= 5', sev: 'block' },
  { ws: 'M205-07', code: 'CR-21', cond: 'ozon_pro_doc < 0.8', sev: 'block' },
  { ws: 'M205-07', code: 'CR-31', cond: 'wiederverkeimungsbeurteilung == True', sev: 'block' },
  { ws: 'M205-07', code: 'CR-31-2', cond: 'wiederverkeimungsbeurteilung == True', sev: 'block' },
  { ws: 'M205-07', code: 'CR-32', cond: 'gefaehrdungsbeurteilung_biostoffv == True AND betriebsanweisung_biostoffv == True', sev: 'block' },
  { ws: 'M205-07', code: 'CR-32-2', cond: 'gefaehrdungsbeurteilung_biostoffv == True AND betriebsanweisung_biostoffv == True', sev: 'block' },
  { ws: 'M205-07', code: 'REQ-M205-ES1-04', cond: 'ozon_pro_doc < 0.8', sev: 'warn' },
  { ws: 'M205-07', code: 'REQ-M205-ES1-04-2', cond: 'ozon_pro_doc < 0.8', sev: 'warn' },
  // M205-08 Zulaufcharakterisierung / Chlorung
  { ws: 'M205-08', code: 'CR-11', cond: 'ph_chlorung >= 6 AND ph_chlorung <= 8', sev: 'block' },
  { ws: 'M205-08', code: 'CR-12', cond: 'restchlor <= 0.005', sev: 'block' },
  { ws: 'M205-08', code: 'CR-22', cond: 'entchlorungsstufe == True', sev: 'block' },
  { ws: 'M205-08', code: 'CR-23', cond: 'restchlor_betrieb >= 0.2', sev: 'block' },
  { ws: 'M205-08', code: 'CR-23-2', cond: 'restchlor_betrieb >= 0.2', sev: 'block' },
  { ws: 'M205-08', code: 'CR-24', cond: 'kontaktzeit_chlor >= 15 AND kontaktzeit_chlor <= 30', sev: 'block' },
  { ws: 'M205-08', code: 'REQ-M205-ES1-11', cond: 'restchlor_betrieb >= 0.2', sev: 'block' },
  { ws: 'M205-08', code: 'REQ-M205-ES1-11-2', cond: 'restchlor_betrieb >= 0.2', sev: 'block' },
  // M205-09 Verfahrensauswahl
  { ws: 'M205-09', code: 'CR-13', cond: 'monatlicher_nachweis == True', sev: 'block' },
  { ws: 'M205-09', code: 'CR-13-2', cond: 'monatlicher_nachweis == True', sev: 'block' },
  { ws: 'M205-09', code: 'CR-27', cond: 'kalibrierintervall_sensor <= 6 AND reinigungsintervall_sensor <= 4', sev: 'block' },
  { ws: 'M205-09', code: 'CR-27-2', cond: 'kalibrierintervall_sensor <= 6 AND reinigungsintervall_sensor <= 4', sev: 'block' },
  { ws: 'M205-09', code: 'CR-30', cond: 'chlorung_routine == False', sev: 'block' },
  { ws: 'M205-09', code: 'CR-30-2', cond: 'chlorung_routine == False', sev: 'block' },
  // M205-10 UV-Bemessung — re-hosts many conditions (mostly cross-ws fallback)
  { ws: 'M205-10', code: 'CR-03', cond: 'e_coli_ablauf <= 500 AND enterokokken_ablauf <= 200', sev: 'block' },
  { ws: 'M205-10', code: 'CR-03-2', cond: 'e_coli_ablauf <= 500 AND enterokokken_ablauf <= 200', sev: 'block' },
  { ws: 'M205-10', code: 'CR-04', cond: 'e_coli_ablauf <= 250 AND enterokokken_ablauf <= 100', sev: 'block' },
  { ws: 'M205-10', code: 'CR-04-2', cond: 'e_coli_ablauf <= 250 AND enterokokken_ablauf <= 100', sev: 'block' },
  { ws: 'M205-10', code: 'CR-05', cond: 'e_coli_ablauf == 0 AND enterokokken_ablauf == 0', sev: 'block' },
  { ws: 'M205-10', code: 'CR-05-2', cond: 'e_coli_ablauf == 0 AND enterokokken_ablauf == 0', sev: 'block' },
  { ws: 'M205-10', code: 'CR-07', cond: 'uv_dosis >= 300 AND uv_dosis <= 700', sev: 'block' },
  { ws: 'M205-10', code: 'CR-08', cond: 'restozon_abluft <= 0.02', sev: 'block' },
  { ws: 'M205-10', code: 'CR-09', cond: 'ozon_konz >= 2 AND ozon_konz <= 10', sev: 'block' },
  { ws: 'M205-10', code: 'CR-10', cond: 'ozon_aufenthaltszeit >= 5', sev: 'block' },
  { ws: 'M205-10', code: 'CR-11', cond: 'ph_chlorung >= 6 AND ph_chlorung <= 8', sev: 'block' },
  { ws: 'M205-10', code: 'CR-12', cond: 'restchlor <= 0.005', sev: 'block' },
  { ws: 'M205-10', code: 'CR-14', cond: 'e_coli_ablauf <= 1000 AND enterokokken_ablauf <= 400', sev: 'block' },
  { ws: 'M205-10', code: 'CR-14-2', cond: 'e_coli_ablauf <= 1000 AND enterokokken_ablauf <= 400', sev: 'block' },
  { ws: 'M205-10', code: 'CR-15', cond: 'e_coli_ablauf <= 900 AND enterokokken_ablauf <= 330', sev: 'block' },
  { ws: 'M205-10', code: 'CR-15-2', cond: 'e_coli_ablauf <= 900 AND enterokokken_ablauf <= 330', sev: 'block' },
  { ws: 'M205-10', code: 'CR-16', cond: 'e_coli_ablauf <= 500 AND enterokokken_ablauf <= 200', sev: 'block' },
  { ws: 'M205-10', code: 'CR-16-2', cond: 'e_coli_ablauf <= 500 AND enterokokken_ablauf <= 200', sev: 'block' },
  { ws: 'M205-10', code: 'CR-17', cond: 'e_coli_ablauf <= 500 AND enterokokken_ablauf <= 185', sev: 'block' },
  { ws: 'M205-10', code: 'CR-17-2', cond: 'e_coli_ablauf <= 500 AND enterokokken_ablauf <= 185', sev: 'block' },
  { ws: 'M205-10', code: 'CR-20', cond: 'log_reduktion >= 3', sev: 'block' },
  { ws: 'M205-10', code: 'CR-20-2', cond: 'log_reduktion >= 3', sev: 'block' },
  { ws: 'M205-10', code: 'CR-21', cond: 'ozon_pro_doc < 0.8', sev: 'block' },
  { ws: 'M205-10', code: 'CR-22', cond: 'entchlorungsstufe == True', sev: 'block' },
  { ws: 'M205-10', code: 'CR-24', cond: 'kontaktzeit_chlor >= 15 AND kontaktzeit_chlor <= 30', sev: 'block' },
  { ws: 'M205-10', code: 'CR-26', cond: 'temperatur_ozonentfernung >= 350 OR katalytisch == True', sev: 'block' },
  { ws: 'M205-10', code: 'CR-28', cond: 'durchfluss_max <= 1000 OR mehrstrassige_anlage == True', sev: 'block' },
  { ws: 'M205-10', code: 'CR-29', cond: 'ip_schutzart IN {IP54, IP55, IP56, IP65, IP66, IP67}', sev: 'block' },
  { ws: 'M205-10', code: 'CR-34', cond: 'afs > 0 AND vorsiebung_erforderlich IN {ja, nein}', sev: 'block' },
  // M205-12 Betrieb UV
  { ws: 'M205-12', code: 'CR-33', cond: 'hg_strahler_sonderentsorgung == True', sev: 'block' },
  { ws: 'M205-12', code: 'CR-33-2', cond: 'hg_strahler_sonderentsorgung == True', sev: 'block' },
  // M205-14 Membranverfahren
  { ws: 'M205-14', code: 'CR-25', cond: 'pilotierung == True', sev: 'block' },
  { ws: 'M205-14', code: 'CR-25-2', cond: 'pilotierung == True', sev: 'block' },
  // M205-17 Ozonung Bemessung
  { ws: 'M205-17', code: 'CR-35', cond: 'reaktor_gasdicht == True', sev: 'block' },
  { ws: 'M205-17', code: 'CR-35-2', cond: 'reaktor_gasdicht == True', sev: 'block' },
  // M205-18 Restozonentfernung (cross-ws source home for temperatur/katalytisch)
  { ws: 'M205-18', code: 'CR-26', cond: 'temperatur_ozonentfernung >= 350 OR katalytisch == True', sev: 'block' },
  // M205-22 PES
  { ws: 'M205-22', code: 'CR-36', cond: 'bgv_b4_konformitaet == True AND sicherheitsdatenblatt_pes == True', sev: 'block' },
  { ws: 'M205-22', code: 'CR-36-2', cond: 'bgv_b4_konformitaet == True AND sicherheitsdatenblatt_pes == True', sev: 'block' },
] as const;

export type M205Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  instances: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
  /** symbol → home worksheet code (single-home topology) */
  symbolHome: Record<string, string>;
};

export async function seedM205(sql: postgres.Sql, userId: string): Promise<M205Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm205-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M205 Harness Org', ${'m205-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M205-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-205', 'DWA-M 205 (harness)', 'harness') RETURNING id`;

  // Group home fields by worksheet.
  const fieldsByWs: Record<string, Array<{ symbol: string; dataType: DType }>> = {};
  for (const ws of M205_WORKSHEETS) fieldsByWs[ws] = [];
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) {
    fieldsByWs[home.ws].push({ symbol, dataType: home.dataType });
  }

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of M205_WORKSHEETS) {
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

  // Seed the live gates against their home worksheet templates (block + warn).
  for (const g of M205_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  const symbolHome: Record<string, string> = {};
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) symbolHome[symbol] = home.ws;

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
