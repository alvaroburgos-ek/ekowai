/**
 * DWA-M 1200-3 (Merkblatt DWA-M 1200-3 — Wasserwiederverwendung Teil 3:
 * Verwendung von aufbereitetem Wasser für die Bewässerung in Landwirtschaft,
 * Gartenbau und Grünflächen; GELBDRUCK / Entwurf, Juli 2025, Frist zur
 * Stellungnahme 30. September 2025) — minimal fixture for the REAL save-path
 * gate-execution-proof harness.
 *
 * GELBDRUCK NOTE: this standard is a draft (Entwurf). Per the campaign's
 * honor-Gelbdruck-defer rule the harness STILL RUNS (execution is the proof),
 * but every finding is PROVISIONAL and NO prod fix is drafted for a deferred
 * health gate. The harness proves the mechanics of the gates AS ENCODED against
 * a disposable embedded Postgres; nothing is applied to prod.
 *
 * PROOF MANDATE: M-1200-3's gate enforcement is claimable ONLY by EXECUTION.
 * This fixture drives every live BLOCK gate (compliance_requirement with
 * severity='block' + a non-empty condition) through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition
 * against the saved values). Each gate is demonstrated BOTH ways — a state that
 * PASSES it and a state that VIOLATES it, reaching a definite `fail` — so a gate
 * that fires but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard DWA-M-1200-3 =
 * d3d8fbe3-a2a0-480e-be10-c9cab95dd0fd, project vadsmshzebefjreqcicl, this
 * session): 25 worksheet_templates (M12003-01 … M12003-25); 32
 * compliance_requirements (8 severity='block' with a non-empty condition, the
 * rest warn or empty-condition); 10 equations (5 distinct helper formulas
 * duplicated across host + consumer worksheets).
 *
 * SINGLE-HOME TOPOLOGY (load-bearing — mirrors prod's cross-worksheet fallback):
 *   In prod several gate symbols live on TWO worksheets (e.g. `gueteklasse` on
 *   M12003-01, `desinfektion_methode` on M12003-07 AND M12003-22). Each symbol is
 *   seeded EXACTLY ONCE, on the SYMBOL_HOME worksheet below. A gate whose symbol
 *   is a field on its OWN worksheet resolves it locally; a gate on ANOTHER
 *   worksheet resolves it via the conflict-free project-wide fallback
 *   (approval-gate.ts buildFallbackValues / makeGateLookup). Two of the eight
 *   block gates exercise that fallback path:
 *     - CR-06@M12003-05 reads `gueteklasse` from its M12003-01 home (fallback);
 *       `speichertyp` is local.
 *     - CR-14@M12003-08 reads BOTH `desinfektion_methode` (M12003-07 home) and
 *       `abstand_oberflaechengewaesser_eingehalten` (M12003-05 home) via fallback.
 *
 * DUPLICATE CODES are real prod state and are BOTH driven, never de-duped:
 *   - CR-06 / CR-06-2 on M12003-05 (identical condition).
 *   - CR-10 appears on M12003-06 AND M12003-19 with DIFFERENT symbols
 *     (attest_m12003_06_cr_10 vs attest_m12003_19_cr_10) — gates are therefore
 *     keyed by `${code}@${ws}`, not code alone.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum';

/** Single home worksheet per gate symbol (verbatim data_type from prod fields). */
export const SYMBOL_HOME: Record<string, { ws: string; dataType: DType }> = {
  // CR-01 (M12003-01, local)
  wasserquelle_typ: { ws: 'M12003-01', dataType: 'enum' },
  // CR-06 (M12003-05): speichertyp local, gueteklasse via fallback from M12003-01
  speichertyp: { ws: 'M12003-05', dataType: 'enum' },
  gueteklasse: { ws: 'M12003-01', dataType: 'enum' },
  // CR-17-2 (M12003-05, all local)
  volumenverlust_pct: { ws: 'M12003-05', dataType: 'number' },
  druckabfall_unbeabsichtigt: { ws: 'M12003-05', dataType: 'boolean' },
  abschaltung_automatisch: { ws: 'M12003-05', dataType: 'boolean' },
  // CR-18-2 (M12003-05, all local)
  schwermetall_fracht_pa: { ws: 'M12003-05', dataType: 'number' },
  bbodschv_anlage1_tab3: { ws: 'M12003-05', dataType: 'number' },
  // CR-10 @ M12003-06 (local)
  attest_m12003_06_cr_10: { ws: 'M12003-06', dataType: 'boolean' },
  // CR-14 (M12003-08): both symbols via fallback
  desinfektion_methode: { ws: 'M12003-07', dataType: 'enum' },
  abstand_oberflaechengewaesser_eingehalten: { ws: 'M12003-05', dataType: 'boolean' },
  // CR-10 @ M12003-19 (local)
  attest_m12003_19_cr_10: { ws: 'M12003-19', dataType: 'boolean' },
};

/** Worksheets that must exist as instances (gate homes + symbol homes). */
export const M12003_WORKSHEETS = [
  'M12003-01', 'M12003-05', 'M12003-06', 'M12003-07', 'M12003-08', 'M12003-19',
] as const;

/** All 8 live BLOCK gates (severity='block', non-empty condition), verbatim from
 *  prod compliance_requirements (worksheet_template.code, code, condition,
 *  severity). Keyed for the harness by `${code}@${ws}` because CR-06/CR-06-2 and
 *  the two CR-10 rows collide on code. */
export const M12003_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  { ws: 'M12003-01', code: 'CR-01', cond: "wasserquelle_typ == 'kommunal_haeuslich'", sev: 'block' },
  { ws: 'M12003-05', code: 'CR-06', cond: "speichertyp == 'geschlossen' OR (speichertyp == 'offen' AND gueteklasse IN {'C', 'C-1', 'C-2', 'D'}) OR speichertyp == 'transportbehaelter'", sev: 'block' },
  { ws: 'M12003-05', code: 'CR-06-2', cond: "speichertyp == 'geschlossen' OR (speichertyp == 'offen' AND gueteklasse IN {'C', 'C-1', 'C-2', 'D'}) OR speichertyp == 'transportbehaelter'", sev: 'block' },
  { ws: 'M12003-05', code: 'CR-17-2', cond: 'volumenverlust_pct <= 1 AND (druckabfall_unbeabsichtigt == false OR abschaltung_automatisch == true)', sev: 'block' },
  { ws: 'M12003-05', code: 'CR-18-2', cond: 'schwermetall_fracht_pa <= bbodschv_anlage1_tab3 / 3', sev: 'block' },
  { ws: 'M12003-06', code: 'CR-10', cond: 'attest_m12003_06_cr_10 == True', sev: 'block' },
  { ws: 'M12003-08', code: 'CR-14', cond: "NOT (desinfektion_methode IN {'Chlorung', 'H2O2', 'PES'}) OR abstand_oberflaechengewaesser_eingehalten == true", sev: 'block' },
  { ws: 'M12003-19', code: 'CR-10', cond: 'attest_m12003_19_cr_10 == True', sev: 'block' },
] as const;

/** Unique key for a gate — code alone collides (CR-06/-2, the two CR-10 rows). */
export function gateKey(ws: string, code: string): string {
  return `${code}@${ws}`;
}

export type M12003Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  instances: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
  /** symbol → home worksheet code (single-home topology) */
  symbolHome: Record<string, string>;
};

export async function seedM12003(sql: postgres.Sql, userId: string): Promise<M12003Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm12003-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M1200-3 Harness Org', ${'m12003-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M1200-3-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-1200-3', 'DWA-M 1200-3 (harness)', 'harness') RETURNING id`;

  // Group home fields by worksheet.
  const fieldsByWs: Record<string, Array<{ symbol: string; dataType: DType }>> = {};
  for (const ws of M12003_WORKSHEETS) fieldsByWs[ws] = [];
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) {
    fieldsByWs[home.ws].push({ symbol, dataType: home.dataType });
  }

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of M12003_WORKSHEETS) {
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
    for (const f of fieldsByWs[ws]) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the live BLOCK gates against their home worksheet templates.
  for (const g of M12003_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  const symbolHome: Record<string, string> = {};
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) symbolHome[symbol] = home.ws;

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
