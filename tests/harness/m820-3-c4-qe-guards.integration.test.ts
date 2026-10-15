/**
 * DWA-M 820-3 · case C4 findings F3 + F4 (2026-10-15) — embedded-Postgres proof of
 *   scripts/migrations/20261015160000_m820_3_c4_qe_guards.sql
 *   scripts/rollback-20261015160000-m820-3-c4-qe-guards.sql
 *   scripts/verification/apply/readback-20261015160000-m820-3-c4-qe-guards.sql
 * (apply order + behaviour list: vault 01-Projects/ekowai-wizard/m820-wizard-test/79_APPLY-ORDER-m820-3-c4-qe-guards.md).
 *   F3 · the QE assessment block of M8203-11 … -18 (8 × 8 fields) and the M8203-23 summary (3) are shown only once ≥ 1 phase goal of the
 *        phase is rated erreicht / teilweise_erreicht / nicht_erreicht (all noch_nicht_erreicht / nicht_zutreffend ⇒ hidden; unanswered ⇒
 *        visible); REQ-19 … REQ-24 gain the phase clause; qe*_items_total becomes the derived printed constant (8 equations <ws>-D10).
 *   F4 · pz_62_1_status hint („Phase noch nicht erreicht“ while LPH 0 runs; § 3 quoted).
 *
 * Disposable embedded Postgres only — no prod, no .env.local. REAL saveWorksheet / checkApprovalGate / loadInheritedFields +
 * computeVisibility (the form's pair) / loadRequiredFieldCounts (progress) / loadStandardReportData (verdicts incl. warnings) /
 * recomputeWorksheetEquations (MCP recompute). SEED: the three 2026-10-05 dumps + prior.json consumers and every M820 block applied on prod
 * up to 20261008100000 (workflow audit). The block's pre-signatures were taken from this seed; read-back R0 on prod (step 0) must show
 * fields_pre 91 / gates_pre 6 / new_equations 0. 20261014100000 (staged) is applied before AND after this block in test h; the staged
 * 820-1 / 820-2 blocks 20261015130000 / 150000 / 140000 are run with it in test h2 when their worktrees exist.
 * ROWS: synthetic projects, no client data (C4 = the day-0 answers of case C4 on 820-3, as listed in 73_ §1, with neutral texts).
 * DISCOVER=1 (env C4Q_DISCOVER) records probe values + post signatures to C4Q_OUT instead of asserting them.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, appendFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startHarness, type Harness } from './embedded-pg';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { loadInheritedFields as LoadInheritedFields } from '@/lib/db/queries/worksheet';
import type { loadRequiredFieldCounts as LoadRequiredFieldCounts } from '@/lib/projects/load-required-field-counts';
import type { loadStandardReportData as LoadStandardReportData } from '@/lib/pdf/load-standard-report';
import type { recomputeWorksheetEquations as RecomputeWorksheetEquations } from '@/lib/actions/recompute-worksheet';
import { computeVisibility } from '@/lib/compliance/visibility';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008c6';
const STD = 'DWA-M-820-3';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261015160000_m820_3_c4_qe_guards.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261015160000-m820-3-c4-qe-guards.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261015160000-m820-3-c4-qe-guards.sql');
const O23 = resolve(ROOT, 'scripts/migrations/20261014100000_m820_followup_o2_o3.sql');
const O23_ROLLBACK = resolve(ROOT, 'scripts/rollback-20261014100000-m820-followup-o2-o3.sql');
// staged sibling blocks on other standards (other worktrees; test h2 runs only when they exist on this machine)
const SIB = {
  c4f: ['C:/Users/Ekowai/_wt-m820-guards/scripts/migrations/20261015130000_m820_1_c4_procurement_guards.sql', 'C:/Users/Ekowai/_wt-m820-guards/scripts/rollback-20261015130000-m820-1-c4-procurement-guards.sql'],
  c4d: ['C:/Users/Ekowai/_wt-m820-guards/scripts/migrations/20261015150000_m820_1_c4_phase_drivers.sql', 'C:/Users/Ekowai/_wt-m820-guards/scripts/rollback-20261015150000-m820-1-c4-phase-drivers.sql'],
  c4p: ['C:/Users/Ekowai/_wt-m820-2g/scripts/migrations/20261015140000_m820_2_c4_phase_guards.sql', 'C:/Users/Ekowai/_wt-m820-2g/scripts/rollback-20261015140000-m820-2-c4-phase-guards.sql'],
};
const SIB_PRESENT = Object.values(SIB).every(([a, b]) => existsSync(a) && existsSync(b));
const DISCOVER = !!process.env.C4Q_DISCOVER;
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
  const line = `[M820-3 C4 QE GUARDS] ${label}: ${JSON.stringify(v)}`;
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
let loadRequiredFieldCounts: typeof LoadRequiredFieldCounts;
let loadStandardReportData: typeof LoadStandardReportData;
let recompute: typeof RecomputeWorksheetEquations;

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
const APPLY_TALLY = { 'compliance_requirements +': 6, 'compliance_requirements -': 6, 'equations +': 8, 'fields +': 91, 'fields -': 91 };

async function runFile(path: string): Promise<void> {
  const conn = await harness.sql.reserve();
  try {
    await conn.unsafe(readFileSync(path, 'utf8'));
  } catch (x) {
    await conn.unsafe('ROLLBACK'); // an aborted block must not hand a broken transaction back to the pool (test a2)
    throw x;
  } finally { conn.release(); }
}
const LEDGERS = ['compliance_requirements_archive_m820_c4q', 'fields_archive_m820_c4q', 'm820_c4q_written'];
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
const EMPTY = { compliance_requirements_archive_m820_c4q: 0, fields_archive_m820_c4q: 0, m820_c4q_written: 0 };
const FULL = { compliance_requirements_archive_m820_c4q: 6, fields_archive_m820_c4q: 91, m820_c4q_written: 105 };
const stmts = (p: string) => splitOnUnquotedSemicolons(readFileSync(p, 'utf8')).filter((s) => s.replace(/--.*$/gm, '').trim());
const RB_STMTS = stmts(READBACK);
/** R5 reads the block's ledgers, which exist only after an apply — before the apply run R0 … R4 (step 0 on prod). */
async function readback(n = RB_STMTS.length): Promise<unknown[][]> { const out: unknown[][] = []; for (const st of RB_STMTS.slice(0, n)) out.push([...(await harness.sql.unsafe(st))]); return out; }

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
const d = (value: string): V => ({ type: 'date', value });
const n = (value: number): V => ({ type: 'number', value });
const j = (value: unknown): V => ({ type: 'json', value });
async function save(p: Proj, ws: string, vals: Record<string, V>) {
  const ids = await harness.sql<{ id: string; symbol: string }[]>`
    SELECT f.id, f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
    WHERE s.code = ${STD} AND w.code = ${ws} AND f.active AND f.symbol IN ${harness.sql(Object.keys(vals))}`;
  expect(ids.length, `${ws} fields ${Object.keys(vals)}`).toBe(Object.keys(vals).length);
  const values = Object.fromEntries(ids.map((f) => [f.id, vals[f.symbol]]));
  const r = await saveWorksheet({ instanceId: p.inst.get(ws)!, values: values as never });
  expect(r.ok, `${ws} save ${JSON.stringify(r)}`).toBe(true);
  return r;
}
async function unset(p: Proj, syms: string[]) {
  await harness.sql`DELETE FROM project_parameters pp USING fields f, worksheet_templates w, standards s
    WHERE pp.field_id = f.id AND f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = ${STD} AND pp.project_id = ${p.id} AND f.symbol IN ${harness.sql(syms)}`;
}

/** The form's pair (visibility.ts): own fields are hideable; the lookup resolves own + inherited (consumer_worksheets) saved values. */
async function formHidden(p: Proj, ws: string): Promise<string[]> {
  const sql = harness.sql;
  const [tp] = await sql<{ id: string; standard_id: string }[]>`SELECT w.id, w.standard_id FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = ${STD} AND w.code = ${ws}`;
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
const QE: Array<[string, string]> = [['M8203-11', 'qe62'], ['M8203-12', 'qe63a'], ['M8203-13', 'qe63b'], ['M8203-14', 'qe64a'], ['M8203-15', 'qe64b'], ['M8203-16', 'qe65'], ['M8203-17', 'qe66'], ['M8203-18', 'qe67']];
const ASSESS = ['assessor', 'assessment_date', 'fulfilment_pct', 'items_y', 'items_p', 'items_n', 'items_na', 'items_total'];
/** The guarded symbols per sheet (F3). */
const GUARDED: Record<string, string[]> = {
  ...Object.fromEntries(QE.map(([ws, p]) => [ws, ASSESS.map((a) => `${p}_${a}`).sort()])),
  'M8203-23': ['gesamt_anhang_b_fulfilment_pct', 'gesamt_anhang_b_items_total', 'gesamt_anhang_b_verdict'],
};
const GOALS: Record<string, string[]> = {
  'M8203-11': [1, 2, 3, 4, 5].map((i) => `pz_62_${i}_status`),
  'M8203-13': [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `pz_63_${i}_status`),
  'M8203-15': Array.from({ length: 12 }, (_, i) => `pz_64_${i + 1}_status`),
  'M8203-16': Array.from({ length: 12 }, (_, i) => `pz_65_${i + 1}_status`),
  'M8203-17': Array.from({ length: 11 }, (_, i) => `pz_66_${i + 1}_status`),
  'M8203-18': Array.from({ length: 6 }, (_, i) => `pz_67_${i + 1}_status`),
};
/** Which guarded symbols the form hides, per sheet (only guarded symbols are reported). */
async function guardHidden(p: Proj): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const ws of Object.keys(GUARDED)) out[ws] = (await formHidden(p, ws)).filter((s) => GUARDED[ws].includes(s));
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
/** Progress surface (get_standard_progress / sidebar): open required per 820-3 sheet + total, by the shared rule. */
async function openRequired(p: Proj): Promise<Record<string, number>> {
  const sql = harness.sql;
  const [s] = await sql<{ id: string }[]>`SELECT id FROM standards WHERE code = ${STD}`;
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
  out.ALL_820_3 = total;
  return out;
}
const GATES: Array<[string, string]> = [['M8203-11', 'REQ-19'], ['M8203-16', 'REQ-22'], ['M8203-17', 'REQ-23'], ['M8203-18', 'REQ-24'], ['M8203-23', 'REQ-20'], ['M8203-23', 'REQ-21']];
/** Verdicts of the guarded gates (all warn) from the standard report: severity:kind, ':skipped' for a guard-skipped pass. */
async function gateView(p: Proj): Promise<Record<string, string>> {
  const rep = await loadStandardReportData(p.id, STD);
  const out: Record<string, string> = {};
  for (const [ws, code] of GATES) {
    const c = rep.worksheets.find((w) => w.code === ws)!.compliance.find((x) => x.code === code)!;
    const r = c.result as { kind: string; guardSkipped?: boolean };
    out[code] = `${c.severity}:${r.kind}${r.guardSkipped ? ':skipped' : ''}`;
  }
  return out;
}
const inherits = async (ws: string, sym: string) => {
  const [tp] = await harness.sql<{ id: string; standard_id: string }[]>`SELECT w.id, w.standard_id FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = ${STD} AND w.code = ${ws}`;
  return (await loadInheritedFields(tp.id, tp.standard_id, ws)).some((f) => f.symbol === sym);
};
const goals = (ws: string, v: string, override: Record<string, string> = {}) => Object.fromEntries(GOALS[ws].map((g) => [g, e(override[g] ?? v)]));

/** C4 at day 0 on DWA-M 820-3 (73_ §1): what C4 wrote, with neutral synthetic texts; the 83 empties of 73_ §2 stay empty. */
async function fillC4(p: Proj) {
  await save(p, 'M8203-01', { applicable_lph: j([]), client_name: t('Private client'), contract_reference: t('no contract yet'), contractor_auftragnehmer: t('not yet commissioned'),
    part1_applicable: b(true), part2_applicable: b(true), project_location: t('NRW'), project_name: t('C4-like bungalow, stormwater concept'), project_type: e('einzelprojekt'),
    registration_date: d('2026-10-14'), sector_abfall: b(false), sector_abwasser: b(true), sector_wasserbau: b(false), sector_wasserwirtschaft: b(true) });
  await save(p, 'M8203-02', { kleiner_kommunaler_betrieb: b(false) });
  await save(p, 'M8203-03', { bild1_step_1_bedarfsplanung_konzept: b(false), bild1_step_2_konzept_gesamtsystem: b(false), bild1_step_3_identifikation_projekte: b(false),
    bild1_step_4_einzelprojekt_lifecycle: b(true) });
  await save(p, 'M8203-11', goals('M8203-11', 'noch_nicht_erreicht', { pz_62_2_status: 'nicht_zutreffend' }));
  for (const ws of ['M8203-13', 'M8203-15', 'M8203-16', 'M8203-17', 'M8203-18']) await save(p, ws, goals(ws, 'noch_nicht_erreicht'));
  await save(p, 'M8203-19', { digitale_methoden_bim_angewendet: b(false) });
  await save(p, 'M8203-20', { akz_in_place: b(false), bestandsdaten_complete_digital: b(false), digital_rights_clarified: b(false) });
  await save(p, 'M8203-21', { public_info_via_digital_media: b(false) });
}
/** Ja / filled: every phase completed, goals „Erreicht“, the assessment block filled — the counts do not add up, so the warnings still fire. */
async function fillJa(p: Proj) {
  for (const ws of Object.keys(GOALS)) await save(p, ws, goals(ws, 'erreicht'));
  const totals: Record<string, number> = { qe62: 15, qe63a: 20, qe63b: 19, qe64a: 17, qe64b: 33, qe65: 34, qe66: 10, qe67: 6 }; // qe63a 20 ≠ 21: REQ-20 fails
  for (const [ws, p2] of QE) {
    await save(p, ws, { [`${p2}_assessor`]: t('Project lead'), [`${p2}_assessment_date`]: d('2026-10-15'), [`${p2}_fulfilment_pct`]: n(80),
      [`${p2}_items_y`]: n(1), [`${p2}_items_p`]: n(1), [`${p2}_items_n`]: n(1), [`${p2}_items_na`]: n(1), [`${p2}_items_total`]: n(totals[p2]) });
  }
  await save(p, 'M8203-23', { gesamt_anhang_b_fulfilment_pct: n(80), gesamt_anhang_b_items_total: n(155), gesamt_anhang_b_verdict: e('gelb') });
}
/** Mixed: one goal unanswered on M8203-11 (the rest „noch nicht erreicht“) ⇒ visible; M8203-18 all „nicht zutreffend“ ⇒ hidden; M8203-16 one
 * goal „Teilweise erreicht“ ⇒ visible; M8203-13 one goal „Erreicht“ ⇒ M8203-12 AND -13 visible; M8203-15 all „noch nicht erreicht“ ⇒ -14 / -15 hidden. */
async function fillMixed(p: Proj) {
  await save(p, 'M8203-01', { project_type: e('einzelprojekt') });
  await save(p, 'M8203-11', Object.fromEntries(GOALS['M8203-11'].slice(1).map((g) => [g, e('noch_nicht_erreicht')])));
  await save(p, 'M8203-13', goals('M8203-13', 'noch_nicht_erreicht', { pz_63_1_status: 'erreicht' }));
  await save(p, 'M8203-15', goals('M8203-15', 'noch_nicht_erreicht'));
  await save(p, 'M8203-16', goals('M8203-16', 'noch_nicht_erreicht', { pz_65_3_status: 'teilweise_erreicht' }));
  await save(p, 'M8203-17', goals('M8203-17', 'noch_nicht_erreicht'));
  await save(p, 'M8203-18', goals('M8203-18', 'nicht_zutreffend'));
}

let PRE: TableDump;
const P: Record<string, Proj> = {};
type Probe = { label: string; run: () => Promise<unknown>; before: unknown; after: unknown };
let PROBES: Probe[] = [];
const EXPECTED: Record<string, [unknown, unknown]> = existsSync(resolve(__dirname, 'm820-3-c4-qe-guards.expected.json'))
  ? JSON.parse(readFileSync(resolve(__dirname, 'm820-3-c4-qe-guards.expected.json'), 'utf8')) as never : {};

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-3-c4-qe-guards@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820-3 C4 QE guards harness', ${'m820-c4q-' + Date.now()}) RETURNING id`;
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
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadInheritedFields } = await import('@/lib/db/queries/worksheet'));
  ({ loadRequiredFieldCounts } = await import('@/lib/projects/load-required-field-counts'));
  ({ loadStandardReportData } = await import('@/lib/pdf/load-standard-report'));
  ({ recomputeWorksheetEquations: recompute } = await import('@/lib/actions/recompute-worksheet'));

  P.c4 = await makeProject('C4-like day 0 on 820-3 (Einzelprojekt, every phase goal „Phase noch nicht erreicht“, PZ 6.2-2 nicht zutreffend)');
  await fillC4(P.c4);
  P.ja = await makeProject('Ja / filled: every phase completed, goals „Erreicht“, assessment block filled with counts that do not add up');
  await fillC4(P.ja);
  await fillJa(P.ja);
  P.mixed = await makeProject('mixed: unanswered / teilweise / erreicht on the closing sheet / nicht zutreffend');
  await fillMixed(P.mixed);
  P.empty = await makeProject('nothing answered on 820-3 except project_type');
  await save(P.empty, 'M8203-01', { project_type: e('einzelprojekt') });
  P.rc = await makeProject('recompute: phase 6.2 completed, nothing typed in the assessment block');

  PROBES = [];
  for (const k of ['c4', 'ja', 'mixed', 'empty']) {
    PROBES.push({ label: `form hides (guarded) · ${k}`, run: () => guardHidden(P[k]), before: undefined, after: undefined });
    PROBES.push({ label: `missing required (gate) · ${k}`, run: () => missing(P[k]), before: undefined, after: undefined });
    PROBES.push({ label: `open required 820-3 (progress) · ${k}`, run: () => openRequired(P[k]), before: undefined, after: undefined });
    PROBES.push({ label: `guarded gates · ${k}`, run: () => gateView(P[k]), before: undefined, after: undefined });
  }
  PROBES.push({ label: 'pz_63_1_status inherited on M8203-12', run: () => inherits('M8203-12', 'pz_63_1_status'), before: undefined, after: undefined });
  PROBES.push({ label: 'pz_64_12_status inherited on M8203-14', run: () => inherits('M8203-14', 'pz_64_12_status'), before: undefined, after: undefined });
  for (const p of PROBES) {
    const x = EXPECTED[p.label];
    if (!x) { if (DISCOVER) continue; throw new Error(`no expectation for ${p.label}`); }
    [p.before, p.after] = x;
  }
}, 900_000);

afterAll(async () => {
  if (DISCOVER && process.env.C4Q_OUT) writeFileSync(process.env.C4Q_OUT, JSON.stringify(DISCOVERED, null, 1));
  await harness?.stop();
});

async function probeAll(): Promise<unknown[]> { const out: unknown[] = []; for (const p of PROBES) out.push(await p.run()); return out; }
const check = (key: string, got: unknown, want: unknown) => { if (DISCOVER) { DISCOVERED[key] = got; return; } expect(got, key).toEqual(want); };
const sigs = () => harness.sql`SELECT 'g ' || w.code || ' ' || cr.code AS k, md5(concat_ws('|', coalesce(cr.condition,''), cr.severity, md5(coalesce(cr.description,'')), coalesce(cr.clause_reference,''))) AS sig
    FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE cr.id IN (SELECT id FROM compliance_requirements_archive_m820_c4q)
  UNION ALL SELECT 'f ' || w.code || ' ' || f.symbol, md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, md5(coalesce(f.verification_quote,'')), coalesce(f.source_anchor,'')))
    FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE f.id IN (SELECT id FROM fields_archive_m820_c4q) ORDER BY 1`;
const touchedTexts = () => harness.sql<{ k: string; description: string; vq: string | null; sa: string | null }[]>`
    SELECT 'g ' || w.code || ' ' || cr.code AS k, cr.description, NULL::text AS vq, NULL::text AS sa FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
     WHERE cr.id IN (SELECT id FROM compliance_requirements_archive_m820_c4q)
    UNION ALL SELECT 'f ' || w.code || ' ' || f.symbol, f.description, f.verification_quote, f.source_anchor FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
     WHERE f.id IN (SELECT id FROM fields_archive_m820_c4q)
    UNION ALL SELECT 'e ' || w.code || ' ' || e.equation_number, e.description, e.verification_quote, NULL FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id
     WHERE e.id IN (SELECT id FROM m820_c4q_written WHERE tbl = 'equations_new') ORDER BY 1`;
const Q21 = 'Ergebnisse, die nach Abschluss der jeweiligen Leistungsphase zu erreichen sind';

describe('DWA-M 820-3 case C4 F3 / F4 QE assessment guards — staged block on embedded Postgres (seed = prod after 20261008100000)', () => {
  it('a. pre-state (read-back R0 fields_pre 91 / gates_pre 6 / new_equations 0, R3 = REQ-19 … REQ-24); probes BEFORE through the real paths', async () => {
    expect(await ledgers()).toEqual({ compliance_requirements_archive_m820_c4q: null, fields_archive_m820_c4q: null, m820_c4q_written: null });
    const r = await readback(5);
    log('BEFORE read-back R0..R4', r);
    expect(r[0]).toMatchObject([{ fields: '91', fields_pre: '91', fields_post: '0', gates: '6', gates_pre: '6', gates_post: '0', fields_neither: null, gates_neither: null, new_equations: '0' }]);
    expect(r[1]).toHaveLength(97);
    expect((r[2] as unknown[]).length).toBe(67);
    expect([...new Set((r[3] as Array<{ code: string }>).map((x) => x.code))].sort()).toEqual(['REQ-19', 'REQ-20', 'REQ-21', 'REQ-22', 'REQ-23', 'REQ-24']);
    expect(r[4]).toEqual([]);
    const before = await probeAll();
    log('BEFORE probes', Object.fromEntries(PROBES.map((p, i) => [p.label, before[i]])));
    PROBES.forEach((p, i) => check(`before ${p.label}`, before[i], p.before));
    if (!DISCOVER) {
      // C4 day 0 on 820-3 = 73_ §2: 83 open required, 8 on each of M8203-11 … -18, 3 on M8203-23
      const c4 = before[PROBES.findIndex((p) => p.label === 'open required 820-3 (progress) · c4')] as Record<string, number>;
      expect(c4.ALL_820_3).toBe(83);
      expect(QE.map(([ws]) => c4[ws])).toEqual([8, 8, 8, 8, 8, 8, 8, 8]);
      expect(c4['M8203-23']).toBe(3);
    }
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('a2. step-0 guard: one touched row edited ⇒ the whole block aborts, nothing written, no ledgers', async () => {
    await harness.sql`UPDATE fields f SET label_de = f.label_de || ' (drift)' FROM worksheet_templates w WHERE w.id = f.worksheet_template_id AND w.code = 'M8203-17' AND f.symbol = 'qe66_items_n'`;
    const drifted = await dump();
    let err = '';
    try { await runFile(MIGRATION); } catch (x) { err = String((x as Error).message); }
    log('apply on a drifted row', err);
    expect(err).toMatch(/pre-state mismatch \(fields 90 of 91, gates 6 of 6/);
    expect(dumpDiff(drifted, await dump())).toEqual([]);
    expect(await ledgers()).toEqual({ compliance_requirements_archive_m820_c4q: null, fields_archive_m820_c4q: null, m820_c4q_written: null });
    await harness.sql`UPDATE fields f SET label_de = left(f.label_de, length(f.label_de) - length(' (drift)')) FROM worksheet_templates w WHERE w.id = f.worksheet_template_id AND w.code = 'M8203-17' AND f.symbol = 'qe66_items_n'`;
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('b. apply: 91 fields + 6 gates changed, 8 equations inserted, nothing else; severities unchanged; every touched text DE + [EN] with its quote', async () => {
    const sevBefore = await harness.sql`SELECT cr.id, cr.severity FROM compliance_requirements cr ORDER BY 1`;
    await runFile(MIGRATION);
    const diff = dumpDiff(PRE, await dump());
    log('apply diff (table / sign counts)', tally(diff));
    expect(tally(diff)).toEqual(APPLY_TALLY);
    expect(await ledgers()).toEqual(FULL);
    const sevAfter = await harness.sql`SELECT cr.id, cr.severity FROM compliance_requirements cr ORDER BY 1`;
    expect([...sevAfter]).toEqual([...sevBefore]);
    const texts = await touchedTexts();
    expect(texts).toHaveLength(105);
    // exactly one '[EN] ' block, after a newline, in every touched text (fields, gates, new equations)
    expect(texts.filter((x) => x.description.split('\n[EN] ').length !== 2).map((x) => x.k)).toEqual([]);
    // every guarded field (67) carries the § 2.1 quote in description + verification_quote and a PDF page in source_anchor; tool logic is labelled
    const guarded = texts.filter((x) => x.k.startsWith('f ') && x.vq !== null);
    expect(guarded).toHaveLength(67);
    expect(guarded.filter((x) => !x.description.includes(Q21) || !x.vq!.includes(Q21) || !/Werkzeug-Logik \/ tool logic/.test(x.vq!) || !/PDF S\. \d+/.test(x.sa ?? '')).map((x) => x.k)).toEqual([]);
    expect(guarded.filter((x) => !/Werkzeug-Logik/.test(x.description.split('\n[EN] ')[0]) || !/tool logic/.test(x.description.split('\n[EN] ')[1])).map((x) => x.k)).toEqual([]);
    // the derived totals and their equations name the printed table and its last row, labelled as a tool derivation
    const totals = texts.filter((x) => /_items_total$/.test(x.k) && x.k.startsWith('f M8203-1'));
    expect(totals).toHaveLength(8);
    expect(totals.filter((x) => !/^Werkzeug-Ableitung \/ tool derivation/.test(x.vq!) || !/letzte Zeile „/.test(x.vq!)).map((x) => x.k)).toEqual([]);
    // F4: the pz_62_1_status hint no longer pushes „Teilweise“ at day 0 and quotes § 3
    const pz621 = texts.find((x) => x.k === 'f M8203-11 pz_62_1_status')!.description;
    expect(pz621).toContain('solange die Bedarfsplanung (LPH 0) noch läuft → hier „Phase noch nicht erreicht“');
    expect(pz621).toContain('„Werden Phasenziele nicht oder nur unvollständig erreicht, ist die Prüfung eines Projektstopps erforderlich.“');
    expect(pz621).not.toContain('Nein dort → hier je nach Stand');
    // the new equations: constant output = printed count, no inputs
    const eqs = await harness.sql`SELECT w.code AS ws, e.equation_number AS no, e.formula, e.input_symbols AS inp, e.output_symbol AS out FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id
      WHERE e.id IN (SELECT id FROM m820_c4q_written WHERE tbl = 'equations_new') ORDER BY 1`;
    expect(eqs.map((x) => x.formula)).toEqual(['qe62_items_total = 15', 'qe63a_items_total = 21', 'qe63b_items_total = 19', 'qe64a_items_total = 17', 'qe64b_items_total = 33',
      'qe65_items_total = 34', 'qe66_items_total = 10', 'qe67_items_total = 6']);
    expect(eqs.every((x) => Array.isArray(x.inp) && x.inp.length === 0 && x.no === `${x.ws}-D10`)).toBe(true);
    // the totals now have the shape of the *_calc outputs: not required, widget derived
    const tf = await harness.sql`SELECT f.symbol, f.is_required AS req, f.widget FROM fields f WHERE f.symbol LIKE 'qe6%\\_items\\_total' ORDER BY 1`;
    expect(tf.every((x) => x.req === false && x.widget === 'derived')).toBe(true);
    const post = Object.fromEntries((await sigs()).map((r) => [r.k, r.sig]));
    log('post-state signatures (read-back R0 sig1)', Object.keys(post).length);
    if (DISCOVER) DISCOVERED.sig1 = post;
  });

  it('c. apply again: 0 changes (full dump compare), ledgers unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    expect(dumpDiff(before, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(FULL);
  });

  it('d. rollback: byte-equal to the pre-state (equations removed), archives and ledger emptied; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    expect(dumpDiff(PRE, after)).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await ledgers()).toEqual(EMPTY);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('d2. a gate and a new equation edited after the apply are left alone by the rollback (archive + ledger rows kept); the rest is restored', async () => {
    await runFile(MIGRATION);
    await harness.sql`UPDATE compliance_requirements cr SET description = cr.description || ' (edited)' FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = 'M8203-16' AND cr.code = 'REQ-22'`;
    await harness.sql`UPDATE equations SET description = description || ' (edited)' WHERE equation_number = 'M8203-17-D10'`;
    await runFile(ROLLBACK);
    const l = await ledgers();
    const req22 = (await harness.sql<{ condition: string }[]>`SELECT cr.condition FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE w.code = 'M8203-16' AND cr.code = 'REQ-22'`)[0].condition;
    const eqs = (await harness.sql<{ no: string }[]>`SELECT equation_number AS no FROM equations WHERE equation_number LIKE 'M8203-1_-D10' ORDER BY 1`).map((x) => x.no);
    log('rollback with one edited gate + one edited equation', { l, req22: req22.slice(0, 60), eqs });
    expect(l).toEqual({ compliance_requirements_archive_m820_c4q: 1, fields_archive_m820_c4q: 0, m820_c4q_written: 2 });
    expect(req22).toMatch(/^IF \(pz_65_1_status IN/);
    expect(eqs).toEqual(['M8203-17-D10']);
    await harness.sql`UPDATE compliance_requirements cr SET description = left(cr.description, length(cr.description) - length(' (edited)')) FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = 'M8203-16' AND cr.code = 'REQ-22'`;
    await harness.sql`UPDATE equations SET description = left(description, length(description) - length(' (edited)')) WHERE equation_number = 'M8203-17-D10'`;
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('e. the read-back file runs before and after an apply and shows the expected values', async () => {
    expect(RB_STMTS).toHaveLength(6);
    expect(readFileSync(READBACK, 'utf8').split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(6);
    await runFile(MIGRATION);
    const post = await readback();
    log('read-back (after) R0 / R3 / R4 / R5', [post[0], post[3], post[4], post[5]]);
    if (!DISCOVER) expect(post[0]).toEqual([{ fields: '91', fields_pre: '0', fields_post: '91', gates: '6', gates_pre: '0', gates_post: '6', fields_neither: null, gates_neither: null, new_equations: '8' }]);
    expect(post[1]).toHaveLength(97);
    expect(post[3]).toEqual([]);
    expect((post[4] as Array<{ equation_number: string }>).map((x) => x.equation_number)).toEqual(QE.map(([ws]) => `${ws}-D10`));
    expect(post[5]).toEqual([{ gate_archive: '6', field_archive: '91', written: '105', written_new: '8' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('f. AFTER: C4 hides the 64 + 3 assessment answers (83 → 16 open); unanswered goals keep the block visible; Ja keeps every warning', async () => {
    await runFile(MIGRATION);
    const after = await probeAll();
    log('AFTER probes', Object.fromEntries(PROBES.map((p, i) => [p.label, after[i]])));
    PROBES.forEach((p, i) => check(`after ${p.label}`, after[i], p.after));
    if (!DISCOVER) {
      // non-vacuity: the block changes what the real paths report (not only the definition rows)
      const changed = PROBES.filter((p) => JSON.stringify(p.before) !== JSON.stringify(p.after)).map((p) => p.label);
      log('probes that changed', changed);
      expect(changed).toEqual(expect.arrayContaining(['form hides (guarded) · c4', 'missing required (gate) · c4', 'open required 820-3 (progress) · c4', 'guarded gates · c4',
        'form hides (guarded) · mixed', 'pz_63_1_status inherited on M8203-12', 'pz_64_12_status inherited on M8203-14']));
      expect(changed).not.toContain('form hides (guarded) · ja'); // Ja state: nothing hidden before or after
      expect(changed).not.toContain('guarded gates · ja'); // the warnings still fire when the phases are assessed
      const c4 = after[PROBES.findIndex((p) => p.label === 'open required 820-3 (progress) · c4')] as Record<string, number>;
      expect(c4.ALL_820_3).toBe(16);
      expect(QE.map(([ws]) => c4[ws] ?? 0)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
      const hid = after[PROBES.findIndex((p) => p.label === 'form hides (guarded) · c4')] as Record<string, string[]>;
      expect(Object.values(hid).reduce((s, x) => s + x.length, 0)).toBe(67);
      // empty / unanswered never hides (fail-safe): the empty project still shows every assessment field, only the 8 totals left the count
      const em = after[PROBES.findIndex((p) => p.label === 'form hides (guarded) · empty')] as Record<string, string[]>;
      expect(Object.values(em).every((x) => x.length === 0)).toBe(true);
    }
    await runFile(ROLLBACK);
  });

  it('g. AFTER: recompute writes the printed constant as a derived value; Ja ⇄ C4 both ways on one project', async () => {
    await runFile(MIGRATION);
    await save(P.rc, 'M8203-01', { project_type: e('einzelprojekt') });
    await save(P.rc, 'M8203-11', goals('M8203-11', 'erreicht'));
    const r = await recompute(P.rc.inst.get('M8203-11')!);
    const w = r.written.filter((x) => x.symbol === 'qe62_items_total').map((x) => ({ s: x.symbol, eq: x.equationNumber, v: x.value }));
    const [pp] = await harness.sql<{ v: number; src: string }[]>`SELECT pp.value_number::float AS v, pp.source_type AS src FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
      WHERE pp.project_id = ${P.rc.id} AND f.symbol = 'qe62_items_total'`;
    log('recompute M8203-11', { w, pp, notComputed: r.notComputed.filter((x) => x.outputSymbol === 'qe62_items_total') });
    expect(w).toEqual([{ s: 'qe62_items_total', eq: 'M8203-11-D10', v: 15 }]);
    expect(pp).toEqual({ v: 15, src: 'derived' });
    // the M8203-23 sum reads it (inherited) — and the block is open on M8203-11 only
    expect((await guardHidden(P.rc))['M8203-11']).toEqual([]);
    // C4 → Ja (one goal „Erreicht“) → back: the block opens and closes with the goals; saved answers stay saved
    const v0 = await guardHidden(P.c4);
    await save(P.c4, 'M8203-11', { pz_62_1_status: e('erreicht') });
    const v1 = await guardHidden(P.c4);
    const g1 = await gateView(P.c4);
    await save(P.c4, 'M8203-11', { pz_62_1_status: e('noch_nicht_erreicht') });
    const v2 = await guardHidden(P.c4);
    log('C4 → one goal Erreicht → back', { v1_11: v1['M8203-11'], v1_23: v1['M8203-23'], g1 });
    expect(v1['M8203-11']).toEqual([]);
    expect(v1['M8203-23']).toEqual([]);
    expect(v1['M8203-13']).toEqual(v0['M8203-13']);
    expect(g1['REQ-19']).toBe('warn:pending'); // assessment block open, counts not typed yet ⇒ the warning waits
    expect(v2).toEqual(v0);
    await unset(P.rc, ['pz_62_1_status', 'pz_62_2_status', 'pz_62_3_status', 'pz_62_4_status', 'pz_62_5_status', 'qe62_items_total', 'project_type']);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('h. order independence with the staged 20261014100000 (no 820-3 row): before or after it, same end state; each rolls back alone', async () => {
    await runFile(O23);
    const afterO23 = await dump();
    await runFile(MIGRATION);
    const both1 = await dump();
    expect(tally(dumpDiff(afterO23, both1))).toEqual(APPLY_TALLY);
    const rb1 = await readback(1);
    if (!DISCOVER) expect(rb1[0]).toEqual([{ fields: '91', fields_pre: '0', fields_post: '91', gates: '6', gates_pre: '0', gates_post: '6', fields_neither: null, gates_neither: null, new_equations: '8' }]);
    const c4Both = await openRequired(P.c4);
    await runFile(ROLLBACK);
    expect(dumpDiff(afterO23, await dump())).toEqual([]);
    await runFile(O23_ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    await runFile(MIGRATION);
    await runFile(O23);
    expect(dumpDiff(both1, await dump()).filter((l) => !l.startsWith('equations'))).toEqual([]);
    expect((await readback(1))[0]).toEqual(rb1[0]);
    if (!DISCOVER) expect(c4Both.ALL_820_3).toBe(16);
    await runFile(O23_ROLLBACK);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it.skipIf(!SIB_PRESENT)('h2. with the staged 820-1 / 820-2 blocks 20261015130000 + 150000 + 140000 (other standards): disjoint rows, both orders, same 820-3 end state', async () => {
    const sib = async (dir: 0 | 1) => { for (const k of (dir === 0 ? ['c4f', 'c4d', 'c4p'] : ['c4p', 'c4d', 'c4f']) as Array<keyof typeof SIB>) await runFile(SIB[k][dir]); };
    await sib(0);
    const afterSib = await dump();
    const sibDiff = dumpDiff(PRE, afterSib);
    // the sibling blocks write no DWA-M-820-3 row
    const ids820_3 = new Set((await harness.sql<{ id: string }[]>`SELECT f.id FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id WHERE s.code = ${STD}
      UNION ALL SELECT cr.id FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id WHERE s.code = ${STD}`).map((x) => x.id));
    const touched3 = sibDiff.filter((l) => { const m = l.match(/"id":"([0-9a-f-]{36})"/); return m && ids820_3.has(m[1]); });
    log('sibling blocks: diff rows / rows on 820-3', { rows: sibDiff.length, on820_3: touched3.length });
    expect(touched3).toEqual([]);
    await runFile(MIGRATION);
    const both = await dump();
    expect(tally(dumpDiff(afterSib, both))).toEqual(APPLY_TALLY);
    expect((await readback(1))[0]).toMatchObject([{ fields_post: '91', gates_post: '6', new_equations: '8' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(afterSib, await dump())).toEqual([]);
    await runFile(MIGRATION); // this block between / after: roll the siblings back first, then this one
    await sib(1);
    expect((await readback(1))[0]).toMatchObject([{ fields_post: '91', gates_post: '6', new_equations: '8' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    // reverse order: this block first, then the siblings
    await runFile(MIGRATION);
    await sib(0);
    expect(dumpDiff(both, await dump()).filter((l) => !l.startsWith('equations') && !l.includes('"symbol":"phase_'))).toEqual([]);
    await sib(1);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });
});
