/**
 * DWA-M 187 (Retentionsbodenfilteranlagen — Sonderanwendungen, Hinweise und
 * Beispiele; GELBDRUCK / Entwurf, September 2025, Frist 30.11.2025) — minimal
 * fixture for the REAL save-path gate-execution-proof harness.
 *
 * PROOF MANDATE: M-187's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 13 live BLOCK gates (every compliance_requirement
 * with severity='block' + a non-empty condition) through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition against
 * the saved values). Each gate is demonstrated BOTH ways — a state that PASSES it
 * and a state that VIOLATES it, reaching a definite `fail` — so a gate that fires
 * but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard DWA-M-187, this session):
 *   - 25 worksheet_templates (M187-01 … M187-25); the fixture seeds the 6 that
 *     host a BLOCK gate (M187-01, M187-04, M187-05, M187-06, M187-08, M187-09)
 *     plus M187-07 (hosts REQ-03/REQ-04 but owns NO local fields — its operands
 *     resolve entirely via the project-wide cross-worksheet fallback).
 *   - Conditions + severities verbatim from prod compliance_requirements.
 *   - Gate thresholds all source-verified FAITHFUL against the Gelbdruck this
 *     session (h_FK≥1,00 m §5.1.3.2 / β≥4 §5.1.3.1a / q_Dr,RBF≤0,03 §5.2 /
 *     q_Dr,RBF=0,01 §5.3.3.1 / CSB≤20 & 750 m²/ha & q_krit=60 & q_A,max=4 §5.4.3-4 /
 *     A_b,a<1 ha §5.5.1 & A_F=1,0 % & A_F≥1,0 m² & h_RR≥0,2 & h_RBF≥0,6 & h_Drän≥0,1 §5.5.4).
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing here): several gates read symbols that
 * are NOT fields on the gate's own worksheet — resolved by checkApprovalGate's
 * conflict-free project-wide fallback. Every symbol is given exactly ONE home
 * worksheet so the fallback never conflicts:
 *   - M187-06 REQ-04 reads h_FK (home M187-05) via fallback.
 *   - M187-07 REQ-03 reads q_Dr_RBF (home M187-06) via fallback.
 *   - M187-07 REQ-04 reads q_Dr_RBF (M187-06) AND h_FK (M187-05), both via fallback.
 *
 * DUPLICATE GATES (R-2 lead confirmed): REQ-05-2 (M187-08) is byte-identical to
 * REQ-05; REQ-06-2 (M187-09) is byte-identical to REQ-06. Both stray dups are
 * seeded and driven so the harness proves BOTH copies fire for one violation
 * (documented, NOT destructively deduped — a topology change is owner-gated).
 *
 * WARN gates REQ-08 (M187-10 condition 'engineer-verified'; M187-23 empty) are
 * severity='warn' — checkApprovalGate loads only severity='block', so they are
 * not driven (nothing to enforce). Recorded as residue, not seeded.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 13 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const M187_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M187-01 Anwendungsbereich — applicability enum membership (§1/§5)
  { ws: 'M187-01', code: 'REQ-01', cond: 'sonderanwendung IN {p_rueckhalt,spurenstoffe,mikroorganismen,organische_belastung,klein_rbf}', sev: 'block' },
  // M187-04 Abkürzungen/Formelzeichen — Grundvoraussetzungen-Betrieb attestation (§4)
  { ws: 'M187-04', code: 'REQ-07', cond: 'attest_m187_04_req_07 == True', sev: 'block' },
  // M187-05 Verfahrenstechnische Grundlagen — P-Rückhalt Bemessung + attestation
  { ws: 'M187-05', code: 'REQ-02', cond: 'h_FK >= 1.0', sev: 'block' },
  { ws: 'M187-05', code: 'REQ-02-2', cond: 'beta_wert >= 4', sev: 'block' },
  { ws: 'M187-05', code: 'REQ-07', cond: 'attest_m187_05_req_07 == True', sev: 'block' },
  // M187-06 P-Rückhalt Übersicht — Spurenstoff (§5.2) + Mikroorganismen (§5.3.3.1) drossel gates
  { ws: 'M187-06', code: 'REQ-03', cond: 'q_Dr_RBF <= 0.03', sev: 'block' },
  { ws: 'M187-06', code: 'REQ-04', cond: 'q_Dr_RBF == 0.01 AND h_FK >= 1.0', sev: 'block' },
  // M187-07 — SAME two gates, but this worksheet owns NO fields → pure fallback resolution
  { ws: 'M187-07', code: 'REQ-03', cond: 'q_Dr_RBF <= 0.03', sev: 'block' },
  { ws: 'M187-07', code: 'REQ-04', cond: 'q_Dr_RBF == 0.01 AND h_FK >= 1.0', sev: 'block' },
  // M187-08 hohe organische Belastung (§5.4.3/5.4.4) — 4-term AND + its byte-identical stray dup
  { ws: 'M187-08', code: 'REQ-05', cond: 'B_CSB <= 20 AND A_F_pro_AEb >= 750 AND q_krit == 60 AND q_A_max <= 4', sev: 'block' },
  { ws: 'M187-08', code: 'REQ-05-2', cond: 'B_CSB <= 20 AND A_F_pro_AEb >= 750 AND q_krit == 60 AND q_A_max <= 4', sev: 'block' },
  // M187-09 Klein-RBF (§5.5.4/5.5.1) — 6-term AND + its byte-identical stray dup
  { ws: 'M187-09', code: 'REQ-06', cond: 'A_b_a < 1 AND A_F_anteil_Aba == 1.0 AND A_F >= 1.0 AND h_RR >= 0.2 AND h_RBF >= 0.6 AND h_Draen >= 0.1', sev: 'block' },
  { ws: 'M187-09', code: 'REQ-06-2', cond: 'A_b_a < 1 AND A_F_anteil_Aba == 1.0 AND A_F >= 1.0 AND h_RR >= 0.2 AND h_RBF >= 0.6 AND h_Draen >= 0.1', sev: 'block' },
] as const;

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). M187-07 owns no fields: its
 * REQ-03/REQ-04 operands resolve via the conflict-free project-wide fallback.
 */
export const M187_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'M187-01': [
    { symbol: 'sonderanwendung', dataType: 'enum' },
  ],
  'M187-04': [
    { symbol: 'attest_m187_04_req_07', dataType: 'boolean' },
  ],
  'M187-05': [
    { symbol: 'h_FK', dataType: 'number' },
    { symbol: 'beta_wert', dataType: 'number' },
    { symbol: 'attest_m187_05_req_07', dataType: 'boolean' },
  ],
  'M187-06': [
    { symbol: 'q_Dr_RBF', dataType: 'number' },
  ],
  'M187-07': [
    // intentionally empty — gate operands resolve via cross-worksheet fallback
  ],
  'M187-08': [
    { symbol: 'B_CSB', dataType: 'number' },
    { symbol: 'A_F_pro_AEb', dataType: 'number' },
    { symbol: 'q_krit', dataType: 'number' },
    { symbol: 'q_A_max', dataType: 'number' },
  ],
  'M187-09': [
    { symbol: 'A_b_a', dataType: 'number' },
    { symbol: 'A_F_anteil_Aba', dataType: 'number' },
    { symbol: 'A_F', dataType: 'number' },
    { symbol: 'h_RR', dataType: 'number' },
    { symbol: 'h_RBF', dataType: 'number' },
    { symbol: 'h_Draen', dataType: 'number' },
  ],
};

export type M187Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** "ws:symbol" → field id */
  fields: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
};

export async function seedM187(sql: postgres.Sql, userId: string): Promise<M187Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm187-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M187 Harness Org', ${'m187-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M187-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-187', 'DWA-M 187 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const [ws, wsFields] of Object.entries(M187_FIELDS)) {
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

  // Seed the gates against their home worksheet templates.
  for (const g of M187_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
