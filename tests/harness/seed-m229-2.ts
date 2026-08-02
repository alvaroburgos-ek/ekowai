/**
 * DWA-M 229-2 ("Systeme zur Belüftung und Durchmischung von Belebungsanlagen -
 * Teil 2: Betrieb"; Merkblatt DWA-M 229-2, September 2017) — minimal fixture for
 * the REAL save-path gate-execution-proof harness.
 *
 * SOURCE STATUS: the DWA-M-229-2 source PDF is NOT in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\ has no DWA-M-229-2 folder). This is therefore
 * an ENFORCEMENT proof only — it proves each live BLOCK gate enforces BOTH ways
 * through the real save path. It does NOT and cannot verify any threshold against a
 * source. The conditions are pulled verbatim from prod compliance_requirements
 * (standard DWA-M-229-2 = 96aa8264-662c-4b0d-8749-6faca0860488, project
 * vadsmshzebefjreqcicl, this session); no threshold is asserted to be "correct".
 *
 * PROOF MANDATE: M-229-2's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 19 live BLOCK gates (every compliance_requirement
 * with severity='block' + a non-empty condition) through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition against
 * the saved values). Each gate is demonstrated BOTH ways — a state that PASSES it
 * and a state that VIOLATES it, reaching a definite `fail` — so a gate that fires
 * but never enforces (the F-4 lesson) cannot hide.
 *
 * TOPOLOGY (verbatim from prod): 8 worksheet_templates (M2292-01 … M2292-08), 65
 * active fields, 12 equations, 20 compliance_requirements — 19 are severity='block'
 * with a non-empty condition; the ONE remaining CR (CR-014
 * `energieverbrauch_abweichung >= -10 AND … <= 10`, home M2292-06) is severity='warn'
 * and is intentionally NOT seeded (warn gates do not enter the approval-gate
 * failingBlockConditions list — proving it would prove nothing about enforcement).
 * The fixture seeds all 8 worksheets; each gate operand is homed on exactly ONE
 * worksheet (single-home topology, mirrors prod fields), so the project-wide fallback
 * in checkApprovalGate resolves the cross-worksheet operand without conflict.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing) — exactly ONE gate reads an operand entered
 * on a DIFFERENT worksheet, resolved via the conflict-free project-wide fallback:
 *   - CR-003 @ M2292-02 reads `T` (temperature; home M2292-01). Its other four
 *     conjuncts (o2_gehalt / P_Gebl / p_R / laufzeit_drucklufterzeuger) are local to
 *     M2292-02. All 19 other gate operands are local to the gate's own worksheet.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod
 * fields — NONE of the 4 known engine traps are present in M-229-2):
 *   1. bare-ident-RHS `field == field` / `field != field`: NONE. Every `==` RHS is a
 *      boolean literal — `false` (CR-002) or `true` (CR-009/018/019). No `!=` gate
 *      exists at all.
 *   2. `!= null` / `== null` block gate: NONE. Every existence gate uses the
 *      `IS NOT NULL` form (the `exists` path → reaches a definite fail).
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. M-229-2 has no membership block gate.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. M-229-2 has
 *      no IF/THEN block gate at all; every gate is a comparison, existence, boolean
 *      equality, or a flat AND of those — all parse unambiguously.
 *   TRUE-condition no-op block gate: NONE. No gate's condition is the literal `TRUE`;
 *      every gate references at least one field and reaches a definite fail when
 *      violated (proven below).
 *
 * NOTABLE SHAPE — CR-002 `anlagentyp_membranbelebung == false`: a boolean-equality
 * gate against the literal `false` (not `true`). The passing state persists the
 * boolean value `false`; saveWorksheet writes valueBoolean=false (worksheet.ts:
 * `case 'boolean': valueColumns.valueBoolean = incoming.value`), and the gate read
 * extracts it as `false` (approval-gate.ts extractValue: `p.valueBoolean != null ?
 * p.valueBoolean : undefined`) — so `false == false` PASSES and `true == false`
 * reaches a definite fail. Driven both ways below.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 * Nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate operand on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). The cross-worksheet operand `T`
 * (read by CR-003 @ M2292-02) is homed on M2292-01 and resolves via the
 * conflict-free project-wide fallback.
 */
export const M2292_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'M2292-01': [
    { symbol: 'TS_BB', dataType: 'number' },
    { symbol: 'anlagentyp_membranbelebung', dataType: 'boolean' },
    { symbol: 'T', dataType: 'number' }, // read cross-worksheet by CR-003 @ M2292-02
  ],
  'M2292-02': [
    { symbol: 'o2_gehalt', dataType: 'number' },
    { symbol: 'P_Gebl', dataType: 'number' },
    { symbol: 'p_R', dataType: 'number' },
    { symbol: 'laufzeit_drucklufterzeuger', dataType: 'number' },
    { symbol: 'druckverlust_rohrleitung', dataType: 'number' },
    { symbol: 'rueckschlag_druckverlust', dataType: 'number' },
  ],
  'M2292-03': [
    { symbol: 'instandhaltungsart', dataType: 'enum' },
    { symbol: 'flexing_druckabsenkung', dataType: 'number' },
    { symbol: 'reinigungsverfahren', dataType: 'enum' },
  ],
  'M2292-04': [
    { symbol: 'leitwand_montiert', dataType: 'boolean' },
    { symbol: 'leistungsdichte_ruehrwerk', dataType: 'number' },
  ],
  'M2292-05': [
    { symbol: 'o2_min_p_elimination', dataType: 'number' },
    { symbol: 'o2_min_winter_stabilisierung', dataType: 'number' },
    { symbol: 'o2_sollkonzentration', dataType: 'number' },
  ],
  'M2292-06': [
    { symbol: 'E_Bel', dataType: 'number' },
    { symbol: 'EW_CSB', dataType: 'number' },
    { symbol: 'energieverbrauch_abweichung', dataType: 'number' },
  ],
  'M2292-07': [
    { symbol: 'dp_Bel_neu', dataType: 'number' },
    { symbol: 'dp_Bel_alt', dataType: 'number' },
    { symbol: 'SSOTR_neu', dataType: 'number' },
    { symbol: 'SSOTR_alt', dataType: 'number' },
  ],
  'M2292-08': [
    { symbol: 'dichtheit_ok', dataType: 'boolean' },
    { symbol: 'personal_sicherheitsunterweisung', dataType: 'boolean' },
  ],
};

/** Worksheets to instantiate (all 8 — gate homes + field homes). */
export const M2292_WORKSHEETS = [
  'M2292-01', 'M2292-02', 'M2292-03', 'M2292-04',
  'M2292-05', 'M2292-06', 'M2292-07', 'M2292-08',
] as const;

/** All 19 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements.
 *  CR-014 (warn) is deliberately excluded — see the file header. */
export const M2292_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M2292-01 — Anmeldung, Geltungsbereich und Systemwahl
  { ws: 'M2292-01', code: 'CR-001', cond: 'TS_BB >= 2 AND TS_BB <= 5', sev: 'block' },
  { ws: 'M2292-01', code: 'CR-002', cond: 'anlagentyp_membranbelebung == false', sev: 'block' },
  // M2292-02 — Druckluftbelüftung – Betrieb und Überwachung
  { ws: 'M2292-02', code: 'CR-003', cond: 'o2_gehalt IS NOT NULL AND T IS NOT NULL AND P_Gebl IS NOT NULL AND p_R IS NOT NULL AND laufzeit_drucklufterzeuger IS NOT NULL', sev: 'block' },
  { ws: 'M2292-02', code: 'CR-004', cond: 'druckverlust_rohrleitung >= 15 AND druckverlust_rohrleitung <= 40', sev: 'block' },
  { ws: 'M2292-02', code: 'CR-005', cond: 'rueckschlag_druckverlust < 15', sev: 'block' },
  // M2292-03 — Druckluftbelüftung – Instandhaltung und Störungen
  { ws: 'M2292-03', code: 'CR-006', cond: 'instandhaltungsart IS NOT NULL', sev: 'block' },
  { ws: 'M2292-03', code: 'CR-007', cond: 'flexing_druckabsenkung <= 50', sev: 'block' },
  { ws: 'M2292-03', code: 'CR-008', cond: 'reinigungsverfahren IS NOT NULL', sev: 'block' },
  // M2292-04 — Oberflächenbelüftung und Durchmischung – Betrieb
  { ws: 'M2292-04', code: 'CR-009', cond: 'leitwand_montiert == true', sev: 'block' },
  { ws: 'M2292-04', code: 'CR-010', cond: 'leistungsdichte_ruehrwerk >= 0.8 AND leistungsdichte_ruehrwerk <= 5', sev: 'block' },
  // M2292-05 — Prozessführung und Automatisierung
  { ws: 'M2292-05', code: 'CR-011', cond: 'o2_min_p_elimination > 0.5', sev: 'block' },
  { ws: 'M2292-05', code: 'CR-012', cond: 'o2_min_winter_stabilisierung > 1', sev: 'block' },
  { ws: 'M2292-05', code: 'CR-017', cond: 'o2_sollkonzentration IS NOT NULL', sev: 'block' },
  // M2292-06 — Energetische Effizienz und Kennzahlen (CR-014 warn excluded)
  { ws: 'M2292-06', code: 'CR-013', cond: 'E_Bel IS NOT NULL AND EW_CSB IS NOT NULL', sev: 'block' },
  { ws: 'M2292-06', code: 'CR-020', cond: 'energieverbrauch_abweichung IS NOT NULL', sev: 'block' },
  // M2292-07 — Wirtschaftlichkeitsvergleich Wartung/Austausch
  { ws: 'M2292-07', code: 'CR-015', cond: 'dp_Bel_neu IS NOT NULL AND dp_Bel_alt IS NOT NULL AND SSOTR_neu IS NOT NULL AND SSOTR_alt IS NOT NULL', sev: 'block' },
  { ws: 'M2292-07', code: 'CR-016', cond: 'SSOTR_alt IS NOT NULL', sev: 'block' },
  // M2292-08 — Druckverluste, Dichtheit, Modellierung und Arbeitssicherheit
  { ws: 'M2292-08', code: 'CR-018', cond: 'dichtheit_ok == true', sev: 'block' },
  { ws: 'M2292-08', code: 'CR-019', cond: 'personal_sicherheitsunterweisung == true', sev: 'block' },
] as const;

export type M2292Fixture = {
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

export async function seedM2292(sql: postgres.Sql, userId: string): Promise<M2292Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm2292-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M2292 Harness Org', ${'m2292-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M2292-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-229-2', 'DWA-M 229-2 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of M2292_WORKSHEETS) {
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
    for (const f of M2292_FIELDS[ws]) {
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

  // Seed the 19 live BLOCK gates against their home worksheet templates.
  for (const g of M2292_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
