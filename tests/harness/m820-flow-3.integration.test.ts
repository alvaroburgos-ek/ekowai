/**
 * M820 flow block 3 (data part) — identity symbols aligned across DWA-M 820-1 / -2 / -3 — embedded-Postgres proof of
 *   scripts/migrations/20261006210000_m820_flow_3.sql
 *   scripts/rollback-20261006210000-m820-flow-3.sql
 *   scripts/verification/apply/readback-20261006210000-m820-flow-3.sql
 * (requirements: vault 01-Projects/ekowai-wizard/m820-wizard-test/_briefs/flow-2-3-brief.md "Block 3" item 1, owner ruling 2026-10-06;
 *  evidence 33_FLOW-AUDIT § 4 X3–X6; apply order 37_APPLY-ORDER-m820-flow-3.md; sign-off 38_SIGN-OFF-m820-flow-2-3.md).
 * The code part of block 3 (X10 risk register carry-over) is proven by unit tests (src/lib/projects/__tests__/cross-standard-carry.test.ts
 * and required-fields.test.ts) and case g here (the REAL approval gate with the allow-list).
 *
 * Disposable embedded Postgres only — no prod, no .env.local. REAL saveWorksheet / checkApprovalGate / loadSameSymbolValues (the
 * page's prefill query) / loadInheritedSymbolsForTemplate (the finalize gate's A4 set).
 * SEED: the three 2026-10-05 dumps + prior.json consumers, the six applied blocks (= prod 2026-10-06), then the STAGED blocks this one
 * builds on, in apply order: REQ-05 home, flow block 1, flow block 2 (assumed applied, brief). Case h proves the order rules: this
 * block commutes with REQ-05 and flow 2, and MUST come after flow block 1 (flow 1 finds three of its identity consumer rows —
 * 820-2 project_name_full, 820-3 project_title / client_auftraggeber — by the OLD symbols). ROWS: synthetic (no client data).
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startHarness, type Harness } from './embedded-pg';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { checkApprovalGate as CheckApprovalGate, loadInheritedSymbolsForTemplate as LoadInheritedSymbolsForTemplate } from '@/lib/actions/approval-gate';
import type { loadInheritedFields as LoadInheritedFields, loadSameSymbolValues as LoadSameSymbolValues } from '@/lib/db/queries/worksheet';
import type { recomputeWorksheetEquations as RecomputeWorksheetEquations } from '@/lib/actions/recompute-worksheet';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import { makeSymbolLookup, type LookupValue } from '@/lib/compliance/symbol-lookup';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008f9';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261006210000_m820_flow_3.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006210000-m820-flow-3.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261006210000-m820-flow-3.sql');
const REQ05_MIGRATION = resolve(ROOT, 'scripts/migrations/20261006180000_m820_1_req05_home.sql');
const REQ05_ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006180000-m820-1-req05-home.sql');
const FLOW1_MIGRATION = resolve(ROOT, 'scripts/migrations/20261006190000_m820_flow_1.sql');
const FLOW1_ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006190000-m820-flow-1.sql');
const FLOW2_MIGRATION = resolve(ROOT, 'scripts/migrations/20261006200000_m820_flow_2.sql');
const FLOW2_ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006200000-m820-flow-2.sql');
const PRIOR_BLOCKS = [
  'scripts/migrations/20261005193000_m820_1_client_route.sql',
  'scripts/migrations/20261005200000_m820_2_registers.sql',
  'scripts/migrations/20261006100000_m820_2_structure.sql',
  'scripts/migrations/20261006120000_m820_3_structure.sql',
  'scripts/migrations/20261006160000_m820_followup_1.sql',
  'scripts/migrations/20261006170000_m820_1_risk_changes.sql',
].map((p) => resolve(ROOT, p));
const LIVE_PHASE: Record<string, Array<[number, number, number]>> = {
  'DWA-M-820-1': [[1, 3, 1], [4, 9, 2], [10, 15, 3], [16, 20, 4], [21, 23, 5], [24, 25, 6]],
  'DWA-M-820-2': [[1, 4, 1], [5, 10, 2], [11, 15, 3], [16, 19, 4], [20, 24, 5], [25, 28, 6]],
  'DWA-M-820-3': [[1, 3, 1], [4, 6, 2], [7, 10, 3], [11, 18, 4], [19, 21, 5], [22, 24, 6]],
};
const REQ01_MD5 = '0e0883c979c586e8b1f4e9ecd76c8d1c';
const RENAMES: Array<[string, string, string, string]> = [
  ['DWA-M-820-1', 'M820-01', 'project_name_de', 'project_name'],
  ['DWA-M-820-2', '820-2-01', 'project_name_full', 'project_name'],
  ['DWA-M-820-3', 'M8203-01', 'project_title', 'project_name'],
  ['DWA-M-820-1', 'M820-01', 'client_organization_name', 'client_name'],
  ['DWA-M-820-2', '820-2-01', 'client_organization', 'client_name'],
  ['DWA-M-820-3', 'M8203-01', 'client_auftraggeber', 'client_name'],
  ['DWA-M-820-1', 'M820-01', 'date_registration', 'registration_date'],
  ['DWA-M-820-1', 'M820-23', 'winning_bidder', 'contractor_auftragnehmer'],
];
const log = (label: string, v: unknown) => console.log(`[M820 FLOW 3] ${label}: ${JSON.stringify(v)}`);
const md5 = (s: string) => createHash('md5').update(s).digest('hex');
const seq = (p: string, a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => `${p}${String(a + i).padStart(2, '0')}`);

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
  log(`seeded ${d.standard.code}`, { worksheets: d.worksheets.length, fields: d.fields.length, equations: d.equations?.length ?? 0, gates: d.gates.length, tables: d.tables?.length ?? 0 });
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
const digest = (d: TableDump) => Object.fromEntries(TOUCHED.map((t) => [t, `${d[t].length} rows md5 ${md5(d[t].join('\n'))}`]));
async function projectParams(): Promise<string[]> {
  const rows = await harness.sql.unsafe<{ r: string }[]>(`SELECT row_to_json(x)::text AS r FROM project_parameters x ORDER BY id`);
  return rows.map((r) => r.r);
}
async function runFile(path: string): Promise<void> {
  const conn = await harness.sql.reserve();
  try { await conn.unsafe(readFileSync(path, 'utf8')); } finally { conn.release(); }
}
async function archiveCounts(): Promise<{ fields: number | null; gates: number | null }> {
  const one = async (t: string) => {
    const [r] = await harness.sql<{ t: string | null }[]>`SELECT to_regclass(${'public.' + t})::text AS t`;
    if (!r.t) return null;
    const [c] = await harness.sql.unsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${t}`);
    return c.n;
  };
  return { fields: await one('fields_archive_m820_flow_3'), gates: await one('compliance_requirements_archive_m820_flow_3') };
}

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
type V = { type: 'boolean'; value: boolean } | { type: 'enum'; value: string } | { type: 'number'; value: number } | { type: 'json'; value: unknown } | { type: 'text'; value: string };
const e = (value: string): V => ({ type: 'enum', value });
const n = (value: number): V => ({ type: 'number', value });
const b = (value: boolean): V => ({ type: 'boolean', value });
const jv = (value: unknown): V => ({ type: 'json', value });
const tx = (value: string): V => ({ type: 'text', value });
async function save(p: Proj, ws: string, vals: Record<string, V>) {
  const ids = await harness.sql<{ id: string; symbol: string }[]>`
    SELECT f.id, f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
    WHERE w.code = ${ws} AND f.active AND f.symbol IN ${harness.sql(Object.keys(vals))}`;
  expect(ids.length, `${ws} fields ${Object.keys(vals)}`).toBe(Object.keys(vals).length);
  const values = Object.fromEntries(ids.map((f) => [f.id, vals[f.symbol]]));
  const r = await saveWorksheet({ instanceId: p.inst.get(ws)!, values: values as never });
  expect(r.ok, `${ws} save ${JSON.stringify(r)}`).toBe(true);
  return r;
}
/** A derived value as the producing sheet's equation stores it (source_type 'derived'). */
async function putDerived(p: Proj, ws: string, symbol: string, value: number) {
  const [f] = await harness.sql<{ id: string }[]>`SELECT f.id FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = ${ws} AND f.symbol = ${symbol}`;
  await harness.sql`INSERT INTO project_parameters (project_id, field_id, source_worksheet_instance_id, value_number, source_type, entered_by)
                    VALUES (${p.id}, ${f.id}, ${p.inst.get(ws)!}, ${value}, 'derived', ${USER_ID})`;
}
async function storedNum(p: Proj, ws: string, symbol: string): Promise<number | null | 'none'> {
  const r = await harness.sql<{ v: string | null }[]>`SELECT pp.value_number::text AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
    JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE pp.project_id = ${p.id} AND w.code = ${ws} AND f.symbol = ${symbol}`;
  return r.length === 0 ? 'none' : r[0].v === null ? null : Number(r[0].v);
}
/** The form's gate panel on a sheet: own + inherited fields (loadInheritedFields), makeSymbolLookup, evaluateCondition. */
async function panel(p: Proj, ws: string): Promise<Record<string, { kind: string; missing?: string[] }>> {
  const sql = harness.sql;
  const [t] = await sql<{ id: string; standard_id: string }[]>`SELECT id, standard_id FROM worksheet_templates WHERE code = ${ws}`;
  const own = await sql<{ id: string; symbol: string; data_type: string }[]>`SELECT id, symbol, data_type FROM fields WHERE worksheet_template_id = ${t.id} AND active`;
  const inherited = await loadInheritedFields(t.id, t.standard_id, ws);
  const ownSyms = new Set(own.map((f) => f.symbol));
  const all = [...own.map((f) => ({ id: f.id, symbol: f.symbol, dataType: f.data_type })), ...inherited.filter((f) => !ownSyms.has(f.symbol)).map((f) => ({ id: f.id, symbol: f.symbol, dataType: f.dataType }))];
  const params = await sql<{ field_id: string; value_number: string | null; value_text: string | null; value_enum: string | null; value_boolean: boolean | null; value_date: string | null; value_json: unknown }[]>`
    SELECT field_id, value_number::text, value_text, value_enum, value_boolean, value_date::text, value_json FROM project_parameters
     WHERE project_id = ${p.id} AND field_id IN ${sql(all.map((f) => f.id))}`;
  const typeOf = new Map(all.map((f) => [f.id, f.dataType]));
  const values: Record<string, LookupValue> = {};
  for (const r of params) {
    const dt = typeOf.get(r.field_id);
    values[r.field_id] = dt === 'number' ? { type: 'number', value: r.value_number == null ? null : Number(r.value_number) }
      : dt === 'enum' ? { type: 'enum', value: r.value_enum } : dt === 'boolean' ? { type: 'boolean', value: r.value_boolean }
      : dt === 'date' ? { type: 'date', value: r.value_date } : dt === 'json' ? { type: 'json', value: r.value_json } : { type: 'text', value: r.value_text };
  }
  const lookup = makeSymbolLookup(all, values);
  const gates = await sql<{ code: string; condition: string; severity: string }[]>`SELECT code, condition, severity FROM compliance_requirements WHERE worksheet_template_id = ${t.id} ORDER BY code`;
  return Object.fromEntries(gates.map((g) => {
    const r = evaluateCondition(g.condition, lookup);
    return [`${g.code}/${g.severity}`, r.kind === 'pending' ? { kind: r.kind, missing: [...r.missingSymbols].sort() } : { kind: r.kind }];
  }));
}
async function approval(p: Proj, ws: string) {
  const g = await checkApprovalGate(p.inst.get(ws)!);
  return { ok: g.ok, failing: g.failingBlockConditions.map((c) => c.code).sort(), pending: g.pendingBlockConditions.map((c) => c.code).sort(), missing: g.missingRequiredFields.map((f) => f.symbol).sort() };
}
const pick = <T,>(o: Record<string, T>, codes: string[]): Record<string, T> => Object.fromEntries(Object.entries(o).filter(([k]) => codes.some((c) => k.startsWith(`${c}/`))));
async function inheritedSymbols(ws: string): Promise<string[]> {
  const [t] = await harness.sql<{ id: string; standard_id: string }[]>`SELECT id, standard_id FROM worksheet_templates WHERE code = ${ws}`;
  return (await loadInheritedFields(t.id, t.standard_id, ws)).map((f) => `${f.originWorksheetCode}:${f.symbol}`).sort();
}

let loadSameSymbolValues: typeof LoadSameSymbolValues;
let loadInheritedSymbolsForTemplate: typeof LoadInheritedSymbolsForTemplate;
async function tmplId(ws: string): Promise<string> {
  const [t] = await harness.sql<{ id: string }[]>`SELECT id FROM worksheet_templates WHERE code = ${ws}`;
  return t.id;
}
/** The page's same-symbol prefill query (worksheet page step 2): symbol → [sheet: value] from OTHER sheets of the project. */
async function offered(p: Proj, ws: string, symbols: string[]): Promise<Record<string, string[]>> {
  const m = await loadSameSymbolValues(p.id, await tmplId(ws), symbols);
  return Object.fromEntries(symbols.map((s) => [s, (m.get(s) ?? []).map((u) => `${u.worksheetCode}:${typeof u.value === 'string' ? u.value : JSON.stringify(u.value)}`)]));
}
async function allState(): Promise<string> {
  const d = await dump();
  return JSON.stringify(TOUCHED.map((t) => [...d[t]].sort()));
}
async function flow1ArchivedFields(): Promise<number> {
  const [c] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM fields_archive_m820_flow_1`;
  return c.n;
}
const d = (value: string): V => ({ type: 'date', value } as unknown as V);

let PRE: TableDump;
let one: Proj; // values typed only in 820-1 (as the parts are filled in work order)
let own: Proj; // each part with its OWN, different values (the live test project's shape)
const ONE_VALUES = { name: 'Synthetisches Klärwerk Nord', client: 'Synthetischer Abwasserverband', date: '2026-10-01', contractor: 'Synthetisches Ingenieurbüro' };

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-flow-3@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820 flow 3 harness', ${'m820-flow3-' + Date.now()}) RETURNING id`;
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
  for (const blk of PRIOR_BLOCKS) await runFile(blk); // = prod 2026-10-06
  await runFile(REQ05_MIGRATION); // staged, assumed applied
  await runFile(FLOW1_MIGRATION); // staged, assumed applied
  await runFile(FLOW2_MIGRATION); // staged, assumed applied
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate, loadInheritedSymbolsForTemplate } = await import('@/lib/actions/approval-gate'));
  ({ loadInheritedFields, loadSameSymbolValues } = await import('@/lib/db/queries/worksheet'));
  ({ recomputeWorksheetEquations: recompute } = await import('@/lib/actions/recompute-worksheet'));
}, 300_000);

afterAll(async () => {
  await harness?.stop();
});

describe('M820 flow block 3 (data) — staged block on embedded Postgres (seed = prod 2026-10-06 + REQ-05 + flow 1 + flow 2)', () => {
  it('a. pre-state = the live guards; BROKEN BEFORE: name / client / date / contractor typed in 820-1 are asked again in 820-2 and 820-3', async () => {
    expect(await archiveCounts()).toEqual({ fields: null, gates: null });
    for (const [std, ws, oldS] of RENAMES) {
      const r = await harness.sql<{ data_type: string; is_required: boolean }[]>`SELECT f.data_type, f.is_required FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
        JOIN standards s ON s.id = w.standard_id WHERE s.code = ${std} AND w.code = ${ws} AND f.symbol = ${oldS} AND f.active`;
      expect(r, `${ws} ${oldS}`).toHaveLength(1);
      expect(r[0].is_required).toBe(true);
    }
    const [g] = await harness.sql<{ condition: string }[]>`SELECT cr.condition FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE w.code = 'M8203-01' AND cr.code = 'REQ-01'`;
    expect(md5(g.condition)).toBe(REQ01_MD5);
    log('REQ-01 condition (pre)', g.condition);

    one = await makeProject('flow3-typed-in-820-1');
    await save(one, 'M820-01', { project_name_de: tx(ONE_VALUES.name), client_organization_name: tx(ONE_VALUES.client), date_registration: d(ONE_VALUES.date) });
    await save(one, 'M820-23', { winning_bidder: tx(ONE_VALUES.contractor) });
    const before = {
      offered_2: await offered(one, '820-2-01', ['project_name_full', 'client_organization']),
      offered_3: await offered(one, 'M8203-01', ['project_title', 'client_auftraggeber', 'registration_date', 'contractor_auftragnehmer']),
      missing_2: (await approval(one, '820-2-01')).missing,
      missing_3: (await approval(one, 'M8203-01')).missing,
    };
    log('BEFORE: offered on 820-2-01 / M8203-01 (page prefill query) and open required fields (checkApprovalGate)', before);
    expect(Object.values(before.offered_2).flat()).toEqual([]);
    expect(Object.values(before.offered_3).flat()).toEqual([]);
    expect(before.missing_2).toEqual(expect.arrayContaining(['client_organization', 'project_name_full']));
    expect(before.missing_3).toEqual(expect.arrayContaining(['client_auftraggeber', 'contractor_auftragnehmer', 'project_title', 'registration_date']));

    own = await makeProject('flow3-own-values');
    await save(own, 'M820-01', { project_name_de: tx('Name A (820-1)'), client_organization_name: tx('AG A'), date_registration: d('2026-09-01') });
    await save(own, '820-2-01', { project_name_full: tx('Name B (820-2)'), client_organization: tx('AG B') });
    await save(own, 'M8203-01', { project_title: tx('Name C (820-3)'), client_auftraggeber: tx('AG C'), registration_date: d('2026-09-03'), contractor_auftragnehmer: tx('AN C') });
    await save(own, 'M820-23', { winning_bidder: tx('AN A') });
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: 8 field rows renamed, REQ-01 reads client_name; archives 8 / 1; nothing else changes; project values untouched', async () => {
    const ppBefore = await projectParams();
    await runFile(MIGRATION);
    expect(await archiveCounts()).toEqual({ fields: 8, gates: 1 });
    const diff = dumpDiff(PRE, await dump());
    const kinds = diff.map((l) => l.split(' ').slice(0, 2).join(' '));
    const tally = Object.fromEntries([...new Set(kinds)].map((k) => [k, kinds.filter((x) => x === k).length]));
    log('apply diff (table / sign counts)', tally);
    expect(tally).toEqual({ 'fields -': 8, 'fields +': 8, 'compliance_requirements -': 1, 'compliance_requirements +': 1 });
    expect(await projectParams()).toEqual(ppBefore);
    const preF = new Map(PRE.fields.map((x) => JSON.parse(x) as Record<string, unknown> & { id: string }).map((x) => [x.id, x]));
    for (const [std, ws, oldS, newS] of RENAMES) {
      const [f] = await harness.sql<Record<string, unknown>[]>`SELECT f.* FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
        JOIN standards s ON s.id = w.standard_id WHERE s.code = ${std} AND w.code = ${ws} AND f.symbol = ${newS}`;
      const p = preF.get(f.id as string)!;
      expect(p.symbol).toBe(oldS);
      // only symbol + the note changed: label, type, required, section, order, consumers identical
      for (const k of ['label_de', 'label_en', 'data_type', 'is_required', 'section_id', 'order_index', 'consumer_worksheets', 'active', 'worksheet_template_id']) {
        expect(JSON.stringify(f[k]), `${ws} ${newS} ${k}`).toBe(JSON.stringify(p[k]));
      }
      expect(String(f.description).startsWith(`${p.description ?? ''}\n[Flow 3, 2026-10-06] Symbol ${newS} (vorher / was ${oldS})`)).toBe(true);
    }
    const [g] = await harness.sql<{ condition: string }[]>`SELECT cr.condition FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE w.code = 'M8203-01' AND cr.code = 'REQ-01'`;
    log('REQ-01 condition (after)', { condition: g.condition, md5: md5(g.condition) });
    expect(g.condition).toContain('client_name IS NOT EMPTY');
    expect(g.condition).not.toContain('client_auftraggeber');
  });

  it('c. apply again: 0 changes (full dump compare), archives unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    expect(dumpDiff(before, await dump())).toEqual([]);
    expect(await archiveCounts()).toEqual({ fields: 8, gates: 1 });
  });

  it('d. rollback: byte-equal to the pre-state, archives emptied; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    log('rollback diff vs pre', dumpDiff(PRE, after));
    log('rollback digest', digest(after));
    expect(dumpDiff(PRE, after)).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await archiveCounts()).toEqual({ fields: 0, gates: 0 });
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await archiveCounts()).toEqual({ fields: 0, gates: 0 });
  });

  it('d2. a row edited after the apply is left alone by the rollback; the rest is restored', async () => {
    await runFile(MIGRATION);
    await harness.sql`UPDATE fields SET description = description || ' (edited)' WHERE symbol = 'registration_date' AND worksheet_template_id = (SELECT id FROM worksheet_templates WHERE code = 'M820-01')`;
    await runFile(ROLLBACK);
    const left = await harness.sql<{ ws: string; symbol: string }[]>`SELECT w.code AS ws, f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
      WHERE (w.code, f.symbol) IN (('M820-01','registration_date'), ('M820-01','date_registration'), ('M820-01','project_name_de'), ('M820-01','project_name'))`;
    log('rollback with one edited row', { left, archive: await archiveCounts() });
    expect(left.map((x) => `${x.ws}:${x.symbol}`).sort()).toEqual(['M820-01:project_name_de', 'M820-01:registration_date']);
    expect(await archiveCounts()).toEqual({ fields: 1, gates: 0 });
    await harness.sql`UPDATE fields SET description = left(description, length(description) - length(' (edited)')) WHERE symbol = 'registration_date' AND worksheet_template_id = (SELECT id FROM worksheet_templates WHERE code = 'M820-01')`;
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await archiveCounts()).toEqual({ fields: 0, gates: 0 });
  });

  it('e. the read-back file runs before and after an apply and shows the expected values', async () => {
    const text = readFileSync(READBACK, 'utf8');
    const stmts = splitOnUnquotedSemicolons(text).filter((s) => s.trim());
    expect(stmts).toHaveLength(3);
    expect(text.split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(3);
    const run = async (list: string[]) => { const out: unknown[][] = []; for (const st of list) out.push([...(await harness.sql.unsafe(st))]); return out; };
    const pre = await run(stmts.slice(0, 2));
    log('read-back (before)', pre);
    expect((pre[0] as Array<{ old_found: string; new_found: string }>).map((r) => [r.old_found, r.new_found])).toEqual(Array(8).fill(['1', '0']));
    expect(pre[1]).toEqual([{ code: 'REQ-01', ws: 'M8203-01', severity: 'block', old_ok: true, new_ok: false }]);
    await runFile(MIGRATION);
    const post = await run(stmts);
    log('read-back (after)', post);
    expect((post[0] as Array<{ old_found: string; new_found: string }>).map((r) => [r.old_found, r.new_found])).toEqual(Array(8).fill(['0', '1']));
    expect((post[0] as Array<{ saved_values: string }>).map((r) => r.saved_values)).toEqual((pre[0] as Array<{ saved_values: string }>).map((r) => r.saved_values));
    expect(post[1]).toEqual([{ code: 'REQ-01', ws: 'M8203-01', severity: 'block', old_ok: false, new_ok: true }]);
    expect(post[2]).toEqual([{ field_archive: '8', gate_archive: '1' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('f. after the apply: what 820-1 typed is offered in 820-2 / 820-3 and counts as filled; own values stay own; REQ-01 decides on the renamed field', async () => {
    await runFile(MIGRATION);
    const after = {
      offered_2: await offered(one, '820-2-01', ['project_name', 'client_name']),
      offered_3: await offered(one, 'M8203-01', ['project_name', 'client_name', 'registration_date', 'contractor_auftragnehmer']),
      missing_2: (await approval(one, '820-2-01')).missing,
      missing_3: (await approval(one, 'M8203-01')).missing,
      a4_2: [...(await loadInheritedSymbolsForTemplate(one.id, await tmplId('820-2-01')))].sort(),
    };
    log('AFTER: offered on 820-2-01 / M8203-01 and open required fields (values typed in 820-1 only)', after);
    expect(after.offered_2).toEqual({ project_name: [`M820-01:${ONE_VALUES.name}`], client_name: [`M820-01:${ONE_VALUES.client}`] });
    expect(after.offered_3).toEqual({
      project_name: [`M820-01:${ONE_VALUES.name}`], client_name: [`M820-01:${ONE_VALUES.client}`],
      registration_date: [`M820-01:${ONE_VALUES.date}`], contractor_auftragnehmer: [`M820-23:${ONE_VALUES.contractor}`],
    });
    expect(after.missing_2).not.toEqual(expect.arrayContaining(['project_name']));
    for (const s of ['project_name', 'client_name']) expect(after.missing_2).not.toContain(s);
    for (const s of ['project_name', 'client_name', 'registration_date', 'contractor_auftragnehmer']) expect(after.missing_3).not.toContain(s);
    expect(after.a4_2).toEqual(expect.arrayContaining(['client_name', 'project_name']));

    // own values: every part keeps its own saved value (local first); the other parts' values are only hints
    const ownView: Record<string, unknown> = {};
    for (const [, ws, , newS] of RENAMES) {
      const r = await harness.sql<{ v: string | null }[]>`SELECT COALESCE(pp.value_text, pp.value_date::text) AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
        JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE pp.project_id = ${own.id} AND w.code = ${ws} AND f.symbol = ${newS}`;
      ownView[`${ws}:${newS}`] = r[0]?.v ?? null;
    }
    log('AFTER: own values per part (unchanged, read by the renamed field)', ownView);
    expect(ownView).toEqual({
      'M820-01:project_name': 'Name A (820-1)', '820-2-01:project_name': 'Name B (820-2)', 'M8203-01:project_name': 'Name C (820-3)',
      'M820-01:client_name': 'AG A', '820-2-01:client_name': 'AG B', 'M8203-01:client_name': 'AG C',
      'M820-01:registration_date': '2026-09-01', 'M820-23:contractor_auftragnehmer': 'AN A',
    });
    const ownMissing = { m01: (await approval(own, 'M820-01')).missing, s201: (await approval(own, '820-2-01')).missing, m3: (await approval(own, 'M8203-01')).missing };
    for (const s of ['project_name', 'client_name', 'registration_date']) expect(ownMissing.m01).not.toContain(s);
    for (const s of ['project_name', 'client_name']) expect(ownMissing.s201).not.toContain(s);
    for (const s of ['project_name', 'client_name', 'registration_date', 'contractor_auftragnehmer']) expect(ownMissing.m3).not.toContain(s);

    // REQ-01 (block) on M8203-01 reads its OWN client_name (a local field): own value → decides; the carried 820-1 value
    // alone does not (local fields resolve locally — the engineer confirms the offered value by saving it)
    const r01own = { panel: pick(await panel(own, 'M8203-01'), ['REQ-01']), approval: await approval(own, 'M8203-01') };
    const r01one = { panel: pick(await panel(one, 'M8203-01'), ['REQ-01']), approval: await approval(one, 'M8203-01') };
    log('AFTER: REQ-01 on M8203-01 — own values / only 820-1 values', { r01own, r01one });
    // own-values project: waits only for the sector; the 820-1-only project also for its OWN client / contractor
    expect(r01own.panel['REQ-01/block'].missing).toEqual(['sector_abfall', 'sector_abwasser', 'sector_wasserbau', 'sector_wasserwirtschaft']);
    expect(r01one.panel['REQ-01/block'].missing).toEqual(['client_name', 'contractor_auftragnehmer', 'sector_abfall', 'sector_abwasser', 'sector_wasserbau', 'sector_wasserwirtschaft']);
    await save(own, 'M8203-01', { sector_abwasser: b(true) });
    expect(pick(await panel(own, 'M8203-01'), ['REQ-01'])['REQ-01/block'].kind).toBe('pass');
    await save(one, 'M8203-01', { sector_abwasser: b(true), client_name: tx(ONE_VALUES.client), contractor_auftragnehmer: tx(ONE_VALUES.contractor) });
    const r01oneSaved = { panel: pick(await panel(one, 'M8203-01'), ['REQ-01']), approval: await approval(one, 'M8203-01') };
    log('AFTER: REQ-01 once the offered values are saved on M8203-01', r01oneSaved);
    expect(r01oneSaved.panel['REQ-01/block'].kind).toBe('pass');
    expect([...r01oneSaved.approval.failing, ...r01oneSaved.approval.pending]).not.toContain('REQ-01');
    await save(one, 'M8203-01', { client_name: tx('') });
    expect(pick(await panel(one, 'M8203-01'), ['REQ-01'])['REQ-01/block'].kind).not.toBe('pass');
    await runFile(ROLLBACK);
    // the saves above added project values only; the definition tables are back to the pre-state
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('g. X10 (code): the 820-1 risk register and measure plan count for 820-2-10 through the allow-list; the gate fallback stays own-standard', async () => {
    const p = await makeProject('flow3-risk-carry');
    const reg = { rows: [{ id: 'r1', group: 'Projektumfeld', risk: 'Synthetisches Risiko', description: 'Synthetisch' }] };
    const plan = { rows: [{ id: 'm1', risk: 'Synthetisches Risiko', measure: 'Synthetische Maßnahme' }] };
    await save(p, 'M820-06', { risk_register: jv(reg) });
    await save(p, 'M820-07', { risk_mitigation_plan: jv(plan) });
    const a4 = [...(await loadInheritedSymbolsForTemplate(p.id, await tmplId('820-2-10')))].sort();
    const a4Other = [...(await loadInheritedSymbolsForTemplate(p.id, await tmplId('M820-25')))].sort();
    const off = await offered(p, '820-2-10', ['risk_register', 'risk_mitigation_plan']);
    log('X10: A4 set on 820-2-10 (allow-list) / offered on 820-2-10', { a4: a4.filter((s) => s.startsWith('risk')), off });
    expect(a4).toEqual(expect.arrayContaining(['risk_mitigation_plan', 'risk_register']));
    const raw = await loadSameSymbolValues(p.id, await tmplId('820-2-10'), ['risk_register', 'risk_mitigation_plan']);
    expect(raw.get('risk_register')!.map((x) => [x.worksheetCode, x.sourceStandardCode, x.value])).toEqual([['M820-06', 'DWA-M-820-1', reg]]);
    expect(raw.get('risk_mitigation_plan')!.map((x) => [x.worksheetCode, x.sourceStandardCode, x.value])).toEqual([['M820-07', 'DWA-M-820-1', plan]]);
    // reverse direction is not on the list: an 820-2 register never fills 820-1
    const q = await makeProject('flow3-risk-reverse');
    await save(q, '820-2-10', { risk_register: jv(reg) });
    const a4Rev = [...(await loadInheritedSymbolsForTemplate(q.id, await tmplId('M820-06')))];
    log('X10: A4 set on M820-06 with only an 820-2 register (reverse)', a4Rev.filter((s) => s.startsWith('risk')));
    expect(a4Rev).not.toContain('risk_register');
    expect(a4Other).toEqual(expect.arrayContaining(['risk_mitigation_plan', 'risk_register'])); // same standard (M820-06/-07 → -25): own occurrences, as before
    // the approval of 820-2-10 never reads the 820-1 carrier (no 820-2 gate reads risk_register / risk_mitigation_plan; fallback own-standard)
    const gates210 = await harness.sql<{ code: string; condition: string }[]>`SELECT cr.code, cr.condition FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
      JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND cr.condition ~ '\\m(risk_register|risk_mitigation_plan)\\M'`;
    expect(gates210).toEqual([]);
  });

  it('h. order: commutes with REQ-05 and flow 2; MUST follow flow 1 (flow 1 finds 3 identity rows by the old symbols)', async () => {
    // commutes with flow 2 and REQ-05
    await runFile(MIGRATION);
    const normal = await allState();
    await runFile(ROLLBACK);
    await runFile(FLOW2_ROLLBACK);
    await runFile(REQ05_ROLLBACK);
    await runFile(MIGRATION);
    await runFile(REQ05_MIGRATION);
    await runFile(FLOW2_MIGRATION);
    expect(await allState()).toBe(normal);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    // the dependency on flow 1: applied in the wrong order, flow 1 misses the five renamed identity rows
    await runFile(FLOW2_ROLLBACK);
    await runFile(FLOW1_ROLLBACK);
    await runFile(MIGRATION);
    await runFile(FLOW1_MIGRATION);
    const wrong = await flow1ArchivedFields();
    const unexpanded = await harness.sql<{ ws: string; symbol: string; cw: string }[]>`SELECT w.code AS ws, f.symbol, array_to_string(f.consumer_worksheets, ',') AS cw FROM fields f
      JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE f.consumer_worksheets && ARRAY['all','ALL']::text[] ORDER BY 1, 2`;
    log('WRONG ORDER (block 3 before flow 1): flow-1 field archive rows / "all"/"ALL" arrays left', { wrong, unexpanded });
    expect(wrong).toBe(31 - 3);
    expect(unexpanded.map((x) => `${x.ws}:${x.symbol}`)).toEqual(['820-2-01:project_name', 'M8203-01:client_name', 'M8203-01:project_name']);
    await runFile(FLOW1_ROLLBACK);
    await runFile(ROLLBACK);
    await runFile(FLOW1_MIGRATION);
    await runFile(FLOW2_MIGRATION);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    // right order: flow 1 → block 3; rollback in reverse
    await runFile(MIGRATION);
    expect(await flow1ArchivedFields()).toBe(31);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });
});
