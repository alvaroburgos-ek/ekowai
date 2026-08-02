/**
 * ISO 14064-2:2019 / EN ISO 14064-2:2019 / DIN EN ISO 14064-2
 * ("Treibhausgase — Teil 2: Spezifikation mit Anleitung zur quantitativen Bestimmung, Überwachung
 * und Berichterstattung von Reduktionen der THG-Emissionen oder Steigerungen des Entzugs von
 * Treibhausgasen auf Projektebene" / project-level GHG quantification, monitoring & reporting) —
 * minimal fixture for the REAL save-path gate-execution-proof harness.
 *
 * SOURCE PRESENT: ISO-14064-2-2019-en-es.md + .pdf + .xlsx are in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\ISO-14064-2\). This wave is a FULL document
 * comparison. ISO 14064-2 is a project-level specification standard: like Part 1 it prints NO
 * numbered closed-form equations; it states the quantification RELATIONSHIPS in prose (§6.7, §6.8)
 * and the encoder synthesised them into 4 explicit equations housed on -06/-07:
 *   EQ-01  ssr_emission_co2e = activity_data * emission_factor * gwp   (§6.7 + EF def §3.1.9
 *          "Faktor, der die THG-Aktivitätsdaten mit der Emission verbindet" + §6.8 CO2e-Umrechnung
 *          "unter Anwendung des entsprechenden Treibhauspotentials in Einheiten von CO2e")
 *          → FAITHFUL-to-prose (synthesis; the standard prescribes no explicit formula — stated in
 *            the row's own source_quote)
 *   EQ-02  E_project  = SUM(ssr_emission_co2e)   (§6.7 a) per relevant GHG for each project SSR)
 *          → FAITHFUL-to-prose / NR-for-execution (SUM() not machine-evaluable)
 *   EQ-03  E_baseline = SUM(ssr_emission_co2e)   (§6.7 b) per relevant GHG for each baseline SSR)
 *          → FAITHFUL-to-prose / NR-for-execution (SUM() not machine-evaluable)
 *   EQ-04  emission_reduction = E_baseline - E_project   (§6.8: "Reduktionen ... müssen als
 *          Differenz zwischen den ... THG-QSS, die für das Projekt ... relevant [sind], und denen,
 *          die für das Bezugsszenario ... relevant [sind], quantitativ bestimmt werden."; §8.3.1
 *          note: "als Differenz zwischen den Emissionen/dem Entzug des Bezugsszenarios und des
 *          Projekts gemessen")  → FAITHFUL and machine-evaluable — this IS gate REQ-16.
 *
 * LEAKAGE ("Verlagerung", §3.1.7 Anm.2 / Anhang note l.1650): the standard does NOT print a
 * `reduction = baseline − project − leakage` form. Leakage is accounted for by INCLUDING the
 * affected GHG SSRs (betroffene THG-QSS, ssr_classification=affected) in the baseline/project SSR
 * sums, not as a separate subtraction term (§6.8 says reduction = the plain baseline−project
 * DIFFERENCE over the relevant SSRs). So EQ-04 / REQ-16 omitting a leakage term is FAITHFUL to
 * §6.8, NOT a defect. The optional `leakage` field on -07 documents the affected-SSR magnitude;
 * it is deliberately outside the reduction identity. (Reported, not "fixed" — no source form to
 * apply.)
 *
 * This fixture is the EXECUTION half: it proves each live BLOCK gate enforces BOTH ways through the
 * real save path. Conditions + severities are pulled VERBATIM from prod compliance_requirements
 * (standard ISO-14064-2 = b6709ca6-6e72-4808-baaa-742f43450dab, project vadsmshzebefjreqcicl, this
 * session). Nothing is applied to prod.
 *
 * TOPOLOGY (verbatim from live prod, re-executed this session): 10 worksheet_templates
 * (ISO-14064-2-01 … -10) mapping the project-level GHG lifecycle — 01 registration & principles
 * (§4;§5.2), 02 project description (§5.4;§6.2), 03 identification of project GHG SSRs (§6.3),
 * 04 baseline scenario determination + additionality (§6.4;§6.5), 05 identification/selection of
 * baseline SSRs for monitoring vs estimation (§6.6), 06 quantification of emissions/removals
 * (§6.7) — hosts EQ-01/02/03, 07 reductions/enhancements (§6.8) — hosts EQ-04 / REQ-16,
 * 08 data-quality management (§6.9), 09 monitoring (§6.10), 10 documentation/verification/reporting
 * (§7;§8;§9). 60 active fields, 4 equations, 22 compliance_requirements. Of the 22, 21 are
 * severity='block' with a non-empty condition and ONE is severity='warn' with an EMPTY condition
 * (REQ-13 "Emissions/removals quantified per SSR & GHG" §6.7 on -06 — empty condition ⇒
 * evaluateCondition→manual, never a block; the approval-gate query further filters severity='block'
 * so REQ-13 could not enter failingBlockConditions on either count). REQ-13 is NOT seeded.
 * The fixture seeds all 10 worksheets and only the 37 distinct field symbols the 21 block gates
 * read; each gate symbol is homed on exactly ONE worksheet (single-home topology — verified against
 * prod), so checkApprovalGate's conflict-free project-wide fallback resolves every cross-worksheet
 * operand.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing, two symbols — each single-home ⇒ no conflict):
 *   REQ-16 (home -07) `emission_reduction = E_baseline - E_project` reads E_baseline and E_project,
 *   which are fields on -06 only, plus its LOCAL emission_reduction (-07). The `=` tokenises to
 *   `==` and the arithmetic RHS routes through the numeric `acompare` path (not the legacy
 *   string-literal compare), so both cross-ws operands are resolved via the conflict-free fallback
 *   and the gate is a genuine arithmetic-IDENTITY gate (fires fail when emission_reduction differs
 *   from baseline−project). Its violating state flips the LOCAL emission_reduction so the shared
 *   cross-ws operands E_baseline/E_project are never disturbed between serial tests.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod enum values —
 * NONE of the 4 known engine traps are present in ISO-14064-2):
 *   1. bare-ident-RHS `field OP field` under an ORDERING op: NONE. There is NO ordering-op gate
 *      (`<`,`<=`,`>`,`>=`). The only comparison with an identifier RHS is REQ-16, whose RHS is an
 *      ARITHMETIC expression (E_baseline - E_project) under `==` → routed to `acompare` (numeric,
 *      both operands looked up), enforces correctly. Every boolean gate uses the KEYWORD RHS
 *      `true`/`True`. No `!=` gate exists.
 *   2. `!= null` / `== null` block gate: NONE. Every existence gate uses `IS NOT NULL` (18 operands
 *      across REQ-03/05/08/11/18/22 and the AND-chains) or `IS NOT EMPTY` (REQ-21 — the
 *      corpus-repaired row) → the `exists` path (negate=true) → reaches a definite `fail` when the
 *      value is absent. For the engine `IS NOT NULL` and `IS NOT EMPTY` are the identical
 *      exists-path with '' treated as absent, so text-presence gates behave correctly. ZERO `!= ''`
 *      gates remain (all 22 conditions inspected this session).
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. REQ-07 members {controlled,related,affected}
 *      match the prod ssr_classification enum EXACTLY (lowercase, §3.1.11-13); REQ-12 members
 *      {regular_monitoring,estimation} match the prod ssr_selection_mode enum EXACTLY (§6.6). Both
 *      verified against prod enum_values this session.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. This standard has NO
 *      IF/THEN guard and NO OR gate — every compound gate is a flat left-associative AND-chain,
 *      parses unambiguously.
 *
 * CAPITAL-True COSMETIC NOTE (not a trap): REQ-02/06/20 print `== True` (capital) while
 * REQ-01/04/09/10/15/17/19 print `== true` (lowercase). The tokenizer lowercases identifiers before
 * the KEYWORDS lookup (`word.toLowerCase()`), so `True` and `true` both produce the TRUE keyword and
 * evaluate identically. Both are proven both-ways here; the case inconsistency is cosmetic only.
 *
 * DEGENERATE / JUDGMENT SHAPES surfaced (reported, NOT "fixed" — changing them alters enforcement
 * = a stop):
 *   - SEVERITY-vs-OPTIONAL REVIEW (modal, sign-off item): REQ-02 (deviations_documented),
 *     REQ-03 (ghg_programme), REQ-06 (baseline_revalidated), REQ-20 (verification_validation_
 *     iso14064_3) and REQ-22 (public_claim_content) are severity='block' in prod, yet their fields
 *     are is_required=false and the clauses frame them CONDITIONALLY (§5.2 deviations only "if
 *     applicable"; §6.2 re-validation only "after material changes"; §9 public claim only "if a
 *     public claim is made"; verification per ISO 14064-3 is programme-dependent). Blocking approval
 *     unconditionally on a conditional/optional field is a modal-severity reading — it goes on the
 *     sign-off sheet, it is NOT touched here. Presence/flag enforcement is proven both ways
 *     regardless of the severity debate.
 *   - DEFINITION-AS-GATE: REQ-16 `emission_reduction = E_baseline - E_project` restates EQ-04 as a
 *     compliance condition. It IS genuinely enforcing (arithmetic identity, proven both ways) — the
 *     engineer must enter emission_reduction consistent with baseline−project — but it verifies
 *     internal consistency, not substantive correctness of the inputs.
 *   - PRESENCE-ONLY shapes: the IS NOT NULL / IS NOT EMPTY gates require the field be ANSWERED, not
 *     substantively correct (e.g. REQ-21 `ghg_report IS NOT EMPTY` reduces the §9.3 report-content
 *     list to a single presence check). Enforcement is real (proven both ways) but semantically
 *     weaker than the title.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing is applied
 * to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the 37 symbols the 21 block
 * gates read are seeded.
 */
export const ISO140642_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'ISO-14064-2-01': [
    { symbol: 'recognized_source_used', dataType: 'boolean' },        // REQ-01
    { symbol: 'deviations_documented', dataType: 'boolean' },         // REQ-02
    { symbol: 'ghg_programme', dataType: 'text' },                    // REQ-03
    { symbol: 'principle_conservativeness', dataType: 'boolean' },    // REQ-04
    { symbol: 'principle_accuracy', dataType: 'boolean' },            // REQ-04
  ],
  'ISO-14064-2-02': [
    { symbol: 'project_title', dataType: 'text' },                   // REQ-05
    { symbol: 'project_type', dataType: 'text' },                    // REQ-05
    { symbol: 'project_location', dataType: 'text' },                // REQ-05
    { symbol: 'pre_project_conditions', dataType: 'text' },          // REQ-05
    { symbol: 'project_technologies', dataType: 'text' },            // REQ-05
    { symbol: 'expected_reductions_co2e', dataType: 'number' },      // REQ-05
    { symbol: 'project_risks', dataType: 'text' },                   // REQ-05
    { symbol: 'roles_responsibilities', dataType: 'text' },          // REQ-05
    { symbol: 'chronological_plan', dataType: 'text' },              // REQ-05
    { symbol: 'baseline_revalidated', dataType: 'boolean' },         // REQ-06
  ],
  'ISO-14064-2-03': [
    { symbol: 'ssr_classification', dataType: 'enum' },              // REQ-07
  ],
  'ISO-14064-2-04': [
    { symbol: 'baseline_criteria', dataType: 'text' },               // REQ-08
    { symbol: 'functional_equivalence', dataType: 'boolean' },       // REQ-08
    { symbol: 'baseline_justification', dataType: 'text' },          // REQ-08
    { symbol: 'baseline_conservative', dataType: 'boolean' },        // REQ-09
    { symbol: 'additionality_demonstrated', dataType: 'boolean' },   // REQ-10
  ],
  'ISO-14064-2-05': [
    { symbol: 'baseline_ssr', dataType: 'text' },                    // REQ-11
    { symbol: 'ssr_selection_mode', dataType: 'enum' },              // REQ-12
  ],
  'ISO-14064-2-06': [
    { symbol: 'emission_factor', dataType: 'number' },               // REQ-14
    { symbol: 'permanence_risk', dataType: 'boolean' },              // REQ-15
    { symbol: 'E_baseline', dataType: 'number' },                    // REQ-16 cross-ws (home -07 gate)
    { symbol: 'E_project', dataType: 'number' },                     // REQ-16 cross-ws (home -07 gate)
  ],
  'ISO-14064-2-07': [
    { symbol: 'emission_reduction', dataType: 'number' },            // REQ-16 (local)
  ],
  'ISO-14064-2-08': [
    { symbol: 'qm_procedures', dataType: 'boolean' },                // REQ-17
  ],
  'ISO-14064-2-09': [
    { symbol: 'monitoring_purpose', dataType: 'text' },              // REQ-18
    { symbol: 'monitored_parameters', dataType: 'text' },            // REQ-18
    { symbol: 'monitoring_methodologies', dataType: 'text' },        // REQ-18
    { symbol: 'monitoring_frequency', dataType: 'text' },            // REQ-18
  ],
  'ISO-14064-2-10': [
    { symbol: 'conformity_documentation', dataType: 'boolean' },              // REQ-19
    { symbol: 'verification_validation_iso14064_3', dataType: 'boolean' },    // REQ-20
    { symbol: 'ghg_report', dataType: 'text' },                              // REQ-21
    { symbol: 'public_claim_content', dataType: 'text' },                    // REQ-22
  ],
};

/** Worksheets to instantiate (all 10 — one per project-GHG-lifecycle phase; each hosts >=1 block gate). */
export const ISO140642_WORKSHEETS = [
  'ISO-14064-2-01', 'ISO-14064-2-02', 'ISO-14064-2-03', 'ISO-14064-2-04', 'ISO-14064-2-05',
  'ISO-14064-2-06', 'ISO-14064-2-07', 'ISO-14064-2-08', 'ISO-14064-2-09', 'ISO-14064-2-10',
] as const;

/** All 21 live BLOCK gates (severity='block', non-empty condition), grouped by home worksheet.
 *  Conditions + severities VERBATIM from prod compliance_requirements (double spaces around `==`
 *  and the capital `True` preserved). REQ-13 is severity='warn' with an EMPTY condition → NOT a
 *  block gate → omitted. */
export const ISO140642_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // ISO-14064-2-01 — Registrierung & Allgemeine Anforderungen (§4;§5.2)
  { ws: 'ISO-14064-2-01', code: 'REQ-01', cond: 'recognized_source_used  ==  true', sev: 'block' },
  { ws: 'ISO-14064-2-01', code: 'REQ-02', cond: 'deviations_documented == True', sev: 'block' },
  { ws: 'ISO-14064-2-01', code: 'REQ-03', cond: 'ghg_programme IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-2-01', code: 'REQ-04', cond: 'principle_conservativeness  ==  true AND principle_accuracy  ==  true', sev: 'block' },
  // ISO-14064-2-02 — Projektbeschreibung (§5.4;§6.2)
  { ws: 'ISO-14064-2-02', code: 'REQ-05', cond: 'project_title IS NOT NULL AND project_type IS NOT NULL AND project_location IS NOT NULL AND pre_project_conditions IS NOT NULL AND project_technologies IS NOT NULL AND expected_reductions_co2e IS NOT NULL AND project_risks IS NOT NULL AND roles_responsibilities IS NOT NULL AND chronological_plan IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-2-02', code: 'REQ-06', cond: 'baseline_revalidated == True', sev: 'block' },
  // ISO-14064-2-03 — Identifizierung projektrelevanter THG-QSS (§6.3)
  { ws: 'ISO-14064-2-03', code: 'REQ-07', cond: 'ssr_classification IN {controlled,related,affected}', sev: 'block' },
  // ISO-14064-2-04 — Bestimmung des THG-Bezugsszenarios & Zusätzlichkeit (§6.4;§6.5)
  { ws: 'ISO-14064-2-04', code: 'REQ-08', cond: 'baseline_criteria IS NOT NULL AND functional_equivalence IS NOT NULL AND baseline_justification IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-2-04', code: 'REQ-09', cond: 'baseline_conservative  ==  true', sev: 'block' },
  { ws: 'ISO-14064-2-04', code: 'REQ-10', cond: 'additionality_demonstrated  ==  true', sev: 'block' },
  // ISO-14064-2-05 — Identifizierung baseline-relevanter THG-QSS & QSS-Auswahl (§6.6)
  { ws: 'ISO-14064-2-05', code: 'REQ-11', cond: 'baseline_ssr IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-2-05', code: 'REQ-12', cond: 'ssr_selection_mode IN {regular_monitoring,estimation}', sev: 'block' },
  // ISO-14064-2-06 — Quantifizierung THG-Emissionen / Entzug (§6.7)
  { ws: 'ISO-14064-2-06', code: 'REQ-14', cond: 'emission_factor IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-2-06', code: 'REQ-15', cond: 'permanence_risk  ==  true', sev: 'block' },
  // ISO-14064-2-07 — Emissionsreduktionen & Steigerungen des Entzugs (§6.8) — cross-ws arithmetic identity
  { ws: 'ISO-14064-2-07', code: 'REQ-16', cond: 'emission_reduction = E_baseline - E_project', sev: 'block' },
  // ISO-14064-2-08 — Datenqualitätsmanagement (§6.9)
  { ws: 'ISO-14064-2-08', code: 'REQ-17', cond: 'qm_procedures  ==  true', sev: 'block' },
  // ISO-14064-2-09 — Überwachung des Klimaschutzprojekts (§6.10)
  { ws: 'ISO-14064-2-09', code: 'REQ-18', cond: 'monitoring_purpose IS NOT NULL AND monitored_parameters IS NOT NULL AND monitoring_methodologies IS NOT NULL AND monitoring_frequency IS NOT NULL', sev: 'block' },
  // ISO-14064-2-10 — Dokumentation, Verifizierung/Validierung & Berichterstattung (§7;§8;§9)
  { ws: 'ISO-14064-2-10', code: 'REQ-19', cond: 'conformity_documentation  ==  true', sev: 'block' },
  { ws: 'ISO-14064-2-10', code: 'REQ-20', cond: 'verification_validation_iso14064_3 == True', sev: 'block' },
  { ws: 'ISO-14064-2-10', code: 'REQ-21', cond: 'ghg_report IS NOT EMPTY', sev: 'block' },
  { ws: 'ISO-14064-2-10', code: 'REQ-22', cond: 'public_claim_content IS NOT NULL', sev: 'block' },
] as const;

export type ISO140642Fixture = {
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

export async function seedISO140642(sql: postgres.Sql, userId: string): Promise<ISO140642Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso14064-2-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO14064-2 Harness Org', ${'iso14064-2-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO14064-2-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-14064-2', 'ISO 14064-2 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of ISO140642_WORKSHEETS) {
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
    for (const f of ISO140642_FIELDS[ws]) {
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
  for (const g of ISO140642_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
