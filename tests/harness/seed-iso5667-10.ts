/**
 * ISO 5667-10 ("Water quality — Sampling — Part 10: Guidance on sampling of
 * waste waters"; 2020, second edition, ISO/TC 147/SC 6) — minimal fixture for
 * the REAL save-path execution-proof harness.
 *
 * PROOF MANDATE: gate enforcement is claimable ONLY by EXECUTION. This fixture
 * drives the standard's 29 live BLOCK gates through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition
 * against the saved values). Each gate is demonstrated BOTH ways — a state that
 * PASSES it and a state that VIOLATES it (definite `fail`) — so a gate that
 * fires but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard 0b87b8c0-612e-49f3-9e7a-f261e855c5ac,
 * project vadsmshzebefjreqcicl, this session, R-2): 10 worksheet_templates,
 * 29 BLOCK + 7 WARN gates, 3 equations. Conditions + severities are verbatim
 * from prod compliance_requirements; nothing is fixed here.
 *
 * GATE SHAPES (all 29 block):
 *   - 3 EXISTENCE gates `symbol IS NOT NULL` (CR-001 waste_water_type,
 *     CR-010 specific_site_type, CR-028 max_storage_time). `IS NOT NULL` compiles
 *     to the enforcing `exists` node (absent → definite fail → blocks; present →
 *     pass) — NOT the `!= null` no-op trap. Demonstrated absent→block, present→pass.
 *   - 16 boolean attestations `symbol == true|True` — pass with true, VIOLATE
 *     with false. (`true` and `True` both tokenise to the TRUE keyword.)
 *   - 5 single numeric thresholds (CR-007 number_of_samples > 0, CR-011 >= 3,
 *     CR-012 >= 30, CR-015 >= 5, CR-016 <= 30).
 *   - 5 compound numeric AND gates (CR-002 3-way, CR-017 2-way, CR-018 4-way,
 *     CR-024 2-way, CR-027 range `>=2 AND <=8`) — violate ONE operand → whole AND
 *     false → definite fail → blocks.
 *
 * FIVE gates read a field whose HOME worksheet is NOT the gate's host worksheet
 * (resolved via the conflict-free project-wide fallback exactly as the deployed
 * app does): CR-005 (host WS01 / field WS02), CR-014 (WS05/WS06),
 * CR-022 (WS05/WS07), CR-030 (WS08/WS09), CR-034 (WS09/WS10).
 *
 * The 7 WARN gates are seeded at their real WARN severity so checkApprovalGate's
 * block-only query correctly EXCLUDES them (proven never to block).
 *
 * There are NO literal-`TRUE` no-op block gates, NO `!= ''` / `== null` / `!= null`
 * block gates, NO `IN {...}` gates and NO `IF…THEN` gates in this standard.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 29 live BLOCK gates + 7 WARN gates, conditions + severities verbatim from prod. */
export const ISO5667_10_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // WS01 — Registrierung & Anwendungsbereich (§1/§3.4)
  { ws: 'ISO-5667-10-01', code: 'CR-001', cond: 'waste_water_type IS NOT NULL', sev: 'block' },
  { ws: 'ISO-5667-10-01', code: 'CR-002', cond: 'qualified_grab_count >= 5 AND qualified_grab_window <= 2 AND qualified_grab_interval >= 2', sev: 'block' },
  { ws: 'ISO-5667-10-01', code: 'CR-005', cond: 'sampling_point_documented == true', sev: 'block' },
  // WS02 — Programmgestaltung & Probenahmestelle (§4.1/§4.2)
  { ws: 'ISO-5667-10-02', code: 'CR-003', cond: 'sampling_strategy_defined == true', sev: 'warn' },
  { ws: 'ISO-5667-10-02', code: 'CR-004', cond: 'well_mixed_section == true', sev: 'block' },
  { ws: 'ISO-5667-10-02', code: 'CR-006', cond: 'unusual_hydraulic_conditions_recorded == True', sev: 'block' },
  // WS03 — Probenahmehaeufigkeit & -zeitpunkt (§4.3)
  { ws: 'ISO-5667-10-03', code: 'CR-007', cond: 'number_of_samples > 0', sev: 'block' },
  { ws: 'ISO-5667-10-03', code: 'CR-008', cond: 'sampling_day_k >= 0 OR sampling_week_k >= 0', sev: 'warn' },
  { ws: 'ISO-5667-10-03', code: 'CR-009', cond: 'variation_source IS NOT NULL', sev: 'warn' },
  // WS04 — Probenahme an spezifischen Standorten (§5)
  { ws: 'ISO-5667-10-04', code: 'CR-010', cond: 'specific_site_type IS NOT NULL', sev: 'block' },
  { ws: 'ISO-5667-10-04', code: 'CR-011', cond: 'restriction_downstream_diameters >= 3', sev: 'block' },
  { ws: 'ISO-5667-10-04', code: 'CR-012', cond: 'cooling_runoff_time >= 30', sev: 'block' },
  // WS05 — Haupttypen der Abwasserprobenahme (§6/§7.1)
  { ws: 'ISO-5667-10-05', code: 'CR-013', cond: 'main_sampling_type IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-10-05', code: 'CR-014', cond: 'sampling_objective_defined == true', sev: 'block' },
  { ws: 'ISO-5667-10-05', code: 'CR-022', cond: 'material_compatible == true', sev: 'block' },
  // WS06 — Durchfuehrung der Probenahme (§7.2/§7.3/§7.4)
  { ws: 'ISO-5667-10-06', code: 'CR-015', cond: 'sampling_line_length_diameters >= 5', sev: 'block' },
  { ws: 'ISO-5667-10-06', code: 'CR-016', cond: 'composite_interval <= 30', sev: 'block' },
  { ws: 'ISO-5667-10-06', code: 'CR-017', cond: 'tube_internal_diameter >= 9 AND suction_velocity >= 0.5', sev: 'block' },
  { ws: 'ISO-5667-10-06', code: 'CR-018', cond: 'unit_volume >= 25 AND sampling_bias <= 10 AND repeatability_cv <= 5 AND flow_uncertainty_k2 <= 15', sev: 'block' },
  { ws: 'ISO-5667-10-06', code: 'CR-019', cond: 'V_n >= 0', sev: 'warn' },
  { ws: 'ISO-5667-10-06', code: 'CR-020', cond: 'grab_depth_below_surface >= 30', sev: 'warn' },
  { ws: 'ISO-5667-10-06', code: 'CR-021', cond: 'homogeneity_deviation < 20', sev: 'warn' },
  // WS07 — Probenahmeausruestung (§8)
  { ws: 'ISO-5667-10-07', code: 'CR-023', cond: 'sampler_refrigerated == True', sev: 'block' },
  { ws: 'ISO-5667-10-07', code: 'CR-024', cond: 'manual_min_volume >= 25 AND manual_repeatability_cv <= 5', sev: 'block' },
  // WS08 — Homogenisierung, Konservierung, Transport & Lagerung (§9)
  { ws: 'ISO-5667-10-08', code: 'CR-025', cond: 'homogenization_done == true', sev: 'block' },
  { ws: 'ISO-5667-10-08', code: 'CR-026', cond: 'preservation_per_iso5667_3 == true', sev: 'block' },
  { ws: 'ISO-5667-10-08', code: 'CR-027', cond: 'transport_temperature >= 2 AND transport_temperature <= 8', sev: 'block' },
  { ws: 'ISO-5667-10-08', code: 'CR-028', cond: 'max_storage_time IS NOT NULL', sev: 'block' },
  { ws: 'ISO-5667-10-08', code: 'CR-029', cond: 'sample_traceability == true', sev: 'block' },
  { ws: 'ISO-5667-10-08', code: 'CR-030', cond: 'written_contamination_instructions == true', sev: 'block' },
  // WS09 — Qualitaetssicherung & Berichterstattung (§10/§11)
  { ws: 'ISO-5667-10-09', code: 'CR-031', cond: 'field_form_completed == true', sev: 'block' },
  { ws: 'ISO-5667-10-09', code: 'CR-032', cond: 'qa_qc_per_iso5667_14 == true', sev: 'block' },
  { ws: 'ISO-5667-10-09', code: 'CR-033', cond: 'report_items_recorded == true', sev: 'block' },
  { ws: 'ISO-5667-10-09', code: 'CR-034', cond: 'risk_assessed_before_sampling == true', sev: 'block' },
  // WS10 — Sicherheitsvorkehrungen (§12)
  { ws: 'ISO-5667-10-10', code: 'CR-035', cond: 'systematic_ppe_worn == true', sev: 'block' },
  { ws: 'ISO-5667-10-10', code: 'CR-036', cond: 'equipment_secured == True', sev: 'block' },
] as const;

/** The 10 worksheet codes (topology parity with prod). */
export const ISO5667_10_WORKSHEETS: readonly string[] = [
  'ISO-5667-10-01', 'ISO-5667-10-02', 'ISO-5667-10-03', 'ISO-5667-10-04', 'ISO-5667-10-05',
  'ISO-5667-10-06', 'ISO-5667-10-07', 'ISO-5667-10-08', 'ISO-5667-10-09', 'ISO-5667-10-10',
];

/**
 * Fields to seed per HOME worksheet — each gate-read symbol + equation in/out
 * symbol on its REAL prod home worksheet (symbol + data_type verbatim from prod).
 * Five gate-read symbols live on a worksheet OTHER than their gate's host (see
 * header) so those gates resolve via the project-wide fallback exactly as in the app.
 */
export const ISO5667_10_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'ISO-5667-10-01': [
    { symbol: 'waste_water_type', dataType: 'enum' },          // CR-001 block (existence)
    { symbol: 'qualified_grab_count', dataType: 'number' },    // CR-002 block
    { symbol: 'qualified_grab_window', dataType: 'number' },   // CR-002 block
    { symbol: 'qualified_grab_interval', dataType: 'number' }, // CR-002 block
  ],
  'ISO-5667-10-02': [
    { symbol: 'sampling_strategy_defined', dataType: 'boolean' },              // CR-003 warn
    { symbol: 'well_mixed_section', dataType: 'boolean' },                     // CR-004 block
    { symbol: 'unusual_hydraulic_conditions_recorded', dataType: 'boolean' },  // CR-006 block
    { symbol: 'sampling_point_documented', dataType: 'boolean' },              // CR-005 block (host WS01)
  ],
  'ISO-5667-10-03': [
    { symbol: 'number_of_samples', dataType: 'number' }, // CR-007 block + Eq1/Eq2 input
    { symbol: 'A', dataType: 'number' },                 // Eq1/Eq2 input
    { symbol: 'k', dataType: 'number' },                 // Eq1/Eq2 input
    { symbol: 'sampling_day_k', dataType: 'number' },    // Eq1 output + CR-008 warn
    { symbol: 'sampling_week_k', dataType: 'number' },   // Eq2 output + CR-008 warn
    { symbol: 'variation_source', dataType: 'enum' },    // CR-009 warn (existence)
  ],
  'ISO-5667-10-04': [
    { symbol: 'specific_site_type', dataType: 'enum' },                 // CR-010 block (existence)
    { symbol: 'restriction_downstream_diameters', dataType: 'number' }, // CR-011 block
    { symbol: 'cooling_runoff_time', dataType: 'number' },              // CR-012 block
  ],
  'ISO-5667-10-05': [
    { symbol: 'main_sampling_type', dataType: 'enum' }, // CR-013 warn (existence)
  ],
  'ISO-5667-10-06': [
    { symbol: 'sampling_objective_defined', dataType: 'boolean' },       // CR-014 block (host WS05)
    { symbol: 'sampling_line_length_diameters', dataType: 'number' },    // CR-015 block
    { symbol: 'composite_interval', dataType: 'number' },               // CR-016 block
    { symbol: 'tube_internal_diameter', dataType: 'number' },           // CR-017 block
    { symbol: 'suction_velocity', dataType: 'number' },                 // CR-017 block
    { symbol: 'unit_volume', dataType: 'number' },                      // CR-018 block
    { symbol: 'sampling_bias', dataType: 'number' },                    // CR-018 block
    { symbol: 'repeatability_cv', dataType: 'number' },                 // CR-018 block
    { symbol: 'flow_uncertainty_k2', dataType: 'number' },              // CR-018 block
    { symbol: 'V_n', dataType: 'number' },                             // Eq3 output + CR-019 warn
    { symbol: 'V_final', dataType: 'number' },                         // Eq3 input
    { symbol: 'M3_n', dataType: 'number' },                            // Eq3 input
    { symbol: 'M3_total', dataType: 'number' },                        // Eq3 input
    { symbol: 'grab_depth_below_surface', dataType: 'number' },        // CR-020 warn
    { symbol: 'homogeneity_deviation', dataType: 'number' },           // CR-021 warn
  ],
  'ISO-5667-10-07': [
    { symbol: 'material_compatible', dataType: 'boolean' },      // CR-022 block (host WS05)
    { symbol: 'sampler_refrigerated', dataType: 'boolean' },     // CR-023 block
    { symbol: 'manual_min_volume', dataType: 'number' },         // CR-024 block
    { symbol: 'manual_repeatability_cv', dataType: 'number' },   // CR-024 block
  ],
  'ISO-5667-10-08': [
    { symbol: 'homogenization_done', dataType: 'boolean' },        // CR-025 block
    { symbol: 'preservation_per_iso5667_3', dataType: 'boolean' }, // CR-026 block
    { symbol: 'transport_temperature', dataType: 'number' },       // CR-027 block
    { symbol: 'max_storage_time', dataType: 'number' },            // CR-028 block (existence)
    { symbol: 'sample_traceability', dataType: 'boolean' },        // CR-029 block
  ],
  'ISO-5667-10-09': [
    { symbol: 'written_contamination_instructions', dataType: 'boolean' }, // CR-030 block (host WS08)
    { symbol: 'field_form_completed', dataType: 'boolean' },               // CR-031 block
    { symbol: 'qa_qc_per_iso5667_14', dataType: 'boolean' },               // CR-032 block
    { symbol: 'report_items_recorded', dataType: 'boolean' },              // CR-033 block
  ],
  'ISO-5667-10-10': [
    { symbol: 'risk_assessed_before_sampling', dataType: 'boolean' }, // CR-034 block (host WS09)
    { symbol: 'systematic_ppe_worn', dataType: 'boolean' },           // CR-035 block
    { symbol: 'equipment_secured', dataType: 'boolean' },             // CR-036 block
  ],
};

/** The 3 prod equations (§4.3.2 Formulas 1/2, p.5; §7.2.2.3 Formula 3, p.13;
 *  formula + output + inputs verbatim from prod). Driven through the REAL
 *  evaluateFormula — all three are plain add/sub/mul/div arithmetic (no
 *  comma-decimals, no SUM) so all COMPUTE. */
export const ISO5667_10_EQUATIONS: ReadonlyArray<{
  num: string; out: string; formula: string; inputs: string[];
}> = [
  { num: '1', out: 'sampling_day_k', formula: 'sampling_day_k = A + (365 * k) / number_of_samples', inputs: ['A', 'number_of_samples', 'k'] },
  { num: '2', out: 'sampling_week_k', formula: 'sampling_week_k = A + (52 * k) / number_of_samples', inputs: ['A', 'number_of_samples', 'k'] },
  { num: '3', out: 'V_n', formula: 'V_n = V_final * (M3_n / M3_total)', inputs: ['V_final', 'M3_n', 'M3_total'] },
] as const;

export type ISO5667_10Fixture = {
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

export async function seedISO5667_10(sql: postgres.Sql, userId: string): Promise<ISO5667_10Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso5667-10-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO5667-10 Harness Org', ${'iso5667-10-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO5667-10-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-5667-10', 'ISO 5667-10 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  // Create all 10 worksheet templates + a section + an instance (topology parity).
  let wsOrder = 1;
  for (const ws of ISO5667_10_WORKSHEETS) {
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
    for (const f of ISO5667_10_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fields[f.symbol] = row.id;
      fieldMeta[f.symbol] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the gates (29 block + 7 warn) against their host worksheet templates.
  for (const g of ISO5667_10_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
