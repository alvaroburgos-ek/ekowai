/**
 * VDI 3477:2016-03 ("Biologische Abgasreinigung — Biofilter") — minimal fixture for the REAL
 * save-path gate-execution proof + a pure equation-eval proof.
 *
 * SOURCE PRESENT: VDI-3477-2016-03.pdf + .md + .xlsx are in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\VDI-3477\). This wave is a FULL document
 * comparison (bidirectional). VDI 3477 is a biofilter DESIGN + OPERATION guideline: it carries
 * 18 numbered/appendix equations AND 18 block gates. Conditions, severities, symbols + data types
 * are pulled VERBATIM from prod (standard 5a0f63cc-b0a2-4ba6-a615-a8f6d18133c1, project
 * vadsmshzebefjreqcicl, this session). Nothing is applied to prod.
 *
 * TOPOLOGY (verbatim from live prod, re-executed this session): 9 worksheet_templates
 * (VDI-3477-01 … -09) mapping the guideline's structure —
 *   01 Anmeldung, Anwendungsbereich und Eignungspruefung      (1 block gate)
 *   02 Rohgascharakterisierung und Schadstoffeignung          (2 block gates)
 *   03 Filtermaterial - Auswahl und Eigenschaften             (0 gates; Gl.9/Gl.10 live here)
 *   04 Auslegung und Dimensionierung des Biofilters           (2 block gates; Gl.6-13,A1,A2 here)
 *   05 Abgaskonditionierung und Befeuchtung                   (3 block gates; Gl.4 here)
 *   06 Konstruktion, Bau und Inbetriebnahme                   (2 block gates)
 *   07 Betrieb, Konditionierung und Instandhaltung            (4 block gates; +1 warn CR-04)
 *   08 Messung, Bewertung und Wirkungsgrad (inkl. Geruch)     (2 block gates; Gl.1,2,5,B1-B4 here)
 *   09 Beschaffenheitsvereinbarung und Nachweis               (2 block gates)
 * 18 severity='block' gates (CR-01…CR-19 minus CR-04) + 1 warn gate (CR-04, empty condition).
 *
 * SINGLE-HOME EXCEPT CR-13: every block gate reads fields on its OWN home worksheet EXCEPT
 * CR-13 (`V_dot IS NOT NULL AND dp IS NOT NULL`, home WS04): `V_dot` is a field on WS02, so CR-13
 * reads it via checkApprovalGate's conflict-free project-wide fallback (dp is local to WS04). This
 * is the one cross-worksheet operand read in VDI-3477 (verified against prod fields this session).
 *
 * THREE TRUE NO-OP BLOCK GATES (confirmed against live prod this session — these DO reproduce,
 * unlike the VDI-2163 R-5 reversal): CR-15 (WS08, "Olfaktometrie nach DIN EN 13725"), CR-16 (WS08,
 * "Emissionsmessung nach VDI 3951 / TA Luft"), CR-17 (WS04, "Befeuchter-/Waescherauslegung nach
 * VDI 3679"). All three have condition = literal `TRUE` — they always pass, never block (each is a
 * bare reference to ANOTHER standard encoded as a placeholder block gate). Converting TRUE→a real
 * predicate is an enforcement change ⇒ OWNER RULING, NOT fixed here. The harness drives them to
 * demonstrate the no-op (never blocks in any persisted state).
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod values — NONE of
 * the 4 known engine traps are present/misfiring):
 *   1. bare-ident-RHS `field OP field` under ORDERING op: exactly ONE field-vs-field ordering gate,
 *      CR-11 `c_rein <= c_roh` (both number, both on WS02). evaluate.ts L252-256 routes an ordering
 *      op with an aref RHS through the numeric acompare path → it ENFORCES (proven both ways below).
 *   2. `!= null` / `== null` / `!= ''` block gate: NONE. The existence gates CR-02/CR-13/CR-18/CR-12
 *      all use the CORRECT `IS NOT NULL` form (→ exists node, definite-fail when cleared). ZERO
 *      `!= ''` (all 18 conditions inspected this session); VDI-3477 was NOT in the corpus `!= ''`
 *      migration 20260801510000 scope and needs no such repair.
 *   3. `IN {Titlecase}` vs lowercase enum: NONE — VDI-3477 has NO `IN {…}` membership gate.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE — no IF/THEN guard exists.
 *      Only flat left-associative AND-chains (CR-02/07/09/03/08/13/19) and no OR gates.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing is applied
 * to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate-read symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the symbols the 18 block gates read are
 * seeded (V_dot is on WS02 and read cross-worksheet by CR-13@WS04). Non-gate fields and the
 * equation-only fields are omitted (the equation proof is a pure evaluateFormula check).
 */
export const VDI3477_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'VDI-3477-01': [
    { symbol: 'biofilter_grundsaetzlich_geeignet', dataType: 'boolean' },      // CR-01
  ],
  'VDI-3477-02': [
    { symbol: 'schadstoff_stoffgruppe', dataType: 'enum' },                    // CR-02 (IS NOT NULL)
    { symbol: 'eignungsklasse', dataType: 'enum' },                            // CR-02 (IS NOT NULL)
    { symbol: 'c_rein', dataType: 'number' },                                  // CR-11 (LHS)
    { symbol: 'c_roh', dataType: 'number' },                                   // CR-11 (RHS field-vs-field)
    { symbol: 'V_dot', dataType: 'number' },                                   // CR-13 (read CROSS-ws from WS04)
  ],
  'VDI-3477-03': [],                                                           // no block gate
  'VDI-3477-04': [
    { symbol: 'dp', dataType: 'number' },                                      // CR-13 (local operand)
  ],
  'VDI-3477-05': [
    { symbol: 'rel_feuchte_befeuchter_aus', dataType: 'number' },              // CR-05
    { symbol: 'tropfenabscheider_vorhanden', dataType: 'boolean' },            // CR-06
    { symbol: 'nh3_vor_biofilter', dataType: 'number' },                       // CR-19
    { symbol: 'h2s_vor_biofilter', dataType: 'number' },                       // CR-19
  ],
  'VDI-3477-06': [
    { symbol: 'freie_flaeche_anstroemboden', dataType: 'number' },             // CR-07
    { symbol: 'loch_schlitzgroesse', dataType: 'number' },                     // CR-07
    { symbol: 'anfahrkonzept_vorhanden', dataType: 'boolean' },                // CR-09
    { symbol: 'abnahme_dokumentiert', dataType: 'boolean' },                   // CR-09
  ],
  'VDI-3477-07': [
    { symbol: 'betriebstemperatur', dataType: 'number' },                      // CR-03
    { symbol: 'feuchtegehalt_filterschicht', dataType: 'number' },             // CR-08
    { symbol: 'instandhaltungsnachweis', dataType: 'boolean' },                // CR-10
    { symbol: 'pH_filtermaterial', dataType: 'number' },                       // CR-18 (IS NOT NULL)
  ],
  'VDI-3477-08': [],                                                           // CR-15/CR-16 are TRUE no-ops
  'VDI-3477-09': [
    { symbol: 'reingaskonzentration_gewaehrleistet', dataType: 'number' },     // CR-12 (IS NOT NULL)
    { symbol: 'nachweis_messung_vereinbart', dataType: 'boolean' },            // CR-14
  ],
};

/** Worksheets to instantiate (all 9). */
export const VDI3477_WORKSHEETS = [
  'VDI-3477-01', 'VDI-3477-02', 'VDI-3477-03', 'VDI-3477-04', 'VDI-3477-05',
  'VDI-3477-06', 'VDI-3477-07', 'VDI-3477-08', 'VDI-3477-09',
] as const;

/** All 18 live BLOCK gates (severity='block'), grouped by home worksheet. Conditions + severities
 *  VERBATIM from prod compliance_requirements (this session). The warn gate CR-04 (empty condition)
 *  is NOT a block gate and is excluded from the both-ways proof (it can never block). */
export const VDI3477_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // WS01 — Anmeldung / Eignungspruefung
  { ws: 'VDI-3477-01', code: 'VDI-3477-CR-01', cond: 'biofilter_grundsaetzlich_geeignet == true', sev: 'block' },
  // WS02 — Rohgas / Schadstoffeignung
  { ws: 'VDI-3477-02', code: 'VDI-3477-CR-02', cond: 'schadstoff_stoffgruppe IS NOT NULL AND eignungsklasse IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3477-02', code: 'VDI-3477-CR-11', cond: 'c_rein <= c_roh', sev: 'block' }, // field-vs-field acompare
  // WS04 — Auslegung / Dimensionierung
  { ws: 'VDI-3477-04', code: 'VDI-3477-CR-13', cond: 'V_dot IS NOT NULL AND dp IS NOT NULL', sev: 'block' }, // V_dot cross-ws (WS02)
  { ws: 'VDI-3477-04', code: 'VDI-3477-CR-17', cond: 'TRUE', sev: 'block' }, // TRUE no-op (ref VDI 3679)
  // WS05 — Abgaskonditionierung / Befeuchtung
  { ws: 'VDI-3477-05', code: 'VDI-3477-CR-05', cond: 'rel_feuchte_befeuchter_aus > 95', sev: 'block' },
  { ws: 'VDI-3477-05', code: 'VDI-3477-CR-06', cond: 'tropfenabscheider_vorhanden == true', sev: 'block' },
  { ws: 'VDI-3477-05', code: 'VDI-3477-CR-19', cond: 'nh3_vor_biofilter < 5 AND h2s_vor_biofilter < 5', sev: 'block' },
  // WS06 — Konstruktion / Bau / Inbetriebnahme
  { ws: 'VDI-3477-06', code: 'VDI-3477-CR-07', cond: 'freie_flaeche_anstroemboden > 20 AND loch_schlitzgroesse >= 5 AND loch_schlitzgroesse <= 20', sev: 'block' },
  { ws: 'VDI-3477-06', code: 'VDI-3477-CR-09', cond: 'anfahrkonzept_vorhanden == true AND abnahme_dokumentiert == true', sev: 'block' },
  // WS07 — Betrieb / Instandhaltung
  { ws: 'VDI-3477-07', code: 'VDI-3477-CR-03', cond: 'betriebstemperatur >= 20 AND betriebstemperatur <= 40', sev: 'block' },
  { ws: 'VDI-3477-07', code: 'VDI-3477-CR-08', cond: 'feuchtegehalt_filterschicht >= 40 AND feuchtegehalt_filterschicht <= 60', sev: 'block' },
  { ws: 'VDI-3477-07', code: 'VDI-3477-CR-10', cond: 'instandhaltungsnachweis == true', sev: 'block' },
  { ws: 'VDI-3477-07', code: 'VDI-3477-CR-18', cond: 'pH_filtermaterial IS NOT NULL', sev: 'block' },
  // WS08 — Messung / Bewertung / Wirkungsgrad
  { ws: 'VDI-3477-08', code: 'VDI-3477-CR-15', cond: 'TRUE', sev: 'block' }, // TRUE no-op (ref DIN EN 13725)
  { ws: 'VDI-3477-08', code: 'VDI-3477-CR-16', cond: 'TRUE', sev: 'block' }, // TRUE no-op (ref VDI 3951 / TA Luft)
  // WS09 — Beschaffenheitsvereinbarung / Nachweis
  { ws: 'VDI-3477-09', code: 'VDI-3477-CR-12', cond: 'reingaskonzentration_gewaehrleistet IS NOT NULL', sev: 'block' },
  { ws: 'VDI-3477-09', code: 'VDI-3477-CR-14', cond: 'nachweis_messung_vereinbart == true', sev: 'block' },
] as const;

export type VDI3477Fixture = {
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

export async function seedVDI3477(sql: postgres.Sql, userId: string): Promise<VDI3477Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'vdi3477-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('VDI3477 Harness Org', ${'vdi3477-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'VDI3477-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('VDI-3477', 'VDI 3477 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of VDI3477_WORKSHEETS) {
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
    for (const f of VDI3477_FIELDS[ws]) {
      // active=true; is_required deliberately FALSE so the per-gate proof isolates the
      // block-CONDITION path (checkApprovalGate's separate missing-required-field list is not
      // what we are proving here). gateBlocks() reads only failingBlockConditions.
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
      symbolHome[f.symbol] = ws;
    }
  }

  // Seed the 18 live BLOCK gates against their home worksheet templates.
  for (const g of VDI3477_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
