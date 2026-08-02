/**
 * VDI 3814 Blatt 2.1:2019-01 ("Gebäudeautomation (GA); Planung; Bedarfsplanung,
 * Betreiberkonzept und Lastenheft") — minimal fixture for the REAL save-path
 * gate-execution proof.
 *
 * SOURCE PRESENT: VDI-3814-Blatt-2-1.pdf + VDI-3814-Blatt-2/VDI-3814-Blatt-2.md are in the
 * library (C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\). This wave is a FULL document
 * comparison (bidirectional). VDI 3814 Blatt 2.1 is a GA PLANNING guideline — Bedarfsplanung,
 * Betreiberkonzept, Lastenheft — carrying NO equations (0 rows in prod) and 28 attestation/
 * documentation BLOCK gates. Conditions, severities, symbols + data types are pulled VERBATIM
 * from prod (standard 2b60107c-79cb-47ca-8c01-bad5cb42c72d, project vadsmshzebefjreqcicl, this
 * session). Nothing is applied to prod.
 *
 * TOPOLOGY (verbatim from live prod, re-executed this session): 7 worksheet_templates
 * (VDI-3814-Blatt-2-1-01 … -07) mapping the guideline's clause structure —
 *   01 Anwendungsbereich / Grundlagen (§1,§5)                    (0 gates; attestation fields only)
 *   02 Bedarfsplanung (§6)                                       (8 block gates: CR-01..07,28)
 *   03 Betreiberkonzept Gebäudeautomation (§7)                   (7 block gates: CR-08..14)
 *   04 GA-Lastenheft Allg./Datenkomm./Störfall (§8.1..8.3)      (3 block gates: CR-15..17)
 *   05 GA-Lastenheft Geräte/Infrastruktur (§8.4..8.8)           (4 block gates: CR-18..21)
 *   06 GA-Lastenheft Funktionen/Energieeff./Systemfkt. (§8.9..8.14)(5 block gates: CR-22..26)
 *   07 Vollständigkeit, Pflege & Übergabe (§8.1/§6.1 pflege)     (1 block gate: CR-27)
 * 28 severity='block' gates, 0 warn, 0 equations, 69 fields.
 *
 * SINGLE-HOME (all 28): every block gate reads fields on its OWN home worksheet — verified
 * against prod fields this session. There is NO cross-worksheet operand in this standard
 * (unlike VDI-3477's CR-13). checkApprovalGate's project-wide fallback is therefore never
 * exercised here; every gate resolves locally.
 *
 * ONE TRUE NO-OP BLOCK GATE (confirmed against live prod this session — reproduces): CR-28
 * (WS02, "Die Bedarfsplanung liegt im Verantwortungsbereich des Bauherrn … nicht mit der
 * Grundlagenermittlung DIN 18205 zu verwechseln") has condition = literal `TRUE` → always
 * passes, never blocks. It is a bare informational note encoded as a placeholder block gate.
 * Converting TRUE→a real predicate is an enforcement change ⇒ OWNER RULING, NOT fixed here.
 * The harness drives it to demonstrate the no-op (never blocks in any persisted state).
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod values):
 *   1. bare-ident-RHS `field OP field` under ORDERING op: NONE. This standard has ZERO ordering
 *      comparisons — every gate is existence (IS NOT NULL/EMPTY), boolean `== true`, membership
 *      IN, or literal TRUE. (§7.7.1's "Versorgungsanlagen mind. = Gebäudeprioritaet" prose is
 *      NOT encoded as a comparison — it is two existence checks in CR-13; see the sign-off sheet.)
 *   2. `!= null` / `== null` / `!= ''` block gate: NONE REMAIN. Migration 20260801510000 (APPLIED
 *      to prod) converted 3 VDI-3814-Blatt-2-1 gates from `field != ''` → `IS NOT EMPTY`. Live
 *      inspection this session: FOUR gates now carry `IS NOT EMPTY` (CR-01 projektname, CR-03
 *      projektumfang, CR-11 betreiberstruktur, CR-22 energieeffizienzklasse) — 3 converted by the
 *      migration + 1 authored natively as IS NOT EMPTY. ZERO `!= ''` remain (all 28 conditions
 *      inspected). The harness drives all 4 IS NOT EMPTY gates BOTH ways to prove they now reach a
 *      definite `fail` when the field is cleared — the repair's whole point (exists node in
 *      evaluate.ts L425-430: absent/'' ⇒ fail).
 *   3. `IN {Titlecase}` vs lowercase enum: NONE MISFIRING. Exactly one membership gate, CR-12
 *      `betreibermodell IN {eigenbetreiben,fremdbetreiben,kombination}`. The betreibermodell
 *      enum_values are EXACTLY those three lowercase tokens → members match the domain, membership
 *      resolves correctly (case-sensitive equals, evaluate.ts L505-507). BUT the members equal the
 *      COMPLETE enum domain ⇒ enum-full-domain no-op: with a UI-constrained value it can never
 *      reach a definite fail (present-in-domain ⇒ pass; absent ⇒ pending). See the sign-off sheet.
 *      The harness proves the ENGINE mechanics both ways using an out-of-domain value (saveWorksheet
 *      does NOT validate enum domain, worksheet.ts L291-292) — present-not-in-set ⇒ definite fail.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE — no IF/THEN guard exists.
 *      Only literal-TRUE (CR-28), flat left-associative existence AND-chains (CR-02/04/13/16/17/18/
 *      19/21/25), single existence gates, boolean `== true` (CR-15/27), and one membership (CR-12).
 *      No OR gates.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing is applied
 * to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate-read symbol on its ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the symbols the 28 block gates read are
 * seeded. is_required is deliberately FALSE so the per-gate proof isolates the block-CONDITION
 * path (checkApprovalGate's separate missing-required-field list is not what we prove here).
 */
export const VDI3814_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'VDI-3814-Blatt-2-1-01': [],                                                     // no block gate
  'VDI-3814-Blatt-2-1-02': [
    { symbol: 'projektname', dataType: 'text' },                                   // CR-01 (IS NOT EMPTY)
    { symbol: 'ag_name', dataType: 'text' },                                       // CR-02
    { symbol: 'ag_organisationsform', dataType: 'text' },                          // CR-02
    { symbol: 'ag_vertreter', dataType: 'text' },                                  // CR-02
    { symbol: 'ag_projektleiter', dataType: 'text' },                              // CR-02
    { symbol: 'projektumfang', dataType: 'text' },                                 // CR-03 (IS NOT EMPTY)
    { symbol: 'ziel_beschreibung', dataType: 'text' },                             // CR-04
    { symbol: 'prioritaeten_matrix', dataType: 'text' },                           // CR-04
    { symbol: 'projektschnittstellen', dataType: 'text' },                         // CR-05
    { symbol: 'nutzungsprozess_beschreibung', dataType: 'text' },                  // CR-06
    { symbol: 'bestandsdokumente', dataType: 'text' },                             // CR-07
  ],
  'VDI-3814-Blatt-2-1-03': [
    { symbol: 'betreiberkonzept_ziele', dataType: 'text' },                        // CR-08
    { symbol: 'betreiberkonzept_nutzer', dataType: 'enum' },                       // CR-09 (IS NOT NULL)
    { symbol: 'zu_betreibende_objekte', dataType: 'text' },                        // CR-10
    { symbol: 'betreiberstruktur', dataType: 'text' },                             // CR-11 (IS NOT EMPTY)
    { symbol: 'betreibermodell', dataType: 'enum' },                               // CR-12 (IN {...})
    { symbol: 'gebaeude_prioritaet', dataType: 'enum' },                           // CR-13
    { symbol: 'anlagen_prioritaet', dataType: 'enum' },                            // CR-13
    { symbol: 'sla_definition', dataType: 'text' },                                // CR-14
  ],
  'VDI-3814-Blatt-2-1-04': [
    { symbol: 'lastenheft_erstellt', dataType: 'boolean' },                        // CR-15 (== true)
    { symbol: 'datenkommunikationsprotokoll', dataType: 'enum' },                  // CR-16
    { symbol: 'datenschnittstellen', dataType: 'text' },                           // CR-16
    { symbol: 'meldungsart', dataType: 'enum' },                                   // CR-17
    { symbol: 'meldungsempfaenger', dataType: 'text' },                            // CR-17
    { symbol: 'meldung_zustandsuebergang', dataType: 'enum' },                     // CR-17
    { symbol: 'meldungsquittierung', dataType: 'text' },                           // CR-17
  ],
  'VDI-3814-Blatt-2-1-05': [
    { symbol: 'feldgeraete_spezifikation', dataType: 'text' },                     // CR-18
    { symbol: 'automationseinrichtungen_spez', dataType: 'text' },                 // CR-18
    { symbol: 'verhalten_spannungsausfall', dataType: 'text' },                    // CR-18
    { symbol: 'mbe_systemart', dataType: 'enum' },                                 // CR-19
    { symbol: 'mbe_anforderungen', dataType: 'text' },                             // CR-19
    { symbol: 'schaltschrank_anforderungen', dataType: 'text' },                   // CR-20
    { symbol: 'it_netzwerk_anforderungen', dataType: 'text' },                     // CR-21
    { symbol: 'it_sicherheit', dataType: 'text' },                                 // CR-21
  ],
  'VDI-3814-Blatt-2-1-06': [
    { symbol: 'energieeffizienzklasse', dataType: 'text' },                        // CR-22 (IS NOT EMPTY)
    { symbol: 'historisierung_vorgaben', dataType: 'text' },                       // CR-23
    { symbol: 'cafm_schnittstellen', dataType: 'text' },                           // CR-24
    { symbol: 'systemselbstueberwachung', dataType: 'text' },                      // CR-25
    { symbol: 'systemzeitverwaltung', dataType: 'text' },                          // CR-25
    { symbol: 'datenimport_export', dataType: 'text' },                            // CR-25
    { symbol: 'zugriffsebene', dataType: 'enum' },                                 // CR-25
    { symbol: 'aktivitaetenspeicher', dataType: 'text' },                          // CR-25
    { symbol: 'datensicherung_konzept', dataType: 'text' },                        // CR-25
    { symbol: 'fernzugriff', dataType: 'text' },                                   // CR-25
    { symbol: 'gewerkespezifische_schnittstellen', dataType: 'text' },             // CR-26
  ],
  'VDI-3814-Blatt-2-1-07': [
    { symbol: 'dokumente_gepflegt', dataType: 'boolean' },                         // CR-27 (== true)
  ],
};

/** Worksheets to instantiate (all 7). */
export const VDI3814_WORKSHEETS = [
  'VDI-3814-Blatt-2-1-01', 'VDI-3814-Blatt-2-1-02', 'VDI-3814-Blatt-2-1-03',
  'VDI-3814-Blatt-2-1-04', 'VDI-3814-Blatt-2-1-05', 'VDI-3814-Blatt-2-1-06',
  'VDI-3814-Blatt-2-1-07',
] as const;

/** All 28 live BLOCK gates (severity='block'), grouped by home worksheet. Conditions +
 *  severities VERBATIM from prod compliance_requirements (this session). */
export const VDI3814_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // WS02 — Bedarfsplanung (§6)
  { ws: 'VDI-3814-Blatt-2-1-02', code: 'VDI-3814-2-1-CR-01', cond: 'projektname IS NOT EMPTY', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-02', code: 'VDI-3814-2-1-CR-02', cond: 'ag_name IS NOT NULL AND ag_organisationsform IS NOT NULL AND ag_vertreter IS NOT NULL AND ag_projektleiter IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-02', code: 'VDI-3814-2-1-CR-03', cond: 'projektumfang IS NOT EMPTY', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-02', code: 'VDI-3814-2-1-CR-04', cond: 'ziel_beschreibung IS NOT NULL AND prioritaeten_matrix IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-02', code: 'VDI-3814-2-1-CR-05', cond: 'projektschnittstellen IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-02', code: 'VDI-3814-2-1-CR-06', cond: 'nutzungsprozess_beschreibung IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-02', code: 'VDI-3814-2-1-CR-07', cond: 'bestandsdokumente IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-02', code: 'VDI-3814-2-1-CR-28', cond: 'TRUE', sev: 'block' }, // TRUE no-op (DIN 18205 note)
  // WS03 — Betreiberkonzept (§7)
  { ws: 'VDI-3814-Blatt-2-1-03', code: 'VDI-3814-2-1-CR-08', cond: 'betreiberkonzept_ziele IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-03', code: 'VDI-3814-2-1-CR-09', cond: 'betreiberkonzept_nutzer IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-03', code: 'VDI-3814-2-1-CR-10', cond: 'zu_betreibende_objekte IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-03', code: 'VDI-3814-2-1-CR-11', cond: 'betreiberstruktur IS NOT EMPTY', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-03', code: 'VDI-3814-2-1-CR-12', cond: 'betreibermodell IN {eigenbetreiben,fremdbetreiben,kombination}', sev: 'block' }, // enum-full-domain no-op
  { ws: 'VDI-3814-Blatt-2-1-03', code: 'VDI-3814-2-1-CR-13', cond: 'gebaeude_prioritaet IS NOT NULL AND anlagen_prioritaet IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-03', code: 'VDI-3814-2-1-CR-14', cond: 'sla_definition IS NOT NULL', sev: 'block' },
  // WS04 — GA-Lastenheft: Allgemeines, Datenkommunikation, Störfallmanagement (§8.1..8.3)
  { ws: 'VDI-3814-Blatt-2-1-04', code: 'VDI-3814-2-1-CR-15', cond: 'lastenheft_erstellt == true', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-04', code: 'VDI-3814-2-1-CR-16', cond: 'datenkommunikationsprotokoll IS NOT NULL AND datenschnittstellen IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-04', code: 'VDI-3814-2-1-CR-17', cond: 'meldungsart IS NOT NULL AND meldungsempfaenger IS NOT NULL AND meldung_zustandsuebergang IS NOT NULL AND meldungsquittierung IS NOT NULL', sev: 'block' },
  // WS05 — GA-Lastenheft: Geräte- und Infrastrukturanforderungen (§8.4..8.8)
  { ws: 'VDI-3814-Blatt-2-1-05', code: 'VDI-3814-2-1-CR-18', cond: 'feldgeraete_spezifikation IS NOT NULL AND automationseinrichtungen_spez IS NOT NULL AND verhalten_spannungsausfall IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-05', code: 'VDI-3814-2-1-CR-19', cond: 'mbe_systemart IS NOT NULL AND mbe_anforderungen IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-05', code: 'VDI-3814-2-1-CR-20', cond: 'schaltschrank_anforderungen IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-05', code: 'VDI-3814-2-1-CR-21', cond: 'it_netzwerk_anforderungen IS NOT NULL AND it_sicherheit IS NOT NULL', sev: 'block' },
  // WS06 — GA-Lastenheft: Funktionen, Energieeffizienz, Daten- & Systemfunktionen (§8.9..8.14)
  { ws: 'VDI-3814-Blatt-2-1-06', code: 'VDI-3814-2-1-CR-22', cond: 'energieeffizienzklasse IS NOT EMPTY', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-06', code: 'VDI-3814-2-1-CR-23', cond: 'historisierung_vorgaben IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-06', code: 'VDI-3814-2-1-CR-24', cond: 'cafm_schnittstellen IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-06', code: 'VDI-3814-2-1-CR-25', cond: 'systemselbstueberwachung IS NOT NULL AND systemzeitverwaltung IS NOT NULL AND datenimport_export IS NOT NULL AND zugriffsebene IS NOT NULL AND aktivitaetenspeicher IS NOT NULL AND datensicherung_konzept IS NOT NULL AND fernzugriff IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3814-Blatt-2-1-06', code: 'VDI-3814-2-1-CR-26', cond: 'gewerkespezifische_schnittstellen IS NOT NULL', sev: 'block' },
  // WS07 — Vollständigkeit, Pflege & Übergabe
  { ws: 'VDI-3814-Blatt-2-1-07', code: 'VDI-3814-2-1-CR-27', cond: 'dokumente_gepflegt == true', sev: 'block' },
] as const;

export type VDI3814Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
  /** symbol → home worksheet code */
  symbolHome: Record<string, string>;
};

export async function seedVDI3814_2_1(sql: postgres.Sql, userId: string): Promise<VDI3814Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'vdi3814-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('VDI3814 Harness Org', ${'vdi3814-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'VDI3814-2-1-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('VDI-3814-Blatt-2-1', 'VDI 3814 Blatt 2.1 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of VDI3814_WORKSHEETS) {
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
    for (const f of VDI3814_FIELDS[ws]) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
      symbolHome[f.symbol] = ws;
    }
  }

  // Seed the 28 live BLOCK gates against their home worksheet templates.
  for (const g of VDI3814_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
