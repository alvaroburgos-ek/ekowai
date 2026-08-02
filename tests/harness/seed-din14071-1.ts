/**
 * DIN CEN ISO/TS 14071:2016 (ISO/TS 14071:2014) — "Umweltmanagement — Ökobilanz —
 * Prozesse der Kritischen Prüfung und Kompetenzen der Prüfer: Zusätzliche Anforderungen
 * und Anleitungen zu ISO 14044:2006". Minimal fixture for the REAL save-path
 * gate-execution-proof harness.
 *
 * SOURCE PRESENT: DIN-CEN-ISO-14071-1.pdf + .md in
 * C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-14071-1\. This wave is a FULL
 * document comparison. The standard is a MANAGEMENT/PROCESS specification (critical-review
 * process + reviewer competencies) — it prints NO equations and NO numeric tables, so the
 * encoding correctly carries 0 equations (Part B = NR, faithful by absence). This fixture is
 * the EXECUTION half: it proves each live BLOCK gate's enforcement through the real save
 * path. Conditions + severities are pulled verbatim from prod compliance_requirements
 * (standard DIN-14071-1 = 2eb3e188-d202-4c98-be1b-c90bf4eed3e0, project
 * vadsmshzebefjreqcicl, this session). Nothing is applied to prod.
 *
 * TOPOLOGY (verbatim from prod): 4 worksheet_templates (DIN-14071-1-01 … -04), 60 active
 * fields, 0 equations, 17 compliance_requirements — ALL severity='block' with a non-empty
 * condition. The fixture seeds all 4 worksheets and only the 30 distinct field symbols the
 * 14 symbol-reading gates actually read (the 3 CX gates read nothing). Each seeded symbol is
 * homed on exactly ONE worksheet (single-home topology — verified against prod), so
 * checkApprovalGate's conflict-free project-wide fallback resolves every cross-worksheet
 * operand.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing, TWO cases — both symbols home on -01):
 *   - REQ-09 (home -02) reads `includes_data_sets` (home DIN-14071-1-01) via the fallback.
 *   - REQ-04 (home -03) reads `self_declaration_submitted` (home DIN-14071-1-01) via it.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod enum
 * values — NONE of the 4 known engine traps are present in DIN-14071-1):
 *   1. bare-ident-RHS `field == field` / `field != field`: NONE. Every `==`/`!=` gate has a
 *      LITERAL RHS — boolean keyword `true`/`false` (REQ-01/02/03/04/05/06/07/08/09/10/11/14),
 *      or the empty-string literal `''` (REQ-12/13). No gate compares two fields.
 *   2. `!= null` / `== null` block gate: NONE. No gate uses a NULL literal, and — notably —
 *      NO gate in this standard uses `IS NOT NULL` at all; presence is expressed as `== true`
 *      booleans (attest flags) or `!= ''` empty-string text checks.
 *   3. `IN {Titlecase}` vs lowercase enum: the ONE membership gate is REQ-12
 *      `conformance_result IN {conformant,non_conformant}`; the members are lowercase and the
 *      prod enum values are lowercase (`conformant`,`non_conformant`) → they MATCH. NOT a trap
 *      (verified against fields.enum_values this session).
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. No IF/THEN guard in
 *      any gate. REQ-02/03/04/07/11/14 are flat left-associative AND-chains; REQ-09 is a flat
 *      OR; they parse unambiguously.
 *
 * NON-ENFORCING / DEGENERATE SHAPES surfaced (reported, not "fixed" — judgment items):
 *   - CX-01, CX-02, CX-03 (`TRUE`, WS -04): three literal-TRUE no-ops. evaluateCondition('TRUE')
 *     → pass ALWAYS → never appear in failingBlockConditions → CANNOT be driven to a fail.
 *     Proven ONE-WAY only (never block). These are cross-standard connective placeholders
 *     (pointers at ISO 14040/14044, ISO 14045/14025/TS 14067, and the ISO 14021 comparative
 *     path), not requirements printed as normative "shall" clauses in THIS standard. They are
 *     the 3 TRUE no-op gates the prior inventory flagged — confirmed live. (M-349 class.)
 *   - REQ-13 (`reviewer_signatures != ''`, WS -04): a DISTINCT non-enforcing shape. Under the
 *     evaluator, a `text != ''` compare returns `missing` (→ pending, NOT fail) whenever the
 *     field is empty/absent, and `pass` when present — so it can NEVER reach a definite `fail`
 *     and never enters failingBlockConditions. Presence of a signature is instead enforced by
 *     the missing-required-field path (reviewer_signatures is is_required=true). Proven that it
 *     never blocks in any state. Enforcement is real (via the required-field mechanism) but the
 *     BLOCK CONDITION itself is a no-op — a sign-off item, not a source-settled fix.
 *   - REQ-12 (`conformance_result IN {…} AND review_process_description != ''`, WS -04): the
 *     `!= ''` conjunct is pending-not-fail as above, so the ONLY path to a definite `fail` is
 *     the IN conjunct being false — conformance_result PRESENT but ∉ {conformant,non_conformant}.
 *     In real UI use the enum picker only offers the two in-set values, so this block-condition
 *     never fails in practice; both operand fields are is_required=true, so presence is enforced
 *     by the required-field path. We drive it both ways at the ENGINE level (pass: in-set value
 *     + description text; fail: an out-of-enum value) to PROVE the block path enforces, and
 *     record the realistic-use caveat.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing is
 * applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the 30 symbols the 14
 * symbol-reading block gates read are seeded (the 3 CX gates read nothing; the many
 * non-gate-read fields — lca_study_title, review_type, etc. — are omitted).
 */
export const DIN14071_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'DIN-14071-1-01': [
    { symbol: 'scope_options_documented', dataType: 'boolean' },       // REQ-01
    { symbol: 'obj_methods_consistent', dataType: 'boolean' },         // REQ-02
    { symbol: 'obj_methods_valid', dataType: 'boolean' },              // REQ-02
    { symbol: 'obj_data_appropriate', dataType: 'boolean' },           // REQ-02
    { symbol: 'obj_interpretations_reflect', dataType: 'boolean' },    // REQ-02
    { symbol: 'obj_report_transparent', dataType: 'boolean' },         // REQ-02
    { symbol: 'external_reviewer_contracted', dataType: 'boolean' },   // REQ-03
    { symbol: 'contract_no_predetermination', dataType: 'boolean' },   // REQ-03
    { symbol: 'independence_maintained', dataType: 'boolean' },        // REQ-05
    { symbol: 'includes_data_sets', dataType: 'boolean' },             // REQ-09 (cross-ws → -02)
    { symbol: 'self_declaration_submitted', dataType: 'boolean' },     // REQ-04 (cross-ws → -03)
  ],
  'DIN-14071-1-02': [
    { symbol: 'report_comments_recommendations_responses', dataType: 'boolean' }, // REQ-06
    { symbol: 'completed_on_final_report', dataType: 'boolean' },      // REQ-07
    { symbol: 'statement_refers_one_study', dataType: 'boolean' },     // REQ-07
    { symbol: 'statement_in_lca_report', dataType: 'boolean' },        // REQ-08
    { symbol: 'sampling_methods_disclosed', dataType: 'boolean' },     // REQ-09
    { symbol: 'comments_based_on_iso', dataType: 'boolean' },          // REQ-10
    { symbol: 'revision_justified_documented', dataType: 'boolean' },  // REQ-14
    { symbol: 'original_commissioner_informed', dataType: 'boolean' }, // REQ-14
  ],
  'DIN-14071-1-03': [
    { symbol: 'not_involved_in_study', dataType: 'boolean' },          // REQ-04
    { symbol: 'no_vested_interest', dataType: 'boolean' },             // REQ-04
    { symbol: 'comp_iso_14040_14044', dataType: 'boolean' },           // REQ-11
    { symbol: 'comp_lca_methodology', dataType: 'boolean' },           // REQ-11
    { symbol: 'comp_critical_review_practice', dataType: 'boolean' },  // REQ-11
    { symbol: 'comp_scientific_disciplines', dataType: 'boolean' },    // REQ-11
    { symbol: 'comp_performance_aspects', dataType: 'boolean' },       // REQ-11
    { symbol: 'comp_study_language', dataType: 'boolean' },            // REQ-11
    { symbol: 'cv_provided', dataType: 'boolean' },                    // REQ-11
    { symbol: 'qualifications_demonstrated', dataType: 'boolean' },    // REQ-11
  ],
  'DIN-14071-1-04': [
    { symbol: 'conformance_result', dataType: 'enum' },               // REQ-12
    { symbol: 'review_process_description', dataType: 'text' },        // REQ-12
    { symbol: 'reviewer_signatures', dataType: 'text' },              // REQ-13
  ],
};

/** Worksheets to instantiate (all 4). */
export const DIN14071_WORKSHEETS = [
  'DIN-14071-1-01', 'DIN-14071-1-02', 'DIN-14071-1-03', 'DIN-14071-1-04',
] as const;

/** All 17 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const DIN14071_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // DIN-14071-1-01 — Untersuchungsrahmen & Bestellung der Kritischen Prüfung (§4.1, §4.2)
  { ws: 'DIN-14071-1-01', code: 'REQ-01', cond: 'scope_options_documented == true', sev: 'block' },
  { ws: 'DIN-14071-1-01', code: 'REQ-02', cond: 'obj_methods_consistent == true AND obj_methods_valid == true AND obj_data_appropriate == true AND obj_interpretations_reflect == true AND obj_report_transparent == true', sev: 'block' },
  { ws: 'DIN-14071-1-01', code: 'REQ-03', cond: 'external_reviewer_contracted == true AND contract_no_predetermination == true', sev: 'block' },
  { ws: 'DIN-14071-1-01', code: 'REQ-05', cond: 'independence_maintained == true', sev: 'block' },
  // DIN-14071-1-02 — Prozess, Bericht & Prüfaussage (§4.3, §4.4, §4.5, §4.6)
  { ws: 'DIN-14071-1-02', code: 'REQ-06', cond: 'report_comments_recommendations_responses == true', sev: 'block' },
  { ws: 'DIN-14071-1-02', code: 'REQ-07', cond: 'completed_on_final_report == true AND statement_refers_one_study == true', sev: 'block' },
  { ws: 'DIN-14071-1-02', code: 'REQ-08', cond: 'statement_in_lca_report == true', sev: 'block' },
  { ws: 'DIN-14071-1-02', code: 'REQ-09', cond: 'includes_data_sets == false OR sampling_methods_disclosed == true', sev: 'block' }, // guard→OR, cross-ws LHS
  { ws: 'DIN-14071-1-02', code: 'REQ-10', cond: 'comments_based_on_iso == true', sev: 'block' },
  { ws: 'DIN-14071-1-02', code: 'REQ-14', cond: 'revision_justified_documented == true AND original_commissioner_informed == true', sev: 'block' },
  // DIN-14071-1-03 — Kompetenzen des/der Prüfer(s) (§4.2.1/Annex B, §5)
  { ws: 'DIN-14071-1-03', code: 'REQ-04', cond: 'self_declaration_submitted == true AND not_involved_in_study == true AND no_vested_interest == true', sev: 'block' }, // cross-ws RHS
  { ws: 'DIN-14071-1-03', code: 'REQ-11', cond: 'comp_iso_14040_14044 == true AND comp_lca_methodology == true AND comp_critical_review_practice == true AND comp_scientific_disciplines == true AND comp_performance_aspects == true AND comp_study_language == true AND cv_provided == true AND qualifications_demonstrated == true', sev: 'block' },
  // DIN-14071-1-04 — Konformitätsfeststellung & Unterzeichnung (§4.5)
  { ws: 'DIN-14071-1-04', code: 'CX-01', cond: 'TRUE', sev: 'block' }, // TRUE no-op (cross-standard placeholder)
  { ws: 'DIN-14071-1-04', code: 'CX-02', cond: 'TRUE', sev: 'block' }, // TRUE no-op (cross-standard placeholder)
  { ws: 'DIN-14071-1-04', code: 'CX-03', cond: 'TRUE', sev: 'block' }, // TRUE no-op (cross-standard placeholder)
  { ws: 'DIN-14071-1-04', code: 'REQ-12', cond: "conformance_result IN {conformant,non_conformant} AND review_process_description != ''", sev: 'block' },
  { ws: 'DIN-14071-1-04', code: 'REQ-13', cond: "reviewer_signatures != ''", sev: 'block' }, // != '' never-fail (pending-or-pass)
] as const;

export type DIN14071Fixture = {
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

export async function seedDIN14071(sql: postgres.Sql, userId: string): Promise<DIN14071Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'din14071-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('DIN14071 Harness Org', ${'din14071-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'DIN14071-1-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DIN-14071-1', 'DIN CEN ISO/TS 14071 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of DIN14071_WORKSHEETS) {
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
    for (const f of DIN14071_FIELDS[ws]) {
      // active=true; is_required deliberately FALSE so the per-gate proof isolates the
      // block-CONDITION path (checkApprovalGate's separate missing-required-field list is
      // not what we are proving here). gateBlocks() reads only failingBlockConditions.
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
      symbolHome[f.symbol] = ws;
    }
  }

  // Seed the 17 live BLOCK gates against their home worksheet templates.
  for (const g of DIN14071_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
