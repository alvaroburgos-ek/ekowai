/**
 * ISO 5667-6 ("Water quality — Sampling — Part 6: Guidance on sampling of rivers
 * and streams"; ISO 5667-6:2014, adopted NCh-ISO 5667/6:2015 declared identical) —
 * minimal fixture for the REAL save-path execution-proof harness.
 *
 * PROOF MANDATE: gate enforcement is claimable ONLY by EXECUTION. This fixture
 * drives the standard's 6 live BLOCK gates through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition
 * against the saved values). Each block gate is demonstrated BOTH ways — a state
 * that PASSES it and a state that VIOLATES it (definite `fail`) — so a gate that
 * fires but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard 2fcde791-8adb-4fab-bfb8-963a11edb24f,
 * this session, R-2): 13 worksheet_templates, 6 BLOCK + 24 WARN gates, 2 equations.
 * Conditions + severities are verbatim from prod compliance_requirements; nothing
 * is fixed here.
 *
 * BLOCK GATE SHAPES (all 6):
 *   - 2 boolean attestations `symbol == true` (CR-001/CR-002, WS01) — pass true, VIOLATE false.
 *   - 1 AND of two boolean attestations `statistical_design_done == true AND
 *     acceptable_error_defined == true` (CR-010, WS05).
 *   - 1 AND of a boolean-false + enum-inequality `unsafe_condition_present == false
 *     AND risk_assessment_outcome != 'do_not_sample'` (CR-030, WS12).
 *   - 2 implication/OR gates `enum != 'x' OR flag == true` (CR-011 systematic⇒cycle
 *     avoided, WS05; CR-015 bridge⇒checks passed, WS07). VIOLATE by selecting the
 *     antecedent enum value AND leaving the consequent flag false.
 *
 * The 24 WARN gates are seeded at their real WARN severity so checkApprovalGate's
 * block-only query correctly EXCLUDES them (proven never to block). Two of them
 * (CR-007 WS03, CR-028 WS11) carry an EMPTY condition '' → `manual` no-op AND warn.
 *
 * There are NO literal-`TRUE` no-op block gates, NO `!= ''` / `== null` / `!= null`
 * block gates, NO `IN {...}` gates and NO `IF…THEN` gates in this standard. One WARN
 * gate (CR-009, WS04) uses `travel_time_method = '' OR ...` — a single-`=` empty-string
 * EQUALITY (`== ''`), not the `!= ''` block-gate no-op trap, and it is warn.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 6 live BLOCK gates + 24 WARN gates, conditions + severities verbatim from prod. */
export const ISO5667_6_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // WS01 — Registrierung & Anwendungsbereich (§1/§2)
  { ws: 'ISO-5667-6-01', code: 'CR-001', cond: 'matrix_excluded_check == true', sev: 'block' },
  { ws: 'ISO-5667-6-01', code: 'CR-002', cond: 'normative_references_consulted == true', sev: 'block' },
  // WS02 — Gestaltung des Probenahmeprogramms (§4)
  { ws: 'ISO-5667-6-02', code: 'CR-003', cond: 'sampling_plan_documented == true', sev: 'warn' },
  { ws: 'ISO-5667-6-02', code: 'CR-004', cond: 'parameters_to_analyse IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-6-02', code: 'CR-005', cond: 'sampling_point_file_kept == true', sev: 'warn' },
  // WS03 — Probenahmestelle & -punkt / Mischung (§5.1)
  { ws: 'ISO-5667-6-03', code: 'CR-006', cond: 'confluence_sites_count >= 2', sev: 'warn' },
  { ws: 'ISO-5667-6-03', code: 'CR-007', cond: '', sev: 'warn' },
  { ws: 'ISO-5667-6-03', code: 'CR-008', cond: "homogeneity_status != 'non_homogeneous' OR heterogeneity_samples_count >= 6", sev: 'warn' },
  // WS04 — Beruecksichtigung der Fliesszeit (§5.1.3)
  { ws: 'ISO-5667-6-04', code: 'CR-009', cond: "travel_time_method = '' OR travel_time_flows_count >= 5", sev: 'warn' },
  // WS05 — Haeufigkeit & Zeitpunkt der Probenahme (§5.2)
  { ws: 'ISO-5667-6-05', code: 'CR-010', cond: 'statistical_design_done == true AND acceptable_error_defined == true', sev: 'block' },
  { ws: 'ISO-5667-6-05', code: 'CR-011', cond: "sampling_strategy != 'systematic' OR cycle_coincidence_avoided == true", sev: 'block' },
  // WS06 — Vorbereitung der Probenahme (§6)
  { ws: 'ISO-5667-6-06', code: 'CR-012', cond: 'personnel_trained == true', sev: 'warn' },
  { ws: 'ISO-5667-6-06', code: 'CR-013', cond: 'sampling_folder_complete == true', sev: 'warn' },
  { ws: 'ISO-5667-6-06', code: 'CR-014', cond: 'transport_temperature >= 2 AND transport_temperature <= 8', sev: 'warn' },
  // WS07 — Probenahme an spezifischen Orten (§7)
  { ws: 'ISO-5667-6-07', code: 'CR-015', cond: "sampling_location_type != 'bridge' OR bridge_checks_passed == true", sev: 'block' },
  { ws: 'ISO-5667-6-07', code: 'CR-016', cond: 'height_above_bed >= 30', sev: 'warn' },
  // WS08 — Probenahmemethoden & Ausruestung (§8/§9)
  { ws: 'ISO-5667-6-08', code: 'CR-017', cond: 'inlet_velocity >= 0.5 AND inlet_velocity <= 3.0', sev: 'warn' },
  { ws: 'ISO-5667-6-08', code: 'CR-018', cond: 'equipment_inert_tested == true', sev: 'warn' },
  // WS09 — Entnahme der Probe (§10)
  { ws: 'ISO-5667-6-09', code: 'CR-019', cond: 'risk_factors_excluded == true', sev: 'warn' },
  { ws: 'ISO-5667-6-09', code: 'CR-020', cond: 'equipment_washes <= 3', sev: 'warn' },
  { ws: 'ISO-5667-6-09', code: 'CR-021', cond: "sampling_mode != 'incremental' OR increment_total_time < 5", sev: 'warn' },
  { ws: 'ISO-5667-6-09', code: 'CR-022', cond: 'sample_labelled == true', sev: 'warn' },
  // WS10 — Stabilisierung, Transport & Lagerung (§11)
  { ws: 'ISO-5667-6-10', code: 'CR-023', cond: 'preservation_per_iso5667_3 == true', sev: 'warn' },
  { ws: 'ISO-5667-6-10', code: 'CR-024', cond: 'sample_traceability_maintained == true', sev: 'warn' },
  // WS11 — Qualitaetssicherung, Berichte & Akkreditierung (§12/§13/§14)
  { ws: 'ISO-5667-6-11', code: 'CR-025', cond: 'contamination_avoidance_instructions == true AND disposable_gloves_used == true', sev: 'warn' },
  { ws: 'ISO-5667-6-11', code: 'CR-026', cond: 'sample_identified_unambiguously == true', sev: 'warn' },
  { ws: 'ISO-5667-6-11', code: 'CR-027', cond: 'analytical_report_complete == true', sev: 'warn' },
  { ws: 'ISO-5667-6-11', code: 'CR-028', cond: '', sev: 'warn' },
  // WS12 — Sicherheitsvorkehrungen (§15)
  { ws: 'ISO-5667-6-12', code: 'CR-029', cond: 'safety_assessment_done == true AND ppe_provided == true', sev: 'warn' },
  { ws: 'ISO-5667-6-12', code: 'CR-030', cond: "unsafe_condition_present == false AND risk_assessment_outcome != 'do_not_sample'", sev: 'block' },
] as const;

/** The 13 worksheet codes (topology parity with prod). */
export const ISO5667_6_WORKSHEETS: readonly string[] = [
  'ISO-5667-6-01', 'ISO-5667-6-02', 'ISO-5667-6-03', 'ISO-5667-6-04',
  'ISO-5667-6-05', 'ISO-5667-6-06', 'ISO-5667-6-07', 'ISO-5667-6-08',
  'ISO-5667-6-09', 'ISO-5667-6-10', 'ISO-5667-6-11', 'ISO-5667-6-12',
  'ISO-5667-6-13',
];

/**
 * Fields to seed per worksheet — every gate-read symbol on its REAL home worksheet
 * (symbol + data_type verbatim from prod fields). Enough to drive all 6 block gates
 * both ways plus resolve the warn-gate spot checks. Equation I/O fields (WS07 depth,
 * WS13 mixing-distance) are driven through evaluateFormula directly, not the DB, so
 * they are not required here.
 */
export const ISO5667_6_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'ISO-5667-6-01': [
    { symbol: 'matrix_excluded_check', dataType: 'boolean' },          // CR-001 block
    { symbol: 'normative_references_consulted', dataType: 'boolean' },  // CR-002 block
  ],
  'ISO-5667-6-02': [
    { symbol: 'sampling_plan_documented', dataType: 'boolean' },   // CR-003 warn
    { symbol: 'parameters_to_analyse', dataType: 'text' },         // CR-004 warn
    { symbol: 'sampling_point_file_kept', dataType: 'boolean' },   // CR-005 warn
  ],
  'ISO-5667-6-03': [
    { symbol: 'confluence_sites_count', dataType: 'number' },        // CR-006 warn
    { symbol: 'homogeneity_status', dataType: 'enum' },             // CR-008 warn
    { symbol: 'heterogeneity_samples_count', dataType: 'number' },   // CR-008 warn
  ],
  'ISO-5667-6-04': [
    { symbol: 'travel_time_method', dataType: 'enum' },        // CR-009 warn
    { symbol: 'travel_time_flows_count', dataType: 'number' }, // CR-009 warn
  ],
  'ISO-5667-6-05': [
    { symbol: 'statistical_design_done', dataType: 'boolean' }, // CR-010 block
    { symbol: 'acceptable_error_defined', dataType: 'boolean' }, // CR-010 block
    { symbol: 'sampling_strategy', dataType: 'enum' },          // CR-011 block
    { symbol: 'cycle_coincidence_avoided', dataType: 'boolean' }, // CR-011 block
  ],
  'ISO-5667-6-06': [
    { symbol: 'personnel_trained', dataType: 'boolean' },      // CR-012 warn
    { symbol: 'sampling_folder_complete', dataType: 'boolean' }, // CR-013 warn
    { symbol: 'transport_temperature', dataType: 'number' },   // CR-014 warn
  ],
  'ISO-5667-6-07': [
    { symbol: 'sampling_location_type', dataType: 'enum' },  // CR-015 block
    { symbol: 'bridge_checks_passed', dataType: 'boolean' }, // CR-015 block
    { symbol: 'height_above_bed', dataType: 'number' },      // CR-016 warn
  ],
  'ISO-5667-6-08': [
    { symbol: 'inlet_velocity', dataType: 'number' },         // CR-017 warn
    { symbol: 'equipment_inert_tested', dataType: 'boolean' }, // CR-018 warn
  ],
  'ISO-5667-6-09': [
    { symbol: 'risk_factors_excluded', dataType: 'boolean' }, // CR-019 warn
    { symbol: 'equipment_washes', dataType: 'number' },       // CR-020 warn
    { symbol: 'sampling_mode', dataType: 'enum' },            // CR-021 warn
    { symbol: 'increment_total_time', dataType: 'number' },   // CR-021 warn
    { symbol: 'sample_labelled', dataType: 'boolean' },       // CR-022 warn
  ],
  'ISO-5667-6-10': [
    { symbol: 'preservation_per_iso5667_3', dataType: 'boolean' }, // CR-023 warn
    { symbol: 'sample_traceability_maintained', dataType: 'boolean' }, // CR-024 warn
  ],
  'ISO-5667-6-11': [
    { symbol: 'contamination_avoidance_instructions', dataType: 'boolean' }, // CR-025 warn
    { symbol: 'disposable_gloves_used', dataType: 'boolean' },       // CR-025 warn
    { symbol: 'sample_identified_unambiguously', dataType: 'boolean' }, // CR-026 warn
    { symbol: 'analytical_report_complete', dataType: 'boolean' },   // CR-027 warn
  ],
  'ISO-5667-6-12': [
    { symbol: 'safety_assessment_done', dataType: 'boolean' }, // CR-029 warn
    { symbol: 'ppe_provided', dataType: 'boolean' },           // CR-029 warn
    { symbol: 'unsafe_condition_present', dataType: 'boolean' }, // CR-030 block
    { symbol: 'risk_assessment_outcome', dataType: 'enum' },    // CR-030 block
  ],
  'ISO-5667-6-13': [],
};

/** The 2 prod equations (§7.3 recommended sub-surface depth; Annex A mixing distance;
 *  formula + output + inputs verbatim from prod). Driven through the REAL
 *  evaluateFormula. Eq A.1 carries COMMA decimals (0,13 / 0,7) which the in-tree
 *  arithmetic engine (dot-decimal + comma=arg-separator) cannot tokenise → error. */
export const ISO5667_6_EQUATIONS: ReadonlyArray<{
  num: string; out: string; formula: string; inputs: string[];
}> = [
  { num: '2', out: 'sampling_depth_below_surface', formula: 'sampling_depth_below_surface = preferred_subsurface_depth', inputs: ['preferred_subsurface_depth'] },
  { num: 'A.1', out: 'l', formula: 'l = 0,13 * b^2 * c * (0,7*c + 2*g) / (g*d)', inputs: ['b', 'c', 'g', 'd'] },
] as const;

export type ISO5667_6Fixture = {
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

export async function seedISO5667_6(sql: postgres.Sql, userId: string): Promise<ISO5667_6Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso5667-6-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO5667-6 Harness Org', ${'iso5667-6-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO5667-6-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-5667-6', 'ISO 5667-6 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  let wsOrder = 1;
  for (const ws of ISO5667_6_WORKSHEETS) {
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
    for (const f of ISO5667_6_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fields[f.symbol] = row.id;
      fieldMeta[f.symbol] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the gates (6 block + 24 warn) against their home worksheet templates.
  for (const g of ISO5667_6_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
