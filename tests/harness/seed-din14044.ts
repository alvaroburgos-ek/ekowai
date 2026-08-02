/**
 * DIN EN ISO 14044:2006 ("Umweltmanagement — Ökobilanz — Anforderungen und
 * Anleitungen" / Environmental management — Life cycle assessment — Requirements
 * and guidelines) — minimal fixture for the REAL save-path gate-execution-proof
 * harness.
 *
 * SOURCE PRESENT: DIN-EN-ISO-14044-D.md + .pdf are in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-EN-ISO-14044\). This wave
 * is a FULL document comparison. The standard prints NO numbered symbolic formula;
 * its single encoded equation (EQ-01, §4.4.2.4 characterization) is a prose-derived
 * representation `category_indicator_result = SUM(lci_result * characterization_factor)`
 * — the three symbols map faithfully to the printed defined terms ("category
 * indicator result", "LCI results", "characterization factor" §3-definition p.13),
 * but the `SUM()` form is NOT machine-evaluable and is not a compliance condition, so
 * it is verified as FAITHFUL-to-prose / NR-for-execution, never driven here. This
 * fixture is the EXECUTION half: it proves each live BLOCK gate enforces BOTH ways
 * through the real save path. Conditions + severities are pulled verbatim from prod
 * compliance_requirements (standard DIN-EN-ISO-14044 =
 * bd42b6db-884c-46d3-98b5-120c73076269, project vadsmshzebefjreqcicl, this session).
 * Nothing is applied to prod.
 *
 * TOPOLOGY (verbatim from prod): 6 worksheet_templates (DIN-EN-ISO-14044-01 … -06)
 * mapping the LCA phases 1:1 — 01 goal/scope (§4.2), 02 LCI (§4.3), 03 LCIA (§4.4),
 * 04 interpretation/Auswertung (§4.5), 05 reporting (§5), 06 critical review (§6);
 * 67 active fields, 1 equation (EQ-01 on -03), 17 compliance_requirements. Of the 17,
 * 16 are severity='block' with a non-empty condition (REQ-01..04, 06..17) and ONE is
 * severity='warn' (REQ-05, the comparative-assertion data-quality checklist on -01) —
 * warn gates never enter checkApprovalGate.failingBlockConditions, so REQ-05 is NOT
 * part of the block-enforcement proof and is not seeded. The fixture seeds all 6
 * worksheets and only the 34 distinct field symbols the 16 block gates read; each gate
 * symbol is homed on exactly ONE worksheet (single-home topology — verified against
 * prod), so checkApprovalGate's conflict-free project-wide fallback resolves every
 * cross-worksheet operand.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing, two symbols):
 *   - `comparative_assertion_public` (boolean) is a field on -01 only, but is read by
 *     REQ-09 (home -03), REQ-14 (home -05) and REQ-16 (home -06) → resolved
 *     cross-worksheet via the conflict-free fallback (single home ⇒ no conflict).
 *   - `critical_review_type` (enum) is a field on -01 only, but is read by REQ-16 and
 *     REQ-17 (home -06) → resolved the same way.
 *   Each gate's violating state flips a LOCAL field so the shared -01 operands are
 *   never disturbed between serial tests.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod enum
 * values — NONE of the 4 known engine traps are present in DIN-EN-ISO-14044):
 *   1. bare-ident-RHS `field == field` / `field != field`: NONE. Every `==` gate
 *      (REQ-06/10/15) has the boolean-KEYWORD RHS `true` — tokenised to the TRUE
 *      literal, not a bare identifier. No `!=` gate exists at all.
 *   2. `!= null` / `== null` block gate: NONE. Every existence gate uses `IS NOT NULL`
 *      or `IS NOT EMPTY` → the `exists` path (negate=true) → reaches a definite `fail`
 *      when the value is absent. The 5 gates just repaired corpus-wide from `!= ''`
 *      (REQ-02/03/04/08/11) now read `IS NOT EMPTY`; there are ZERO remaining `!= ''`
 *      gates in this standard (all 17 conditions inspected this session).
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. REQ-01 members {lca,lci} match the
 *      prod study_type enum EXACTLY (lowercase); REQ-12 members {internal,third_party}
 *      match the prod report_type enum EXACTLY. Both memberships resolve.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. This standard
 *      has NO IF/THEN guard at all. Every compound gate is a flat left-associative
 *      AND-chain of existence / boolean-equality / arithmetic tests — parses
 *      unambiguously.
 *
 * DEGENERATE / PRESENCE-ONLY SHAPES surfaced (reported, NOT "fixed" — judgment items;
 * changing them would alter enforcement = a stop):
 *   - REQ-09 (`comparative_assertion_public IS NOT NULL AND weighting_applied IS NOT
 *     NULL AND lcia_dq_technique IS NOT NULL`, title "LCIA für vergleichende Aussagen:
 *     keine Gewichtung" / §4.4.6): the printed rule is "weighting shall NOT be used"
 *     for public comparative assertions, but the gate only requires the three fields be
 *     ANSWERED — it does not enforce `weighting_applied == false`. It DOES enforce
 *     presence (proven both ways) but is semantically weaker than its title.
 *   - REQ-14 (§5.3) and REQ-16/REQ-17 (§6) are the same presence-only shape: they gate
 *     that the comparative-assertion / critical-review fields are answered, not the
 *     substantive constraint. Enforcement is real but degenerate — sign-off items.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing
 * is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the 34 symbols the 16 block
 * gates read are seeded.
 */
export const DIN14044_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'DIN-EN-ISO-14044-01': [
    { symbol: 'study_type', dataType: 'enum' },                       // REQ-01
    { symbol: 'intended_application', dataType: 'text' },             // REQ-02
    { symbol: 'study_reasons', dataType: 'text' },                    // REQ-02
    { symbol: 'intended_audience', dataType: 'text' },                // REQ-02
    { symbol: 'functional_unit', dataType: 'text' },                  // REQ-03
    { symbol: 'reference_flow', dataType: 'number' },                 // REQ-03
    { symbol: 'system_boundary', dataType: 'text' },                  // REQ-04
    { symbol: 'cutoff_criteria', dataType: 'text' },                  // REQ-04
    { symbol: 'comparative_assertion_public', dataType: 'boolean' },  // REQ-09/14/16 cross-ws
    { symbol: 'critical_review_type', dataType: 'enum' },             // REQ-16/17 cross-ws
  ],
  'DIN-EN-ISO-14044-02': [
    { symbol: 'calculation_procedures_documented', dataType: 'boolean' }, // REQ-06
    { symbol: 'data_validation_done', dataType: 'boolean' },              // REQ-06
    { symbol: 'allocation_procedure', dataType: 'enum' },                 // REQ-07
    { symbol: 'allocation_documented', dataType: 'boolean' },             // REQ-07
    { symbol: 'allocation_balance_preserved', dataType: 'boolean' },      // REQ-07
    { symbol: 'allocation_sensitivity_done', dataType: 'boolean' },       // REQ-07
  ],
  'DIN-EN-ISO-14044-03': [
    { symbol: 'impact_categories', dataType: 'text' },        // REQ-08
    { symbol: 'category_indicators', dataType: 'text' },      // REQ-08
    { symbol: 'characterization_model', dataType: 'text' },   // REQ-08
    { symbol: 'weighting_applied', dataType: 'boolean' },     // REQ-09
    { symbol: 'lcia_dq_technique', dataType: 'enum' },        // REQ-09
  ],
  'DIN-EN-ISO-14044-04': [
    { symbol: 'completeness_check_done', dataType: 'boolean' }, // REQ-10
    { symbol: 'sensitivity_check_done', dataType: 'boolean' },  // REQ-10
    { symbol: 'consistency_check_done', dataType: 'boolean' },  // REQ-10
    { symbol: 'conclusions', dataType: 'text' },               // REQ-11
    { symbol: 'limitations', dataType: 'text' },               // REQ-11
  ],
  'DIN-EN-ISO-14044-05': [
    { symbol: 'report_type', dataType: 'enum' },                       // REQ-12
    { symbol: 'third_party_report_prepared', dataType: 'boolean' },     // REQ-13
    { symbol: 'iso_conformance_statement', dataType: 'boolean' },       // REQ-13
    { symbol: 'grouping_value_choice_statement', dataType: 'boolean' }, // REQ-14
  ],
  'DIN-EN-ISO-14044-06': [
    { symbol: 'review_objectives_ensured', dataType: 'boolean' }, // REQ-15
    { symbol: 'review_scope_recorded', dataType: 'boolean' },     // REQ-15
    { symbol: 'review_panel_members', dataType: 'number' },       // REQ-16
    { symbol: 'reviewer_independent', dataType: 'boolean' },      // REQ-17
  ],
};

/** Worksheets to instantiate (all 6 — one per LCA phase; each hosts a block gate). */
export const DIN14044_WORKSHEETS = [
  'DIN-EN-ISO-14044-01', 'DIN-EN-ISO-14044-02', 'DIN-EN-ISO-14044-03',
  'DIN-EN-ISO-14044-04', 'DIN-EN-ISO-14044-05', 'DIN-EN-ISO-14044-06',
] as const;

/** All 16 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities VERBATIM from prod compliance_requirements (double spaces
 *  in REQ-06/10/15 preserved). REQ-05 is severity='warn' → NOT a block gate → omitted. */
export const DIN14044_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // DIN-EN-ISO-14044-01 — Ziel & Untersuchungsrahmen (§4.2)
  { ws: 'DIN-EN-ISO-14044-01', code: 'REQ-01', cond: 'study_type IN {lca,lci}', sev: 'block' },
  { ws: 'DIN-EN-ISO-14044-01', code: 'REQ-02', cond: 'intended_application IS NOT EMPTY AND study_reasons IS NOT EMPTY AND intended_audience IS NOT EMPTY', sev: 'block' },
  { ws: 'DIN-EN-ISO-14044-01', code: 'REQ-03', cond: 'functional_unit IS NOT EMPTY AND reference_flow > 0', sev: 'block' },
  { ws: 'DIN-EN-ISO-14044-01', code: 'REQ-04', cond: 'system_boundary IS NOT EMPTY AND cutoff_criteria IS NOT EMPTY', sev: 'block' },
  // DIN-EN-ISO-14044-02 — Sachbilanz LCI (§4.3)
  { ws: 'DIN-EN-ISO-14044-02', code: 'REQ-06', cond: 'calculation_procedures_documented  ==  true AND data_validation_done  ==  true', sev: 'block' },
  { ws: 'DIN-EN-ISO-14044-02', code: 'REQ-07', cond: 'allocation_procedure IS NOT NULL AND allocation_documented IS NOT NULL AND allocation_balance_preserved IS NOT NULL AND allocation_sensitivity_done IS NOT NULL', sev: 'block' },
  // DIN-EN-ISO-14044-03 — Wirkungsabschätzung LCIA (§4.4)
  { ws: 'DIN-EN-ISO-14044-03', code: 'REQ-08', cond: 'impact_categories IS NOT EMPTY AND category_indicators IS NOT EMPTY AND characterization_model IS NOT EMPTY', sev: 'block' },
  { ws: 'DIN-EN-ISO-14044-03', code: 'REQ-09', cond: 'comparative_assertion_public IS NOT NULL AND weighting_applied IS NOT NULL AND lcia_dq_technique IS NOT NULL', sev: 'block' },
  // DIN-EN-ISO-14044-04 — Auswertung / Interpretation (§4.5)
  { ws: 'DIN-EN-ISO-14044-04', code: 'REQ-10', cond: 'completeness_check_done  ==  true AND sensitivity_check_done  ==  true AND consistency_check_done  ==  true', sev: 'block' },
  { ws: 'DIN-EN-ISO-14044-04', code: 'REQ-11', cond: 'conclusions IS NOT EMPTY AND limitations IS NOT EMPTY', sev: 'block' },
  // DIN-EN-ISO-14044-05 — Berichterstattung (§5)
  { ws: 'DIN-EN-ISO-14044-05', code: 'REQ-12', cond: 'report_type IN {internal,third_party}', sev: 'block' },
  { ws: 'DIN-EN-ISO-14044-05', code: 'REQ-13', cond: 'third_party_report_prepared IS NOT NULL AND iso_conformance_statement IS NOT NULL', sev: 'block' },
  { ws: 'DIN-EN-ISO-14044-05', code: 'REQ-14', cond: 'comparative_assertion_public IS NOT NULL AND grouping_value_choice_statement IS NOT NULL', sev: 'block' },
  // DIN-EN-ISO-14044-06 — Kritische Prüfung (§6)
  { ws: 'DIN-EN-ISO-14044-06', code: 'REQ-15', cond: 'review_objectives_ensured  ==  true AND review_scope_recorded  ==  true', sev: 'block' },
  { ws: 'DIN-EN-ISO-14044-06', code: 'REQ-16', cond: 'comparative_assertion_public IS NOT NULL AND critical_review_type IS NOT NULL AND review_panel_members IS NOT NULL', sev: 'block' },
  { ws: 'DIN-EN-ISO-14044-06', code: 'REQ-17', cond: 'critical_review_type IS NOT NULL AND reviewer_independent IS NOT NULL', sev: 'block' },
] as const;

export type DIN14044Fixture = {
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

export async function seedDIN14044(sql: postgres.Sql, userId: string): Promise<DIN14044Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'din14044-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('DIN14044 Harness Org', ${'din14044-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'DIN14044-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DIN-EN-ISO-14044', 'DIN EN ISO 14044 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of DIN14044_WORKSHEETS) {
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
    for (const f of DIN14044_FIELDS[ws]) {
      // active=true; is_required deliberately FALSE so the per-gate proof isolates the
      // block-CONDITION path (checkApprovalGate's separate missing-required-field list
      // is not what we are proving here). gateBlocks() reads only failingBlockConditions.
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
      symbolHome[f.symbol] = ws;
    }
  }

  // Seed the 16 live BLOCK gates against their home worksheet templates.
  for (const g of DIN14044_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
