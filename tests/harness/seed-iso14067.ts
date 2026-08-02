/**
 * ISO 14067:2018 / EN ISO 14067:2019 / UNE-EN ISO 14067:2019 (ES)
 * ("Gases de efecto invernadero — Huella de carbono de productos" / Carbon Footprint of Products —
 * CFP quantification & guidelines) — minimal fixture for the REAL save-path gate-execution proof.
 *
 * SOURCE PRESENT: iso-14067-2019-af-peru.md + .pdf + .xlsx are in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\ISO-14067\). This wave is a FULL document
 * comparison. ISO 14067 is a methodological LCA standard structured on the four ISO 14040/14044 LCA
 * phases (§6.1). It prints exactly ONE normative quantification relationship (§6.5.1, in prose +
 * NOTA 1) and SIX informative Annex D recycling-allocation formulas (D.1–D.6). The encoding houses
 * 7 equations:
 *   EQ-01 cfp_result = SUM(ghg_mass * gwp_100)          (§6.5.1 + NOTA 1)   → FAITHFUL-to-prose /
 *                                                                             NR-for-execution
 *   EQ-02 E_M    = E_V + E_EoL - R*E_V                   (Anexo D, D.1 §D.3) → FAITHFUL (informative)
 *   EQ-03 E_M_D2 = E_V + E_EoL - R*A*E_V                 (Anexo D, D.2 §D.4) → FAITHFUL (informative)
 *   EQ-04 E_M_D3 = E_V*A + E_PP + E_EoL - R*A*E_V        (Anexo D, D.3 §D.4) → FAITHFUL (informative)
 *   EQ-05 E_M_D4 = E_PP + E_EoL + (1-R)*A*E_V            (Anexo D, D.4 §D.4) → FAITHFUL (informative)
 *   EQ-06 E_M_D5 = C*A*E_V + C*E_PP + (1-C)*E_V + E_EoL - R*A*E_V   (Anexo D, D.5 §D.4) → FAITHFUL
 *   EQ-07 E_M_D6 = C*E_PP + (1-C)*E_V + E_EoL + (C-R)*A*E_V         (Anexo D, D.6 §D.4) → FAITHFUL
 * All 7 verified symbol-by-symbol against the printed formulas in this session (D.1 line 1549,
 * D.2 1598, D.3 1617, D.4 1618, D.5 1626, D.6 1628; §6.5.1 line 1270). EQ-01's SUM() form is NOT
 * machine-evaluable and is not a compliance condition, so it is verified FAITHFUL and NEVER driven
 * here. EQ-02..07 (Annex D) all print output symbol E_M (they are ALTERNATIVES, one per material
 * scenario); the encoder correctly disambiguates the outputs as E_M/E_M_D2..E_M_D6 for single-source
 * — a faithful representation choice, documented in each clause_reference, not a defect. Annex D is
 * INFORMATIVE (verification_status=verified_via_cross_reference in prod); the five formulas D.2–D.6
 * that the earlier fidelity audit flagged as omitted have since been added — all six now present.
 *
 * This fixture is the EXECUTION half: it proves each live BLOCK gate enforces through the real save
 * path. Conditions + severities are pulled VERBATIM from prod compliance_requirements (standard
 * ISO-14067 = d0e21c0f-7c5f-47b3-b1cf-fcfd7adc9b5a, project vadsmshzebefjreqcicl, this session).
 * Nothing is applied to prod.
 *
 * TOPOLOGY (verbatim from live prod, re-executed this session): 7 worksheet_templates
 * (ISO-14067-01 … -07) mapping the LCA lifecycle — 01 registration/principles/goal&scope
 * (§1;§3;§4;§5;§6.1–6.3.2;Anexo A), 02 functional/declared unit & system boundary (§6.3.3;§6.3.4),
 * 03 data quality/time boundary/use & EoL stage (§6.3.5–§6.3.8), 04 inventory analysis AICv
 * (§6.4;Tabla 1;Anexo D) — carries EQ-02..07, 05 impact assessment EICv & CO2e (§6.5) — carries
 * EQ-01, 06 life-cycle interpretation (§6.6), 07 CFP report & critical review (§7;§8;Anexo B;Anexo C).
 * 83 active fields, 7 equations, 30 compliance_requirements. Of the 30, 27 are severity='block' with
 * a non-empty condition and THREE are severity='warn' (CR-16 biogenic_carbon_content §6.4.9.3,
 * CR-18 luc_direct_ghg §6.4.9.5, CR-19 aircraft_ghg §6.4.9.7). warn gates never enter
 * checkApprovalGate.failingBlockConditions — the approval-gate query filters severity='block' — so
 * CR-16/18/19 are NOT part of the block-enforcement proof and are not seeded. The fixture seeds all 7
 * worksheets and the 30 distinct field symbols the 27 block gates read.
 *
 * SINGLE-HOME / NO CROSS-WORKSHEET topology (verified against prod this session): EVERY block gate
 * reads ONLY fields that live on the gate's own home worksheet — there are NO cross-worksheet operand
 * reads in ISO-14067 (unlike ISO-14064-1). checkApprovalGate's project-wide fallback is therefore
 * never consulted for these gates; each gate resolves entirely from its local symbol map. No symbol
 * name collides across the 7 worksheets, so serial tests are independent. (The prompt's "seed
 * cross-worksheet field homes" step is a no-op for this standard, recorded explicitly rather than
 * silently skipped.)
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod enum values —
 * NONE of the 4 known engine traps are present in ISO-14067):
 *   1. bare-ident-RHS `field OP field` under an ORDERING op: NONE. ISO-14067 has ZERO ordering-op
 *      gates (<, <=, >, >=). No numeric comparison gate exists at all.
 *   2. `!= null` / `== null` / `!= ''` block gate: NONE. CR-20 was `cfp_result != ''` and was
 *      REPAIRED corpus-wide to `cfp_result IS NOT EMPTY`; verified in prod this session as
 *      `IS NOT EMPTY`. In evaluate.ts, IS NOT EMPTY and IS NOT NULL parse to the IDENTICAL `exists`
 *      node (both keywords accepted; '' treated as absent), so CR-20 now reaches a definite `fail`
 *      when cfp_result is cleared — proven both ways below. ZERO `!= ''` gates remain.
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. CR-07 members {site_specific,primary,secondary}
 *      and CR-17 members {internal,direct_supplier,supplier_specific_grid,grid_average} match the
 *      prod enum_values EXACTLY (all lowercase, verified against prod this session).
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. ISO-14067 has NO IF/THEN
 *      guard and NO OR gate. Every compound gate is a flat left-associative AND-chain (CR-03 3-way,
 *      CR-15 2-way), parses unambiguously.
 *
 * FIFTH SHAPE — TRUE NO-OP / definition-as-gate (NOT one of the 4 classic traps; a distinct finding,
 * REPORTED not "fixed" — turning a no-op into an enforcing gate is an ENFORCEMENT change on a modal
 * reading = a stop):
 *   FOUR block gates use `symbol IN {true,false}` against a BOOLEAN field:
 *     CR-02 rcp_pcr_used IN {true,false}            (§6.2)
 *     CR-10 use_stage_included IN {true,false}      (§6.3.7)
 *     CR-11 eol_stage_included IN {true,false}      (§6.3.8)
 *     CR-14 timing_emissions_over_10y IN {true,false} (§6.4.8)
 *   A boolean field's value is ALWAYS true or false → the membership ALWAYS matches → the gate can
 *   NEVER return `fail`; when the field is unset the engine returns `pending` (also non-blocking).
 *   So these four gates NEVER block approval in ANY reachable state — they are TRUE NO-OPs
 *   (fire-but-never-enforce, the F-4 class). For CR-02/10/11 the underlying field is is_required=true,
 *   so "a decision must be recorded" is still enforced — but by the SEPARATE missing-required-field
 *   check, NOT by the CR. For CR-14 the field is is_required=false, so nothing enforces it at all
 *   (arguably by design: >10y timing is optional §6.4.8). These are on the SIGN-OFF SHEET as a
 *   severity/shape ruling; here they are proven to be no-ops via `proveNeverBlocks` (asserted
 *   non-blocking in true / false / cleared states).
 *
 * DEGENERATE / JUDGMENT SHAPES (reported, NOT "fixed"):
 *   - PRESENCE-ONLY: most gates are `IS NOT NULL`/`IS NOT EMPTY` or `== true` — they require the
 *     field be ANSWERED, not substantively correct (e.g. CR-24 required_report_info_complete == true
 *     collapses §7.3 a)-t) into one boolean; CR-26/27 reduce Anexo B/C conformity to a presence
 *     check). Enforcement is real (proven both ways) but semantically weaker than the title.
 *   - CR-26 comparison_performed / CR-27 systematic_cfp_approach are IS NOT NULL on BOOLEAN fields:
 *     a boolean set to either true or false satisfies IS NOT NULL; only an UNSET field fails. Proven
 *     both ways (set → pass, cleared → fail).
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing is applied
 * to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the 30 symbols the 27 block
 * gates read are seeded.
 */
export const ISO14067_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'ISO-14067-01': [
    { symbol: 'four_lca_phases_included', dataType: 'boolean' },   // CR-01
    { symbol: 'rcp_pcr_used', dataType: 'boolean' },               // CR-02  (NO-OP: IN {true,false})
    { symbol: 'intended_application', dataType: 'text' },          // CR-03
    { symbol: 'study_reasons', dataType: 'text' },                 // CR-03
    { symbol: 'intended_audience', dataType: 'text' },             // CR-03
    { symbol: 'cfp_limitations_documented', dataType: 'boolean' }, // CR-25 (Anexo A)
    { symbol: 'avoid_double_counting', dataType: 'boolean' },      // CR-30 (§5.12)
  ],
  'ISO-14067-02': [
    { symbol: 'reference_flow', dataType: 'text' },                // CR-04
    { symbol: 'system_boundary_defined', dataType: 'boolean' },    // CR-05
    { symbol: 'cutoff_criteria', dataType: 'text' },               // CR-06
    { symbol: 'no_carbon_offsetting', dataType: 'boolean' },       // CR-29 (§6.3.4.1)
  ],
  'ISO-14067-03': [
    { symbol: 'data_type_hierarchy', dataType: 'enum' },           // CR-07
    { symbol: 'data_quality_characterized', dataType: 'boolean' }, // CR-08
    { symbol: 'time_boundary_period', dataType: 'text' },          // CR-09
    { symbol: 'use_stage_included', dataType: 'boolean' },         // CR-10 (NO-OP: IN {true,false})
    { symbol: 'eol_stage_included', dataType: 'boolean' },         // CR-11 (NO-OP: IN {true,false})
  ],
  'ISO-14067-04': [
    { symbol: 'data_collection_complete', dataType: 'boolean' },   // CR-12
    { symbol: 'allocation_mass_balance', dataType: 'boolean' },    // CR-13
    { symbol: 'timing_emissions_over_10y', dataType: 'boolean' },  // CR-14 (NO-OP: IN {true,false})
    { symbol: 'fossil_ghg_net', dataType: 'number' },              // CR-15
    { symbol: 'biogenic_ghg', dataType: 'number' },                // CR-15
    { symbol: 'electricity_treatment', dataType: 'enum' },         // CR-17
  ],
  'ISO-14067-05': [
    { symbol: 'cfp_result', dataType: 'number' },                  // CR-20 (repaired IS NOT EMPTY)
    { symbol: 'biogenic_co2_characterization', dataType: 'number' }, // CR-21
  ],
  'ISO-14067-06': [
    { symbol: 'uncertainty_evaluation', dataType: 'boolean' },     // CR-22
  ],
  'ISO-14067-07': [
    { symbol: 'ghg_values_separate', dataType: 'boolean' },        // CR-23 (§7.2)
    { symbol: 'required_report_info_complete', dataType: 'boolean' }, // CR-24 (§7.3)
    { symbol: 'comparison_performed', dataType: 'boolean' },       // CR-26 (Anexo B)
    { symbol: 'systematic_cfp_approach', dataType: 'boolean' },    // CR-27 (Anexo C)
    { symbol: 'critical_review', dataType: 'enum' },               // CR-28 (§8)
  ],
};

/** Worksheets to instantiate (all 7 — one per LCA phase; each hosts >=1 block gate). */
export const ISO14067_WORKSHEETS = [
  'ISO-14067-01', 'ISO-14067-02', 'ISO-14067-03', 'ISO-14067-04',
  'ISO-14067-05', 'ISO-14067-06', 'ISO-14067-07',
] as const;

/** Codes of the FOUR TRUE-NO-OP gates (`boolean IN {true,false}` — can never `fail`). */
export const ISO14067_NOOP_GATES = ['ISO-14067-CR-02', 'ISO-14067-CR-10', 'ISO-14067-CR-11', 'ISO-14067-CR-14'] as const;

/** All 27 live BLOCK gates (severity='block', non-empty condition), grouped by home worksheet.
 *  Conditions + severities VERBATIM from prod compliance_requirements (multiple spaces around `==`
 *  preserved). CR-16 + CR-18 + CR-19 are severity='warn' → NOT block gates → omitted. */
export const ISO14067_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // ISO-14067-01 — Registrierung, Prinzipien und Studienziel (§1;§3;§4;§5;§6.1–6.3.2;Anexo A)
  { ws: 'ISO-14067-01', code: 'ISO-14067-CR-01', cond: 'four_lca_phases_included   ==   true', sev: 'block' },
  { ws: 'ISO-14067-01', code: 'ISO-14067-CR-02', cond: 'rcp_pcr_used IN {true,false}', sev: 'block' }, // NO-OP
  { ws: 'ISO-14067-01', code: 'ISO-14067-CR-03', cond: 'intended_application IS NOT NULL AND study_reasons IS NOT NULL AND intended_audience IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14067-01', code: 'ISO-14067-CR-25', cond: 'cfp_limitations_documented   ==   true', sev: 'block' },
  { ws: 'ISO-14067-01', code: 'ISO-14067-CR-30', cond: 'avoid_double_counting   ==   true', sev: 'block' },
  // ISO-14067-02 — Funktionelle/deklarierte Einheit und Systemgrenze (§6.3.3;§6.3.4)
  { ws: 'ISO-14067-02', code: 'ISO-14067-CR-04', cond: 'reference_flow IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14067-02', code: 'ISO-14067-CR-05', cond: 'system_boundary_defined   ==   true', sev: 'block' },
  { ws: 'ISO-14067-02', code: 'ISO-14067-CR-06', cond: 'cutoff_criteria IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14067-02', code: 'ISO-14067-CR-29', cond: 'no_carbon_offsetting   ==   true', sev: 'block' },
  // ISO-14067-03 — Datenqualitaet, Zeitgrenze, Nutzungs- und End-of-Life-Phase (§6.3.5–§6.3.8)
  { ws: 'ISO-14067-03', code: 'ISO-14067-CR-07', cond: 'data_type_hierarchy IN {site_specific,primary,secondary}', sev: 'block' },
  { ws: 'ISO-14067-03', code: 'ISO-14067-CR-08', cond: 'data_quality_characterized   ==   true', sev: 'block' },
  { ws: 'ISO-14067-03', code: 'ISO-14067-CR-09', cond: 'time_boundary_period IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14067-03', code: 'ISO-14067-CR-10', cond: 'use_stage_included IN {true,false}', sev: 'block' }, // NO-OP
  { ws: 'ISO-14067-03', code: 'ISO-14067-CR-11', cond: 'eol_stage_included IN {true,false}', sev: 'block' }, // NO-OP
  // ISO-14067-04 — Sachbilanz AICv (§6.4;Tabla 1;Anexo D)
  { ws: 'ISO-14067-04', code: 'ISO-14067-CR-12', cond: 'data_collection_complete   ==   true', sev: 'block' },
  { ws: 'ISO-14067-04', code: 'ISO-14067-CR-13', cond: 'allocation_mass_balance   ==   true', sev: 'block' },
  { ws: 'ISO-14067-04', code: 'ISO-14067-CR-14', cond: 'timing_emissions_over_10y IN {true,false}', sev: 'block' }, // NO-OP
  { ws: 'ISO-14067-04', code: 'ISO-14067-CR-15', cond: 'fossil_ghg_net IS NOT NULL AND biogenic_ghg IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14067-04', code: 'ISO-14067-CR-17', cond: 'electricity_treatment IN {internal,direct_supplier,supplier_specific_grid,grid_average}', sev: 'block' },
  // ISO-14067-05 — Wirkungsabschaetzung EICv & CO2e (§6.5)
  { ws: 'ISO-14067-05', code: 'ISO-14067-CR-20', cond: 'cfp_result IS NOT EMPTY', sev: 'block' }, // REPAIRED from != ''
  { ws: 'ISO-14067-05', code: 'ISO-14067-CR-21', cond: 'biogenic_co2_characterization IS NOT NULL', sev: 'block' },
  // ISO-14067-06 — Interpretation des Lebenswegs (§6.6)
  { ws: 'ISO-14067-06', code: 'ISO-14067-CR-22', cond: 'uncertainty_evaluation   ==   true', sev: 'block' },
  // ISO-14067-07 — HCP-Studienbericht und kritische Pruefung (§7;§8;Anexo B;Anexo C)
  { ws: 'ISO-14067-07', code: 'ISO-14067-CR-23', cond: 'ghg_values_separate   ==   true', sev: 'block' },
  { ws: 'ISO-14067-07', code: 'ISO-14067-CR-24', cond: 'required_report_info_complete   ==   true', sev: 'block' },
  { ws: 'ISO-14067-07', code: 'ISO-14067-CR-26', cond: 'comparison_performed IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14067-07', code: 'ISO-14067-CR-27', cond: 'systematic_cfp_approach IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14067-07', code: 'ISO-14067-CR-28', cond: 'critical_review IS NOT NULL', sev: 'block' },
] as const;

export type ISO14067Fixture = {
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

export async function seedISO14067(sql: postgres.Sql, userId: string): Promise<ISO14067Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso14067-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO14067 Harness Org', ${'iso14067-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO14067-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-14067', 'ISO 14067 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of ISO14067_WORKSHEETS) {
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
    for (const f of ISO14067_FIELDS[ws]) {
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

  // Seed the 27 live BLOCK gates against their home worksheet templates.
  for (const g of ISO14067_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
