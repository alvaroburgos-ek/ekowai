/**
 * ISO 59020:2024 ("Circular economy — Measuring and assessing circularity
 * performance", First edition 2024-05) — CURRENT-PROD fixture for the REAL
 * save-path gate-execution-proof + engine symbol-verify harness.
 *
 * This is a MEASUREMENT standard: its normative core is Annex A's 13 core
 * circularity indicators (inflow/outflow reused-recycled-renewable content,
 * lifetime ratio, energy/water/economic indicators) plus the 100 % resource
 * balance (Figures A.1/A.2). The encoding carries 9 worksheets, 13 BLOCK gates,
 * 24 WARN gates, and 13 equations — all VERBATIM from prod (standard
 * 32989676-fe2a-47a3-8669-c51d893dbd2d, project vadsmshzebefjreqcicl, re-pulled
 * this session, R-2).
 *
 * The 13 BLOCK gates split into three engine shapes (all proven BOTH ways in the
 * verify test through the REAL saveWorksheet → checkApprovalGate chain):
 *   - 4 boolean attestations `flag == true`      (CR-005/006/009/031)
 *   - 6 arithmetic identity checks `pct == (m/mT)*100` (CR-011/012/013/015/016/017)
 *   - 2 sum-to-100 balance checks `a+b+c+d == 100`      (CR-014 inflow, CR-019 outflow)
 *   - 1 multi-field existence gate `a IS NOT NULL AND …` (CR-018)
 * The arithmetic gates use `acompare` (RHS has +,-,*,/), NOT the bare-ident-RHS
 * trap; the existence gate uses the correct `IS NOT NULL`, NOT the never-fail
 * `!= null` trap-2 shape. No IN / IF / TRUE-literal / empty-condition BLOCK gate.
 *
 * The 13 equations are driven through the REAL `evaluateFormula`. Their printed
 * formulas use ISO's `mREUI(X)` paren notation and a mix of `%REUI(X)` / `PRENI(X)`
 * LHS symbols — the engine's `normalizeFormula` rewrites `ident(X)` → `ident_X` and
 * `rhs()` strips the LHS, so all 13 reduce to a computable dot-decimal RHS over the
 * declared underscore-form input symbols and COMPUTE. Verbatim source: rendered
 * PDF Annex A (SR-3), Formulas (A.1)–(A.13); (A.8) `·100` confirmed on printed p.39.
 * No prod credentials; disposable embedded PG. Nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type FType = 'boolean' | 'text' | 'number' | 'enum';

/** All 13 prod equations (formula + output_symbol + input_symbols VERBATIM from
 *  prod). Driven through the REAL evaluateFormula in the verify test. `cls`:
 *   ratio  — a/b (or (a/b)*100) percentage/ratio indicator, engine-computable → VA
 *  Every formula is a plain dot-decimal RHS after LHS-strip + normalizeFormula:
 *  no comma-decimals, no Sum()/Σ, no unsupported call ⇒ all COMPUTE. */
export const ISO59020_EQUATIONS: ReadonlyArray<{
  num: string; out: string; formula: string; inputs: string[]; cls: string; src: string;
}> = [
  { num: 'A.1',  out: 'pct_REUI_X',   formula: 'pct_REUI_X = (mREUI(X) / mTI(X)) * 100',                              inputs: ['mREUI_X', 'mTI_X'],                       cls: 'ratio', src: 'Formula (A.1) §A.2.2 p.32' },
  { num: 'A.2',  out: 'pct_RECI_X',   formula: 'pct_RECI_X = (mRECI(X) / mTI(X)) * 100',                              inputs: ['mRECI_X', 'mTI_X'],                       cls: 'ratio', src: 'Formula (A.2) §A.2.3 p.32' },
  { num: 'A.3',  out: 'pct_RENI_X',   formula: 'PRENI(X) = (mRENI(X) / mTI(X)) * 100',                                inputs: ['mRENI_X', 'mTI_X'],                       cls: 'ratio', src: 'Formula (A.3) §A.2.4 p.33 (printed LHS "PRENI(X)")' },
  { num: 'A.4',  out: 'RLP_X',        formula: 'RLP(X) = tLP(X) / tIALP(X)',                                          inputs: ['tLP_X', 'tIALP_X'],                       cls: 'ratio', src: 'Formula (A.4) §A.3.2 p.36' },
  { num: 'A.5',  out: 'pct_REUO_X',   formula: 'PREUO(X) = (mREUO(X) / mTO(X)) * 100',                                inputs: ['mREUO_X', 'mTO_X'],                       cls: 'ratio', src: 'Formula (A.5) §A.3.3 p.36' },
  { num: 'A.6',  out: 'pct_RECO_X',   formula: 'PRECO(X) = (mRECO(X) / mTO(X)) * 100',                                inputs: ['mRECO_X', 'mTO_X'],                       cls: 'ratio', src: 'Formula (A.6) §A.3.4 p.37' },
  { num: 'A.7',  out: 'pct_RENO_X',   formula: 'PRENO(X) = (mRENO(X) / mTO(X)) * 100',                                inputs: ['mRENO_X', 'mTO_X'],                       cls: 'ratio', src: 'Formula (A.7) §A.3.5 p.37' },
  { num: 'A.8',  out: 'pct_ECONRE_X', formula: 'PECONRE(X) = ((EIRENE(X) - EORENE(X)) / (EITE(X) - EOTE(X))) * 100',  inputs: ['EIRENE_X', 'EORENE_X', 'EITE_X', 'EOTE_X'], cls: 'ratio', src: 'Formula (A.8) §A.4.2 p.39 (·100 confirmed on rendered page)' },
  { num: 'A.9',  out: 'pct_CWW',      formula: 'PCWW = (VCIW / VAIW) * 100',                                          inputs: ['VCIW', 'VAIW'],                           cls: 'ratio', src: 'Formula (A.9) §A.5.2 p.40' },
  { num: 'A.10', out: 'pct_CDW',      formula: 'PCDW = (VCDW / VAIW) * 100',                                          inputs: ['VCDW', 'VAIW'],                           cls: 'ratio', src: 'Formula (A.10) §A.5.3 p.40' },
  { num: 'A.11', out: 'RWRR',         formula: 'RWRR = VTWU / VTWW',                                                  inputs: ['VTWU', 'VTWW'],                           cls: 'ratio', src: 'Formula (A.11) §A.5.4 p.41' },
  { num: 'A.12', out: 'RMP',          formula: 'RMP = C / D',                                                        inputs: ['C', 'D'],                                 cls: 'ratio', src: 'Formula (A.12) §A.6.2 p.42' },
  { num: 'A.13', out: 'IRII',         formula: 'IRII = E / F',                                                       inputs: ['E', 'F'],                                 cls: 'ratio', src: 'Formula (A.13) §A.6.3 p.42' },
];

/** All 37 prod compliance gates (13 block + 24 warn), conditions + severities
 *  VERBATIM from prod compliance_requirements. Nothing is fixed here. */
export const ISO59020_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // ── 13 BLOCK gates ──
  { ws: 'ISO-59020-03', code: 'CR-005', sev: 'block', cond: 'all_flows_quantified == true' },
  { ws: 'ISO-59020-03', code: 'CR-006', sev: 'block', cond: 'resource_balance_applied == true' },
  { ws: 'ISO-59020-04', code: 'CR-009', sev: 'block', cond: 'mandatory_core_indicators_included == true' },
  { ws: 'ISO-59020-05', code: 'CR-011', sev: 'block', cond: 'pct_REUI_X == (mREUI_X / mTI_X) * 100' },
  { ws: 'ISO-59020-05', code: 'CR-012', sev: 'block', cond: 'pct_RECI_X == (mRECI_X / mTI_X) * 100' },
  { ws: 'ISO-59020-05', code: 'CR-013', sev: 'block', cond: 'pct_RENI_X == (mRENI_X / mTI_X) * 100' },
  { ws: 'ISO-59020-05', code: 'CR-014', sev: 'block', cond: 'pct_REUI_X + pct_RECI_X + pct_RENI_X + pct_linear_inflow == 100' },
  { ws: 'ISO-59020-06', code: 'CR-015', sev: 'block', cond: 'pct_REUO_X == (mREUO_X / mTO_X) * 100' },
  { ws: 'ISO-59020-06', code: 'CR-016', sev: 'block', cond: 'pct_RECO_X == (mRECO_X / mTO_X) * 100' },
  { ws: 'ISO-59020-06', code: 'CR-017', sev: 'block', cond: 'pct_RENO_X == (mRENO_X / mTO_X) * 100' },
  { ws: 'ISO-59020-06', code: 'CR-018', sev: 'block', cond: 'pct_REUO_X IS NOT NULL AND pct_RECO_X IS NOT NULL AND pct_RENO_X IS NOT NULL' },
  { ws: 'ISO-59020-06', code: 'CR-019', sev: 'block', cond: 'pct_REUO_X + pct_RECO_X + pct_RENO_X + pct_linear_outflow == 100' },
  { ws: 'ISO-59020-09', code: 'CR-031', sev: 'block', cond: 'criteria_review_done == true' },
  // ── 24 WARN gates (verbatim; a representative few driven "never blocks" in the test) ──
  { ws: 'ISO-59020-01', code: 'CR-001', sev: 'warn', cond: 'system_in_focus IS NOT NULL AND system_level IS NOT NULL' },
  { ws: 'ISO-59020-02', code: 'CR-002', sev: 'warn', cond: 'circular_economy_principle IS NOT NULL' },
  { ws: 'ISO-59020-02', code: 'CR-003', sev: 'warn', cond: 'measurement_principle IS NOT NULL' },
  { ws: 'ISO-59020-02', code: 'CR-004', sev: 'warn', cond: 'all_stages_documented == true' },
  { ws: 'ISO-59020-03', code: 'CR-007', sev: 'warn', cond: 'circular_goal IS NOT NULL AND system_boundary IS NOT NULL AND data_quality_requirement IS NOT NULL AND interested_parties IS NOT NULL AND internal_or_external_use IS NOT NULL' },
  { ws: 'ISO-59020-03', code: 'CR-008', sev: 'warn', cond: '' },
  { ws: 'ISO-59020-04', code: 'CR-010', sev: 'warn', cond: '' },
  { ws: 'ISO-59020-07', code: 'CR-020', sev: 'warn', cond: 'pct_ECONRE_X == ((EIRENE_X - EORENE_X) / (EITE_X - EOTE_X)) * 100' },
  { ws: 'ISO-59020-07', code: 'CR-021', sev: 'warn', cond: 'pct_CWW == (VCIW / VAIW) * 100' },
  { ws: 'ISO-59020-07', code: 'CR-022', sev: 'warn', cond: 'pct_CDW == (VCDW / VAIW) * 100' },
  { ws: 'ISO-59020-07', code: 'CR-023', sev: 'warn', cond: 'RWRR == VTWU / VTWW' },
  { ws: 'ISO-59020-07', code: 'CR-024', sev: 'warn', cond: 'RMP == C / D' },
  { ws: 'ISO-59020-07', code: 'CR-025', sev: 'warn', cond: 'IRII == E / F' },
  { ws: 'ISO-59020-08', code: 'CR-026', sev: 'warn', cond: 'system_breakdown_done == true' },
  { ws: 'ISO-59020-08', code: 'CR-027', sev: 'warn', cond: 'data_normalized == true AND data_completeness_checked == true' },
  { ws: 'ISO-59020-08', code: 'CR-028', sev: 'warn', cond: 'primary_data_preference == true AND data_traceability == true' },
  { ws: 'ISO-59020-08', code: 'CR-029', sev: 'warn', cond: 'data_traceability == true' },
  { ws: 'ISO-59020-08', code: 'CR-030', sev: 'warn', cond: 'documentation_complete == true' },
  { ws: 'ISO-59020-09', code: 'CR-032', sev: 'warn', cond: 'value_impact_assessed == true' },
  { ws: 'ISO-59020-09', code: 'CR-033', sev: 'warn', cond: 'interested_parties_consulted == true' },
  { ws: 'ISO-59020-09', code: 'CR-034', sev: 'warn', cond: 'report_transparency == true' },
  { ws: 'ISO-59020-09', code: 'CR-035', sev: 'warn', cond: 'information_verifiable == true' },
  { ws: 'ISO-59020-09', code: 'CR-036', sev: 'warn', cond: '' },
  { ws: 'ISO-59020-09', code: 'CR-037', sev: 'warn', cond: '' },
];

/** The 9 worksheet codes (topology parity with prod). */
export const ISO59020_WORKSHEETS: readonly string[] = [
  'ISO-59020-01', 'ISO-59020-02', 'ISO-59020-03', 'ISO-59020-04', 'ISO-59020-05',
  'ISO-59020-06', 'ISO-59020-07', 'ISO-59020-08', 'ISO-59020-09',
];

/** Fields seeded per HOME worksheet — every BLOCK gate read symbol + the fields
 *  a spot-checked WARN gate reads (data_type verbatim from prod). Equation inputs
 *  are NOT seeded as DB fields: evaluateFormula is a pure function driven from the
 *  ISO59020_EQUATIONS array, not the DB. */
export const ISO59020_FIELDS: Record<string, Array<{ symbol: string; dataType: FType }>> = {
  'ISO-59020-01': [],
  'ISO-59020-02': [{ symbol: 'all_stages_documented', dataType: 'boolean' }], // WARN CR-004 spot-check
  'ISO-59020-03': [
    { symbol: 'all_flows_quantified', dataType: 'boolean' },      // CR-005
    { symbol: 'resource_balance_applied', dataType: 'boolean' },  // CR-006
  ],
  'ISO-59020-04': [{ symbol: 'mandatory_core_indicators_included', dataType: 'boolean' }], // CR-009
  'ISO-59020-05': [
    { symbol: 'pct_REUI_X', dataType: 'number' }, { symbol: 'mREUI_X', dataType: 'number' },
    { symbol: 'pct_RECI_X', dataType: 'number' }, { symbol: 'mRECI_X', dataType: 'number' },
    { symbol: 'pct_RENI_X', dataType: 'number' }, { symbol: 'mRENI_X', dataType: 'number' },
    { symbol: 'mTI_X', dataType: 'number' }, { symbol: 'pct_linear_inflow', dataType: 'number' },
  ],
  'ISO-59020-06': [
    { symbol: 'pct_REUO_X', dataType: 'number' }, { symbol: 'mREUO_X', dataType: 'number' },
    { symbol: 'pct_RECO_X', dataType: 'number' }, { symbol: 'mRECO_X', dataType: 'number' },
    { symbol: 'pct_RENO_X', dataType: 'number' }, { symbol: 'mRENO_X', dataType: 'number' },
    { symbol: 'mTO_X', dataType: 'number' }, { symbol: 'pct_linear_outflow', dataType: 'number' },
  ],
  'ISO-59020-07': [ // WARN CR-020 spot-check
    { symbol: 'pct_ECONRE_X', dataType: 'number' }, { symbol: 'EIRENE_X', dataType: 'number' },
    { symbol: 'EORENE_X', dataType: 'number' }, { symbol: 'EITE_X', dataType: 'number' },
    { symbol: 'EOTE_X', dataType: 'number' },
  ],
  'ISO-59020-08': [{ symbol: 'system_breakdown_done', dataType: 'boolean' }], // WARN CR-026 spot-check
  'ISO-59020-09': [{ symbol: 'criteria_review_done', dataType: 'boolean' }],  // CR-031
};

export type ISO59020Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** worksheet code → (symbol → { fieldId, dataType }) */
  fieldByWs: Record<string, Record<string, { fieldId: string; dataType: string }>>;
};

export async function seedISO59020(sql: postgres.Sql, userId: string): Promise<ISO59020Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso59020-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO59020 Harness Org', ${'iso59020-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO59020-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-59020', 'ISO 59020 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldByWs: Record<string, Record<string, { fieldId: string; dataType: string }>> = {};
  const templateByWs: Record<string, string> = {};

  let wsOrder = 1;
  for (const ws of ISO59020_WORKSHEETS) {
    const [t] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_templates (standard_id, code, title_de, order_index)
      VALUES (${std.id}, ${ws}, ${ws + ' (harness)'}, ${wsOrder++}) RETURNING id`;
    templateByWs[ws] = t.id;
    const [sec] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_sections (worksheet_template_id, code, title_de)
      VALUES (${t.id}, ${'S-' + ws}, ${'S-' + ws}) RETURNING id`;
    const [inst] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_instances (project_id, worksheet_template_id)
      VALUES (${proj.id}, ${t.id}) RETURNING id`;
    instances[ws] = inst.id;

    fieldByWs[ws] = {};
    let oi = 1;
    for (const f of ISO59020_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fieldByWs[ws][f.symbol] = { fieldId: row.id, dataType: f.dataType };
    }
  }

  for (const g of ISO59020_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldByWs };
}
