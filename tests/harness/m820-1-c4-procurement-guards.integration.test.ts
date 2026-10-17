/**
 * DWA-M 820-1 · case C4 finding F1 (2026-10-15) — embedded-Postgres proof of
 *   scripts/migrations/20261015130000_m820_1_c4_procurement_guards.sql
 *   scripts/rollback-20261015130000-m820-1-c4-procurement-guards.sql
 *   scripts/verification/apply/readback-20261015130000-m820-1-c4-procurement-guards.sql
 * (apply order + behaviour list: vault 01-Projects/ekowai-wizard/m820-wizard-test/76_APPLY-ORDER-m820-1-c4-procurement-guards.md).
 *   L · procurement law: M820-09 (whole sheet, section rule), M820-12 / -23 / -24 law fields hidden when
 *       client_organization_type = privat_ohne_foerderung AND vergaberecht_freiwillig_angewendet = false.
 *   D · competition: M820-11 / -13 / -15 / -17 fields hidden when procurement_procedure = direktvergabe.
 *   Hints M820-01 / M820-10 rewritten. No gate row changes.
 *
 * Disposable embedded Postgres only — no prod, no .env.local. REAL saveWorksheet / checkApprovalGate / loadInheritedFields +
 * computeVisibility (the form's pair) / loadRequiredFieldCounts (progress). SEED: the three 2026-10-05 dumps + prior.json consumers and
 * every M820 block applied on prod up to 20261008100000 (workflow audit). The block's pre-signatures were taken from this seed; read-back
 * R0 on prod (step 0) must show fields_pre 18 / sections_pre 7. 20261014100000 (staged, 820-2 only) is applied before AND after this
 * block in test h (order independence). ROWS: synthetic projects, no client data (C4 = the driver answers of case C4 only).
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startHarness, type Harness } from './embedded-pg';
import { applyM820ProdOverlay, lostProdQuotes } from './m820-prod-overlay';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { loadInheritedFields as LoadInheritedFields } from '@/lib/db/queries/worksheet';
import type { loadRequiredFieldCounts as LoadRequiredFieldCounts } from '@/lib/projects/load-required-field-counts';
import { computeVisibility } from '@/lib/compliance/visibility';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008c4';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261015130000_m820_1_c4_procurement_guards.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261015130000-m820-1-c4-procurement-guards.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261015130000-m820-1-c4-procurement-guards.sql');
const O23 = resolve(ROOT, 'scripts/migrations/20261014100000_m820_followup_o2_o3.sql');
const O23_ROLLBACK = resolve(ROOT, 'scripts/rollback-20261014100000-m820-followup-o2-o3.sql');
const O23_READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261014100000-m820-followup-o2-o3.sql');
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
const DISCOVER = process.env.C4G_DISCOVER === '1';
const log = (label: string, v: unknown) => {
  const line = `[M820-1 C4 GUARDS] ${label}: ${JSON.stringify(v)}`;
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
async function runFile(path: string): Promise<void> {
  const conn = await harness.sql.reserve();
  try { await conn.unsafe(readFileSync(path, 'utf8')); } finally { conn.release(); }
}
const LEDGERS = ['fields_archive_m820_c4g', 'worksheet_sections_archive_m820_c4g', 'm820_c4g_written'];
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
const EMPTY = { fields_archive_m820_c4g: 0, worksheet_sections_archive_m820_c4g: 0, m820_c4g_written: 0 };
const FULL = { fields_archive_m820_c4g: 18, worksheet_sections_archive_m820_c4g: 7, m820_c4g_written: 25 };
const stmts = (p: string) => splitOnUnquotedSemicolons(readFileSync(p, 'utf8')).filter((s) => s.replace(/--.*$/gm, '').trim());
const RB_STMTS = stmts(READBACK);
/** R4 reads the block's ledgers, which exist only after an apply — before the apply run R0 … R3 (step 0 on prod). */
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
type V = { type: 'boolean'; value: boolean } | { type: 'enum'; value: string } | { type: 'number'; value: number };
const e = (value: string): V => ({ type: 'enum', value });
const b = (value: boolean): V => ({ type: 'boolean', value });
const nu = (value: number): V => ({ type: 'number', value });
async function save(p: Proj, ws: string, vals: Record<string, V>) {
  const ids = await harness.sql<{ id: string; symbol: string }[]>`
    SELECT f.id, f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
    WHERE s.code = 'DWA-M-820-1' AND w.code = ${ws} AND f.active AND f.symbol IN ${harness.sql(Object.keys(vals))}`;
  expect(ids.length, `${ws} fields ${Object.keys(vals)}`).toBe(Object.keys(vals).length);
  const values = Object.fromEntries(ids.map((f) => [f.id, vals[f.symbol]]));
  const r = await saveWorksheet({ instanceId: p.inst.get(ws)!, values: values as never });
  expect(r.ok, `${ws} save ${JSON.stringify(r)}`).toBe(true);
  return r;
}
async function unset(p: Proj, sym: string) {
  await harness.sql`DELETE FROM project_parameters pp USING fields f WHERE pp.field_id = f.id AND pp.project_id = ${p.id} AND f.symbol = ${sym}`;
}
/** 'fail' | 'wait' | 'none' — how the real gate treats one block gate. */
async function verdict(p: Proj, ws: string, code: string): Promise<string> {
  const g = await checkApprovalGate(p.inst.get(ws)!);
  if (g.failingBlockConditions.some((c) => c.code === code)) return 'fail';
  if (g.pendingBlockConditions.some((c) => c.code === code)) return 'wait';
  return 'none';
}
const F1_SHEETS = ['M820-09', 'M820-11', 'M820-12', 'M820-13', 'M820-15', 'M820-17', 'M820-23', 'M820-24'];
/** Per F1 sheet: missing required symbols + refusing block gates (failing or waiting) through the REAL approval gate. */
async function blockers(p: Proj): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const ws of F1_SHEETS) {
    const g = await checkApprovalGate(p.inst.get(ws)!);
    const items = [
      ...g.missingRequiredFields.map((f) => f.symbol).sort(),
      ...g.failingBlockConditions.map((c) => `${c.code}:fail`).sort(),
      ...g.pendingBlockConditions.map((c) => `${c.code}:wait`).sort(),
    ];
    if (items.length) out[ws] = items;
  }
  return out;
}
const GATES: Array<[string, string]> = [['M820-09', 'REQ-07'], ['M820-10', 'REQ-08'], ['M820-12', 'REQ-10'], ['M820-23', 'REQ-22'], ['M820-23', 'REQ-26'], ['M820-24', 'REQ-23']];
async function gateVerdicts(p: Proj): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [ws, code] of GATES) out[code] = await verdict(p, ws, code);
  return out;
}

/** The form's pair (visibility.ts): own fields are hideable; the lookup resolves own + inherited (consumer_worksheets) saved values. */
async function formHidden(p: Proj, ws: string): Promise<string[]> {
  const sql = harness.sql;
  const [t] = await sql<{ id: string; standard_id: string }[]>`SELECT w.id, w.standard_id FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-1' AND w.code = ${ws}`;
  const own = await sql<{ id: string; symbol: string; section_id: string | null; visible_when: string | null }[]>`
    SELECT id, symbol, section_id, visible_when FROM fields WHERE worksheet_template_id = ${t.id} AND active`;
  const secs = await sql<{ id: string; parent_section_id: string | null; visible_when: string | null }[]>`
    SELECT id, parent_section_id, visible_when FROM worksheet_sections WHERE worksheet_template_id = ${t.id}`;
  const inh = await loadInheritedFields(t.id, t.standard_id, ws);
  const ids = [...own.map((f) => f.id), ...inh.map((f) => f.id)];
  const symById = new Map<string, string>([...own.map((f) => [f.id, f.symbol] as const), ...inh.map((f) => [f.id, f.symbol] as const)]);
  const vals = await sql<{ field_id: string; v: string | boolean | null }[]>`
    SELECT field_id, COALESCE(value_boolean::text, value_enum, value_text, value_number::text) AS v
      FROM project_parameters WHERE project_id = ${p.id} AND field_id IN ${sql(ids)}`;
  const bySym = new Map<string, string | boolean | null>();
  for (const r of vals) bySym.set(symById.get(r.field_id)!, r.v === 'true' ? true : r.v === 'false' ? false : r.v);
  const vis = computeVisibility(
    own.map((f) => ({ id: f.id, symbol: f.symbol, sectionId: f.section_id, visibleWhen: f.visible_when })),
    secs.map((s) => ({ id: s.id, parentSectionId: s.parent_section_id, visibleWhen: s.visible_when })),
    (s) => bySym.get(s) ?? undefined,
  );
  return [...vis.hiddenSymbols].sort();
}
const L_FIELDS: Record<string, string[]> = {
  'M820-12': ['exclusion_123_gwb_checked', 'exclusion_124_gwb_selected'],
  'M820-23': ['contract_invalidity_135_gwb_risk', 'electronic_transmission', 'information_letters_sent'],
  'M820-24': ['alle_unterlagen_archiviert', 'archive_location', 'final_signoff_date', 'vergabeakte_unterzeichnet', 'vergabevermerk_complete'],
};
const D_FIELDS: Record<string, string[]> = {
  'M820-11': ['mindesteignung_definiert', 'qualitaets_check_date'],
  'M820-13': ['liability_insurance_personenschaden', 'liability_insurance_sonstige'],
  'M820-15': ['documentation_structure'],
  'M820-17': ['date_procurement_start'],
};
let M09_SYMBOLS: string[] = [];
/** Which guarded symbols the form hides: L set (+ M820-09 sheet) and D set, as booleans per group. */
async function guardView(p: Proj): Promise<{ m09: string; L: string; D: string }> {
  const share = async (groups: Record<string, string[]>) => {
    let hidden = 0; let total = 0;
    for (const [ws, syms] of Object.entries(groups)) { const h = await formHidden(p, ws); total += syms.length; hidden += syms.filter((s) => h.includes(s)).length; }
    return `${hidden}/${total}`;
  };
  const h09 = await formHidden(p, 'M820-09');
  return { m09: `${M09_SYMBOLS.filter((s) => h09.includes(s)).length}/${M09_SYMBOLS.length}`, L: await share(L_FIELDS), D: await share(D_FIELDS) };
}
/** Progress surface (get_standard_progress / sidebar): open required on the F1 sheets, by the gate's rule. */
async function openRequired(p: Proj): Promise<Record<string, number>> {
  const sql = harness.sql;
  const [s] = await sql<{ id: string }[]>`SELECT id FROM standards WHERE code = 'DWA-M-820-1'`;
  const tm = await sql<{ id: string; code: string }[]>`SELECT id, code FROM worksheet_templates WHERE standard_id = ${s.id}`;
  const counts = await loadRequiredFieldCounts(p.id, s.id);
  const out: Record<string, number> = {};
  let total = 0;
  for (const t of tm) {
    const c = counts.get(t.id);
    const open = c ? c.totalRequired - c.filledRequired : 0;
    total += open;
    if (F1_SHEETS.includes(t.code) && open) out[t.code] = open;
  }
  out.ALL_820_1 = total;
  return out;
}

let PRE: TableDump;
const P: Record<string, Proj> = {};
type Probe = { label: string; run: () => Promise<unknown>; before: unknown; after: unknown };
let PROBES: Probe[] = [];

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-1-c4-guards@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820-1 C4 guards harness', ${'m820-c4g-' + Date.now()}) RETURNING id`;
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
  M09_SYMBOLS = (await sql<{ symbol: string }[]>`SELECT f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
    JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-09' AND f.active ORDER BY 1`).map((r) => r.symbol);

  // C4: the three driver answers of case C4 + the M820-09 / M820-15 answers C4 wrote (synthetic values, no client data)
  P.c4 = await makeProject('C4-like: private client without funding, law not applied, direct award');
  await save(P.c4, 'M820-01', { client_organization_type: e('privat_ohne_foerderung'), vergaberecht_freiwillig_angewendet: b(false), estimated_engineering_fee: nu(3500) });
  await save(P.c4, 'M820-09', { eu_threshold_value: nu(214000), threshold_status: e('unterschwellig'), oberschwellig_check: b(false), auftragswert_manipulation_check: b(true) });
  await save(P.c4, 'M820-10', { procurement_procedure: e('direktvergabe') });
  await save(P.c4, 'M820-15', { leistungsbeschreibung_complete: b(false) });
  // C4 with leftovers that would fail the law gates if read (saved before any guard)
  P.c4left = await makeProject('C4-like + leftover law answers (oberschwellig, §123 not checked, no letters, §135 risk, no memo)');
  await save(P.c4left, 'M820-01', { client_organization_type: e('privat_ohne_foerderung'), vergaberecht_freiwillig_angewendet: b(false), estimated_engineering_fee: nu(300000) });
  await save(P.c4left, 'M820-09', { eu_threshold_value: nu(214000), threshold_status: e('oberschwellig'), oberschwellig_check: b(true), auftragswert_manipulation_check: b(true) });
  await save(P.c4left, 'M820-10', { procurement_procedure: e('direktvergabe') });
  await save(P.c4left, 'M820-12', { exclusion_123_gwb_checked: b(false) });
  await save(P.c4left, 'M820-23', { information_letters_sent: b(false), electronic_transmission: b(true), contract_invalidity_135_gwb_risk: b(true) });
  await save(P.c4left, 'M820-24', { vergabevermerk_complete: b(false) });
  // voluntary application + VgV-F, same failing answers: everything must stay visible and block
  P.vol = await makeProject('private client applies procurement law voluntarily, VgV-F, failing law answers');
  await save(P.vol, 'M820-01', { client_organization_type: e('privat_ohne_foerderung'), vergaberecht_freiwillig_angewendet: b(true), estimated_engineering_fee: nu(300000) });
  await save(P.vol, 'M820-09', { eu_threshold_value: nu(214000), threshold_status: e('oberschwellig'), oberschwellig_check: b(true), auftragswert_manipulation_check: b(true) });
  await save(P.vol, 'M820-10', { procurement_procedure: e('vgv_f') });
  await save(P.vol, 'M820-12', { exclusion_123_gwb_checked: b(false) });
  await save(P.vol, 'M820-23', { information_letters_sent: b(false), electronic_transmission: b(true), contract_invalidity_135_gwb_risk: b(true) });
  await save(P.vol, 'M820-24', { vergabevermerk_complete: b(false) });
  // public client, direct award: L visible (bound), D hidden
  P.pub = await makeProject('municipality, direct award');
  await save(P.pub, 'M820-01', { client_organization_type: e('municipality'), estimated_engineering_fee: nu(3500) });
  await save(P.pub, 'M820-10', { procurement_procedure: e('direktvergabe') });
  // private, law not applied, search procedure: L hidden, D visible
  P.such = await makeProject('private client, law not applied, search procedure');
  await save(P.such, 'M820-01', { client_organization_type: e('privat_ohne_foerderung'), vergaberecht_freiwillig_angewendet: b(false), estimated_engineering_fee: nu(3500) });
  await save(P.such, 'M820-10', { procurement_procedure: e('suchverfahren') });
  // private, voluntary answer still open, direct award: L visible (fail-safe), D hidden
  P.open = await makeProject('private client, voluntary answer open, direct award');
  await save(P.open, 'M820-01', { client_organization_type: e('privat_ohne_foerderung'), estimated_engineering_fee: nu(3500) });
  await save(P.open, 'M820-10', { procurement_procedure: e('direktvergabe') });

  PROBES = [];
  for (const k of ['c4', 'c4left', 'vol', 'pub', 'such', 'open']) {
    PROBES.push({ label: `guard view (form) · ${k}`, run: () => guardView(P[k]), before: undefined, after: undefined });
    PROBES.push({ label: `blockers on F1 sheets · ${k}`, run: () => blockers(P[k]), before: undefined, after: undefined });
    PROBES.push({ label: `law gates · ${k}`, run: () => gateVerdicts(P[k]), before: undefined, after: undefined });
    PROBES.push({ label: `open required (progress) · ${k}`, run: () => openRequired(P[k]), before: undefined, after: undefined });
  }
  for (const p of PROBES) { const x = EXPECTED[p.label]; if (!x) throw new Error(`no expectation for ${p.label}`); [p.before, p.after] = x; }
}, 900_000);

afterAll(async () => {
  await harness?.stop();
});

// Expected values per probe [before, after] — recorded from the discovery run (C4G_DISCOVER=1), each checked by hand against the
// guard list in 76_ (C4: the 14 F1 answers leave, award_date + contractor_auftragnehmer stay for F2; vol: unchanged and blocking).
const EXPECTED: Record<string, [unknown, unknown]> = {
  "guard view (form) · c4": [
    {"m09":"0/28","L":"0/10","D":"0/6"},
    {"m09":"28/28","L":"10/10","D":"6/6"}],
  "blockers on F1 sheets · c4": [
    {"M820-11":["mindesteignung_definiert","qualitaets_check_date"],"M820-12":["exclusion_123_gwb_checked"],"M820-13":["liability_insurance_personenschaden","liability_insurance_sonstige"],"M820-15":["documentation_structure"],"M820-17":["date_procurement_start"],"M820-23":["award_date","contract_invalidity_135_gwb_risk","contractor_auftragnehmer","electronic_transmission","information_letters_sent"],"M820-24":["alle_unterlagen_archiviert","final_signoff_date","vergabeakte_unterzeichnet","vergabevermerk_complete"]},
    {"M820-23":["award_date","contractor_auftragnehmer"]}],
  "law gates · c4": [
    {"REQ-07":"none","REQ-08":"none","REQ-10":"none","REQ-22":"none","REQ-26":"none","REQ-23":"none"},
    {"REQ-07":"none","REQ-08":"none","REQ-10":"none","REQ-22":"none","REQ-26":"none","REQ-23":"none"}],
  "open required (progress) · c4": [
    {"M820-11":2,"M820-12":1,"M820-13":2,"M820-15":1,"M820-17":1,"M820-23":5,"M820-24":4,"ALL_820_1":64},
    {"M820-23":2,"ALL_820_1":50}],
  "guard view (form) · c4left": [
    {"m09":"0/28","L":"0/10","D":"0/6"},
    {"m09":"28/28","L":"10/10","D":"6/6"}],
  "blockers on F1 sheets · c4left": [
    {"M820-11":["mindesteignung_definiert","qualitaets_check_date"],"M820-13":["liability_insurance_personenschaden","liability_insurance_sonstige"],"M820-15":["documentation_structure","leistungsbeschreibung_complete"],"M820-17":["date_procurement_start"],"M820-23":["award_date","contractor_auftragnehmer"],"M820-24":["alle_unterlagen_archiviert","final_signoff_date","vergabeakte_unterzeichnet"]},
    {"M820-15":["leistungsbeschreibung_complete"],"M820-23":["award_date","contractor_auftragnehmer"]}],
  "law gates · c4left": [
    {"REQ-07":"none","REQ-08":"none","REQ-10":"none","REQ-22":"none","REQ-26":"none","REQ-23":"none"},
    {"REQ-07":"none","REQ-08":"none","REQ-10":"none","REQ-22":"none","REQ-26":"none","REQ-23":"none"}],
  "open required (progress) · c4left": [
    {"M820-11":2,"M820-13":2,"M820-15":2,"M820-17":1,"M820-23":2,"M820-24":3,"ALL_820_1":60},
    {"M820-15":1,"M820-23":2,"ALL_820_1":51}],
  "guard view (form) · vol": [
    {"m09":"0/28","L":"0/10","D":"0/6"},
    {"m09":"0/28","L":"0/10","D":"0/6"}],
  "blockers on F1 sheets · vol": [
    {"M820-11":["leistungswettbewerb_only","mindesteignung_definiert","qualitaets_check_date","qualitaets_kriterien_anzahl","REQ-17:wait"],"M820-12":["REQ-10:fail"],"M820-13":["large_long_project","liability_insurance_personenschaden","liability_insurance_sonstige","min_annual_revenue_multiplier","reference_period_years","REQ-12:wait"],"M820-15":["bewerbungsbedingungen_complete","documentation_structure","eignungskriterien_dokumentiert","leistungsbeschreibung_complete"],"M820-17":["date_procurement_start","publication_date","submission_deadline","REQ-18:wait"],"M820-23":["award_date","contractor_auftragnehmer","required_standstill_days","standstill_period_days","REQ-22:fail","REQ-26:fail"],"M820-24":["alle_unterlagen_archiviert","final_signoff_date","vergabeakte_unterzeichnet","REQ-23:fail"]},
    {"M820-11":["leistungswettbewerb_only","mindesteignung_definiert","qualitaets_check_date","qualitaets_kriterien_anzahl","REQ-17:wait"],"M820-12":["REQ-10:fail"],"M820-13":["large_long_project","liability_insurance_personenschaden","liability_insurance_sonstige","min_annual_revenue_multiplier","reference_period_years","REQ-12:wait"],"M820-15":["bewerbungsbedingungen_complete","documentation_structure","eignungskriterien_dokumentiert","leistungsbeschreibung_complete"],"M820-17":["date_procurement_start","publication_date","submission_deadline","REQ-18:wait"],"M820-23":["award_date","contractor_auftragnehmer","required_standstill_days","standstill_period_days","REQ-22:fail","REQ-26:fail"],"M820-24":["alle_unterlagen_archiviert","final_signoff_date","vergabeakte_unterzeichnet","REQ-23:fail"]}],
  "law gates · vol": [
    {"REQ-07":"none","REQ-08":"none","REQ-10":"fail","REQ-22":"fail","REQ-26":"fail","REQ-23":"fail"},
    {"REQ-07":"none","REQ-08":"none","REQ-10":"fail","REQ-22":"fail","REQ-26":"fail","REQ-23":"fail"}],
  "open required (progress) · vol": [
    {"M820-11":4,"M820-13":5,"M820-15":4,"M820-17":3,"M820-23":4,"M820-24":3,"ALL_820_1":87},
    {"M820-11":4,"M820-13":5,"M820-15":4,"M820-17":3,"M820-23":4,"M820-24":3,"ALL_820_1":87}],
  "guard view (form) · pub": [
    {"m09":"0/28","L":"0/10","D":"0/6"},
    {"m09":"0/28","L":"0/10","D":"6/6"}],
  "blockers on F1 sheets · pub": [
    {"M820-09":["auftragswert_manipulation_check","eu_threshold_value","oberschwellig_check","threshold_status","REQ-07:wait"],"M820-11":["mindesteignung_definiert","qualitaets_check_date"],"M820-12":["exclusion_123_gwb_checked"],"M820-13":["liability_insurance_personenschaden","liability_insurance_sonstige"],"M820-15":["documentation_structure","leistungsbeschreibung_complete"],"M820-17":["date_procurement_start"],"M820-23":["award_date","contract_invalidity_135_gwb_risk","contractor_auftragnehmer","electronic_transmission","information_letters_sent","required_standstill_days","standstill_period_days","REQ-22:wait","REQ-26:wait"],"M820-24":["alle_unterlagen_archiviert","final_signoff_date","vergabeakte_unterzeichnet","vergabevermerk_complete"]},
    {"M820-09":["auftragswert_manipulation_check","eu_threshold_value","oberschwellig_check","threshold_status","REQ-07:wait"],"M820-12":["exclusion_123_gwb_checked"],"M820-15":["leistungsbeschreibung_complete"],"M820-23":["award_date","contract_invalidity_135_gwb_risk","contractor_auftragnehmer","electronic_transmission","information_letters_sent","required_standstill_days","standstill_period_days","REQ-22:wait","REQ-26:wait"],"M820-24":["alle_unterlagen_archiviert","final_signoff_date","vergabeakte_unterzeichnet","vergabevermerk_complete"]}],
  "law gates · pub": [
    {"REQ-07":"wait","REQ-08":"wait","REQ-10":"none","REQ-22":"wait","REQ-26":"wait","REQ-23":"none"},
    {"REQ-07":"wait","REQ-08":"wait","REQ-10":"none","REQ-22":"wait","REQ-26":"wait","REQ-23":"none"}],
  "open required (progress) · pub": [
    {"M820-11":2,"M820-12":1,"M820-13":2,"M820-15":2,"M820-17":1,"M820-23":7,"M820-24":4,"M820-09":4,"ALL_820_1":71},
    {"M820-12":1,"M820-15":1,"M820-23":7,"M820-24":4,"M820-09":4,"ALL_820_1":65}],
  "guard view (form) · such": [
    {"m09":"0/28","L":"0/10","D":"0/6"},
    {"m09":"28/28","L":"10/10","D":"0/6"}],
  "blockers on F1 sheets · such": [
    {"M820-09":["auftragswert_manipulation_check","eu_threshold_value","oberschwellig_check","threshold_status"],"M820-11":["leistungswettbewerb_only","mindesteignung_definiert","qualitaets_check_date","qualitaets_kriterien_anzahl","REQ-17:wait"],"M820-12":["exclusion_123_gwb_checked"],"M820-13":["large_long_project","liability_insurance_personenschaden","liability_insurance_sonstige","min_annual_revenue_multiplier","reference_period_years","REQ-12:wait"],"M820-15":["bewerbungsbedingungen_complete","documentation_structure","eignungskriterien_dokumentiert","leistungsbeschreibung_complete"],"M820-17":["date_procurement_start","submission_deadline"],"M820-23":["award_date","contract_invalidity_135_gwb_risk","contractor_auftragnehmer","electronic_transmission","information_letters_sent"],"M820-24":["alle_unterlagen_archiviert","final_signoff_date","vergabeakte_unterzeichnet","vergabevermerk_complete"]},
    {"M820-11":["leistungswettbewerb_only","mindesteignung_definiert","qualitaets_check_date","qualitaets_kriterien_anzahl","REQ-17:wait"],"M820-13":["large_long_project","liability_insurance_personenschaden","liability_insurance_sonstige","min_annual_revenue_multiplier","reference_period_years","REQ-12:wait"],"M820-15":["bewerbungsbedingungen_complete","documentation_structure","eignungskriterien_dokumentiert","leistungsbeschreibung_complete"],"M820-17":["date_procurement_start","submission_deadline"],"M820-23":["award_date","contractor_auftragnehmer"]}],
  "law gates · such": [
    {"REQ-07":"none","REQ-08":"none","REQ-10":"none","REQ-22":"none","REQ-26":"none","REQ-23":"none"},
    {"REQ-07":"none","REQ-08":"none","REQ-10":"none","REQ-22":"none","REQ-26":"none","REQ-23":"none"}],
  "open required (progress) · such": [
    {"M820-11":4,"M820-12":1,"M820-13":5,"M820-15":4,"M820-17":2,"M820-23":5,"M820-24":4,"M820-09":4,"ALL_820_1":93},
    {"M820-11":4,"M820-13":5,"M820-15":4,"M820-17":2,"M820-23":2,"ALL_820_1":81}],
  "guard view (form) · open": [
    {"m09":"0/28","L":"0/10","D":"0/6"},
    {"m09":"0/28","L":"0/10","D":"6/6"}],
  "blockers on F1 sheets · open": [
    {"M820-09":["auftragswert_manipulation_check","eu_threshold_value","oberschwellig_check","threshold_status","REQ-07:wait"],"M820-11":["mindesteignung_definiert","qualitaets_check_date"],"M820-12":["exclusion_123_gwb_checked"],"M820-13":["liability_insurance_personenschaden","liability_insurance_sonstige"],"M820-15":["documentation_structure","leistungsbeschreibung_complete"],"M820-17":["date_procurement_start"],"M820-23":["award_date","contract_invalidity_135_gwb_risk","contractor_auftragnehmer","electronic_transmission","information_letters_sent","required_standstill_days","standstill_period_days","REQ-22:wait","REQ-26:wait"],"M820-24":["alle_unterlagen_archiviert","final_signoff_date","vergabeakte_unterzeichnet","vergabevermerk_complete"]},
    {"M820-09":["auftragswert_manipulation_check","eu_threshold_value","oberschwellig_check","threshold_status","REQ-07:wait"],"M820-12":["exclusion_123_gwb_checked"],"M820-15":["leistungsbeschreibung_complete"],"M820-23":["award_date","contract_invalidity_135_gwb_risk","contractor_auftragnehmer","electronic_transmission","information_letters_sent","required_standstill_days","standstill_period_days","REQ-22:wait","REQ-26:wait"],"M820-24":["alle_unterlagen_archiviert","final_signoff_date","vergabeakte_unterzeichnet","vergabevermerk_complete"]}],
  "law gates · open": [
    {"REQ-07":"wait","REQ-08":"wait","REQ-10":"none","REQ-22":"wait","REQ-26":"wait","REQ-23":"none"},
    {"REQ-07":"wait","REQ-08":"wait","REQ-10":"none","REQ-22":"wait","REQ-26":"wait","REQ-23":"none"}],
  "open required (progress) · open": [
    {"M820-11":2,"M820-12":1,"M820-13":2,"M820-15":2,"M820-17":1,"M820-23":7,"M820-24":4,"M820-09":4,"ALL_820_1":72},
    {"M820-12":1,"M820-15":1,"M820-23":7,"M820-24":4,"M820-09":4,"ALL_820_1":66}],
};

async function probeAll(): Promise<unknown[]> { const out: unknown[] = []; for (const p of PROBES) out.push(await p.run()); return out; }
const sigs = () => harness.sql`SELECT 'f ' || w.code || ' ' || f.symbol AS k, md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, md5(coalesce(f.verification_quote,'')), coalesce(f.source_anchor,''))) AS sig
    FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE f.id IN (SELECT id FROM fields_archive_m820_c4g)
  UNION ALL SELECT 's ' || w.code || ' ' || ws.code, md5(concat_ws('|', coalesce(ws.visible_when,''), ws.title_de, coalesce(ws.code,'')))
    FROM worksheet_sections ws JOIN worksheet_templates w ON w.id = ws.worksheet_template_id WHERE ws.id IN (SELECT id FROM worksheet_sections_archive_m820_c4g) ORDER BY 1`;

describe('DWA-M 820-1 case C4 F1 procurement guards — staged block on embedded Postgres (seed = prod after 20261008100000)', () => {
  it('a. pre-state (read-back R0 fields_pre 18 / sections_pre 7, R3 empty); probes BEFORE through the real gate path', async () => {
    expect(await ledgers()).toEqual({ fields_archive_m820_c4g: null, worksheet_sections_archive_m820_c4g: null, m820_c4g_written: null });
    const r = await readback(4);
    log('BEFORE read-back R0..R3', r);
    expect(r[0]).toMatchObject([{ fields: '18', fields_pre: '18', fields_post: '0', sections: '7', sections_pre: '7', sections_post: '0', fields_neither: null, sections_neither: null }]);
    expect(r[1]).toHaveLength(23);
    expect((r[1] as Array<{ rule: string }>).filter((x) => x.rule !== '')).toEqual([]);
    expect((r[2] as Array<{ vergaberecht_freiwillig_angewendet: string; procurement_procedure: string }>).map((x) => `${x.vergaberecht_freiwillig_angewendet} ${x.procurement_procedure}`).sort())
      .toEqual(['(unanswered) direktvergabe', 'false direktvergabe', 'false direktvergabe', 'false suchverfahren', 'true vgv_f']);
    expect(r[3]).toEqual([]);
    // R3 positive control (review fix 3): without the „lacks the L clause" filter, the same regex finds exactly the 7 gates that read an
    // L symbol today (all L-guarded), and no gate reads a D symbol — so R3's 0 rows are not vacuous.
    const r3all = RB_STMTS[3].replace(/\n\s*AND position\(\$q\$[^\n]*\n/, '\n');
    expect(r3all).not.toEqual(RB_STMTS[3]);
    const ctrl = [...(await harness.sql.unsafe(r3all))] as unknown as Array<{ guard: string; code: string; severity: string }>;
    log('R3 positive control', ctrl.map((x) => `${x.guard} ${x.code} ${x.severity}`));
    expect(ctrl.map((x) => `${x.guard} ${x.code} ${x.severity}`).sort()).toEqual(
      ['L REQ-07 block', 'L REQ-08 block', 'L REQ-10 block', 'L REQ-22 block', 'L REQ-23 block', 'L REQ-23-2 warn', 'L REQ-26 block']);
    const before = await probeAll();
    log('BEFORE probes', Object.fromEntries(PROBES.map((p, i) => [p.label, before[i]])));
    if (!DISCOVER) expect(before).toEqual(PROBES.map((p) => p.before));
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: 18 fields + 7 sections changed, nothing else; no gate row, no severity; every touched text DE + [EN] with the quotes', async () => {
    const gatesBefore = await harness.sql`SELECT row_to_json(cr)::text AS r FROM compliance_requirements cr ORDER BY id`;
    await runFile(MIGRATION);
    const diff = dumpDiff(PRE, await dump());
    log('apply diff (table / sign counts)', tally(diff));
    expect(tally(diff)).toEqual({ 'fields +': 18, 'fields -': 18, 'worksheet_sections +': 7, 'worksheet_sections -': 7 });
    expect(await ledgers()).toEqual(FULL);
    const gatesAfter = await harness.sql`SELECT row_to_json(cr)::text AS r FROM compliance_requirements cr ORDER BY id`;
    expect([...gatesAfter]).toEqual([...gatesBefore]);
    const texts = await harness.sql<{ symbol: string; description: string; vq: string | null; sa: string | null; vw: string | null }[]>`
      SELECT f.symbol, f.description, f.verification_quote AS vq, f.source_anchor AS sa, f.visible_when AS vw FROM fields f WHERE f.id IN (SELECT id FROM fields_archive_m820_c4g)`;
    expect(texts).toHaveLength(18);
    // 2026-10-17: every printed quote prod already held in verification_quote survives (kept first, the guard quote appended after " | ")
    const kept = await harness.sql<{ k: string; vq: string | null }[]>`SELECT 'f ' || w.code || ' ' || f.symbol AS k, f.verification_quote AS vq FROM fields f
      JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE f.id IN (SELECT id FROM fields_archive_m820_c4g)`;
    expect(kept).toHaveLength(18);
    expect(lostProdQuotes('DWA-M-820-1', kept)).toEqual([]);
    expect(texts.filter((t) => (t.description.match(/\n\[EN\] /g) ?? []).length !== 1).map((t) => t.symbol)).toEqual([]);
    const Q72 = 'An das Vergaberecht sind Auftraggeber oder private Auftraggeber, die Fördermittel erhalten, gebunden.';
    const Q88 = 'Eine Direktvergabe ist eine Vergabe, bei der Verhandlungen mit nur einem Unternehmen geführt werden.';
    const Q83 = 'Bei einer Direktvergabe oder einem Suchverfahren ist der Auftraggeber zwar nicht dazu verpflichtet, sollte es aber bereits aus haushaltsrechtlichen Gründen oder bei dem Erhalt von Fördermitteln zwecks Dokumentation tun.';
    const GUARDED = [...Object.values(L_FIELDS).flat(), ...Object.values(D_FIELDS).flat()];
    const guarded = texts.filter((t) => GUARDED.includes(t.symbol));
    expect(guarded).toHaveLength(16);
    for (const t of guarded) {
      const q = t.vw!.startsWith('procurement_procedure') ? Q88 : Q72;
      expect(t.description.includes(q) && (t.vq ?? '').includes(q) && (t.sa ?? '').includes('visible_when'), t.symbol).toBe(true);
    }
    expect(guarded.filter((t) => Object.values(L_FIELDS).flat().includes(t.symbol) && t.vw!.startsWith('client_organization_type')).length).toBe(10);
    expect(guarded.filter((t) => Object.values(D_FIELDS).flat().includes(t.symbol) && t.vw === "procurement_procedure != 'direktvergabe'").length).toBe(6);
    expect(texts.filter((t) => ['vergabevermerk_complete', 'alle_unterlagen_archiviert', 'vergabeakte_unterzeichnet', 'archive_location', 'final_signoff_date'].includes(t.symbol) && t.description.includes(Q83) && (t.vq ?? '').includes(Q83))).toHaveLength(5);
    const hints = texts.filter((t) => !GUARDED.includes(t.symbol));
    expect(hints.map((h) => h.symbol).sort()).toEqual(['procurement_procedure', 'vergaberecht_freiwillig_angewendet']);
    for (const h of hints) expect(h.description.includes(Q72), h.symbol).toBe(true);
    log('post-state signatures (read-back R0 sig1)', Object.fromEntries((await sigs()).map((r) => [r.k, r.sig])));
  });

  it('c. apply again: 0 changes (full dump compare), ledgers unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    expect(dumpDiff(before, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(FULL);
  });

  it('d. rollback: byte-equal to the pre-state, archives and ledger emptied; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    expect(dumpDiff(PRE, after)).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await ledgers()).toEqual(EMPTY);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('d2. a field and a section edited after the apply are left alone by the rollback (archive + ledger rows kept); the rest is restored', async () => {
    await runFile(MIGRATION);
    await harness.sql`UPDATE fields f SET description = f.description || ' (edited)' FROM worksheet_templates w WHERE w.id = f.worksheet_template_id AND w.code = 'M820-12' AND f.symbol = 'exclusion_123_gwb_checked'`;
    await harness.sql`UPDATE worksheet_sections ws SET title_de = ws.title_de || ' (edited)' FROM worksheet_templates w WHERE w.id = ws.worksheet_template_id AND w.code = 'M820-09' AND ws.code = 'B'`;
    await runFile(ROLLBACK);
    const l = await ledgers();
    const [vw] = await harness.sql<{ vw: string | null }[]>`SELECT f.visible_when AS vw FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = 'M820-12' AND f.symbol = 'exclusion_123_gwb_checked'`;
    log('rollback with one edited field + one edited section', { l, vw: vw.vw });
    expect(l).toEqual({ fields_archive_m820_c4g: 1, worksheet_sections_archive_m820_c4g: 1, m820_c4g_written: 2 });
    expect(vw.vw).toMatch(/^client_organization_type != 'privat_ohne_foerderung'/);
    await harness.sql`UPDATE fields f SET description = left(f.description, length(f.description) - length(' (edited)')) FROM worksheet_templates w WHERE w.id = f.worksheet_template_id AND w.code = 'M820-12' AND f.symbol = 'exclusion_123_gwb_checked'`;
    await harness.sql`UPDATE worksheet_sections ws SET title_de = left(ws.title_de, length(ws.title_de) - length(' (edited)')) FROM worksheet_templates w WHERE w.id = ws.worksheet_template_id AND w.code = 'M820-09' AND ws.code = 'B'`;
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('e. the read-back file runs before and after an apply and shows the expected values', async () => {
    expect(RB_STMTS).toHaveLength(5);
    expect(readFileSync(READBACK, 'utf8').split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(5);
    await runFile(MIGRATION);
    const post = await readback();
    log('read-back (after)', post);
    expect(post[0]).toEqual([{ fields: '18', fields_pre: '0', fields_post: '18', sections: '7', sections_pre: '0', sections_post: '7', fields_neither: null, sections_neither: null }]);
    const R1 = post[1] as Array<{ ws: string; kind: string; item: string; rule: string; req: string }>;
    expect(R1).toHaveLength(23);
    const L = "client_organization_type != 'privat_ohne_foerderung' OR vergaberecht_freiwillig_angewendet == true";
    const D = "procurement_procedure != 'direktvergabe'";
    expect(R1.filter((x) => x.rule === L).map((x) => `${x.ws} ${x.item}`).sort()).toEqual([
      ...['A', 'B', 'F', 'J', 'K', 'L', 'M'].map((c) => `M820-09 ${c}`),
      ...Object.entries(L_FIELDS).flatMap(([ws, s]) => s.map((x) => `${ws} ${x}`)),
    ].sort());
    expect(R1.filter((x) => x.rule === D).map((x) => `${x.ws} ${x.item}`).sort()).toEqual(Object.entries(D_FIELDS).flatMap(([ws, s]) => s.map((x) => `${ws} ${x}`)).sort());
    expect(post[2]).toHaveLength(5);
    expect(post[3]).toEqual([]);
    expect(post[4]).toEqual([{ field_archive: '18', section_archive: '7', written: '25' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('f. AFTER: C4 benchmark + the other client / procedure cases through the REAL gate, the form pair and the progress counts', async () => {
    await runFile(MIGRATION);
    const after = await probeAll();
    log('AFTER probes', Object.fromEntries(PROBES.map((p, i) => [p.label, after[i]])));
    if (!DISCOVER) expect(after).toEqual(PROBES.map((p) => p.after));
    // the C4 benchmark in words: 14 required F1 answers leave 820-1 (64 → 50 open); only the F2 contract fields stay on M820-23
    if (!DISCOVER) {
      expect(await openRequired(P.c4)).toEqual({ 'M820-23': 2, ALL_820_1: 50 });
      expect(await blockers(P.c4)).toEqual({ 'M820-23': ['award_date', 'contractor_auftragnehmer'] });
    }
    await runFile(ROLLBACK);
  });

  it('g. AFTER, both ways on C4: Ja brings the law fields and their blocks back, Nein hides them again; another procedure brings the competition fields back', async () => {
    await runFile(MIGRATION);
    const step = async () => ({ view: await guardView(P.c4), gates: await gateVerdicts(P.c4), blockers: await blockers(P.c4) });
    const s0 = await step();
    await save(P.c4, 'M820-01', { vergaberecht_freiwillig_angewendet: b(true) });
    const sJa = await step();
    await save(P.c4, 'M820-10', { procurement_procedure: e('vgv_f') });
    await save(P.c4, 'M820-12', { exclusion_123_gwb_checked: b(false) });
    await save(P.c4, 'M820-24', { vergabevermerk_complete: b(false) });
    const sJaVgv = await step();
    await save(P.c4, 'M820-01', { vergaberecht_freiwillig_angewendet: b(false) });
    const sNeinVgv = await step();
    await save(P.c4, 'M820-10', { procurement_procedure: e('suchverfahren') });
    const sNeinSuch = await step();
    await save(P.c4, 'M820-10', { procurement_procedure: e('direktvergabe') });
    const sBack = await step();
    const res = { s0, sJa, sJaVgv, sNeinVgv, sNeinSuch, sBack };
    log('C4 both ways (after)', res);
    if (!DISCOVER) expect(res).toEqual(EXPECTED_BOTH_WAYS);
    // back to the C4 answers (the leftovers on hidden fields stay saved — they are only hidden)
    await unset(P.c4, 'exclusion_123_gwb_checked');
    await unset(P.c4, 'vergabevermerk_complete');
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('h. order independence with the staged 20261014100000 (820-2 only): before or after it, same end state; each rolls back alone', async () => {
    // O-2/O-3 first, then this block
    await runFile(O23);
    const afterO23 = await dump();
    await runFile(MIGRATION);
    const both1 = await dump();
    expect(tally(dumpDiff(afterO23, both1))).toEqual({ 'fields +': 18, 'fields -': 18, 'worksheet_sections +': 7, 'worksheet_sections -': 7 });
    const rb1 = await readback(1);
    expect(rb1[0]).toEqual([{ fields: '18', fields_pre: '0', fields_post: '18', sections: '7', sections_pre: '0', sections_post: '7', fields_neither: null, sections_neither: null }]);
    expect(await o23R0()).toMatchObject([{ fields_post: '2', gates_post: '1', fields_neither: null, gates_neither: null }]);
    const probesBoth = await probeAll();
    await runFile(ROLLBACK);
    expect(dumpDiff(afterO23, await dump())).toEqual([]);
    await runFile(O23_ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    // this block first, then O-2/O-3
    await runFile(MIGRATION);
    await runFile(O23);
    expect(dumpDiff(both1, await dump())).toEqual([]);
    expect(await o23R0()).toMatchObject([{ fields_post: '2', gates_post: '1', fields_neither: null, gates_neither: null }]);
    // the 820-1 behaviour does not depend on O-2/O-3
    if (!DISCOVER) expect(probesBoth).toEqual(PROBES.map((p) => p.after));
    await runFile(O23_ROLLBACK);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });
});

const EXPECTED_BOTH_WAYS: unknown = {
  s0: {"view":{"m09":"28/28","L":"10/10","D":"6/6"},"gates":{"REQ-07":"none","REQ-08":"none","REQ-10":"none","REQ-22":"none","REQ-26":"none","REQ-23":"none"},"blockers":{"M820-23":["award_date","contractor_auftragnehmer"]}},
  sJa: {"view":{"m09":"0/28","L":"0/10","D":"6/6"},"gates":{"REQ-07":"none","REQ-08":"none","REQ-10":"none","REQ-22":"none","REQ-26":"none","REQ-23":"none"},"blockers":{"M820-12":["exclusion_123_gwb_checked"],"M820-23":["award_date","contract_invalidity_135_gwb_risk","contractor_auftragnehmer","electronic_transmission","information_letters_sent"],"M820-24":["alle_unterlagen_archiviert","final_signoff_date","vergabeakte_unterzeichnet","vergabevermerk_complete"]}},
  sJaVgv: {"view":{"m09":"0/28","L":"0/10","D":"0/6"},"gates":{"REQ-07":"none","REQ-08":"none","REQ-10":"fail","REQ-22":"none","REQ-26":"none","REQ-23":"fail"},"blockers":{"M820-11":["leistungswettbewerb_only","mindesteignung_definiert","qualitaets_check_date","qualitaets_kriterien_anzahl","REQ-17:wait"],"M820-12":["REQ-10:fail"],"M820-13":["large_long_project","liability_insurance_personenschaden","liability_insurance_sonstige","min_annual_revenue_multiplier","reference_period_years","REQ-12:wait"],"M820-15":["bewerbungsbedingungen_complete","documentation_structure","eignungskriterien_dokumentiert"],"M820-17":["date_procurement_start","publication_date","submission_deadline","REQ-18:wait"],"M820-23":["award_date","contract_invalidity_135_gwb_risk","contractor_auftragnehmer","electronic_transmission","information_letters_sent"],"M820-24":["alle_unterlagen_archiviert","final_signoff_date","vergabeakte_unterzeichnet","REQ-23:fail"]}},
  sNeinVgv: {"view":{"m09":"28/28","L":"10/10","D":"0/6"},"gates":{"REQ-07":"none","REQ-08":"none","REQ-10":"none","REQ-22":"none","REQ-26":"none","REQ-23":"none"},"blockers":{"M820-11":["leistungswettbewerb_only","mindesteignung_definiert","qualitaets_check_date","qualitaets_kriterien_anzahl","REQ-17:wait"],"M820-13":["large_long_project","liability_insurance_personenschaden","liability_insurance_sonstige","min_annual_revenue_multiplier","reference_period_years","REQ-12:wait"],"M820-15":["bewerbungsbedingungen_complete","documentation_structure","eignungskriterien_dokumentiert"],"M820-17":["date_procurement_start","submission_deadline","REQ-18:wait"],"M820-23":["award_date","contractor_auftragnehmer"]}},
  sNeinSuch: {"view":{"m09":"28/28","L":"10/10","D":"0/6"},"gates":{"REQ-07":"none","REQ-08":"none","REQ-10":"none","REQ-22":"none","REQ-26":"none","REQ-23":"none"},"blockers":{"M820-11":["leistungswettbewerb_only","mindesteignung_definiert","qualitaets_check_date","qualitaets_kriterien_anzahl","REQ-17:wait"],"M820-13":["large_long_project","liability_insurance_personenschaden","liability_insurance_sonstige","min_annual_revenue_multiplier","reference_period_years","REQ-12:wait"],"M820-15":["bewerbungsbedingungen_complete","documentation_structure","eignungskriterien_dokumentiert"],"M820-17":["date_procurement_start","submission_deadline"],"M820-23":["award_date","contractor_auftragnehmer"]}},
  sBack: {"view":{"m09":"28/28","L":"10/10","D":"6/6"},"gates":{"REQ-07":"none","REQ-08":"none","REQ-10":"none","REQ-22":"none","REQ-26":"none","REQ-23":"none"},"blockers":{"M820-23":["award_date","contractor_auftragnehmer"]}},
};
