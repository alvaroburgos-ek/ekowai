/**
 * DIN 276 ("Kosten im Bauwesen" / Costs in construction, DIN 276:2018-12) — minimal
 * fixture for the REAL save-path gate-execution-proof harness.
 *
 * SOURCE PRESENT: DIN-276.pdf + DIN-276.md are in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-276\). This wave is a FULL
 * document comparison; the equation rollups + identities were verified symbol-by-symbol
 * against the printed KG tree (§5.4 Tab.1) and the §3.11/§3.12/§3.13 definitions. This
 * fixture is the EXECUTION half: it proves each live BLOCK gate enforces BOTH ways
 * through the real save path. Conditions are pulled verbatim from prod
 * compliance_requirements (standard DIN-276 = 505b6d2c-b6f4-4f2e-b51a-adc52243d14e,
 * project vadsmshzebefjreqcicl, this session). Nothing is applied to prod.
 *
 * PROOF MANDATE: DIN-276's gate enforcement is claimable ONLY by EXECUTION. This fixture
 * drives the standard's 27 live BLOCK gates (every compliance_requirement with
 * severity='block' + a non-empty condition) through the REAL `saveWorksheet` (values
 * persist to project_parameters) and the REAL `checkApprovalGate` (the engineer-approve
 * enforcement read path that replays each block condition against the saved values).
 * Each gate is demonstrated BOTH ways — a state that PASSES it and a state that VIOLATES
 * it, reaching a definite `fail` — so a gate that fires but never enforces (the F-4
 * lesson) cannot hide. There are NO literal-TRUE no-op gates in DIN-276 (unlike M-349):
 * all 27 block gates are drivable to a definite fail.
 *
 * TOPOLOGY (verbatim from prod): 29 worksheet_templates (DIN-276-01 … DIN-276-29), ~600
 * active fields, 54 equations (50 KG rollups + 4 §3 identities), 32
 * compliance_requirements (27 severity='block' with non-empty condition + 5 severity=
 * 'warn' with empty condition). The fixture seeds only the 12 worksheets that host a
 * block gate or a cross-read field home, and only the 36 fields the 27 gates read; each
 * gate symbol is homed on exactly ONE worksheet (single-home topology — verified against
 * prod), so the project-wide fallback in checkApprovalGate resolves every cross-worksheet
 * operand without conflict.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing, two cases):
 *   - REQ-08 (home DIN-276-02) guards on `multi_building`, whose field home is
 *     DIN-276-01 → resolved cross-worksheet via the conflict-free fallback.
 *     (`separate_calculations_per_building`, the guard body, is local to DIN-276-02.)
 *   - REQ-25 (home DIN-276-25) is the arithmetic identity
 *     `building_costs == kg_300_total + kg_400_total`: `building_costs` is local to
 *     DIN-276-25, but `kg_300_total` (home DIN-276-11) and `kg_400_total` (home
 *     DIN-276-12) resolve cross-worksheet. This is the §3.12 Bauwerkskosten rollup —
 *     the RHS is a real arithmetic expression, so the evaluator routes it through the
 *     numeric acompare path (NOT the legacy bare-ident string-literal path), and the
 *     gate enforces the identity numerically.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod enum
 * values — NONE of the 4 known engine traps are present in DIN-276):
 *   1. bare-ident-RHS `field == field` / `field != field`: NONE. REQ-25's `==` RHS is
 *      an ARITHMETIC expression (`kg_300_total + kg_400_total`) → acompare (numeric),
 *      not a bare ident. The `== True`/`== true` gates (REQ-02/16-20/30/21-23/31/32/24)
 *      have a boolean-KEYWORD RHS (tokenized case-insensitively to the TRUE literal),
 *      not a bare identifier. No `!=` gate exists at all.
 *   2. `!= null` / `== null` block gate: NONE. Every existence gate uses the
 *      `IS NOT NULL` (REQ-03/04/24) or `IS NOT EMPTY` (REQ-05/06/07) form → the
 *      `exists` path → reaches a definite fail when the value is absent.
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. REQ-01's members
 *      {building,civil_engineering,infrastructure,open_space} and REQ-15's
 *      {gross,net,mixed} match the prod enum values EXACTLY (lowercase), so the
 *      membership tests resolve.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. Every IF/THEN
 *      gate (REQ-08/10/11/12/13/14) is a SINGLE guard whose body is one comparison —
 *      no nesting, parses unambiguously.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing
 * is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the 36 symbols the 27 block
 * gates read are seeded.
 */
export const DIN276_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'DIN-276-01': [
    { symbol: 'project_type', dataType: 'enum' },
    { symbol: 'multi_building', dataType: 'boolean' }, // read cross-ws by REQ-08 (home DIN-276-02)
  ],
  'DIN-276-02': [
    { symbol: 'project_scope_description', dataType: 'text' },
    { symbol: 'separate_calculations_per_building', dataType: 'boolean' },
  ],
  'DIN-276-03': [
    { symbol: 'cost_status_date', dataType: 'date' },
    { symbol: 'input_documents_register', dataType: 'json' },
    { symbol: 'cost_calculation_method', dataType: 'text' },
    { symbol: 'vat_treatment', dataType: 'enum' },
  ],
  'DIN-276-08': [
    { symbol: 'existing_substance_value', dataType: 'number' },
    { symbol: 'separately_shown_existing_substance', dataType: 'boolean' },
    { symbol: 'contributed_goods_value', dataType: 'number' },
    { symbol: 'separately_shown_contributed_goods', dataType: 'boolean' },
    { symbol: 'special_costs_value', dataType: 'number' },
    { symbol: 'separately_shown_special_costs', dataType: 'boolean' },
    { symbol: 'forecasted_costs_value', dataType: 'number' },
    { symbol: 'forecasted_costs_assumptions_stated', dataType: 'boolean' },
    { symbol: 'risk_costs_value', dataType: 'number' },
    { symbol: 'separately_shown_risk_costs', dataType: 'boolean' },
  ],
  'DIN-276-09': [
    { symbol: 'attest_din_276_09_req_02', dataType: 'boolean' },
  ],
  'DIN-276-11': [
    { symbol: 'kg_300_total', dataType: 'number' }, // read cross-ws by REQ-25 (home DIN-276-25)
  ],
  'DIN-276-12': [
    { symbol: 'kg_400_total', dataType: 'number' }, // read cross-ws by REQ-25 (home DIN-276-25)
  ],
  'DIN-276-18': [
    { symbol: 'attest_din_276_18_req_16', dataType: 'boolean' },
    { symbol: 'attest_din_276_18_req_17', dataType: 'boolean' },
    { symbol: 'attest_din_276_18_req_18', dataType: 'boolean' },
    { symbol: 'attest_din_276_18_req_19', dataType: 'boolean' },
    { symbol: 'attest_din_276_18_req_20', dataType: 'boolean' },
    { symbol: 'attest_din_276_18_req_30', dataType: 'boolean' },
  ],
  'DIN-276-23': [
    { symbol: 'GK_total', dataType: 'number' },
  ],
  'DIN-276-25': [
    { symbol: 'building_costs', dataType: 'number' },
  ],
  'DIN-276-26': [
    { symbol: 'attest_din_276_26_req_21', dataType: 'boolean' },
    { symbol: 'attest_din_276_26_req_22', dataType: 'boolean' },
    { symbol: 'attest_din_276_26_req_23', dataType: 'boolean' },
    { symbol: 'attest_din_276_26_req_31', dataType: 'boolean' },
    { symbol: 'attest_din_276_26_req_32', dataType: 'boolean' },
  ],
  'DIN-276-28': [
    { symbol: 'cost_target_value', dataType: 'number' },
    { symbol: 'feasibility_checked', dataType: 'boolean' },
  ],
};

/** Worksheets to instantiate (12 — gate homes + the two cross-read field homes). */
export const DIN276_WORKSHEETS = [
  'DIN-276-01', 'DIN-276-02', 'DIN-276-03', 'DIN-276-08', 'DIN-276-09',
  'DIN-276-11', 'DIN-276-12', 'DIN-276-18', 'DIN-276-23', 'DIN-276-25',
  'DIN-276-26', 'DIN-276-28',
] as const;

/** All 27 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const DIN276_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // DIN-276-01 — Projektregistrierung (§1 scope)
  { ws: 'DIN-276-01', code: 'REQ-01', cond: 'project_type IN {building,civil_engineering,infrastructure,open_space}', sev: 'block' },
  // DIN-276-02 — Gebäude-/Anlagen-Umfangsdefinition (§4.2.6, §4.2.8)
  { ws: 'DIN-276-02', code: 'REQ-06', cond: 'project_scope_description IS NOT EMPTY', sev: 'block' },
  { ws: 'DIN-276-02', code: 'REQ-08', cond: 'IF multi_building THEN separate_calculations_per_building', sev: 'block' },
  // DIN-276-03 — Planungsstand & Datenquellen (§4.2.4/5/7/15)
  { ws: 'DIN-276-03', code: 'REQ-04', cond: 'cost_status_date IS NOT NULL', sev: 'block' },
  { ws: 'DIN-276-03', code: 'REQ-05', cond: 'input_documents_register IS NOT EMPTY', sev: 'block' },
  { ws: 'DIN-276-03', code: 'REQ-07', cond: 'cost_calculation_method IS NOT EMPTY', sev: 'block' },
  { ws: 'DIN-276-03', code: 'REQ-15', cond: 'vat_treatment IN {gross,net,mixed}', sev: 'block' },
  // DIN-276-08 — Vorhandene Bausubstanz & Sonderkosten (§4.2.10-14) — single IF/THEN guards
  { ws: 'DIN-276-08', code: 'REQ-10', cond: 'IF existing_substance_value > 0 THEN separately_shown_existing_substance == true', sev: 'block' },
  { ws: 'DIN-276-08', code: 'REQ-11', cond: 'IF contributed_goods_value > 0 THEN separately_shown_contributed_goods == true', sev: 'block' },
  { ws: 'DIN-276-08', code: 'REQ-12', cond: 'IF special_costs_value > 0 THEN separately_shown_special_costs == true', sev: 'block' },
  { ws: 'DIN-276-08', code: 'REQ-13', cond: 'IF forecasted_costs_value > 0 THEN forecasted_costs_assumptions_stated == true', sev: 'block' },
  { ws: 'DIN-276-08', code: 'REQ-14', cond: 'IF risk_costs_value > 0 THEN separately_shown_risk_costs == true', sev: 'block' },
  // DIN-276-09 — KG 100 (§5.1 attest)
  { ws: 'DIN-276-09', code: 'REQ-02', cond: 'attest_din_276_09_req_02 == True', sev: 'block' },
  // DIN-276-18 — Kostenrahmen (§4.3.2-7 attests)
  { ws: 'DIN-276-18', code: 'REQ-16', cond: 'attest_din_276_18_req_16 == True', sev: 'block' },
  { ws: 'DIN-276-18', code: 'REQ-17', cond: 'attest_din_276_18_req_17 == True', sev: 'block' },
  { ws: 'DIN-276-18', code: 'REQ-18', cond: 'attest_din_276_18_req_18 == True', sev: 'block' },
  { ws: 'DIN-276-18', code: 'REQ-19', cond: 'attest_din_276_18_req_19 == True', sev: 'block' },
  { ws: 'DIN-276-18', code: 'REQ-20', cond: 'attest_din_276_18_req_20 == True', sev: 'block' },
  { ws: 'DIN-276-18', code: 'REQ-30', cond: 'attest_din_276_18_req_30 == True', sev: 'block' },
  // DIN-276-23 — Gesamtkostenkompilation (§4.2.3)
  { ws: 'DIN-276-23', code: 'REQ-03', cond: 'GK_total IS NOT NULL', sev: 'block' },
  // DIN-276-25 — Bauwerkskosten-Übersicht (§3.12 arithmetic identity, cross-worksheet RHS)
  { ws: 'DIN-276-25', code: 'REQ-25', cond: 'building_costs == kg_300_total + kg_400_total', sev: 'block' },
  // DIN-276-26 — Kostenkontrolle (§4.4/§4.5/§4.1 attests)
  { ws: 'DIN-276-26', code: 'REQ-21', cond: 'attest_din_276_26_req_21 == True', sev: 'block' },
  { ws: 'DIN-276-26', code: 'REQ-22', cond: 'attest_din_276_26_req_22 == True', sev: 'block' },
  { ws: 'DIN-276-26', code: 'REQ-23', cond: 'attest_din_276_26_req_23 == True', sev: 'block' },
  { ws: 'DIN-276-26', code: 'REQ-31', cond: 'attest_din_276_26_req_31 == True', sev: 'block' },
  { ws: 'DIN-276-26', code: 'REQ-32', cond: 'attest_din_276_26_req_32 == True', sev: 'block' },
  // DIN-276-28 — Kostenvorgabe-Konformität (§4.6.2)
  { ws: 'DIN-276-28', code: 'REQ-24', cond: 'cost_target_value IS NOT NULL AND feasibility_checked == true', sev: 'block' },
] as const;

export type DIN276Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
  /** symbol → home worksheet code (single-home topology) */
  symbolHome: Record<string, string>;
};

export async function seedDIN276(sql: postgres.Sql, userId: string): Promise<DIN276Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'din276-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('DIN276 Harness Org', ${'din276-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'DIN276-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DIN-276', 'DIN 276 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of DIN276_WORKSHEETS) {
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
    for (const f of DIN276_FIELDS[ws]) {
      // active=true; is_required deliberately FALSE so the per-gate proof isolates the
      // block-CONDITION path (checkApprovalGate's separate missing-required-field list
      // is not what we are proving here). gateBlocks() reads only failingBlockConditions.
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
      symbolHome[f.symbol] = ws;
    }
  }

  // Seed the 27 live BLOCK gates against their home worksheet templates.
  for (const g of DIN276_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
