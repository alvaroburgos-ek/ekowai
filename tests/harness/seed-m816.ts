/**
 * DWA-M-816 (Merkblatt DWA-M 816 — Projektbewertung betrieblicher Ersatz- und
 * Erneuerungsinvestitionen auf Basis der dynamischen Kostenvergleichsrechnung;
 * Weißdruck, Oktober 2021, 1. Auflage) — minimal fixture for the REAL save-path
 * gate-execution-proof harness.
 *
 * PROOF MANDATE: M-816's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's live BLOCK gates (every compliance_requirement with
 * severity='block' + a non-empty condition) through the REAL `saveWorksheet` (values
 * persist to project_parameters) and the REAL `checkApprovalGate` (the engineer-approve
 * enforcement read path that replays each block condition against the saved values).
 * Each gate is demonstrated BOTH ways — a state that PASSES it and a state that
 * VIOLATES it, reaching a definite `fail` — so a gate that fires but never enforces
 * (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard DWA-M-816 =
 * 474fdd9b-d351-4472-b2e8-c2c5f52e1f1b, project vadsmshzebefjreqcicl, this session):
 *   - 30 worksheet_templates (M816-01 … M816-30); 199 active fields; 30 equations;
 *     26 compliance_requirements — 10 severity='block' with a non-empty condition.
 *   - The fixture seeds the 9 worksheets that host a live BLOCK gate OR a gate
 *     symbol's single home: M816-01,02,04,08,09,19,21,22,30.
 *
 * SINGLE-HOME TOPOLOGY (load-bearing — mirrors prod's cross-worksheet fallback):
 *   Each gate symbol is seeded exactly ONCE, on the SYMBOL_HOME worksheet below. A
 *   gate on the symbol's home resolves it locally; a gate on any OTHER worksheet
 *   resolves it via the conflict-free project-wide fallback (approval-gate.ts
 *   buildFallbackValues / makeGateLookup). REQ-11 (vorlauf_v@M816-21, p_v_percent@
 *   M816-09) and REQ-14 (n_a/n_b@M816-08, partial_replication_flag@M816-02,
 *   n_tr@M816-22) both live on M816-19 and read ALL their symbols via fallback.
 *
 * Conditions verbatim from prod; nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date';

/** Single home worksheet per gate symbol (verbatim data_type from prod fields). */
export const SYMBOL_HOME: Record<string, { ws: string; dataType: DType }> = {
  // M816-01 Projektregistrierung (REQ-01/02/03/05 all local)
  investment_type: { ws: 'M816-01', dataType: 'enum' },
  methodology_confirmation: { ws: 'M816-01', dataType: 'enum' },
  evaluation_basis: { ws: 'M816-01', dataType: 'enum' },
  attest_m816_01_req_05: { ws: 'M816-01', dataType: 'boolean' },
  // M816-02 Definition der Investitionsalternativen (REQ-04 local; flag = fallback source)
  alternative_count: { ws: 'M816-02', dataType: 'number' },
  partial_replication_flag: { ws: 'M816-02', dataType: 'boolean' },
  // M816-04 Finanzmarktparameter (REQ-09 local)
  discounting_method: { ws: 'M816-04', dataType: 'enum' },
  bundesbank_reference_date: { ws: 'M816-04', dataType: 'date' },
  // M816-08 Nutzungsdauer & Betrachtungszeitraum (REQ-13 local; also REQ-14 fallback source)
  n_a: { ws: 'M816-08', dataType: 'number' },
  n_b: { ws: 'M816-08', dataType: 'number' },
  n_observation_period: { ws: 'M816-08', dataType: 'number' },
  // M816-09 Inflation & Preisentwicklung (REQ-11 fallback source)
  p_v_percent: { ws: 'M816-09', dataType: 'number' },
  // M816-21 Besondere Zahlungsmerkmale (REQ-11 fallback source)
  vorlauf_v: { ws: 'M816-21', dataType: 'number' },
  // M816-22 Teilreplikation (REQ-14 fallback source)
  n_tr: { ws: 'M816-22', dataType: 'number' },
  // M816-30 Compliance- & Entscheidungs-Zusammenfassung (REQ-26 local)
  gesamtbeurteilung: { ws: 'M816-30', dataType: 'text' },
};

/** Worksheets that must exist as instances (gate homes + field homes). */
export const M816_WORKSHEETS = [
  'M816-01', 'M816-02', 'M816-04', 'M816-08', 'M816-09',
  'M816-19', 'M816-21', 'M816-22', 'M816-30',
] as const;

/** All 10 live BLOCK gates (non-empty condition), verbatim from prod
 *  compliance_requirements (worksheet_template.code, code, condition). */
export const M816_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M816-01 Projektregistrierung
  { ws: 'M816-01', code: 'REQ-01', cond: 'investment_type IN {ersatz, erneuerung}', sev: 'block' },
  { ws: 'M816-01', code: 'REQ-02', cond: 'methodology_confirmation == dyn_cost_comp_arbf', sev: 'block' },
  { ws: 'M816-01', code: 'REQ-03', cond: 'evaluation_basis IN {nominal, real}', sev: 'block' },
  { ws: 'M816-01', code: 'REQ-05', cond: 'attest_m816_01_req_05 == True', sev: 'block' },
  // M816-02 Investitionsalternativen
  { ws: 'M816-02', code: 'REQ-04', cond: 'alternative_count >= 2', sev: 'block' },
  // M816-04 Finanzmarktparameter
  { ws: 'M816-04', code: 'REQ-09', cond: 'IF discounting_method == "duration_dep" THEN bundesbank_reference_date IS NOT NULL', sev: 'block' },
  // M816-08 Nutzungsdauer & Betrachtungszeitraum
  { ws: 'M816-08', code: 'REQ-13', cond: 'IF n_a >= n_b THEN n_observation_period == n_a AND IF n_b >= n_a THEN n_observation_period == n_b', sev: 'block' },
  // M816-19 Durationsberechnung (cross-worksheet fallback gates)
  { ws: 'M816-19', code: 'REQ-11', cond: 'vorlauf_v >= 0 AND p_v_percent IS NOT NULL', sev: 'block' },
  { ws: 'M816-19', code: 'REQ-14', cond: 'IF n_a != n_b THEN partial_replication_flag == TRUE AND n_tr IS NOT NULL', sev: 'block' },
  // M816-30 Gesamtbeurteilung
  { ws: 'M816-30', code: 'REQ-26', cond: 'gesamtbeurteilung IS NOT EMPTY', sev: 'block' },
] as const;

export type M816Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  instances: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
  /** symbol → home worksheet code (single-home topology) */
  symbolHome: Record<string, string>;
};

export async function seedM816(sql: postgres.Sql, userId: string): Promise<M816Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm816-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M816 Harness Org', ${'m816-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M816-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-816', 'DWA-M 816 (harness)', 'harness') RETURNING id`;

  // Group home fields by worksheet.
  const fieldsByWs: Record<string, Array<{ symbol: string; dataType: DType }>> = {};
  for (const ws of M816_WORKSHEETS) fieldsByWs[ws] = [];
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) {
    fieldsByWs[home.ws].push({ symbol, dataType: home.dataType });
  }

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of M816_WORKSHEETS) {
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
  for (const g of M816_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  const symbolHome: Record<string, string> = {};
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) symbolHome[symbol] = home.ws;

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
