/**
 * DWA-M-760 (Merkblatt DWA-M 760 — Fetthaltiges Abwasser; Weißdruck, April 2025,
 * 1. Auflage) — minimal fixture for the REAL save-path gate-execution-proof harness.
 *
 * PROOF MANDATE: M-760's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's live BLOCK gates (every compliance_requirement with
 * severity='block' + a non-empty condition) through the REAL `saveWorksheet` (values
 * persist to project_parameters) and the REAL `checkApprovalGate` (the engineer-approve
 * enforcement read path that replays each block condition against the saved values).
 * Each gate is demonstrated BOTH ways — a state that PASSES it and a state that
 * VIOLATES it, reaching a definite `fail` — so a gate that fires but never enforces
 * (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard DWA-M-760, project vadsmshzebefjreqcicl,
 * this session):
 *   - 25 worksheet_templates (M760-01 … M760-25); the fixture seeds the 7 that host a
 *     live BLOCK gate PLUS the field-home worksheets those gates read from:
 *     M760-01, M760-04, M760-08, M760-10, M760-15, M760-18, M760-19.
 *   - 7 live BLOCK gates with a non-empty condition (verbatim from prod
 *     compliance_requirements). NOTE two duplicate-code pairs are real prod state and
 *     are BOTH driven, not de-duped: REQ-M760-08 / REQ-M760-08-2 (identical condition
 *     on M760-08). REQ-M760-10 appears on TWO worksheets (M760-10 and M760-19) with
 *     DIFFERENT conditions — the G8 dup-code finding; each is scoped to its own
 *     worksheet by checkApprovalGate, so both are driven independently.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing here, exactly as in prod):
 *   - REQ-M760-09 lives on M760-18 but reads `ns_fettabscheider` + `bauform_fa`, which
 *     are NOT fields on M760-18 (their homes are M760-15 / M760-09 / M760-13). The gate
 *     resolves them via the conflict-free project-wide fallback. The fixture seeds them
 *     on M760-15 so the fallback resolver is exercised.
 *   - REQ-M760-10 on M760-19 reads `entleerintervall_d`, `wartung_intervall_a`,
 *     `generalinspektion_intervall_a` — none local to M760-19; seeded on M760-10.
 *
 * DRAFT-FIX gate (NOT live in prod — the headline SEV-1 gap):
 *   - REQ-M760-13 (`ns_fettabscheider - NS >= 0`) is the drafted enforcing sizing gate
 *     from scripts/migrations/20260708210000_dwa_m_760_gate_enforcement.sql, which is
 *     WRITTEN-NOT-APPLIED — prod carries NO enforcing ns >= NS gate. It is seeded here
 *     ONLY to PROVE the drafted fix would enforce (subtraction/arithmetic form → numeric
 *     acompare) AND to demonstrate the gap: the live presence-only REQ-M760-09 passes an
 *     undersized separator (ns < NS) that REQ-M760-13 blocks. Clearly segregated as a
 *     draft — it is NOT part of prod's live-gate set.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 7 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const M760_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M760-01 Projektregistrierung — applicability (two existence checks)
  { ws: 'M760-01', code: 'REQ-M760-01', cond: 'branchentyp IS NOT NULL AND einleitungsart IS NOT NULL', sev: 'block' },
  // M760-04 — legal-framework limits (Tab.3 / DWA-M 115-2): pH band, temperature, AOX, lipophilic, settleable
  { ws: 'M760-04', code: 'REQ-M760-04', cond: 'ph_wert >= 6.5 AND ph_wert <= 10 AND t_abwasser <= 35 AND c_aox <= 1 AND c_lipophil <= 300 AND sed_stoffe <= 10', sev: 'block' },
  // M760-08 — H2S workplace limit (AGW 5 ppm über 8 h, §8.2.8 / p.55). DUPLICATE gate pair (both live).
  { ws: 'M760-08', code: 'REQ-M760-08', cond: 'c_h2s_ppm <= 5', sev: 'block' },
  { ws: 'M760-08', code: 'REQ-M760-08-2', cond: 'c_h2s_ppm <= 5', sev: 'block' },
  // M760-10 — Praxishinweise: emptying interval + general-inspection interval
  { ws: 'M760-10', code: 'REQ-M760-10', cond: 'entleerintervall_d <= 30 AND generalinspektion_intervall_a <= 5', sev: 'block' },
  // M760-18 — Behandlungsverfahren: PRESENCE-only sizing gate (cross-ws fallback). NOT ns >= NS.
  { ws: 'M760-18', code: 'REQ-M760-09', cond: 'ns_fettabscheider IS NOT NULL AND bauform_fa IS NOT NULL', sev: 'block' },
  // M760-19 — Bau und Einbau: emptying + maintenance + general-inspection intervals (cross-ws fallback)
  { ws: 'M760-19', code: 'REQ-M760-10', cond: 'entleerintervall_d <= 30 AND wartung_intervall_a <= 1 AND generalinspektion_intervall_a <= 5', sev: 'block' },
] as const;

/** DRAFT enforcing sizing gate — WRITTEN-NOT-APPLIED in prod. Seeded to prove the
 *  drafted fix enforces (subtraction/acompare form) and to expose the live gap. */
export const M760_DRAFT_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  { ws: 'M760-15', code: 'REQ-M760-13', cond: 'ns_fettabscheider - NS >= 0', sev: 'block' },
] as const;

/**
 * Fields to seed per worksheet — each gate symbol on a home worksheet (symbol +
 * data_type verbatim from prod). M760-18 and M760-19 host gates but NO local fields
 * (their gate symbols resolve via the project-wide fallback), so they carry empty
 * arrays — the seed still creates their template + instance.
 */
export const M760_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'M760-01': [
    { symbol: 'branchentyp', dataType: 'enum' },
    { symbol: 'einleitungsart', dataType: 'enum' },
  ],
  'M760-04': [
    { symbol: 'ph_wert', dataType: 'number' },
    { symbol: 't_abwasser', dataType: 'number' },
    { symbol: 'c_aox', dataType: 'number' },
    { symbol: 'c_lipophil', dataType: 'number' },
    { symbol: 'sed_stoffe', dataType: 'number' },
  ],
  'M760-08': [
    { symbol: 'c_h2s_ppm', dataType: 'number' },
  ],
  'M760-10': [
    { symbol: 'entleerintervall_d', dataType: 'number' },
    { symbol: 'generalinspektion_intervall_a', dataType: 'number' },
    { symbol: 'wartung_intervall_a', dataType: 'number' },
  ],
  'M760-15': [
    { symbol: 'ns_fettabscheider', dataType: 'number' },
    { symbol: 'NS', dataType: 'number' },
    { symbol: 'bauform_fa', dataType: 'enum' },
  ],
  'M760-18': [],
  'M760-19': [],
};

export type M760Fixture = {
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

export async function seedM760(sql: postgres.Sql, userId: string): Promise<M760Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm760-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M760 Harness Org', ${'m760-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M760-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-760', 'DWA-M 760 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const [ws, wsFields] of Object.entries(M760_FIELDS)) {
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

  // Seed the live gates + the draft sizing gate against their home worksheet templates.
  for (const g of [...M760_GATES, ...M760_DRAFT_GATES]) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
