/**
 * ISO 14019-1:2026 ("Sustainability information — Part 1: General principles and
 * requirements for validation and verification", First edition 2026-02,
 * ISO 14019-1:2026(en)) — CURRENT-PROD fixture for the REAL save-path
 * gate-execution-proof harness.
 *
 * TITLE NOTE (R-5): the campaign brief guessed the printed title as
 * "Environmental, social and governance / sustainability data". The rendered PDF
 * cover (SR-3) prints "Sustainability information — Part 1: General principles and
 * requirements for validation and verification". The verbatim title is used here.
 *
 * This is a REQUIREMENTS-bearing standard whose enforcement surface is the
 * compliance layer (it prints NO equations — prod carries 0). Topology VERBATIM
 * from prod (standard cf8bc97c-6a02-4f76-b977-f2d4dc9ab17a, project
 * vadsmshzebefjreqcicl, re-pulled this session, R-2):
 *   8 worksheets · 17 BLOCK gates · 12 WARN gates · 0 equations.
 *
 * The 17 BLOCK gates split into four engine shapes (all proven BOTH ways in the
 * verify test through the REAL saveWorksheet -> checkApprovalGate chain):
 *   - 11 boolean attestations `flag == true`
 *       (CR-001/010/011/014/015/016/018/019/020/022/026)
 *   - 4 existence gates `symbol IS NOT NULL`
 *       (CR-017 enum, CR-021 text, CR-023 text, CR-027 enum)
 *   - 1 membership gate `assurance_conclusion IN {4 lowercase-quoted values}`
 *       (CR-024) — the members equal the FULL enum domain
 *       {unmodified,qualified,adverse,disclaimed} (§6.2.2, verbatim), so under the
 *       UI it can never fail: any selectable value passes, null -> pending (never a
 *       fail). It reaches a definite `fail` ONLY on an out-of-domain value — which
 *       the save path does NOT reject (no enum-domain validation), so the harness
 *       drives it both ways by injecting one. Flagged as an effective NO-OP.
 *   - 1 disjunction `mixed_engagement_separation == true OR
 *       validation_verification_mode != 'mixed'` (CR-025) — real-enforcing:
 *       fails iff mode == 'mixed' AND separation != true (§6.3.2 "shall apply").
 *       The `!= 'mixed'` is a string-literal comparison, NOT the never-fail
 *       trap-2 `!= null`/`!= ''` shape.
 *
 * CROSS-WORKSHEET gates (resolved via checkApprovalGate's project-wide
 * conflict-free fallback, makeGateLookup):
 *   - CR-001: gate on ws-04, reads `iso17029_conformance` (a field of ws-01).
 *   - CR-025: gate on ws-07, reads `validation_verification_mode` (a field of ws-01)
 *             in the OR's second disjunct; `mixed_engagement_separation` is local to ws-07.
 *
 * Source anchors (rendered PDF, SR-3): CR-001 §1/§7.1.1 (ISO/IEC 17029); CR-010
 * §4.6; CR-011 §4.7; CR-014 §7.1.2; CR-015 §7.2; CR-016 §7.3.1; CR-017 §7.3.2;
 * CR-018 §7.3.3; CR-019 §7.4.1; CR-020 §7.5; CR-021 §7.5 d)/ISO 14019-4;
 * CR-022 §7.5 e); CR-023 §6.2.1; CR-024 §6.2.2; CR-025 §6.3.2; CR-026 §6.4;
 * CR-027 §7.6.1. No prod credentials; disposable embedded PG. Nothing is applied
 * to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type FType = 'boolean' | 'text' | 'number' | 'enum';

/** All 29 prod compliance gates (17 block + 12 warn), conditions + severities
 *  VERBATIM from prod compliance_requirements. Nothing is fixed here. */
export const ISO14019_1_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // ── ws-02 (§5 Declared sustainability information) ──
  { ws: 'ISO-14019-1-02', code: 'CR-002', sev: 'warn', cond: 'declared_sustainability_information IS NOT NULL AND information_type IS NOT NULL AND time_orientation IS NOT NULL' },
  { ws: 'ISO-14019-1-02', code: 'CR-003', sev: 'warn', cond: 'raw_data_access == true' },
  { ws: 'ISO-14019-1-02', code: 'CR-004', sev: 'warn', cond: 'vv_activity_applied IS NOT NULL' },
  // ── ws-03 (§4 Principles) ──
  { ws: 'ISO-14019-1-03', code: 'CR-005', sev: 'warn', cond: 'evidence_based_approach == true' },
  { ws: 'ISO-14019-1-03', code: 'CR-006', sev: 'warn', cond: '' }, // EMPTY condition -> manual (no-op warn)
  { ws: 'ISO-14019-1-03', code: 'CR-007', sev: 'warn', cond: 'consistent_approach == true AND process_documented == true' },
  { ws: 'ISO-14019-1-03', code: 'CR-008', sev: 'warn', cond: 'impartiality_maintained == true' },
  { ws: 'ISO-14019-1-03', code: 'CR-009', sev: 'warn', cond: 'competence_capacity_confirmed == true' },
  { ws: 'ISO-14019-1-03', code: 'CR-010', sev: 'block', cond: 'confidentiality_safeguarded == true' },
  { ws: 'ISO-14019-1-03', code: 'CR-011', sev: 'block', cond: 'integrity_demonstrated == true' },
  { ws: 'ISO-14019-1-03', code: 'CR-012', sev: 'warn', cond: 'fair_presentation == true' },
  { ws: 'ISO-14019-1-03', code: 'CR-013', sev: 'warn', cond: 'due_professional_care == true AND professional_judgement == true' },
  // ── ws-04 (§7.1 Programme suitability) ──
  { ws: 'ISO-14019-1-04', code: 'CR-001', sev: 'block', cond: 'iso17029_conformance == true' }, // field lives on ws-01 (cross-ws fallback)
  { ws: 'ISO-14019-1-04', code: 'CR-014', sev: 'block', cond: 'programme_suitability_confirmed == true' },
  { ws: 'ISO-14019-1-04', code: 'CR-015', sev: 'block', cond: 'information_description_complete == true' },
  // ── ws-05 (§7.3/§7.4 Requirements & criteria) ──
  { ws: 'ISO-14019-1-05', code: 'CR-016', sev: 'block', cond: 'requirements_criteria_identified == true' },
  { ws: 'ISO-14019-1-05', code: 'CR-017', sev: 'block', cond: 'criteria_availability IS NOT NULL' },
  { ws: 'ISO-14019-1-05', code: 'CR-018', sev: 'block', cond: 'criteria_suitability_confirmed == true' },
  { ws: 'ISO-14019-1-05', code: 'CR-019', sev: 'block', cond: 'engagement_scope_agreed == true' },
  { ws: 'ISO-14019-1-05', code: 'CR-029', sev: 'warn', cond: 'materiality_determined == true AND risk_assessment_done == true' },
  // ── ws-06 (§7.5/§7.6 Rules, procedures, competence, deliverable category) ──
  { ws: 'ISO-14019-1-06', code: 'CR-020', sev: 'block', cond: 'methodology_identified == true' },
  { ws: 'ISO-14019-1-06', code: 'CR-021', sev: 'block', cond: 'team_competence_criteria IS NOT NULL' },
  { ws: 'ISO-14019-1-06', code: 'CR-022', sev: 'block', cond: 'body_requirements_met == true' },
  { ws: 'ISO-14019-1-06', code: 'CR-027', sev: 'block', cond: 'deliverable_category_selected IS NOT NULL' },
  // ── ws-07 (§6 Assurance opinions & deliverables) ──
  { ws: 'ISO-14019-1-07', code: 'CR-023', sev: 'block', cond: 'assurance_opinion IS NOT NULL' },
  { ws: 'ISO-14019-1-07', code: 'CR-024', sev: 'block', cond: "assurance_conclusion IN {'unmodified','qualified','adverse','disclaimed'}" },
  { ws: 'ISO-14019-1-07', code: 'CR-025', sev: 'block', cond: "mixed_engagement_separation == true OR validation_verification_mode != 'mixed'" }, // mode field on ws-01 (cross-ws)
  { ws: 'ISO-14019-1-07', code: 'CR-026', sev: 'block', cond: 'deliverable_format_agreed == true' },
  // ── ws-08 (§8 Processes / conformity) ──
  { ws: 'ISO-14019-1-08', code: 'CR-028', sev: 'warn', cond: 'body_conformance_14019_4 == true' },
];

/** The 8 worksheet codes (topology parity with prod). */
export const ISO14019_1_WORKSHEETS: readonly string[] = [
  'ISO-14019-1-01', 'ISO-14019-1-02', 'ISO-14019-1-03', 'ISO-14019-1-04',
  'ISO-14019-1-05', 'ISO-14019-1-06', 'ISO-14019-1-07', 'ISO-14019-1-08',
];

/** Fields seeded per HOME worksheet — every BLOCK gate read symbol on its home
 *  worksheet, the two cross-worksheet read fields on ws-01 (iso17029_conformance,
 *  validation_verification_mode), PLUS the fields a spot-checked WARN gate reads
 *  (data_type verbatim from prod). Not every prod field is seeded — only those a
 *  driven gate reads. */
export const ISO14019_1_FIELDS: Record<string, Array<{ symbol: string; dataType: FType }>> = {
  'ISO-14019-1-01': [
    { symbol: 'iso17029_conformance', dataType: 'boolean' },          // CR-001 block (gate on ws-04, cross-ws)
    { symbol: 'validation_verification_mode', dataType: 'enum' },     // CR-025 read (gate on ws-07, cross-ws)
  ],
  'ISO-14019-1-02': [
    { symbol: 'declared_sustainability_information', dataType: 'text' }, // CR-002 warn spot
    { symbol: 'information_type', dataType: 'enum' },                  // CR-002 warn spot
    { symbol: 'time_orientation', dataType: 'enum' },                 // CR-002 warn spot
    { symbol: 'raw_data_access', dataType: 'boolean' },               // CR-003 warn spot
  ],
  'ISO-14019-1-03': [
    { symbol: 'confidentiality_safeguarded', dataType: 'boolean' },   // CR-010 block
    { symbol: 'integrity_demonstrated', dataType: 'boolean' },        // CR-011 block
    { symbol: 'evidence_based_approach', dataType: 'boolean' },       // CR-005 warn spot
  ],
  'ISO-14019-1-04': [
    { symbol: 'programme_suitability_confirmed', dataType: 'boolean' }, // CR-014 block
    { symbol: 'information_description_complete', dataType: 'boolean' }, // CR-015 block
    // NB: CR-001 hosted here but reads iso17029_conformance from ws-01 (fallback)
  ],
  'ISO-14019-1-05': [
    { symbol: 'requirements_criteria_identified', dataType: 'boolean' }, // CR-016 block
    { symbol: 'criteria_availability', dataType: 'enum' },            // CR-017 block
    { symbol: 'criteria_suitability_confirmed', dataType: 'boolean' }, // CR-018 block
    { symbol: 'engagement_scope_agreed', dataType: 'boolean' },       // CR-019 block
  ],
  'ISO-14019-1-06': [
    { symbol: 'methodology_identified', dataType: 'boolean' },        // CR-020 block
    { symbol: 'team_competence_criteria', dataType: 'text' },         // CR-021 block
    { symbol: 'body_requirements_met', dataType: 'boolean' },         // CR-022 block
    { symbol: 'deliverable_category_selected', dataType: 'enum' },    // CR-027 block
  ],
  'ISO-14019-1-07': [
    { symbol: 'assurance_opinion', dataType: 'text' },                // CR-023 block
    { symbol: 'assurance_conclusion', dataType: 'enum' },             // CR-024 block
    { symbol: 'mixed_engagement_separation', dataType: 'boolean' },   // CR-025 block (local disjunct)
    { symbol: 'deliverable_format_agreed', dataType: 'boolean' },     // CR-026 block
  ],
  'ISO-14019-1-08': [
    { symbol: 'body_conformance_14019_4', dataType: 'boolean' },      // CR-028 warn spot
  ],
};

export type ISO14019_1Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** worksheet code → (symbol → { fieldId, dataType }) */
  fieldByWs: Record<string, Record<string, { fieldId: string; dataType: string }>>;
};

export async function seedISO14019_1(sql: postgres.Sql, userId: string): Promise<ISO14019_1Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso14019-1-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO14019-1 Harness Org', ${'iso14019-1-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO14019-1-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-14019-1', 'ISO 14019-1 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldByWs: Record<string, Record<string, { fieldId: string; dataType: string }>> = {};
  const templateByWs: Record<string, string> = {};

  let wsOrder = 1;
  for (const ws of ISO14019_1_WORKSHEETS) {
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
    for (const f of ISO14019_1_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fieldByWs[ws][f.symbol] = { fieldId: row.id, dataType: f.dataType };
    }
  }

  for (const g of ISO14019_1_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldByWs };
}
