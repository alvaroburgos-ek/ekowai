/**
 * ISO 14002-2:2023 ("Environmental management systems — Guidelines for using
 * ISO 14001 to address environmental aspects and conditions within an
 * environmental topic area — Part 2: Water", First edition 2023-05) —
 * CURRENT-PROD fixture for the REAL save-path gate-execution-proof harness.
 *
 * This is a GUIDANCE standard ("Guidelines for using ISO 14001…"): its body
 * (Clauses 4–7) is almost entirely modal ("should"/"can") and it prints NO
 * equations — so the encoding carries 0 equations. Its enforcement surface is
 * the compliance layer: 8 worksheets, 13 BLOCK gates, 13 WARN gates, 51 fields
 * — all VERBATIM from prod (standard e675a07c-4b69-42a1-a1a3-b1dc50ad8a38,
 * project vadsmshzebefjreqcicl, re-pulled this session, R-2).
 *
 * The 13 BLOCK gates split into two engine shapes (all proven BOTH ways in the
 * verify test through the REAL saveWorksheet → checkApprovalGate chain):
 *   - 10 boolean attestations `flag == true`
 *       (CR-001/009/012/013/015/019/021/023/024/026)
 *   - 3 existence gates `symbol IS NOT NULL`
 *       (CR-002 text, CR-005 text, CR-007 boolean)
 * None use the never-fail `!= null` trap-2 shape (they use the correct
 * `IS NOT NULL`); none carry an ordering-op bare-ident RHS, `IN`, `IF/THEN`, a
 * `TRUE` literal, or an empty condition. So all 13 are real-enforcing.
 *
 * CROSS-WORKSHEET NOTE: CR-007 (`significant_aspect IS NOT NULL`) is hosted on
 * worksheet -02, but its read field `significant_aspect` is a field of
 * worksheet -03 (§4.2.2). The engine resolves it via checkApprovalGate's
 * documented project-wide conflict-free fallback (`makeGateLookup`), so the gate
 * enforces cross-worksheet — proven in the verify test by SAVING significant_aspect
 * on -03 and CHECKING the gate on -02.
 *
 * Source anchors (rendered PDF, SR-3): CR-001/002 §1 Scope p.1; CR-005 §4.2.1
 * p.3; CR-007 §3.2/§4.2.2 p.1/p.4; CR-009 §4.2.3 p.5; CR-012 §4.3 p.7; CR-013
 * §5.2 p.11; CR-015 §5.3 p.12; CR-019 §5.4.1 p.12; CR-021 §5.4.4 p.14; CR-023
 * §6.1 p.16; CR-024 §6.2.1 p.16; CR-026 §7 p.18. No prod credentials; disposable
 * embedded PG. Nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type FType = 'boolean' | 'text' | 'number' | 'enum';

/** All 26 prod compliance gates (13 block + 13 warn), conditions + severities
 *  VERBATIM from prod compliance_requirements. Nothing is fixed here. */
export const ISO14002_2_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // ── 13 BLOCK gates ──
  { ws: 'ISO-14002-2-01', code: 'CR-001', sev: 'block', cond: 'iso14001_ems_in_place == true' },
  { ws: 'ISO-14002-2-01', code: 'CR-002', sev: 'block', cond: 'water_topic_area_scope IS NOT NULL' },
  { ws: 'ISO-14002-2-02', code: 'CR-005', sev: 'block', cond: 'compliance_obligations_water IS NOT NULL' },
  { ws: 'ISO-14002-2-02', code: 'CR-007', sev: 'block', cond: 'significant_aspect IS NOT NULL' }, // field lives on -03 (cross-ws fallback)
  { ws: 'ISO-14002-2-04', code: 'CR-009', sev: 'block', cond: 'risks_opportunities_determined == true' },
  { ws: 'ISO-14002-2-05', code: 'CR-012', sev: 'block', cond: 'appropriate_actions_determined == true' },
  { ws: 'ISO-14002-2-05', code: 'CR-013', sev: 'block', cond: 'environmental_objective_set == true' },
  { ws: 'ISO-14002-2-06', code: 'CR-015', sev: 'block', cond: 'support_actions_provided == true' },
  { ws: 'ISO-14002-2-06', code: 'CR-019', sev: 'block', cond: 'operational_controls_applied == true' },
  { ws: 'ISO-14002-2-06', code: 'CR-021', sev: 'block', cond: 'emergency_preparedness_planned == true' },
  { ws: 'ISO-14002-2-07', code: 'CR-023', sev: 'block', cond: 'effectiveness_evaluated == true' },
  { ws: 'ISO-14002-2-07', code: 'CR-024', sev: 'block', cond: 'monitoring_measurement_defined == true' },
  { ws: 'ISO-14002-2-08', code: 'CR-026', sev: 'block', cond: 'improvement_actions_implemented == true' },
  // ── 13 WARN gates (verbatim; a representative few driven "never blocks" in the test) ──
  { ws: 'ISO-14002-2-01', code: 'CR-003', sev: 'warn', cond: 'life_cycle_perspective_applied == true' },
  { ws: 'ISO-14002-2-02', code: 'CR-004', sev: 'warn', cond: 'water_related_review_conducted == true' },
  { ws: 'ISO-14002-2-03', code: 'CR-006', sev: 'warn', cond: 'water_aspects_reviewed == true' },
  { ws: 'ISO-14002-2-03', code: 'CR-008', sev: 'warn', cond: 'water_dependency_assessed == true' },
  { ws: 'ISO-14002-2-04', code: 'CR-010', sev: 'warn', cond: 'baseline_established == true' },
  { ws: 'ISO-14002-2-04', code: 'CR-011', sev: 'warn', cond: 'change_management_reviewed == true' },
  { ws: 'ISO-14002-2-05', code: 'CR-014', sev: 'warn', cond: 'target_measurable_timebound == true' },
  { ws: 'ISO-14002-2-06', code: 'CR-016', sev: 'warn', cond: 'competence_determined == true' },
  { ws: 'ISO-14002-2-06', code: 'CR-017', sev: 'warn', cond: 'awareness_ensured == true' },
  { ws: 'ISO-14002-2-06', code: 'CR-018', sev: 'warn', cond: 'documented_information_controlled == true' },
  { ws: 'ISO-14002-2-06', code: 'CR-020', sev: 'warn', cond: 'control_hierarchy_type IS NOT NULL' },
  { ws: 'ISO-14002-2-07', code: 'CR-022', sev: 'warn', cond: 'unintended_consequences_reviewed == true' },
  { ws: 'ISO-14002-2-08', code: 'CR-025', sev: 'warn', cond: 'performance_indicators_tracked == true' },
];

/** The 8 worksheet codes (topology parity with prod). */
export const ISO14002_2_WORKSHEETS: readonly string[] = [
  'ISO-14002-2-01', 'ISO-14002-2-02', 'ISO-14002-2-03', 'ISO-14002-2-04',
  'ISO-14002-2-05', 'ISO-14002-2-06', 'ISO-14002-2-07', 'ISO-14002-2-08',
];

/** Fields seeded per HOME worksheet — every BLOCK gate read symbol on its own
 *  worksheet, PLUS significant_aspect on -03 (read cross-ws by CR-007 on -02 via
 *  the project-wide fallback), PLUS the fields a spot-checked WARN gate reads
 *  (data_type verbatim from prod). Not every prod field is seeded — only those a
 *  driven gate reads. */
export const ISO14002_2_FIELDS: Record<string, Array<{ symbol: string; dataType: FType }>> = {
  'ISO-14002-2-01': [
    { symbol: 'iso14001_ems_in_place', dataType: 'boolean' },        // CR-001 block
    { symbol: 'water_topic_area_scope', dataType: 'text' },          // CR-002 block
    { symbol: 'life_cycle_perspective_applied', dataType: 'boolean' }, // CR-003 warn spot
  ],
  'ISO-14002-2-02': [
    { symbol: 'compliance_obligations_water', dataType: 'text' },    // CR-005 block
    // NB: CR-007 is hosted here but reads significant_aspect from -03 (fallback)
  ],
  'ISO-14002-2-03': [
    { symbol: 'significant_aspect', dataType: 'boolean' },           // CR-007 block (cross-ws home)
    { symbol: 'water_dependency_assessed', dataType: 'boolean' },    // CR-008 warn spot
  ],
  'ISO-14002-2-04': [
    { symbol: 'risks_opportunities_determined', dataType: 'boolean' }, // CR-009 block
  ],
  'ISO-14002-2-05': [
    { symbol: 'appropriate_actions_determined', dataType: 'boolean' }, // CR-012 block
    { symbol: 'environmental_objective_set', dataType: 'boolean' },  // CR-013 block
  ],
  'ISO-14002-2-06': [
    { symbol: 'support_actions_provided', dataType: 'boolean' },     // CR-015 block
    { symbol: 'operational_controls_applied', dataType: 'boolean' }, // CR-019 block
    { symbol: 'emergency_preparedness_planned', dataType: 'boolean' }, // CR-021 block
    { symbol: 'control_hierarchy_type', dataType: 'enum' },          // CR-020 warn spot
  ],
  'ISO-14002-2-07': [
    { symbol: 'effectiveness_evaluated', dataType: 'boolean' },      // CR-023 block
    { symbol: 'monitoring_measurement_defined', dataType: 'boolean' }, // CR-024 block
  ],
  'ISO-14002-2-08': [
    { symbol: 'improvement_actions_implemented', dataType: 'boolean' }, // CR-026 block
    { symbol: 'performance_indicators_tracked', dataType: 'boolean' }, // CR-025 warn spot
  ],
};

export type ISO14002_2Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** worksheet code → (symbol → { fieldId, dataType }) */
  fieldByWs: Record<string, Record<string, { fieldId: string; dataType: string }>>;
};

export async function seedISO14002_2(sql: postgres.Sql, userId: string): Promise<ISO14002_2Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso14002-2-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO14002-2 Harness Org', ${'iso14002-2-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO14002-2-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-14002-2', 'ISO 14002-2 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldByWs: Record<string, Record<string, { fieldId: string; dataType: string }>> = {};
  const templateByWs: Record<string, string> = {};

  let wsOrder = 1;
  for (const ws of ISO14002_2_WORKSHEETS) {
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
    for (const f of ISO14002_2_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fieldByWs[ws][f.symbol] = { fieldId: row.id, dataType: f.dataType };
    }
  }

  for (const g of ISO14002_2_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldByWs };
}
