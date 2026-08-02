/**
 * ISO 14033 ("Environmental management — Quantitative environmental information
 * — Guidelines and examples"; First edition 2019, ISO 14033:2019(E), ISO/TC 207/
 * SC 4) — minimal fixture for the REAL save-path execution-proof harness.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This fixture drives
 * the standard's SINGLE equation through the REAL `evaluateFormula`, and its
 * gate posture through the REAL `saveWorksheet` + `checkApprovalGate` chain
 * against a disposable embedded Postgres. Conditions + severities are verbatim
 * from prod compliance_requirements (R-1 ground truth: this session's live
 * encoding dump `iso14033_encoding.json`); nothing is fixed here.
 *
 * Topology (verified live this session, project vadsmshzebefjreqcicl): 8
 * worksheet_templates, 0 BLOCK gates, 27 WARN gates, 1 equation, 48 fields.
 *
 * ⚠ ZERO-BLOCK-GATE STANDARD BY CONSTRUCTION. This is a "Guidelines and examples"
 * ISO written in "should" prose. There is exactly ONE "shall" in the whole
 * document and it is the patent-rights boilerplate in the Foreword ("ISO shall
 * not be held responsible for identifying any … patent rights") — NOT a
 * normative requirement. The body carries 99 "should" statements and no
 * operational "shall". §2 lists only ISO 14050 (vocabulary) as a normative
 * reference. So a warn-only encoding is CORRECT-BY-SOURCE: this standard
 * enforces nothing; it guides. Enforcement is not invented.
 *
 * THE 1 EQUATION (WS06 "Quantitative Verarbeitung", the Do/consolidate step
 * §6.3.3, method printed in Annex A §A.2.4, doc p.23):
 *   parameter_value = activity_data * emission_removal_factor
 *   Source (verbatim, doc p.23): "calculations based on activity data multiplied
 *   by emission or removal factors". Both inputs resolve to declared number
 *   fields on WS06; output parameter_value is the declared number LHS; operator
 *   `*` matches "multiplied by". FAITHFUL → the engine computes it.
 *
 * GATE-SHAPE audit (all 27 are WARN, so any no-op is COSMETIC — a warn gate
 * never enters the approval-gate BLOCK set regardless of its condition):
 *   - CR-025, CR-026 (WS07) carry an EMPTY condition → evaluator returns
 *     `manual` → never block. Fine (warn).
 *   - CR-027 (WS08) uses `improvement_actions != ''` — the bare `!= ''` shape.
 *     Cosmetic here (warn), reported for the sign-off sheet.
 *   - CR-002 (WS01) `application_scope IN {internal,external,comparison}` and
 *     CR-005 (WS02) `data_origin_category IN {primary,secondary}` use members
 *     byte-identical to the field enum values (no Titlecase trap).
 *   - CR-019 (WS06) `parameter_value == activity_data * emission_removal_factor`
 *     is the equation restated as a self-consistency WARN check (arithmetic
 *     equality, resolved via lookup — genuine, but advisory).
 *
 * Nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 27 WARN gates (0 block), conditions + severities verbatim from prod. */
export const ISO14033_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // WS01 — Registrierung & Anwendungsbereich (§1 Scope / §4 Use / §2 Normative refs)
  { ws: 'ISO-14033-01', code: 'CR-001', cond: 'system_identifier IS NOT NULL AND intended_application IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-14033-01', code: 'CR-002', cond: 'application_scope IN {internal,external,comparison}', sev: 'warn' },
  { ws: 'ISO-14033-01', code: 'CR-003', cond: 'comparison_application != true OR principle_comparability == true', sev: 'warn' },
  { ws: 'ISO-14033-01', code: 'CR-004', cond: 'normative_reference_iso14050 == true', sev: 'warn' },
  // WS02 — Begriffe & Datenkategorien (§3 / §6.1.2)
  { ws: 'ISO-14033-02', code: 'CR-005', cond: 'data_origin_category IN {primary,secondary}', sev: 'warn' },
  { ws: 'ISO-14033-02', code: 'CR-006', cond: 'measurement_method IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-14033-02', code: 'CR-007', cond: 'metadata_supplied == true', sev: 'warn' },
  // WS03 — Prinzipien (§5)
  { ws: 'ISO-14033-03', code: 'CR-008', cond: 'principle_relevance == true AND principle_credibility == true AND principle_consistency == true AND principle_transparency == true AND principle_completeness == true AND principle_validity == true AND principle_appropriateness == true AND principle_materiality == true', sev: 'warn' },
  // WS04 — Plan (§6.2)
  { ws: 'ISO-14033-04', code: 'CR-009', cond: 'objective_requirements IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-14033-04', code: 'CR-010', cond: 'system_conceptualization IS NOT NULL AND system_boundaries IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-14033-04', code: 'CR-011', cond: 'system_components IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-14033-04', code: 'CR-012', cond: 'selected_parameters IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-14033-04', code: 'CR-013', cond: 'basic_data_definition IS NOT NULL AND precision_scale IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-14033-04', code: 'CR-014', cond: 'measuring_method_plan IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-14033-04', code: 'CR-015', cond: 'metrological_confirmation == true', sev: 'warn' },
  // WS05 — Do (§6.3 acquire/consolidate/synthesize/aggregate)
  { ws: 'ISO-14033-05', code: 'CR-016', cond: 'measuring_setup_done == true', sev: 'warn' },
  { ws: 'ISO-14033-05', code: 'CR-017', cond: 'acquired_basic_data IS NOT NULL AND data_uncertainty IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-14033-05', code: 'CR-018', cond: 'consolidated_parameters IS NOT NULL', sev: 'warn' },
  // WS06 — Quantitative Verarbeitung (§6.3.3 / Annex A §A.2.4, doc p.23)
  { ws: 'ISO-14033-06', code: 'CR-019', cond: 'parameter_value == activity_data * emission_removal_factor', sev: 'warn' },
  // WS05 (continued) — synthesize/aggregate
  { ws: 'ISO-14033-05', code: 'CR-020', cond: 'synthesized_components IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-14033-05', code: 'CR-021', cond: 'aggregated_result IS NOT NULL', sev: 'warn' },
  // WS07 — Check (§6.4)
  { ws: 'ISO-14033-07', code: 'CR-022', cond: 'plan_do_correspondence == true', sev: 'warn' },
  { ws: 'ISO-14033-07', code: 'CR-023', cond: 'review_documented == true', sev: 'warn' },
  { ws: 'ISO-14033-07', code: 'CR-024', cond: 'consecutive_check_applied != true OR plan_do_correspondence == true', sev: 'warn' },
  { ws: 'ISO-14033-07', code: 'CR-025', cond: '', sev: 'warn' },
  { ws: 'ISO-14033-07', code: 'CR-026', cond: '', sev: 'warn' },
  // WS08 — Act (§6.5)
  { ws: 'ISO-14033-08', code: 'CR-027', cond: "improvement_actions != '' AND act_documented == true", sev: 'warn' },
] as const;

/** The 8 worksheet codes (topology parity with prod). */
export const ISO14033_WORKSHEETS: readonly string[] = [
  'ISO-14033-01', 'ISO-14033-02', 'ISO-14033-03', 'ISO-14033-04',
  'ISO-14033-05', 'ISO-14033-06', 'ISO-14033-07', 'ISO-14033-08',
];

/**
 * The 1 prod equation (WS06 "Quantitative Verarbeitung"; formula + output +
 * inputs verbatim from prod). Method printed verbatim in Annex A §A.2.4 (doc
 * p.23): "calculations based on activity data multiplied by emission or removal
 * factors". Driven through the REAL evaluateFormula.
 */
export const ISO14033_EQUATIONS: ReadonlyArray<{
  out: string; formula: string; inputs: string[];
}> = [
  {
    out: 'parameter_value',
    formula: 'parameter_value = activity_data * emission_removal_factor',
    inputs: ['activity_data', 'emission_removal_factor'],
  },
] as const;

/**
 * Fields to seed per HOME worksheet — the equation's input+output symbols on
 * their real prod home worksheet (WS06) plus the read symbols of the
 * representative WARN gates that are spot-checked never-block. Warn gates whose
 * symbols are not seeded, and the 2 EMPTY-condition warn gates (CR-025/026), are
 * never evaluated to a block by the block-only approval gate, so they need no
 * field row.
 */
export const ISO14033_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'ISO-14033-01': [
    { symbol: 'application_scope', dataType: 'enum' },              // CR-002 warn (IN-shape spot-check)
    { symbol: 'normative_reference_iso14050', dataType: 'boolean' },// CR-004 warn spot-check
  ],
  'ISO-14033-02': [
    { symbol: 'metadata_supplied', dataType: 'boolean' },           // CR-007 warn spot-check
  ],
  'ISO-14033-06': [
    { symbol: 'parameter_value', dataType: 'number' },              // equation output + CR-019 warn
    { symbol: 'activity_data', dataType: 'number' },                // equation input
    { symbol: 'emission_removal_factor', dataType: 'number' },      // equation input
  ],
  'ISO-14033-07': [
    { symbol: 'plan_do_correspondence', dataType: 'boolean' },      // CR-022 warn spot-check
  ],
  'ISO-14033-08': [
    { symbol: 'improvement_actions', dataType: 'text' },            // CR-027 warn (`!= ''`-shape spot-check)
    { symbol: 'act_documented', dataType: 'boolean' },              // CR-027 warn
  ],
};

export type ISO14033Fixture = {
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

export async function seedISO14033(sql: postgres.Sql, userId: string): Promise<ISO14033Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso14033-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO14033 Harness Org', ${'iso14033-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO14033-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-14033', 'ISO 14033 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  // Create all 8 worksheet templates + a section + an instance (topology parity).
  let wsOrder = 1;
  for (const ws of ISO14033_WORKSHEETS) {
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
    for (const f of ISO14033_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fields[f.symbol] = row.id;
      fieldMeta[f.symbol] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the gates (0 block + 27 warn) against their host worksheet templates.
  for (const g of ISO14033_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
