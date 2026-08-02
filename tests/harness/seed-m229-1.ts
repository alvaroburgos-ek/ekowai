/**
 * DWA-M 229-1 ("Systeme zur Belüftung und Durchmischung von Belebungsanlagen -
 * Teil 1: Planung, Ausschreibung und Ausführung"; Merkblatt DWA-M 229-1,
 * September 2017, korrigierte Fassung Februar 2021) — minimal fixture for the REAL
 * save-path gate-execution-proof harness.
 *
 * SOURCE STATUS: the DWA-M-229-1 source PDF is NOT in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\ has no DWA-M-229-1 folder — only DWA-M-179-1,
 * DWA-M-187, … exist). This is therefore an ENFORCEMENT proof only — it proves each
 * live BLOCK gate enforces BOTH ways through the real save path. It does NOT and
 * cannot verify any threshold against a source. The conditions are pulled verbatim
 * from prod compliance_requirements (standard DWA-M-229-1 =
 * 97db5c16-79d0-4393-81cf-803df158bdd2, project vadsmshzebefjreqcicl, this session);
 * no threshold is asserted to be "correct".
 *
 * PROOF MANDATE: M-229-1's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 29 live BLOCK gates (every compliance_requirement
 * with severity='block' + a non-empty condition) through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition against
 * the saved values). Each gate is demonstrated BOTH ways — a state that PASSES it
 * and a state that VIOLATES it, reaching a definite `fail` — so a gate that fires
 * but never enforces (the F-4 lesson) cannot hide.
 *
 * TOPOLOGY (verbatim from prod): 10 worksheet_templates (M2291-01 … M2291-10), 151
 * active fields, 47 equations, 29 compliance_requirements — ALL 29 are
 * severity='block' with a non-empty condition. The fixture seeds all 10 worksheets;
 * each gate operand is homed on exactly ONE worksheet (single-home topology, mirrors
 * prod fields), so the project-wide fallback in checkApprovalGate resolves every
 * cross-worksheet operand without conflict. M2291-04 (Dimensionierung
 * Druckluftbelüftung) and M2291-06 (Dimensionierung Oberflächenbelüftung) host no
 * block gate and no gate operand — instantiated empty to mirror prod topology.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing) — four gates read an operand entered on a
 * DIFFERENT worksheet, resolved via the conflict-free project-wide fallback:
 *   - CR-007 @ M2291-03 reads belueftungsart (home M2291-01).
 *   - CR-021 @ M2291-09 reads OV_h_aM        (home M2291-02).
 *   - CR-024 @ M2291-10 reads schub_Ruehr    (home M2291-07).
 *   - CR-025 @ M2291-10 reads jahreskosten   (home M2291-09).
 *
 * CR-018 CAMPAIGN NOTE (R-2 lead, re-verified LIVE this session): the prior-campaign
 * claim that CR-018 was converted to `(NOT beckenform=='kreisringbecken') OR
 * daempfungsplanken==true` is NOT reflected in prod. The LIVE condition is
 * `beckenform == 'kreisringbecken'` (verbatim below), and NO field `daempfungsplanken`
 * exists in the encoding (confirmed: not in the active-field set). The claimed fix is
 * therefore absent from prod — either never landed or reverted (R-2: unverified input).
 * The gate DOES enforce mechanically both ways (kreisringbecken → pass; any other
 * beckenform → block), but its logic is INVERTED relative to its own title
 * ("Dämpfungsplanken in Kreisringbecken"): it makes kreisringbecken the passing state
 * and blocks every other basin, and never checks a damping-plank field at all. That is
 * a JUDGMENT item (a semantic inversion), reported on the sign-off sheet — NOT applied,
 * because the source PDF is absent and the correct condition cannot be source-settled.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod enum
 * values — NONE of the 4 known engine traps are present in M-229-1):
 *   1. bare-ident-RHS `field == field` / `field != field`: NONE. Every `==` RHS is a
 *      numeric literal (CR-020 1.5/2.5), a quoted enum string (CR-018 'kreisringbecken'),
 *      or the boolean literal true (CR-017/023/027). No `!=` gate exists.
 *   2. `!= null` / `== null` block gate: NONE. Every existence gate uses `IS NOT NULL`
 *      (the `exists` path → reaches a definite fail).
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. M-229-1 has no membership block gate.
 *      CR-018's enum equality compares 'kreisringbecken' — the EXACT lowercase prod
 *      beckenform enum value — so it resolves (no case trap).
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. M-229-1 has no
 *      IF/THEN block gate; conditional logic is OR / parenthesised AND-of-ORs (CR-013,
 *      CR-023), which parse unambiguously.
 *   TRUE-condition no-op block gate: NONE.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 * Nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate operand on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). M2291-04 / M2291-06 own no gate
 * operands (empty). Cross-worksheet operands resolve via the conflict-free fallback.
 */
export const M2291_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'M2291-01': [
    { symbol: 'beckenform', dataType: 'enum' },
    { symbol: 'belueftungsart', dataType: 'enum' },
  ],
  'M2291-02': [
    { symbol: 'OV_h_aM', dataType: 'number' },
    { symbol: 'OV_h_max', dataType: 'number' },
    { symbol: 'OV_h_min', dataType: 'number' },
    { symbol: 'OV_h_max_Prog', dataType: 'number' },
  ],
  'M2291-03': [
    { symbol: 'h_BB', dataType: 'number' },
    { symbol: 'alpha', dataType: 'number' },
    { symbol: 'alpha_min', dataType: 'number' },
    { symbol: 'alpha_mittel', dataType: 'number' },
    { symbol: 'alpha_max', dataType: 'number' },
    { symbol: 'C_x', dataType: 'number' },
    { symbol: 'S_TDS_alpha', dataType: 'number' },
    { symbol: 'f_S_alpha', dataType: 'number' },
    { symbol: 'beta_alpha', dataType: 'number' },
    { symbol: 'h_D', dataType: 'number' },
    { symbol: 'ET', dataType: 'number' },
  ],
  'M2291-04': [
    // intentionally empty — no block gate, no gate operand
  ],
  'M2291-05': [
    { symbol: 'h_geo', dataType: 'number' },
    { symbol: 'p_atm', dataType: 'number' },
    { symbol: 'delta_p', dataType: 'number' },
  ],
  'M2291-06': [
    // intentionally empty — no block gate, no gate operand
  ],
  'M2291-07': [
    { symbol: 'TS_BB', dataType: 'number' },
    { symbol: 'ISV', dataType: 'number' },
    { symbol: 'v_bodennah', dataType: 'number' },
    { symbol: 'D_Ruehr', dataType: 'number' },
    { symbol: 'abstand_ruehr_beluefter', dataType: 'number' },
    { symbol: 'schub_Ruehr', dataType: 'number' },
  ],
  'M2291-08': [
    { symbol: 'abstand_beluefter_achse', dataType: 'number' },
    { symbol: 'abstand_walzenbeluefter', dataType: 'number' },
    { symbol: 'leitschild_vorhanden', dataType: 'boolean' },
  ],
  'M2291-09': [
    { symbol: 'nutzungsdauer', dataType: 'number' },
    { symbol: 'wartungssatz_mt', dataType: 'number' },
    { symbol: 'wartungssatz_emsr', dataType: 'number' },
    { symbol: 'energiekosten', dataType: 'number' },
    { symbol: 'realzinssatz', dataType: 'number' },
    { symbol: 'jahreskosten', dataType: 'number' },
  ],
  'M2291-10': [
    { symbol: 'ausbaugroesse_EW', dataType: 'number' },
    { symbol: 'garantie_sauerstoffzufuhr', dataType: 'boolean' },
    { symbol: 'ausschreibungsart', dataType: 'enum' },
    { symbol: 'abnahme_messmedium', dataType: 'enum' },
    { symbol: 'doppelmessung', dataType: 'boolean' },
    { symbol: 'druckueberwachung', dataType: 'boolean' },
    { symbol: 'energiezaehler_belueftung', dataType: 'boolean' },
  ],
};

/** Worksheets to instantiate (all 10 — gate homes + field homes + the two empty ones). */
export const M2291_WORKSHEETS = [
  'M2291-01', 'M2291-02', 'M2291-03', 'M2291-04', 'M2291-05',
  'M2291-06', 'M2291-07', 'M2291-08', 'M2291-09', 'M2291-10',
] as const;

/** All 29 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const M2291_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M2291-01 — Anmeldung, Anwendungsbereich und Systemwahl
  { ws: 'M2291-01', code: 'CR-018', cond: "beckenform == 'kreisringbecken'", sev: 'block' },
  // M2291-02 — Bemessungsgrundlagen und Sauerstoffbedarf
  { ws: 'M2291-02', code: 'CR-003', cond: 'OV_h_aM IS NOT NULL AND OV_h_max IS NOT NULL AND OV_h_min IS NOT NULL AND OV_h_max_Prog IS NOT NULL', sev: 'block' },
  // M2291-03 — Einflussparameter und Kennwerte der Belüftung
  { ws: 'M2291-03', code: 'CR-002', cond: 'h_BB <= 20', sev: 'block' },
  { ws: 'M2291-03', code: 'CR-004', cond: 'alpha IS NOT NULL AND alpha_min IS NOT NULL AND alpha_mittel IS NOT NULL AND alpha_max IS NOT NULL', sev: 'block' },
  { ws: 'M2291-03', code: 'CR-005', cond: 'C_x >= 1 AND C_x <= 2', sev: 'block' },
  { ws: 'M2291-03', code: 'CR-006', cond: 'S_TDS_alpha IS NOT NULL AND f_S_alpha IS NOT NULL AND beta_alpha IS NOT NULL', sev: 'block' },
  { ws: 'M2291-03', code: 'CR-007', cond: 'belueftungsart IS NOT NULL AND f_S_alpha IS NOT NULL', sev: 'block' },
  { ws: 'M2291-03', code: 'CR-011', cond: 'h_D IS NOT NULL', sev: 'block' },
  { ws: 'M2291-03', code: 'CR-012', cond: 'ET <= 0.5', sev: 'block' },
  // M2291-05 — Drucklufterzeuger, Rohrleitungen und Armaturen
  { ws: 'M2291-05', code: 'CR-008', cond: 'h_geo IS NOT NULL AND p_atm IS NOT NULL', sev: 'block' },
  { ws: 'M2291-05', code: 'CR-009', cond: 'delta_p IS NOT NULL', sev: 'block' },
  { ws: 'M2291-05', code: 'CR-010', cond: 'delta_p IS NOT NULL', sev: 'block' },
  // M2291-07 — Durchmischung (Rührwerke)
  { ws: 'M2291-07', code: 'CR-001', cond: 'TS_BB >= 2 AND TS_BB <= 5', sev: 'block' },
  { ws: 'M2291-07', code: 'CR-013', cond: '(ISV > 130 AND TS_BB > 4 AND v_bodennah >= 0.1) OR v_bodennah >= 0.25', sev: 'block' },
  { ws: 'M2291-07', code: 'CR-014', cond: 'D_Ruehr IS NOT NULL AND abstand_ruehr_beluefter IS NOT NULL', sev: 'block' },
  { ws: 'M2291-07', code: 'CR-028', cond: 'schub_Ruehr IS NOT NULL AND ISV IS NOT NULL', sev: 'block' },
  // M2291-08 — Konstruktive Anordnung von Belüftung und Durchmischung
  { ws: 'M2291-08', code: 'CR-015', cond: 'abstand_beluefter_achse <= 500', sev: 'block' },
  { ws: 'M2291-08', code: 'CR-016', cond: 'abstand_walzenbeluefter >= 20', sev: 'block' },
  { ws: 'M2291-08', code: 'CR-017', cond: 'leitschild_vorhanden == true', sev: 'block' },
  // M2291-09 — Wirtschaftlichkeit
  { ws: 'M2291-09', code: 'CR-019', cond: 'nutzungsdauer IS NOT NULL', sev: 'block' },
  { ws: 'M2291-09', code: 'CR-020', cond: 'wartungssatz_mt == 1.5 AND wartungssatz_emsr == 2.5', sev: 'block' },
  { ws: 'M2291-09', code: 'CR-021', cond: 'energiekosten IS NOT NULL AND OV_h_aM IS NOT NULL', sev: 'block' },
  { ws: 'M2291-09', code: 'CR-022', cond: 'realzinssatz >= 2 AND realzinssatz <= 6', sev: 'block' },
  // M2291-10 — Ausschreibung, Vergabe, Abnahme und Überwachung
  { ws: 'M2291-10', code: 'CR-023', cond: 'ausbaugroesse_EW <= 100000 OR garantie_sauerstoffzufuhr == true', sev: 'block' },
  { ws: 'M2291-10', code: 'CR-024', cond: 'garantie_sauerstoffzufuhr IS NOT NULL AND schub_Ruehr IS NOT NULL', sev: 'block' },
  { ws: 'M2291-10', code: 'CR-025', cond: 'ausschreibungsart IS NOT NULL AND jahreskosten IS NOT NULL', sev: 'block' },
  { ws: 'M2291-10', code: 'CR-026', cond: 'abnahme_messmedium IS NOT NULL AND doppelmessung IS NOT NULL', sev: 'block' },
  { ws: 'M2291-10', code: 'CR-027', cond: 'doppelmessung == true', sev: 'block' },
  { ws: 'M2291-10', code: 'CR-029', cond: 'energiezaehler_belueftung IS NOT NULL AND druckueberwachung IS NOT NULL', sev: 'block' },
] as const;

export type M2291Fixture = {
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

export async function seedM2291(sql: postgres.Sql, userId: string): Promise<M2291Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm2291-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M2291 Harness Org', ${'m2291-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M2291-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-229-1', 'DWA-M 229-1 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of M2291_WORKSHEETS) {
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
    for (const f of M2291_FIELDS[ws]) {
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

  // Seed the 29 live BLOCK gates against their home worksheet templates.
  for (const g of M2291_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
