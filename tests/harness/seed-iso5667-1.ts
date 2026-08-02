/**
 * ISO 5667-1 ("Water quality — Sampling — Part 1: Guidance on the design of
 * sampling programmes"; 1980 edition, adopted NTC-ISO 5667-1:1995) — minimal
 * fixture for the REAL save-path execution-proof harness.
 *
 * PROOF MANDATE: gate enforcement is claimable ONLY by EXECUTION. This fixture
 * drives the standard's 13 live BLOCK gates through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition
 * against the saved values). Each gate is demonstrated BOTH ways — a state that
 * PASSES it and a state that VIOLATES it (definite `fail`) — so a gate that
 * fires but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard 41426622-f709-4c10-9f9f-2a2643e57c31,
 * this session, R-2): 8 worksheet_templates, 13 BLOCK + 14 WARN gates, 3 equations.
 * Conditions + severities are verbatim from prod compliance_requirements; nothing
 * is fixed here.
 *
 * GATE SHAPES (all 13 block):
 *   - 5 EXISTENCE gates `symbol IS NOT NULL` (CR-002/015/021/026) + one AND of two
 *     existences (CR-016). `IS NOT NULL` compiles to the enforcing `exists` node
 *     (absent → definite fail → blocks; present → pass) — NOT the `!= null` no-op
 *     trap. Demonstrated absent→block, present→pass.
 *   - 5 boolean attestations `symbol == true|True` (CR-003/007/008/009/014) —
 *     pass with true, VIOLATE with false. (`true` and `True` both tokenise to the
 *     TRUE keyword; identical semantics.)
 *   - 2 numeric ordering thresholds `pipe_nominal_bore >= 25` (CR-012, §8, 25 mm)
 *     and `sludge_pipe_diameter >= 50` (CR-017, §12, 50 mm) — both verbatim from
 *     the printed page.
 *   - 1 equation-output threshold `n > 0` (CR-023). `n` (number of samples,
 *     Eq.3 output) is a field on WS07, NOT on the gate's host WS06, so it resolves
 *     via the conflict-free project-wide fallback exactly as in the deployed app.
 *
 * The 14 WARN gates are seeded at their real WARN severity so checkApprovalGate's
 * block-only query correctly EXCLUDES them (proven never to block). Four of them
 * (CR-006/020/025/027) carry an EMPTY condition '' → `manual` no-op AND warn.
 *
 * There are NO literal-`TRUE` no-op block gates, NO `!= ''` / `== null` / `!= null`
 * block gates, NO `IN {...}` gates and NO `IF…THEN` gates in this standard.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 13 live BLOCK gates + 14 WARN gates, conditions + severities verbatim from prod. */
export const ISO5667_1_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // WS01 — Registrierung & Anwendungsbereich (§0/§1/§2)
  { ws: 'ISO-5667-1-01', code: 'CR-002', cond: 'programme_purpose IS NOT NULL', sev: 'block' },
  { ws: 'ISO-5667-1-01', code: 'CR-004', cond: 'normative_references_consulted == true', sev: 'warn' },
  { ws: 'ISO-5667-1-01', code: 'CR-006', cond: '', sev: 'warn' },
  // WS02 — Festlegung der Ziele (§3/§4/§5)
  { ws: 'ISO-5667-1-02', code: 'CR-001', cond: 'objectives_defined == true', sev: 'warn' },
  { ws: 'ISO-5667-1-02', code: 'CR-003', cond: 'preliminary_survey_done == true', sev: 'block' },
  { ws: 'ISO-5667-1-02', code: 'CR-005', cond: 'boundary_sampling_avoided == true', sev: 'warn' },
  // WS03 — Allgemeine Sicherheitsvorkehrungen (§6/§7)
  { ws: 'ISO-5667-1-03', code: 'CR-007', cond: 'safety_regulations_considered == true', sev: 'block' },
  { ws: 'ISO-5667-1-03', code: 'CR-008', cond: 'hazardous_atmosphere_tested == True', sev: 'block' },
  { ws: 'ISO-5667-1-03', code: 'CR-009', cond: 'electrical_hazard_minimized == True', sev: 'block' },
  // WS04 — Besondere Probenahme-Erwaegungen (§8)
  { ws: 'ISO-5667-1-04', code: 'CR-010', cond: 'sampling_location_identified == true', sev: 'warn' },
  { ws: 'ISO-5667-1-04', code: 'CR-011', cond: 'flow_character IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-1-04', code: 'CR-012', cond: 'pipe_nominal_bore >= 25', sev: 'block' },
  { ws: 'ISO-5667-1-04', code: 'CR-013', cond: 'isokinetic_sampling IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-1-04', code: 'CR-014', cond: 'weather_recorded == True', sev: 'block' },
  // WS05 — Probenahmesituationen & Standortwahl (§9–13)
  { ws: 'ISO-5667-1-05', code: 'CR-015', cond: 'water_situation_type IS NOT NULL', sev: 'block' },
  { ws: 'ISO-5667-1-05', code: 'CR-016', cond: 'groundwater_purged IS NOT NULL AND sampling_depth IS NOT NULL', sev: 'block' },
  { ws: 'ISO-5667-1-05', code: 'CR-017', cond: 'sludge_pipe_diameter >= 50', sev: 'block' },
  { ws: 'ISO-5667-1-05', code: 'CR-018', cond: 'automatic_sampler_protection IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-1-05', code: 'CR-019', cond: 'flow_proportional_sampling IS NOT NULL', sev: 'warn' },
  // WS06 — Programmtyp & Zeitpunkt der Probenahme (§14/§15/§17/§18)
  { ws: 'ISO-5667-1-06', code: 'CR-020', cond: '', sev: 'warn' },
  { ws: 'ISO-5667-1-06', code: 'CR-021', cond: 'programme_type IS NOT NULL', sev: 'block' },
  { ws: 'ISO-5667-1-06', code: 'CR-022', cond: 'abnormal_frequency_increase IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-1-06', code: 'CR-023', cond: 'n > 0', sev: 'block' },
  { ws: 'ISO-5667-1-06', code: 'CR-025', cond: '', sev: 'warn' },
  // WS07 — Statistische Probenahmehaeufigkeit (§16)
  { ws: 'ISO-5667-1-07', code: 'CR-024', cond: 'L > 0', sev: 'warn' },
  // WS08 — Durchflussmessung (§19/§20/§21)
  { ws: 'ISO-5667-1-08', code: 'CR-026', cond: 'flow_aspect IS NOT NULL', sev: 'block' },
  { ws: 'ISO-5667-1-08', code: 'CR-027', cond: '', sev: 'warn' },
] as const;

/** The 8 worksheet codes (topology parity with prod). */
export const ISO5667_1_WORKSHEETS: readonly string[] = [
  'ISO-5667-1-01', 'ISO-5667-1-02', 'ISO-5667-1-03', 'ISO-5667-1-04',
  'ISO-5667-1-05', 'ISO-5667-1-06', 'ISO-5667-1-07', 'ISO-5667-1-08',
];

/**
 * Fields to seed per worksheet — each gate-read symbol on its REAL home worksheet
 * (symbol + data_type verbatim from prod). `n` lives on WS07 so CR-023's `n > 0`
 * (hosted on WS06) resolves via the project-wide fallback exactly as in the app.
 */
export const ISO5667_1_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'ISO-5667-1-01': [
    { symbol: 'programme_purpose', dataType: 'enum' },                 // CR-002 block
    { symbol: 'normative_references_consulted', dataType: 'boolean' }, // CR-004 warn
  ],
  'ISO-5667-1-02': [
    { symbol: 'objectives_defined', dataType: 'boolean' },     // CR-001 warn
    { symbol: 'preliminary_survey_done', dataType: 'boolean' },// CR-003 block
  ],
  'ISO-5667-1-03': [
    { symbol: 'safety_regulations_considered', dataType: 'boolean' }, // CR-007
    { symbol: 'hazardous_atmosphere_tested', dataType: 'boolean' },   // CR-008
    { symbol: 'electrical_hazard_minimized', dataType: 'boolean' },   // CR-009
  ],
  'ISO-5667-1-04': [
    { symbol: 'pipe_nominal_bore', dataType: 'number' }, // CR-012 (25 mm, §8)
    { symbol: 'weather_recorded', dataType: 'boolean' }, // CR-014
  ],
  'ISO-5667-1-05': [
    { symbol: 'water_situation_type', dataType: 'enum' },   // CR-015
    { symbol: 'groundwater_purged', dataType: 'boolean' },  // CR-016 operand
    { symbol: 'sampling_depth', dataType: 'number' },       // CR-016 operand
    { symbol: 'sludge_pipe_diameter', dataType: 'number' }, // CR-017 (50 mm, §12)
  ],
  'ISO-5667-1-06': [
    { symbol: 'programme_type', dataType: 'enum' }, // CR-021
  ],
  'ISO-5667-1-07': [
    { symbol: 'n', dataType: 'number' }, // CR-023 cross-worksheet RHS (Eq.3 output)
    { symbol: 'L', dataType: 'number' }, // CR-024 warn operand (Eq.2 output)
  ],
  'ISO-5667-1-08': [
    { symbol: 'flow_aspect', dataType: 'enum' }, // CR-026
  ],
};

/** The 3 prod equations (§16.4/§16.5 statistics; formula + output + inputs verbatim
 *  from prod). Driven through the REAL evaluateFormula. Eq.1 uses SUM() →
 *  engine-unsupported (NR). */
export const ISO5667_1_EQUATIONS: ReadonlyArray<{
  num: string; out: string; formula: string; inputs: string[];
}> = [
  { num: '1', out: 's', formula: 's = sqrt( SUM((x_i - x_mean)^2) / (n - 1) )', inputs: ['x_i', 'x_mean', 'n'] },
  { num: '2', out: 'L', formula: 'L = 2 * K * sigma / sqrt(n)', inputs: ['K', 'sigma', 'n'] },
  { num: '3', out: 'n', formula: 'n = (2 * K * sigma / L)^2', inputs: ['K', 'sigma', 'L'] },
] as const;

export type ISO5667_1Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** symbol → field id */
  fields: Record<string, string>;
  /** symbol → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
};

export async function seedISO5667_1(sql: postgres.Sql, userId: string): Promise<ISO5667_1Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso5667-1-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO5667-1 Harness Org', ${'iso5667-1-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO5667-1-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-5667-1', 'ISO 5667-1 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  // Create all 8 worksheet templates + a section + an instance (topology parity).
  let wsOrder = 1;
  for (const ws of ISO5667_1_WORKSHEETS) {
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

    let oi = 1;
    for (const f of ISO5667_1_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fields[f.symbol] = row.id;
      fieldMeta[f.symbol] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the gates (13 block + 14 warn) against their home worksheet templates.
  for (const g of ISO5667_1_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
