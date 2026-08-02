/**
 * DWA-M 179-1 ("Behandlung von Niederschlagswasser für die Einleitung in
 * Oberflächengewässer — Teil 1: Dezentrale Anlagen", **September 2024 GELBDRUCK /
 * ENTWURF**) — CURRENT-PROD fixture for the REAL save-path gate-execution-proof
 * harness.
 *
 * PROVENANCE (R-1/R-2, read honestly):
 *   - TOPOLOGY + all gate conditions / equation formula strings / field
 *     data-types are transcribed VERBATIM from the live-pulled prod dump
 *       scratchpad/m179_encoding.json   (prod id 6ca32ff4-…-d77721e45637,
 *       project vadsmshzebefjreqcicl), pulled live via the Management API THIS
 *       session (mcp execute_sql was down). That dump is the R-1 ground truth.
 *   - Content verification against the source is **VC (verified-vs-text)** only:
 *     the source is an OCR/text extract (_m179-1_full.txt), NO rendered PDF was
 *     available (SR-3 unavailable). No value/threshold fix qualifies as
 *     source-settled from OCR text of a DRAFT edition.
 *   - GELBDRUCK: this is a draft edition. Per campaign doctrine every content
 *     value/threshold correction is DEFERRED to the Weißdruck. This harness does
 *     the full STRUCTURAL + EXECUTION-PROOF treatment only; nothing is applied to
 *     prod, nothing is committed.
 *
 * Topology (verified live): 17 worksheets · 13 block gates · 20 warn gates ·
 * 6 equations · 99 fields. The 13 BLOCK gates:
 *   REQ-01 A_b_a <= 5000                                  (M179-02, local, number)
 *   REQ-02 target_compartment == 'oberflaechengewaesser' (M179-01, local, enum)
 *   REQ-04 cat_I_mixing_violation == False               (M179-03, local, boolean — INVERTED)
 *   REQ-06 IF belastungskategorie == II THEN eta_ges_required >= 47   (gate M179-04; guard field on M179-03 → cross-ws)
 *   REQ-07 IF belastungskategorie == III THEN eta_ges_required >= 63  (gate M179-04; guard field on M179-03 → cross-ws)
 *   REQ-08 eta_hyd >= 50                                  (M179-08, local, number)
 *   REQ-09 eta_hyd <= 100                                 (M179-08, local, number)
 *   REQ-22 IF flow_split_case == fall_4 THEN Q_krit >= 5  (gate M179-08; flow_split_case on M179-05, Q_krit on M179-10 → both cross-ws)
 *   REQ-23 IF Q_krit <= 5 THEN flow_split_case == vollstrom (gate M179-08; cross-ws as above)
 *   REQ-24 Psi_s == 1                                     (M179-02, local, number)
 *   REQ-25 site_factor_sum <= 1                           (M179-14, local, number)
 *   REQ-26 site_factor_sum < 3                            (M179-14, local, number)
 *   REQ-30 funktionspruefung_done == True AND betriebsanweisung_status == ready (M179-16, local)
 *
 * The four IF/THEN block gates (REQ-06/07/22/23) enforce only when their guard is
 * TRUE; when the guard is false they vacuously pass. All four are drivable both
 * ways by making the guard true and toggling the body. REQ-06/07/22/23 read fields
 * that live on OTHER worksheets and resolve through checkApprovalGate's conflict-
 * free project-wide fallback (buildFallbackValues / makeGateLookup) — proven in the
 * verify test.
 *
 * REQ-30 DEFECT (structural, flagged — NOT fixed, Gelbdruck): the second conjunct
 * `betriebsanweisung_status == ready` compares to the bare-ident enum value "ready"
 * (string literal), but the field's DECLARED enum domain is
 * {not_started, in_progress, draft, final} — "ready" is NOT an option. So the gate's
 * PASS state is UNREACHABLE through the UI enum → REQ-30 is an over-enforcing
 * permanent blocker in real use. The correct enum value ('final'? 'draft'?) is a
 * CHOICE among candidates → a RULING, not a source-settled fix. Draft edition →
 * deferred regardless. The verify test drives it both ways (saving the raw value
 * 'ready' to demonstrate the pass path mechanically) AND asserts 'ready' ∉ the
 * declared domain, documenting the blocker.
 *
 * The 6 equations (Gl.1–Gl.5 + the Bild-4 ηBV regression), verbatim from prod,
 * driven through the REAL evaluateFormula in the verify test. VC-confirmed against
 * the source text:
 *   Gl.(1) rkrit = 0,1201 · e^(0,0655·ηhyd)   (line 962)   → r_krit = 0.1201 * exp(0.0655 * eta_hyd)
 *   Gl.(2) ηhyd = ηges / ηBV                  (line 1222)  → eta_hyd = eta_ges / eta_BV
 *   Gl.(3) Qkrit = Ab,a · Ψs · rkrit / 10.000 (line 1247)  → Q_krit = A_b_a * Psi_s * r_krit / 10000
 *   Gl.(4) Ased = 3,6 · Qkrit / qA,max        (line 1267)  → A_sed = 3.6 * Q_krit / q_A_max
 *   Gl.(5) AF = Ab,a · 0,01                    (line 1306)  → A_F = A_b_a * 0.01
 *   ηBV Bild-4 regression (NOT printed as a closed form; encoding-introduced fit)
 *                                                          → eta_BV = regression_a_AFS63 * exp(-regression_b_AFS63 * q_A_max)
 * All six use dot/integer literals — NO comma-decimal parse trap. Nothing applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type FType = 'boolean' | 'text' | 'number' | 'enum' | 'date';

/** All 33 prod compliance gates (13 block + 20 warn), conditions + severities +
 *  HOME worksheet VERBATIM from the live prod dump. Nothing is fixed here. */
export const M179_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  { ws: 'M179-02', code: 'REQ-01', sev: 'block', cond: 'A_b_a <= 5000' },
  { ws: 'M179-01', code: 'REQ-02', sev: 'block', cond: "target_compartment == 'oberflaechengewaesser'" },
  { ws: 'M179-01', code: 'REQ-03', sev: 'warn', cond: '' },
  { ws: 'M179-03', code: 'REQ-04', sev: 'block', cond: 'cat_I_mixing_violation == False' },
  { ws: 'M179-04', code: 'REQ-05', sev: 'warn', cond: 'IF cat_II_III_mixing == True THEN eta_ges_required >= 63' },
  { ws: 'M179-04', code: 'REQ-06', sev: 'block', cond: 'IF belastungskategorie == II THEN eta_ges_required >= 47' },
  { ws: 'M179-04', code: 'REQ-07', sev: 'block', cond: 'IF belastungskategorie == III THEN eta_ges_required >= 63' },
  { ws: 'M179-08', code: 'REQ-08', sev: 'block', cond: 'eta_hyd >= 50' },
  { ws: 'M179-08', code: 'REQ-09', sev: 'block', cond: 'eta_hyd <= 100' },
  { ws: 'M179-08', code: 'REQ-10', sev: 'warn', cond: '' },
  { ws: 'M179-08', code: 'REQ-11', sev: 'warn', cond: '' },
  { ws: 'M179-08', code: 'REQ-12', sev: 'warn', cond: '' },
  { ws: 'M179-06', code: 'REQ-13', sev: 'warn', cond: 'IF treatment_method == sedimentation THEN q_A_max <= 4' },
  { ws: 'M179-06', code: 'REQ-14', sev: 'warn', cond: 'IF treatment_method == sedimentation THEN q_A_max >= 1 AND q_A_max <= 10' },
  { ws: 'M179-11', code: 'REQ-15', sev: 'warn', cond: 'throughput_deviation_pct <= 20' },
  { ws: 'M179-08', code: 'REQ-16', sev: 'warn', cond: 'IF treatment_method == sedimentation THEN sludge_storage_min >= 15' },
  { ws: 'M179-08', code: 'REQ-17', sev: 'warn', cond: '' },
  { ws: 'M179-08', code: 'REQ-18', sev: 'warn', cond: 'IF treatment_method == filtration_oberflaeche THEN v_F >= 0.05 AND v_F <= 2.5' },
  { ws: 'M179-08', code: 'REQ-19', sev: 'warn', cond: 'IF treatment_method == filtration_oberflaeche THEN filter_thickness >= 0.2' },
  { ws: 'M179-08', code: 'REQ-20', sev: 'warn', cond: 'IF treatment_method == filtration_oberflaeche THEN filter_AFS63_max_load <= 7' },
  { ws: 'M179-08', code: 'REQ-21', sev: 'warn', cond: '' },
  { ws: 'M179-08', code: 'REQ-22', sev: 'block', cond: 'IF flow_split_case == fall_4 THEN Q_krit >= 5' },
  { ws: 'M179-08', code: 'REQ-23', sev: 'block', cond: 'IF Q_krit <= 5 THEN flow_split_case == vollstrom' },
  { ws: 'M179-02', code: 'REQ-24', sev: 'block', cond: 'Psi_s == 1' },
  { ws: 'M179-14', code: 'REQ-25', sev: 'block', cond: 'site_factor_sum <= 1' },
  { ws: 'M179-14', code: 'REQ-26', sev: 'block', cond: 'site_factor_sum < 3' },
  { ws: 'M179-16', code: 'REQ-27', sev: 'warn', cond: 'fachkundige_person_assigned == True AND wartungsvertrag_present == True' },
  { ws: 'M179-16', code: 'REQ-28', sev: 'warn', cond: 'monitoring_planned IN {True, False}' },
  { ws: 'M179-16', code: 'REQ-29', sev: 'warn', cond: '' },
  { ws: 'M179-16', code: 'REQ-30', sev: 'block', cond: 'funktionspruefung_done == True AND betriebsanweisung_status == ready' },
  { ws: 'M179-16', code: 'REQ-31', sev: 'warn', cond: '' },
  { ws: 'M179-16', code: 'REQ-32', sev: 'warn', cond: '' },
  { ws: 'M179-16', code: 'REQ-33', sev: 'warn', cond: '' },
];

/** The 6 equations, verbatim from prod. Driven through the REAL evaluateFormula. */
export const M179_EQUATIONS = [
  { num: 'Gl5-A_F',     out: 'A_F',     homeWs: 'M179-12', formula: 'A_F = A_b_a * 0.01' },
  { num: 'Gl4-A_sed',   out: 'A_sed',   homeWs: 'M179-11', formula: 'A_sed = 3.6 * Q_krit / q_A_max' },
  { num: 'BV-eta_BV',   out: 'eta_BV',  homeWs: 'M179-06', formula: 'eta_BV = regression_a_AFS63 * exp(-regression_b_AFS63 * q_A_max)' },
  { num: 'Gl2-eta_hyd', out: 'eta_hyd', homeWs: 'M179-08', formula: 'eta_hyd = eta_ges / eta_BV' },
  { num: 'Gl3-Q_krit',  out: 'Q_krit',  homeWs: 'M179-10', formula: 'Q_krit = A_b_a * Psi_s * r_krit / 10000' },
  { num: 'Gl1-r_krit',  out: 'r_krit',  homeWs: 'M179-09', formula: 'r_krit = 0.1201 * exp(0.0655 * eta_hyd)' },
] as const;

/** The 17 worksheet codes (topology parity with prod). */
export const M179_WORKSHEETS: readonly string[] = [
  'M179-01', 'M179-02', 'M179-03', 'M179-04', 'M179-05', 'M179-06', 'M179-07', 'M179-08',
  'M179-09', 'M179-10', 'M179-11', 'M179-12', 'M179-13', 'M179-14', 'M179-15', 'M179-16', 'M179-17',
];

/** The declared enum domain of betriebsanweisung_status (from the prod dump) — used
 *  by the verify test to prove REQ-30's `== ready` comparison targets a value that
 *  is NOT an option (the over-enforcing-permanent-blocker finding). */
export const BETRIEBSANWEISUNG_STATUS_ENUM: readonly string[] = ['not_started', 'in_progress', 'draft', 'final'];

/** Fields seeded per HOME worksheet — every BLOCK-gate read symbol on its real home
 *  worksheet (cross-ws reads on their true home), plus a few warn-gate read fields
 *  for the never-block spot-checks. Equation inputs are supplied directly to
 *  evaluateFormula (in-memory), so equation-only fields are not seeded. */
export const M179_FIELDS: Record<string, Array<{ symbol: string; dataType: FType }>> = {
  'M179-01': [
    { symbol: 'target_compartment', dataType: 'enum' },          // REQ-02
  ],
  'M179-02': [
    { symbol: 'A_b_a', dataType: 'number' },                     // REQ-01
    { symbol: 'Psi_s', dataType: 'number' },                     // REQ-24
  ],
  'M179-03': [
    { symbol: 'cat_I_mixing_violation', dataType: 'boolean' },   // REQ-04
    { symbol: 'belastungskategorie', dataType: 'enum' },         // REQ-06/07 guard (gate on M179-04)
    { symbol: 'cat_II_III_mixing', dataType: 'boolean' },        // REQ-05 warn guard (gate on M179-04)
  ],
  'M179-04': [
    { symbol: 'eta_ges_required', dataType: 'number' },          // REQ-06/07 body + REQ-05 warn body
  ],
  'M179-05': [
    { symbol: 'flow_split_case', dataType: 'enum' },             // REQ-22/23 (gate on M179-08)
    { symbol: 'treatment_method', dataType: 'enum' },            // REQ-13 warn guard (gate on M179-06)
  ],
  'M179-06': [
    { symbol: 'q_A_max', dataType: 'number' },                   // REQ-13 warn body
  ],
  'M179-07': [],
  'M179-08': [
    { symbol: 'eta_hyd', dataType: 'number' },                   // REQ-08/09
  ],
  'M179-09': [],
  'M179-10': [
    { symbol: 'Q_krit', dataType: 'number' },                    // REQ-22/23 (gate on M179-08)
  ],
  'M179-11': [],
  'M179-12': [],
  'M179-13': [],
  'M179-14': [
    { symbol: 'site_factor_sum', dataType: 'number' },           // REQ-25/26
  ],
  'M179-15': [],
  'M179-16': [
    { symbol: 'funktionspruefung_done', dataType: 'boolean' },   // REQ-30
    { symbol: 'betriebsanweisung_status', dataType: 'enum' },    // REQ-30
    { symbol: 'fachkundige_person_assigned', dataType: 'boolean' }, // REQ-27 warn
    { symbol: 'wartungsvertrag_present', dataType: 'boolean' },  // REQ-27 warn
    { symbol: 'monitoring_planned', dataType: 'boolean' },       // REQ-28 warn
  ],
  'M179-17': [],
};

export type M179Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  instances: Record<string, string>;
  fieldByWs: Record<string, Record<string, { fieldId: string; dataType: string }>>;
  equationIds: Record<string, string>;
};

export async function seedM179_1(sql: postgres.Sql, userId: string): Promise<M179Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm179-1-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M179-1 Harness Org', ${'m179-1-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M179-1-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-179-1', 'DWA-M 179-1 (harness)', 'Sept-2024-Entwurf') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldByWs: Record<string, Record<string, { fieldId: string; dataType: string }>> = {};
  const templateByWs: Record<string, string> = {};

  let wsOrder = 1;
  for (const ws of M179_WORKSHEETS) {
    const [t] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_templates (standard_id, code, title_de, order_index)
      VALUES (${std.id}, ${ws}, ${ws + ' (harness)'}, ${wsOrder++}) RETURNING id`;
    templateByWs[ws] = t.id;
    const [sec] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_sections (worksheet_template_id, code, title_de)
      VALUES (${t.id}, ${'S-' + ws}, ${'S-' + ws}) RETURNING id`;
    const [inst] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_instances (project_id, worksheet_template_id)
      VALUES (${proj.id}, ${t.id}) RETURNING id`;
    instances[ws] = inst.id;

    fieldByWs[ws] = {};
    let oi = 1;
    for (const f of M179_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fieldByWs[ws][f.symbol] = { fieldId: row.id, dataType: f.dataType };
    }
  }

  for (const g of M179_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  const equationIds: Record<string, string> = {};
  for (const e of M179_EQUATIONS) {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO equations (worksheet_template_id, equation_number, formula, output_symbol)
      VALUES (${templateByWs[e.homeWs]}, ${e.num}, ${e.formula}, ${e.out}) RETURNING id`;
    equationIds[e.num] = row.id;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldByWs, equationIds };
}
