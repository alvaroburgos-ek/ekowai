/**
 * DWA-M 1200-1 (Wasserwiederverwendung für landwirtschaftliche und urbane Zwecke
 * in Deutschland — Teil 1: Grundsätze; GELBDRUCK / Entwurf, Juli 2025, Frist zur
 * Stellungnahme 30.09.2025) — minimal fixture for the REAL save-path
 * gate-execution-proof harness.
 *
 * PROVISIONAL — GELBDRUCK. This standard is a DRAFT (Entwurf). The harness runs
 * (execution proof is valuable and re-executable), but EVERY finding is provisional
 * and NO prod fix is drafted for any deferred health/pathogen gate. Conditions are
 * verbatim from prod compliance_requirements (this session); nothing is fixed here.
 *
 * PROOF MANDATE: M-1200-1's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 14 live BLOCK gates (every compliance_requirement
 * with severity='block' + a non-empty condition) through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition against
 * the saved values). Each gate is demonstrated BOTH ways — a state that PASSES it
 * and a state that VIOLATES it, reaching a definite `fail` — so a gate that fires
 * but never enforces (the F-4 lesson) cannot hide.
 *
 * CR-004 TRAP-4 DEAD-BRANCH (health/pathogen gate, PROVISIONAL, demonstrated not
 * fixed): the printed condition chains three unparenthesised guards —
 *   IF klasse=='A' THEN e_coli<=10 AND IF klasse IN {B-1,B-2,C-1,C-2} THEN e_coli<=100 AND IF klasse=='D' THEN e_coli<=10000
 * The engine's parseAtom greedily absorbs everything after the FIRST `THEN` into the
 * class-A guard's body, so the whole condition is a single guard on `klasse=='A'`.
 * For any class B-1/B-2/C-1/C-2/D the outer guard is false → vacuous pass → the
 * E.-coli limit is NEVER enforced. Only class A enforces (e_coli<=10). Both
 * behaviours are demonstrated below. Being a health gate on a Gelbdruck, it is
 * FLAGGED not fixed. Thresholds themselves are FAITHFUL to Tab. 8 (A≤10, B≤100,
 * C≤100, D≤10.000) — the defect is purely the unparenthesised nesting.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing): several gates read symbols that are NOT
 * fields on the gate's own worksheet — resolved by checkApprovalGate's conflict-
 * free project-wide fallback. Every such symbol is given exactly ONE home:
 *   - CR-004/CR-005 on M12001-09 read gueteklasse_zugeordnet (home M12001-08).
 *   - CR-007 on M12001-12 reads gueteklasse_zugeordnet (home M12001-08).
 *   - CR-015 on M12001-15 reads flaechenverzeichnis_vorhanden (home M12001-16) and
 *     anwendungsbereich_kategorie / gueteklasse_zugeordnet / bewaesserungsmethode
 *     (home M12001-08) — NONE local to M12001-15.
 *
 * WARN gates (CR-009, CR-018, CR-020, CR-021) and empty-condition CRs (CR-003,
 * CR-006, CR-012) are severity='warn' and/or blank — checkApprovalGate loads only
 * severity='block' with a real condition, so they are not driven. Recorded as
 * residue, not seeded.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 14 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const M12001_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M12001-02 — Anwendbarkeit / Schutzgebiete (double enum-membership)
  { ws: 'M12001-02', code: 'CR-001', cond: "schutzzone_status IN {'nein'} AND heilquellenschutzgebiet IN {'nein'}", sev: 'block' },
  // M12001-07 — Restrisiko (enum-membership)
  { ws: 'M12001-07', code: 'CR-014', cond: "restrisiko_niveau IN {'sehr_niedrig','niedrig'}", sev: 'block' },
  // M12001-08 — RMP-Zertifizierung (boolean attest == True)
  { ws: 'M12001-08', code: 'CR-016', cond: 'attest_m12001_08_cr_016 == True', sev: 'block' },
  // M12001-09 — E. coli (TRAP-4 unparenthesised triple-guard; klasse via fallback M12001-08)
  { ws: 'M12001-09', code: 'CR-004', cond: "IF gueteklasse_zugeordnet == 'A' THEN e_coli_value <= 10 AND IF gueteklasse_zugeordnet IN {'B-1','B-2','C-1','C-2'} THEN e_coli_value <= 100 AND IF gueteklasse_zugeordnet == 'D' THEN e_coli_value <= 10000", sev: 'block' },
  // M12001-09 — Trübung ≤ 2 NTU for A–C (single guard → ordering; klasse via fallback)
  { ws: 'M12001-09', code: 'CR-005', cond: "IF gueteklasse_zugeordnet IN {'A','B-1','B-2','C-1','C-2'} THEN truebung_value <= 2", sev: 'block' },
  // M12001-09 — PFAS-20 (numeric ordering)
  { ws: 'M12001-09', code: 'CR-013', cond: 'pfas20_value < 100', sev: 'block' },
  // M12001-12 — Routineüberwachungsfrequenz (single guard → enum ==; klasse via fallback)
  { ws: 'M12001-12', code: 'CR-007', cond: "IF gueteklasse_zugeordnet IN {'A','B-1','B-2'} THEN beprobung_frequenz_e_coli == '1x_pro_woche'", sev: 'block' },
  // M12001-12 — Compliance-Quote ≥ 90 % (numeric ordering)
  { ws: 'M12001-12', code: 'CR-008', cond: 'compliance_quote_pct >= 90', sev: 'block' },
  // M12001-14 — Notfallplan + Meldewege (boolean AND boolean)
  { ws: 'M12001-14', code: 'CR-017', cond: 'notfall_verteiler_existent == true AND stoerfall_meldewege == true', sev: 'block' },
  // M12001-15 — Aufbereitungsgenehmigung Pflichtinhalte (boolean)
  { ws: 'M12001-15', code: 'CR-010', cond: 'genehmigungs_inhalt_komplett == true', sev: 'block' },
  // M12001-15 — Aufbringungserlaubnis Pflichtinhalt (boolean AND triple IS NOT NULL; all operands cross-ws)
  { ws: 'M12001-15', code: 'CR-015', cond: 'flaechenverzeichnis_vorhanden == true AND anwendungsbereich_kategorie IS NOT NULL AND gueteklasse_zugeordnet IS NOT NULL AND bewaesserungsmethode IS NOT NULL', sev: 'block' },
  // M12001-15 — Berichtspflicht 2-Jahres (boolean attest == True)
  { ws: 'M12001-15', code: 'CR-019', cond: 'attest_m12001_15_cr_019 == True', sev: 'block' },
  // M12001-16 — Aufbringungserlaubnis beantragt (boolean)
  { ws: 'M12001-16', code: 'CR-011', cond: 'flaechenverzeichnis_vorhanden == true', sev: 'block' },
  // M12001-20 — RMP vollständig (boolean)
  { ws: 'M12001-20', code: 'CR-002', cond: 'rmp_vollstaendig == true', sev: 'block' },
] as const;

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Cross-worksheet gates' operands
 * resolve via the conflict-free project-wide fallback.
 */
export const M12001_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'M12001-02': [
    { symbol: 'schutzzone_status', dataType: 'enum' },
    { symbol: 'heilquellenschutzgebiet', dataType: 'enum' },
  ],
  'M12001-07': [
    { symbol: 'restrisiko_niveau', dataType: 'enum' },
  ],
  'M12001-08': [
    { symbol: 'attest_m12001_08_cr_016', dataType: 'boolean' },
    { symbol: 'gueteklasse_zugeordnet', dataType: 'enum' },
    { symbol: 'anwendungsbereich_kategorie', dataType: 'enum' },
    { symbol: 'bewaesserungsmethode', dataType: 'enum' },
  ],
  'M12001-09': [
    { symbol: 'e_coli_value', dataType: 'number' },
    { symbol: 'truebung_value', dataType: 'number' },
    { symbol: 'pfas20_value', dataType: 'number' },
  ],
  'M12001-12': [
    { symbol: 'beprobung_frequenz_e_coli', dataType: 'enum' },
    { symbol: 'compliance_quote_pct', dataType: 'number' },
  ],
  'M12001-14': [
    { symbol: 'notfall_verteiler_existent', dataType: 'boolean' },
    { symbol: 'stoerfall_meldewege', dataType: 'boolean' },
  ],
  'M12001-15': [
    { symbol: 'genehmigungs_inhalt_komplett', dataType: 'boolean' },
    { symbol: 'attest_m12001_15_cr_019', dataType: 'boolean' },
  ],
  'M12001-16': [
    { symbol: 'flaechenverzeichnis_vorhanden', dataType: 'boolean' },
  ],
  'M12001-20': [
    { symbol: 'rmp_vollstaendig', dataType: 'boolean' },
  ],
};

export type M12001Fixture = {
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

export async function seedM12001(sql: postgres.Sql, userId: string): Promise<M12001Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm1200-1-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M1200-1 Harness Org', ${'m12001-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M1200-1-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-1200-1', 'DWA-M 1200-1 (harness, Gelbdruck)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const [ws, wsFields] of Object.entries(M12001_FIELDS)) {
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
  for (const g of M12001_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
