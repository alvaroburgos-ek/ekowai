/**
 * DWA-M-381E ("Eindickung von Klärschlamm" / Thickening of sewage sludge;
 * Merkblatt DWA-M 381E, October 2007, English edition ISBN 978-3-941897-43-4) —
 * minimal fixture for the REAL save-path gate-execution-proof harness.
 *
 * SOURCE STATUS: the DWA-M-381E source PDF is NOT in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\ has no M-381E / DWA-M-381 folder — verified this
 * session). This is therefore an ENFORCEMENT proof only — it proves each live BLOCK gate
 * enforces BOTH ways through the real save path. It does NOT and cannot verify any
 * threshold against a source. Every condition + severity is pulled verbatim from prod
 * compliance_requirements (standard DWA-M-381E = 23f7b102-1a7f-450f-aadf-e2510d384aac,
 * project vadsmshzebefjreqcicl, this session); no threshold is asserted to be "correct".
 *
 * PROOF MANDATE: M-381E's gate enforcement is claimable ONLY by EXECUTION. This fixture
 * drives the standard's 20 live BLOCK gates (every compliance_requirement with
 * severity='block' + a non-empty condition) through the REAL `saveWorksheet` (values
 * persist to project_parameters) and the REAL `checkApprovalGate` (the engineer-approve
 * enforcement read path that replays each block condition against the saved values).
 * Each DRIVABLE gate is demonstrated BOTH ways — a state that PASSES it and a state that
 * VIOLATES it, reaching a definite `fail` — so a gate that fires but never enforces (the
 * F-4 lesson) cannot hide.
 *
 * TOPOLOGY (verbatim from prod): 10 worksheet_templates (M381E-01 … M381E-10), 75 active
 * fields, 4 equations, 20 compliance_requirements — ALL 20 are severity='block' with a
 * non-empty condition. The fixture instantiates all 10 worksheets and seeds every gate
 * operand on ITS OWN home worksheet (single-home topology, verbatim from prod fields).
 *
 * CROSS-WORKSHEET NOTE: unlike A-226, EVERY M-381E block-gate operand is a field on the
 * SAME worksheet that hosts the gate — there is no cross-worksheet gate operand in this
 * standard (the project-wide fallback in checkApprovalGate is present but not needed
 * here). M381E-06 (Zentrifugeneindickung) and M381E-10 (Kosten) host NO block gates; they
 * are instantiated for topology fidelity but seed no gate fields. (The equation engine
 * DOES cross worksheets — Eq.1 eta reads TSS_In@M381E-02, Eq.2 A_thickener reads
 * Q_s/TSS_In@M381E-02 — but equations are out of scope for this gate-enforcement harness;
 * see the structural equation notes in the wave report.)
 *
 * THREE NON-DRIVABLE (no-op) BLOCK GATES — LOGGED, cannot be shown both-ways:
 *   - CR-017 `TRUE` (M381E-07): literal always-pass; evaluateCondition → lit(true) → pass.
 *     Can NEVER reach `fail`, so it never enforces anything. Pure attestation placeholder.
 *   - CR-018 `TRUE` (M381E-07): same literal always-pass no-op.
 *   - CR-020 `separate_liquor_treatment IN {true,false}` (M381E-09): membership over the
 *     COMPLETE boolean domain. separate_liquor_treatment is a boolean field, so its value
 *     is always true/false (matched → pass) or null (→ pending). It can NEVER reach `fail`
 *     — a total-domain IN is a no-op enforcement gate. Members `true,false` parse to the
 *     boolean literals (parseLiteral: TRUE/FALSE keyword → lit(boolean)), so they match the
 *     boolean field value exactly; there is no Titlecase/lowercase enum trap here, the gate
 *     is simply vacuous. Driven the PASS way (true and false both pass) + documented as
 *     un-violatable.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod values —
 * NONE of the 4 known engine traps are present in M-381E):
 *   1. bare-ident-RHS `field == field` / `field != field`: NONE. The only equality gates
 *      are CR-009 `flocculation_unit_present == true` (RHS = boolean keyword) and CR-013
 *      `reuse_pathway == 'agricultural' AND pam_used == false` (RHS = quoted string / bool
 *      keyword). No `==`/`!=` RHS is a bare field identifier.
 *   2. `!= null` / `== null` block gate: NONE. Every existence gate uses `IS NOT NULL`
 *      (CR-001, CR-015, CR-016, CR-019, CR-010) — the `exists` path → definite fail.
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. The only membership gate (CR-020) compares
 *      a boolean field against boolean-keyword members `{true,false}` — no enum, no case
 *      trap. (It is instead the total-domain no-op flagged above.)
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. M-381E has no
 *      IF/THEN block gate at all; conditional logic is plain AND / range compares that
 *      parse unambiguously.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing is
 * applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate operand on its ONE home worksheet
 * (symbol + data_type verbatim from prod fields). M381E-06 and M381E-10 host no block
 * gates → no gate fields seeded. is_required is deliberately FALSE so the per-gate proof
 * isolates the block-CONDITION path (the separate missing-required-field list is not what
 * this harness proves).
 */
export const M381E_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'M381E-01': [
    { symbol: 'thickening_principle', dataType: 'enum' },
    { symbol: 'sludge_type', dataType: 'enum' },
  ],
  'M381E-02': [
    { symbol: 'TS_percent', dataType: 'number' },
    { symbol: 'TSS_In', dataType: 'number' },
  ],
  'M381E-03': [
    { symbol: 'SLR', dataType: 'number' },
    { symbol: 't_d', dataType: 'number' },
    { symbol: 'H_W', dataType: 'number' },
    { symbol: 'H_R', dataType: 'number' },
    { symbol: 'H', dataType: 'number' },
    { symbol: 'H_S', dataType: 'number' },
    { symbol: 'floor_slope', dataType: 'number' },
  ],
  'M381E-04': [
    { symbol: 'q_A', dataType: 'number' },
    { symbol: 'SLR_fl', dataType: 'number' },
  ],
  'M381E-05': [
    { symbol: 'flocculation_unit_present', dataType: 'boolean' },
  ],
  'M381E-06': [
    // no block gates on this worksheet
  ],
  'M381E-07': [
    { symbol: 'reuse_pathway', dataType: 'enum' },
    { symbol: 'pam_used', dataType: 'boolean' },
    { symbol: 'conditioner_fraction', dataType: 'number' },
    { symbol: 'specific_flocculant_demand', dataType: 'number' },
  ],
  'M381E-08': [
    { symbol: 'eta', dataType: 'number' },
  ],
  'M381E-09': [
    { symbol: 'separate_liquor_treatment', dataType: 'boolean' },
  ],
  'M381E-10': [
    // no block gates on this worksheet
  ],
};

/** Worksheets to instantiate (all 10 — gate homes + topology fidelity). */
export const M381E_WORKSHEETS = [
  'M381E-01', 'M381E-02', 'M381E-03', 'M381E-04', 'M381E-05',
  'M381E-06', 'M381E-07', 'M381E-08', 'M381E-09', 'M381E-10',
] as const;

/** All 20 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const M381E_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M381E-01 — Anmeldung und Verfahrenswahl
  { ws: 'M381E-01', code: 'CR-001', cond: 'thickening_principle IS NOT NULL AND sludge_type IS NOT NULL', sev: 'block' },
  // M381E-02 — Schlammcharakterisierung und Eingangslasten
  { ws: 'M381E-02', code: 'CR-015', cond: 'TS_percent IS NOT NULL AND TSS_In IS NOT NULL', sev: 'block' },
  // M381E-03 — Bemessung Schwerkrafteindickung
  { ws: 'M381E-03', code: 'CR-002', cond: 'SLR > 0 AND SLR <= 100', sev: 'block' },
  { ws: 'M381E-03', code: 'CR-003', cond: 't_d <= 1.5', sev: 'block' },
  { ws: 'M381E-03', code: 'CR-004', cond: 'H_W >= 1.0', sev: 'block' },
  { ws: 'M381E-03', code: 'CR-005', cond: 'H_R >= 0.3', sev: 'block' },
  { ws: 'M381E-03', code: 'CR-006', cond: 'H >= H_W + H_S + H_R', sev: 'block' },
  { ws: 'M381E-03', code: 'CR-016', cond: 'floor_slope IS NOT NULL', sev: 'block' },
  // M381E-04 — Bemessung Flotationseindickung
  { ws: 'M381E-04', code: 'CR-007', cond: 'q_A >= 1 AND q_A <= 7.5', sev: 'block' },
  { ws: 'M381E-04', code: 'CR-008', cond: 'SLR_fl >= 5 AND SLR_fl <= 20', sev: 'block' },
  // M381E-05 — Bemessung mechanische Eindickung
  { ws: 'M381E-05', code: 'CR-009', cond: 'flocculation_unit_present == true', sev: 'block' },
  // M381E-07 — Konditionierung / Polymerdosierung
  { ws: 'M381E-07', code: 'CR-013', cond: "reuse_pathway == 'agricultural' AND pam_used == false", sev: 'block' },
  { ws: 'M381E-07', code: 'CR-014', cond: 'conditioner_fraction <= 0.5', sev: 'block' },
  { ws: 'M381E-07', code: 'CR-017', cond: 'TRUE', sev: 'block' }, // literal no-op — see header
  { ws: 'M381E-07', code: 'CR-018', cond: 'TRUE', sev: 'block' }, // literal no-op — see header
  { ws: 'M381E-07', code: 'CR-019', cond: 'specific_flocculant_demand IS NOT NULL', sev: 'block' },
  // M381E-08 — Leistungsdaten und Nachweis
  { ws: 'M381E-08', code: 'CR-010', cond: 'eta IS NOT NULL', sev: 'block' },
  { ws: 'M381E-08', code: 'CR-011', cond: 'eta >= 85', sev: 'block' },
  { ws: 'M381E-08', code: 'CR-012', cond: 'eta >= 92 AND eta <= 96', sev: 'block' },
  // M381E-09 — Auswirkungen auf Behandlungskette und Trübwasser
  { ws: 'M381E-09', code: 'CR-020', cond: 'separate_liquor_treatment IN {true,false}', sev: 'block' }, // total-domain no-op — see header
] as const;

export type M381eFixture = {
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

export async function seedM381e(sql: postgres.Sql, userId: string): Promise<M381eFixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm381e-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M381E Harness Org', ${'m381e-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M381E-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-381E', 'DWA-M 381E (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of M381E_WORKSHEETS) {
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
    for (const f of M381E_FIELDS[ws]) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
      symbolHome[f.symbol] = ws;
    }
  }

  // Seed the 20 live BLOCK gates against their home worksheet templates.
  for (const g of M381E_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
