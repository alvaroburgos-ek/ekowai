/**
 * DIN EN 16941-2:2021 ("Vor-Ort-Anlagen für Nicht-Trinkwasser — Teil 2: Anlagen für die
 * Verwendung von behandeltem Grauwasser" / On-site non-potable water systems — Part 2:
 * treated greywater) — minimal fixture for the REAL save-path gate-execution-proof harness.
 *
 * SOURCE PRESENT: DIN-EN-16941-2.pdf + .md are in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-EN-16941-2\). This wave is a FULL
 * document comparison; the 2 equations (Gl.(1) §6.2.4.2 Grauwasserertrag Y_G, Gl.(2)
 * §6.2.4.3 Grauwasserbedarf D_G) were verified symbol-by-symbol against the printed formulas
 * — both FAITHFUL (the only deviation is the documented V_WM/u_WM → *_y / *_d disambiguation
 * split, same physical quantity, identical 30–60 l Tab.A.2/A.3 limits). This fixture is the
 * EXECUTION half: it proves each live BLOCK gate enforces BOTH ways through the real save
 * path. Conditions + severities are pulled verbatim from prod compliance_requirements
 * (standard DIN-EN-16941-2 = 0f58d951-35ea-4bf5-ba42-1f733d9e0600, project
 * vadsmshzebefjreqcicl, this session). Nothing is applied to prod.
 *
 * TOPOLOGY (verbatim from prod): 5 worksheet_templates (DIN-EN-16941-2-01 … -05), 76 active
 * fields, 2 equations, 19 compliance_requirements — ALL severity='block' with a non-empty
 * condition. WS -01 (Registrierung/Anwendungsbereich/Begriffe) hosts 0 gates and is not
 * seeded. The fixture seeds the 4 worksheets that host a gate (-02, -03, -04, -05) and only
 * the 23 distinct field symbols the 19 gates read. SINGLE-HOME topology, and — unlike
 * DIN-276/DIN-14021 — EVERY gate symbol is LOCAL to its own gate's worksheet: there is NO
 * cross-worksheet operand in DIN-EN-16941-2, so no project-wide fallback is exercised (each
 * gate resolves entirely from its home worksheet's saved values).
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod enum
 * values — NONE of the 4 known engine traps are present in DIN-EN-16941-2):
 *   1. bare-ident-RHS `field == field` / `field != field`: NONE. The only bare-ident-RHS
 *      equality is CR-15 `querverbindungstest_ergebnis == bestanden`, whose RHS `bestanden`
 *      is a real prod ENUM VALUE (label "BESTANDEN"), tokenized to the string literal
 *      "bestanden" on the legacy compare path — it is field-vs-enum-literal, NOT
 *      field-vs-field, and enforces (pass on 'bestanden', fail on 'nicht_bestanden'). The 13
 *      `== true` gates have a boolean-KEYWORD RHS. CR-07 `ueberlauf_kapazitaet >=
 *      zufluss_kapazitaet` is a bare-ident RHS under an ORDERING operator → routed through
 *      the numeric acompare path (both are number fields), resolved by lookup, enforces
 *      numerically. No `!=` gate exists at all.
 *   2. `!= null` / `== null` block gate: NONE. Every existence gate uses the `IS NOT NULL`
 *      form (CR-12, CR-17) → the `exists` path (negate=true) → reaches a definite `fail` when
 *      absent. No `IS NOT EMPTY` gates.
 *   3. `IN {Titlecase}` vs enum-case mismatch: NONE. CR-08 `rueckflusssicherung_typ IN
 *      {AA,AB}` — the prod enum values are EXACTLY "AA" / "AB" (uppercase, EN 13076/13077 air
 *      gaps), so the membership members match the enum values verbatim and the test resolves.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. DIN-EN-16941-2 has
 *      NO IF/THEN guard at all. CR-12 / CR-17 are flat left-associative AND-chains of
 *      existence tests — they parse unambiguously.
 *
 * NO literal-TRUE no-op, no `!= ''`, no definition-as-gate degenerate shapes. All 19 block
 * gates are drivable to a definite `fail`. ONE coverage/judgment note (reported, not
 * "fixed" — a ruling item, not source-settled): CR-12 encodes the §6.1 "der niedrigste
 * berechnete Wert … muss … verwendet werden" (min-selection) rule as a 3-way EXISTENCE chain
 * (`Y_G IS NOT NULL AND D_G IS NOT NULL AND bemessungswert_massgebend IS NOT NULL`) — it
 * enforces that all three are present, but does NOT enforce the numeric identity
 * `bemessungswert_massgebend == min(Y_G, D_G)`. Enforcement is real but weaker than the
 * printed rule; the min-identity is on the sign-off sheet.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing is
 * applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the 23 symbols the 19 block
 * gates read are seeded.
 */
export const DIN16941_2_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'DIN-EN-16941-2-02': [
    { symbol: 'getrennte_sammlung', dataType: 'boolean' },              // CR-01
    { symbol: 'bypass_vorhanden', dataType: 'boolean' },                // CR-02
    { symbol: 'behandlung_erreicht_qualitaet', dataType: 'boolean' },   // CR-03
    { symbol: 'speicher_lichtundurchlaessig', dataType: 'boolean' },    // CR-04
    { symbol: 'standsicherheit_nachgewiesen', dataType: 'boolean' },    // CR-05
    { symbol: 'wasserdichtheit_nachgewiesen', dataType: 'boolean' },    // CR-06
    { symbol: 'ueberlauf_kapazitaet', dataType: 'number' },             // CR-07
    { symbol: 'zufluss_kapazitaet', dataType: 'number' },               // CR-07
    { symbol: 'rueckflusssicherung_typ', dataType: 'enum' },            // CR-08
    { symbol: 'pumpe_trockenlaufschutz', dataType: 'boolean' },         // CR-09
    { symbol: 'anlagensteuerung_vorhanden', dataType: 'boolean' },      // CR-10
    { symbol: 'keine_querverbindungen_verteilung', dataType: 'boolean' }, // CR-11
  ],
  'DIN-EN-16941-2-03': [
    { symbol: 'Y_G', dataType: 'number' },                     // CR-12
    { symbol: 'D_G', dataType: 'number' },                     // CR-12
    { symbol: 'bemessungswert_massgebend', dataType: 'number' }, // CR-12
  ],
  'DIN-EN-16941-2-04': [
    { symbol: 'abstand_wurzeln_m', dataType: 'number' },            // CR-13
    { symbol: 'kennzeichnung_nicht_trinkwasser', dataType: 'boolean' }, // CR-14
    { symbol: 'querverbindungstest_ergebnis', dataType: 'enum' },   // CR-15
    { symbol: 'inbetriebnahmeprotokoll_erstellt', dataType: 'boolean' }, // CR-16
    { symbol: 'probenahmestelle_im_verteilsystem', dataType: 'boolean' }, // CR-17
    { symbol: 'bewertung_status', dataType: 'enum' },              // CR-17
  ],
  'DIN-EN-16941-2-05': [
    { symbol: 'risikobewertung_durchgefuehrt', dataType: 'boolean' }, // CR-18
    { symbol: 'betriebstagebuch_gefuehrt', dataType: 'boolean' },     // CR-19
  ],
};

/** Worksheets to instantiate (4 — the gate homes; -01 has no gate). */
export const DIN16941_2_WORKSHEETS = [
  'DIN-EN-16941-2-02', 'DIN-EN-16941-2-03', 'DIN-EN-16941-2-04', 'DIN-EN-16941-2-05',
] as const;

/** All 19 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const DIN16941_2_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // DIN-EN-16941-2-02 — Planung (§5 Sammlung/Behandlung/Speicherung/Nachspeisung/Pumpen/Steuerung)
  { ws: 'DIN-EN-16941-2-02', code: 'DIN-EN-16941-2-CR-01', cond: 'getrennte_sammlung == true', sev: 'block' },
  { ws: 'DIN-EN-16941-2-02', code: 'DIN-EN-16941-2-CR-02', cond: 'bypass_vorhanden == true', sev: 'block' },
  { ws: 'DIN-EN-16941-2-02', code: 'DIN-EN-16941-2-CR-03', cond: 'behandlung_erreicht_qualitaet == true', sev: 'block' },
  { ws: 'DIN-EN-16941-2-02', code: 'DIN-EN-16941-2-CR-04', cond: 'speicher_lichtundurchlaessig == true', sev: 'block' },
  { ws: 'DIN-EN-16941-2-02', code: 'DIN-EN-16941-2-CR-05', cond: 'standsicherheit_nachgewiesen == true', sev: 'block' },
  { ws: 'DIN-EN-16941-2-02', code: 'DIN-EN-16941-2-CR-06', cond: 'wasserdichtheit_nachgewiesen == true', sev: 'block' },
  { ws: 'DIN-EN-16941-2-02', code: 'DIN-EN-16941-2-CR-07', cond: 'ueberlauf_kapazitaet >= zufluss_kapazitaet', sev: 'block' },
  { ws: 'DIN-EN-16941-2-02', code: 'DIN-EN-16941-2-CR-08', cond: 'rueckflusssicherung_typ IN {AA,AB}', sev: 'block' },
  { ws: 'DIN-EN-16941-2-02', code: 'DIN-EN-16941-2-CR-09', cond: 'pumpe_trockenlaufschutz == true', sev: 'block' },
  { ws: 'DIN-EN-16941-2-02', code: 'DIN-EN-16941-2-CR-10', cond: 'anlagensteuerung_vorhanden == true', sev: 'block' },
  { ws: 'DIN-EN-16941-2-02', code: 'DIN-EN-16941-2-CR-11', cond: 'keine_querverbindungen_verteilung == true', sev: 'block' },
  // DIN-EN-16941-2-03 — Bemessung (§6.1 min-selection encoded as existence chain)
  { ws: 'DIN-EN-16941-2-03', code: 'DIN-EN-16941-2-CR-12', cond: 'Y_G IS NOT NULL AND D_G IS NOT NULL AND bemessungswert_massgebend IS NOT NULL', sev: 'block' },
  // DIN-EN-16941-2-04 — Einbau/Kennzeichnung/Inbetriebnahme/Wasserqualitätsprüfung (§7-§9,§11)
  { ws: 'DIN-EN-16941-2-04', code: 'DIN-EN-16941-2-CR-13', cond: 'abstand_wurzeln_m >= 3', sev: 'block' },
  { ws: 'DIN-EN-16941-2-04', code: 'DIN-EN-16941-2-CR-14', cond: 'kennzeichnung_nicht_trinkwasser == true', sev: 'block' },
  { ws: 'DIN-EN-16941-2-04', code: 'DIN-EN-16941-2-CR-15', cond: 'querverbindungstest_ergebnis == bestanden', sev: 'block' },
  { ws: 'DIN-EN-16941-2-04', code: 'DIN-EN-16941-2-CR-16', cond: 'inbetriebnahmeprotokoll_erstellt == true', sev: 'block' },
  { ws: 'DIN-EN-16941-2-04', code: 'DIN-EN-16941-2-CR-17', cond: 'probenahmestelle_im_verteilsystem IS NOT NULL AND bewertung_status IS NOT NULL', sev: 'block' },
  // DIN-EN-16941-2-05 — Qualität/Risikobewertung/Wartung (§10,§12)
  { ws: 'DIN-EN-16941-2-05', code: 'DIN-EN-16941-2-CR-18', cond: 'risikobewertung_durchgefuehrt == true', sev: 'block' },
  { ws: 'DIN-EN-16941-2-05', code: 'DIN-EN-16941-2-CR-19', cond: 'betriebstagebuch_gefuehrt == true', sev: 'block' },
] as const;

export type DIN16941_2Fixture = {
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

export async function seedDIN16941_2(sql: postgres.Sql, userId: string): Promise<DIN16941_2Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'din16941-2-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('DIN16941-2 Harness Org', ${'din16941-2-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'DIN16941-2-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DIN-EN-16941-2', 'DIN EN 16941-2 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of DIN16941_2_WORKSHEETS) {
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
    for (const f of DIN16941_2_FIELDS[ws]) {
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

  // Seed the 19 live BLOCK gates against their home worksheet templates.
  for (const g of DIN16941_2_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
