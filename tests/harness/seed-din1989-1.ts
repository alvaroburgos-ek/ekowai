/**
 * DIN 1989-1 ("Regenwassernutzungsanlagen — Teil 1: Planung, Ausführung, Betrieb
 * und Wartung"; DIN 1989-1:2002-04) — minimal fixture for the REAL save-path
 * gate-execution-proof harness.
 *
 * SOURCE PRESENT: C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-1989-1\
 * DIN-1989-1.pdf (image-only scan; pdftotext yields ~0 chars) + DIN-1989-1.md (its
 * OCR). Equations §16.3.6–§16.3.8 were verified in-session by rendering the scanned
 * PDF pages 27–29 to PNG and reading them visually (SR-3 ground truth): Gl.(1)
 * E_R=A_A×e×h_N×η [p27], Gl.(2) BW_a=P_d×n×365 [p28], Gl.(3) BW_a=A_Bew×BS_a [p28],
 * Gl.(4) V_n=Minimum von (BW_a oder E_R)×0,06 [p29]. All four FAITHFUL.
 *
 * PROOF MANDATE: DIN-1989-1's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 14 live BLOCK gates (every compliance_requirement
 * with severity='block' + a non-empty condition — DIN-1989-1 has NO warn/manual
 * gates) through the REAL `saveWorksheet` (values persist to project_parameters) and
 * the REAL `checkApprovalGate` (the engineer-approve enforcement read path that
 * replays each block condition against the saved values). Each gate is demonstrated
 * BOTH ways — a state that PASSES it and a state that VIOLATES it, reaching a
 * definite `fail` — so a gate that fires but never enforces (the F-4 lesson) cannot
 * hide.
 *
 * TOPOLOGY (verbatim from prod standard fb9738cf-685d-4174-951b-47b33c099d8e):
 * 6 worksheet_templates (DIN-1989-1-01 … -06), 60 active fields, 4 equations
 * (all on -04), 14 compliance_requirements — ALL 14 severity='block'. Every gate's
 * operands are fields on the gate's OWN home worksheet (no cross-worksheet fallback
 * is required for this standard); the fixture seeds each home worksheet with exactly
 * the fields its gates read (symbol + data_type verbatim from prod fields).
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod
 * enum values):
 *   1. bare-ident-RHS `field == field` / `field != field`: NONE that is a mistaken
 *      field-vs-field. CR-06's `nachspeisung_medium != trinkwasser` has a bare-ident
 *      RHS, but under the equality operator the engine (evaluate.ts L256-257) keeps
 *      the legacy string-literal semantics → it is an ENUM-VALUE compare against the
 *      literal 'trinkwasser', which is the EXACT prod enum value (lowercase). Intended,
 *      resolves correctly — NOT the never-enforce field-vs-field trap.
 *   2. `!= null` / `== null` block gate: NONE. CR-10 uses the `IS NOT NULL` form.
 *   3. `IN {Titlecase}` vs lowercase enum: NONE that mismatches. CR-06 `IN {AA,AB}`
 *      matches the prod enum values 'AA'/'AB' (uppercase both sides); CR-12
 *      `IN {rueckstaufrei,…,nicht_erforderlich}` matches the prod enum values
 *      (lowercase both sides). No case trap — the membership compares resolve.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. DIN-1989-1
 *      has no IF/THEN gate at all; logic is expressed as `==True`, `IS NOT NULL`,
 *      ordering compares, top-level OR, and membership — all parse unambiguously.
 *
 * ENUM-DOMAIN NO-OP FINDING (surfaced by this proof, demonstrated by execution):
 * CR-06 and CR-12 CANNOT reach a definite `fail` for ANY in-domain enum selection —
 *   - CR-12 `rueckstauschutz_art IN {rueckstaufrei,hebeanlage,rueckstauverschluss,
 *     nicht_erforderlich}` lists the ENTIRE prod enum domain, so every valid choice
 *     passes and a blank is `pending`; it can only `fail` on an out-of-domain value
 *     the UI cannot produce.
 *   - CR-06's second disjunct `sicherungseinrichtung_typ IN {AA,AB}` also lists the
 *     entire enum domain {AA,AB}, so with medium='trinkwasser' the only non-pass
 *     in-domain state (typ blank) is `pending`, never `fail`.
 * The intent of both is still enforced by the approval gate because both operand
 * fields are is_required=true (a blank is caught by the missing-required list). The
 * block CONDITIONS themselves are redundant-with-required / cannot-fire-in-domain.
 * The harness drives the fail branch with an out-of-domain value ONLY to prove the
 * condition mechanism reaches a definite fail (the gate is not structurally dead);
 * the in-domain redundancy is asserted separately. See the verify test.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 * Nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/** Fields to seed per worksheet — each gate operand on its OWN home worksheet
 *  (symbol + data_type verbatim from prod fields). */
export const DIN1989_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'DIN-1989-1-01': [
    { symbol: 'meldepflicht_erfuellt', dataType: 'boolean' },
    { symbol: 'trinkwasser_getrennt', dataType: 'boolean' },
  ],
  'DIN-1989-1-02': [
    { symbol: 'filter_genormt', dataType: 'boolean' },
    { symbol: 'speicheroeffnung_dn', dataType: 'number' },
  ],
  'DIN-1989-1-03': [
    { symbol: 'nachspeisung_vorhanden', dataType: 'boolean' },
    { symbol: 'nachspeisung_medium', dataType: 'enum' },
    { symbol: 'sicherungseinrichtung_typ', dataType: 'enum' },
    { symbol: 'trockenlaufschutz', dataType: 'boolean' },
    { symbol: 'fuellstandueberwachung', dataType: 'boolean' },
    { symbol: 'leitungskennzeichnung', dataType: 'boolean' },
  ],
  'DIN-1989-1-04': [
    { symbol: 'V_n', dataType: 'number' },
    { symbol: 'E_R', dataType: 'number' },
    { symbol: 'BW_a', dataType: 'number' },
  ],
  'DIN-1989-1-05': [
    { symbol: 'ueberlauf_versickerung', dataType: 'boolean' },
    { symbol: 'versickerung_bemessung_a138', dataType: 'boolean' },
    { symbol: 'rueckstauschutz_art', dataType: 'enum' },
    { symbol: 'inbetriebnahme_fachkundig', dataType: 'boolean' },
    { symbol: 'inbetriebnahmeprotokoll', dataType: 'boolean' },
  ],
  'DIN-1989-1-06': [
    { symbol: 'wartung_fachkundig', dataType: 'boolean' },
  ],
};

/** Worksheets to instantiate (all 6). */
export const DIN1989_WORKSHEETS = [
  'DIN-1989-1-01', 'DIN-1989-1-02', 'DIN-1989-1-03',
  'DIN-1989-1-04', 'DIN-1989-1-05', 'DIN-1989-1-06',
] as const;

/** All 14 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const DIN1989_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // DIN-1989-1-01 — Registrierung, Anwendungsbereich und Grundlagen (§4.1 / §12.7)
  { ws: 'DIN-1989-1-01', code: 'DIN-1989-1-CR-01', cond: 'meldepflicht_erfuellt == true', sev: 'block' },
  { ws: 'DIN-1989-1-01', code: 'DIN-1989-1-CR-02', cond: 'trinkwasser_getrennt == true', sev: 'block' },
  // DIN-1989-1-02 — Auffangflächen, Aufbereitung und Regenwasserspeicher (§6.2 / §7)
  { ws: 'DIN-1989-1-02', code: 'DIN-1989-1-CR-03', cond: 'filter_genormt == true', sev: 'block' },
  { ws: 'DIN-1989-1-02', code: 'DIN-1989-1-CR-04', cond: 'speicheroeffnung_dn >= 200', sev: 'block' },
  // DIN-1989-1-03 — Pumpen, Nachspeisung, Systemsteuerung und Rohrsysteme (§8–§12)
  { ws: 'DIN-1989-1-03', code: 'DIN-1989-1-CR-05', cond: 'nachspeisung_vorhanden == true', sev: 'block' },
  { ws: 'DIN-1989-1-03', code: 'DIN-1989-1-CR-06', cond: 'nachspeisung_medium != trinkwasser OR sicherungseinrichtung_typ IN {AA,AB}', sev: 'block' },
  { ws: 'DIN-1989-1-03', code: 'DIN-1989-1-CR-07', cond: 'trockenlaufschutz == true', sev: 'block' },
  { ws: 'DIN-1989-1-03', code: 'DIN-1989-1-CR-08', cond: 'fuellstandueberwachung == true', sev: 'block' },
  { ws: 'DIN-1989-1-03', code: 'DIN-1989-1-CR-09', cond: 'leitungskennzeichnung == true', sev: 'block' },
  // DIN-1989-1-04 — Auslegung der Speichergröße (§16.3.8)
  { ws: 'DIN-1989-1-04', code: 'DIN-1989-1-CR-10', cond: 'V_n IS NOT NULL AND E_R IS NOT NULL AND BW_a IS NOT NULL', sev: 'block' },
  // DIN-1989-1-05 — Versickerung, Rückstauschutz und Inbetriebnahme (§13 / §14 / §17.2)
  { ws: 'DIN-1989-1-05', code: 'DIN-1989-1-CR-11', cond: 'ueberlauf_versickerung != true OR versickerung_bemessung_a138 == true', sev: 'block' },
  { ws: 'DIN-1989-1-05', code: 'DIN-1989-1-CR-12', cond: 'rueckstauschutz_art IN {rueckstaufrei,hebeanlage,rueckstauverschluss,nicht_erforderlich}', sev: 'block' },
  { ws: 'DIN-1989-1-05', code: 'DIN-1989-1-CR-13', cond: 'inbetriebnahme_fachkundig == true AND inbetriebnahmeprotokoll == true', sev: 'block' },
  // DIN-1989-1-06 — Betrieb, Inspektion und Wartung (§18)
  { ws: 'DIN-1989-1-06', code: 'DIN-1989-1-CR-14', cond: 'wartung_fachkundig == true', sev: 'block' },
] as const;

export type Din1989Fixture = {
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

export async function seedDin1989(sql: postgres.Sql, userId: string): Promise<Din1989Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'din1989-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('DIN-1989-1 Harness Org', ${'din1989-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'DIN-1989-1-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DIN-1989-1', 'DIN 1989-1 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of DIN1989_WORKSHEETS) {
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
    for (const f of DIN1989_FIELDS[ws]) {
      // active=true; is_required deliberately FALSE so the per-gate proof isolates
      // the block-CONDITION path (the separate missing-required list is not what is
      // being proven here — it is asserted independently for CR-06/CR-12).
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
      symbolHome[f.symbol] = ws;
    }
  }

  // Seed the 14 live BLOCK gates against their home worksheet templates.
  for (const g of DIN1989_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
