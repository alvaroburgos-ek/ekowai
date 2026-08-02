/**
 * ISO 14064-1:2018 / EN ISO 14064-1:2019 / DIN EN ISO 14064-1
 * ("Treibhausgase — Teil 1: Spezifikation mit Anleitung zur quantitativen Bestimmung und
 * Berichterstattung von Treibhausgasemissionen und Entzug von Treibhausgasen auf
 * Organisationsebene" / GHG — organization-level quantification & reporting) — minimal fixture
 * for the REAL save-path gate-execution-proof harness.
 *
 * SOURCE PRESENT: ISO-14064-1-Deutsch.md + .pdf + .xlsx are in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\ISO-14064-1\). This wave is a FULL
 * document comparison. ISO 14064-1 is a management/specification standard — it prints NO
 * numbered closed-form equations; it states the GHG quantification RELATIONSHIPS in prose and
 * the encoder synthesised them into 4 explicit equations housed on -05 (used_in_worksheet -05):
 *   Q-GHG  E_gas = AD * EF_gas          (§6.2.3 ANMERKUNG "Aktivitätsdaten × Emissionsfaktoren";
 *                                        EF def §3.1.7)                         → FAITHFUL-to-prose
 *   Q-EL   E_el = EL_imp * EF_grid      (§E.2.1 ortsbasierter Ansatz, Netz-Ø-EF) → FAITHFUL-to-prose
 *   Q-CAT  E_co2e_gas = E_gas * GWP_gas (§3.1.13 Anm.1 "Masse × Treibhauspotential";
 *                                        §6.3 Umrechnungspflicht t CO2Äq)       → FAITHFUL-to-prose
 *   Q-TOT  E_co2e_total = SUM(E_co2e_gas) (§5.2.4 Aggregation in 6 Kategorien;
 *                                        §5.1 ANMERKUNG 2)                       → FAITHFUL-to-prose /
 *                                                                                 NR-for-execution
 * The `SUM()` form of Q-TOT is NOT machine-evaluable and is not a compliance condition, so the
 * equations are verified FAITHFUL against the printed defined terms and NEVER driven here. The
 * source's only numeric "GWP" values (Annex F reporting template: 1/30/265/5000/4000/23500/16100)
 * are captioned "for illustration only"; §6.3 mandates the LATEST IPCC GWP over a 100-year
 * horizon — the encoding correctly keeps GWP_gas an entered field (no hard-coded value) and
 * enforces value+source via CR-010/CR-023. Prod carries all 4 equations
 * verification_status='verified_against_standard'.
 *
 * This fixture is the EXECUTION half: it proves each live BLOCK gate enforces BOTH ways through
 * the real save path. Conditions + severities are pulled VERBATIM from prod
 * compliance_requirements (standard ISO-14064-1 = 3487e7cf-6e44-46c6-8eab-fc257d66f143,
 * project vadsmshzebefjreqcicl, this session). Nothing is applied to prod.
 *
 * TOPOLOGY (verbatim from live prod, re-executed this session): 8 worksheet_templates
 * (ISO-14064-1-01 … -08) mapping the GHG-inventory lifecycle — 01 registration/scope/principles
 * (§1;§3;§4), 02 organizational boundaries & consolidation (§5.1;Anhang A), 03 reporting
 * boundaries/categories/significance (§5.2), 04 sources-sinks & quantification approach
 * (§3;§6.1;§6.2), 05 quantification of emissions/removals CO2Äq (§6.3;Anhang D;Anhang E) — the
 * only worksheet carrying equations, 06 base year & recalculation (§6.4), 07 reduction/QM/
 * uncertainty (§7;§8), 08 GHG report & verification (§9;§10). 49 active fields, 4 equations
 * (all on -05), 25 compliance_requirements. Of the 25, 23 are severity='block' with a non-empty
 * condition and TWO are severity='warn' (CR-021 `thg_bericht_erstellt  ==  true` §9.1 conditional
 * reporting on -08; CR-024 `verifizierungsart IS NOT NULL AND sicherheitsgrad IS NOT NULL` §10
 * on -08). warn gates never enter checkApprovalGate.failingBlockConditions — the approval-gate
 * query filters severity='block' — so CR-021/CR-024 are NOT part of the block-enforcement proof
 * and are not seeded. The fixture seeds all 8 worksheets and only the 27 distinct field symbols
 * the 23 block gates read; each gate symbol is homed on exactly ONE worksheet (single-home
 * topology — verified against prod), so checkApprovalGate's conflict-free project-wide fallback
 * resolves every cross-worksheet operand.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing, two symbols — each single-home ⇒ no conflict):
 *   - `berichtszeitraum` (text) is a field on -01 only, read by CR-009 (home -05).
 *   - `E_co2e_total` (number) is a field on -05 only, read by CR-022 (home -08) as well as its
 *     own home gate CR-009 (-05).
 *   Every gate's PASS phase re-establishes each operand it reads (local + cross), and each gate's
 *   violating state flips a LOCAL field so shared cross-worksheet operands are not disturbed
 *   between serial tests. CR-009's violate clears its LOCAL E_co2e_total; the later CR-022 test
 *   re-establishes E_co2e_total (cross-ws) in its PASS phase, so both prove independently.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod enum values —
 * NONE of the 4 known engine traps are present in ISO-14064-1):
 *   1. bare-ident-RHS `field OP field` under an ORDERING op: NONE. The ONLY ordering-op gate is
 *      CR-010 `GWP_gas > 0` — RHS is a NUMERIC literal (0), routed through the compare path
 *      (numeric), enforces correctly. All boolean gates use the KEYWORD RHS `true`
 *      (CR-018/019/025 + warn CR-021). No `!=` gate exists.
 *   2. `!= null` / `== null` block gate: NONE. Every existence gate uses `IS NOT NULL` → the
 *      `exists` path (negate=true) → reaches a definite `fail` when the value is absent. This
 *      standard uses `IS NOT NULL` uniformly (no `IS NOT EMPTY` and ZERO `!= ''` gates — all 25
 *      conditions inspected this session; for the engine, IS NOT NULL and IS NOT EMPTY are the
 *      identical exists-path with '' treated as absent, so text-presence gates behave correctly).
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. CR-002 members {kontrolle_finanziell,
 *      kontrolle_operativ,beteiligung} match the prod zusammenfuehrungsansatz enum EXACTLY;
 *      CR-006 members {direkte_emissionen,indirekt_importierte_energie,indirekt_transport,
 *      indirekt_genutzte_produkte,indirekt_produktnutzung,indirekt_andere_quellen} match the prod
 *      kategorie_auswahl enum EXACTLY (all lowercase, 6 values verified against prod enum_values).
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. This standard has NO
 *      IF/THEN guard and NO OR gate — every compound gate is a flat left-associative AND-chain,
 *      parses unambiguously.
 *
 * DEGENERATE / JUDGMENT SHAPES surfaced (reported, NOT "fixed" — changing them alters enforcement
 * = a stop):
 *   - SEVERITY REVIEW (modal, sign-off item): CR-015 (reduction initiatives §7.1),
 *     CR-016 (offsets/credits §7.2), CR-017 (reduction targets §7.3) are severity='block' in prod,
 *     yet §7 frames these as "sollte/should" items and their fields (reduzierungsinitiative,
 *     emissionsgutschrift, reduzierungsziel, zielart) are is_required=false. Blocking approval on
 *     optional "should" content is a modal-severity reading — it goes on the sign-off sheet, it is
 *     NOT touched here. Presence-enforcement is proven both ways regardless of the severity debate.
 *   - PRESENCE-ONLY shapes: most gates are `IS NOT NULL` — they require the field be ANSWERED, not
 *     substantively correct. Notably CR-004 (`E_co2e_gas IS NOT NULL`, title "getrennt je Gas
 *     quantifizieren" §5.2.2) and CR-022 (full report content §9.3.1 a–t reduced to 3 presence
 *     checks). Enforcement is real (proven both ways) but semantically weaker than the title.
 *   - CR-011 (biogen_co2, Anhang D) is presence-only on a VC/optional field.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing is applied
 * to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the 27 symbols the 23 block
 * gates read are seeded.
 */
export const ISO140641_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'ISO-14064-1-01': [
    { symbol: 'grundsaetze_eingehalten', dataType: 'boolean' },   // CR-025
    { symbol: 'berichtszeitraum', dataType: 'text' },             // CR-009 cross-ws (home -05 gate)
  ],
  'ISO-14064-1-02': [
    { symbol: 'organisationsgrenze_def', dataType: 'text' },      // CR-001
    { symbol: 'zusammenfuehrungsansatz', dataType: 'enum' },      // CR-002
  ],
  'ISO-14064-1-03': [
    { symbol: 'berichtsgrenze_def', dataType: 'text' },           // CR-003
    { symbol: 'wesentlichkeitskriterien', dataType: 'text' },     // CR-005
    { symbol: 'kategorie_auswahl', dataType: 'enum' },            // CR-006
  ],
  'ISO-14064-1-04': [
    { symbol: 'quelle_senke_id', dataType: 'text' },              // CR-007
    { symbol: 'quantifizierungsansatz', dataType: 'text' },       // CR-008
  ],
  'ISO-14064-1-05': [
    { symbol: 'E_co2e_gas', dataType: 'number' },                 // CR-004
    { symbol: 'E_co2e_total', dataType: 'number' },               // CR-009 + CR-022 cross-ws
    { symbol: 'GWP_gas', dataType: 'number' },                    // CR-010
    { symbol: 'biogen_co2', dataType: 'number' },                 // CR-011
    { symbol: 'strom_ansatz', dataType: 'enum' },                 // CR-012
    { symbol: 'E_el', dataType: 'number' },                       // CR-012
  ],
  'ISO-14064-1-06': [
    { symbol: 'basisjahr', dataType: 'text' },                    // CR-013
    { symbol: 'basisjahr_bilanz', dataType: 'number' },           // CR-013
    { symbol: 'neuberechnung_verfahren', dataType: 'text' },      // CR-014
  ],
  'ISO-14064-1-07': [
    { symbol: 'reduzierungsinitiative', dataType: 'text' },       // CR-015
    { symbol: 'emissionsgutschrift', dataType: 'number' },        // CR-016
    { symbol: 'reduzierungsziel', dataType: 'text' },             // CR-017
    { symbol: 'zielart', dataType: 'enum' },                      // CR-017
    { symbol: 'info_management_verfahren', dataType: 'boolean' }, // CR-018
    { symbol: 'dokumentenaufbewahrung', dataType: 'boolean' },    // CR-019
    { symbol: 'unsicherheitsbewertung', dataType: 'text' },       // CR-020
  ],
  'ISO-14064-1-08': [
    { symbol: 'konformitaetserklaerung', dataType: 'boolean' },   // CR-022
    { symbol: 'gwp_quelle', dataType: 'text' },                   // CR-022 / CR-023
  ],
};

/** Worksheets to instantiate (all 8 — one per GHG-inventory phase; each hosts >=1 block gate). */
export const ISO140641_WORKSHEETS = [
  'ISO-14064-1-01', 'ISO-14064-1-02', 'ISO-14064-1-03', 'ISO-14064-1-04',
  'ISO-14064-1-05', 'ISO-14064-1-06', 'ISO-14064-1-07', 'ISO-14064-1-08',
] as const;

/** All 23 live BLOCK gates (severity='block', non-empty condition), grouped by home worksheet.
 *  Conditions + severities VERBATIM from prod compliance_requirements (double spaces around `==`
 *  / `>` preserved). CR-021 + CR-024 are severity='warn' → NOT block gates → omitted. */
export const ISO140641_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // ISO-14064-1-01 — Registrierung, Anwendungsbereich & vorgesehene Nutzung (§1;§3;§4)
  { ws: 'ISO-14064-1-01', code: 'CR-025', cond: 'grundsaetze_eingehalten == true', sev: 'block' },
  // ISO-14064-1-02 — Organisationsgrenzen & Zusammenfuehrungsansatz (§5.1;Anhang A)
  { ws: 'ISO-14064-1-02', code: 'CR-001', cond: 'organisationsgrenze_def IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-1-02', code: 'CR-002', cond: 'zusammenfuehrungsansatz IN {kontrolle_finanziell, kontrolle_operativ, beteiligung}', sev: 'block' },
  // ISO-14064-1-03 — Berichtsgrenzen, Kategorien & Wesentlichkeit (§5.2)
  { ws: 'ISO-14064-1-03', code: 'CR-003', cond: 'berichtsgrenze_def IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-1-03', code: 'CR-005', cond: 'wesentlichkeitskriterien IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-1-03', code: 'CR-006', cond: 'kategorie_auswahl IN {direkte_emissionen, indirekt_importierte_energie, indirekt_transport, indirekt_genutzte_produkte, indirekt_produktnutzung, indirekt_andere_quellen}', sev: 'block' },
  // ISO-14064-1-04 — Identifizierung Quellen/Senken & Quantifizierungsansatz (§3;§6.1;§6.2)
  { ws: 'ISO-14064-1-04', code: 'CR-007', cond: 'quelle_senke_id IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-1-04', code: 'CR-008', cond: 'quantifizierungsansatz IS NOT NULL', sev: 'block' },
  // ISO-14064-1-05 — Quantifizierung der Emissionen & des Entzugs CO2Äq (§6.3;Anhang D;Anhang E)
  { ws: 'ISO-14064-1-05', code: 'CR-004', cond: 'E_co2e_gas IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-1-05', code: 'CR-009', cond: 'E_co2e_total IS NOT NULL AND berichtszeitraum IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-1-05', code: 'CR-010', cond: 'GWP_gas > 0', sev: 'block' },
  { ws: 'ISO-14064-1-05', code: 'CR-011', cond: 'biogen_co2 IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-1-05', code: 'CR-012', cond: 'strom_ansatz IS NOT NULL AND E_el IS NOT NULL', sev: 'block' },
  // ISO-14064-1-06 — Basisjahr & Neuberechnung (§6.4)
  { ws: 'ISO-14064-1-06', code: 'CR-013', cond: 'basisjahr IS NOT NULL AND basisjahr_bilanz IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-1-06', code: 'CR-014', cond: 'neuberechnung_verfahren IS NOT NULL', sev: 'block' },
  // ISO-14064-1-07 — Reduzierung, Qualitaetsmanagement & Unsicherheit (§7;§8)
  { ws: 'ISO-14064-1-07', code: 'CR-015', cond: 'reduzierungsinitiative IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-1-07', code: 'CR-016', cond: 'emissionsgutschrift IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-1-07', code: 'CR-017', cond: 'reduzierungsziel IS NOT NULL AND zielart IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-1-07', code: 'CR-018', cond: 'info_management_verfahren == true', sev: 'block' },
  { ws: 'ISO-14064-1-07', code: 'CR-019', cond: 'dokumentenaufbewahrung == true', sev: 'block' },
  { ws: 'ISO-14064-1-07', code: 'CR-020', cond: 'unsicherheitsbewertung IS NOT NULL', sev: 'block' },
  // ISO-14064-1-08 — THG-Bericht & Verifizierung (§9;§10)
  { ws: 'ISO-14064-1-08', code: 'CR-022', cond: 'konformitaetserklaerung IS NOT NULL AND gwp_quelle IS NOT NULL AND E_co2e_total IS NOT NULL', sev: 'block' },
  { ws: 'ISO-14064-1-08', code: 'CR-023', cond: 'gwp_quelle IS NOT NULL', sev: 'block' },
] as const;

export type ISO140641Fixture = {
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

export async function seedISO140641(sql: postgres.Sql, userId: string): Promise<ISO140641Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso14064-1-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO14064-1 Harness Org', ${'iso14064-1-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO14064-1-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-14064-1', 'ISO 14064-1 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of ISO140641_WORKSHEETS) {
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
    for (const f of ISO140641_FIELDS[ws]) {
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

  // Seed the 23 live BLOCK gates against their home worksheet templates.
  for (const g of ISO140641_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
