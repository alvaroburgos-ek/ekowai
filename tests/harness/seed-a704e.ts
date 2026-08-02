/**
 * ATV-A-704E / DWA-A 704E ("Operating Methods for Wastewater Analysis",
 * April 2007) — minimal fixture for the REAL save-path execution-proof harness.
 *
 * PROOF MANDATE: gate enforcement is claimable ONLY by EXECUTION. This fixture
 * drives the standard's 26 live BLOCK gates through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition
 * against the saved values). Each gate is demonstrated BOTH ways — a state that
 * PASSES it and a state that VIOLATES it (definite `fail`) — so a gate that
 * fires but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard 96347572-1a8c-408d-afa5-6a99edc1b579,
 * this session, R-2): 12 worksheet_templates, 26 BLOCK + 4 WARN gates, 6 equations.
 * Conditions are verbatim from prod compliance_requirements; nothing is fixed here.
 *
 * GATE SHAPES (all 26 block):
 *   - 22 self-attestation booleans `attest_… == True` (CR-001..012,014..018,020,021,024,027).
 *   - 3 cross-worksheet ordering acompares `deviation_*_pct <= qa_quality_target_pct`
 *     (CR-019 host WS09, CR-022/023 host WS10). `qa_quality_target_pct` is a field on
 *     WS08, NOT on the gate's host worksheet, so it resolves via the conflict-free
 *     project-wide fallback exactly as in the deployed app (evaluate.ts L252-256 ordering
 *     acompare path — both operands numeric, genuinely enforcing).
 *   - CR-025 compound range `(vol<=0.5 AND dev<=2) OR (vol>=1.0 AND dev<=1)` (WS11).
 *   - CR-026 `heating_device_deviation <= 3` (WS11).
 *
 * The 4 WARN gates are also seeded at their real WARN severity so checkApprovalGate's
 * block-only query correctly EXCLUDES them (proven never to block):
 *   - CR-013 `training_courses_attended == true` (WS04).
 *   - CR-028 / CR-029 / CR-030 (WS07/05/08): empty condition '' → `manual` no-op AND warn.
 *
 * There are NO literal-`TRUE` no-op block gates, NO `!= ''` / `== null` gates, NO `IN`
 * gates and NO `IF…THEN` gates in this standard.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 26 live BLOCK gates + 4 WARN gates, conditions + severities verbatim from prod. */
export const A704E_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // WS01 — Registrierung & Anwendungsbereich (8 attestation blocks)
  { ws: 'ATV-A-704E-01', code: 'CR-001', cond: 'attest_atv_a_704e_01_cr_001 == True', sev: 'block' },
  { ws: 'ATV-A-704E-01', code: 'CR-002', cond: 'attest_atv_a_704e_01_cr_002 == True', sev: 'block' },
  { ws: 'ATV-A-704E-01', code: 'CR-003', cond: 'attest_atv_a_704e_01_cr_003 == True', sev: 'block' },
  { ws: 'ATV-A-704E-01', code: 'CR-004', cond: 'attest_atv_a_704e_01_cr_004 == True', sev: 'block' },
  { ws: 'ATV-A-704E-01', code: 'CR-005', cond: 'attest_atv_a_704e_01_cr_005 == True', sev: 'block' },
  { ws: 'ATV-A-704E-01', code: 'CR-006', cond: 'attest_atv_a_704e_01_cr_006 == True', sev: 'block' },
  { ws: 'ATV-A-704E-01', code: 'CR-007', cond: 'attest_atv_a_704e_01_cr_007 == True', sev: 'block' },
  { ws: 'ATV-A-704E-01', code: 'CR-008', cond: 'attest_atv_a_704e_01_cr_008 == True', sev: 'block' },
  // WS03 — Anwendung & Methodenauswahl (4 attestation blocks)
  { ws: 'ATV-A-704E-03', code: 'CR-009', cond: 'attest_atv_a_704e_03_cr_009 == True', sev: 'block' },
  { ws: 'ATV-A-704E-03', code: 'CR-010', cond: 'attest_atv_a_704e_03_cr_010 == True', sev: 'block' },
  { ws: 'ATV-A-704E-03', code: 'CR-011', cond: 'attest_atv_a_704e_03_cr_011 == True', sev: 'block' },
  { ws: 'ATV-A-704E-03', code: 'CR-012', cond: 'attest_atv_a_704e_03_cr_012 == True', sev: 'block' },
  // WS04 — Einweisung & Überwachung (WARN)
  { ws: 'ATV-A-704E-04', code: 'CR-013', cond: 'training_courses_attended == true', sev: 'warn' },
  // WS05 — Qualitätskontrolle & Plausibilität (2 attestation blocks + 1 empty WARN)
  { ws: 'ATV-A-704E-05', code: 'CR-014', cond: 'attest_atv_a_704e_05_cr_014 == True', sev: 'block' },
  { ws: 'ATV-A-704E-05', code: 'CR-015', cond: 'attest_atv_a_704e_05_cr_015 == True', sev: 'block' },
  { ws: 'ATV-A-704E-05', code: 'CR-029', cond: '', sev: 'warn' },
  // WS07 — Dokumentation (3 attestation blocks + 1 empty WARN)
  { ws: 'ATV-A-704E-07', code: 'CR-016', cond: 'attest_atv_a_704e_07_cr_016 == True', sev: 'block' },
  { ws: 'ATV-A-704E-07', code: 'CR-017', cond: 'attest_atv_a_704e_07_cr_017 == True', sev: 'block' },
  { ws: 'ATV-A-704E-07', code: 'CR-018', cond: 'attest_atv_a_704e_07_cr_018 == True', sev: 'block' },
  { ws: 'ATV-A-704E-07', code: 'CR-028', cond: '', sev: 'warn' },
  // WS08 — IGC-Rahmen & QS-Spezifikationen (4 attestation blocks + 1 empty WARN)
  { ws: 'ATV-A-704E-08', code: 'CR-020', cond: 'attest_atv_a_704e_08_cr_020 == True', sev: 'block' },
  { ws: 'ATV-A-704E-08', code: 'CR-021', cond: 'attest_atv_a_704e_08_cr_021 == True', sev: 'block' },
  { ws: 'ATV-A-704E-08', code: 'CR-024', cond: 'attest_atv_a_704e_08_cr_024 == True', sev: 'block' },
  { ws: 'ATV-A-704E-08', code: 'CR-027', cond: 'attest_atv_a_704e_08_cr_027 == True', sev: 'block' },
  { ws: 'ATV-A-704E-08', code: 'CR-030', cond: '', sev: 'warn' },
  // WS09 — IGC-Berechnungen (cross-worksheet ordering acompare block)
  { ws: 'ATV-A-704E-09', code: 'CR-019', cond: 'deviation_single_pct <= qa_quality_target_pct', sev: 'block' },
  // WS10 — IGC-Äquivalenz & Parallelanalysen (2 cross-worksheet ordering acompare blocks)
  { ws: 'ATV-A-704E-10', code: 'CR-022', cond: 'deviation_equivalency_pct <= qa_quality_target_pct', sev: 'block' },
  { ws: 'ATV-A-704E-10', code: 'CR-023', cond: 'deviation_parallel_pct <= qa_quality_target_pct', sev: 'block' },
  // WS11 — Überwachung der Prüfmittel (compound range + simple ordering blocks)
  { ws: 'ATV-A-704E-11', code: 'CR-025', cond: '(pipette_tested_volume <= 0.5 AND pipette_deviation_pct <= 2) OR (pipette_tested_volume >= 1.0 AND pipette_deviation_pct <= 1)', sev: 'block' },
  { ws: 'ATV-A-704E-11', code: 'CR-026', cond: 'heating_device_deviation <= 3', sev: 'block' },
] as const;

/** The 12 worksheet codes (topology parity with prod). */
export const A704E_WORKSHEETS: readonly string[] = [
  'ATV-A-704E-01', 'ATV-A-704E-02', 'ATV-A-704E-03', 'ATV-A-704E-04',
  'ATV-A-704E-05', 'ATV-A-704E-06', 'ATV-A-704E-07', 'ATV-A-704E-08',
  'ATV-A-704E-09', 'ATV-A-704E-10', 'ATV-A-704E-11', 'ATV-A-704E-12',
];

/**
 * Fields to seed per worksheet — each gate symbol on its REAL home worksheet
 * (symbol + data_type verbatim from prod). WS08 carries qa_quality_target_pct
 * so CR-019/022/023's cross-worksheet RHS resolves via the project-wide fallback
 * exactly as in the deployed app.
 */
export const A704E_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'ATV-A-704E-01': [
    { symbol: 'attest_atv_a_704e_01_cr_001', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_01_cr_002', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_01_cr_003', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_01_cr_004', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_01_cr_005', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_01_cr_006', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_01_cr_007', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_01_cr_008', dataType: 'boolean' },
  ],
  'ATV-A-704E-03': [
    { symbol: 'attest_atv_a_704e_03_cr_009', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_03_cr_010', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_03_cr_011', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_03_cr_012', dataType: 'boolean' },
  ],
  'ATV-A-704E-04': [
    { symbol: 'training_courses_attended', dataType: 'boolean' }, // CR-013 (warn)
  ],
  'ATV-A-704E-05': [
    { symbol: 'attest_atv_a_704e_05_cr_014', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_05_cr_015', dataType: 'boolean' },
  ],
  'ATV-A-704E-07': [
    { symbol: 'attest_atv_a_704e_07_cr_016', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_07_cr_017', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_07_cr_018', dataType: 'boolean' },
  ],
  'ATV-A-704E-08': [
    { symbol: 'attest_atv_a_704e_08_cr_020', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_08_cr_021', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_08_cr_024', dataType: 'boolean' },
    { symbol: 'attest_atv_a_704e_08_cr_027', dataType: 'boolean' },
    { symbol: 'qa_quality_target_pct', dataType: 'number' }, // CR-019/022/023 cross-worksheet RHS
  ],
  'ATV-A-704E-09': [
    { symbol: 'deviation_single_pct', dataType: 'number' }, // CR-019 local operand
  ],
  'ATV-A-704E-10': [
    { symbol: 'deviation_equivalency_pct', dataType: 'number' }, // CR-022 local operand
    { symbol: 'deviation_parallel_pct', dataType: 'number' },    // CR-023 local operand
  ],
  'ATV-A-704E-11': [
    { symbol: 'pipette_tested_volume', dataType: 'number' },
    { symbol: 'pipette_deviation_pct', dataType: 'number' },
    { symbol: 'heating_device_deviation', dataType: 'number' },
  ],
};

/** The 6 prod equations (formula + output + inputs verbatim from prod). Driven
 *  through the REAL evaluateFormula. EQ-01 uses SUM() → engine-unsupported (NR). */
export const A704E_EQUATIONS: ReadonlyArray<{
  num: string; out: string; formula: string; inputs: string[];
}> = [
  { num: 'EQ-01', out: 'mean_value', formula: 'mean_value = SUM(single_result_i) / n_determinations', inputs: ['single_result_i', 'n_determinations'] },
  { num: 'EQ-02', out: 'deviation_single_pct', formula: 'deviation_single_pct = 100 * (single_result_i - mean_value) / mean_value', inputs: ['single_result_i', 'mean_value'] },
  { num: 'EQ-03', out: 'calculated_value', formula: 'calculated_value = (total_volume / sample_volume) * measured_value_diluted_sample', inputs: ['total_volume', 'sample_volume', 'measured_value_diluted_sample'] },
  { num: 'EQ-04', out: 'NSS', formula: 'NSS = (volume_sample * measured_value_original_sample + volume_standard * concentration_standard) / (volume_sample + volume_standard)', inputs: ['volume_sample', 'measured_value_original_sample', 'volume_standard', 'concentration_standard'] },
  { num: 'EQ-05', out: 'deviation_equivalency_pct', formula: 'deviation_equivalency_pct = 100 * (measured_value_operating - nominal_value_reference) / nominal_value_reference', inputs: ['measured_value_operating', 'nominal_value_reference'] },
  { num: 'EQ-06', out: 'deviation_parallel_pct', formula: 'deviation_parallel_pct = 100 * (measured_value_operating - measured_value_reference) / measured_value_reference', inputs: ['measured_value_operating', 'measured_value_reference'] },
] as const;

export type A704EFixture = {
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

export async function seedA704E(sql: postgres.Sql, userId: string): Promise<A704EFixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'a704e-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('A704E Harness Org', ${'a704e-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'A704E-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ATV-A-704E', 'ATV-A 704E (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  // Create all 12 worksheet templates + a section + an instance (topology parity).
  let wsOrder = 1;
  for (const ws of A704E_WORKSHEETS) {
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

    let oi = 1;
    for (const f of A704E_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fields[f.symbol] = row.id;
      fieldMeta[f.symbol] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the gates (26 block + 4 warn) against their home worksheet templates.
  for (const g of A704E_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
