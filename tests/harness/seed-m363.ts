/**
 * DWA-M 363 (Herkunft und Verwertung von Biogas — Merkblatt, WEISSDRUCK,
 * 1. Auflage Februar 2022, gemeinsam DVGW/DWA/FvB) — minimal fixture for the
 * REAL save-path gate-execution-proof harness.
 *
 * PROOF MANDATE: M-363's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's 35 live BLOCK gates (every compliance_requirement
 * with severity='block' + a non-empty condition) through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition against
 * the saved values). Each gate is demonstrated BOTH ways — a state that PASSES it
 * and a state that VIOLATES it, reaching a definite `fail` — so a gate that fires
 * but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard DWA-M-363, this session):
 *   - 24 worksheet_templates (M363-01 … M363-24); the fixture seeds the 13 that
 *     host a BLOCK gate OR are the single home of a cross-worksheet gate operand.
 *   - Conditions + severities verbatim from prod compliance_requirements.
 *
 * DUPLICATE GATES (R-2 "S3 ×2 dups" lead — CONFIRMED). Two duplication shapes are
 * present in prod and are BOTH driven here (documented, NOT destructively deduped —
 * a topology change is owner-gated):
 *   (a) EXACT `-2` stray dups on the SAME worksheet, byte-identical condition:
 *       C363-08/08-2 (M363-08), C363-10/10-2, C363-11/11-2, C363-12/12-2,
 *       C363-28/28-2 (M363-09), C363-24/24-2 (M363-10), C363-25/25-2, C363-27/27-2
 *       (M363-11), C363-26/26-2 (M363-23) — 9 pairs.
 *   (b) CROSS-WORKSHEET re-homed gates: the same C-code lives on two worksheets,
 *       one mis-titled. C363-19 (M363-07 + M363-13); C363-09/16/17/20 (M363-08 +
 *       M363-16, attest reads its own local symbol per worksheet); C363-13/21
 *       (M363-09 + M363-20).
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing): several gates read symbols that are NOT
 * fields on the gate's own worksheet — resolved by checkApprovalGate's conflict-
 * free project-wide fallback. Every such symbol is given exactly ONE home so the
 * fallback never conflicts:
 *   - C363-19 on M363-13 reads speichertyp + speicherbetriebsdruck (home M363-07).
 *   - C363-20 on M363-08 reads speicherbetriebsdruck (home M363-07); on M363-16 it
 *     reads verwertungsweg (home M363-08) AND speicherbetriebsdruck (home M363-07).
 *   - C363-21 on M363-09 AND M363-20 reads anlagenstatus + formaldehyd_abgas
 *     (single home M363-22 — a worksheet that hosts no block gate of its own).
 *
 * WARN gates and empty-condition CRs are severity='warn' / blank — checkApprovalGate
 * loads only severity='block' with a real condition, so they are not driven
 * (nothing to enforce). Recorded as residue, not seeded.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 35 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements. */
export const M363_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M363-01 — Biogas-Herkunftsbereich dokumentiert (existence)
  { ws: 'M363-01', code: 'C363-01', cond: 'biogas_quelle IS NOT NULL', sev: 'block' },
  // M363-02 — Biogasqualität erfasst (3-term existence AND)
  { ws: 'M363-02', code: 'C363-02', cond: 'ch4_anteil IS NOT NULL AND co2_anteil IS NOT NULL AND h2s_konz IS NOT NULL', sev: 'block' },
  // M363-04 — TA Luft 2021 Mindestverweilzeit gasdicht (guarded ordering)
  { ws: 'M363-04', code: 'C363-22', cond: 'IF substrat_guelleanteil_pct < 100 THEN verweilzeit_gasdicht >= 150', sev: 'block' },
  // M363-07 — Druckgeräterichtlinie (guarded enum → ordering) [also on M363-13]
  { ws: 'M363-07', code: 'C363-19', cond: 'IF speichertyp == gewichtsbelastet THEN speicherbetriebsdruck <= 500', sev: 'block' },
  // M363-08 — Verwertungsweg + Einspeisung/Heizkessel/BHKW attestations + Tankstelle (mis-titled 'Substrate Bioabfall')
  { ws: 'M363-08', code: 'C363-08', cond: 'verwertungsweg IS NOT NULL', sev: 'block' },
  { ws: 'M363-08', code: 'C363-08-2', cond: 'verwertungsweg IS NOT NULL', sev: 'block' },
  { ws: 'M363-08', code: 'C363-09', cond: 'attest_m363_08_c363_09 == True', sev: 'block' },
  { ws: 'M363-08', code: 'C363-16', cond: 'attest_m363_08_c363_16 == True', sev: 'block' },
  { ws: 'M363-08', code: 'C363-17', cond: 'attest_m363_08_c363_17 == True', sev: 'block' },
  { ws: 'M363-08', code: 'C363-20', cond: 'IF verwertungsweg == tankstelle THEN speicherbetriebsdruck > 200000', sev: 'block' },
  // M363-09 — BImSchG/Störfall/Formaldehyd/Privilegierung legal set (mis-titled 'Cofermentation')
  { ws: 'M363-09', code: 'C363-10', cond: 'IF rohgas_kapazitaet >= 1.2 THEN anlagen_nr_4bimschv != keine', sev: 'block' },
  { ws: 'M363-09', code: 'C363-10-2', cond: 'IF rohgas_kapazitaet >= 1.2 THEN anlagen_nr_4bimschv != keine', sev: 'block' },
  { ws: 'M363-09', code: 'C363-11', cond: 'IF biogasmenge_total >= 10000 THEN privilegierung_baugb IS NOT NULL', sev: 'block' },
  { ws: 'M363-09', code: 'C363-11-2', cond: 'IF biogasmenge_total >= 10000 THEN privilegierung_baugb IS NOT NULL', sev: 'block' },
  { ws: 'M363-09', code: 'C363-12', cond: 'IF feuerungswaermeleistung >= 1 THEN anlagen_nr_4bimschv != keine', sev: 'block' },
  { ws: 'M363-09', code: 'C363-12-2', cond: 'IF feuerungswaermeleistung >= 1 THEN anlagen_nr_4bimschv != keine', sev: 'block' },
  { ws: 'M363-09', code: 'C363-13', cond: 'attest_m363_09_c363_13 == True', sev: 'block' },
  { ws: 'M363-09', code: 'C363-21', cond: 'IF anlagenstatus == neu THEN formaldehyd_abgas <= 20', sev: 'block' },
  { ws: 'M363-09', code: 'C363-28', cond: 'IF rohgas_kapazitaet > 2.3 THEN verfahrenstyp_bimschg != nicht_genehmigungsbeduerftig', sev: 'block' },
  { ws: 'M363-09', code: 'C363-28-2', cond: 'IF rohgas_kapazitaet > 2.3 THEN verfahrenstyp_bimschg != nicht_genehmigungsbeduerftig', sev: 'block' },
  // M363-10 — Messplatz DIN EN 15259 (mis-titled 'Fermenter Bemessung')
  { ws: 'M363-10', code: 'C363-24', cond: 'messplatz_din_en_15259 == true', sev: 'block' },
  { ws: 'M363-10', code: 'C363-24-2', cond: 'messplatz_din_en_15259 == true', sev: 'block' },
  // M363-11 — O2 / Flammendurchschlagsicherung safety (mis-titled 'Deponiegasausbeute')
  { ws: 'M363-11', code: 'C363-25', cond: 'o2_atemluft >= 17', sev: 'block' },
  { ws: 'M363-11', code: 'C363-25-2', cond: 'o2_atemluft >= 17', sev: 'block' },
  { ws: 'M363-11', code: 'C363-27', cond: 'flammendurchschlagsicherung == true', sev: 'block' },
  { ws: 'M363-11', code: 'C363-27-2', cond: 'flammendurchschlagsicherung == true', sev: 'block' },
  // M363-13 — Druckgeräterichtlinie (cross-ws re-home of C363-19; NO local fields)
  { ws: 'M363-13', code: 'C363-19', cond: 'IF speichertyp == gewichtsbelastet THEN speicherbetriebsdruck <= 500', sev: 'block' },
  // M363-16 — Verwertungsweg attestations + Tankstelle (correctly-titled home)
  { ws: 'M363-16', code: 'C363-09', cond: 'attest_m363_16_c363_09 == True', sev: 'block' },
  { ws: 'M363-16', code: 'C363-16', cond: 'attest_m363_16_c363_16 == True', sev: 'block' },
  { ws: 'M363-16', code: 'C363-17', cond: 'attest_m363_16_c363_17 == True', sev: 'block' },
  { ws: 'M363-16', code: 'C363-20', cond: 'IF verwertungsweg == tankstelle THEN speicherbetriebsdruck > 200000', sev: 'block' },
  // M363-20 — Ex-Schutz attestation + Formaldehyd (correctly-titled legal home)
  { ws: 'M363-20', code: 'C363-13', cond: 'attest_m363_20_c363_13 == True', sev: 'block' },
  { ws: 'M363-20', code: 'C363-21', cond: 'IF anlagenstatus == neu THEN formaldehyd_abgas <= 20', sev: 'block' },
  // M363-23 — Toxizität CO2/H2S Atemluft (correctly-titled safety home)
  { ws: 'M363-23', code: 'C363-26', cond: 'co2_atemluft <= 0.5 AND h2s_atemluft <= 5', sev: 'block' },
  { ws: 'M363-23', code: 'C363-26-2', cond: 'co2_atemluft <= 0.5 AND h2s_atemluft <= 5', sev: 'block' },
] as const;

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). M363-13 owns no fields: its
 * C363-19 operands resolve via the conflict-free project-wide fallback. M363-22
 * hosts no block gate but is the single home of anlagenstatus + formaldehyd_abgas,
 * read via fallback by C363-21 on M363-09 and M363-20.
 */
export const M363_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'M363-01': [
    { symbol: 'biogas_quelle', dataType: 'enum' },
  ],
  'M363-02': [
    { symbol: 'ch4_anteil', dataType: 'number' },
    { symbol: 'co2_anteil', dataType: 'number' },
    { symbol: 'h2s_konz', dataType: 'number' },
  ],
  'M363-04': [
    { symbol: 'substrat_guelleanteil_pct', dataType: 'number' },
    { symbol: 'verweilzeit_gasdicht', dataType: 'number' },
  ],
  'M363-07': [
    { symbol: 'speichertyp', dataType: 'enum' },
    { symbol: 'speicherbetriebsdruck', dataType: 'number' },
  ],
  'M363-08': [
    { symbol: 'verwertungsweg', dataType: 'enum' },
    { symbol: 'attest_m363_08_c363_09', dataType: 'boolean' },
    { symbol: 'attest_m363_08_c363_16', dataType: 'boolean' },
    { symbol: 'attest_m363_08_c363_17', dataType: 'boolean' },
  ],
  'M363-09': [
    { symbol: 'rohgas_kapazitaet', dataType: 'number' },
    { symbol: 'anlagen_nr_4bimschv', dataType: 'enum' },
    { symbol: 'biogasmenge_total', dataType: 'number' },
    { symbol: 'privilegierung_baugb', dataType: 'boolean' },
    { symbol: 'feuerungswaermeleistung', dataType: 'number' },
    { symbol: 'attest_m363_09_c363_13', dataType: 'boolean' },
    { symbol: 'verfahrenstyp_bimschg', dataType: 'enum' },
  ],
  'M363-10': [
    { symbol: 'messplatz_din_en_15259', dataType: 'boolean' },
  ],
  'M363-11': [
    { symbol: 'o2_atemluft', dataType: 'number' },
    { symbol: 'flammendurchschlagsicherung', dataType: 'boolean' },
  ],
  'M363-13': [
    // intentionally empty — C363-19 operands resolve via cross-worksheet fallback
  ],
  'M363-16': [
    { symbol: 'attest_m363_16_c363_09', dataType: 'boolean' },
    { symbol: 'attest_m363_16_c363_16', dataType: 'boolean' },
    { symbol: 'attest_m363_16_c363_17', dataType: 'boolean' },
  ],
  'M363-20': [
    { symbol: 'attest_m363_20_c363_13', dataType: 'boolean' },
  ],
  'M363-22': [
    { symbol: 'anlagenstatus', dataType: 'enum' },
    { symbol: 'formaldehyd_abgas', dataType: 'number' },
  ],
  'M363-23': [
    { symbol: 'co2_atemluft', dataType: 'number' },
    { symbol: 'h2s_atemluft', dataType: 'number' },
  ],
};

export type M363Fixture = {
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

export async function seedM363(sql: postgres.Sql, userId: string): Promise<M363Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm363-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M363 Harness Org', ${'m363-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M363-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-363', 'DWA-M 363 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const [ws, wsFields] of Object.entries(M363_FIELDS)) {
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
  for (const g of M363_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
