/**
 * DWA-M 1200-2 (Wasserwiederverwendung für landwirtschaftliche und urbane Zwecke
 * in Deutschland — Teil 2: Anforderungen an die weitergehende Wasseraufbereitung;
 * GELBDRUCK / Entwurf, Juli 2025, Frist zur Stellungnahme 30.09.2025) — minimal
 * fixture for the REAL save-path gate-execution-proof harness.
 *
 * PROVISIONAL — GELBDRUCK. This standard is a DRAFT (Entwurf). The harness runs
 * (execution proof is valuable and re-executable), but EVERY finding is provisional
 * and NO prod fix is drafted for any deferred health/pathogen gate. Conditions are
 * verbatim from prod compliance_requirements (this session); nothing is fixed here.
 *
 * PROOF MANDATE: M-1200-2's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 9 live BLOCK gates (every compliance_requirement
 * with severity='block' + a non-empty condition) through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition against
 * the saved values). Each gate is demonstrated BOTH ways — a state that PASSES it
 * and a state that VIOLATES it, reaching a definite `fail` — so a gate that fires
 * but never enforces (the F-4 lesson) cannot hide.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing): several gates read symbols that are NOT
 * fields on the gate's own worksheet — resolved by checkApprovalGate's conflict-
 * free project-wide fallback (buildFallbackValues/makeGateLookup). Every such symbol
 * is given exactly ONE home so the fallback never conflicts:
 *   - REQ-06 on M12002-03 reads wassergueteklasse (home M12002-02),
 *     perzentil_10_log10 + perzentil_50_log10 (home M12002-05), leistungsziel_log10
 *     (home M12002-04) — NONE local to M12002-03.
 *   - REQ-04 on M12002-05 reads leistungsziel_log10 (home M12002-04) via fallback.
 *   - REQ-09 on M12002-08 reads wassergueteklasse (home M12002-02) + truebung_ablauf
 *     (home M12002-06) — NONE local to M12002-08.
 *
 * WARN gates and empty-condition CRs (REQ-02, REQ-08, REQ-12, REQ-13, REQ-14,
 * REQ-15) are severity='warn' and/or blank — checkApprovalGate loads only
 * severity='block' with a real condition, so they are not driven. Recorded as
 * residue, not seeded.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 9 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const M12002_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M12002-01 — Anwendungsbereich (boolean AND enum-membership)
  { ws: 'M12002-01', code: 'REQ-01', cond: 'haeusliches_sw_anteil_ueberwiegend == true AND anwendungsbereich IN {bewaesserung_landwirtschaft, bewaesserung_gartenbau, urbane_anwendung}', sev: 'block' },
  // M12002-03 — Umfängliches Validierungsmonitoring (nested double-guard; ALL operands cross-ws)
  { ws: 'M12002-03', code: 'REQ-06', cond: "IF wassergueteklasse == 'A' THEN perzentil_10_log10 >= leistungsziel_log10 AND IF wassergueteklasse IN {'B-1','C-1'} THEN perzentil_50_log10 >= leistungsziel_log10", sev: 'block' },
  // M12002-05 — Validierung Leistungsziele (var-vs-var ordering; leistungsziel via fallback)
  { ws: 'M12002-05', code: 'REQ-04', cond: 'log10_reduktion >= leistungsziel_log10', sev: 'block' },
  // M12002-05 — Vereinfachtes Validierungsmonitoring (enum == AND numeric ordering)
  { ws: 'M12002-05', code: 'REQ-05', cond: "validierungsmonitoring_typ == 'vereinfacht' AND probenanzahl_zulauf >= 16", sev: 'block' },
  // M12002-06 — Analytik / Probenahme (boolean AND ordering AND enum ==)
  { ws: 'M12002-06', code: 'REQ-07', cond: 'analytisches_labor_akkreditiert == true AND probenstabilitaet_h <= 72 AND probennahme_typ == mischprobe_24h', sev: 'block' },
  // M12002-08 — Filtration für Klassen A-C (guarded enum-membership → ordering; both operands cross-ws)
  { ws: 'M12002-08', code: 'REQ-09', cond: "IF wassergueteklasse IN {'A','B-1','B-2','C-1','C-2'} THEN truebung_ablauf <= 2", sev: 'block' },
  // M12002-11 — Desinfektion für alle Klassen (existence)
  { ws: 'M12002-11', code: 'REQ-10', cond: 'desinfektionsverfahren IS NOT EMPTY', sev: 'block' },
  // M12002-13 — 90%-Konformitäts-Regel (numeric ordering)
  { ws: 'M12002-13', code: 'REQ-03', cond: 'perzentil_konformitaet >= 90', sev: 'block' },
  // M12002-13 — Betriebliche Überwachung Tab.6 (enum == AND numeric ordering)
  { ws: 'M12002-13', code: 'REQ-11', cond: 'messhauefigkeit == online AND alarm_verzoegerung_min <= 30', sev: 'block' },
] as const;

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). M12002-03 and M12002-08 own no
 * gate fields: their operands resolve via the conflict-free project-wide fallback.
 */
export const M12002_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'M12002-01': [
    { symbol: 'haeusliches_sw_anteil_ueberwiegend', dataType: 'boolean' },
    { symbol: 'anwendungsbereich', dataType: 'enum' },
  ],
  'M12002-02': [
    { symbol: 'wassergueteklasse', dataType: 'enum' },
  ],
  'M12002-03': [
    // intentionally empty — REQ-06 operands resolve via cross-worksheet fallback
  ],
  'M12002-04': [
    { symbol: 'leistungsziel_log10', dataType: 'number' },
  ],
  'M12002-05': [
    { symbol: 'log10_reduktion', dataType: 'number' },
    { symbol: 'perzentil_10_log10', dataType: 'number' },
    { symbol: 'perzentil_50_log10', dataType: 'number' },
    { symbol: 'validierungsmonitoring_typ', dataType: 'enum' },
    { symbol: 'probenanzahl_zulauf', dataType: 'number' },
  ],
  'M12002-06': [
    { symbol: 'analytisches_labor_akkreditiert', dataType: 'boolean' },
    { symbol: 'probenstabilitaet_h', dataType: 'number' },
    { symbol: 'probennahme_typ', dataType: 'enum' },
    { symbol: 'truebung_ablauf', dataType: 'number' },
  ],
  'M12002-08': [
    // intentionally empty — REQ-09 operands resolve via cross-worksheet fallback
  ],
  'M12002-11': [
    { symbol: 'desinfektionsverfahren', dataType: 'enum' },
  ],
  'M12002-13': [
    { symbol: 'perzentil_konformitaet', dataType: 'number' },
    { symbol: 'messhauefigkeit', dataType: 'enum' },
    { symbol: 'alarm_verzoegerung_min', dataType: 'number' },
  ],
};

export type M12002Fixture = {
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

export async function seedM12002(sql: postgres.Sql, userId: string): Promise<M12002Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm1200-2-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M1200-2 Harness Org', ${'m12002-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M1200-2-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-1200-2', 'DWA-M 1200-2 (harness, Gelbdruck)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const [ws, wsFields] of Object.entries(M12002_FIELDS)) {
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
  for (const g of M12002_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
