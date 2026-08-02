/**
 * ISO 59014 ("Environmental management and circular economy — Sustainability and
 * traceability of secondary materials recovery — Principles and requirements";
 * DRAFT INTERNATIONAL STANDARD ISO/DIS 59014:2023(E), ISO/TC 207/SC 5) — minimal
 * fixture for the REAL save-path execution-proof harness.
 *
 * ⚠ EDITION: this is a DIS (Draft International Standard), i.e. a DRAFT. Clause/
 * table numbering and text can still move before the published ISO 59014. Encoding
 * is verified against the DIS PDF (rendered ground truth, SR-3):
 *   C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\
 *     ISO 59014\ISO-59014-Unlocked.pdf  (+ .txt extract, secondary).
 *
 * PROOF MANDATE: gate enforcement is claimable ONLY by EXECUTION. This fixture
 * drives every one of the standard's 52 live BLOCK gates through the REAL
 * `saveWorksheet` (values persist to project_parameters) and the REAL
 * `checkApprovalGate` (the engineer-approve enforcement read path that replays each
 * block condition against the saved values). Each gate is demonstrated BOTH ways —
 * a state that PASSES it and a state that VIOLATES it (definite `fail`) — so a gate
 * that fires but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard afeaacac-382f-453e-baf6-936db7451d8c,
 * project vadsmshzebefjreqcicl, this session, R-2): 10 worksheet_templates,
 * 52 BLOCK + 2 WARN gates, 0 equations, 84 fields. Conditions + severities are
 * verbatim from prod compliance_requirements; nothing is fixed here.
 *
 * REQUIREMENTS STANDARD — block-heavy is CORRECT. Unlike ISO 59004 (1 shall in 62
 * pp), ISO 59014 is "Principles and requirements": 87 "shall" clauses in the DIS.
 * Every one of the 52 block gates traces to a printed "shall" (encoding→source
 * spot-check across all 8 gate-bearing worksheets — see the wave report). §4
 * Principles is the only prose-y section; its 2 gates are WARN (CR-001/002).
 *
 * ENGINE-TRAP AUDIT (block side, all 52 checked against evaluate.ts + live strings):
 *   - 48 boolean-equality attestations `symbol == true` / `== True`. The tokenizer
 *     lowercases keywords (KEYWORDS[word.toLowerCase()]), so `== True` (CR-011/017/
 *     018) parses IDENTICALLY to `== true` → a real boolean-literal RHS, NOT a
 *     string-coerced no-op. Proven enforcing both ways below.
 *   - 4 existence gates `IS NOT NULL` (CR-041 recycling_rate; CR-047 a-g;
 *     CR-048 h-j; CR-049 k-p) — the correct existence operator (NOT the never-fail
 *     `!= null` trap-2 shape). Proven both ways.
 *   - 3 compound gates use AND of the above shapes (CR-019, and the multi-field
 *     CR-047/048/049). No OR, no ordering op, no IN, no IF/THEN, no bare-ident RHS,
 *     no `!= ''`, no empty-condition BLOCK gate, no literal-TRUE no-op.
 *   ⇒ ALL 52 are real-enforcing; 0 no-op. No source-settled defect; nothing staged.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type FType = 'boolean' | 'text' | 'number' | 'enum';
type Kind = 'bool' | 'exists';

/** A gate with its read symbols (single-source for both the seed fields and the
 *  both-ways drive). `read` lists the symbols the condition looks up, in order;
 *  `kind` says how to violate it (flip[0] false, or null[0]). */
type Gate = {
  ws: string; code: string; cond: string; sev: Sev;
  kind?: Kind;
  read?: ReadonlyArray<{ symbol: string; type: FType }>;
};

/** The 52 live BLOCK gates + 2 WARN gates, conditions + severities verbatim from prod. */
export const ISO59014_GATES: ReadonlyArray<Gate> = [
  // WS02 — Grundsaetze (§4 Principles) — the 2 WARN gates
  { ws: 'ISO-59014-02', code: 'CR-001', sev: 'warn', cond: 'principles_applied_true_fair_consistent == true',
    kind: 'bool', read: [{ symbol: 'principles_applied_true_fair_consistent', type: 'boolean' }] },
  { ws: 'ISO-59014-02', code: 'CR-002', sev: 'warn', cond: 'principle_considered IS NOT NULL',
    kind: 'exists', read: [{ symbol: 'principle_considered', type: 'enum' }] },

  // WS04 — Operational requirements: criteria & classification (§6.1–6.2, depollution §6.5)
  { ws: 'ISO-59014-04', code: 'CR-003', sev: 'block', cond: 'secondary_material_criteria_defined == true',
    kind: 'bool', read: [{ symbol: 'secondary_material_criteria_defined', type: 'boolean' }] },
  { ws: 'ISO-59014-04', code: 'CR-004', sev: 'block', cond: 'best_outcome_from_lifecycle_studies == true',
    kind: 'bool', read: [{ symbol: 'best_outcome_from_lifecycle_studies', type: 'boolean' }] },
  { ws: 'ISO-59014-04', code: 'CR-005', sev: 'block', cond: 'lca_rationale_documented == true',
    kind: 'bool', read: [{ symbol: 'lca_rationale_documented', type: 'boolean' }] },
  { ws: 'ISO-59014-04', code: 'CR-006', sev: 'block', cond: 'recovery_targets_quant_qual == true',
    kind: 'bool', read: [{ symbol: 'recovery_targets_quant_qual', type: 'boolean' }] },
  { ws: 'ISO-59014-04', code: 'CR-007', sev: 'block', cond: 'attribute_list_maintained == true',
    kind: 'bool', read: [{ symbol: 'attribute_list_maintained', type: 'boolean' }] },
  { ws: 'ISO-59014-04', code: 'CR-008', sev: 'block', cond: 'recovery_pathway_methodology_applied == true',
    kind: 'bool', read: [{ symbol: 'recovery_pathway_methodology_applied', type: 'boolean' }] },
  { ws: 'ISO-59014-04', code: 'CR-009', sev: 'block', cond: 'delivery_identified == true',
    kind: 'bool', read: [{ symbol: 'delivery_identified', type: 'boolean' }] },
  { ws: 'ISO-59014-04', code: 'CR-010', sev: 'block', cond: 'recovery_decision_documented == true',
    kind: 'bool', read: [{ symbol: 'recovery_decision_documented', type: 'boolean' }] },
  // CR-011/017/018 — CAPITAL `True` (engine lowercases keywords → same as `true`).
  { ws: 'ISO-59014-04', code: 'CR-011', sev: 'block', cond: 'attest_iso_59014_04_cr_011 == True',
    kind: 'bool', read: [{ symbol: 'attest_iso_59014_04_cr_011', type: 'boolean' }] },
  { ws: 'ISO-59014-04', code: 'CR-017', sev: 'block', cond: 'attest_iso_59014_04_cr_017 == True',
    kind: 'bool', read: [{ symbol: 'attest_iso_59014_04_cr_017', type: 'boolean' }] },
  { ws: 'ISO-59014-04', code: 'CR-018', sev: 'block', cond: 'attest_iso_59014_04_cr_018 == True',
    kind: 'bool', read: [{ symbol: 'attest_iso_59014_04_cr_018', type: 'boolean' }] },

  // WS05 — Collection, sorting, material recovery & logistics (§6.3–6.6)
  { ws: 'ISO-59014-05', code: 'CR-012', sev: 'block', cond: 'sorted_per_attributes == true',
    kind: 'bool', read: [{ symbol: 'sorted_per_attributes', type: 'boolean' }] },
  { ws: 'ISO-59014-05', code: 'CR-013', sev: 'block', cond: 'non_recoverables_to_final_treatment == true',
    kind: 'bool', read: [{ symbol: 'non_recoverables_to_final_treatment', type: 'boolean' }] },
  { ws: 'ISO-59014-05', code: 'CR-014', sev: 'block', cond: 'sorted_by_traceability_data_held == true',
    kind: 'bool', read: [{ symbol: 'sorted_by_traceability_data_held', type: 'boolean' }] },
  { ws: 'ISO-59014-05', code: 'CR-015', sev: 'block', cond: 'material_types_kept_separate == true',
    kind: 'bool', read: [{ symbol: 'material_types_kept_separate', type: 'boolean' }] },
  { ws: 'ISO-59014-05', code: 'CR-016', sev: 'block', cond: 'process_selection_lifecycle_supported == true',
    kind: 'bool', read: [{ symbol: 'process_selection_lifecycle_supported', type: 'boolean' }] },
  { ws: 'ISO-59014-05', code: 'CR-019', sev: 'block',
    cond: 'logistics_facilitates_recovery == true AND adequate_packaging_used == true',
    kind: 'bool', read: [
      { symbol: 'logistics_facilitates_recovery', type: 'boolean' },
      { symbol: 'adequate_packaging_used', type: 'boolean' },
    ] },

  // WS06 — Management: context, stakeholders & value chain (§7.1–7.3)
  { ws: 'ISO-59014-06', code: 'CR-020', sev: 'block', cond: 'context_issues_determined == true',
    kind: 'bool', read: [{ symbol: 'context_issues_determined', type: 'boolean' }] },
  { ws: 'ISO-59014-06', code: 'CR-021', sev: 'block', cond: 'interested_parties_identified == true',
    kind: 'bool', read: [{ symbol: 'interested_parties_identified', type: 'boolean' }] },
  { ws: 'ISO-59014-06', code: 'CR-022', sev: 'block', cond: 'two_way_communication_channels == true',
    kind: 'bool', read: [{ symbol: 'two_way_communication_channels', type: 'boolean' }] },
  { ws: 'ISO-59014-06', code: 'CR-023', sev: 'block', cond: 'value_chain_code_of_conduct == true',
    kind: 'bool', read: [{ symbol: 'value_chain_code_of_conduct', type: 'boolean' }] },
  { ws: 'ISO-59014-06', code: 'CR-024', sev: 'block', cond: 'capacity_development_needs_identified == true',
    kind: 'bool', read: [{ symbol: 'capacity_development_needs_identified', type: 'boolean' }] },

  // WS07 — Subsistence activities & equitable working conditions (§7.4–7.5)
  { ws: 'ISO-59014-07', code: 'CR-025', sev: 'block', cond: 'sa_enabling_environment == true',
    kind: 'bool', read: [{ symbol: 'sa_enabling_environment', type: 'boolean' }] },
  { ws: 'ISO-59014-07', code: 'CR-026', sev: 'block', cond: 'decent_work_conditions == true',
    kind: 'bool', read: [{ symbol: 'decent_work_conditions', type: 'boolean' }] },
  { ws: 'ISO-59014-07', code: 'CR-027', sev: 'block', cond: 'child_forced_labour_prevented == true',
    kind: 'bool', read: [{ symbol: 'child_forced_labour_prevented', type: 'boolean' }] },
  { ws: 'ISO-59014-07', code: 'CR-028', sev: 'block', cond: 'freedom_of_association == true',
    kind: 'bool', read: [{ symbol: 'freedom_of_association', type: 'boolean' }] },
  { ws: 'ISO-59014-07', code: 'CR-029', sev: 'block', cond: 'ppe_provided == true',
    kind: 'bool', read: [{ symbol: 'ppe_provided', type: 'boolean' }] },
  { ws: 'ISO-59014-07', code: 'CR-030', sev: 'block', cond: 'sanitary_facilities_accessible == true',
    kind: 'bool', read: [{ symbol: 'sanitary_facilities_accessible', type: 'boolean' }] },
  { ws: 'ISO-59014-07', code: 'CR-031', sev: 'block', cond: 'maternity_safety_measures == true',
    kind: 'bool', read: [{ symbol: 'maternity_safety_measures', type: 'boolean' }] },

  // WS08 — Risks (§7.6)
  { ws: 'ISO-59014-08', code: 'CR-032', sev: 'block', cond: 'communities_informed_of_risks == true',
    kind: 'bool', read: [{ symbol: 'communities_informed_of_risks', type: 'boolean' }] },
  { ws: 'ISO-59014-08', code: 'CR-033', sev: 'block', cond: 'env_social_risks_assessed == true',
    kind: 'bool', read: [{ symbol: 'env_social_risks_assessed', type: 'boolean' }] },
  { ws: 'ISO-59014-08', code: 'CR-034', sev: 'block', cond: 'emergency_communication_procedure == true',
    kind: 'bool', read: [{ symbol: 'emergency_communication_procedure', type: 'boolean' }] },
  { ws: 'ISO-59014-08', code: 'CR-035', sev: 'block', cond: 'risk_control_measures_implemented == true',
    kind: 'bool', read: [{ symbol: 'risk_control_measures_implemented', type: 'boolean' }] },
  { ws: 'ISO-59014-08', code: 'CR-036', sev: 'block', cond: 'harmful_substances_removed == true',
    kind: 'bool', read: [{ symbol: 'harmful_substances_removed', type: 'boolean' }] },
  { ws: 'ISO-59014-08', code: 'CR-037', sev: 'block', cond: 'health_safety_risk_assessment == true',
    kind: 'bool', read: [{ symbol: 'health_safety_risk_assessment', type: 'boolean' }] },
  { ws: 'ISO-59014-08', code: 'CR-038', sev: 'block', cond: 'health_safety_risks_communicated == true',
    kind: 'bool', read: [{ symbol: 'health_safety_risks_communicated', type: 'boolean' }] },

  // WS09 — Resource use, monitoring & competencies (§7.7–7.9)
  { ws: 'ISO-59014-09', code: 'CR-039', sev: 'block', cond: 'resource_use_minimized == true',
    kind: 'bool', read: [{ symbol: 'resource_use_minimized', type: 'boolean' }] },
  { ws: 'ISO-59014-09', code: 'CR-040', sev: 'block', cond: 'baseline_of_conformity == true',
    kind: 'bool', read: [{ symbol: 'baseline_of_conformity', type: 'boolean' }] },
  { ws: 'ISO-59014-09', code: 'CR-041', sev: 'block', cond: 'recycling_rate IS NOT NULL',
    kind: 'exists', read: [{ symbol: 'recycling_rate', type: 'number' }] },
  { ws: 'ISO-59014-09', code: 'CR-042', sev: 'block', cond: 'effectiveness_monitored == true',
    kind: 'bool', read: [{ symbol: 'effectiveness_monitored', type: 'boolean' }] },
  { ws: 'ISO-59014-09', code: 'CR-043', sev: 'block', cond: 'workers_informed_of_results == true',
    kind: 'bool', read: [{ symbol: 'workers_informed_of_results', type: 'boolean' }] },
  { ws: 'ISO-59014-09', code: 'CR-044', sev: 'block', cond: 'competencies_determined == true',
    kind: 'bool', read: [{ symbol: 'competencies_determined', type: 'boolean' }] },
  { ws: 'ISO-59014-09', code: 'CR-045', sev: 'block', cond: 'training_needs_identified == true',
    kind: 'bool', read: [{ symbol: 'training_needs_identified', type: 'boolean' }] },

  // WS10 — Traceability requirements (§8)
  { ws: 'ISO-59014-10', code: 'CR-046', sev: 'block', cond: 'traceability_system_implemented == true',
    kind: 'bool', read: [{ symbol: 'traceability_system_implemented', type: 'boolean' }] },
  { ws: 'ISO-59014-10', code: 'CR-047', sev: 'block',
    cond: 'upstream_org_name_address IS NOT NULL AND upstream_coc_confirmation IS NOT NULL AND upstream_receipt_release_dates IS NOT NULL AND upstream_consignment_origin IS NOT NULL AND upstream_unique_reference IS NOT NULL AND classification_system_used IS NOT NULL AND assigned_sorting_attributes IS NOT NULL',
    kind: 'exists', read: [
      { symbol: 'upstream_org_name_address', type: 'text' },
      { symbol: 'upstream_coc_confirmation', type: 'boolean' },
      { symbol: 'upstream_receipt_release_dates', type: 'text' },
      { symbol: 'upstream_consignment_origin', type: 'text' },
      { symbol: 'upstream_unique_reference', type: 'text' },
      { symbol: 'classification_system_used', type: 'text' },
      { symbol: 'assigned_sorting_attributes', type: 'text' },
    ] },
  { ws: 'ISO-59014-10', code: 'CR-048', sev: 'block',
    cond: 'processing_inputs_quantity IS NOT NULL AND inputs_routing_percentage IS NOT NULL AND processing_outputs_quantity IS NOT NULL',
    kind: 'exists', read: [
      { symbol: 'processing_inputs_quantity', type: 'number' },
      { symbol: 'inputs_routing_percentage', type: 'number' },
      { symbol: 'processing_outputs_quantity', type: 'number' },
    ] },
  { ws: 'ISO-59014-10', code: 'CR-049', sev: 'block',
    cond: 'downstream_receiver_name_address IS NOT NULL AND downstream_shipment_address IS NOT NULL AND outputs_routing_percentage IS NOT NULL AND downstream_unique_reference IS NOT NULL AND classification_system_used IS NOT NULL AND assigned_sorting_attributes IS NOT NULL',
    kind: 'exists', read: [
      { symbol: 'downstream_receiver_name_address', type: 'text' },
      { symbol: 'downstream_shipment_address', type: 'text' },
      { symbol: 'outputs_routing_percentage', type: 'number' },
      { symbol: 'downstream_unique_reference', type: 'text' },
      { symbol: 'classification_system_used', type: 'text' },
      { symbol: 'assigned_sorting_attributes', type: 'text' },
    ] },
  { ws: 'ISO-59014-10', code: 'CR-050', sev: 'block', cond: 'depollution_info_accompanies == true',
    kind: 'bool', read: [{ symbol: 'depollution_info_accompanies', type: 'boolean' }] },
  { ws: 'ISO-59014-10', code: 'CR-051', sev: 'block', cond: 'traceability_claims_recognized_model == true',
    kind: 'bool', read: [{ symbol: 'traceability_claims_recognized_model', type: 'boolean' }] },
  { ws: 'ISO-59014-10', code: 'CR-052', sev: 'block', cond: 'traceability_data_made_available == true',
    kind: 'bool', read: [{ symbol: 'traceability_data_made_available', type: 'boolean' }] },
  { ws: 'ISO-59014-10', code: 'CR-053', sev: 'block', cond: 'traceability_system_reviewed == true',
    kind: 'bool', read: [{ symbol: 'traceability_system_reviewed', type: 'boolean' }] },
  { ws: 'ISO-59014-10', code: 'CR-054', sev: 'block', cond: 'traceability_data_inaccessible_justified == true',
    kind: 'bool', read: [{ symbol: 'traceability_data_inaccessible_justified', type: 'boolean' }] },
] as const;

/** The 10 worksheet codes (topology parity with prod). */
export const ISO59014_WORKSHEETS: readonly string[] = [
  'ISO-59014-01', 'ISO-59014-02', 'ISO-59014-03', 'ISO-59014-04', 'ISO-59014-05',
  'ISO-59014-06', 'ISO-59014-07', 'ISO-59014-08', 'ISO-59014-09', 'ISO-59014-10',
];

/**
 * Fields to seed per HOME worksheet — every read symbol of every gate (block +
 * the 2 warn), derived single-source from ISO59014_GATES[].read. Deduped per
 * (ws, symbol): CR-047 and CR-049 share classification_system_used +
 * assigned_sorting_attributes on WS10, so each field is inserted once.
 * WS01/03 carry no gates (scope / activities-processes) → no seeded fields.
 */
export const ISO59014_FIELDS: Record<string, Array<{ symbol: string; dataType: FType }>> = (() => {
  const out: Record<string, Array<{ symbol: string; dataType: FType }>> = {};
  const seen = new Set<string>();
  for (const g of ISO59014_GATES) {
    for (const r of g.read ?? []) {
      const key = `${g.ws}::${r.symbol}`;
      if (seen.has(key)) continue;
      seen.add(key);
      (out[g.ws] ??= []).push({ symbol: r.symbol, dataType: r.type });
    }
  }
  return out;
})();

export type ISO59014Fixture = {
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

export async function seedISO59014(sql: postgres.Sql, userId: string): Promise<ISO59014Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso59014-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO59014 Harness Org', ${'iso59014-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO59014-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-59014', 'ISO 59014 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  // Create all 10 worksheet templates + a section + an instance (topology parity).
  let wsOrder = 1;
  for (const ws of ISO59014_WORKSHEETS) {
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
    for (const f of ISO59014_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fields[f.symbol] = row.id;
      fieldMeta[f.symbol] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the gates (52 block + 2 warn) against their host worksheet templates.
  for (const g of ISO59014_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
