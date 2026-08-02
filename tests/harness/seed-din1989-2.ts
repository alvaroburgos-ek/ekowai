/**
 * DIN 1989-2 ("Regenwassernutzungsanlagen — Teil 2: Filter"; DIN 1989-2, 2004) —
 * minimal fixture for the REAL save-path gate-execution-proof harness.
 *
 * SOURCE STATUS (corrected 2026-08-02): the DIN 1989-2 source PDF IS in the library —
 * C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-1989-2\DIN-1989-2.pdf
 * (1.26 MB) plus an extracted DIN-1989-2.md. (The dispatch premise stated it was
 * absent; a live disk search this session found it — reversal reported per R-5.)
 * This harness is nonetheless ENFORCEMENT-ONLY BY DESIGN: it proves each live BLOCK
 * gate enforces BOTH ways through the real save path. It does NOT verify any threshold
 * against the source — threshold verification against the printed page is a SEPARATE,
 * unstarted task and no numeric value here is asserted "correct". The conditions are
 * pulled verbatim from prod compliance_requirements (standard DIN-1989-2 =
 * 150aa8bf-1ad2-4599-a413-8bf9031b898f, prod ref vadsmshzebefjreqcicl, this session).
 *
 * PROOF MANDATE: DIN 1989-2's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 17 live BLOCK gates (every compliance_requirement
 * with severity='block' + a non-empty condition) through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition against
 * the saved values). 16 of the 17 are demonstrated BOTH ways — a state that PASSES
 * it and a state that VIOLATES it, reaching a definite `fail`. The 17th (CR-16) is a
 * TRUE no-op gate whose condition is the bare literal `TRUE`: it ALWAYS evaluates
 * `pass` and can NEVER reach `fail`, so it is structurally unenforceable — driven in
 * its ONE reachable direction (never-blocks) and LOGGED as a no-op, per the F-4 lesson.
 *
 * TOPOLOGY (verbatim from prod): 4 worksheet_templates (DIN-1989-2-01 … -04), 42
 * active fields, 9 equations, 17 compliance_requirements — ALL 17 are
 * severity='block' with a non-empty condition. The fixture seeds all 4 worksheets;
 * each gate operand is a field on that gate's OWN home worksheet — DIN 1989-2 has NO
 * cross-worksheet gate, so no project-wide fallback is exercised (unlike A-226). Only
 * the gate-operand fields are seeded (single-home topology, symbols+data_type verbatim).
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod
 * conditions — NONE of the 4 known engine traps are present in DIN 1989-2):
 *   1. bare-ident-RHS `field == field` / `field != field`: NONE. Every `==` RHS is
 *      the boolean keyword literal `true` (tokenised to the TRUE keyword → abool, not
 *      a bare identifier); every ordering RHS is a numeric literal or a parenthesis-free
 *      arithmetic term over a literal (`Q * 25`, `Q * 2`). No field-vs-field compare.
 *   2. `!= null` / `== null` block gate: NONE. Every existence gate uses the
 *      `IS NOT NULL` form (the `exists` path → reaches a definite fail).
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. DIN 1989-2 has no membership gate.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. DIN 1989-2
 *      has no IF/THEN block gate at all.
 *   PLUS — TRUE no-op: CR-16 condition = `TRUE` → parses to a bare boolean literal →
 *   always `pass`. Not a grammar trap, but a structurally-unenforceable gate; logged.
 *
 * BOOLEAN-CASE NOTE: DIN 1989-2 writes `== true` (lowercase), where A-226 wrote
 * `== True`. Both are identical after tokenisation — KEYWORDS lowercases every word,
 * so `true`/`True`/`TRUE` all map to the TRUE keyword. No case trap on the boolean side.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 * Nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate operand on its OWN home worksheet
 * (symbol + data_type verbatim from prod fields). Every DIN 1989-2 gate is
 * worksheet-local; there is no cross-worksheet operand.
 */
export const DIN19892_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'DIN-1989-2-01': [
    { symbol: 'filtertyp', dataType: 'enum' },
    { symbol: 'DN', dataType: 'number' },
  ],
  'DIN-1989-2-02': [
    { symbol: 'werkstoff_eignung_nachgewiesen', dataType: 'boolean' },
    { symbol: 'V_Rueck_A', dataType: 'number' },
    { symbol: 'Q', dataType: 'number' },
    { symbol: 'V_Rueck_B', dataType: 'number' },
    { symbol: 'behaeltnis_masse', dataType: 'number' },
    { symbol: 'tiefe_gok_griff', dataType: 'number' },
    { symbol: 'querschnitt_nicht_eingeengt', dataType: 'boolean' },
    { symbol: 'dichtheit_eingehalten', dataType: 'boolean' },
    { symbol: 'standsicherheit_eingehalten', dataType: 'boolean' },
    { symbol: 'eta_hydr_unbel_doku', dataType: 'number' },
  ],
  'DIN-1989-2-03': [
    { symbol: 'filtertrennwirkung_nachgewiesen', dataType: 'boolean' },
  ],
  'DIN-1989-2-04': [
    { symbol: 'erstpruefung_bestanden', dataType: 'boolean' },
    { symbol: 'wpk_eingerichtet', dataType: 'boolean' },
    { symbol: 'kennzeichnung_vollstaendig', dataType: 'boolean' },
    { symbol: 'anleitung_vorhanden', dataType: 'boolean' },
  ],
};

/** Worksheets to instantiate (all 4 — gate homes + field homes). */
export const DIN19892_WORKSHEETS = [
  'DIN-1989-2-01', 'DIN-1989-2-02', 'DIN-1989-2-03', 'DIN-1989-2-04',
] as const;

/** All 17 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const DIN19892_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // DIN-1989-2-01 — Registrierung, Anwendungsbereich und Begriffe
  { ws: 'DIN-1989-2-01', code: 'DIN-1989-2-CR-01', cond: 'filtertyp IS NOT NULL', sev: 'block' },
  { ws: 'DIN-1989-2-01', code: 'DIN-1989-2-CR-16', cond: 'TRUE', sev: 'block' }, // TRUE no-op — never blocks
  { ws: 'DIN-1989-2-01', code: 'DIN-1989-2-CR-17', cond: 'DN IS NOT NULL', sev: 'block' },
  // DIN-1989-2-02 — Anforderungen an Filter (Werkstoffe, Typen, Hydraulik, Trennwirkung)
  { ws: 'DIN-1989-2-02', code: 'DIN-1989-2-CR-02', cond: 'werkstoff_eignung_nachgewiesen == true', sev: 'block' },
  { ws: 'DIN-1989-2-02', code: 'DIN-1989-2-CR-03', cond: 'V_Rueck_A >= Q * 25', sev: 'block' },
  { ws: 'DIN-1989-2-02', code: 'DIN-1989-2-CR-04', cond: 'V_Rueck_B >= Q * 2', sev: 'block' },
  { ws: 'DIN-1989-2-02', code: 'DIN-1989-2-CR-05', cond: 'behaeltnis_masse <= 20', sev: 'block' },
  { ws: 'DIN-1989-2-02', code: 'DIN-1989-2-CR-06', cond: 'tiefe_gok_griff <= 60', sev: 'block' },
  { ws: 'DIN-1989-2-02', code: 'DIN-1989-2-CR-07', cond: 'querschnitt_nicht_eingeengt == true', sev: 'block' },
  { ws: 'DIN-1989-2-02', code: 'DIN-1989-2-CR-09', cond: 'dichtheit_eingehalten == true', sev: 'block' },
  { ws: 'DIN-1989-2-02', code: 'DIN-1989-2-CR-10', cond: 'standsicherheit_eingehalten == true', sev: 'block' },
  { ws: 'DIN-1989-2-02', code: 'DIN-1989-2-CR-11', cond: 'eta_hydr_unbel_doku IS NOT NULL', sev: 'block' },
  // DIN-1989-2-03 — Pruefungen (hydraulischer Wirkungsgrad und Filtertrennwirkung)
  { ws: 'DIN-1989-2-03', code: 'DIN-1989-2-CR-08', cond: 'filtertrennwirkung_nachgewiesen == true', sev: 'block' },
  // DIN-1989-2-04 — Kennzeichnung, Konformitaetsbewertung und Einbau/Betrieb/Wartung
  { ws: 'DIN-1989-2-04', code: 'DIN-1989-2-CR-12', cond: 'erstpruefung_bestanden == true', sev: 'block' },
  { ws: 'DIN-1989-2-04', code: 'DIN-1989-2-CR-13', cond: 'wpk_eingerichtet == true', sev: 'block' },
  { ws: 'DIN-1989-2-04', code: 'DIN-1989-2-CR-14', cond: 'kennzeichnung_vollstaendig == true', sev: 'block' },
  { ws: 'DIN-1989-2-04', code: 'DIN-1989-2-CR-15', cond: 'anleitung_vorhanden == true', sev: 'block' },
] as const;

export type DIN19892Fixture = {
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

export async function seedDin19892(sql: postgres.Sql, userId: string): Promise<DIN19892Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'din1989-2-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('DIN1989-2 Harness Org', ${'din19892-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'DIN-1989-2-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DIN-1989-2', 'DIN 1989-2 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of DIN19892_WORKSHEETS) {
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
    for (const f of DIN19892_FIELDS[ws]) {
      // active=true; is_required deliberately FALSE so the per-gate proof isolates
      // the block-CONDITION path (checkApprovalGate's separate missing-required-field
      // list is not what we are proving here).
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
      symbolHome[f.symbol] = ws;
    }
  }

  // Seed the 17 live BLOCK gates against their home worksheet templates.
  for (const g of DIN19892_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
