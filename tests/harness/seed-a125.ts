/**
 * DWA-A 125 ("Rohrvortrieb und verwandte Verfahren"; Arbeitsblatt DWA-A 125,
 * Dezember 2008, korrigierte Fassung September 2020) — minimal fixture for the
 * REAL save-path gate-execution-proof harness.
 *
 * SOURCE STATUS: the DWA-A-125 source PDF is NOT in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\ has no DWA-A-125 / "Rohrvortrieb" folder —
 * verified this session). This is therefore an ENFORCEMENT proof only — it proves
 * each live BLOCK gate enforces BOTH ways through the real save path. It does NOT
 * and cannot verify any threshold against a source. The conditions are pulled
 * verbatim from prod compliance_requirements (standard DWA-A-125 =
 * 1c56c9d4-5a43-4715-8446-73e5b89f290f, project vadsmshzebefjreqcicl, this session);
 * no threshold is asserted to be "correct".
 *
 * PROOF MANDATE: A-125's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 16 live BLOCK gates (every compliance_requirement
 * with severity='block' + a non-empty condition — all 16 CRs of A-125 are block) through
 * the REAL `saveWorksheet` (values persist to project_parameters) and the REAL
 * `checkApprovalGate` (the engineer-approve enforcement read path that replays each
 * block condition against the saved values). Each gate is demonstrated BOTH ways — a
 * state that PASSES it and a state that VIOLATES it, reaching a definite `fail` — so a
 * gate that fires but never enforces (the F-4 lesson) cannot hide.
 *
 * TOPOLOGY (verbatim from prod): 7 worksheet_templates (A125-01 … A125-07), 70
 * active fields, 2 equations, 16 compliance_requirements — ALL 16 severity='block'
 * with a non-empty condition. The fixture seeds all 7 worksheets and only the fields
 * the 16 gates read; each gate symbol is homed on exactly ONE worksheet (single-home
 * topology, mirrors prod fields), so the project-wide fallback in checkApprovalGate
 * resolves every cross-worksheet operand without conflict.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing):
 *   - CR-012 (home A125-06) reads zul_vorpresskraft (home A125-05) cross-worksheet.
 *   - CR-015 (home A125-07) reads sondergelaende (home A125-01) cross-worksheet.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod
 * enum values — NONE of the 4 known engine traps are present in A-125):
 *   1. bare-ident-RHS `field == field` / `field != field`: NONE. Every `==`/`!=` RHS
 *      is the boolean literal `true`/`false` or a quoted enum string ('keiner'). The
 *      three variable-vs-variable compares (CR-002 delta_a<=rechtwinkligkeit_zul,
 *      CR-005 druckuebertragungsring_breite<rohrwanddicke, CR-012
 *      vorpresskraft_gemessen<=zul_vorpresskraft) use ORDERING operators, which
 *      evaluate.ts routes to the numeric `acompare` path (RHS resolved by lookup) —
 *      NOT the legacy string-literal-RHS trap that only afflicts `==`/`!=`.
 *   2. `!= null` / `== null` block gate: NONE. Both existence gates (CR-016, CR-015)
 *      use the `IS NOT NULL` form (the `exists` path → reaches a definite fail).
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. The one membership gate (CR-014)
 *      lists {ral_gz_961, dvgw_gw_301, dvgw_gw_302, gleichwertig} — EXACT lowercase
 *      matches of the prod unternehmen_qualifikation enum values, so members resolve.
 *      >>> NO-OP CAVEAT (logged, not a trap): that IN set is IDENTICAL to the field's
 *          COMPLETE enum domain (all 4 allowed values). Under input-side enum
 *          validation no VALID selection can violate CR-014 → as configured it can
 *          never block a real user. The harness still drives it both ways by storing
 *          an out-of-domain string in the violating state to PROVE the engine's
 *          membership path fails on a non-member — but the enforcement value in prod
 *          is nil. See a125-verify test + the report's TRUE-no-op list.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. A-125 has no
 *      IF/THEN block gate at all; conditional logic is expressed as OR /
 *      parenthesised AND-of-ORs (CR-001, CR-007, CR-011), which parse unambiguously.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 * Nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the operands the 16 gates
 * read are seeded; the other 40+ prod fields are irrelevant to the enforcement proof.
 */
export const A125_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'A125-01': [
    { symbol: 'sondergelaende', dataType: 'enum' }, // CR-015 conjunct (cross-worksheet)
  ],
  'A125-02': [
    { symbol: 'DN', dataType: 'number' },
    { symbol: 'baulaengentoleranz', dataType: 'number' },
    { symbol: 'delta_a', dataType: 'number' },
    { symbol: 'rechtwinkligkeit_zul', dataType: 'number' },
    { symbol: 'scherlast_nachweis', dataType: 'boolean' },
    { symbol: 'dichtheit_betrieb', dataType: 'boolean' },
    { symbol: 'dichtheit_bau', dataType: 'boolean' },
    { symbol: 'druckuebertragungsring_breite', dataType: 'number' },
    { symbol: 'rohrwanddicke', dataType: 'number' },
  ],
  'A125-03': [
    { symbol: 'aufschluss_abstand', dataType: 'number' },
  ],
  'A125-04': [
    { symbol: 'personaleinsatz', dataType: 'enum' },
    { symbol: 'mlm_vortriebslaenge_zul', dataType: 'boolean' },
    { symbol: 'abweichung_vertikal_zul', dataType: 'number' },
    { symbol: 'abweichung_horizontal_zul', dataType: 'number' },
  ],
  'A125-05': [
    { symbol: 'vortriebskraft_nachweis', dataType: 'boolean' },
    { symbol: 'ortsbrust_standsicherheit', dataType: 'boolean' },
    { symbol: 'baugrube_standsicherheit', dataType: 'boolean' },
    { symbol: 'ueberschnitt', dataType: 'number' },
    { symbol: 'zul_vorpresskraft', dataType: 'number' }, // CR-012 RHS (read cross-worksheet from A125-06)
  ],
  'A125-06': [
    { symbol: 'verfahren_steuerbar', dataType: 'boolean' },
    { symbol: 'aufzeichnungsintervall_laenge', dataType: 'number' },
    { symbol: 'aufzeichnungsintervall_zeit', dataType: 'number' },
    { symbol: 'vorpresskraft_gemessen', dataType: 'number' },
  ],
  'A125-07': [
    { symbol: 'gueteueberwachung', dataType: 'boolean' },
    { symbol: 'unternehmen_qualifikation', dataType: 'enum' },
    { symbol: 'sondergelaende_genehmigung', dataType: 'enum' },
  ],
};

/** Worksheets to instantiate (all 7). */
export const A125_WORKSHEETS = [
  'A125-01', 'A125-02', 'A125-03', 'A125-04', 'A125-05', 'A125-06', 'A125-07',
] as const;

/** All 16 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const A125_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // A125-02 — Rohre und Verbindungen (Tab.1/Tab.2, DIN EN 14457, §5.2/§5.3)
  { ws: 'A125-02', code: 'CR-001', cond: '(DN<=800 AND baulaengentoleranz<=5) OR (DN>800 AND DN<=1200 AND baulaengentoleranz<=8) OR (DN>1200)', sev: 'block' },
  { ws: 'A125-02', code: 'CR-002', cond: 'delta_a <= rechtwinkligkeit_zul', sev: 'block' },
  { ws: 'A125-02', code: 'CR-003', cond: 'scherlast_nachweis == true', sev: 'block' },
  { ws: 'A125-02', code: 'CR-004', cond: 'dichtheit_betrieb == true AND dichtheit_bau == true', sev: 'block' },
  { ws: 'A125-02', code: 'CR-005', cond: 'druckuebertragungsring_breite < rohrwanddicke', sev: 'block' },
  // A125-03 — Baugrunderkundung (DIN 4020/18319, Tab.8)
  { ws: 'A125-03', code: 'CR-006', cond: 'aufschluss_abstand <= 50', sev: 'block' },
  // A125-04 — Trassierung / Mindestlichtmass (Tab.9/Tab.10)
  { ws: 'A125-04', code: 'CR-007', cond: "(personaleinsatz=='keiner') OR (mlm_vortriebslaenge_zul == true)", sev: 'block' },
  { ws: 'A125-04', code: 'CR-008', cond: 'abweichung_vertikal_zul > 0 AND abweichung_horizontal_zul > 0', sev: 'block' },
  // A125-05 — Statik / Standsicherheit
  { ws: 'A125-05', code: 'CR-009', cond: 'vortriebskraft_nachweis == true', sev: 'block' },
  { ws: 'A125-05', code: 'CR-010', cond: 'ortsbrust_standsicherheit == true AND baugrube_standsicherheit == true', sev: 'block' },
  { ws: 'A125-05', code: 'CR-016', cond: 'ueberschnitt IS NOT NULL', sev: 'block' },
  // A125-06 — Vortrieb / Protokollierung
  { ws: 'A125-06', code: 'CR-011', cond: '(verfahren_steuerbar==false) OR (aufzeichnungsintervall_laenge<=100 AND aufzeichnungsintervall_zeit<=90)', sev: 'block' },
  { ws: 'A125-06', code: 'CR-012', cond: 'vorpresskraft_gemessen <= zul_vorpresskraft', sev: 'block' },
  // A125-07 — Gueteueberwachung / Qualifikation / Sondergelaende
  { ws: 'A125-07', code: 'CR-013', cond: 'gueteueberwachung == true', sev: 'block' },
  { ws: 'A125-07', code: 'CR-014', cond: 'unternehmen_qualifikation IN {ral_gz_961,dvgw_gw_301,dvgw_gw_302,gleichwertig}', sev: 'block' },
  { ws: 'A125-07', code: 'CR-015', cond: 'sondergelaende IS NOT NULL AND sondergelaende_genehmigung IS NOT NULL', sev: 'block' },
] as const;

export type A125Fixture = {
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

export async function seedA125(sql: postgres.Sql, userId: string): Promise<A125Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'a125-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('A125 Harness Org', ${'a125-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'A125-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-A-125', 'DWA-A 125 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of A125_WORKSHEETS) {
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
    for (const f of A125_FIELDS[ws]) {
      // active=true; is_required deliberately FALSE so the per-gate proof isolates
      // the block-CONDITION path (checkApprovalGate's separate missing-required-field
      // list is not what we are proving here).
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
      symbolHome[f.symbol] = ws;
    }
  }

  // Seed the 16 live BLOCK gates against their home worksheet templates.
  for (const g of A125_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
