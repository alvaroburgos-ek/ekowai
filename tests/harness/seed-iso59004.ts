/**
 * ISO 59004 ("Circular economy — Vocabulary, principles and guidance for
 * implementation"; FINAL DRAFT ISO/FDIS 59004:2024(en), ISO/TC 323) — minimal
 * fixture for the REAL save-path execution-proof harness.
 *
 * ⚠ EDITION: this is an FDIS (Final Draft International Standard), i.e. a DRAFT.
 * Clause/table numbering and text can still move before the published ISO 59004.
 * Encoding is verified against the FDIS PDF (rendered ground truth, SR-3):
 *   C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\
 *     ISO 59004\ISO_FDIS_59004_N.pdf  (62 pp).
 *
 * PROOF MANDATE: gate enforcement is claimable ONLY by EXECUTION. This fixture
 * drives the standard's SINGLE live BLOCK gate through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition
 * against the saved values). The gate is demonstrated BOTH ways — a state that
 * PASSES it and a state that VIOLATES it (definite `fail`) — so a gate that
 * fires but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard 98737198-0988-49c6-80cb-bb077ff29fb1,
 * project vadsmshzebefjreqcicl, this session, R-2): 6 worksheet_templates,
 * 1 BLOCK + 43 WARN gates, 0 equations, 33 fields. Conditions + severities are
 * verbatim from prod compliance_requirements; nothing is fixed here.
 *
 * ADVISORY-BY-CONSTRUCTION. This is a vocabulary/principles/guidance ISO written
 * almost entirely in "should" prose. There is exactly ONE "shall" in all 62
 * pages, and it is the boilerplate patent disclaimer ("ISO shall not be held
 * responsible…") — NOT a normative requirement. §2 states verbatim "There are no
 * normative references in this document." So a warn-heavy encoding is correct;
 * enforcement is not invented.
 *
 * THE SOLE BLOCK GATE:
 *   CR-015 (WS04, §5.3.4 "Risk and opportunity management")
 *     hazardous_substance_risk_approach == true
 *   Source clause (verbatim, §5.3.4): "A circular economy should not harm the
 *   health of people, wildlife or the environment. Therefore, a risk-based
 *   approach should be used to avoid exposure to hazardous substances. When
 *   possible, organizations should avoid their use."
 *   NOTE — the source verb is "should", not "shall": elevating it to BLOCK is a
 *   modal-severity JUDGMENT (sign-off sheet), NOT a source-settled fact. The gate
 *   nonetheless GENUINELY ENFORCES (real boolean read field, not a no-op): it is
 *   proven both ways below. pass true → no block; VIOLATE false → block.
 *
 * GATE-SHAPE audit (block side): the one block gate is a boolean-equality
 * attestation `symbol == true`. There is NO literal-`TRUE` no-op block gate, NO
 * `!= ''` / `== null` / `!= null` block gate, NO empty-condition block gate, and
 * NO `IN {…}` / `IF…THEN` block gate. (24 of the 43 WARN gates carry an EMPTY
 * condition → evaluator returns `manual` → they never block; that is fine because
 * they are WARN, never BLOCK.)
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 1 live BLOCK gate + 43 WARN gates, conditions + severities verbatim from prod. */
export const ISO59004_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // WS01 — Registrierung & Anwendungsbereich (§1 Scope)
  { ws: 'ISO-59004-01', code: 'CR-001', cond: 'organization_name IS NOT NULL AND organization_type IS NOT NULL AND value_chain_position IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-59004-01', code: 'CR-002', cond: 'ce_commitment == true', sev: 'warn' },
  // WS02 — Terminologie & Definitionen (§3) — NO gates (definitions only)
  // WS03 — Vision der Kreislaufwirtschaft (§4)
  { ws: 'ISO-59004-03', code: 'CR-003', cond: 'ce_vision_statement IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-59004-03', code: 'CR-004', cond: 'systems_thinking_applied == true', sev: 'warn' },
  { ws: 'ISO-59004-03', code: 'CR-005', cond: 'principles_integrated == true', sev: 'warn' },
  // WS04 — Grundsaetze der Kreislaufwirtschaft (§5)
  { ws: 'ISO-59004-04', code: 'CR-006', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-04', code: 'CR-007', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-04', code: 'CR-008', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-04', code: 'CR-009', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-04', code: 'CR-010', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-04', code: 'CR-011', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-04', code: 'CR-012', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-04', code: 'CR-013', cond: 'all_principles_considered == true', sev: 'warn' },
  { ws: 'ISO-59004-04', code: 'CR-014', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-04', code: 'CR-015', cond: 'hazardous_substance_risk_approach == true', sev: 'block' },
  { ws: 'ISO-59004-04', code: 'CR-016', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-04', code: 'CR-017', cond: 'stocks_flows_monitored == true', sev: 'warn' },
  // WS05 — Massnahmen fuer eine Kreislaufwirtschaft (§6)
  { ws: 'ISO-59004-05', code: 'CR-018', cond: 'preliminary_action_refuse_rethink == true', sev: 'warn' },
  { ws: 'ISO-59004-05', code: 'CR-019', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-05', code: 'CR-020', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-05', code: 'CR-021', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-05', code: 'CR-022', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-05', code: 'CR-023', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-05', code: 'CR-024', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-05', code: 'CR-025', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-05', code: 'CR-026', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-05', code: 'CR-027', cond: 'life_cycle_perspective_applied == true', sev: 'warn' },
  { ws: 'ISO-59004-05', code: 'CR-028', cond: 'repair_before_remanufacture_before_recycle == true', sev: 'warn' },
  // WS06 — Leitfaden zur Umsetzung (§7)
  { ws: 'ISO-59004-06', code: 'CR-029', cond: 'implementation_stage IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-030', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-031', cond: 'implementation_level IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-032', cond: 'reference_situation_assessed == true AND baseline_circularity_assessment == true', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-033', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-034', cond: 'ce_purpose_mission_vision IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-035', cond: 'ce_goals IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-036', cond: 'ce_strategy IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-037', cond: 'value_creation_model IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-038', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-039', cond: 'ce_action_plan IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-040', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-041', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-042', cond: 'monitoring_review_process == true', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-043', cond: '', sev: 'warn' },
  { ws: 'ISO-59004-06', code: 'CR-044', cond: '', sev: 'warn' },
] as const;

/** The 6 worksheet codes (topology parity with prod). */
export const ISO59004_WORKSHEETS: readonly string[] = [
  'ISO-59004-01', 'ISO-59004-02', 'ISO-59004-03',
  'ISO-59004-04', 'ISO-59004-05', 'ISO-59004-06',
];

/**
 * Fields to seed per HOME worksheet — the block gate's read symbol on its REAL
 * prod home worksheet (WS04) plus the read symbols of the representative WARN
 * gates that are spot-checked never-block. Warn gates whose symbols are not
 * seeded, and the 24 EMPTY-condition warn gates, are never evaluated to a block
 * by the block-only approval gate, so they need no field row.
 */
export const ISO59004_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'ISO-59004-01': [
    { symbol: 'ce_commitment', dataType: 'boolean' },                    // CR-002 warn spot-check
  ],
  'ISO-59004-03': [
    { symbol: 'ce_vision_statement', dataType: 'text' },                 // CR-003 warn spot-check
  ],
  'ISO-59004-04': [
    { symbol: 'hazardous_substance_risk_approach', dataType: 'boolean' },// CR-015 BLOCK
    { symbol: 'all_principles_considered', dataType: 'boolean' },        // CR-013 warn spot-check
    { symbol: 'stocks_flows_monitored', dataType: 'boolean' },           // CR-017 warn spot-check
  ],
  'ISO-59004-06': [
    { symbol: 'monitoring_review_process', dataType: 'boolean' },        // CR-042 warn spot-check
  ],
};

export type ISO59004Fixture = {
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

export async function seedISO59004(sql: postgres.Sql, userId: string): Promise<ISO59004Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso59004-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO59004 Harness Org', ${'iso59004-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO59004-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-59004', 'ISO 59004 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  // Create all 6 worksheet templates + a section + an instance (topology parity).
  let wsOrder = 1;
  for (const ws of ISO59004_WORKSHEETS) {
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
    for (const f of ISO59004_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fields[f.symbol] = row.id;
      fieldMeta[f.symbol] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the gates (1 block + 43 warn) against their host worksheet templates.
  for (const g of ISO59004_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
