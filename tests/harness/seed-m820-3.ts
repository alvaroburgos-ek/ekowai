/**
 * DWA-M-820-3 (Merkblatt DWA-M 820-3 — "Qualität von Ingenieurleistungen optimieren
 * — Teil 3: Qualitätselemente"; Februar 2026, Weißdruck / final Merkblatt) — minimal
 * fixture for the REAL save-path gate-execution-proof harness.
 *
 * PROOF MANDATE: M-820-3's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's live BLOCK gates (every compliance_requirement with
 * severity='block' + a non-empty condition) through the REAL `saveWorksheet` (values
 * persist to project_parameters) and the REAL `checkApprovalGate` (the engineer-approve
 * enforcement read path that replays each block condition against the saved values).
 * Each gate is demonstrated BOTH ways — a state that PASSES it and a state that
 * VIOLATES it, reaching a definite `fail` — so a gate that fires but never enforces
 * (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard DWA-M-820-3 =
 * f515ed34-ef0a-421d-8667-614f6d81da1c, project vadsmshzebefjreqcicl, this session):
 *   - 24 worksheet_templates (M8203-01 … M8203-24); 250 active fields; 0 equations;
 *     32 compliance_requirements — 24 severity='block' with a non-empty condition.
 *   - Gate shapes: enum-status disjunction chains (`pz_XX_Y_status == "erreicht" OR …`),
 *     number-sum equality (`qe*_items_y + _p + _n + _na == qe*_items_total`),
 *     fixed-count sums (`qe63a_items_total + qe63b_items_total == 40` / `== 50`),
 *     boolean `== true`, and text `IS NOT EMPTY`.
 *   - MOST gates are worksheet-local, but REQ-20 and REQ-21 (both on M8203-11) are
 *     CROSS-WORKSHEET: their qe63a/qe63b/qe64a/qe64b `_items_total` operands are homed
 *     on M8203-12/13/14/15. checkApprovalGate resolves those via its conflict-free
 *     project-wide fallback, so the fixture seeds those field-home worksheets too.
 *   - Every symbol is single-home in prod (n=1), so the fallback map is conflict-free.
 *
 * Conditions verbatim from prod; nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/** Enum status fields: pz_<sec>_<i>_status, homed per phase-target worksheet. */
const PZ_GROUPS: ReadonlyArray<{ prefix: string; ws: string; n: number }> = [
  { prefix: 'pz_52', ws: 'M8203-04', n: 5 },
  { prefix: 'pz_53', ws: 'M8203-05', n: 5 },
  { prefix: 'pz_54', ws: 'M8203-06', n: 3 },
  { prefix: 'pz_62', ws: 'M8203-11', n: 5 },
  { prefix: 'pz_63', ws: 'M8203-12', n: 8 },
  { prefix: 'pz_64', ws: 'M8203-14', n: 12 },
  { prefix: 'pz_65', ws: 'M8203-16', n: 12 },
  { prefix: 'pz_66', ws: 'M8203-17', n: 11 },
  { prefix: 'pz_67', ws: 'M8203-18', n: 6 },
];

/** Number checklist-count fields: qe<base>_items_{y,p,n,na,total}. */
const QE_GROUPS: ReadonlyArray<{ base: string; ws: string }> = [
  { base: 'qe52', ws: 'M8203-07' },
  { base: 'qe53', ws: 'M8203-08' },
  { base: 'qe54', ws: 'M8203-09' },
  { base: 'qe55', ws: 'M8203-10' },
  { base: 'qe62', ws: 'M8203-11' },
  { base: 'qe63a', ws: 'M8203-12' },
  { base: 'qe63b', ws: 'M8203-13' },
  { base: 'qe64a', ws: 'M8203-14' },
  { base: 'qe64b', ws: 'M8203-15' },
  { base: 'qe65', ws: 'M8203-16' },
  { base: 'qe66', ws: 'M8203-17' },
  { base: 'qe67', ws: 'M8203-18' },
];
const QE_SUFFIXES = ['y', 'p', 'n', 'na', 'total'] as const;

/** Singleton gate symbols (boolean / text / enum). */
const SINGLETONS: ReadonlyArray<{ symbol: string; ws: string; dataType: DType }> = [
  // M8203-01 Projektregistrierung (REQ-01 §1 Anwendungsbereich)
  { symbol: 'sector_wasserwirtschaft', ws: 'M8203-01', dataType: 'boolean' },
  { symbol: 'sector_wasserbau', ws: 'M8203-01', dataType: 'boolean' },
  { symbol: 'sector_abwasser', ws: 'M8203-01', dataType: 'boolean' },
  { symbol: 'sector_abfall', ws: 'M8203-01', dataType: 'boolean' },
  { symbol: 'client_auftraggeber', ws: 'M8203-01', dataType: 'text' },
  { symbol: 'contractor_auftragnehmer', ws: 'M8203-01', dataType: 'text' },
  // M8203-03 Begriffe/Rahmenbedingungen (REQ-04 §4 Bild 1)
  { symbol: 'bild1_acknowledged', ws: 'M8203-03', dataType: 'boolean' },
  // M8203-19 Digitale Methoden (REQ-26 §7.2.3)
  { symbol: 'digital_twin_after_project', ws: 'M8203-19', dataType: 'boolean' },
  // M8203-20 Rechte an digitalen Daten (REQ-28 §7.4)
  { symbol: 'digital_rights_clarified', ws: 'M8203-20', dataType: 'boolean' },
  // M8203-24 Gesamtverifizierung (REQ-32 §6.7)
  { symbol: 'signoff_engineer', ws: 'M8203-24', dataType: 'text' },
  { symbol: 'signoff_client', ws: 'M8203-24', dataType: 'text' },
  { symbol: 'overall_quality_verdict', ws: 'M8203-24', dataType: 'enum' },
];

/** symbol → { ws, dataType } (single-home topology, verbatim data_type from prod). */
export const SYMBOL_HOME: Record<string, { ws: string; dataType: DType }> = (() => {
  const m: Record<string, { ws: string; dataType: DType }> = {};
  for (const g of PZ_GROUPS) {
    for (let i = 1; i <= g.n; i++) m[`${g.prefix}_${i}_status`] = { ws: g.ws, dataType: 'enum' };
  }
  for (const g of QE_GROUPS) {
    for (const suf of QE_SUFFIXES) m[`${g.base}_items_${suf}`] = { ws: g.ws, dataType: 'number' };
  }
  for (const s of SINGLETONS) m[s.symbol] = { ws: s.ws, dataType: s.dataType };
  return m;
})();

/** Worksheets that must exist as instances (gate homes ∪ field homes). */
export const M820_3_WORKSHEETS = [
  'M8203-01', 'M8203-03', 'M8203-04', 'M8203-05', 'M8203-06', 'M8203-07',
  'M8203-08', 'M8203-09', 'M8203-10', 'M8203-11', 'M8203-12', 'M8203-13',
  'M8203-14', 'M8203-15', 'M8203-16', 'M8203-17', 'M8203-18', 'M8203-19',
  'M8203-20', 'M8203-24',
] as const;

/** All 24 live BLOCK gates (non-empty condition), verbatim from prod
 *  compliance_requirements (worksheet_template.code, code, condition). */
export const M820_3_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // M8203-01 Projektregistrierung (§1) — sector-OR boolean group + two text IS NOT EMPTY
  { ws: 'M8203-01', code: 'REQ-01', cond: '(sector_wasserwirtschaft == true OR sector_wasserbau == true OR sector_abwasser == true OR sector_abfall == true) AND client_auftraggeber IS NOT EMPTY AND contractor_auftragnehmer IS NOT EMPTY', sev: 'block' },
  // M8203-03 Rahmenbedingungen (§4 Bild 1) — single boolean
  { ws: 'M8203-03', code: 'REQ-04', cond: 'bild1_acknowledged == true', sev: 'block' },
  // M8203-04 Phasenziele §5.2 — 5-conjunct enum-status disjunction chain
  { ws: 'M8203-04', code: 'REQ-06', cond: '(pz_52_1_status == "erreicht" OR pz_52_1_status == "teilweise_erreicht" OR pz_52_1_status == "nicht_zutreffend") AND (pz_52_2_status == "erreicht" OR pz_52_2_status == "teilweise_erreicht" OR pz_52_2_status == "nicht_zutreffend") AND (pz_52_3_status == "erreicht" OR pz_52_3_status == "teilweise_erreicht" OR pz_52_3_status == "nicht_zutreffend") AND (pz_52_4_status == "erreicht" OR pz_52_4_status == "teilweise_erreicht" OR pz_52_4_status == "nicht_zutreffend") AND (pz_52_5_status == "erreicht" OR pz_52_5_status == "teilweise_erreicht" OR pz_52_5_status == "nicht_zutreffend")', sev: 'block' },
  // M8203-05 Phasenziele §5.3 — 5-conjunct
  { ws: 'M8203-05', code: 'REQ-07', cond: '(pz_53_1_status == "erreicht" OR pz_53_1_status == "teilweise_erreicht" OR pz_53_1_status == "nicht_zutreffend") AND (pz_53_2_status == "erreicht" OR pz_53_2_status == "teilweise_erreicht" OR pz_53_2_status == "nicht_zutreffend") AND (pz_53_3_status == "erreicht" OR pz_53_3_status == "teilweise_erreicht" OR pz_53_3_status == "nicht_zutreffend") AND (pz_53_4_status == "erreicht" OR pz_53_4_status == "teilweise_erreicht" OR pz_53_4_status == "nicht_zutreffend") AND (pz_53_5_status == "erreicht" OR pz_53_5_status == "teilweise_erreicht" OR pz_53_5_status == "nicht_zutreffend")', sev: 'block' },
  // M8203-06 Phasenziele §5.4 — 3-conjunct
  { ws: 'M8203-06', code: 'REQ-08', cond: '(pz_54_1_status == "erreicht" OR pz_54_1_status == "teilweise_erreicht" OR pz_54_1_status == "nicht_zutreffend") AND (pz_54_2_status == "erreicht" OR pz_54_2_status == "teilweise_erreicht" OR pz_54_2_status == "nicht_zutreffend") AND (pz_54_3_status == "erreicht" OR pz_54_3_status == "teilweise_erreicht" OR pz_54_3_status == "nicht_zutreffend")', sev: 'block' },
  // M8203-07 QE 5.2 (Anhang A.1) — number-sum equality
  { ws: 'M8203-07', code: 'REQ-15', cond: 'qe52_items_y + qe52_items_p + qe52_items_n + qe52_items_na == qe52_items_total', sev: 'block' },
  // M8203-08 QE 5.3 (Anhang A.2)
  { ws: 'M8203-08', code: 'REQ-16', cond: 'qe53_items_y + qe53_items_p + qe53_items_n + qe53_items_na == qe53_items_total', sev: 'block' },
  // M8203-09 QE 5.4 (Anhang A.3)
  { ws: 'M8203-09', code: 'REQ-17', cond: 'qe54_items_y + qe54_items_p + qe54_items_n + qe54_items_na == qe54_items_total', sev: 'block' },
  // M8203-10 QE 5.5 Matrix Nachhaltigkeit (Anhang A.4)
  { ws: 'M8203-10', code: 'REQ-18', cond: 'qe55_items_y + qe55_items_p + qe55_items_n + qe55_items_na == qe55_items_total', sev: 'block' },
  // M8203-11 Bedarfsplanung Projekt — enum §6.2 + three sum gates (REQ-20/21 cross-worksheet)
  { ws: 'M8203-11', code: 'REQ-09', cond: '(pz_62_1_status == "erreicht" OR pz_62_1_status == "teilweise_erreicht" OR pz_62_1_status == "nicht_zutreffend") AND (pz_62_2_status == "erreicht" OR pz_62_2_status == "teilweise_erreicht" OR pz_62_2_status == "nicht_zutreffend") AND (pz_62_3_status == "erreicht" OR pz_62_3_status == "teilweise_erreicht" OR pz_62_3_status == "nicht_zutreffend") AND (pz_62_4_status == "erreicht" OR pz_62_4_status == "teilweise_erreicht" OR pz_62_4_status == "nicht_zutreffend") AND (pz_62_5_status == "erreicht" OR pz_62_5_status == "teilweise_erreicht" OR pz_62_5_status == "nicht_zutreffend")', sev: 'block' },
  { ws: 'M8203-11', code: 'REQ-19', cond: 'qe62_items_y + qe62_items_p + qe62_items_n + qe62_items_na == qe62_items_total', sev: 'block' },
  { ws: 'M8203-11', code: 'REQ-20', cond: 'qe63a_items_total + qe63b_items_total == 40', sev: 'block' },
  { ws: 'M8203-11', code: 'REQ-21', cond: 'qe64a_items_total + qe64b_items_total == 50', sev: 'block' },
  // M8203-12 Phasenziele §6.3 — 8-conjunct
  { ws: 'M8203-12', code: 'REQ-10', cond: '(pz_63_1_status == "erreicht" OR pz_63_1_status == "teilweise_erreicht" OR pz_63_1_status == "nicht_zutreffend") AND (pz_63_2_status == "erreicht" OR pz_63_2_status == "teilweise_erreicht" OR pz_63_2_status == "nicht_zutreffend") AND (pz_63_3_status == "erreicht" OR pz_63_3_status == "teilweise_erreicht" OR pz_63_3_status == "nicht_zutreffend") AND (pz_63_4_status == "erreicht" OR pz_63_4_status == "teilweise_erreicht" OR pz_63_4_status == "nicht_zutreffend") AND (pz_63_5_status == "erreicht" OR pz_63_5_status == "teilweise_erreicht" OR pz_63_5_status == "nicht_zutreffend") AND (pz_63_6_status == "erreicht" OR pz_63_6_status == "teilweise_erreicht" OR pz_63_6_status == "nicht_zutreffend") AND (pz_63_7_status == "erreicht" OR pz_63_7_status == "teilweise_erreicht" OR pz_63_7_status == "nicht_zutreffend") AND (pz_63_8_status == "erreicht" OR pz_63_8_status == "teilweise_erreicht" OR pz_63_8_status == "nicht_zutreffend")', sev: 'block' },
  // M8203-14 Phasenziele §6.4 — 12-conjunct
  { ws: 'M8203-14', code: 'REQ-11', cond: '(pz_64_1_status == "erreicht" OR pz_64_1_status == "teilweise_erreicht" OR pz_64_1_status == "nicht_zutreffend") AND (pz_64_2_status == "erreicht" OR pz_64_2_status == "teilweise_erreicht" OR pz_64_2_status == "nicht_zutreffend") AND (pz_64_3_status == "erreicht" OR pz_64_3_status == "teilweise_erreicht" OR pz_64_3_status == "nicht_zutreffend") AND (pz_64_4_status == "erreicht" OR pz_64_4_status == "teilweise_erreicht" OR pz_64_4_status == "nicht_zutreffend") AND (pz_64_5_status == "erreicht" OR pz_64_5_status == "teilweise_erreicht" OR pz_64_5_status == "nicht_zutreffend") AND (pz_64_6_status == "erreicht" OR pz_64_6_status == "teilweise_erreicht" OR pz_64_6_status == "nicht_zutreffend") AND (pz_64_7_status == "erreicht" OR pz_64_7_status == "teilweise_erreicht" OR pz_64_7_status == "nicht_zutreffend") AND (pz_64_8_status == "erreicht" OR pz_64_8_status == "teilweise_erreicht" OR pz_64_8_status == "nicht_zutreffend") AND (pz_64_9_status == "erreicht" OR pz_64_9_status == "teilweise_erreicht" OR pz_64_9_status == "nicht_zutreffend") AND (pz_64_10_status == "erreicht" OR pz_64_10_status == "teilweise_erreicht" OR pz_64_10_status == "nicht_zutreffend") AND (pz_64_11_status == "erreicht" OR pz_64_11_status == "teilweise_erreicht" OR pz_64_11_status == "nicht_zutreffend") AND (pz_64_12_status == "erreicht" OR pz_64_12_status == "teilweise_erreicht" OR pz_64_12_status == "nicht_zutreffend")', sev: 'block' },
  // M8203-16 Phasenziele §6.5 — 12-conjunct + QE 6.5 sum gate
  { ws: 'M8203-16', code: 'REQ-12', cond: '(pz_65_1_status == "erreicht" OR pz_65_1_status == "teilweise_erreicht" OR pz_65_1_status == "nicht_zutreffend") AND (pz_65_2_status == "erreicht" OR pz_65_2_status == "teilweise_erreicht" OR pz_65_2_status == "nicht_zutreffend") AND (pz_65_3_status == "erreicht" OR pz_65_3_status == "teilweise_erreicht" OR pz_65_3_status == "nicht_zutreffend") AND (pz_65_4_status == "erreicht" OR pz_65_4_status == "teilweise_erreicht" OR pz_65_4_status == "nicht_zutreffend") AND (pz_65_5_status == "erreicht" OR pz_65_5_status == "teilweise_erreicht" OR pz_65_5_status == "nicht_zutreffend") AND (pz_65_6_status == "erreicht" OR pz_65_6_status == "teilweise_erreicht" OR pz_65_6_status == "nicht_zutreffend") AND (pz_65_7_status == "erreicht" OR pz_65_7_status == "teilweise_erreicht" OR pz_65_7_status == "nicht_zutreffend") AND (pz_65_8_status == "erreicht" OR pz_65_8_status == "teilweise_erreicht" OR pz_65_8_status == "nicht_zutreffend") AND (pz_65_9_status == "erreicht" OR pz_65_9_status == "teilweise_erreicht" OR pz_65_9_status == "nicht_zutreffend") AND (pz_65_10_status == "erreicht" OR pz_65_10_status == "teilweise_erreicht" OR pz_65_10_status == "nicht_zutreffend") AND (pz_65_11_status == "erreicht" OR pz_65_11_status == "teilweise_erreicht" OR pz_65_11_status == "nicht_zutreffend") AND (pz_65_12_status == "erreicht" OR pz_65_12_status == "teilweise_erreicht" OR pz_65_12_status == "nicht_zutreffend")', sev: 'block' },
  { ws: 'M8203-16', code: 'REQ-22', cond: 'qe65_items_y + qe65_items_p + qe65_items_n + qe65_items_na == qe65_items_total', sev: 'block' },
  // M8203-17 Phasenziele §6.6 — 11-conjunct + QE 6.6 sum gate
  { ws: 'M8203-17', code: 'REQ-13', cond: '(pz_66_1_status == "erreicht" OR pz_66_1_status == "teilweise_erreicht" OR pz_66_1_status == "nicht_zutreffend") AND (pz_66_2_status == "erreicht" OR pz_66_2_status == "teilweise_erreicht" OR pz_66_2_status == "nicht_zutreffend") AND (pz_66_3_status == "erreicht" OR pz_66_3_status == "teilweise_erreicht" OR pz_66_3_status == "nicht_zutreffend") AND (pz_66_4_status == "erreicht" OR pz_66_4_status == "teilweise_erreicht" OR pz_66_4_status == "nicht_zutreffend") AND (pz_66_5_status == "erreicht" OR pz_66_5_status == "teilweise_erreicht" OR pz_66_5_status == "nicht_zutreffend") AND (pz_66_6_status == "erreicht" OR pz_66_6_status == "teilweise_erreicht" OR pz_66_6_status == "nicht_zutreffend") AND (pz_66_7_status == "erreicht" OR pz_66_7_status == "teilweise_erreicht" OR pz_66_7_status == "nicht_zutreffend") AND (pz_66_8_status == "erreicht" OR pz_66_8_status == "teilweise_erreicht" OR pz_66_8_status == "nicht_zutreffend") AND (pz_66_9_status == "erreicht" OR pz_66_9_status == "teilweise_erreicht" OR pz_66_9_status == "nicht_zutreffend") AND (pz_66_10_status == "erreicht" OR pz_66_10_status == "teilweise_erreicht" OR pz_66_10_status == "nicht_zutreffend") AND (pz_66_11_status == "erreicht" OR pz_66_11_status == "teilweise_erreicht" OR pz_66_11_status == "nicht_zutreffend")', sev: 'block' },
  { ws: 'M8203-17', code: 'REQ-23', cond: 'qe66_items_y + qe66_items_p + qe66_items_n + qe66_items_na == qe66_items_total', sev: 'block' },
  // M8203-18 Phasenziele §6.7 — 6-conjunct + QE 6.7 sum gate
  { ws: 'M8203-18', code: 'REQ-14', cond: '(pz_67_1_status == "erreicht" OR pz_67_1_status == "teilweise_erreicht" OR pz_67_1_status == "nicht_zutreffend") AND (pz_67_2_status == "erreicht" OR pz_67_2_status == "teilweise_erreicht" OR pz_67_2_status == "nicht_zutreffend") AND (pz_67_3_status == "erreicht" OR pz_67_3_status == "teilweise_erreicht" OR pz_67_3_status == "nicht_zutreffend") AND (pz_67_4_status == "erreicht" OR pz_67_4_status == "teilweise_erreicht" OR pz_67_4_status == "nicht_zutreffend") AND (pz_67_5_status == "erreicht" OR pz_67_5_status == "teilweise_erreicht" OR pz_67_5_status == "nicht_zutreffend") AND (pz_67_6_status == "erreicht" OR pz_67_6_status == "teilweise_erreicht" OR pz_67_6_status == "nicht_zutreffend")', sev: 'block' },
  { ws: 'M8203-18', code: 'REQ-24', cond: 'qe67_items_y + qe67_items_p + qe67_items_n + qe67_items_na == qe67_items_total', sev: 'block' },
  // M8203-19 Digital Twin (§7.2.3) — single boolean
  { ws: 'M8203-19', code: 'REQ-26', cond: 'digital_twin_after_project == true', sev: 'block' },
  // M8203-20 Rechte an digitalen Daten (§7.4) — single boolean
  { ws: 'M8203-20', code: 'REQ-28', cond: 'digital_rights_clarified == true', sev: 'block' },
  // M8203-24 Gesamtverifizierung (§6.7) — two text IS NOT EMPTY + enum verdict membership
  { ws: 'M8203-24', code: 'REQ-32', cond: 'signoff_engineer IS NOT EMPTY AND signoff_client IS NOT EMPTY AND (overall_quality_verdict == "gruen" OR overall_quality_verdict == "gelb" OR overall_quality_verdict == "rot")', sev: 'block' },
] as const;

export type M820_3Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  instances: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
  /** symbol → home worksheet code (single-home topology) */
  symbolHome: Record<string, string>;
};

export async function seedM820_3(sql: postgres.Sql, userId: string): Promise<M820_3Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'm820-3-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('M820-3 Harness Org', ${'m820-3-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'M820-3-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-820-3', 'DWA-M 820-3 (harness)', 'harness') RETURNING id`;

  // Group home fields by worksheet.
  const fieldsByWs: Record<string, Array<{ symbol: string; dataType: DType }>> = {};
  for (const ws of M820_3_WORKSHEETS) fieldsByWs[ws] = [];
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) {
    fieldsByWs[home.ws].push({ symbol, dataType: home.dataType });
  }

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of M820_3_WORKSHEETS) {
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
      // active=true; is_required deliberately FALSE in the fixture so the per-gate
      // proof isolates the block-CONDITION path (checkApprovalGate's separate
      // missing-required-field list is not what we are proving here).
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the live BLOCK gates against their home worksheet templates.
  for (const g of M820_3_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  const symbolHome: Record<string, string> = {};
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) symbolHome[symbol] = home.ws;

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
