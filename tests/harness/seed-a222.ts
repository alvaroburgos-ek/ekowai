/**
 * DWA-A-222 (Grundsätze für Bemessung, Bau und Betrieb von kleinen Kläranlagen
 * mit aerober biologischer Reinigungsstufe bis 1.000 Einwohnerwerte — Weißdruck,
 * Mai 2011, korrigierte Fassung Oktober 2018) — minimal fixture for the REAL
 * save-path gate-execution-proof harness.
 *
 * PROOF MANDATE: A-222's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 59 live BLOCK gates (every compliance_requirement
 * with severity='block' + a non-empty condition) through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition against
 * the saved values). Each gate is demonstrated BOTH ways — a state that PASSES it
 * and a state that VIOLATES it, reaching a definite `fail` — so a gate that fires
 * but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard 891ab6f3-…, this session):
 *   - 25 worksheet_templates (A222-01 … A222-25); the fixture seeds the 20 that
 *     HOST a BLOCK gate. Symbols + data_types verbatim from prod fields; each gate
 *     symbol seeded on its REAL home worksheet so checkApprovalGate's local +
 *     conflict-free project-wide fallback resolves cross-worksheet gates as in prod.
 *   - Conditions are verbatim from prod compliance_requirements.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing) is exercised by:
 *   - CR-008 (host A222-03) reads V_SB (home A222-08) and V_R (home A222-07).
 *   - CR-022 (host A222-03) reads GK (home A222-01) and mindestanforderungen_abwv_anh1
 *     (home A222-24).
 *   - CR-011/CR-012 (host A222-10) read RV / t_NB (home A222-14).
 *   - CR-013 (host A222-11) reads V_speicher_EWspez (home A222-16).
 *   - CR-036 (host A222-16) reads stromausfallmeldung_netzunabhaengig (home A222-18).
 *
 * WARN gates (CR-028 A222-02, CR-007 A222-07, CR-033 A222-11/A222-16) are severity
 * 'warn' — checkApprovalGate loads only severity='block', so they never block and
 * are not seeded here (recorded as residue, nothing to enforce).
 *
 * PROPOSED gates (A222_PROPOSED_GATES) are the R-2 chosen-vs-required-area fix
 * DRAFT. They are NOT in prod. They are seeded here purely to PROVE the drafted
 * subtraction-form gate enforces both ways through the real save path. The
 * orchestrator applies/commits nothing from this file.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 59 live BLOCK gates (non-empty condition), grouped by host worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const A222_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // A222-01 Projektregistrierung / Anwendungsbereich
  { ws: 'A222-01', code: 'CR-027', cond: "negativliste_geprueft == True AND (mischsystem_ausnahmefall == False OR mischsystem_ausnahmefall == True)", sev: 'block' },
  { ws: 'A222-01', code: 'CR-041', cond: "IF entwaesserungssystem == 'mischsystem' THEN (geltungsbereich == 'oberer' AND mischsystem_ausnahmefall == True)", sev: 'block' },
  { ws: 'A222-01', code: 'CR-042', cond: 'attest_a222_01_cr_042 == True', sev: 'block' },
  { ws: 'A222-01', code: 'CR-043', cond: 'attest_a222_01_cr_043 == True', sev: 'block' },
  // A222-02 Bemessungswerte
  { ws: 'A222-02', code: 'CR-001', cond: 'EW <= 1000', sev: 'block' },
  { ws: 'A222-02', code: 'CR-002', cond: 'w_s_d >= 150', sev: 'block' },
  { ws: 'A222-02', code: 'CR-014', cond: 'm >= 0.5 AND m <= 1', sev: 'block' },
  { ws: 'A222-02', code: 'CR-017', cond: 'TKN_BSB5 <= 0.25', sev: 'block' },
  // A222-03 Vorbehandlung
  { ws: 'A222-03', code: 'CR-003', cond: 't_Aufenthalt_VB >= 2 AND V_VB_EWspez >= 75', sev: 'block' },
  { ws: 'A222-03', code: 'CR-008', cond: 'V_SB <= 0.5 * V_R', sev: 'block' },
  { ws: 'A222-03', code: 'CR-022', cond: "GK == 'gk_1' AND mindestanforderungen_abwv_anh1 == True", sev: 'block' },
  // A222-04 Tropfkörper
  { ws: 'A222-04', code: 'CR-004', cond: 'h_TK >= 2', sev: 'block' },
  { ws: 'A222-04', code: 'CR-020', cond: 'A_TK_spez >= 90 AND A_TK_spez <= 150', sev: 'block' },
  { ws: 'A222-04', code: 'CR-020-2', cond: 'A_TK_spez >= 90 AND A_TK_spez <= 150', sev: 'block' },
  // A222-06 RBC
  { ws: 'A222-06', code: 'CR-005', cond: 'd_Scheibe >= 18', sev: 'block' },
  { ws: 'A222-06', code: 'CR-015', cond: 'n_RT >= 2', sev: 'block' },
  // A222-07 Festbett
  { ws: 'A222-07', code: 'CR-006', cond: 'V_FB <= 0.85 * V_R', sev: 'block' },
  { ws: 'A222-07', code: 'CR-030', cond: 'n_FB_Kaskaden >= 2', sev: 'block' },
  // A222-08 MBBR
  { ws: 'A222-08', code: 'CR-031', cond: 'versuchsbericht_a_sb_spez == True', sev: 'block' },
  { ws: 'A222-08', code: 'CR-032', cond: 'rueckhaltenachweis_aufwuchskoerper == True', sev: 'block' },
  // A222-09 SBR
  { ws: 'A222-09', code: 'CR-009', cond: '(H_W_e - H_W_0) >= 0.40', sev: 'block' },
  { ws: 'A222-09', code: 'CR-016', cond: 'h_max >= 2.3 AND h_max <= 4.2 AND H_W_e >= 1.4 AND H_W_e <= 2.5', sev: 'block' },
  // A222-10 Belebungsbecken häuslich
  { ws: 'A222-10', code: 'CR-011', cond: 'RV >= 1', sev: 'block' },
  { ws: 'A222-10', code: 'CR-012', cond: 't_NB >= 2.5', sev: 'block' },
  { ws: 'A222-10', code: 'CR-018', cond: 'TS_BB <= 4.9', sev: 'block' },
  { ws: 'A222-10', code: 'CR-019', cond: 'C_O >= 2', sev: 'block' },
  // A222-11 Belebungsbecken gewerblich (attestations + Schlammspeicher)
  { ws: 'A222-11', code: 'CR-013', cond: 'V_speicher_EWspez >= 100', sev: 'block' },
  { ws: 'A222-11', code: 'CR-023', cond: 'attest_a222_11_cr_023 == True', sev: 'block' },
  { ws: 'A222-11', code: 'CR-024', cond: 'attest_a222_11_cr_024 == True', sev: 'block' },
  { ws: 'A222-11', code: 'CR-025', cond: 'attest_a222_11_cr_025 == True', sev: 'block' },
  { ws: 'A222-11', code: 'CR-034', cond: 'attest_a222_11_cr_034 == True', sev: 'block' },
  { ws: 'A222-11', code: 'CR-035', cond: 'attest_a222_11_cr_035 == True', sev: 'block' },
  { ws: 'A222-11', code: 'CR-036', cond: 'attest_a222_11_cr_036 == True', sev: 'block' },
  { ws: 'A222-11', code: 'CR-037', cond: 'attest_a222_11_cr_037 == True', sev: 'block' },
  { ws: 'A222-11', code: 'CR-038', cond: 'attest_a222_11_cr_038 == True', sev: 'block' },
  { ws: 'A222-11', code: 'CR-039', cond: 'attest_a222_11_cr_039 == True', sev: 'block' },
  { ws: 'A222-11', code: 'CR-040', cond: 'attest_a222_11_cr_040 == True', sev: 'block' },
  // A222-12 Denitrifikation
  { ws: 'A222-12', code: 'CR-010', cond: 't_D / t_T <= 0.35', sev: 'block' },
  // A222-14 Nachklärbecken
  { ws: 'A222-14', code: 'CR-011', cond: 'RV >= 1', sev: 'block' },
  { ws: 'A222-14', code: 'CR-012', cond: 't_NB >= 2.5', sev: 'block' },
  { ws: 'A222-14', code: 'CR-029', cond: 'RV >= 1', sev: 'block' },
  // A222-16 Schlammspeicher (operational duplicates)
  { ws: 'A222-16', code: 'CR-013', cond: 'V_speicher_EWspez >= 100', sev: 'block' },
  { ws: 'A222-16', code: 'CR-023', cond: 'attest_a222_16_cr_023 == True', sev: 'block' },
  { ws: 'A222-16', code: 'CR-025', cond: 'attest_a222_16_cr_025 == True', sev: 'block' },
  { ws: 'A222-16', code: 'CR-036', cond: 'stoermeldung_vorhanden == True AND stromausfallmeldung_netzunabhaengig == True', sev: 'block' },
  { ws: 'A222-16', code: 'CR-037', cond: 'attest_a222_16_cr_037 == True', sev: 'block' },
  { ws: 'A222-16', code: 'CR-038', cond: 'attest_a222_16_cr_038 == True', sev: 'block' },
  // A222-18 Bauausführung
  { ws: 'A222-18', code: 'CR-021', cond: 'h_OK_freibord >= 0.30', sev: 'block' },
  { ws: 'A222-18', code: 'CR-021-2', cond: 'h_OK >= h_Wasser + 0.30', sev: 'block' },
  { ws: 'A222-18', code: 'CR-026', cond: 'DN >= 150', sev: 'block' },
  { ws: 'A222-18', code: 'CR-026-2', cond: 'DN >= 150', sev: 'block' },
  // A222-20 SBR Klarwasserabzug
  { ws: 'A222-20', code: 'CR-039', cond: 'sbr_steuerung_variation_zykluszeiten == True', sev: 'block' },
  { ws: 'A222-20', code: 'CR-040', cond: 'doppelfuellstandsmessung_vorhanden == True', sev: 'block' },
  // A222-21 Betriebskontrolle
  { ws: 'A222-21', code: 'CR-034', cond: 'betriebsstundenzaehler_installiert == True', sev: 'block' },
  { ws: 'A222-21', code: 'CR-035', cond: 'durchflussmessung_vorhanden == True', sev: 'block' },
  { ws: 'A222-21', code: 'CR-043', cond: 'attest_a222_21_cr_043 == True', sev: 'block' },
  // A222-22 Eigenüberwachung
  { ws: 'A222-22', code: 'CR-042', cond: 'betriebstagebuch_gefuehrt == True', sev: 'block' },
  // A222-24 Dokumentation
  { ws: 'A222-24', code: 'CR-024', cond: 'betrsichv_konformitaet == True', sev: 'block' },
  { ws: 'A222-24', code: 'CR-041', cond: 'betriebsanweisung_dwa_a_199_4 == True', sev: 'block' },
] as const;

/**
 * R-2 DRAFT FIX — the chosen-vs-required clarifier-surface gate that the source
 * PRINTS (§4.4.2 Gl.(22), §4.4.3 Gl.(27): `A_NB,theo >= Q_bem*(1+RV)/2,2` and
 * `A_NB >= Q_bem*(1+RV)/2,8`) but the encoding does NOT gate — it stores each as
 * a NON-evaluable equation.formula containing `>=` (arithmetic.ts rejects `>=`).
 * Drafted in the subtraction form `chosen - required >= 0` per the brief. NOT in
 * prod; seeded ONLY to prove the drafted gate enforces both ways. New gate ⇒
 * judgment item on the sign-off sheet; the orchestrator decides.
 */
export const A222_PROPOSED_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  { ws: 'A222-14', code: 'CR-PROPOSED-A_NB-27', cond: 'A_NB - Q_bem * (1 + RV) / 2.8 >= 0', sev: 'block' },
  { ws: 'A222-14', code: 'CR-PROPOSED-A_NB_theo-22', cond: 'A_NB_theo - Q_bem * (1 + RV) / 2.2 >= 0', sev: 'block' },
] as const;

/**
 * Fields to seed per worksheet — each gate symbol on its REAL home worksheet
 * (symbol + data_type verbatim from prod). Symbols are globally unique across the
 * seeded home worksheets, so the project-wide fallback resolves every cross-ws
 * gate unambiguously.
 */
export const A222_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'A222-01': [
    { symbol: 'negativliste_geprueft', dataType: 'boolean' },
    { symbol: 'mischsystem_ausnahmefall', dataType: 'boolean' },
    { symbol: 'entwaesserungssystem', dataType: 'enum' },
    { symbol: 'geltungsbereich', dataType: 'enum' },
    { symbol: 'GK', dataType: 'enum' },
    { symbol: 'attest_a222_01_cr_042', dataType: 'boolean' },
    { symbol: 'attest_a222_01_cr_043', dataType: 'boolean' },
  ],
  'A222-02': [
    { symbol: 'EW', dataType: 'number' },
    { symbol: 'w_s_d', dataType: 'number' },
    { symbol: 'm', dataType: 'number' },
    { symbol: 'TKN_BSB5', dataType: 'number' },
    { symbol: 'Q_bem', dataType: 'number' }, // consumed by the R-2 proposed area gate
  ],
  'A222-03': [
    { symbol: 't_Aufenthalt_VB', dataType: 'number' },
    { symbol: 'V_VB_EWspez', dataType: 'number' },
  ],
  'A222-04': [
    { symbol: 'h_TK', dataType: 'number' },
    { symbol: 'A_TK_spez', dataType: 'number' },
  ],
  'A222-06': [
    { symbol: 'd_Scheibe', dataType: 'number' },
    { symbol: 'n_RT', dataType: 'number' },
  ],
  'A222-07': [
    { symbol: 'V_FB', dataType: 'number' },
    { symbol: 'V_R', dataType: 'number' },
    { symbol: 'n_FB_Kaskaden', dataType: 'number' },
  ],
  'A222-08': [
    { symbol: 'V_SB', dataType: 'number' },
    { symbol: 'versuchsbericht_a_sb_spez', dataType: 'boolean' },
    { symbol: 'rueckhaltenachweis_aufwuchskoerper', dataType: 'boolean' },
  ],
  'A222-09': [
    { symbol: 'H_W_e', dataType: 'number' },
    { symbol: 'H_W_0', dataType: 'number' },
    { symbol: 'h_max', dataType: 'number' },
  ],
  'A222-10': [
    { symbol: 'TS_BB', dataType: 'number' },
    { symbol: 'C_O', dataType: 'number' },
  ],
  'A222-11': [
    { symbol: 'attest_a222_11_cr_023', dataType: 'boolean' },
    { symbol: 'attest_a222_11_cr_024', dataType: 'boolean' },
    { symbol: 'attest_a222_11_cr_025', dataType: 'boolean' },
    { symbol: 'attest_a222_11_cr_034', dataType: 'boolean' },
    { symbol: 'attest_a222_11_cr_035', dataType: 'boolean' },
    { symbol: 'attest_a222_11_cr_036', dataType: 'boolean' },
    { symbol: 'attest_a222_11_cr_037', dataType: 'boolean' },
    { symbol: 'attest_a222_11_cr_038', dataType: 'boolean' },
    { symbol: 'attest_a222_11_cr_039', dataType: 'boolean' },
    { symbol: 'attest_a222_11_cr_040', dataType: 'boolean' },
  ],
  'A222-12': [
    { symbol: 't_D', dataType: 'number' },
    { symbol: 't_T', dataType: 'number' },
  ],
  'A222-14': [
    { symbol: 'RV', dataType: 'number' },
    { symbol: 't_NB', dataType: 'number' },
    { symbol: 'A_NB', dataType: 'number' },
    { symbol: 'A_NB_theo', dataType: 'number' },
  ],
  'A222-16': [
    { symbol: 'V_speicher_EWspez', dataType: 'number' },
    { symbol: 'attest_a222_16_cr_023', dataType: 'boolean' },
    { symbol: 'attest_a222_16_cr_025', dataType: 'boolean' },
    { symbol: 'attest_a222_16_cr_037', dataType: 'boolean' },
    { symbol: 'attest_a222_16_cr_038', dataType: 'boolean' },
    { symbol: 'stoermeldung_vorhanden', dataType: 'boolean' },
  ],
  'A222-18': [
    { symbol: 'h_OK_freibord', dataType: 'number' },
    { symbol: 'h_OK', dataType: 'number' },
    { symbol: 'h_Wasser', dataType: 'number' },
    { symbol: 'DN', dataType: 'number' },
    { symbol: 'stromausfallmeldung_netzunabhaengig', dataType: 'boolean' },
  ],
  'A222-20': [
    { symbol: 'doppelfuellstandsmessung_vorhanden', dataType: 'boolean' },
    { symbol: 'sbr_steuerung_variation_zykluszeiten', dataType: 'boolean' },
  ],
  'A222-21': [
    { symbol: 'betriebsstundenzaehler_installiert', dataType: 'boolean' },
    { symbol: 'durchflussmessung_vorhanden', dataType: 'boolean' },
    { symbol: 'attest_a222_21_cr_043', dataType: 'boolean' },
  ],
  'A222-22': [
    { symbol: 'betriebstagebuch_gefuehrt', dataType: 'boolean' },
  ],
  'A222-24': [
    { symbol: 'mindestanforderungen_abwv_anh1', dataType: 'boolean' },
    { symbol: 'betrsichv_konformitaet', dataType: 'boolean' },
    { symbol: 'betriebsanweisung_dwa_a_199_4', dataType: 'boolean' },
  ],
};

export type A222Fixture = {
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

export async function seedA222(sql: postgres.Sql, userId: string): Promise<A222Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'a222-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('A222 Harness Org', ${'a222-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'A222-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-A-222', 'DWA-A 222 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const [ws, wsFields] of Object.entries(A222_FIELDS)) {
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
      fields[f.symbol] = row.id;
      fieldMeta[f.symbol] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the live block gates + the proposed R-2 area gates against their hosts.
  for (const g of [...A222_GATES, ...A222_PROPOSED_GATES]) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
