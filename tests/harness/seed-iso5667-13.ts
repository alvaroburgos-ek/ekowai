/**
 * ISO 5667-13 ("Water quality — Sampling — Part 13: Guidance on sampling of
 * sludges"; 2011, second edition, ISO 5667-13:2011, ISO/TC 147/SC 6) — minimal
 * fixture for the REAL save-path execution-proof harness.
 *
 * PROOF MANDATE: gate enforcement is claimable ONLY by EXECUTION. This fixture
 * drives the standard's 4 live BLOCK gates through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition
 * against the saved values). Each gate is demonstrated BOTH ways — a state that
 * PASSES it and a state that VIOLATES it (definite `fail`) — so a gate that
 * fires but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard 436bd1b4-0e39-47e6-8a89-3e36cdee5e86,
 * project vadsmshzebefjreqcicl, this session, R-2): 8 worksheet_templates,
 * 4 BLOCK + 19 WARN gates, 3 equations. Conditions + severities are verbatim
 * from prod compliance_requirements; nothing is fixed here.
 *
 * This is a "Guidance on…" ISO part — a WARN-HEAVY standard by design (4 of 23
 * gates enforce). That is expected: the standard is written in "should" prose
 * and prescribes no quality limit values; the enforcing gates are the two safety
 * "shall" clauses (§ WARNING p.1, §8), the "indispensable" normative-references
 * clause (§2), and the single numeric range constraint on the stockpile
 * sub-sample count (§6.3.6, "should lie between 4 and 30").
 *
 * GATE SHAPES (all 4 block):
 *   - 3 boolean attestations `symbol == true`
 *       CR-001 safety_practices_established (WS01, § WARNING p.1)
 *       CR-003 normative_references_consulted (WS01, §2 "indispensable")
 *       CR-022 safety_regulations_observed (WS08, §8)
 *     — pass with true, VIOLATE with false.
 *   - 1 compound numeric range AND gate
 *       CR-017 n_sp >= 4 AND n_sp <= 30 (WS06, §6.3.6) — pass mid-range,
 *       VIOLATE one operand → whole AND false → definite fail → blocks.
 *
 * There are NO literal-`TRUE` no-op block gates, NO `!= ''` / `== null` /
 * `!= null` block gates, NO `IN {...}` gates and NO `IF…THEN` gates in this
 * standard. CR-005 is an EMPTY-condition gate but it is WARN (evaluates to
 * `manual` → never blocks), so it is not a block-gate no-op.
 *
 * The 19 WARN gates are seeded at their real WARN severity so checkApprovalGate's
 * block-only query correctly EXCLUDES them (proven never to block).
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 4 live BLOCK gates + 19 WARN gates, conditions + severities verbatim from prod. */
export const ISO5667_13_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // WS01 — Registrierung & Anwendungsbereich (§1/§2/§ WARNING)
  { ws: 'ISO-5667-13-01', code: 'CR-001', cond: 'safety_practices_established == true', sev: 'block' },
  { ws: 'ISO-5667-13-01', code: 'CR-002', cond: 'sludge_origin IS NOT NULL AND sampling_purpose_defined IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-13-01', code: 'CR-003', cond: 'normative_references_consulted == true', sev: 'block' },
  { ws: 'ISO-5667-13-01', code: 'CR-005', cond: '', sev: 'warn' },
  // WS03 — Erstellung eines Probenahmeplans (§4)
  { ws: 'ISO-5667-13-03', code: 'CR-004', cond: 'monitoring_objective IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-13-03', code: 'CR-006', cond: 'variability_type IS NOT NULL AND concentration_target IS NOT NULL', sev: 'warn' },
  // WS04 — Probenahmegeraete & Behaelter (§5)
  { ws: 'ISO-5667-13-04', code: 'CR-007', cond: 'laboratory_consulted == true', sev: 'warn' },
  { ws: 'ISO-5667-13-04', code: 'CR-008', cond: 'equipment_clean_corrosion_free == true', sev: 'warn' },
  { ws: 'ISO-5667-13-04', code: 'CR-009', cond: 'container_material IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-13-04', code: 'CR-010', cond: 'container_airtight == True', sev: 'warn' },
  // WS05 — Probenahme-Regime & Haeufigkeit (§6.1/§6.2)
  { ws: 'ISO-5667-13-05', code: 'CR-011', cond: 'sample_type IS NOT NULL AND sampling_mode IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-13-05', code: 'CR-012', cond: 't > 0', sev: 'warn' },
  { ws: 'ISO-5667-13-05', code: 'CR-013', cond: 'n > 0', sev: 'warn' },
  { ws: 'ISO-5667-13-05', code: 'CR-014', cond: 'replicate_ratio_met == True', sev: 'warn' },
  // WS06 — Probenahme-Methodik nach Quelle (§6.3)
  { ws: 'ISO-5667-13-06', code: 'CR-015', cond: 'sample_volume_adequate == True', sev: 'warn' },
  { ws: 'ISO-5667-13-06', code: 'CR-016', cond: 'sludge_source IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-13-06', code: 'CR-017', cond: 'n_sp >= 4 AND n_sp <= 30', sev: 'block' },
  // WS07 — Homogenisierung & Teilung (Vierteln) (§6.4)
  { ws: 'ISO-5667-13-07', code: 'CR-018', cond: 'quartering_performed == true', sev: 'warn' },
  { ws: 'ISO-5667-13-07', code: 'CR-019', cond: 'multiple_subsamples_required IS NOT NULL', sev: 'warn' },
  // WS08 — Lagerung, Sicherheit, Kennzeichnung & Bericht (§7/§8/§9)
  { ws: 'ISO-5667-13-08', code: 'CR-020', cond: 'time_dependent_analysis IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-13-08', code: 'CR-021', cond: 'storage_conditions_per_iso15 == true', sev: 'warn' },
  { ws: 'ISO-5667-13-08', code: 'CR-022', cond: 'safety_regulations_observed == true', sev: 'block' },
  { ws: 'ISO-5667-13-08', code: 'CR-023', cond: 'sample_label_complete == true', sev: 'warn' },
] as const;

/** The 8 worksheet codes (topology parity with prod). */
export const ISO5667_13_WORKSHEETS: readonly string[] = [
  'ISO-5667-13-01', 'ISO-5667-13-02', 'ISO-5667-13-03', 'ISO-5667-13-04',
  'ISO-5667-13-05', 'ISO-5667-13-06', 'ISO-5667-13-07', 'ISO-5667-13-08',
];

/**
 * Fields to seed per HOME worksheet — each driven gate-read symbol + equation
 * in/out symbol on its REAL prod home worksheet (symbol + data_type verbatim
 * from prod). Warn gates whose symbols are not seeded are never evaluated by the
 * block-only approval gate, so they need no field row.
 */
export const ISO5667_13_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'ISO-5667-13-01': [
    { symbol: 'safety_practices_established', dataType: 'boolean' },     // CR-001 block
    { symbol: 'normative_references_consulted', dataType: 'boolean' },   // CR-003 block
  ],
  'ISO-5667-13-03': [
    { symbol: 'monitoring_objective', dataType: 'enum' },               // CR-004 warn (existence) spot-check
  ],
  'ISO-5667-13-05': [
    { symbol: 'm', dataType: 'number' },   // Eq1 input
    { symbol: 'q', dataType: 'number' },   // Eq1 input
    { symbol: 'n', dataType: 'number' },   // Eq1 input + Eq2 output
    { symbol: 's', dataType: 'number' },   // Eq2 input
    { symbol: 'E', dataType: 'number' },   // Eq2 input
    { symbol: 't', dataType: 'number' },   // Eq1 output + CR-012 warn (t > 0) spot-check
  ],
  'ISO-5667-13-06': [
    { symbol: 'V', dataType: 'number' },      // Eq3 input
    { symbol: 'n_sp', dataType: 'number' },   // Eq3 output + CR-017 block
  ],
  'ISO-5667-13-08': [
    { symbol: 'safety_regulations_observed', dataType: 'boolean' },     // CR-022 block
  ],
};

/** The 3 prod equations (§6.1.3 Eq.1 p.5; §6.1.4.2 Eq.2 p.6 + Annex D p.22;
 *  §6.3.6 Eq.3 p.9; formula + output + inputs verbatim from prod). Driven
 *  through the REAL evaluateFormula — all three are dot-decimal arithmetic with
 *  supported operators (*, /, ^, sqrt) — no comma-decimals, no SUM — so all
 *  COMPUTE. */
export const ISO5667_13_EQUATIONS: ReadonlyArray<{
  num: string; out: string; formula: string; inputs: string[];
}> = [
  { num: '1', out: 't', formula: 't = (60 * m) / (q * n)', inputs: ['m', 'q', 'n'] },
  { num: '2', out: 'n', formula: 'n = (1.96 * s / E)^2', inputs: ['s', 'E'] },
  { num: '3', out: 'n_sp', formula: 'n_sp = sqrt(V) / 2', inputs: ['V'] },
] as const;

export type ISO5667_13Fixture = {
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

export async function seedISO5667_13(sql: postgres.Sql, userId: string): Promise<ISO5667_13Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso5667-13-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO5667-13 Harness Org', ${'iso5667-13-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO5667-13-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-5667-13', 'ISO 5667-13 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  // Create all 8 worksheet templates + a section + an instance (topology parity).
  let wsOrder = 1;
  for (const ws of ISO5667_13_WORKSHEETS) {
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
    for (const f of ISO5667_13_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fields[f.symbol] = row.id;
      fieldMeta[f.symbol] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the gates (4 block + 19 warn) against their host worksheet templates.
  for (const g of ISO5667_13_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
