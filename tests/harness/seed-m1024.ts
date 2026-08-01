/**
 * DWA-M-102-4 / BWK-M 3-4 (Wasserhaushaltsbilanz — HW-Kenngrößen) — minimal
 * fixture for the REAL save-path execution-proof harness.
 *
 * PROOF MANDATE: M-102-4's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 10 live BLOCK gates through the REAL
 * `saveWorksheet` (values persist to project_parameters) and the REAL
 * `checkApprovalGate` (the engineer-approve enforcement read path that replays
 * each block condition against the saved values). Each gate is demonstrated BOTH
 * ways — a state that PASSES it and a state that VIOLATES it, reaching a definite
 * `fail` — so a gate that fires but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard DWA-M-102-4, this session, R-2):
 *   - 35 worksheet_templates (codes M104-01 … M104-35); the fixture seeds the 6
 *     that host a BLOCK gate: M104-01, M104-02, M104-04, M104-05, M104-07,
 *     M104-29. Symbols + data_types verbatim from prod fields.
 *   - Every symbol each block condition references is a field ON ITS REAL HOME
 *     WORKSHEET, so `checkApprovalGate`'s local-symbol resolution matches prod.
 *   - Conditions are verbatim from prod compliance_requirements.
 *
 * NOTE ON THE FALLBACK PATH: unlike A-262E, EVERY M-102-4 block-gate symbol is a
 * field on the gate's OWN worksheet, so all ten resolve via the LOCAL path; none
 * depends on the conflict-free project-wide fallback. To still exercise that
 * fallback path in a M-102-4 topology, the fixture ALSO seeds the area totals on
 * M104-15 (their second real home in prod) as a benign duplicate; the REQ-18
 * fallback smoke test confirms the cross-worksheet resolver returns the agreed
 * value. All primary both-ways proofs use the local home (M104-02).
 *
 * ARITHMETIC-IDENTITY GATE (the novel one): REQ-18 on M104-02 is
 *   `A_E_k_b + A_E_k_nb == A_E_k`
 * — a field+field == field balance check. It carries `+`, so evaluate.ts routes
 * it through the numeric `acompare` path (all three operands resolved as numbers,
 * pending when any is unfilled) rather than the legacy string-literal compare.
 * Proven both ways: a balancing state passes, an unbalanced state definitely fails.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 10 live BLOCK gates, grouped by worksheet, conditions + severities
 *  verbatim from prod compliance_requirements. */
export const M1024_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M104-01 Projektregistrierung
  { ws: 'M104-01', code: 'REQ-01', cond: 'project_type IN {Neuerschließung, Konversion, Sanierung, Nachverdichtung}', sev: 'block' },
  { ws: 'M104-01', code: 'REQ-02', cond: 'attest_m104_01_req_02 == True', sev: 'block' },
  { ws: 'M104-01', code: 'REQ-20', cond: 'attest_m104_01_req_20 == True', sev: 'block' },
  { ws: 'M104-01', code: 'REQ-22', cond: 'worksheet_status IN {engineer_approved, customer_approved, final}', sev: 'block' },
  // M104-02 Bilanzgebietsdefinition
  { ws: 'M104-02', code: 'REQ-03', cond: 'A_E_k_b >= 800', sev: 'block' },
  { ws: 'M104-02', code: 'REQ-18', cond: 'A_E_k_b + A_E_k_nb == A_E_k', sev: 'block' },
  // M104-04 Niederschlagsdaten
  { ws: 'M104-04', code: 'REQ-08', cond: 'P >= 500 AND P <= 1700', sev: 'block' },
  // M104-05 Verdunstungsdaten
  { ws: 'M104-05', code: 'REQ-09', cond: 'ET_p >= 450 AND ET_p <= 700', sev: 'block' },
  // M104-07 Berechnung des Referenzzustands
  { ws: 'M104-07', code: 'REQ-14', cond: 'attest_m104_07_req_14 == True', sev: 'block' },
  // M104-29 Kombinierte Wasserbilanzberechnung
  { ws: 'M104-29', code: 'REQ-19', cond: 'attest_m104_29_req_19 == True', sev: 'block' },
] as const;

/**
 * Fields to seed per worksheet — each gate symbol on its REAL home worksheet
 * (symbol + data_type verbatim from prod). M104-15 re-homes the three area
 * totals (their prod second home) purely to exercise the project-wide fallback
 * resolver; no gate depends on it.
 */
export const M1024_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'M104-01': [
    { symbol: 'project_type', dataType: 'enum' },
    { symbol: 'worksheet_status', dataType: 'enum' },
    { symbol: 'attest_m104_01_req_02', dataType: 'boolean' },
    { symbol: 'attest_m104_01_req_20', dataType: 'boolean' },
  ],
  'M104-02': [
    { symbol: 'A_E_k_b', dataType: 'number' },
    { symbol: 'A_E_k_nb', dataType: 'number' },
    { symbol: 'A_E_k', dataType: 'number' },
  ],
  'M104-04': [
    { symbol: 'P', dataType: 'number' },
  ],
  'M104-05': [
    { symbol: 'ET_p', dataType: 'number' },
  ],
  'M104-07': [
    { symbol: 'attest_m104_07_req_14', dataType: 'boolean' },
  ],
  'M104-15': [
    // Second real home of the area totals in prod (Flächeninventar — Zusammenfassung).
    // Benign duplicate so the project-wide fallback resolver is exercised.
    { symbol: 'A_E_k_b', dataType: 'number' },
    { symbol: 'A_E_k_nb', dataType: 'number' },
    { symbol: 'A_E_k', dataType: 'number' },
  ],
  'M104-29': [
    { symbol: 'attest_m104_29_req_19', dataType: 'boolean' },
  ],
};

export type M1024Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** "ws:symbol" → field id (fields are per-worksheet, symbols can repeat across ws) */
  fields: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
};

export async function seedM1024(sql: postgres.Sql, userId: string): Promise<M1024Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm1024-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M1024 Harness Org', ${'m1024-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M1024-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-102-4', 'DWA-M 102-4 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const [ws, wsFields] of Object.entries(M1024_FIELDS)) {
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
    for (const f of wsFields) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fields[`${ws}:${f.symbol}`] = row.id;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the gates against their worksheet templates.
  for (const g of M1024_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
