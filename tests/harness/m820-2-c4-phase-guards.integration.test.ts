/**
 * DWA-M 820-2 · case C4 findings F2 (820-2 part) + F6 (2026-10-15) — embedded-Postgres proof of
 *   scripts/migrations/20261015140000_m820_2_c4_phase_guards.sql
 *   scripts/rollback-20261015140000-m820-2-c4-phase-guards.sql
 *   scripts/verification/apply/readback-20261015140000-m820-2-c4-phase-guards.sql
 * (apply order + behaviour list: vault 01-Projects/ekowai-wizard/m820-wizard-test/77_APPLY-ORDER-m820-2-c4-phase-guards.md).
 *   F2 · three new phase drivers (C-9 pattern): 820-2-09 phase_auftrag_erteilt (4 contract / quality questions + REQ-16 … REQ-19),
 *        820-2-15 phase_planung_abgeschlossen (planning_summary_date), 820-2-19 phase_vergabe_abgeschlossen (5 award-summary entries).
 *   F6 · existing drivers: 820-2-25 (2) by eigene_regelwerke_vorhanden, 820-2-21 changes_record_date by phase_ausfuehrung_erreicht,
 *        kommunikations_plan_dokumentiert by oeffentlichkeitsbeteiligung_vorgesehen, 820-2-16 permit_conditions_tracked + REQ-37 by auflagen_count.
 *
 * Disposable embedded Postgres only — no prod, no .env.local. REAL saveWorksheet / checkApprovalGate / loadInheritedFields +
 * computeVisibility (the form's pair) / loadRequiredFieldCounts (progress) / loadStandardReportData (verdicts incl. warnings + the C-9
 * „phases not reached“ list). SEED: the three 2026-10-05 dumps + prior.json consumers and every M820 block applied on prod up to
 * 20261008100000 (workflow audit). The block's pre-signatures were taken from this seed; read-back R0 on prod (step 0) must show
 * fields_pre 18 / gates_pre 5 / new_drivers 0. 20261014100000 (staged, 820-2) is applied before AND after this block in test h.
 * ROWS: synthetic projects, no client data (C4 = the day-0 answers of case C4 on 820-2, as listed in 73_ §1, with neutral texts).
 * DISCOVER=1 (env C4P_DISCOVER) records probe values + post signatures to C4P_OUT instead of asserting them.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startHarness, type Harness } from './embedded-pg';
import { applyM820ProdOverlay, lostProdQuotes } from './m820-prod-overlay';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { loadInheritedFields as LoadInheritedFields } from '@/lib/db/queries/worksheet';
import type { loadRequiredFieldCounts as LoadRequiredFieldCounts } from '@/lib/projects/load-required-field-counts';
import type { loadStandardReportData as LoadStandardReportData } from '@/lib/pdf/load-standard-report';
import { computeVisibility } from '@/lib/compliance/visibility';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008c5';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261015140000_m820_2_c4_phase_guards.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261015140000-m820-2-c4-phase-guards.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261015140000-m820-2-c4-phase-guards.sql');
const O23 = resolve(ROOT, 'scripts/migrations/20261014100000_m820_followup_o2_o3.sql');
const O23_ROLLBACK = resolve(ROOT, 'scripts/rollback-20261014100000-m820-followup-o2-o3.sql');
const O23_READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261014100000-m820-followup-o2-o3.sql');
const DISCOVER = !!process.env.C4P_DISCOVER;
const DISCOVERED: Record<string, unknown> = {};
const PRIOR_BLOCKS = [
  'scripts/migrations/20261005193000_m820_1_client_route.sql',
  'scripts/migrations/20261005200000_m820_2_registers.sql',
  'scripts/migrations/20261006100000_m820_2_structure.sql',
  'scripts/migrations/20261006120000_m820_3_structure.sql',
  'scripts/migrations/20261006160000_m820_followup_1.sql',
  'scripts/migrations/20261006170000_m820_1_risk_changes.sql',
  'scripts/migrations/20261006180000_m820_1_req05_home.sql',
  'scripts/migrations/20261006190000_m820_flow_1.sql',
  'scripts/migrations/20261006200000_m820_flow_2.sql',
  'scripts/migrations/20261006210000_m820_flow_3.sql',
  'scripts/migrations/20261006220000_m820_3_hints.sql',
  'scripts/migrations/20261006221000_m820_1_hints.sql',
  'scripts/migrations/20261006222000_m820_2_hints.sql',
  'scripts/migrations/20261006230000_m820_3_projektstopp_paths.sql',
  'scripts/migrations/20261006240000_m820_guideline_criteria.sql',
  'scripts/migrations/20261007100000_m820_project_size_declaration.sql',
  'scripts/migrations/20261007110000_m820_decisions_48_50.sql',
  'scripts/migrations/20261007120000_m820_small_fixes.sql',
  'scripts/migrations/20261008100000_m820_workflow_audit.sql',
].map((p) => resolve(ROOT, p));
const LIVE_PHASE: Record<string, Array<[number, number, number]>> = {
  'DWA-M-820-1': [[1, 3, 1], [4, 9, 2], [10, 15, 3], [16, 20, 4], [21, 23, 5], [24, 25, 6]],
  'DWA-M-820-2': [[1, 4, 1], [5, 10, 2], [11, 15, 3], [16, 19, 4], [20, 24, 5], [25, 28, 6]],
  'DWA-M-820-3': [[1, 3, 1], [4, 6, 2], [7, 10, 3], [11, 18, 4], [19, 21, 5], [22, 24, 6]],
};
const log = (label: string, v: unknown) => {
  const line = `[M820-2 C4 PHASE GUARDS] ${label}: ${JSON.stringify(v)}`;
  console.log(line);
  if (process.env.HARNESS_LOG) appendFileSync(process.env.HARNESS_LOG, line + '\n'); // optional raw-output file
};
const md5 = (s: string) => createHash('md5').update(s).digest('hex');

type DumpField = {
  id: string; worksheet: string; section_id: string | null; symbol: string; label_de: string; label_en: string | null;
  data_type: string; unit: string | null; is_required: boolean; enum_values: unknown; validation_rules: unknown;
  clause_reference: string | null; description: string | null; order_index: number; verification_status: string;
  source_anchor: string | null; active: boolean; default_value: unknown; widget: string | null; ui_config: unknown;
  lookup: unknown; visible_when: string | null;
};
type DumpTable = {
  id: string; table_code: string; title_de: string; clause_reference: string | null; page_ref: string | null; key_columns: string[];
  value_columns: unknown; override_policy: string; override_quote?: string | null;
  rows: Array<{ row_key: string; keys: unknown; group_label: string | null; label_de: string; order_index?: number; row_values: unknown; verbatim_quote: string }>;
};
type Dump = {
  standard: { id: string; code: string; title_de: string; title_en: string | null; version: string };
  worksheets: Array<{ id: string; code: string; title_de: string; title_en: string | null; order_index: number }>;
  sections: Array<{ id: string; worksheet: string; parent_section_id: string | null; code: string | null; title_de: string; title_en: string | null; order_index: number; visible_when: string | null }>;
  fields: DumpField[];
  equations?: Array<{ id: string; worksheet: string; equation_number: string; formula: string; output_symbol: string | null; output_unit: string | null; input_symbols: string[] | null; clause_reference: string | null }>;
  gates: Array<{ id: string; worksheet: string; code: string; title_de: string; title_en: string | null; description: string | null; suggestion: string | null; severity: string; condition: string; clause_reference: string | null }>;
  tables?: DumpTable[];
};
const readJson = <T>(p: string): T => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8').replace(/^﻿/, '')) as T;

let harness: Harness;
let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;
let loadInheritedFields: typeof LoadInheritedFields;

async function seedDump(dumpPath: string, priorPath: string, edition: string): Promise<void> {
  const sql = harness.sql;
  const d = readJson<Dump>(dumpPath);
  const prior = readJson<Record<string, { consumer_worksheets?: string[] | null }>>(priorPath);
  await sql`INSERT INTO standards (id, code, title_de, title_en, version) VALUES (${d.standard.id}, ${d.standard.code}, ${d.standard.title_de}, ${d.standard.title_en}, ${d.standard.version})`;
  const tmpl = new Map<string, string>();
  for (const w of d.worksheets) {
    await sql`INSERT INTO worksheet_templates (id, standard_id, code, title_de, title_en, order_index)
              VALUES (${w.id}, ${d.standard.id}, ${w.code}, ${w.title_de}, ${w.title_en}, ${w.order_index})`;
    tmpl.set(w.code, w.id);
  }
  for (const s of d.sections) {
    await sql`INSERT INTO worksheet_sections (id, worksheet_template_id, code, title_de, title_en, order_index, visible_when)
              VALUES (${s.id}, ${tmpl.get(s.worksheet)!}, ${s.code}, ${s.title_de}, ${s.title_en}, ${s.order_index}, ${s.visible_when})`;
  }
  for (const s of d.sections.filter((x) => x.parent_section_id)) {
    await sql`UPDATE worksheet_sections SET parent_section_id = ${s.parent_section_id} WHERE id = ${s.id}`;
  }
  const j = (v: unknown) => (v === null || v === undefined ? null : sql.json(v as never));
  for (const f of d.fields) {
    const cw = prior[`${f.worksheet} ${f.symbol}`]?.consumer_worksheets ?? null;
    await sql`INSERT INTO fields (id, worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required,
                enum_values, validation_rules, clause_reference, description, consumer_worksheets, order_index, verification_status,
                source_anchor, active, default_value, widget, ui_config, lookup, visible_when)
              VALUES (${f.id}, ${tmpl.get(f.worksheet)!}, ${f.section_id}, ${f.symbol}, ${f.label_de}, ${f.label_en}, ${f.data_type},
                ${f.unit}, ${f.is_required}, ${j(f.enum_values)}, ${j(f.validation_rules)}, ${f.clause_reference}, ${f.description},
                ${cw}, ${f.order_index}, ${f.verification_status}, ${f.source_anchor}, ${f.active}, ${j(f.default_value)}, ${f.widget},
                ${j(f.ui_config)}, ${j(f.lookup)}, ${f.visible_when})`;
  }
  for (const e of d.equations ?? []) {
    await sql`INSERT INTO equations (id, worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference)
              VALUES (${e.id}, ${tmpl.get(e.worksheet)!}, ${e.equation_number}, ${e.formula}, ${e.input_symbols}, ${e.output_symbol}, ${e.output_unit}, ${e.clause_reference})`;
  }
  for (const g of d.gates) {
    await sql`INSERT INTO compliance_requirements (id, worksheet_template_id, code, title_de, title_en, condition, description, clause_reference, severity, suggestion)
              VALUES (${g.id}, ${tmpl.get(g.worksheet)!}, ${g.code}, ${g.title_de}, ${g.title_en}, ${g.condition}, ${g.description}, ${g.clause_reference}, ${g.severity}, ${g.suggestion})`;
  }
  for (const t of d.tables ?? []) {
    await sql`INSERT INTO regulation_tables (id, standard_code, edition, table_code, title_de, clause_reference, page_ref, key_columns, value_columns, override_policy, override_quote, verification_status)
              VALUES (${t.id}, ${d.standard.code}, ${edition}, ${t.table_code}, ${t.title_de}, ${t.clause_reference}, ${t.page_ref}, ${t.key_columns}, ${sql.json(t.value_columns as never)}, ${t.override_policy}, ${t.override_quote ?? null}, 'md_verified')`;
    let i = 0;
    for (const r of t.rows) {
      await sql`INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
                VALUES (${t.id}, ${r.row_key}, ${sql.json(r.keys as never)}, ${r.group_label}, ${r.label_de}, ${r.order_index ?? i}, ${sql.json(r.row_values as never)}, ${r.verbatim_quote})`;
      i++;
    }
  }
  log(`seeded ${d.standard.code}`, { worksheets: d.worksheets.length, fields: d.fields.length, equations: d.equations?.length ?? 0, gates: d.gates.length });
}



// ── full-table dump of the definition tables ─────────────────────────────────────────────────────────────────────
const TOUCHED = ['standards', 'worksheet_templates', 'worksheet_sections', 'fields', 'equations', 'compliance_requirements', 'regulation_tables', 'regulation_table_rows'] as const;
type TableDump = Record<string, string[]>;
async function dump(): Promise<TableDump> {
  const out: TableDump = {};
  for (const t of TOUCHED) {
    const rows = await harness.sql.unsafe<{ r: string }[]>(`SELECT row_to_json(x)::text AS r FROM ${t} x ORDER BY id`);
    out[t] = rows.map((r) => r.r);
  }
  return out;
}
function dumpDiff(a: TableDump, b: TableDump): string[] {
  const d: string[] = [];
  for (const t of TOUCHED) {
    const sa = new Set(a[t]); const sb = new Set(b[t]);
    for (const r of a[t]) if (!sb.has(r)) d.push(`${t} - ${r.slice(0, 220)}`);
    for (const r of b[t]) if (!sa.has(r)) d.push(`${t} + ${r.slice(0, 220)}`);
  }
  return d;
}
const tally = (diff: string[]) => { const k = diff.map((l) => l.split(' ').slice(0, 2).join(' ')); return Object.fromEntries([...new Set(k)].sort().map((x) => [x, k.filter((y) => y === x).length])); };
const digest = (d: TableDump) => Object.fromEntries(TOUCHED.map((t) => [t, `${d[t].length} rows md5 ${md5(d[t].join('\n'))}`]));
let loadRequiredFieldCounts: typeof LoadRequiredFieldCounts;
let loadStandardReportData: typeof LoadStandardReportData;

async function runFile(path: string): Promise<void> {
  const conn = await harness.sql.reserve();
  try { await conn.unsafe(readFileSync(path, 'utf8')); } finally { conn.release(); }
}
const LEDGERS = ['compliance_requirements_archive_m820_c4p', 'fields_archive_m820_c4p', 'm820_c4p_written'];
async function ledgers(): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  for (const t of LEDGERS) {
    const [r] = await harness.sql<{ t: string | null }[]>`SELECT to_regclass(${'public.' + t})::text AS t`;
    if (!r.t) { out[t] = null; continue; }
    const [c] = await harness.sql.unsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${t}`);
    out[t] = c.n;
  }
  return out;
}
const EMPTY = { compliance_requirements_archive_m820_c4p: 0, fields_archive_m820_c4p: 0, m820_c4p_written: 0 };
const FULL = { compliance_requirements_archive_m820_c4p: 5, fields_archive_m820_c4p: 18, m820_c4p_written: 26 };
const stmts = (p: string) => splitOnUnquotedSemicolons(readFileSync(p, 'utf8')).filter((s) => s.replace(/--.*$/gm, '').trim());
const RB_STMTS = stmts(READBACK);
/** R5 reads the block's ledgers, which exist only after an apply — before the apply run R0 … R4 (step 0 on prod). */
async function readback(n = RB_STMTS.length): Promise<unknown[][]> { const out: unknown[][] = []; for (const st of RB_STMTS.slice(0, n)) out.push([...(await harness.sql.unsafe(st))]); return out; }
async function o23R0(): Promise<unknown> { return [...(await harness.sql.unsafe(stmts(O23_READBACK)[0]))]; }

// ── project fixture (one project, every template of the three standards) ───────────────────────────────────────────
type Proj = { id: string; inst: Map<string, string> };
async function makeProject(name: string): Promise<Proj> {
  const sql = harness.sql;
  const [org] = await sql<{ id: string }[]>`SELECT id FROM orgs LIMIT 1`;
  const [p] = await sql<{ id: string }[]>`INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, ${name}, ${USER_ID}) RETURNING id`;
  const tm = await sql<{ id: string; code: string }[]>`SELECT id, code FROM worksheet_templates`;
  const inst = new Map<string, string>();
  for (const t of tm) {
    const [i] = await sql<{ id: string }[]>`INSERT INTO worksheet_instances (project_id, worksheet_template_id) VALUES (${p.id}, ${t.id}) RETURNING id`;
    inst.set(t.code, i.id);
  }
  return { id: p.id, inst };
}
type V = { type: 'boolean'; value: boolean } | { type: 'enum'; value: string } | { type: 'text'; value: string } | { type: 'date'; value: string }
  | { type: 'number'; value: number } | { type: 'json'; value: unknown };
const e = (value: string): V => ({ type: 'enum', value });
const b = (value: boolean): V => ({ type: 'boolean', value });
const t = (value: string): V => ({ type: 'text', value });
const j = (value: unknown): V => ({ type: 'json', value });
const rows = (r: unknown[]): V => j({ rows: r });
async function save(p: Proj, ws: string, vals: Record<string, V>) {
  const ids = await harness.sql<{ id: string; symbol: string }[]>`
    SELECT f.id, f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
    WHERE s.code = 'DWA-M-820-2' AND w.code = ${ws} AND f.active AND f.symbol IN ${harness.sql(Object.keys(vals))}`;
  expect(ids.length, `${ws} fields ${Object.keys(vals)}`).toBe(Object.keys(vals).length);
  const values = Object.fromEntries(ids.map((f) => [f.id, vals[f.symbol]]));
  const r = await saveWorksheet({ instanceId: p.inst.get(ws)!, values: values as never });
  expect(r.ok, `${ws} save ${JSON.stringify(r)}`).toBe(true);
  return r;
}
async function unset(p: Proj, sym: string) {
  await harness.sql`DELETE FROM project_parameters pp USING fields f WHERE pp.field_id = f.id AND pp.project_id = ${p.id} AND f.symbol = ${sym}`;
}

/** The form's pair (visibility.ts): own fields are hideable; the lookup resolves own + inherited (consumer_worksheets) saved values. */
async function formHidden(p: Proj, ws: string): Promise<string[]> {
  const sql = harness.sql;
  const [tp] = await sql<{ id: string; standard_id: string }[]>`SELECT w.id, w.standard_id FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = ${ws}`;
  const own = await sql<{ id: string; symbol: string; section_id: string | null; visible_when: string | null }[]>`
    SELECT id, symbol, section_id, visible_when FROM fields WHERE worksheet_template_id = ${tp.id} AND active`;
  const secs = await sql<{ id: string; parent_section_id: string | null; visible_when: string | null }[]>`
    SELECT id, parent_section_id, visible_when FROM worksheet_sections WHERE worksheet_template_id = ${tp.id}`;
  const inh = await loadInheritedFields(tp.id, tp.standard_id, ws);
  const ids = [...own.map((f) => f.id), ...inh.map((f) => f.id)];
  const symById = new Map<string, string>([...own.map((f) => [f.id, f.symbol] as const), ...inh.map((f) => [f.id, f.symbol] as const)]);
  const vals = await sql<{ field_id: string; v: string | boolean | null }[]>`
    SELECT field_id, COALESCE(value_boolean::text, value_enum, value_text, value_number::text) AS v
      FROM project_parameters WHERE project_id = ${p.id} AND field_id IN ${sql(ids)}`;
  const bySym = new Map<string, string | boolean | number | null>();
  for (const r of vals) {
    const v = r.v === 'true' ? true : r.v === 'false' ? false : r.v;
    bySym.set(symById.get(r.field_id)!, typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v);
  }
  const vis = computeVisibility(
    own.map((f) => ({ id: f.id, symbol: f.symbol, sectionId: f.section_id, visibleWhen: f.visible_when })),
    secs.map((s) => ({ id: s.id, parentSectionId: s.parent_section_id, visibleWhen: s.visible_when })),
    (s) => bySym.get(s) ?? undefined,
  );
  return [...vis.hiddenSymbols].sort();
}
/** The guarded symbols per sheet (F2 + F6) and the three new drivers. */
const GUARDED: Record<string, string[]> = {
  '820-2-09': ['approval_procedure_defined', 'contract_amendments_tracked', 'qs_plan_lph8_present', 'quality_monitoring_active'],
  '820-2-15': ['planning_summary_date'],
  '820-2-16': ['permit_conditions_tracked'],
  '820-2-19': ['auswahlentscheidung_dokumentiert', 'final_contract_value', 'vergabesumme_summary_date', 'vergabeverfahren_used', 'zuschlag_erteilt_datum'],
  '820-2-21': ['changes_record_date', 'kommunikations_plan_dokumentiert'],
  '820-2-25': ['approval_release_process', 'guidelines_update_schedule'],
};
const NEW_DRIVERS: Array<[string, string]> = [['820-2-09', 'phase_auftrag_erteilt'], ['820-2-15', 'phase_planung_abgeschlossen'], ['820-2-19', 'phase_vergabe_abgeschlossen']];
/** Which guarded symbols the form hides, per sheet (only guarded + driver symbols are reported). */
async function guardHidden(p: Proj): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const ws of Object.keys(GUARDED)) {
    const h = await formHidden(p, ws);
    const watch = [...GUARDED[ws], ...NEW_DRIVERS.filter(([w]) => w === ws).map(([, s]) => s)];
    out[ws] = h.filter((s) => watch.includes(s));
  }
  return out;
}
/** Missing required (real approval gate) on the touched sheets. */
async function missing(p: Proj): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const ws of Object.keys(GUARDED)) {
    const g = await checkApprovalGate(p.inst.get(ws)!);
    const m = g.missingRequiredFields.map((f) => f.symbol).sort();
    if (m.length) out[ws] = m;
  }
  return out;
}
/** Progress surface (get_standard_progress / sidebar): open required per 820-2 sheet + total, by the shared rule. */
async function openRequired(p: Proj): Promise<Record<string, number>> {
  const sql = harness.sql;
  const [s] = await sql<{ id: string }[]>`SELECT id FROM standards WHERE code = 'DWA-M-820-2'`;
  const tm = await sql<{ id: string; code: string }[]>`SELECT id, code FROM worksheet_templates WHERE standard_id = ${s.id} ORDER BY order_index`;
  const counts = await loadRequiredFieldCounts(p.id, s.id);
  const out: Record<string, number> = {};
  let total = 0;
  for (const tp of tm) {
    const c = counts.get(tp.id);
    const open = c ? c.totalRequired - c.filledRequired : 0;
    total += open;
    if (open) out[tp.code] = open;
  }
  out.ALL_820_2 = total;
  return out;
}
const GATES: Array<[string, string]> = [['820-2-09', 'REQ-16'], ['820-2-09', 'REQ-17'], ['820-2-09', 'REQ-18'], ['820-2-09', 'REQ-19'], ['820-2-16', 'REQ-37'], ['820-2-25', 'REQ-54']];
/** Verdicts of the guarded gates (block AND warn) from the standard report: kind, ':skipped' for a guard-skipped pass;
 * for block gates also the REAL approval gate (fail / wait / none). */
async function gateView(p: Proj): Promise<Record<string, string>> {
  const rep = await loadStandardReportData(p.id, 'DWA-M-820-2');
  const out: Record<string, string> = {};
  for (const [ws, code] of GATES) {
    const c = rep.worksheets.find((w) => w.code === ws)!.compliance.find((x) => x.code === code)!;
    const r = c.result as { kind: string; guardSkipped?: boolean };
    let v = `${c.severity}:${r.kind}${r.guardSkipped ? ':skipped' : ''}`;
    if (c.severity === 'block') {
      const g = await checkApprovalGate(p.inst.get(ws)!);
      v += g.failingBlockConditions.some((x) => x.code === code) ? '/fail' : g.pendingBlockConditions.some((x) => x.code === code) ? '/wait' : '/none';
    }
    out[code] = v;
  }
  return out;
}
/** C-9: the „phases not reached“ list of the standard report (driver + gates not checked because of it). */
async function c9(p: Proj): Promise<Array<{ ws: string; symbol: string; gates: string[]; elsewhere: string[] }>> {
  const rep = await loadStandardReportData(p.id, 'DWA-M-820-2');
  return (rep.phaseDeferrals ?? []).map((d) => ({ ws: d.worksheetCode, symbol: d.symbol, gates: d.gates.map((g) => g.code).sort(), elsewhere: d.skippedElsewhere.map((g) => g.code).sort() }));
  // (sorted: the report lists gates in DB row order, which changes when a row is updated — fix round 1)
}
const inherits = async (ws: string, sym: string) => {
  const [tp] = await harness.sql<{ id: string; standard_id: string }[]>`SELECT w.id, w.standard_id FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = ${ws}`;
  return (await loadInheritedFields(tp.id, tp.standard_id, ws)).some((f) => f.symbol === sym);
};

/** C4 at day 0 on DWA-M 820-2 (73_ §1): what C4 wrote, with neutral synthetic texts; the 36 empties of 73_ §2 stay empty. */
async function fillC4(p: Proj) {
  await save(p, '820-2-01', { project_name: t('C4-like bungalow, stormwater concept'), worksheet_status: e('draft'), project_location: t('NRW'), client_name: t('Private client'),
    client_type: e('private'), project_category: e('neubau'), project_size: e('klein'), primary_sector: e('wasserwirtschaft'), scope_technical: t('Infiltration and surface-water concept'),
    verantwortung_lph0: e('auftraggeber'), verantwortung_lph9: e('auftraggeber'), included_hoai_phases: j([]) });
  await save(p, '820-2-02', { operator_betreiber: t('Plot owner'), project_goals: rows([{ ziel: 'Drain the plot safely' }]), projektkultur_documented: b(false),
    stakeholders_list: rows([{ rolle: 'Client' }]) });
  await save(p, '820-2-03', { communication_concept: t('E-mail, numbered questions'), contract_type: e('planning'), hoai_compliance: b(false) });
  await save(p, '820-2-04', { eigene_regelwerke_vorhanden: b(false), regulations_current_check: b(true), applicable_din_standards: rows([]),
    applicable_dwa_standards: rows([{ regelwerk: 'DWA-A 138-1', ausgabe: '2024-10' }]) });
  await save(p, '820-2-05', { project_handbook_complete: b(false), projektsteuerung_scope: j(['keine']), mgmt_cycle_frequency: e('anlassbezogen'), mgmt_cycle_planen: b(false),
    mgmt_cycle_durchfuehren: b(false), bauherr_tasks_defined: b(false), decision_competencies_mapped: b(false) });
  await save(p, '820-2-06', { change_log_present: b(false), mgmt_cycle_kontrollieren: b(false), mgmt_cycle_steuern: b(false) });
  await save(p, '820-2-07', { master_schedule_present: b(false), detailed_schedule_present: b(false) });
  await save(p, '820-2-08', { cost_planning_din276: b(false), life_cycle_cost_considered: b(false), cost_control_documented: b(false) });
  await save(p, '820-2-09', { approval_procedure_defined: b(false), contract_amendments_tracked: b(false), hoai_grundleistungen_limits: b(false), qs_plan_lph8_present: b(false),
    quality_monitoring_active: b(false) });
  await save(p, '820-2-10', { risk_register_present: b(false) });
  await save(p, '820-2-11', { framework_conditions_clarified: b(false) });
  await save(p, '820-2-12', { decisions_documented: b(true), meeting_protocols_active: b(false) });
  await save(p, '820-2-13', { decision_competencies_clear: b(false), third_parties_engaged_early: b(false) });
  await save(p, '820-2-14', { risk_analysis_performed: b(false), oeffentlichkeitsbeteiligung_vorgesehen: b(false) });
  await save(p, '820-2-15', { lph_completed: j([]), planning_milestones_met: b(false), cost_estimation_phase_done: b(false), permitting_complete: b(false) });
  // no permit granted yet: the conditions register is saved empty (C4's live record never saved it — see 77_)
  await save(p, '820-2-16', { einleitung_vorhanden: b(false), permit_inventory_complete: rows([{ genehmigung: 'Building permit', status: 'in preparation' }]), auflagen: rows([]) });
  await save(p, '820-2-20', { phase_ausfuehrung_erreicht: b(false) });
  await save(p, '820-2-22', { phase_inbetriebnahme_erreicht: b(false), testbetrieb_planned: b(false), testbetrieb_documentation_precondition: b(false) });
  await save(p, '820-2-24', { phase_gewaehrleistung_erreicht: b(false) });
  await save(p, '820-2-26', { innovation_verlangt: b(false) });
  await save(p, '820-2-27', { data_quality_checked: b(true), software_products_defined: rows([{ software: 'QGIS' }]) });
  await save(p, '820-2-28', { digital_rights_clarified: b(false), data_security_measures: rows([{ massnahme: 'Client documents local only' }]) });
}
/** Ja / filled: every existing driver says yes, the guarded answers are No — the checks must still refuse. */
async function fillJa(p: Proj) {
  await save(p, '820-2-01', { verantwortung_lph8: e('auftragnehmer') });
  await save(p, '820-2-04', { eigene_regelwerke_vorhanden: b(true) });
  await save(p, '820-2-25', { approval_release_process: b(false), guidelines_update_schedule: t('none') });
  await save(p, '820-2-14', { oeffentlichkeitsbeteiligung_vorgesehen: b(true) });
  await save(p, '820-2-20', { phase_ausfuehrung_erreicht: b(true) });
  await save(p, '820-2-21', { kommunikations_plan_dokumentiert: b(false) });
  await save(p, '820-2-16', { auflagen: rows([{ auflage: 'Notify the authority before backfilling', genehmigung: 'Water-law permit', erledigt: false }]), permit_conditions_tracked: b(false) });
  await save(p, '820-2-17', { bauleistungen_vergeben: b(true) });
  await save(p, '820-2-09', { approval_procedure_defined: b(false), contract_amendments_tracked: b(false), qs_plan_lph8_present: b(false), quality_monitoring_active: b(false) });
}
const DRIVERS = (v: boolean) => async (p: Proj) => {
  await save(p, '820-2-09', { phase_auftrag_erteilt: b(v) });
  await save(p, '820-2-15', { phase_planung_abgeschlossen: b(v) });
  await save(p, '820-2-19', { phase_vergabe_abgeschlossen: b(v) });
};
async function unsetDrivers(p: Proj) { for (const [, s] of NEW_DRIVERS) await unset(p, s); }

let PRE: TableDump;
const P: Record<string, Proj> = {};
type Probe = { label: string; run: () => Promise<unknown>; before: unknown; after: unknown };
let PROBES: Probe[] = [];
const EXPECTED: Record<string, [unknown, unknown]> = JSON.parse(readFileSync(resolve(__dirname, 'm820-2-c4-phase-guards.expected.json'), 'utf8')) as never;

beforeAll(async () => {
  harness = await startHarness();
  process.env.DATABASE_URL = harness.databaseUrl;
  process.env.BYPASS_AUTH = 'true';
  process.env.BYPASS_AUTH_USER_ID = USER_ID;
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
  process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
  const sql = harness.sql;
  await sql`ALTER TABLE fields ADD COLUMN IF NOT EXISTS source_anchor text`;
  await sql`ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS source_quote text`;
  await sql`ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS source_anchor text`;
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-2-c4-phase-guards@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820-2 C4 phase guards harness', ${'m820-c4p-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${USER_ID}, 'owner')`;
  await seedDump('tests/harness/m820-1-client-route.dump.json', 'src/lib/eval/field-configs/m820_1.prior.json', '2020');
  await seedDump('tests/harness/m820-2-registers.dump.json', 'src/lib/eval/field-configs/m820_2.prior.json', '2023');
  await seedDump('tests/harness/m820-3-structure.dump.json', 'src/lib/eval/field-configs/m820_3.prior.json', '2026');
  for (const [std, ranges] of Object.entries(LIVE_PHASE)) {
    for (const [a, b2, ph] of ranges) {
      await sql`UPDATE worksheet_templates w SET phase = ${ph} FROM standards s WHERE s.id = w.standard_id AND s.code = ${std}
                 AND w.order_index BETWEEN ${a} AND ${b2}`;
    }
  }
  for (const blk of PRIOR_BLOCKS) await runFile(blk); // = prod after 20261008100000
  expect(await applyM820ProdOverlay(sql)).toEqual({ fields: 729, matched: 729 }); // + prod verification_quote (2026-10-17): seed = prod
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadInheritedFields } = await import('@/lib/db/queries/worksheet'));
  ({ loadRequiredFieldCounts } = await import('@/lib/projects/load-required-field-counts'));
  ({ loadStandardReportData } = await import('@/lib/pdf/load-standard-report'));

  P.c4 = await makeProject('C4-like day 0 on 820-2 (no contract, planning open, no client rules, empty registers, no participation, no permit)');
  await fillC4(P.c4);
  P.ja = await makeProject('Ja / filled: client rules, participation, construction started, one permit condition, works awarded, LPH 8 by the contractor');
  await fillC4(P.ja);
  await fillJa(P.ja);
  P.empty = await makeProject('nothing answered on 820-2');
  P.rb = await makeProject('rollback / read-back check: driver answers saved while the block is applied');

  PROBES = [];
  for (const k of ['c4', 'ja', 'empty']) {
    PROBES.push({ label: `form hides (guarded + drivers) · ${k}`, run: () => guardHidden(P[k]), before: undefined, after: undefined });
    PROBES.push({ label: `missing required (gate) · ${k}`, run: () => missing(P[k]), before: undefined, after: undefined });
    PROBES.push({ label: `open required 820-2 (progress) · ${k}`, run: () => openRequired(P[k]), before: undefined, after: undefined });
    PROBES.push({ label: `guarded gates · ${k}`, run: () => gateView(P[k]), before: undefined, after: undefined });
    PROBES.push({ label: `C-9 phases not reached · ${k}`, run: () => c9(P[k]), before: undefined, after: undefined });
  }
  PROBES.push({ label: 'oeffentlichkeitsbeteiligung_vorgesehen inherited on 820-2-21', run: () => inherits('820-2-21', 'oeffentlichkeitsbeteiligung_vorgesehen'), before: undefined, after: undefined });
  for (const p of PROBES) {
    const x = EXPECTED[p.label];
    if (!x) { if (DISCOVER) continue; throw new Error(`no expectation for ${p.label}`); }
    [p.before, p.after] = x;
  }
}, 900_000);

afterAll(async () => {
  if (DISCOVER && process.env.C4P_OUT) writeFileSync(process.env.C4P_OUT, JSON.stringify(DISCOVERED, null, 1));
  await harness?.stop();
});

async function probeAll(): Promise<unknown[]> { const out: unknown[] = []; for (const p of PROBES) out.push(await p.run()); return out; }
const check = (key: string, got: unknown, want: unknown) => { if (DISCOVER) { DISCOVERED[key] = got; return; } expect(got, key).toEqual(want); };
const sigs = () => harness.sql`SELECT 'g ' || w.code || ' ' || cr.code AS k, md5(concat_ws('|', coalesce(cr.condition,''), cr.severity, md5(coalesce(cr.description,'')), coalesce(cr.clause_reference,''))) AS sig
    FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE cr.id IN (SELECT id FROM compliance_requirements_archive_m820_c4p)
  UNION ALL SELECT 'f ' || w.code || ' ' || f.symbol, md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, md5(coalesce(f.verification_quote,'')), coalesce(f.source_anchor,'')))
    FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE f.id IN (SELECT id FROM fields_archive_m820_c4p) ORDER BY 1`;
const touchedTexts = () => harness.sql<{ k: string; description: string; vq: string | null; sa: string | null }[]>`
    SELECT 'g ' || w.code || ' ' || cr.code AS k, cr.description, NULL::text AS vq, NULL::text AS sa FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
     WHERE cr.id IN (SELECT id FROM compliance_requirements_archive_m820_c4p)
    UNION ALL SELECT 'f ' || w.code || ' ' || f.symbol, f.description, f.verification_quote, f.source_anchor FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
     WHERE f.id IN (SELECT id FROM fields_archive_m820_c4p) OR f.id IN (SELECT id FROM m820_c4p_written WHERE tbl = 'fields_new') ORDER BY 1`;

describe('DWA-M 820-2 case C4 F2 / F6 phase drivers and guards — staged block on embedded Postgres (seed = prod after 20261008100000)', () => {
  it('a. pre-state (read-back R0 fields_pre 18 / gates_pre 5 / new_drivers 0, R3 = REQ-16 … REQ-19 + REQ-37); probes BEFORE through the real paths', async () => {
    expect(await ledgers()).toEqual({ compliance_requirements_archive_m820_c4p: null, fields_archive_m820_c4p: null, m820_c4p_written: null });
    const r = await readback(5);
    log('BEFORE read-back R0..R4', r);
    expect(r[0]).toMatchObject([{ fields: '18', fields_pre: '18', fields_post: '0', gates: '5', gates_pre: '5', gates_post: '0', fields_neither: null, gates_neither: null, new_drivers: '0' }]);
    expect(r[1]).toHaveLength(23);
    expect((r[2] as Array<{ saved_values: string }>).length).toBe(15);
    expect((r[3] as Array<{ code: string }>).map((x) => x.code)).toEqual(['REQ-16', 'REQ-17', 'REQ-18', 'REQ-19', 'REQ-37']);
    expect(r[4]).toEqual([]);
    const before = await probeAll();
    log('BEFORE probes', Object.fromEntries(PROBES.map((p, i) => [p.label, before[i]])));
    PROBES.forEach((p, i) => check(`before ${p.label}`, before[i], p.before));
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: 18 fields + 5 gates changed, 3 drivers inserted, nothing else; severities unchanged; every touched text DE + [EN] with its quote', async () => {
    const sevBefore = await harness.sql`SELECT cr.id, cr.severity FROM compliance_requirements cr ORDER BY 1`;
    await runFile(MIGRATION);
    const diff = dumpDiff(PRE, await dump());
    log('apply diff (table / sign counts)', tally(diff));
    expect(tally(diff)).toEqual({ 'compliance_requirements +': 5, 'compliance_requirements -': 5, 'fields +': 21, 'fields -': 18 });
    expect(await ledgers()).toEqual(FULL);
    const sevAfter = await harness.sql`SELECT cr.id, cr.severity FROM compliance_requirements cr ORDER BY 1`;
    expect([...sevAfter]).toEqual([...sevBefore]);
    const texts = await touchedTexts();
    // 2026-10-17: every printed quote prod already held in verification_quote survives (kept first, the guard quote appended after " | ")
    expect(lostProdQuotes('DWA-M-820-2', texts)).toEqual([]);
    expect(texts).toHaveLength(26);
    // exactly one '[EN] ' block, after a newline, in every touched text
    expect(texts.filter((x) => x.description.split('\n[EN] ').length !== 2).map((x) => x.k)).toEqual([]);
    // every guarded field + every new driver carries a verbatim quote in description + verification_quote + source_anchor (PDF page)
    // (820-2-04 eigene_regelwerke_vorhanden already carried its own § 6.1 quote — hint only, quote columns untouched)
    const quoted = texts.filter((x) => x.vq !== null && x.k !== 'f 820-2-04 eigene_regelwerke_vorhanden');
    expect(quoted.map((x) => x.k)).toHaveLength(18);
    expect(quoted.filter((x) => !/„.{20,}“/.test(x.vq!) || !/PDF S\. \d+/.test(x.sa ?? '') || !/„.{20,}“/.test(x.description)).map((x) => x.k)).toEqual([]);
    // the C-9 phase definition (820-3 § 2.1) is quoted on all three drivers
    expect(texts.filter((x) => x.description.includes('der einen eindeutigen Beginn und ein definiertes Ende aufweist')).map((x) => x.k))
      .toEqual(['f 820-2-09 phase_auftrag_erteilt', 'f 820-2-15 phase_planung_abgeschlossen', 'f 820-2-19 phase_vergabe_abgeschlossen']);
    // the drivers follow the C-9 pattern of 20261008100000: boolean, required, section B, order 0, imported_unverified
    const drv = await harness.sql`SELECT w.code AS ws, f.symbol, f.data_type, f.is_required AS req, ws.code AS sec, f.order_index AS oi, f.verification_status AS vs, coalesce(f.visible_when, '') AS vis
      FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN worksheet_sections ws ON ws.id = f.section_id
     WHERE f.symbol IN ('phase_auftrag_erteilt', 'phase_planung_abgeschlossen', 'phase_vergabe_abgeschlossen', 'phase_ausfuehrung_erreicht') ORDER BY 1`;
    expect([...drv]).toEqual([
      { ws: '820-2-09', symbol: 'phase_auftrag_erteilt', data_type: 'boolean', req: true, sec: 'B', oi: 0, vs: 'imported_unverified', vis: '' },
      { ws: '820-2-15', symbol: 'phase_planung_abgeschlossen', data_type: 'boolean', req: true, sec: 'B', oi: 0, vs: 'imported_unverified', vis: '' },
      { ws: '820-2-19', symbol: 'phase_vergabe_abgeschlossen', data_type: 'boolean', req: true, sec: 'B', oi: 0, vs: 'imported_unverified', vis: 'bauleistungen_vergeben == true' },
      { ws: '820-2-20', symbol: 'phase_ausfuehrung_erreicht', data_type: 'boolean', req: true, sec: 'B', oi: 0, vs: 'imported_unverified', vis: '' },
    ]);
    const post = Object.fromEntries((await sigs()).map((r) => [r.k, r.sig]));
    log('post-state signatures (read-back R0 sig1)', post);
    if (DISCOVER) DISCOVERED.sig1 = post;
  });

  it('c. apply again: 0 changes (full dump compare), ledgers unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    expect(dumpDiff(before, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(FULL);
  });

  it('d. rollback: byte-equal to the pre-state (drivers and their saved answers removed), archives and ledger emptied; second rollback no-op', async () => {
    await DRIVERS(false)(P.rb); // a saved driver answer must not block the rollback (own project: no stale flags on the probe projects)
    await runFile(ROLLBACK);
    const after = await dump();
    expect(dumpDiff(PRE, after)).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await ledgers()).toEqual(EMPTY);
    const [left] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
      WHERE f.symbol IN ('phase_auftrag_erteilt', 'phase_planung_abgeschlossen', 'phase_vergabe_abgeschlossen')`;
    expect(left.n).toBe(0);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('d2. a gate and a new driver edited after the apply are left alone by the rollback (archive + ledger rows kept); the rest is restored', async () => {
    await runFile(MIGRATION);
    await harness.sql`UPDATE compliance_requirements cr SET description = cr.description || ' (edited)' FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = '820-2-09' AND cr.code = 'REQ-16'`;
    await harness.sql`UPDATE fields f SET label_de = f.label_de || ' (edited)' WHERE f.symbol = 'phase_planung_abgeschlossen'`;
    await runFile(ROLLBACK);
    const l = await ledgers();
    const req16 = (await harness.sql<{ condition: string }[]>`SELECT cr.condition FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE w.code = '820-2-09' AND cr.code = 'REQ-16'`)[0].condition;
    const drivers = (await harness.sql<{ symbol: string }[]>`SELECT symbol FROM fields WHERE symbol IN ('phase_auftrag_erteilt', 'phase_planung_abgeschlossen', 'phase_vergabe_abgeschlossen') ORDER BY 1`).map((x) => x.symbol);
    log('rollback with one edited gate + one edited driver', { l, req16, drivers });
    expect(l).toEqual({ compliance_requirements_archive_m820_c4p: 1, fields_archive_m820_c4p: 0, m820_c4p_written: 2 });
    expect(req16).toMatch(/^IF phase_auftrag_erteilt == true THEN/);
    expect(drivers).toEqual(['phase_planung_abgeschlossen']);
    await harness.sql`UPDATE compliance_requirements cr SET description = left(cr.description, length(cr.description) - length(' (edited)')) FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = '820-2-09' AND cr.code = 'REQ-16'`;
    await harness.sql`UPDATE fields f SET label_de = left(f.label_de, length(f.label_de) - length(' (edited)')) WHERE f.symbol = 'phase_planung_abgeschlossen'`;
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('e. the read-back file runs before and after an apply and shows the expected values', async () => {
    expect(RB_STMTS).toHaveLength(6);
    expect(readFileSync(READBACK, 'utf8').split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(6);
    await runFile(MIGRATION);
    await DRIVERS(false)(P.rb);
    const post = await readback();
    log('read-back (after)', post);
    if (!DISCOVER) expect(post[0]).toEqual([{ fields: '18', fields_pre: '0', fields_post: '18', gates: '5', gates_pre: '0', gates_post: '5', fields_neither: null, gates_neither: null, new_drivers: '3' }]);
    expect(post[1]).toHaveLength(26);
    check('read-back R1 after', post[1], EXPECTED['read-back R1 after']?.[1]);
    expect(post[3]).toEqual([]);
    expect((post[4] as Array<{ symbol: string; value: string }>).map((x) => `${x.symbol} ${x.value}`)).toEqual(['phase_auftrag_erteilt false', 'phase_planung_abgeschlossen false', 'phase_vergabe_abgeschlossen false']);
    expect(post[5]).toEqual([{ gate_archive: '5', field_archive: '18', written: '26', written_new: '3' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('f. AFTER, drivers unanswered: guarded questions stay visible (fail-safe), REQ-16 waits and names the driver; existing-driver guards act at once', async () => {
    await runFile(MIGRATION);
    const after = await probeAll();
    log('AFTER probes (new drivers unanswered)', Object.fromEntries(PROBES.map((p, i) => [p.label, after[i]])));
    PROBES.forEach((p, i) => check(`after ${p.label}`, after[i], p.after));
    if (!DISCOVER) {
      // non-vacuity: the block changes what the real paths report (not only the definition rows)
      const changed = PROBES.filter((p) => JSON.stringify(p.before) !== JSON.stringify(p.after)).map((p) => p.label);
      log('probes that changed', changed);
      expect(changed).toEqual(expect.arrayContaining(['form hides (guarded + drivers) · c4', 'open required 820-2 (progress) · c4', 'guarded gates · c4',
        'guarded gates · ja', 'oeffentlichkeitsbeteiligung_vorgesehen inherited on 820-2-21']));
      expect(changed).not.toContain('form hides (guarded + drivers) · ja'); // Ja state: nothing hidden before or after
    }
    const g = await checkApprovalGate(P.c4.inst.get('820-2-09')!);
    const named = g.pendingBlockConditions.find((c) => c.code === 'REQ-16')?.missingInputs.map((x) => x.symbol) ?? null;
    expect(named).toEqual(['phase_auftrag_erteilt']);
    await runFile(ROLLBACK);
  });

  it('g. AFTER, C4 benchmark: new drivers = Nein ⇒ hidden, gates not applicable, listed in the C-9 section; Ja ⇒ visible and the checks refuse again', async () => {
    await runFile(MIGRATION);
    const view = async (p: Proj) => ({ hidden: await guardHidden(p), missing: await missing(p), open: await openRequired(p), gates: await gateView(p), c9: await c9(p) });
    await DRIVERS(false)(P.c4);
    const c4Nein = await view(P.c4);
    await DRIVERS(true)(P.c4);
    const c4Ja = await view(P.c4);
    await DRIVERS(false)(P.c4);
    const c4Back = await view(P.c4);
    await DRIVERS(true)(P.ja);
    const jaJa = await view(P.ja);
    await DRIVERS(false)(P.ja);
    const jaNein = await view(P.ja);
    const res = { c4Nein, c4Ja, c4Back, jaJa, jaNein };
    log('C4 benchmark + Ja both ways (after)', res);
    for (const [k, v] of Object.entries(res)) check(`g ${k}`, v, EXPECTED[`g ${k}`]?.[1]);
    if (!DISCOVER) {
      expect(c4Back).toEqual(c4Nein);
      // the C4 day-0 count on 820-2 drops from 36 (73_ §2) to 25 once the three drivers say Nein
      expect((PROBES.find((p) => p.label === 'open required 820-2 (progress) · c4')!.before as Record<string, number>).ALL_820_2).toBe(36);
      expect(c4Nein.open.ALL_820_2).toBe(25);
    }
    await unsetDrivers(P.c4); await unsetDrivers(P.ja);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('h. order independence with the staged 20261014100000 (820-2-17 / -18 / -22 only): before or after it, same end state; each rolls back alone', async () => {
    // O-2/O-3 first, then this block
    await runFile(O23);
    const afterO23 = await dump();
    await runFile(MIGRATION);
    const both1 = await dump();
    expect(tally(dumpDiff(afterO23, both1))).toEqual({ 'compliance_requirements +': 5, 'compliance_requirements -': 5, 'fields +': 21, 'fields -': 18 });
    const rb1 = await readback(1);
    if (!DISCOVER) expect(rb1[0]).toEqual([{ fields: '18', fields_pre: '0', fields_post: '18', gates: '5', gates_pre: '0', gates_post: '5', fields_neither: null, gates_neither: null, new_drivers: '3' }]);
    expect(await o23R0()).toMatchObject([{ fields_post: '2', gates_post: '1', fields_neither: null, gates_neither: null }]);
    await DRIVERS(false)(P.c4);
    const c4Both = { hidden: await guardHidden(P.c4), open: await openRequired(P.c4), gates: await gateView(P.c4) };
    await unsetDrivers(P.c4);
    await runFile(ROLLBACK);
    expect(dumpDiff(afterO23, await dump())).toEqual([]);
    await runFile(O23_ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    // this block first, then O-2/O-3
    await runFile(MIGRATION);
    await runFile(O23);
    expect(dumpDiff(both1, await dump()).filter((l) => !l.includes('phase_auftrag_erteilt') && !l.includes('phase_planung_abgeschlossen') && !l.includes('phase_vergabe_abgeschlossen'))).toEqual([]);
    expect(await o23R0()).toMatchObject([{ fields_post: '2', gates_post: '1', fields_neither: null, gates_neither: null }]);
    expect((await readback(1))[0]).toEqual(rb1[0]);
    // the 820-2 C4 behaviour does not depend on O-2/O-3 (C4 has bauleistungen_vergeben unanswered)
    log('C4 with both blocks', c4Both);
    if (!DISCOVER) expect(c4Both).toEqual({ hidden: (EXPECTED['g c4Nein'][1] as { hidden: unknown }).hidden, open: (EXPECTED['g c4Nein'][1] as { open: unknown }).open, gates: (EXPECTED['g c4Nein'][1] as { gates: unknown }).gates });
    await runFile(O23_ROLLBACK);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });
});
