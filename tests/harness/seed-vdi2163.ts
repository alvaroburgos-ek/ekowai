/**
 * VDI 2163:2006-03 ("Innenraumlufthygiene — Raumluftqualität in Abfallbehandlungsanlagen durch
 * Raumlufttechnik") — minimal fixture for the REAL save-path gate-execution proof.
 *
 * SOURCE PRESENT: VDI-2163-2006-03.pdf + .md + .xlsx are in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\VDI-2653\ — the folder is MISLABELED
 * "VDI-2653" but contains the VDI-2163 source; prod re-coded the standard to the correct number
 * VDI-2163, resolving the encoder's F-1 identity flag). This wave is a FULL document comparison.
 * VDI 2163 is an INDOOR-AIR-HYGIENE / occupational-health requirements guideline: registration +
 * data_collection + verification archetypes, NO calculation. §4.4.2 states verbatim that no simple
 * design equations are available ("keine einfachen Berechnungsgleichungen verfügbar" — proof is
 * experimental/CFD), so the encoding houses ZERO equations (Equations tab header-only by design).
 * There is nothing to symbol-verify: EQ count = 0, confirmed against prod this session
 * (equations rows = 0 for standard 7bc49735-932e-48a4-b795-fa97ed134af5).
 *
 * This fixture is the EXECUTION half: it proves each live BLOCK gate enforces through the real save
 * path. Conditions + severities are pulled VERBATIM from prod compliance_requirements (standard
 * VDI-2163 = 7bc49735-932e-48a4-b795-fa97ed134af5, project vadsmshzebefjreqcicl, this session).
 * Nothing is applied to prod.
 *
 * TOPOLOGY (verbatim from live prod, re-executed this session): 8 worksheet_templates
 * (VDI-2163-01 … -08) mapping the guideline's chapter structure —
 *   01 Registrierung und Geltungsbereich (§1;§2)
 *   02 Gefahrstoff- und Bioaerosol-Expositionsbewertung (§3.1;§3.2;§3.3)
 *   03 Klimatische und akustische Einwirkungen (§3.4)
 *   04 Organisatorische Maßnahmen (§4.1;§4.2)
 *   05 Bauliche Maßnahmen (§4.3)
 *   06 Lufttechnische Maßnahmen / RLT (§4.4)
 *   07 Personenbezogene Maßnahmen / PSA (§4.5)
 *   08 Betrieb, Instandhaltung und Kontrollwerte (§5.1–5.3;§6.1–6.3)
 * 69 active fields, 0 equations, 32 compliance_requirements. ALL 32 are severity='block' with a
 * non-empty condition (CR-01 … CR-32) — there are ZERO warn gates in VDI-2163. The fixture seeds
 * all 8 worksheets and the 44 distinct field symbols the 32 block gates read.
 *
 * SINGLE-HOME / NO CROSS-WORKSHEET topology (verified against prod this session): EVERY block gate
 * reads ONLY fields that live on the gate's OWN home worksheet — there are NO cross-worksheet operand
 * reads in VDI-2163. checkApprovalGate's project-wide fallback is therefore never consulted for these
 * gates; each gate resolves entirely from its local symbol map. No symbol name collides across the 8
 * worksheets, so serial tests are independent. (CR-05 `schalldruckpegel <= beurteilungspegel` reads
 * TWO fields, but both are on WS03.)
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod values —
 * NONE of the 4 known engine traps are present in VDI-2163):
 *   1. bare-ident-RHS `field OP field` under an ORDERING op (string-coerces, never enforces): NONE
 *      that misfires. VDI-2163 has exactly ONE field-vs-field ordering gate, CR-05
 *      `schalldruckpegel <= beurteilungspegel` (both `number`). evaluate.ts lines 250-256 route a
 *      bare-ident RHS under an ORDERING operator through the numeric `acompare` path (RHS resolved
 *      via lookup, pending when unfilled) — the trap-1 fix. So CR-05 is a genuine numeric
 *      variable-vs-variable comparison that DOES enforce — proven both ways below (80<=85 pass,
 *      90<=85 fail).
 *   2. `!= null` / `== null` / `!= ''` block gate (never definite-fail): NONE. The three existence
 *      gates CR-28/29/30 all use the CORRECT `IS NOT NULL` form (→ `exists` node, definite-fail when
 *      cleared) — proven both ways. ZERO `!= ''` gates (all 32 conditions inspected this session);
 *      VDI-2163 was NOT in the corpus `!= ''`→IS NOT EMPTY migration 20260801510000 scope and needs
 *      no such repair.
 *   3. `IN {Titlecase}` vs lowercase enum (always-false membership): NONE. The two `IN {…}` gates and
 *      the two `==` enum gates all use literals that MATCH the field's stored enum casing EXACTLY
 *      (verified against fields.enum_values this session):
 *        CR-11 filterklasse_zuluft IN {F7,F8,F9}  — domain {F7,F8,F9}
 *        CR-27 klima_grenzbereich IN {behaglichkeit,ertraeglichkeit} — domain {behaglichkeit,
 *              ertraeglichkeit,ueberschreitung} (third option violates → real constraint)
 *        CR-15 anlagenstatus == neuanlage — domain {neuanlage,bestandsanlage}
 *        CR-26 zuluft_keimgehalt_verhaeltnis == kleiner_gleich_aussenluft — domain
 *              {kleiner_gleich_aussenluft,groesser_aussenluft}
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. VDI-2163 has NO IF/THEN
 *      guard. One OR gate (CR-12) and several flat left-associative AND-chains (CR-07 5-way, CR-20
 *      3-way, CR-09/17/21 2-way, CR-15 enum-eq AND boolean) — all parse unambiguously.
 *
 * FIFTH SHAPE — TRUE NO-OP / full-domain membership no-op:
 *   - `TRUE` no-op block gate: NONE. No VDI-2163 condition contains the literal `TRUE`. (The prior
 *     corpus scan's flag of "1 TRUE no-op gate in VDI-2163" does NOT reproduce against live prod —
 *     all 32 conditions are substantive predicates. Reported as an R-5 reversal on the sign-off
 *     sheet; nothing fabricated.)
 *   - FULL-DOMAIN membership no-op: CR-11 `filterklasse_zuluft IN {F7,F8,F9}` — the field's enum
 *     domain is EXACTLY {F7,F8,F9}, so every user-selectable value satisfies the gate ⇒ at the
 *     PRODUCT level it can never block (analog of the `boolean IN {true,false}` F-4 no-op). It is
 *     NOT a no-op at the EVALUATOR level: the membership check still fails for any value outside the
 *     set, which the real save path CAN persist (saveWorksheet does not validate enum membership).
 *     Proven both ways below at the engine level (F7 → pass, F5 out-of-domain → fail). The
 *     domain-coincidence no-op is a JUDGMENT item (tightening it = enforcement change) → sign-off,
 *     NOT fixed.
 *
 * DEGENERATE / JUDGMENT SHAPES (reported, NOT "fixed"):
 *   - CR-15 `anlagenstatus == neuanlage AND hygiene_erstinspektion_durchgefuehrt == true` is a plain
 *     AND, not a guard: a Bestandsanlage (existing facility) makes the first operand false ⇒ the AND
 *     is false ⇒ CR-15 BLOCKS every existing facility, even though §4.4.4's Erstinspektion
 *     requirement targets NEW facilities. The intent-faithful encoding is a guard
 *     `IF anlagenstatus == neuanlage THEN hygiene_erstinspektion_durchgefuehrt == true` (vacuously
 *     pass for existing facilities). Converting AND→guard CHANGES enforcement behaviour and rests on
 *     a reading of clause scope → RULING, sign-off only. Harness drives the new-facility branch
 *     (anlagenstatus='neuanlage') both ways.
 *   - PRESENCE-ONLY / boolean-flag gates: most block gates are `<flag> == true` (documented/adopted
 *     booleans) or numeric thresholds. They require the field be ANSWERED/within-limit, not
 *     substantively audited. Enforcement is real (proven both ways) but semantically weaker than the
 *     clause title.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing is applied
 * to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the 44 symbols the 32 block
 * gates read are seeded (non-gate fields like anlagentyp, gefahrstoffart, the
 * c_*_luft measurands, klima met/clo inputs, filterklasse_aussenluft, etc. are not
 * read by any block condition, so are omitted).
 */
export const VDI2163_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'VDI-2163-01': [
    { symbol: 'im_geltungsbereich', dataType: 'boolean' },                    // CR-01
  ],
  'VDI-2163-02': [
    { symbol: 'expositionsabschaetzung_vorhanden', dataType: 'boolean' },     // CR-02
    { symbol: 'arbeitsmed_vorsorge_angeboten', dataType: 'boolean' },         // CR-03
    { symbol: 'impfangebot_viren', dataType: 'boolean' },                     // CR-04
  ],
  'VDI-2163-03': [
    { symbol: 'schalldruckpegel', dataType: 'number' },                       // CR-05 (LHS)
    { symbol: 'beurteilungspegel', dataType: 'number' },                      // CR-05 (RHS field-vs-field)
  ],
  'VDI-2163-04': [
    { symbol: 'gefaehrdungsbeurteilung_vorhanden', dataType: 'boolean' },     // CR-06
    { symbol: 'unterweisungen_durchgefuehrt', dataType: 'boolean' },          // CR-07
    { symbol: 'wartungsplan_vorhanden', dataType: 'boolean' },                // CR-07
    { symbol: 'hautschutzplan_vorhanden', dataType: 'boolean' },              // CR-07
    { symbol: 'hygieneplan_vorhanden', dataType: 'boolean' },                 // CR-07
    { symbol: 'kennzeichnung_angebracht', dataType: 'boolean' },              // CR-07
    { symbol: 'rangfolge_eingehalten', dataType: 'boolean' },                 // CR-08
  ],
  'VDI-2163-05': [
    { symbol: 'staubemission_vermieden', dataType: 'boolean' },               // CR-09
    { symbol: 'abgaserfassung_entstehungsstelle', dataType: 'boolean' },      // CR-09
  ],
  'VDI-2163-06': [
    { symbol: 'aussenluftstrom_pro_person', dataType: 'number' },             // CR-10
    { symbol: 'filterklasse_zuluft', dataType: 'enum' },                      // CR-11 (full-domain no-op — see header)
    { symbol: 'umluftbetrieb', dataType: 'boolean' },                         // CR-12
    { symbol: 'umluft_abluftreinigung_nachgewiesen', dataType: 'boolean' },   // CR-12
    { symbol: 'zugaenglichkeit_inspektion', dataType: 'boolean' },            // CR-13
    { symbol: 'verdraengungsstrom_querschnitt', dataType: 'number' },         // CR-14
    { symbol: 'anlagenstatus', dataType: 'enum' },                            // CR-15
    { symbol: 'hygiene_erstinspektion_durchgefuehrt', dataType: 'boolean' },  // CR-15
    { symbol: 'hygieneinspektion_intervall', dataType: 'number' },            // CR-16
    { symbol: 'aussenluftstrom_schwere_arbeit', dataType: 'number' },         // CR-31
    { symbol: 'aussenluftstrom_geruchszuschlag', dataType: 'number' },        // CR-32
  ],
  'VDI-2163-07': [
    { symbol: 'psa_handschutz', dataType: 'boolean' },                        // CR-17
    { symbol: 'psa_koerperkleidung', dataType: 'boolean' },                   // CR-17
    { symbol: 'schutzkonzept_vorhanden', dataType: 'boolean' },               // CR-18
  ],
  'VDI-2163-08': [
    { symbol: 'dokumentation_betriebstagebuch', dataType: 'boolean' },        // CR-19
    { symbol: 'aussenluftdurchlass_pruefintervall', dataType: 'number' },     // CR-20
    { symbol: 'kammerzentrale_wasser_intervall', dataType: 'number' },        // CR-20
    { symbol: 'filterwechsel_intervall_stufe1', dataType: 'number' },         // CR-20
    { symbol: 'rueckkuehlwerk_reinigung_intervall', dataType: 'number' },     // CR-21
    { symbol: 'gesamtkoloniezahl_umlaufwasser', dataType: 'number' },         // CR-21
    { symbol: 'tkw_schimmelpilzsporen', dataType: 'number' },                 // CR-22
    { symbol: 'c_endotoxine_kontrollwert', dataType: 'number' },              // CR-23
    { symbol: 'gesamtkeimzahl_wasser', dataType: 'number' },                  // CR-24
    { symbol: 'legionellen_wasser', dataType: 'number' },                     // CR-25
    { symbol: 'zuluft_keimgehalt_verhaeltnis', dataType: 'enum' },            // CR-26
    { symbol: 'klima_grenzbereich', dataType: 'enum' },                       // CR-27
    { symbol: 'luftfeuchte_zuluftleitung', dataType: 'number' },              // CR-28 (IS NOT NULL)
    { symbol: 'messparameter_mikroorganismen', dataType: 'enum' },            // CR-29 (IS NOT NULL)
    { symbol: 'naehrboden_typ', dataType: 'enum' },                           // CR-30 (IS NOT NULL)
  ],
};

/** Worksheets to instantiate (all 8 — one per chapter phase; each hosts >=1 block gate). */
export const VDI2163_WORKSHEETS = [
  'VDI-2163-01', 'VDI-2163-02', 'VDI-2163-03', 'VDI-2163-04',
  'VDI-2163-05', 'VDI-2163-06', 'VDI-2163-07', 'VDI-2163-08',
] as const;

/** All 32 live BLOCK gates (severity='block', non-empty condition), grouped by home worksheet.
 *  Conditions + severities VERBATIM from prod compliance_requirements (this session). VDI-2163 has
 *  ZERO warn gates — all 32 requirements are severity='block'. */
export const VDI2163_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // VDI-2163-01 — Registrierung und Geltungsbereich (§1;§2)
  { ws: 'VDI-2163-01', code: 'VDI-2163-CR-01', cond: 'im_geltungsbereich == true', sev: 'block' },
  // VDI-2163-02 — Gefahrstoff- und Bioaerosol-Expositionsbewertung (§3.1–3.3)
  { ws: 'VDI-2163-02', code: 'VDI-2163-CR-02', cond: 'expositionsabschaetzung_vorhanden == true', sev: 'block' },
  { ws: 'VDI-2163-02', code: 'VDI-2163-CR-03', cond: 'arbeitsmed_vorsorge_angeboten == true', sev: 'block' },
  { ws: 'VDI-2163-02', code: 'VDI-2163-CR-04', cond: 'impfangebot_viren == true', sev: 'block' },
  // VDI-2163-03 — Klimatische und akustische Einwirkungen (§3.4)
  { ws: 'VDI-2163-03', code: 'VDI-2163-CR-05', cond: 'schalldruckpegel <= beurteilungspegel', sev: 'block' }, // field-vs-field acompare
  // VDI-2163-04 — Organisatorische Maßnahmen (§4.1;§4.2)
  { ws: 'VDI-2163-04', code: 'VDI-2163-CR-06', cond: 'gefaehrdungsbeurteilung_vorhanden == true', sev: 'block' },
  { ws: 'VDI-2163-04', code: 'VDI-2163-CR-07', cond: 'unterweisungen_durchgefuehrt == true AND wartungsplan_vorhanden == true AND hautschutzplan_vorhanden == true AND hygieneplan_vorhanden == true AND kennzeichnung_angebracht == true', sev: 'block' },
  { ws: 'VDI-2163-04', code: 'VDI-2163-CR-08', cond: 'rangfolge_eingehalten == true', sev: 'block' },
  // VDI-2163-05 — Bauliche Maßnahmen (§4.3)
  { ws: 'VDI-2163-05', code: 'VDI-2163-CR-09', cond: 'staubemission_vermieden == true AND abgaserfassung_entstehungsstelle == true', sev: 'block' },
  // VDI-2163-06 — Lufttechnische Maßnahmen / RLT (§4.4)
  { ws: 'VDI-2163-06', code: 'VDI-2163-CR-10', cond: 'aussenluftstrom_pro_person >= 40', sev: 'block' },
  { ws: 'VDI-2163-06', code: 'VDI-2163-CR-11', cond: 'filterklasse_zuluft IN {F7,F8,F9}', sev: 'block' },
  { ws: 'VDI-2163-06', code: 'VDI-2163-CR-12', cond: 'umluftbetrieb == false OR umluft_abluftreinigung_nachgewiesen == true', sev: 'block' },
  { ws: 'VDI-2163-06', code: 'VDI-2163-CR-13', cond: 'zugaenglichkeit_inspektion == true', sev: 'block' },
  { ws: 'VDI-2163-06', code: 'VDI-2163-CR-14', cond: 'verdraengungsstrom_querschnitt >= 1', sev: 'block' },
  { ws: 'VDI-2163-06', code: 'VDI-2163-CR-15', cond: 'anlagenstatus == neuanlage AND hygiene_erstinspektion_durchgefuehrt == true', sev: 'block' },
  { ws: 'VDI-2163-06', code: 'VDI-2163-CR-16', cond: 'hygieneinspektion_intervall <= 12', sev: 'block' },
  { ws: 'VDI-2163-06', code: 'VDI-2163-CR-31', cond: 'aussenluftstrom_schwere_arbeit >= 65', sev: 'block' },
  { ws: 'VDI-2163-06', code: 'VDI-2163-CR-32', cond: 'aussenluftstrom_geruchszuschlag >= 20', sev: 'block' },
  // VDI-2163-07 — Personenbezogene Maßnahmen / PSA (§4.5)
  { ws: 'VDI-2163-07', code: 'VDI-2163-CR-17', cond: 'psa_handschutz == true AND psa_koerperkleidung == true', sev: 'block' },
  { ws: 'VDI-2163-07', code: 'VDI-2163-CR-18', cond: 'schutzkonzept_vorhanden == true', sev: 'block' },
  // VDI-2163-08 — Betrieb, Instandhaltung und Kontrollwerte (§5;§6)
  { ws: 'VDI-2163-08', code: 'VDI-2163-CR-19', cond: 'dokumentation_betriebstagebuch == true', sev: 'block' },
  { ws: 'VDI-2163-08', code: 'VDI-2163-CR-20', cond: 'aussenluftdurchlass_pruefintervall <= 12 AND kammerzentrale_wasser_intervall <= 6 AND filterwechsel_intervall_stufe1 <= 12', sev: 'block' },
  { ws: 'VDI-2163-08', code: 'VDI-2163-CR-21', cond: 'rueckkuehlwerk_reinigung_intervall >= 2 AND gesamtkoloniezahl_umlaufwasser <= 10000', sev: 'block' },
  { ws: 'VDI-2163-08', code: 'VDI-2163-CR-22', cond: 'tkw_schimmelpilzsporen <= 100000', sev: 'block' },
  { ws: 'VDI-2163-08', code: 'VDI-2163-CR-23', cond: 'c_endotoxine_kontrollwert < 50', sev: 'block' },
  { ws: 'VDI-2163-08', code: 'VDI-2163-CR-24', cond: 'gesamtkeimzahl_wasser <= 1000', sev: 'block' },
  { ws: 'VDI-2163-08', code: 'VDI-2163-CR-25', cond: 'legionellen_wasser <= 1', sev: 'block' },
  { ws: 'VDI-2163-08', code: 'VDI-2163-CR-26', cond: 'zuluft_keimgehalt_verhaeltnis == kleiner_gleich_aussenluft', sev: 'block' },
  { ws: 'VDI-2163-08', code: 'VDI-2163-CR-27', cond: 'klima_grenzbereich IN {behaglichkeit,ertraeglichkeit}', sev: 'block' },
  { ws: 'VDI-2163-08', code: 'VDI-2163-CR-28', cond: 'luftfeuchte_zuluftleitung IS NOT NULL', sev: 'block' },
  { ws: 'VDI-2163-08', code: 'VDI-2163-CR-29', cond: 'messparameter_mikroorganismen IS NOT NULL', sev: 'block' },
  { ws: 'VDI-2163-08', code: 'VDI-2163-CR-30', cond: 'naehrboden_typ IS NOT NULL', sev: 'block' },
] as const;

export type VDI2163Fixture = {
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

export async function seedVDI2163(sql: postgres.Sql, userId: string): Promise<VDI2163Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'vdi2163-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('VDI2163 Harness Org', ${'vdi2163-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'VDI2163-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('VDI-2163', 'VDI 2163 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of VDI2163_WORKSHEETS) {
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
    for (const f of VDI2163_FIELDS[ws]) {
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

  // Seed the 32 live BLOCK gates against their home worksheet templates.
  for (const g of VDI2163_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
