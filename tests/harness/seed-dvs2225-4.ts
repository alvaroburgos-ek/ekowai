/**
 * DVS 2225-4 ("Schweißen von Dichtungsbahnen aus Polyethylen (PE) für die Abdichtung von
 * Deponien und Altlasten" — welding of PE geomembrane liners) — minimal fixture for the
 * REAL save-path gate-execution-proof harness.
 *
 * SOURCE PRESENT: DVS-2225-4.pdf + DVS-2225-4.md are in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DVS-2225-4\). This wave is a FULL
 * document comparison; the 3 seam-thickness equations (Δd_N1, Δd_N2 §6.2.11/Anhang Blatt 3;
 * f_NA §6.2.11/§6.2.12/Anhang Blatt 4) were verified symbol-by-symbol against the printed
 * formulas — all FAITHFUL. This fixture is the EXECUTION half: it proves each live BLOCK
 * gate enforces BOTH ways through the real save path. Conditions + severities are pulled
 * verbatim from prod compliance_requirements (standard DVS-2225-4 =
 * 62256118-194b-4810-9175-9f368f3b0048, project vadsmshzebefjreqcicl, this session).
 * Nothing is applied to prod.
 *
 * PRESERVE-LIST NOTE: DVS-2225-4's enforcing gate layer is on the campaign's do-not-rewrite
 * PRESERVE list. This fixture DRIVES the live conditions exactly as encoded; it does not
 * alter them. Semantic under-enforcement observations (CR-11 existence-only vs the printed
 * |Δd_N1−Δd_N2| ≤ 0,15 mm criterion; CR-07/CR-08 practice-range severity) are reported to
 * the sign-off sheet, never patched here.
 *
 * TOPOLOGY (verbatim from prod): 5 worksheet_templates (DVS-2225-4-01 … -05), 59 active
 * fields, 3 equations (all on -04), 18 compliance_requirements — ALL severity='block' with
 * a non-empty condition. Every one of the 18 gates' operands is a field on the SAME
 * worksheet as the gate (SINGLE-HOME topology — verified against prod), so there is NO
 * cross-worksheet operand: checkApprovalGate resolves every symbol from the local map. The
 * fixture seeds all 5 worksheets and only the 32 distinct field symbols the 18 gates read.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod enum
 * values — NONE of the 4 known engine traps are present in DVS-2225-4):
 *   1. bare-ident-RHS `field == field` / `field != field`: NONE. Every `==` gate has either
 *      a boolean-KEYWORD RHS `true` (CR-01/05/06/09/13/16/17 flags — tokenized to the TRUE
 *      literal) or a NUMBER-literal RHS (CR-15: `druckluft_pruefdruck == 5`,
 *      `druckluft_pruefzeit == 10`). No `==`/`!=` has a bare-identifier RHS. No `!=` gate
 *      exists at all.
 *   2. `!= null` / `== null` block gate: NONE. The two existence gates (CR-11, CR-18) use
 *      the `IS NOT NULL` form → the `exists` path (negate=true) → definite `fail` when the
 *      value is absent. No `IS NOT EMPTY` gate exists.
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. CR-14's members {gut, ausreichend} match
 *      the prod enum values of `versagensverhalten` EXACTLY (lowercase — the prod enum is
 *      {gut, ausreichend, nicht_ausreichend}), so the membership test resolves.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. DVS-2225-4 has NO
 *      IF/THEN guard at all. Every gate is a flat left-associative AND-chain (or a single
 *      comparison / membership / existence) — all parse unambiguously.
 *
 * NO literal-TRUE no-op, NO `!= ''`, NO definition-as-gate in the M-349/DIN-14021 sense.
 * All 18 gates reach a definite `fail` in their violating state (proven both ways below).
 *   - SEMANTIC observation (NOT a no-op): CR-11 `delta_d_N1 IS NOT NULL AND delta_d_N2 IS
 *     NOT NULL` is titled "Gleichmäßigkeit der Teilnaht-Fügewege" but enforces only
 *     PRESENCE, not the printed uniformity criterion |Δd_N1−Δd_N2| ≤ 0,15 mm (§6.2.12,
 *     line 625). It DOES enforce (fails when a value is absent — driven both ways) but
 *     under-specifies. Expressible as `delta_d_N1 - delta_d_N2 <= 0.15 AND delta_d_N2 -
 *     delta_d_N1 <= 0.15` via the acompare path — but that is an ENFORCEMENT CHANGE →
 *     sign-off item, not applied. Likewise CR-18 checks only presence of the two
 *     nachbesserung dimensions, not the §7 thresholds (≥10 cm overhang / ≥0,6 m strip).
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing is
 * applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the 32 symbols the 18 block
 * gates read are seeded (the non-gate-read fields — nahtform, fuegeflaechen_sauber,
 * eff_heizkeillaenge, wulst_dicke_anteil, etc. — are omitted).
 */
export const DVS2225_4_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'DVS-2225-4-01': [
    { symbol: 'dichtungsbahn_zugelassen', dataType: 'boolean' },      // CR-01
    { symbol: 'abnahmepruefzeugnis_vorhanden', dataType: 'boolean' }, // CR-01
    { symbol: 'd_o', dataType: 'number' },                            // CR-02
    { symbol: 'd_u', dataType: 'number' },                            // CR-02
    { symbol: 'b_N1', dataType: 'number' },                           // CR-03
    { symbol: 'b_N2', dataType: 'number' },                           // CR-03
    { symbol: 'b_P', dataType: 'number' },                            // CR-03
    { symbol: 'ue_1', dataType: 'number' },                           // CR-03
    { symbol: 'ue_2', dataType: 'number' },                           // CR-03
    { symbol: 'b_N', dataType: 'number' },                            // CR-04
    { symbol: 'a_versatz', dataType: 'number' },                      // CR-04
  ],
  'DVS-2225-4-02': [
    { symbol: 'schweisser_qualifiziert', dataType: 'boolean' },       // CR-05
    { symbol: 'kein_niederschlag', dataType: 'boolean' },             // CR-06
    { symbol: 'umgebungstemperatur', dataType: 'number' },            // CR-06
    { symbol: 'heizkeiltemperatur', dataType: 'number' },             // CR-07
    { symbol: 'spez_fuegekraft', dataType: 'number' },                // CR-07
    { symbol: 'schweissgeschw_hk', dataType: 'number' },              // CR-07
    { symbol: 'warmgastemperatur', dataType: 'number' },              // CR-08
    { symbol: 'extrudattemperatur', dataType: 'number' },             // CR-08
    { symbol: 'schweissgeschw_wg', dataType: 'number' },              // CR-08
  ],
  'DVS-2225-4-03': [
    { symbol: 'parametererfassung_abstand', dataType: 'number' },     // CR-09
    { symbol: 'ce_konformitaet', dataType: 'boolean' },               // CR-09
  ],
  'DVS-2225-4-04': [
    { symbol: 'delta_d_N1', dataType: 'number' },                     // CR-10, CR-11
    { symbol: 'delta_d_N2', dataType: 'number' },                     // CR-10, CR-11
    { symbol: 'f_NA', dataType: 'number' },                           // CR-12
    { symbol: 'aeussere_beschaffenheit_iO', dataType: 'boolean' },    // CR-13
    { symbol: 'versagensverhalten', dataType: 'enum' },               // CR-14
    { symbol: 'druckluft_pruefdruck', dataType: 'number' },           // CR-15
    { symbol: 'druckluft_pruefzeit', dataType: 'number' },            // CR-15
    { symbol: 'druckluft_druckabfall', dataType: 'number' },          // CR-15
    { symbol: 'dichtigkeit_iO', dataType: 'boolean' },                // CR-16
  ],
  'DVS-2225-4-05': [
    { symbol: 'schweissprotokoll_vollstaendig', dataType: 'boolean' },     // CR-17
    { symbol: 'pruefprotokoll_vollstaendig', dataType: 'boolean' },        // CR-17
    { symbol: 'fremdpruefung_gegengezeichnet', dataType: 'boolean' },      // CR-17
    { symbol: 'nachbesserung_zuschnitt_ueberstand', dataType: 'number' },  // CR-18
    { symbol: 'nachbesserung_streifenbreite', dataType: 'number' },        // CR-18
  ],
};

/** Worksheets to instantiate (all 5 — each hosts at least one gate). */
export const DVS2225_4_WORKSHEETS = [
  'DVS-2225-4-01', 'DVS-2225-4-02', 'DVS-2225-4-03', 'DVS-2225-4-04', 'DVS-2225-4-05',
] as const;

/** All 18 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const DVS2225_4_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // DVS-2225-4-01 — Dichtungsbahnen, Verlegung und Nahtkonstruktion (§2, §3.1)
  { ws: 'DVS-2225-4-01', code: 'DVS-2225-4-CR-01', cond: 'dichtungsbahn_zugelassen == true AND abnahmepruefzeugnis_vorhanden == true', sev: 'block' },
  { ws: 'DVS-2225-4-01', code: 'DVS-2225-4-CR-02', cond: 'd_o >= 2.5 AND d_u >= 2.5', sev: 'block' },
  { ws: 'DVS-2225-4-01', code: 'DVS-2225-4-CR-03', cond: 'b_N1 >= 15 AND b_N2 >= 15 AND b_P >= 10 AND ue_1 >= 5 AND ue_1 < 15 AND ue_2 >= 40', sev: 'block' },
  { ws: 'DVS-2225-4-01', code: 'DVS-2225-4-CR-04', cond: 'b_N >= 30 AND a_versatz <= 5', sev: 'block' },
  // DVS-2225-4-02 — Schweißverfahren und Schweißparameter (§4.3.1, §4.3.2, §4.3.3)
  { ws: 'DVS-2225-4-02', code: 'DVS-2225-4-CR-05', cond: 'schweisser_qualifiziert == true', sev: 'block' },
  { ws: 'DVS-2225-4-02', code: 'DVS-2225-4-CR-06', cond: 'kein_niederschlag == true AND umgebungstemperatur >= 5', sev: 'block' },
  { ws: 'DVS-2225-4-02', code: 'DVS-2225-4-CR-07', cond: 'heizkeiltemperatur >= 300 AND heizkeiltemperatur <= 420 AND spez_fuegekraft >= 30 AND spez_fuegekraft <= 40 AND schweissgeschw_hk >= 0.8 AND schweissgeschw_hk <= 2.5', sev: 'block' },
  { ws: 'DVS-2225-4-02', code: 'DVS-2225-4-CR-08', cond: 'warmgastemperatur >= 230 AND warmgastemperatur <= 300 AND extrudattemperatur >= 190 AND extrudattemperatur <= 240 AND schweissgeschw_wg >= 0.2 AND schweissgeschw_wg <= 1.2', sev: 'block' },
  // DVS-2225-4-03 — Schweißmaschinen und Schweißgeräte (§5.2 Datenerfassung, §5.1 CE)
  { ws: 'DVS-2225-4-03', code: 'DVS-2225-4-CR-09', cond: 'parametererfassung_abstand <= 50 AND ce_konformitaet == true', sev: 'block' },
  // DVS-2225-4-04 — Baustellenprüfungen der Nähte (§6.2.12, §6.3.5, §6.4)
  { ws: 'DVS-2225-4-04', code: 'DVS-2225-4-CR-10', cond: 'delta_d_N1 >= 0.40 AND delta_d_N1 <= 0.80 AND delta_d_N2 >= 0.40 AND delta_d_N2 <= 0.80', sev: 'block' },
  { ws: 'DVS-2225-4-04', code: 'DVS-2225-4-CR-11', cond: 'delta_d_N1 IS NOT NULL AND delta_d_N2 IS NOT NULL', sev: 'block' },
  { ws: 'DVS-2225-4-04', code: 'DVS-2225-4-CR-12', cond: 'f_NA >= 1.25 AND f_NA <= 1.75', sev: 'block' },
  { ws: 'DVS-2225-4-04', code: 'DVS-2225-4-CR-13', cond: 'aeussere_beschaffenheit_iO == true', sev: 'block' },
  { ws: 'DVS-2225-4-04', code: 'DVS-2225-4-CR-14', cond: 'versagensverhalten IN {gut, ausreichend}', sev: 'block' },
  { ws: 'DVS-2225-4-04', code: 'DVS-2225-4-CR-15', cond: 'druckluft_pruefdruck == 5 AND druckluft_pruefzeit == 10 AND druckluft_druckabfall <= 0.5', sev: 'block' },
  { ws: 'DVS-2225-4-04', code: 'DVS-2225-4-CR-16', cond: 'dichtigkeit_iO == true', sev: 'block' },
  // DVS-2225-4-05 — Prüfprotokolle und Nachbesserungen (§6.5, §7)
  { ws: 'DVS-2225-4-05', code: 'DVS-2225-4-CR-17', cond: 'schweissprotokoll_vollstaendig == true AND pruefprotokoll_vollstaendig == true AND fremdpruefung_gegengezeichnet == true', sev: 'block' },
  { ws: 'DVS-2225-4-05', code: 'DVS-2225-4-CR-18', cond: 'nachbesserung_zuschnitt_ueberstand IS NOT NULL AND nachbesserung_streifenbreite IS NOT NULL', sev: 'block' },
] as const;

export type DVS2225_4Fixture = {
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

export async function seedDVS2225_4(sql: postgres.Sql, userId: string): Promise<DVS2225_4Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'dvs2225-4-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('DVS2225-4 Harness Org', ${'dvs2225-4-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'DVS2225-4-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DVS-2225-4', 'DVS 2225-4 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of DVS2225_4_WORKSHEETS) {
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
    for (const f of DVS2225_4_FIELDS[ws]) {
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

  // Seed the 18 live BLOCK gates against their home worksheet templates.
  for (const g of DVS2225_4_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
