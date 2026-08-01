/**
 * DWA-M-732 (Abwasser aus Brauereien, Weißdruck Sept 2010 / korr. Fassung Aug
 * 2022) — minimal fixture for the REAL save-path gate-execution-proof harness.
 *
 * PROOF MANDATE: M-732's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 14 live BLOCK gates (every compliance_requirement
 * with severity='block' + a non-empty condition) through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition against
 * the saved values). Each gate is demonstrated BOTH ways — a state that PASSES it
 * and a state that VIOLATES it, reaching a definite `fail` — so a gate that fires
 * but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard DWA-M-732, this session):
 *   - 22 worksheet_templates (M732-01 … M732-22); the fixture seeds the 7 that
 *     host or supply a BLOCK gate: M732-01, M732-03, M732-08, M732-11, M732-12,
 *     M732-15, M732-21. Symbols + data_types verbatim from prod fields.
 *   - Conditions are verbatim from prod compliance_requirements.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing here): the M732-03 applicability gate
 * CR-M732-01 reads `betriebsklasse` (M732-03-local) AND `ausstoss_jahr`, which is
 * a field on M732-01 — NOT on M732-03 where the gate lives. checkApprovalGate
 * resolves that non-local symbol through the conflict-free project-wide fallback.
 * The fixture seeds `ausstoss_jahr` on its REAL prod home worksheet (M732-01) so
 * the fallback resolver is exercised exactly as in prod.
 *
 * WARN gate CR-M732-13 (M732-03, EDTA-Vermeidung) carries an EMPTY condition and
 * severity='warn' — checkApprovalGate loads only severity='block', so it is not
 * driven (nothing to enforce). Recorded as residue, not seeded.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 14 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const M732_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M732-03 Betriebsklassifikation — applicability (existence + enum != + cross-ws number) & attestation
  { ws: 'M732-03', code: 'CR-M732-01', cond: "betriebsklasse IS NOT NULL AND betriebsklasse <> 'gasthausbrauerei' AND ausstoss_jahr >= 50000", sev: 'block' },
  { ws: 'M732-03', code: 'CR-M732-12', cond: 'attest_m732_03_cr_m732_12 == True', sev: 'block' },
  // M732-08 Abwasseranfall/Konzentration — pH range, temperature, nutrient (arithmetic), Direkteinleiter table
  { ws: 'M732-08', code: 'CR-M732-02', cond: '6.5 <= pH_wert AND pH_wert <= 10.0', sev: 'block' },
  { ws: 'M732-08', code: 'CR-M732-03', cond: 'T_abwasser < 35', sev: 'block' },
  { ws: 'M732-08', code: 'CR-M732-04', cond: '((EW <= 5000 AND (NH4_N + NH3_N) <= 100) OR (EW > 5000 AND (NH4_N + NH3_N) <= 200)) AND P_ges <= 50', sev: 'block' },
  { ws: 'M732-08', code: 'CR-M732-05', cond: 'CSB_durchmischt <= 110 AND BSB5_durchmischt <= 25 AND NH4_N <= 10 AND N_ges <= 18 AND P_ges <= 2', sev: 'block' },
  // M732-11 Chemisch-physikalische Vorbehandlung — M+A elimination + 3 attestations
  { ws: 'M732-11', code: 'CR-M732-06', cond: 'attest_m732_11_cr_m732_06 == True', sev: 'block' },
  { ws: 'M732-11', code: 'CR-M732-07', cond: 'BSB5_elim_grad >= 50', sev: 'block' },
  { ws: 'M732-11', code: 'CR-M732-09', cond: 'attest_m732_11_cr_m732_09 == True', sev: 'block' },
  { ws: 'M732-11', code: 'CR-M732-10', cond: 'attest_m732_11_cr_m732_10 == True', sev: 'block' },
  // M732-12 Aerobe biologische Behandlung — Schlammbelastung design range
  { ws: 'M732-12', code: 'CR-M732-08', cond: 'B_TS_BSB >= 0.05 AND B_TS_BSB <= 0.08', sev: 'block' },
  // M732-15 Beispielanlage Neutralisation — Olfaktometrie attestation + TA-Lärm distances
  { ws: 'M732-15', code: 'CR-M732-14', cond: 'attest_m732_15_cr_m732_14 == True', sev: 'block' },
  { ws: 'M732-15', code: 'CR-M732-15', cond: "((gebiet != 'WR' OR schallpegel < 100 OR abstand_wr >= 400) AND (gebiet != 'WA' OR schallpegel < 100 OR abstand_wa >= 250) AND (gebiet != 'MI' OR schallpegel < 100 OR abstand_mi >= 150) AND (nachtzeit IS NULL OR immissionsrichtwert_nacht <= immissionsrichtwert_tag - 15))", sev: 'block' },
  // M732-21 Weitere Emissionen: Abfälle — Klärschlamm/Bioabfall attestation
  { ws: 'M732-21', code: 'CR-M732-11', cond: 'attest_m732_21_cr_m732_11 == True', sev: 'block' },
] as const;

/**
 * Fields to seed per worksheet — each gate symbol on its REAL home worksheet
 * (symbol + data_type verbatim from prod). `ausstoss_jahr` lives on M732-01; the
 * M732-03 applicability gate reads it via the project-wide fallback.
 */
export const M732_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'M732-01': [
    { symbol: 'ausstoss_jahr', dataType: 'number' },
  ],
  'M732-03': [
    { symbol: 'betriebsklasse', dataType: 'enum' },
    { symbol: 'attest_m732_03_cr_m732_12', dataType: 'boolean' },
  ],
  'M732-08': [
    { symbol: 'pH_wert', dataType: 'number' },
    { symbol: 'T_abwasser', dataType: 'number' },
    { symbol: 'EW', dataType: 'number' },
    { symbol: 'NH4_N', dataType: 'number' },
    { symbol: 'NH3_N', dataType: 'number' },
    { symbol: 'P_ges', dataType: 'number' },
    { symbol: 'N_ges', dataType: 'number' },
    { symbol: 'CSB_durchmischt', dataType: 'number' },
    { symbol: 'BSB5_durchmischt', dataType: 'number' },
  ],
  'M732-11': [
    { symbol: 'BSB5_elim_grad', dataType: 'number' },
    { symbol: 'attest_m732_11_cr_m732_06', dataType: 'boolean' },
    { symbol: 'attest_m732_11_cr_m732_09', dataType: 'boolean' },
    { symbol: 'attest_m732_11_cr_m732_10', dataType: 'boolean' },
  ],
  'M732-12': [
    { symbol: 'B_TS_BSB', dataType: 'number' },
  ],
  'M732-15': [
    { symbol: 'gebiet', dataType: 'text' },
    { symbol: 'schallpegel', dataType: 'number' },
    { symbol: 'abstand_wr', dataType: 'number' },
    { symbol: 'abstand_wa', dataType: 'number' },
    { symbol: 'abstand_mi', dataType: 'number' },
    { symbol: 'nachtzeit', dataType: 'text' },
    { symbol: 'immissionsrichtwert_nacht', dataType: 'number' },
    { symbol: 'immissionsrichtwert_tag', dataType: 'number' },
    { symbol: 'attest_m732_15_cr_m732_14', dataType: 'boolean' },
  ],
  'M732-21': [
    { symbol: 'attest_m732_21_cr_m732_11', dataType: 'boolean' },
  ],
};

export type M732Fixture = {
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

export async function seedM732(sql: postgres.Sql, userId: string): Promise<M732Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm732-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M732 Harness Org', ${'m732-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M732-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-732', 'DWA-M 732 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const [ws, wsFields] of Object.entries(M732_FIELDS)) {
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
  for (const g of M732_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
