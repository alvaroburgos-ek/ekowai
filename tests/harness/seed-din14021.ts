/**
 * DIN EN ISO 14021:2016 ("Umweltkennzeichnungen und -deklarationen — Umweltbezogene
 * Anbietererklärungen / Type II self-declared environmental claims") — minimal fixture
 * for the REAL save-path gate-execution-proof harness.
 *
 * SOURCE PRESENT: DIN-EN-ISO-14021.pdf + .md are in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-14021\). This wave is a FULL
 * document comparison; the 3 equations (EQ-01 §7.6.3 net recovered energy, EQ-02 §7.8.4
 * recycled content X=A/P×100, EQ-03 §7.10.3 reduced resource use U=(I−N)/I×100) were
 * verified symbol-by-symbol against the printed formulas — all FAITHFUL. This fixture is
 * the EXECUTION half: it proves each live BLOCK gate enforces through the real save path.
 * Conditions + severities are pulled verbatim from prod compliance_requirements (standard
 * DIN-14021 = 9af88a00-6c10-4e60-867f-4705f34d05b2, project vadsmshzebefjreqcicl, this
 * session). Nothing is applied to prod.
 *
 * TOPOLOGY (verbatim from prod): 6 worksheet_templates (DIN-14021-01 … -06), 47 active
 * fields, 3 equations, 50 compliance_requirements — ALL severity='block' with a non-empty
 * condition. WS -02 (Begriffe & Definitionen) hosts 0 fields / 0 gates and is not seeded.
 * The fixture seeds the 5 worksheets that host a gate (01, 03, 04, 05, 06) and only the 37
 * distinct field symbols the 50 gates read; each gate symbol is homed on exactly ONE
 * worksheet (single-home topology — verified against prod), so checkApprovalGate's
 * conflict-free project-wide fallback resolves every cross-worksheet operand.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing, one case):
 *   - REQ-11 (home DIN-14021-03) is `mobius_loop_used IS NOT NULL AND
 *     selected_claim_type IS NOT NULL`. `mobius_loop_used` is local to -03, but
 *     `selected_claim_type` (home DIN-14021-01) resolves cross-worksheet via the
 *     conflict-free fallback.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod enum
 * values — NONE of the 4 known engine traps are present in DIN-14021):
 *   1. bare-ident-RHS `field == field` / `field != field`: NONE. Every `==` gate has the
 *      boolean-KEYWORD RHS `True` (REQ-01/02/03/05/06/08/09/10/12/13/16/18/19/48),
 *      tokenized case-insensitively to the TRUE literal — not a bare identifier. No `!=`
 *      gate exists at all.
 *   2. `!= null` / `== null` block gate: NONE. Every existence gate uses the `IS NOT NULL`
 *      form → the `exists` path (negate=true) → reaches a definite `fail` when absent.
 *      There are no `IS NOT EMPTY` gates either.
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. DIN-14021 has NO membership (`IN {…}`)
 *      gate at all — every enum constraint is an `IS NOT NULL` existence test.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. DIN-14021 has NO
 *      IF/THEN guard at all. REQ-11/14/15/24/27/46 are flat left-associative AND-chains of
 *      existence tests — they parse unambiguously.
 *
 * TWO NON-ENFORCING / DEGENERATE SHAPES surfaced (reported, not "fixed" — judgment items):
 *   - REQ-26 (`TRUE`, WS -03): a literal-TRUE no-op. evaluateCondition('TRUE') → pass
 *     ALWAYS → never appears in failingBlockConditions → CANNOT be driven to a fail. It is
 *     proven ONE-WAY only (never blocks) and flagged as a TRUE no-op gate (the M-349 class).
 *   - REQ-28..45, REQ-47, REQ-50 (20 gates on WS -01): ALL carry the identical condition
 *     `selected_claim_type IS NOT NULL`. They DO enforce (reach a definite fail when no
 *     claim type is selected — proven both ways) but each one's title anchors a DIFFERENT
 *     §7.x claim-type clause while testing nothing specific to it — 20 gates share one
 *     presence check. REQ-38 (7.12.1.1 "reusable") and REQ-39 (7.12.1.2 "refillable") are
 *     the R-2-flagged pair: §7.12.1.1/§7.12.1.2 are DEFINITIONS ("A characteristic of a
 *     product or packaging that…"), the real requirement being §7.12.2 — so their titles
 *     say "Anforderungen (7.12.1.x)" over a definition subclause. Enforcement is real but
 *     degenerate; the semantic mismatch is a sign-off-sheet item, not a source-settled fix.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing is
 * applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the 37 symbols the 50 block
 * gates read are seeded (the non-gate-read fields — claimant_name, symbol_used, etc. —
 * are omitted).
 */
export const DIN14021_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'DIN-14021-01': [
    { symbol: 'claim_scope', dataType: 'enum' },           // REQ-07
    { symbol: 'selected_claim_type', dataType: 'enum' },   // REQ-28..45,47,50 (local) + REQ-11 cross-ws
  ],
  'DIN-14021-03': [
    { symbol: 'vague_claim_present', dataType: 'boolean' },
    { symbol: 'free_claim_substance_level_ok', dataType: 'boolean' },
    { symbol: 'sustainability_claim_present', dataType: 'boolean' },
    { symbol: 'explanatory_statement', dataType: 'text' },
    { symbol: 'claim_accurate_not_misleading', dataType: 'boolean' },
    { symbol: 'claim_substantiated_verified', dataType: 'boolean' },
    { symbol: 'lifecycle_considered', dataType: 'boolean' },
    { symbol: 'third_party_implication_avoided', dataType: 'boolean' },
    { symbol: 'claim_geographic_relevance', dataType: 'boolean' },
    { symbol: 'mobius_loop_used', dataType: 'boolean' },   // REQ-11, REQ-48
  ],
  'DIN-14021-04': [
    { symbol: 'evaluation_documented', dataType: 'boolean' },
    { symbol: 'reliable_reproducible_results', dataType: 'boolean' },
    { symbol: 'comparative_claim', dataType: 'boolean' },
    { symbol: 'comparison_basis', dataType: 'enum' },
    { symbol: 'comparison_same_functional_unit', dataType: 'boolean' },
    { symbol: 'comparison_time_interval', dataType: 'number' },
    { symbol: 'product_packaging_separated', dataType: 'boolean' },
    { symbol: 'method_selected', dataType: 'enum' },
    { symbol: 'verifiable_without_confidential', dataType: 'boolean' },
    { symbol: 'info_documented_min', dataType: 'boolean' },
  ],
  'DIN-14021-05': [
    { symbol: 'R_energy', dataType: 'number' },            // REQ-20
    { symbol: 'E_energy', dataType: 'number' },            // REQ-20
    { symbol: 'recycled_content_pct', dataType: 'number' },
    { symbol: 'renewable_material_pct', dataType: 'number' },
    { symbol: 'renewable_energy_pct', dataType: 'number' },
    { symbol: 'carbon_neutral_offset_declared', dataType: 'boolean' },
    { symbol: 'carbon_footprint_value', dataType: 'number' }, // REQ-24, REQ-25, REQ-49
  ],
  'DIN-14021-06': [
    { symbol: 'general_requirements_met', dataType: 'boolean' },
    { symbol: 'verification_requirements_met', dataType: 'boolean' },
    { symbol: 'specific_requirements_met', dataType: 'boolean' },
    { symbol: 'compliance_verdict', dataType: 'enum' },
  ],
};

/** Worksheets to instantiate (5 — the gate homes; -02 has no gate/field). */
export const DIN14021_WORKSHEETS = [
  'DIN-14021-01', 'DIN-14021-03', 'DIN-14021-04', 'DIN-14021-05', 'DIN-14021-06',
] as const;

/** All 50 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const DIN14021_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // DIN-14021-01 — Aussagenregistrierung & Geltungsbereich
  { ws: 'DIN-14021-01', code: 'REQ-07', cond: 'claim_scope IS NOT NULL', sev: 'block' },
  // REQ-28..45, 47, 50 — 20 gates, ALL identical `selected_claim_type IS NOT NULL`
  { ws: 'DIN-14021-01', code: 'REQ-28', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-29', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-30', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-31', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-32', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-33', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-34', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-35', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-36', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-37', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-38', cond: 'selected_claim_type IS NOT NULL', sev: 'block' }, // 7.12.1.1 reusable (DEFINITION)
  { ws: 'DIN-14021-01', code: 'REQ-39', cond: 'selected_claim_type IS NOT NULL', sev: 'block' }, // 7.12.1.2 refillable (DEFINITION)
  { ws: 'DIN-14021-01', code: 'REQ-40', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-41', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-42', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-43', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-44', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-45', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-47', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-01', code: 'REQ-50', cond: 'selected_claim_type IS NOT NULL', sev: 'block' },
  // DIN-14021-03 — Allgemeine Anforderungen an alle Aussagen
  { ws: 'DIN-14021-03', code: 'REQ-01', cond: 'vague_claim_present == True', sev: 'block' },
  { ws: 'DIN-14021-03', code: 'REQ-02', cond: 'free_claim_substance_level_ok == True', sev: 'block' },
  { ws: 'DIN-14021-03', code: 'REQ-03', cond: 'sustainability_claim_present == True', sev: 'block' },
  { ws: 'DIN-14021-03', code: 'REQ-04', cond: 'explanatory_statement IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-03', code: 'REQ-05', cond: 'claim_accurate_not_misleading == True', sev: 'block' },
  { ws: 'DIN-14021-03', code: 'REQ-06', cond: 'claim_substantiated_verified == True', sev: 'block' },
  { ws: 'DIN-14021-03', code: 'REQ-08', cond: 'lifecycle_considered == True', sev: 'block' },
  { ws: 'DIN-14021-03', code: 'REQ-09', cond: 'third_party_implication_avoided == True', sev: 'block' },
  { ws: 'DIN-14021-03', code: 'REQ-10', cond: 'claim_geographic_relevance == True', sev: 'block' },
  { ws: 'DIN-14021-03', code: 'REQ-11', cond: 'mobius_loop_used IS NOT NULL AND selected_claim_type IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-03', code: 'REQ-26', cond: 'TRUE', sev: 'block' }, // literal-TRUE no-op
  { ws: 'DIN-14021-03', code: 'REQ-48', cond: 'mobius_loop_used == True', sev: 'block' },
  // DIN-14021-04 — Bewertung & Überprüfung
  { ws: 'DIN-14021-04', code: 'REQ-12', cond: 'evaluation_documented == True', sev: 'block' },
  { ws: 'DIN-14021-04', code: 'REQ-13', cond: 'reliable_reproducible_results == True', sev: 'block' },
  { ws: 'DIN-14021-04', code: 'REQ-14', cond: 'comparative_claim IS NOT NULL AND comparison_basis IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-04', code: 'REQ-15', cond: 'comparison_same_functional_unit IS NOT NULL AND comparison_time_interval IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-04', code: 'REQ-16', cond: 'product_packaging_separated == True', sev: 'block' },
  { ws: 'DIN-14021-04', code: 'REQ-17', cond: 'method_selected IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-04', code: 'REQ-18', cond: 'verifiable_without_confidential == True', sev: 'block' },
  { ws: 'DIN-14021-04', code: 'REQ-19', cond: 'info_documented_min == True', sev: 'block' },
  { ws: 'DIN-14021-04', code: 'REQ-46', cond: 'comparative_claim IS NOT NULL AND comparison_basis IS NOT NULL AND comparison_same_functional_unit IS NOT NULL', sev: 'block' },
  // DIN-14021-05 — Spezifische Anforderungen an ausgewählte Aussagen
  { ws: 'DIN-14021-05', code: 'REQ-20', cond: 'R_energy - E_energy > 0', sev: 'block' }, // arithmetic acompare
  { ws: 'DIN-14021-05', code: 'REQ-21', cond: 'recycled_content_pct IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-05', code: 'REQ-22', cond: 'renewable_material_pct IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-05', code: 'REQ-23', cond: 'renewable_energy_pct IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-05', code: 'REQ-24', cond: 'carbon_neutral_offset_declared IS NOT NULL AND carbon_footprint_value IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-05', code: 'REQ-25', cond: 'carbon_footprint_value IS NOT NULL', sev: 'block' },
  { ws: 'DIN-14021-05', code: 'REQ-49', cond: 'carbon_footprint_value IS NOT NULL', sev: 'block' }, // duplicate of REQ-25
  // DIN-14021-06 — Konformitätsurteil & Freigabe
  { ws: 'DIN-14021-06', code: 'REQ-27', cond: 'general_requirements_met IS NOT NULL AND verification_requirements_met IS NOT NULL AND specific_requirements_met IS NOT NULL AND compliance_verdict IS NOT NULL', sev: 'block' },
] as const;

export type DIN14021Fixture = {
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

export async function seedDIN14021(sql: postgres.Sql, userId: string): Promise<DIN14021Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'din14021-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('DIN14021 Harness Org', ${'din14021-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'DIN14021-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DIN-14021', 'DIN EN ISO 14021 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of DIN14021_WORKSHEETS) {
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
    for (const f of DIN14021_FIELDS[ws]) {
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

  // Seed the 50 live BLOCK gates against their home worksheet templates.
  for (const g of DIN14021_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
