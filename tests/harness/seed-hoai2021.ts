/**
 * HOAI-2021 ("Honorarordnung für Architekten und Ingenieure (HOAI), Fassung 2021
 * (Novelle 2020/2021)") — minimal fixture for the REAL save-path gate-execution proof
 * PLUS the fee-interpolation equation chain driven through the REAL evaluateFormula.
 *
 * SOURCE PRESENT: C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\bayika_hoai_2021.pdf
 * (+ bayika-hoai-2021\bayika_hoai_2021.md). This wave is a FULL document comparison
 * (bidirectional). Topology pulled VERBATIM from live prod (standard
 * 7d6008df-b7f8-4f07-b62a-1e882676a515, project vadsmshzebefjreqcicl, this session):
 * 7 worksheet_templates, 23 severity='block' gates, 0 warn, 6 equations, 94 fields.
 * Nothing is applied to prod; disposable embedded PG only.
 *
 * TOPOLOGY (verbatim from live prod, re-executed this session):
 *   01 Projektregistrierung & Anwendungsbereich          (1 block gate:  CR-01)
 *   02 Honorargrundlagen (anrechenbare Kosten/Zone/LPH)  (6 block gates: CR-03,04,05,06,20,22)
 *   03 Honorarermittlung (Tafel/Interpolation/Zuschläge) (5 block gates: CR-02,07,15,18,19; 6 equations)
 *   04 Leistungsbilder Objektplanung (Phasen-%)          (3 block gates: CR-08,09,10)
 *   05 Leistungsbilder Ingenieurbau/Verkehr (Phasen-%)   (2 block gates: CR-11,12)
 *   06 Leistungsbilder Fachplanung (Phasen-%)            (2 block gates: CR-13,14)
 *   07 Prüfung, Honorarvereinbarung & Zusammenfassung    (4 block gates: CR-16,17,21,23)
 *
 * FOUR TRUE NO-OP BLOCK GATES (confirmed against live prod this session — REPRODUCE the
 * prior-scan flag of 4, NOT reversed): CR-02 (§2a/§7 "Tafelwerte sind Orientierungswerte"),
 * CR-21 (§15 Fälligkeit → BGB §650g reference), CR-22 (§17 Bauleitplanung Anwendungsbereich),
 * CR-23 (§11 Auftrag für mehrere Objekte). Each has condition = literal `TRUE` → always
 * passes, never blocks. All four map to REAL §§ but encode informational/legal-referential
 * notes with no machine-checkable predicate. TRUE→predicate is an enforcement change ⇒ OWNER
 * RULING, NOT fixed here. The harness drives all four to demonstrate the no-op.
 *
 * ENUM-FULL-DOMAIN NO-OP: CR-05 `(objektart IN {…} AND honorarzone IN {I,II,III}) OR
 * honorarzone IN {I,II,III,IV,V}`. honorarzone's enum domain IS exactly {I,II,III,IV,V}, so
 * the OR-right disjunct passes for ANY UI-selectable honorarzone ⇒ the objektart-conditional
 * restriction (FNP/BBP/Tragwerk → zones I–III only, §18/§19/§51) never enforces. Restructuring
 * to an IF/THEN guard is an enforcement change ⇒ RULING, NOT fixed. The harness drives the
 * ENGINE mechanics both ways with an out-of-domain honorarzone (saveWorksheet does not validate
 * enum domain) — present-not-in-domain ⇒ definite fail.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + live prod strings):
 *   1. bare-ident-RHS `field OP field` under ORDERING op: NONE. Every ordering comparison
 *      (K>0, p_sum>0/<=100, z_umbau>=0, NK>=0, ust>=0) has a NUMERIC-literal RHS. Equality gates
 *      compare to `true` (bool) or `100` (via arithmetic acompare). No variable-vs-variable RHS.
 *   2. `!= null` / `== null` / `!= ''` block gate: NONE. Every existence check uses IS NOT NULL
 *      (all 23 conditions inspected). No `!= ''` remain; no trap-2 migration needed.
 *   3. `IN {Titlecase}` vs lowercase enum: NONE MISFIRING. CR-05 uses objektart members
 *      {flaechennutzungsplan,bebauungsplan,tragwerksplanung} (match lowercase enum) and honorarzone
 *      members {I..V} (match the uppercase-Roman enum domain). Case matches on both.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d`: NONE — no IF/THEN guard exists.
 *
 * PHASE-SUM GATES (CR-08..CR-14) route through the arithmetic acompare path (evaluate.ts
 * parseComparison → acompare): `(p_..lph1+…+lphN) == 100`. Any missing phase ⇒ pending (never a
 * false fail); all present and ≠100 ⇒ definite fail; ==100 ⇒ pass. Driven both ways.
 *
 * EQUATIONS (6, §13 lineare Interpolation + §§6/8/14/16 chain) are driven through the REAL
 * evaluateFormula — pure plus/minus/mult/div arithmetic, all symbols resolve to declared fields, all COMPUTE.
 *
 * Only rows the harness reads are seeded. Nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — every gate-read symbol on its prod HOME worksheet
 * (symbol + data_type verbatim from prod `fields`). is_required is deliberately FALSE so the
 * per-gate proof isolates the block-CONDITION path (checkApprovalGate's separate
 * missing-required-field list is not what we prove here). Equation-only inputs
 * (H_u_oben/H_o_oben/s_satz) are NOT seeded — the 6 equations are driven directly through
 * evaluateFormula, not the save path.
 */
export const HOAI_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'HOAI-2021-01': [
    { symbol: 'hoai_anwendbar', dataType: 'boolean' }, // CR-01
    { symbol: 'objektart', dataType: 'enum' },         // CR-05 (cross-ws operand, home WS01)
  ],
  'HOAI-2021-02': [
    { symbol: 'leistungsbild', dataType: 'enum' }, // CR-03
    { symbol: 'honorarzone', dataType: 'enum' },   // CR-03, CR-05
    { symbol: 'K', dataType: 'number' },           // CR-03, CR-04, CR-06, CR-20
    { symbol: 'K_u', dataType: 'number' },          // CR-06
    { symbol: 'K_o', dataType: 'number' },          // CR-06
    { symbol: 'H_u_unten', dataType: 'number' },    // CR-06
    { symbol: 'H_o_unten', dataType: 'number' },    // CR-06
  ],
  'HOAI-2021-03': [
    { symbol: 'p_sum', dataType: 'number' },   // CR-07
    { symbol: 'z_umbau', dataType: 'number' }, // CR-15
    { symbol: 'NK', dataType: 'number' },      // CR-18
    { symbol: 'ust', dataType: 'number' },     // CR-19
  ],
  'HOAI-2021-04': [
    ...phaseFields('p_geb_lph', 9), // CR-08
    ...phaseFields('p_inn_lph', 9), // CR-09
    ...phaseFields('p_fre_lph', 9), // CR-10
  ],
  'HOAI-2021-05': [
    ...phaseFields('p_ing_lph', 9), // CR-11
    ...phaseFields('p_ver_lph', 9), // CR-12
  ],
  'HOAI-2021-06': [
    ...phaseFields('p_tra_lph', 6), // CR-13
    ...phaseFields('p_tga_lph', 9), // CR-14
  ],
  'HOAI-2021-07': [
    { symbol: 'auftraggeber_verbraucher', dataType: 'boolean' }, // CR-16
    { symbol: 'hinweis_erteilt', dataType: 'boolean' },          // CR-16
    { symbol: 'vereinbarung_textform', dataType: 'boolean' },    // CR-17
  ],
};

function phaseFields(prefix: string, n: number): Array<{ symbol: string; dataType: DType }> {
  return Array.from({ length: n }, (_, i) => ({ symbol: `${prefix}${i + 1}`, dataType: 'number' as DType }));
}

/** Worksheets to instantiate (all 7). */
export const HOAI_WORKSHEETS = [
  'HOAI-2021-01', 'HOAI-2021-02', 'HOAI-2021-03',
  'HOAI-2021-04', 'HOAI-2021-05', 'HOAI-2021-06', 'HOAI-2021-07',
] as const;

/** All 23 live BLOCK gates (severity='block'), grouped by home worksheet. Conditions +
 *  severities VERBATIM from prod compliance_requirements (this session). */
export const HOAI_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // WS01 — Projektregistrierung & Anwendungsbereich
  { ws: 'HOAI-2021-01', code: 'HOAI-CR-01', cond: 'hoai_anwendbar == true', sev: 'block' },
  // WS02 — Honorargrundlagen
  { ws: 'HOAI-2021-02', code: 'HOAI-CR-03', cond: 'leistungsbild IS NOT NULL AND honorarzone IS NOT NULL AND K IS NOT NULL', sev: 'block' },
  { ws: 'HOAI-2021-02', code: 'HOAI-CR-04', cond: 'K > 0', sev: 'block' },
  { ws: 'HOAI-2021-02', code: 'HOAI-CR-05', cond: '(objektart IN {flaechennutzungsplan,bebauungsplan,tragwerksplanung} AND honorarzone IN {I,II,III}) OR honorarzone IN {I,II,III,IV,V}', sev: 'block' }, // enum-full-domain no-op
  { ws: 'HOAI-2021-02', code: 'HOAI-CR-06', cond: 'K IS NOT NULL AND K_u IS NOT NULL AND K_o IS NOT NULL AND H_u_unten IS NOT NULL AND H_o_unten IS NOT NULL', sev: 'block' },
  { ws: 'HOAI-2021-02', code: 'HOAI-CR-20', cond: 'K IS NOT NULL', sev: 'block' },
  { ws: 'HOAI-2021-02', code: 'HOAI-CR-22', cond: 'TRUE', sev: 'block' }, // TRUE no-op (§17 Bauleitplanung)
  // WS03 — Honorarermittlung
  { ws: 'HOAI-2021-03', code: 'HOAI-CR-02', cond: 'TRUE', sev: 'block' }, // TRUE no-op (§2a/§7 Orientierungswerte)
  { ws: 'HOAI-2021-03', code: 'HOAI-CR-07', cond: 'p_sum > 0 AND p_sum <= 100', sev: 'block' },
  { ws: 'HOAI-2021-03', code: 'HOAI-CR-15', cond: 'z_umbau >= 0', sev: 'block' },
  { ws: 'HOAI-2021-03', code: 'HOAI-CR-18', cond: 'NK >= 0', sev: 'block' },
  { ws: 'HOAI-2021-03', code: 'HOAI-CR-19', cond: 'ust >= 0', sev: 'block' },
  // WS04 — Objektplanung Phasen-%
  { ws: 'HOAI-2021-04', code: 'HOAI-CR-08', cond: '(p_geb_lph1+p_geb_lph2+p_geb_lph3+p_geb_lph4+p_geb_lph5+p_geb_lph6+p_geb_lph7+p_geb_lph8+p_geb_lph9) == 100', sev: 'block' },
  { ws: 'HOAI-2021-04', code: 'HOAI-CR-09', cond: '(p_inn_lph1+p_inn_lph2+p_inn_lph3+p_inn_lph4+p_inn_lph5+p_inn_lph6+p_inn_lph7+p_inn_lph8+p_inn_lph9) == 100', sev: 'block' },
  { ws: 'HOAI-2021-04', code: 'HOAI-CR-10', cond: '(p_fre_lph1+p_fre_lph2+p_fre_lph3+p_fre_lph4+p_fre_lph5+p_fre_lph6+p_fre_lph7+p_fre_lph8+p_fre_lph9) == 100', sev: 'block' },
  // WS05 — Ingenieurbau/Verkehr Phasen-%
  { ws: 'HOAI-2021-05', code: 'HOAI-CR-11', cond: '(p_ing_lph1+p_ing_lph2+p_ing_lph3+p_ing_lph4+p_ing_lph5+p_ing_lph6+p_ing_lph7+p_ing_lph8+p_ing_lph9) == 100', sev: 'block' },
  { ws: 'HOAI-2021-05', code: 'HOAI-CR-12', cond: '(p_ver_lph1+p_ver_lph2+p_ver_lph3+p_ver_lph4+p_ver_lph5+p_ver_lph6+p_ver_lph7+p_ver_lph8+p_ver_lph9) == 100', sev: 'block' },
  // WS06 — Fachplanung Phasen-%
  { ws: 'HOAI-2021-06', code: 'HOAI-CR-13', cond: '(p_tra_lph1+p_tra_lph2+p_tra_lph3+p_tra_lph4+p_tra_lph5+p_tra_lph6) == 100', sev: 'block' },
  { ws: 'HOAI-2021-06', code: 'HOAI-CR-14', cond: '(p_tga_lph1+p_tga_lph2+p_tga_lph3+p_tga_lph4+p_tga_lph5+p_tga_lph6+p_tga_lph7+p_tga_lph8+p_tga_lph9) == 100', sev: 'block' },
  // WS07 — Prüfung, Honorarvereinbarung & Zusammenfassung
  { ws: 'HOAI-2021-07', code: 'HOAI-CR-16', cond: 'auftraggeber_verbraucher == true AND hinweis_erteilt == true', sev: 'block' },
  { ws: 'HOAI-2021-07', code: 'HOAI-CR-17', cond: 'vereinbarung_textform == true', sev: 'block' },
  { ws: 'HOAI-2021-07', code: 'HOAI-CR-21', cond: 'TRUE', sev: 'block' }, // TRUE no-op (§15 Fälligkeit)
  { ws: 'HOAI-2021-07', code: 'HOAI-CR-23', cond: 'TRUE', sev: 'block' }, // TRUE no-op (§11 mehrere Objekte)
] as const;

/** The 6 fee-interpolation equations (all on WS03), formula + output_symbol VERBATIM from prod
 *  `equations`. Driven through the REAL evaluateFormula (not the save path). */
export const HOAI_EQUATIONS = [
  { num: 'HOAI-EQ-01', out: 'H_basis',    homeWs: 'HOAI-2021-03', formula: 'H_basis = H_u_unten + (K - K_u) / (K_o - K_u) * (H_o_unten - H_u_unten)' },
  { num: 'HOAI-EQ-02', out: 'H_oben',     homeWs: 'HOAI-2021-03', formula: 'H_oben = H_u_oben + (K - K_u) / (K_o - K_u) * (H_o_oben - H_u_oben)' },
  { num: 'HOAI-EQ-03', out: 'H_tafel',    homeWs: 'HOAI-2021-03', formula: 'H_tafel = H_basis + s_satz * (H_oben - H_basis)' },
  { num: 'HOAI-EQ-04', out: 'H_phasen',   homeWs: 'HOAI-2021-03', formula: 'H_phasen = H_tafel * (p_sum / 100)' },
  { num: 'HOAI-EQ-05', out: 'H_zuschlag', homeWs: 'HOAI-2021-03', formula: 'H_zuschlag = H_phasen * (1 + z_umbau / 100)' },
  { num: 'HOAI-EQ-06', out: 'H_gesamt',   homeWs: 'HOAI-2021-03', formula: 'H_gesamt = (H_zuschlag + NK) * (1 + ust / 100)' },
] as const;

export type HOAIFixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
  /** symbol → home worksheet code */
  symbolHome: Record<string, string>;
  /** equation number → equation id */
  equationIds: Record<string, string>;
};

export async function seedHOAI2021(sql: postgres.Sql, userId: string): Promise<HOAIFixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'hoai2021-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('HOAI2021 Harness Org', ${'hoai2021-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'HOAI-2021-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('HOAI-2021', 'HOAI 2021 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of HOAI_WORKSHEETS) {
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
    for (const f of HOAI_FIELDS[ws]) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
      symbolHome[f.symbol] = ws;
    }
  }

  // Seed the 23 live BLOCK gates against their home worksheet templates.
  for (const g of HOAI_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  // Seed the 6 equations on their home template (WS03) — for equationIds only; evaluateFormula
  // is template-agnostic and reads the formula string directly.
  const equationIds: Record<string, string> = {};
  for (const e of HOAI_EQUATIONS) {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO equations (worksheet_template_id, equation_number, formula, output_symbol)
      VALUES (${templateByWs[e.homeWs]}, ${e.num}, ${e.formula}, ${e.out}) RETURNING id`;
    equationIds[e.num] = row.id;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome, equationIds };
}
