/**
 * ISO 14046:2014 ("Umweltmanagement — Wasser-Fußabdruck — Grundsätze, Anforderungen
 * und Leitlinien" / Environmental management — Water footprint — Principles, requirements
 * and guidelines) — minimal fixture for the REAL save-path gate-execution-proof harness.
 *
 * SOURCE PRESENT: ISO-14046.md + .pdf are in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\ISO-14046\; the .md is the Spanish
 * NTC-ISO 14046 = IDT adoption of ISO 14046:2014). This wave is a FULL document
 * comparison. The standard prints NO numbered symbolic formula; its single encoded
 * equation (EQ-01, §5.4.4.1 characterization) is a prose-derived representation
 * `category_indicator_result = SUM(lci_result * characterization_factor)` — the three
 * symbols map faithfully to the printed defined terms ("resultado del indicador de
 * categoría" §3.3.12, "resultado del ICV" §3.3.6, "factor de caracterización" §3.3.14
 * verbatim at ISO-14046.md:325) — but the `SUM()` form is NOT machine-evaluable and is
 * not a compliance condition, so it is verified FAITHFUL-to-prose / NR-for-execution and
 * never driven here. Prod carries EQ-01 as verification_status='verified_via_cross_reference'
 * (the characterization-factor definition is owned by ISO 14044:2006, 3.37) — honest VC.
 *
 * This fixture is the EXECUTION half: it proves each live BLOCK gate enforces BOTH ways
 * through the real save path. Conditions + severities are pulled VERBATIM from prod
 * compliance_requirements (standard ISO-14046 = fccd0cd2-ef64-4424-a7ab-057e621ec6f4,
 * project vadsmshzebefjreqcicl, this session). Nothing is applied to prod.
 *
 * TOPOLOGY (verbatim from prod): 7 worksheet_templates (ISO-14046-01 … -07) mapping the
 * LCA-family water-footprint phases — 01 registration/general (§1;§4;§5.1;Annex A),
 * 02 goal & scope (§5.2), 03 inventory analysis (§5.3), 04 impact assessment (§5.4),
 * 05 interpretation (§5.5/§5.6), 06 reporting (§6), 07 critical review (§7). 73 active
 * fields, 1 equation (EQ-01 on -04), 22 compliance_requirements. Of the 22, 21 are
 * severity='block' with a non-empty condition (REQ-01..20, REQ-22) and ONE is
 * severity='warn' (REQ-21, condition literal `TRUE`, "Anwendung der ISO 14044 als
 * normative Referenz" on -01) — a definition-as-gate / literal-TRUE no-op. warn gates
 * never enter checkApprovalGate.failingBlockConditions, and even if seeded the approval
 * gate query filters severity='block', so REQ-21 is NOT part of the block-enforcement
 * proof and is not seeded. The fixture seeds all 7 worksheets and only the 52 distinct
 * field symbols the 21 block gates read; each gate symbol is homed on exactly ONE
 * worksheet (single-home topology — verified against prod), so checkApprovalGate's
 * conflict-free project-wide fallback resolves every cross-worksheet operand.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing, six symbols — each single-home ⇒ no conflict):
 *   - `allocation_procedure` (enum) is a field on -02 only, read by REQ-11 (home -03).
 *   - `comparative_assertion_public` (boolean) is a field on -02 only, read by REQ-15
 *     (home -04), REQ-19 (home -06) and REQ-20 (home -07).
 *   - `report_type` (enum) is a field on -02 only, read by REQ-18 (home -06).
 *   - `critical_review_performed` (boolean) is a field on -07 only, read by REQ-19 (home -06).
 *   - `is_organization_assessment` (boolean) + `consolidation_method` (enum) are fields on
 *     -01 only, read by REQ-22 (home -02).
 *   Every gate's PASS phase re-establishes each operand it reads (local + cross), and each
 *   gate's violating state flips a LOCAL field where one exists so shared operands are not
 *   disturbed between serial tests. REQ-19 is the sole gate with NO local operand (both
 *   operands cross-worksheet); it is violated by clearing a cross-ws field (critical_review_
 *   performed on -07), which the following REQ-20 test re-establishes in its PASS phase.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod enum
 * values — NONE of the 4 known engine traps are present in ISO-14046):
 *   1. bare-ident-RHS `field == field` under an ORDERING op: NONE. The only bare-ident
 *      RHS is REQ-18 `report_type == internal` — an EQUALITY op, which the engine keeps as
 *      the legacy enum string-literal RHS (evaluate.ts L244-257: `==`/`!=` bare-ident RHS
 *      is a string literal, NOT a variable lookup). `internal` is a real report_type enum
 *      value (verified in prod), so the gate enforces correctly. Every `== true` gate has
 *      the boolean-KEYWORD RHS `true`. No `!=` gate exists.
 *   2. `!= null` / `== null` block gate: NONE. Every existence gate uses `IS NOT NULL`
 *      or `IS NOT EMPTY` → the `exists` path (negate=true) → reaches a definite `fail`
 *      when the value is absent. The 8 gates just repaired corpus-wide from `!= ''`
 *      (REQ-03/04/05/07/10/12/13/16) now read `IS NOT EMPTY`; there are ZERO remaining
 *      `!= ''` gates in this standard (all 22 conditions inspected this session).
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. REQ-01 members {water_footprint_assessment,
 *      water_footprint_inventory_study} match the prod study_type enum EXACTLY (verified).
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. This standard has
 *      NO IF/THEN guard. Compound gates are flat left-associative AND-chains and three OR
 *      gates (REQ-13/18/20) — all parse unambiguously (OR binds looser than AND).
 *
 * DEGENERATE / PRESENCE-ONLY SHAPES surfaced (reported, NOT "fixed" — judgment items;
 * changing them would alter enforcement = a stop):
 *   - REQ-15 (`weighting_applied IS NOT NULL AND comparative_assertion_public IS NOT NULL`,
 *     §5.4.7): the printed rule is weighting per ISO 14044 and NOT a basis for public
 *     comparative assertions — the gate only requires the two fields be ANSWERED, not the
 *     substantive constraint. Presence proven both ways; semantically weaker than title.
 *   - REQ-19 (`comparative_assertion_public IS NOT NULL AND critical_review_performed IS NOT
 *     NULL`, §6.3/§7.1) is the same presence-only shape. Enforcement is real but degenerate.
 *   - REQ-11 (allocation) is presence-only (IS NOT NULL x3), not mass-balance-checking.
 *   - REQ-21 is a literal-TRUE warn no-op (see topology note) — never blocks, by design.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing
 * is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the 52 symbols the 21 block
 * gates read are seeded.
 */
export const ISO14046_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'ISO-14046-01': [
    { symbol: 'study_type', dataType: 'enum' },                        // REQ-01
    { symbol: 'principles_applied', dataType: 'boolean' },             // REQ-02
    { symbol: 'life_cycle_perspective', dataType: 'boolean' },         // REQ-02
    { symbol: 'comprehensive_assessment', dataType: 'boolean' },       // REQ-13
    { symbol: 'water_footprint_qualifier', dataType: 'text' },         // REQ-13
    { symbol: 'is_organization_assessment', dataType: 'boolean' },     // REQ-22 cross-ws
    { symbol: 'consolidation_method', dataType: 'enum' },              // REQ-22 cross-ws
  ],
  'ISO-14046-02': [
    { symbol: 'intended_applications', dataType: 'text' },            // REQ-03
    { symbol: 'study_reasons', dataType: 'text' },                    // REQ-03
    { symbol: 'target_audience', dataType: 'text' },                  // REQ-03
    { symbol: 'functional_unit', dataType: 'text' },                  // REQ-04
    { symbol: 'system_boundary', dataType: 'text' },                  // REQ-04
    { symbol: 'geographic_coverage', dataType: 'text' },              // REQ-04
    { symbol: 'temporal_coverage', dataType: 'text' },                // REQ-04
    { symbol: 'cutoff_criteria', dataType: 'text' },                  // REQ-04
    { symbol: 'water_quantities', dataType: 'text' },                 // REQ-05
    { symbol: 'water_resource_types', dataType: 'text' },             // REQ-05
    { symbol: 'water_quality_data', dataType: 'text' },               // REQ-05
    { symbol: 'forms_of_water_use', dataType: 'text' },               // REQ-05
    { symbol: 'water_use_locations', dataType: 'text' },              // REQ-05
    { symbol: 'data_quality_requirements', dataType: 'boolean' },     // REQ-06
    { symbol: 'primary_data_preference', dataType: 'boolean' },       // REQ-06
    { symbol: 'missing_data_treatment', dataType: 'text' },           // REQ-07
    { symbol: 'no_offsetting', dataType: 'boolean' },                 // REQ-08
    { symbol: 'allocation_procedure', dataType: 'enum' },             // REQ-11 cross-ws
    { symbol: 'comparative_assertion_public', dataType: 'boolean' },  // REQ-15/19/20 cross-ws
    { symbol: 'report_type', dataType: 'enum' },                      // REQ-18 cross-ws
    { symbol: 'organization_boundary', dataType: 'text' },            // REQ-22
  ],
  'ISO-14046-03': [
    { symbol: 'calculation_procedures_documented', dataType: 'boolean' }, // REQ-09
    { symbol: 'data_validation_done', dataType: 'boolean' },              // REQ-09
    { symbol: 'flow_water_resource_type', dataType: 'enum' },             // REQ-10
    { symbol: 'flow_quality_parameters', dataType: 'text' },              // REQ-10
    { symbol: 'flow_form_of_use', dataType: 'enum' },                     // REQ-10
    { symbol: 'flow_geographic_location', dataType: 'text' },             // REQ-10
    { symbol: 'inventory_balance_explained', dataType: 'boolean' },       // REQ-10
    { symbol: 'allocation_balance_preserved', dataType: 'boolean' },      // REQ-11
    { symbol: 'allocation_sensitivity_done', dataType: 'boolean' },       // REQ-11
  ],
  'ISO-14046-04': [
    { symbol: 'impact_categories', dataType: 'text' },        // REQ-12
    { symbol: 'category_indicators', dataType: 'text' },      // REQ-12
    { symbol: 'characterization_model', dataType: 'text' },   // REQ-12
    { symbol: 'geo_temporal_considered', dataType: 'boolean' }, // REQ-14
    { symbol: 'weighting_applied', dataType: 'boolean' },     // REQ-15
  ],
  'ISO-14046-05': [
    { symbol: 'significant_issues', dataType: 'text' },       // REQ-16
    { symbol: 'completeness_check', dataType: 'boolean' },    // REQ-16
    { symbol: 'sensitivity_check', dataType: 'boolean' },     // REQ-16
    { symbol: 'consistency_check', dataType: 'boolean' },     // REQ-16
    { symbol: 'conclusions', dataType: 'text' },              // REQ-16
    { symbol: 'limitations', dataType: 'text' },              // REQ-16
  ],
  'ISO-14046-06': [
    { symbol: 'report_prepared', dataType: 'boolean' },            // REQ-17
    { symbol: 'water_types_impacts_explicit', dataType: 'boolean' }, // REQ-17
    { symbol: 'third_party_report', dataType: 'boolean' },         // REQ-18
  ],
  'ISO-14046-07': [
    { symbol: 'critical_review_performed', dataType: 'boolean' }, // REQ-19/20
  ],
};

/** Worksheets to instantiate (all 7 — one per water-footprint phase; each hosts a block gate). */
export const ISO14046_WORKSHEETS = [
  'ISO-14046-01', 'ISO-14046-02', 'ISO-14046-03', 'ISO-14046-04',
  'ISO-14046-05', 'ISO-14046-06', 'ISO-14046-07',
] as const;

/** All 21 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities VERBATIM from prod compliance_requirements (double spaces
 *  around `==` preserved). REQ-21 is severity='warn' (condition `TRUE`) → NOT a block
 *  gate → omitted. */
export const ISO14046_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // ISO-14046-01 — Registrierung & Allgemeine Anforderungen (§1;§4;§5.1;Annex A)
  { ws: 'ISO-14046-01', code: 'REQ-01', cond: 'study_type IN {water_footprint_assessment,water_footprint_inventory_study}', sev: 'block' },
  { ws: 'ISO-14046-01', code: 'REQ-02', cond: 'principles_applied  ==  true AND life_cycle_perspective  ==  true', sev: 'block' },
  { ws: 'ISO-14046-01', code: 'REQ-13', cond: 'comprehensive_assessment  ==  true OR water_footprint_qualifier IS NOT EMPTY', sev: 'block' },
  // ISO-14046-02 — Ziel & Untersuchungsrahmen (§5.2)
  { ws: 'ISO-14046-02', code: 'REQ-03', cond: 'intended_applications IS NOT EMPTY AND study_reasons IS NOT EMPTY AND target_audience IS NOT EMPTY', sev: 'block' },
  { ws: 'ISO-14046-02', code: 'REQ-04', cond: 'functional_unit IS NOT EMPTY AND system_boundary IS NOT EMPTY AND geographic_coverage IS NOT EMPTY AND temporal_coverage IS NOT EMPTY AND cutoff_criteria IS NOT EMPTY', sev: 'block' },
  { ws: 'ISO-14046-02', code: 'REQ-05', cond: 'water_quantities IS NOT EMPTY AND water_resource_types IS NOT EMPTY AND water_quality_data IS NOT EMPTY AND forms_of_water_use IS NOT EMPTY AND water_use_locations IS NOT EMPTY', sev: 'block' },
  { ws: 'ISO-14046-02', code: 'REQ-06', cond: 'data_quality_requirements IS NOT NULL AND primary_data_preference IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14046-02', code: 'REQ-07', cond: 'missing_data_treatment IS NOT EMPTY', sev: 'block' },
  { ws: 'ISO-14046-02', code: 'REQ-08', cond: 'no_offsetting  ==  true', sev: 'block' },
  { ws: 'ISO-14046-02', code: 'REQ-22', cond: 'is_organization_assessment IS NOT NULL AND consolidation_method IS NOT NULL AND organization_boundary IS NOT NULL', sev: 'block' },
  // ISO-14046-03 — Wasser-Fußabdruck-Inventar (§5.3)
  { ws: 'ISO-14046-03', code: 'REQ-09', cond: 'calculation_procedures_documented  ==  true AND data_validation_done  ==  true', sev: 'block' },
  { ws: 'ISO-14046-03', code: 'REQ-10', cond: 'flow_water_resource_type IS NOT EMPTY AND flow_quality_parameters IS NOT EMPTY AND flow_form_of_use IS NOT EMPTY AND flow_geographic_location IS NOT EMPTY AND inventory_balance_explained  ==  true', sev: 'block' },
  { ws: 'ISO-14046-03', code: 'REQ-11', cond: 'allocation_procedure IS NOT NULL AND allocation_balance_preserved IS NOT NULL AND allocation_sensitivity_done IS NOT NULL', sev: 'block' },
  // ISO-14046-04 — Wirkungsabschätzung (§5.4)
  { ws: 'ISO-14046-04', code: 'REQ-12', cond: 'impact_categories IS NOT EMPTY AND category_indicators IS NOT EMPTY AND characterization_model IS NOT EMPTY', sev: 'block' },
  { ws: 'ISO-14046-04', code: 'REQ-14', cond: 'geo_temporal_considered  ==  true', sev: 'block' },
  { ws: 'ISO-14046-04', code: 'REQ-15', cond: 'weighting_applied IS NOT NULL AND comparative_assertion_public IS NOT NULL', sev: 'block' },
  // ISO-14046-05 — Auswertung (§5.5/§5.6)
  { ws: 'ISO-14046-05', code: 'REQ-16', cond: 'significant_issues IS NOT EMPTY AND completeness_check  ==  true AND sensitivity_check  ==  true AND consistency_check  ==  true AND conclusions IS NOT EMPTY AND limitations IS NOT EMPTY', sev: 'block' },
  // ISO-14046-06 — Berichterstattung (§6)
  { ws: 'ISO-14046-06', code: 'REQ-17', cond: 'report_prepared  ==  true AND water_types_impacts_explicit  ==  true', sev: 'block' },
  { ws: 'ISO-14046-06', code: 'REQ-18', cond: 'report_type  ==  internal OR third_party_report  ==  true', sev: 'block' },
  { ws: 'ISO-14046-06', code: 'REQ-19', cond: 'comparative_assertion_public IS NOT NULL AND critical_review_performed IS NOT NULL', sev: 'block' },
  // ISO-14046-07 — Kritische Prüfung (§7)
  { ws: 'ISO-14046-07', code: 'REQ-20', cond: 'comparative_assertion_public  ==  false OR critical_review_performed  ==  true', sev: 'block' },
] as const;

export type ISO14046Fixture = {
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

export async function seedISO14046(sql: postgres.Sql, userId: string): Promise<ISO14046Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso14046-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO14046 Harness Org', ${'iso14046-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO14046-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-14046', 'ISO 14046 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of ISO14046_WORKSHEETS) {
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
    for (const f of ISO14046_FIELDS[ws]) {
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

  // Seed the 21 live BLOCK gates against their home worksheet templates.
  for (const g of ISO14046_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
