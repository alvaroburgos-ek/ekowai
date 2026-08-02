/**
 * DWA-M 349 ("Biologische Stickstoffelimination von Schlammwässern der anaeroben
 * Schlammstabilisierung", Merkblatt DWA-M 349, Mai 2019, 1. Auflage) — minimal
 * fixture for the REAL save-path gate-execution-proof harness.
 *
 * SOURCE STATUS: the DWA-M-349 source PDF is NOT in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\ has no DWA-M-349 folder — confirmed this
 * session). This is therefore an ENFORCEMENT proof only — it proves each live BLOCK
 * gate enforces through the real save path. It does NOT and cannot verify any
 * threshold against a source, because there is none. The conditions are pulled
 * verbatim from prod compliance_requirements (standard DWA-M-349 =
 * 5ae4beb8-ede4-4c1f-9bd4-0a7b50c20df2, project vadsmshzebefjreqcicl, this session);
 * no threshold is asserted to be "correct".
 *
 * PROOF MANDATE: M-349's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 27 live BLOCK gates (every compliance_requirement —
 * all 27 are severity='block' with a non-empty condition) through the REAL
 * `saveWorksheet` (values persist to project_parameters) and the REAL
 * `checkApprovalGate` (the engineer-approve enforcement read path that replays each
 * block condition against the saved values).
 *
 *   - The 16 gates with a DRIVABLE condition (a free symbol whose value changes the
 *     verdict) are demonstrated BOTH ways — a state that PASSES and a state that
 *     VIOLATES it, reaching a definite `fail` — so a gate that fires but never
 *     enforces (the F-4 lesson) cannot hide.
 *   - The 11 gates whose condition is the literal `TRUE` are NO-OP block gates: the
 *     evaluator parses `TRUE` to `{lit true}` → always `pass`, never `fail`, so they
 *     can NEVER enter failingBlockConditions in ANY persisted state. There is no
 *     violating state to construct. The harness proves this negative: each is absent
 *     from the failing list both in the empty seed state and after the whole
 *     drivable-gate battery has populated the project. They are LOGGED, not fixed
 *     (source-absent + owner-gated: a prior SEV-1 drafted a fix that is
 *     WRITTEN-NOT-APPLIED; this harness only confirms the live behaviour).
 *
 * TOPOLOGY (verbatim from prod): 8 worksheet_templates (M349-01 … M349-08), 92
 * active fields, 10 equations, 27 compliance_requirements (ALL severity='block',
 * ALL non-empty condition). The fixture seeds all 8 worksheets and only the 19 fields
 * the 16 drivable gates read; each gate symbol is homed on exactly ONE worksheet
 * (single-home topology — verified against prod: each of the 19 gate symbols returns
 * exactly one worksheet), so the project-wide fallback in checkApprovalGate resolves
 * every cross-worksheet operand without conflict.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing): M349-05 hosts CR-006 and CR-007, which
 * both read `schlammsystem` — a field whose home is M349-01. Neither gate's worksheet
 * owns that field, so the operand resolves via the conflict-free project-wide
 * fallback. (`N_raumbelastung`, the other operand of both, is local to M349-05.)
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod
 * enum values — NONE of the 4 known engine traps are present in M-349):
 *   1. bare-ident-RHS `field == field` / `field != field`: NONE. Every `==` RHS is a
 *      numeric literal (CR-005 `== 1.3`), a QUOTED enum string (CR-006/007
 *      `== 'suspendiert'`), or a boolean literal (CR-017/019 `== true`/`== false`).
 *      No `!=` gate exists at all.
 *   2. `!= null` / `== null` block gate: NONE. Both existence gates use the
 *      `IS NOT NULL` form (CR-002 B_d_x_Rueck, CR-009 c_quelle_typ) → the `exists`
 *      path → reaches a definite fail.
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. CR-006's `schlammsystem IN
 *      {biofilm,granula}` matches the prod enum values EXACTLY (lowercase
 *      'biofilm'/'granula'; the enum also carries 'suspendiert'/'hybrid'). The `==`
 *      compares against 'suspendiert' — an exact lowercase enum value — so no case
 *      trap. c_quelle_typ's enum values ('methanol' …) are only existence-checked.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. M-349 has NO
 *      IF/THEN block gate; conditional logic is expressed as OR / parenthesised
 *      AND-of-ORs (CR-006/007/019), which parse unambiguously.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 * Nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the 19 symbols the 16
 * drivable gates read are seeded; the 11 TRUE gates have no operands. M349-08 owns
 * no seeded field (its only gate, CR-022, is the literal TRUE).
 */
export const M349_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'M349-01': [
    { symbol: 'schlammsystem', dataType: 'enum' }, // home of CR-006/007's guard (read cross-ws from M349-05)
  ],
  'M349-02': [
    { symbol: 'S_NH4_N', dataType: 'number' },
    { symbol: 'pH_wert', dataType: 'number' },
    { symbol: 'B_d_x_Rueck', dataType: 'number' },
  ],
  'M349-03': [
    { symbol: 'T', dataType: 'number' },
    { symbol: 'c_NO2_reaktor', dataType: 'number' },
    { symbol: 'c_O2_reaktor', dataType: 'number' },
  ],
  'M349-04': [
    { symbol: 'HRT_denitritation', dataType: 'number' },
    { symbol: 'c_quelle_typ', dataType: 'enum' },
    { symbol: 'c_O2_nitritation_soll', dataType: 'number' },
  ],
  'M349-05': [
    { symbol: 'verhaeltnis_no2_nh4', dataType: 'number' },
    { symbol: 'N_raumbelastung', dataType: 'number' },
    { symbol: 'nh4_betriebsbereich', dataType: 'number' },
  ],
  'M349-06': [
    { symbol: 'speicher_erforderlich', dataType: 'boolean' },
    { symbol: 'ex_schutz_speicher', dataType: 'boolean' },
  ],
  'M349-07': [
    { symbol: 'nitrat_anteil_zulauffracht', dataType: 'number' },
    { symbol: 'leistungssteigerung_rate', dataType: 'number' },
    { symbol: 'messung_temperatur', dataType: 'boolean' },
    { symbol: 'messung_pH', dataType: 'boolean' },
  ],
  'M349-08': [
    // intentionally empty — CR-022 is the literal TRUE (no operands)
  ],
};

/** Worksheets to instantiate (all 8 — gate homes + field homes). */
export const M349_WORKSHEETS = [
  'M349-01', 'M349-02', 'M349-03', 'M349-04',
  'M349-05', 'M349-06', 'M349-07', 'M349-08',
] as const;

/** All 27 live BLOCK gates (all non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. `noop:true`
 *  marks the literal-TRUE gates that can never fail. */
export const M349_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev; noop?: true }> = [
  // M349-02 — Schlammwasser-Charakterisierung und Frachtermittlung
  { ws: 'M349-02', code: 'CR-001', cond: 'S_NH4_N >= 600 AND S_NH4_N <= 1300 AND pH_wert >= 7 AND pH_wert <= 8', sev: 'block' },
  { ws: 'M349-02', code: 'CR-002', cond: 'B_d_x_Rueck IS NOT NULL', sev: 'block' },
  { ws: 'M349-02', code: 'CR-003', cond: 'TRUE', sev: 'block', noop: true },
  { ws: 'M349-02', code: 'CR-026', cond: 'TRUE', sev: 'block', noop: true },
  // M349-03 — Prozessgrundlagen: Kinetik, Hemmungen, Schlammsysteme
  { ws: 'M349-03', code: 'CR-004', cond: 'T > 23', sev: 'block' },
  { ws: 'M349-03', code: 'CR-012', cond: 'c_NO2_reaktor < 5', sev: 'block' },
  { ws: 'M349-03', code: 'CR-013', cond: 'c_O2_reaktor <= 1', sev: 'block' },
  // M349-04 — Auslegung Nitritation, Denitritation und N/DN
  { ws: 'M349-04', code: 'CR-008', cond: 'HRT_denitritation >= 0.3', sev: 'block' },
  { ws: 'M349-04', code: 'CR-009', cond: 'c_quelle_typ IS NOT NULL', sev: 'block' },
  { ws: 'M349-04', code: 'CR-010', cond: 'c_O2_nitritation_soll >= 1 AND c_O2_nitritation_soll <= 1.5', sev: 'block' },
  { ws: 'M349-04', code: 'CR-021', cond: 'TRUE', sev: 'block', noop: true },
  { ws: 'M349-04', code: 'CR-023', cond: 'TRUE', sev: 'block', noop: true },
  // M349-05 — Auslegung Deammonifikation (ein-/zweistufig)
  { ws: 'M349-05', code: 'CR-005', cond: 'verhaeltnis_no2_nh4 == 1.3', sev: 'block' },
  { ws: 'M349-05', code: 'CR-006', cond: "(schlammsystem == 'suspendiert' AND N_raumbelastung >= 0.2 AND N_raumbelastung <= 0.5) OR (schlammsystem IN {biofilm,granula} AND N_raumbelastung >= 0.5 AND N_raumbelastung <= 2.0)", sev: 'block' },
  { ws: 'M349-05', code: 'CR-007', cond: "schlammsystem == 'suspendiert' AND N_raumbelastung < 0.5", sev: 'block' },
  { ws: 'M349-05', code: 'CR-014', cond: 'nh4_betriebsbereich >= 10 AND nh4_betriebsbereich <= 200', sev: 'block' },
  // M349-06 — Belüftung, Dosierung und Anlagentechnik
  { ws: 'M349-06', code: 'CR-019', cond: 'speicher_erforderlich == false OR ex_schutz_speicher == true', sev: 'block' },
  { ws: 'M349-06', code: 'CR-020', cond: 'TRUE', sev: 'block', noop: true },
  { ws: 'M349-06', code: 'CR-024', cond: 'TRUE', sev: 'block', noop: true },
  { ws: 'M349-06', code: 'CR-027', cond: 'TRUE', sev: 'block', noop: true },
  // M349-07 — Betrieb: Analytik, Inbetriebnahme, Betriebsstörungen
  { ws: 'M349-07', code: 'CR-011', cond: 'nitrat_anteil_zulauffracht < 15', sev: 'block' },
  { ws: 'M349-07', code: 'CR-015', cond: 'leistungssteigerung_rate <= 3.5', sev: 'block' },
  { ws: 'M349-07', code: 'CR-016', cond: 'TRUE', sev: 'block', noop: true },
  { ws: 'M349-07', code: 'CR-017', cond: 'messung_temperatur == true AND messung_pH == true', sev: 'block' },
  { ws: 'M349-07', code: 'CR-018', cond: 'TRUE', sev: 'block', noop: true },
  { ws: 'M349-07', code: 'CR-025', cond: 'TRUE', sev: 'block', noop: true },
  // M349-08 — Nachweis und Zusammenstellung
  { ws: 'M349-08', code: 'CR-022', cond: 'TRUE', sev: 'block', noop: true },
] as const;

export type M349Fixture = {
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

export async function seedM349(sql: postgres.Sql, userId: string): Promise<M349Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm349-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M349 Harness Org', ${'m349-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M349-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-349', 'DWA-M 349 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of M349_WORKSHEETS) {
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
    for (const f of M349_FIELDS[ws]) {
      // active=true; is_required deliberately FALSE so the per-gate proof isolates
      // the block-CONDITION path (checkApprovalGate's separate missing-required-field
      // list is not what we are proving here). gateBlocks() reads only
      // failingBlockConditions, so this simplification does not affect any assertion.
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
      symbolHome[f.symbol] = ws;
    }
  }

  // Seed all 27 live BLOCK gates against their home worksheet templates.
  for (const g of M349_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
