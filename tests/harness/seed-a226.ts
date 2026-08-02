/**
 * DWA-A 226 ("Grundsätze für die Abwasserbehandlung in Belebungsanlagen mit
 * gemeinsamer aerober Schlammstabilisierung ab 1.000 Einwohnerwerte",
 * Arbeitsblatt DWA-A 226, August 2009) — minimal fixture for the REAL save-path
 * gate-execution-proof harness.
 *
 * SOURCE STATUS: the DWA-A-226 source PDF is NOT in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\ has no DWA-A-226 folder). This is therefore
 * an ENFORCEMENT proof only — it proves each live BLOCK gate enforces BOTH ways
 * through the real save path. It does NOT and cannot verify any threshold against a
 * source. The conditions are pulled verbatim from prod compliance_requirements
 * (standard DWA-A-226 = 6776b9f9-0129-48fe-80c1-398bc7563bff, project
 * vadsmshzebefjreqcicl, this session); no threshold is asserted to be "correct".
 *
 * PROOF MANDATE: A-226's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 24 live BLOCK gates (every compliance_requirement
 * with severity='block' + a non-empty condition) through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition against
 * the saved values). Each gate is demonstrated BOTH ways — a state that PASSES it
 * and a state that VIOLATES it, reaching a definite `fail` — so a gate that fires
 * but never enforces (the F-4 lesson) cannot hide.
 *
 * TOPOLOGY (verbatim from prod): 9 worksheet_templates (A226-01 … A226-09), 87
 * active fields, 28 equations, 24 compliance_requirements — ALL 24 are
 * severity='block' with a non-empty condition. The fixture seeds all 9 worksheets;
 * each gate symbol is homed on exactly ONE worksheet (single-home topology, mirrors
 * prod fields), so the project-wide fallback in checkApprovalGate resolves every
 * cross-worksheet operand without conflict.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing): A226-04 hosts 5 gates but owns NO fields —
 * every operand resolves via the conflict-free project-wide fallback:
 *   - CR-002/003/004/005 read stabilisierungsart (home A226-01) + t_TS/B_TS_BSB
 *     (home A226-05).
 *   - CR-022 reads V_BB (home A226-05) + TS_BB + q_A (home A226-07).
 * A226-06's CR-006 reads stabilisierungsart (home A226-01) cross-worksheet as well.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod
 * enum values — NONE of the 4 known engine traps are present in A-226):
 *   1. bare-ident-RHS `field == field` / `field != field`: NONE. Every `==`/`!=`
 *      RHS is a numeric literal, a quoted enum string, or the boolean literal True.
 *   2. `!= null` / `== null` block gate: NONE. Every existence gate uses the
 *      `IS NOT NULL` form (the `exists` path → reaches a definite fail).
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. A-226 has no membership block gate.
 *      The enum-equality gates compare against 'nitrifikation' /
 *      'nitrifikation_denitrifikation' — EXACT lowercase matches of the prod
 *      stabilisierungsart enum values, so the compares resolve (no case trap).
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. A-226 has
 *      no IF/THEN block gate at all; conditional logic is expressed as OR /
 *      parenthesised AND-of-ORs (CR-002..006), which parse unambiguously.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 * Nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). A226-04 owns no fields: its 5
 * gates' operands resolve via the conflict-free project-wide fallback.
 */
export const A226_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'A226-01': [
    { symbol: 'stabilisierungsart', dataType: 'enum' },
  ],
  'A226-02': [
    { symbol: 'EW_BSB5_60', dataType: 'number' },
    { symbol: 'B_d_BSB', dataType: 'number' },
  ],
  'A226-03': [
    { symbol: 'Q_F', dataType: 'number' },
    { symbol: 'Q_R_Tr', dataType: 'number' },
  ],
  'A226-04': [
    // intentionally empty — CR-002/003/004/005/022 operands resolve via fallback
  ],
  'A226-05': [
    { symbol: 't_TS', dataType: 'number' },
    { symbol: 'B_TS_BSB', dataType: 'number' },
    { symbol: 'V_BB', dataType: 'number' },
  ],
  'A226-06': [
    { symbol: 'O_B', dataType: 'number' },
    { symbol: 't_D', dataType: 'number' },
    { symbol: 't_T', dataType: 'number' },
  ],
  'A226-07': [
    { symbol: 'q_A', dataType: 'number' },
    { symbol: 'q_SV', dataType: 'number' },
    { symbol: 'RV', dataType: 'number' },
    { symbol: 'TS_BB', dataType: 'number' },
  ],
  'A226-08': [
    { symbol: 'durchtrittsweite_rechen', dataType: 'number' },
    { symbol: 'notstromversorgung', dataType: 'boolean' },
    { symbol: 'reservepumpe', dataType: 'boolean' },
    { symbol: 'durchflussmessung', dataType: 'boolean' },
    { symbol: 'stapelzeit_schlamm', dataType: 'number' },
  ],
  'A226-09': [
    { symbol: 'belueftungsanteil', dataType: 'number' },
    { symbol: 'gluehverlust', dataType: 'number' },
    { symbol: 'sauerstoffgehalt_bb', dataType: 'number' },
    { symbol: 'ammonium_ablauf', dataType: 'number' },
    { symbol: 'restsaeurekapazitaet', dataType: 'number' },
  ],
};

/** Worksheets to instantiate (all 9 — gate homes + field homes). */
export const A226_WORKSHEETS = [
  'A226-01', 'A226-02', 'A226-03', 'A226-04', 'A226-05',
  'A226-06', 'A226-07', 'A226-08', 'A226-09',
] as const;

/** All 24 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const A226_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // A226-02 — Bemessungsgrundlagen und Belastungsdaten
  { ws: 'A226-02', code: 'CR-001', cond: 'EW_BSB5_60 >= 1000 AND EW_BSB5_60 <= 5000', sev: 'block' },
  { ws: 'A226-02', code: 'CR-021', cond: 'B_d_BSB IS NOT NULL', sev: 'block' },
  // A226-03 — Hydraulische Bemessung
  { ws: 'A226-03', code: 'CR-023', cond: 'Q_F IS NOT NULL AND Q_R_Tr IS NOT NULL', sev: 'block' },
  // A226-04 — Überschussschlammproduktion (NO local fields → all via fallback)
  { ws: 'A226-04', code: 'CR-002', cond: "stabilisierungsart != 'nitrifikation' OR t_TS >= 20", sev: 'block' },
  { ws: 'A226-04', code: 'CR-003', cond: "stabilisierungsart != 'nitrifikation_denitrifikation' OR t_TS >= 25", sev: 'block' },
  { ws: 'A226-04', code: 'CR-004', cond: "stabilisierungsart != 'nitrifikation' OR B_TS_BSB <= 0.05", sev: 'block' },
  { ws: 'A226-04', code: 'CR-005', cond: "stabilisierungsart != 'nitrifikation_denitrifikation' OR B_TS_BSB <= 0.04", sev: 'block' },
  { ws: 'A226-04', code: 'CR-022', cond: 'V_BB IS NOT NULL AND TS_BB IS NOT NULL AND q_A IS NOT NULL', sev: 'block' },
  // A226-06 — Belüftung und Sauerstoffzufuhr (parenthesised AND-of-ORs; arithmetic ratio)
  { ws: 'A226-06', code: 'CR-006', cond: "(stabilisierungsart == 'nitrifikation' AND O_B >= 3) OR (stabilisierungsart == 'nitrifikation_denitrifikation' AND O_B >= 2.5)", sev: 'block' },
  { ws: 'A226-06', code: 'CR-007', cond: 't_D / t_T <= 0.35', sev: 'block' },
  { ws: 'A226-06', code: 'CR-024', cond: 't_T IS NOT NULL', sev: 'block' },
  // A226-07 — Bemessung der Nachklärung
  { ws: 'A226-07', code: 'CR-009', cond: 'q_SV <= 650', sev: 'block' },
  { ws: 'A226-07', code: 'CR-010', cond: 'q_A <= 2', sev: 'block' },
  { ws: 'A226-07', code: 'CR-011', cond: 'RV <= 1', sev: 'block' },
  // A226-08 — Baugrundsätze und Schlammbehandlung
  { ws: 'A226-08', code: 'CR-016', cond: 'durchtrittsweite_rechen >= 3 AND durchtrittsweite_rechen <= 8', sev: 'block' },
  { ws: 'A226-08', code: 'CR-017', cond: 'notstromversorgung == True', sev: 'block' },
  { ws: 'A226-08', code: 'CR-018', cond: 'reservepumpe IS NOT NULL', sev: 'block' },
  { ws: 'A226-08', code: 'CR-019', cond: 'durchflussmessung == True', sev: 'block' },
  { ws: 'A226-08', code: 'CR-020', cond: 'stapelzeit_schlamm >= 1', sev: 'block' },
  // A226-09 — Betrieb und Nachweise
  { ws: 'A226-09', code: 'CR-008', cond: 'belueftungsanteil >= 65', sev: 'block' },
  { ws: 'A226-09', code: 'CR-012', cond: 'gluehverlust <= 55', sev: 'block' },
  { ws: 'A226-09', code: 'CR-013', cond: 'sauerstoffgehalt_bb >= 1.5', sev: 'block' },
  { ws: 'A226-09', code: 'CR-014', cond: 'ammonium_ablauf < 1', sev: 'block' },
  { ws: 'A226-09', code: 'CR-015', cond: 'restsaeurekapazitaet >= 1.5', sev: 'block' },
] as const;

export type A226Fixture = {
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

export async function seedA226(sql: postgres.Sql, userId: string): Promise<A226Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'a226-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('A226 Harness Org', ${'a226-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'A226-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-A-226', 'DWA-A 226 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of A226_WORKSHEETS) {
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
    for (const f of A226_FIELDS[ws]) {
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

  // Seed the 24 live BLOCK gates against their home worksheet templates.
  for (const g of A226_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
