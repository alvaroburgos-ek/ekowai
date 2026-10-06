/**
 * DWA-M 820-3 · Projektstopp code per project path — embedded-Postgres proof of
 *   scripts/migrations/20261006230000_m820_3_projektstopp_paths.sql
 *   scripts/rollback-20261006230000-m820-3-projektstopp-paths.sql
 *   scripts/verification/apply/readback-20261006230000-m820-3-projektstopp-paths.sql
 * (evidence: vault 01-Projects/ekowai-wizard/m820-wizard-test/40_Fill-Run_M820-3_C2-public_2026-10-06.md F-3 and
 *  21_Fill-Run_M820-3_C1_2026-10-06.md; apply order 41_APPLY-ORDER-m820-3-projektstopp-paths.md; sign-off 42_SIGN-OFF-…).
 *
 * Disposable embedded Postgres only — no prod, no .env.local. REAL saveWorksheet / recomputeWorksheetEquations (the MCP
 * set_field_values / recompute_worksheet path that produced the live "notComputed") / loadInheritedFields + evaluateCondition (the
 * form's gate panel). SEED: the three 2026-10-05 dumps + prior.json consumers, the six applied blocks (= prod 2026-10-06), then the
 * staged blocks in apply order: REQ-05 home, flow 1, flow 2, flow 3, hints. ROWS: synthetic projects; the phase-goal statuses are the
 * readiness cases C1 (14_ § 2, Einzelprojekt; § 6.6 / 6.7 "noch_nicht_erreicht" as in the 21_ fill run) and C2 (40_ / 14_ § 3,
 * Gesamtsystem) — statuses only, no client text.
 * Hand values (§ 3: a goal "nicht oder nur unvollständig erreicht" triggers): C2 pz_52_1 = teilweise_erreicht → code_a 1, code 1;
 * C1 pz_62_3 = teilweise_erreicht → code_b 1, code 1; C1 as filled live (13 § 5 goals typed "nicht_zutreffend") → a 0 / b 1 / code 1.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startHarness, type Harness } from './embedded-pg';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { loadInheritedFields as LoadInheritedFields } from '@/lib/db/queries/worksheet';
import type { recomputeWorksheetEquations as RecomputeWorksheetEquations } from '@/lib/actions/recompute-worksheet';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import { makeSymbolLookup, type LookupValue } from '@/lib/compliance/symbol-lookup';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008fa';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261006230000_m820_3_projektstopp_paths.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006230000-m820-3-projektstopp-paths.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261006230000-m820-3-projektstopp-paths.sql');
const HINTS_MIGRATION = resolve(ROOT, 'scripts/migrations/20261006220000_m820_3_hints.sql');
const HINTS_ROLLBACK = resolve(ROOT, 'scripts/migrations/rollback-20261006220000_m820_3_hints.sql');
const BLOCK19_ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006120000-m820-3-structure.sql');
const PRIOR_BLOCKS = [
  'scripts/migrations/20261005193000_m820_1_client_route.sql',
  'scripts/migrations/20261005200000_m820_2_registers.sql',
  'scripts/migrations/20261006100000_m820_2_structure.sql',
  'scripts/migrations/20261006120000_m820_3_structure.sql',
  'scripts/migrations/20261006160000_m820_followup_1.sql',
  'scripts/migrations/20261006170000_m820_1_risk_changes.sql',
  'scripts/migrations/20261006180000_m820_1_req05_home.sql', // staged, assumed applied
  'scripts/migrations/20261006190000_m820_flow_1.sql', // applied 2026-10-06 (fill runs 40_)
  'scripts/migrations/20261006200000_m820_flow_2.sql',
  'scripts/migrations/20261006210000_m820_flow_3.sql',
  'scripts/migrations/20261006220000_m820_3_hints.sql', // staged, applied before this block (41_)
].map((p) => resolve(ROOT, p));
const LIVE_PHASE: Record<string, Array<[number, number, number]>> = {
  'DWA-M-820-1': [[1, 3, 1], [4, 9, 2], [10, 15, 3], [16, 20, 4], [21, 23, 5], [24, 25, 6]],
  'DWA-M-820-2': [[1, 4, 1], [5, 10, 2], [11, 15, 3], [16, 19, 4], [20, 24, 5], [25, 28, 6]],
  'DWA-M-820-3': [[1, 3, 1], [4, 6, 2], [7, 10, 3], [11, 18, 4], [19, 21, 5], [22, 24, 6]],
};
const OLD_F = '2d497935cfa3c2e9ac44081a90cec57a';
const NEW_F = '0e7c0e64ba6c08ac022ea68a58e71ed3';
const OLD_IN = 'dfecf762b4e202809a971bb97419e45a';
const NEW_IN = '0491f77109ae615e0cfd34028bbc4348';
const PT_17 = '2f3cd1303a9a27b1a1b864f531ce3e8c';
const log = (label: string, v: unknown) => console.log(`[M820-3 PROJEKTSTOPP PATHS] ${label}: ${JSON.stringify(v)}`);
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
const digest = (d: TableDump) => Object.fromEntries(TOUCHED.map((t) => [t, `${d[t].length} rows md5 ${md5(d[t].join('\n'))}`]));
async function runFile(path: string): Promise<void> {
  const conn = await harness.sql.reserve();
  try { await conn.unsafe(readFileSync(path, 'utf8')); } finally { conn.release(); }
}
async function archiveCounts(): Promise<{ equations: number | null; fields: number | null }> {
  const one = async (t: string) => {
    const [r] = await harness.sql<{ t: string | null }[]>`SELECT to_regclass(${'public.' + t})::text AS t`;
    if (!r.t) return null;
    const [c] = await harness.sql.unsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${t}`);
    return c.n;
  };
  return { equations: await one('equations_archive_m820_3_projektstopp_paths'), fields: await one('fields_archive_m820_3_projektstopp_paths') };
}
async function d1State(): Promise<{ formula: string; inputs: string; n: number; first: string }> {
  const [r] = await harness.sql<{ formula: string; inputs: string; n: number; first: string }[]>`
    SELECT md5(e.formula) AS formula, md5(e.input_symbols::text) AS inputs, array_length(e.input_symbols, 1) AS n, e.input_symbols[1] AS first
      FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id WHERE w.code = 'M8203-24' AND e.equation_number = 'M8203-24-D1'`;
  return r;
}

// ── project fixture ───────────────────────────────────────────────────────────────────────────────────────────────
type Proj = { id: string; name: string; inst: Map<string, string> };
async function makeProject(name: string): Promise<Proj> {
  const sql = harness.sql;
  const [org] = await sql<{ id: string }[]>`SELECT id FROM orgs LIMIT 1`;
  const [p] = await sql<{ id: string }[]>`INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, ${name}, ${USER_ID}) RETURNING id`;
  const tm = await sql<{ id: string; code: string }[]>`SELECT w.id, w.code FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-3'`;
  const inst = new Map<string, string>();
  for (const t of tm) {
    const [i] = await sql<{ id: string }[]>`INSERT INTO worksheet_instances (project_id, worksheet_template_id) VALUES (${p.id}, ${t.id}) RETURNING id`;
    inst.set(t.code, i.id);
  }
  return { id: p.id, name, inst };
}
type V = { type: 'boolean'; value: boolean } | { type: 'enum'; value: string } | { type: 'number'; value: number };
/** Saves symbol → value on whatever 820-3 sheet owns the symbol (one saveWorksheet per sheet). */
async function put(p: Proj, vals: Record<string, V>): Promise<void> {
  const rows = await harness.sql<{ id: string; symbol: string; ws: string }[]>`
    SELECT f.id, f.symbol, w.code AS ws FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
     WHERE s.code = 'DWA-M-820-3' AND f.active AND f.symbol IN ${harness.sql(Object.keys(vals))}`;
  expect(rows.map((r) => r.symbol).sort(), 'every symbol owned once').toEqual(Object.keys(vals).sort());
  const bySheet = new Map<string, Record<string, V>>();
  for (const r of rows) bySheet.set(r.ws, { ...(bySheet.get(r.ws) ?? {}), [r.id]: vals[r.symbol] });
  for (const [ws, values] of bySheet) {
    const r = await saveWorksheet({ instanceId: p.inst.get(ws)!, values: values as never });
    expect(r.ok, `${ws} save ${JSON.stringify(r)}`).toBe(true);
  }
}
const en = (value: string): V => ({ type: 'enum', value });
const nm = (value: number): V => ({ type: 'number', value });
const bo = (value: boolean): V => ({ type: 'boolean', value });
const goals = (prefix: string, statuses: string[]): Record<string, V> =>
  Object.fromEntries(statuses.map((s, i) => [`pz_${prefix}_${i + 1}_status`, en(s)]));
const T = 'teilweise_erreicht', E = 'erreicht', N = 'nicht_erreicht', NZ = 'nicht_zutreffend', NNE = 'noch_nicht_erreicht';
// C2 (Gesamtsystem, 40_ § 1 / 14_ § 3): § 5 goals
const C2_S5 = { ...goals('52', [T, T, E, E, T]), ...goals('53', [T, N, E, T, N]), ...goals('54', [E, E, E]) };
// C1 (Einzelprojekt, 14_ § 2 rows pz_62 … pz_65; § 6.6 / 6.7 "noch_nicht_erreicht" as entered in the 21_ fill run): § 6 goals
const C1_S6 = {
  ...goals('62', [E, NZ, T, T, E]),
  ...goals('63', [E, T, NZ, T, T, E, T, E]),
  ...goals('64', [T, T, T, E, T, T, T, T, E, NZ, NZ, NZ]),
  ...goals('65', [T, T, T, E, E, N, E, T, NZ, E, E, NZ]),
  ...goals('66', Array(11).fill(NNE)),
  ...goals('67', Array(6).fill(NNE)),
};
const S5_ALL = (s: string) => ({ ...goals('52', Array(5).fill(s)), ...goals('53', Array(5).fill(s)), ...goals('54', Array(3).fill(s)) });
const S6_ALL = (s: string) => ({
  ...goals('62', Array(5).fill(s)), ...goals('63', Array(8).fill(s)), ...goals('64', Array(12).fill(s)),
  ...goals('65', Array(12).fill(s)), ...goals('66', Array(11).fill(s)), ...goals('67', Array(6).fill(s)),
});
const A_TOTALS = { qe52_items_total: nm(15), qe53_items_total: nm(8), qe54_items_total: nm(12), qe55_items_total: nm(3) };
const B_TOTALS = { qe62_items_total: nm(15), qe63a_items_total: nm(21), qe63b_items_total: nm(19), qe64a_items_total: nm(17), qe64b_items_total: nm(33), qe65_items_total: nm(34), qe66_items_total: nm(10), qe67_items_total: nm(6) };

type Code = { kind: 'computed'; value: number | null } | { kind: 'not_computed'; missing: number; firstMissing: string[]; reason: string };
/** The server recompute of one sheet (MCP recompute_worksheet / the tail of set_field_values); the state of one output. */
async function codeOn(p: Proj, ws: string, eq: string, symbol: string): Promise<Code> {
  const r = await recompute(p.inst.get(ws)!);
  const nc = r.notComputed.find((x) => x.equationNumber === eq);
  if (nc) {
    const m = /Fehlende oder leere Eingaben: (.*)$/.exec(nc.reason);
    const missing = m ? m[1].split(', ') : [];
    return { kind: 'not_computed', missing: missing.length, firstMissing: missing.slice(0, 3), reason: nc.reason.slice(0, 80) };
  }
  const v = await harness.sql<{ v: string | null }[]>`SELECT pp.value_number::text AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
    JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE pp.project_id = ${p.id} AND w.code = ${ws} AND f.symbol = ${symbol}`;
  return { kind: 'computed', value: v.length === 0 || v[0].v === null ? null : Number(v[0].v) };
}
const code24 = (p: Proj) => codeOn(p, 'M8203-24', 'M8203-24-D1', 'projektstopp_code');
const codeA = (p: Proj) => codeOn(p, 'M8203-22', 'M8203-22-D3', 'projektstopp_code_a');
const codeB = (p: Proj) => codeOn(p, 'M8203-23', 'M8203-23-D3', 'projektstopp_code_b');
const totalA = (p: Proj) => codeOn(p, 'M8203-22', 'M8203-22-D1', 'gesamt_anhang_a_items_total_calc');
const totalB = (p: Proj) => codeOn(p, 'M8203-23', 'M8203-23-D1', 'gesamt_anhang_b_items_total_calc');
/** The form's gate panel on M8203-24 for REQ-31 (own + inherited fields, makeSymbolLookup, evaluateCondition). */
async function req31(p: Proj): Promise<{ kind: string; missing?: string[] }> {
  const sql = harness.sql;
  const [t] = await sql<{ id: string; standard_id: string }[]>`SELECT id, standard_id FROM worksheet_templates WHERE code = 'M8203-24'`;
  const own = await sql<{ id: string; symbol: string; data_type: string }[]>`SELECT id, symbol, data_type FROM fields WHERE worksheet_template_id = ${t.id} AND active`;
  const inherited = await loadInheritedFields(t.id, t.standard_id, 'M8203-24');
  const ownSyms = new Set(own.map((f) => f.symbol));
  const all = [...own.map((f) => ({ id: f.id, symbol: f.symbol, dataType: f.data_type })), ...inherited.filter((f) => !ownSyms.has(f.symbol)).map((f) => ({ id: f.id, symbol: f.symbol, dataType: f.dataType }))];
  const params = await sql<{ field_id: string; value_number: string | null; value_text: string | null; value_enum: string | null; value_boolean: boolean | null; value_json: unknown }[]>`
    SELECT field_id, value_number::text, value_text, value_enum, value_boolean, value_json FROM project_parameters WHERE project_id = ${p.id} AND field_id IN ${sql(all.map((f) => f.id))}`;
  const typeOf = new Map(all.map((f) => [f.id, f.dataType]));
  const values: Record<string, LookupValue> = {};
  for (const r of params) {
    const dt = typeOf.get(r.field_id);
    values[r.field_id] = dt === 'number' ? { type: 'number', value: r.value_number == null ? null : Number(r.value_number) }
      : dt === 'enum' ? { type: 'enum', value: r.value_enum } : dt === 'boolean' ? { type: 'boolean', value: r.value_boolean }
      : dt === 'json' ? { type: 'json', value: r.value_json } : { type: 'text', value: r.value_text };
  }
  const [g] = await sql<{ condition: string; severity: string }[]>`SELECT condition, severity FROM compliance_requirements WHERE worksheet_template_id = ${t.id} AND code = 'REQ-31'`;
  expect(g.severity).toBe('warn');
  const r = evaluateCondition(g.condition, makeSymbolLookup(all, values));
  return r.kind === 'pending' ? { kind: r.kind, missing: [...r.missingSymbols].sort() } : { kind: r.kind };
}

let PRE: TableDump;
const P: Record<string, Proj> = {};

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-3-projektstopp@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820-3 projektstopp harness', ${'m8203-ps-' + Date.now()}) RETURNING id`;
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
  for (const blk of PRIOR_BLOCKS) await runFile(blk);
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ loadInheritedFields } = await import('@/lib/db/queries/worksheet'));
  ({ recomputeWorksheetEquations: recompute } = await import('@/lib/actions/recompute-worksheet'));

  // the cases (statuses typed through the real save path; the API accepts a hidden sheet's field, a browser user never sees it)
  P.c2 = await makeProject('C2 gesamtsystem (§ 5 only — browser-faithful)');
  await put(P.c2, { project_type: en('gesamtsystem'), ...C2_S5, ...A_TOTALS, projektstopp_review_triggered: bo(false) });
  P.c1 = await makeProject('C1 einzelprojekt (§ 6 only — browser-faithful)');
  await put(P.c1, { project_type: en('einzelprojekt'), ...C1_S6, ...B_TOTALS, projektstopp_review_triggered: bo(false) });
  P.c1live = await makeProject('C1 einzelprojekt as filled live (§ 5 typed nicht_zutreffend)');
  await put(P.c1live, { project_type: en('einzelprojekt'), ...S5_ALL(NZ), ...C1_S6 });
  P.both = await makeProject('both (C2 § 5 + C1 § 6)');
  await put(P.both, { project_type: en('both'), ...C2_S5, ...C1_S6 });
  P.bothOk = await makeProject('both, every goal erreicht');
  await put(P.bothOk, { project_type: en('both'), ...S5_ALL(E), ...S6_ALL(E) });
  P.bothHalf = await makeProject('both, § 6 unanswered');
  await put(P.bothHalf, { project_type: en('both'), ...C2_S5 });
  P.gOk = await makeProject('gesamtsystem, every § 5 goal erreicht');
  await put(P.gOk, { project_type: en('gesamtsystem'), ...S5_ALL(E) });
  P.eStale = await makeProject('einzelprojekt, § 6 erreicht, stale § 5 nicht_erreicht from before the path was chosen');
  await put(P.eStale, { project_type: en('einzelprojekt'), ...S5_ALL(N), ...S6_ALL(E) });
  P.noType = await makeProject('no project_type, all 67 answered');
  await put(P.noType, { ...S5_ALL(E), ...S6_ALL(E) });
}, 600_000);

afterAll(async () => {
  await harness?.stop();
});

describe('DWA-M 820-3 Projektstopp code per path — staged block on embedded Postgres (seed = prod 2026-10-06 + REQ-05 + flow 1-3 + hints)', () => {
  it('a. pre-state = the live guards; BROKEN BEFORE: gesamtsystem "not computed" (54 missing), einzelprojekt "not computed" (13 missing), REQ-31 undecidable', async () => {
    expect(await archiveCounts()).toEqual({ equations: null, fields: null });
    expect(await d1State()).toEqual({ formula: OLD_F, inputs: OLD_IN, n: 67, first: 'pz_52_1_status' });
    const [pt] = await harness.sql<{ m: string }[]>`SELECT md5(f.consumer_worksheets::text) AS m FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = 'M8203-01' AND f.symbol = 'project_type'`;
    expect(pt.m).toBe(PT_17);
    // the body of M8203-24-D1 is exactly body(M8203-22-D3) OR body(M8203-23-D3): the new formula reuses the three live bodies verbatim
    const f = Object.fromEntries((await harness.sql<{ n: string; f: string }[]>`SELECT equation_number AS n, formula AS f FROM equations WHERE equation_number IN ('M8203-22-D3','M8203-23-D3','M8203-24-D1')`).map((r) => [r.n, r.f]));
    const body = (s: string, lhs: string) => s.slice(`${lhs} = if(`.length, -', 1, 0)'.length);
    expect(body(f['M8203-24-D1'], 'projektstopp_code')).toBe(`${body(f['M8203-22-D3'], 'projektstopp_code_a')} OR ${body(f['M8203-23-D3'], 'projektstopp_code_b')}`);

    const before = {
      c2: { a: await codeA(P.c2), code: await code24(P.c2), req31: await req31(P.c2) },
      c1: { b: await codeB(P.c1), code: await code24(P.c1), req31: await req31(P.c1) },
      c1live: { a: await codeA(P.c1live), b: await codeB(P.c1live), code: await code24(P.c1live) },
      eStale: await code24(P.eStale),
      noType: await code24(P.noType),
    };
    log('BEFORE', before);
    expect(before.c2.a).toEqual({ kind: 'computed', value: 1 });
    expect(before.c2.code).toMatchObject({ kind: 'not_computed', missing: 54, firstMissing: ['pz_62_1_status', 'pz_62_2_status', 'pz_62_3_status'] });
    expect(before.c2.req31).toEqual({ kind: 'pending', missing: ['projektstopp_code'] });
    expect(before.c1.b).toEqual({ kind: 'computed', value: 1 });
    expect(before.c1.code).toMatchObject({ kind: 'not_computed', missing: 13, firstMissing: ['pz_52_1_status', 'pz_52_2_status', 'pz_52_3_status'] });
    expect(before.c1.req31).toEqual({ kind: 'pending', missing: ['projektstopp_code'] });
    // why the live C1 project showed a code: the 13 § 5 goals had been typed "nicht_zutreffend" through the API (a 0 / b 1 / code 1)
    expect(before.c1live).toEqual({ a: { kind: 'computed', value: 0 }, b: { kind: 'computed', value: 1 }, code: { kind: 'computed', value: 1 } });
    expect(before.eStale).toEqual({ kind: 'computed', value: 1 });
    expect(before.noType).toEqual({ kind: 'computed', value: 0 });
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: M8203-24-D1 formula / inputs / hint, project_type reaches M8203-24, projektstopp_code hint; nothing else changes', async () => {
    await runFile(MIGRATION);
    expect(await archiveCounts()).toEqual({ equations: 1, fields: 2 });
    const diff = dumpDiff(PRE, await dump());
    const kinds = diff.map((l) => l.split(' ').slice(0, 2).join(' '));
    const tally = Object.fromEntries([...new Set(kinds)].map((k) => [k, kinds.filter((x) => x === k).length]));
    log('apply diff (table / sign counts)', tally);
    expect(tally).toEqual({ 'fields -': 2, 'fields +': 2, 'equations -': 1, 'equations +': 1 });
    expect(await d1State()).toEqual({ formula: NEW_F, inputs: NEW_IN, n: 68, first: 'project_type' });
    const [e] = await harness.sql<Record<string, unknown>[]>`SELECT e.* FROM equations e WHERE e.equation_number = 'M8203-24-D1'`;
    const pre = JSON.parse(PRE.equations.find((r) => r.includes(`"${e.id as string}"`))!) as Record<string, unknown>;
    for (const k of ['output_symbol', 'output_unit', 'clause_reference', 'verification_status', 'audit_status', 'worksheet_template_id']) {
      expect(JSON.stringify(e[k]), `D1 ${k}`).toBe(JSON.stringify(pre[k]));
    }
    expect((e.input_symbols as string[]).slice(1)).toEqual(pre.input_symbols);
    const formula = e.formula as string;
    log('new formula (head / tail)', { head: formula.slice(0, 160), tail: formula.slice(-120), length: formula.length });
    expect(formula.startsWith("projektstopp_code = if(project_type == 'gesamtsystem', if(pz_52_1_status IN")).toBe(true);
    const [pt] = await harness.sql<{ cw: string[] }[]>`SELECT f.consumer_worksheets AS cw FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = 'M8203-01' AND f.symbol = 'project_type'`;
    expect(pt.cw.at(-1)).toBe('M8203-24');
    expect(pt.cw).toHaveLength(18);
    const [h] = await harness.sql<{ d: string }[]>`SELECT f.description AS d FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = 'M8203-24' AND f.symbol = 'projektstopp_code'`;
    expect(h.d).toContain('\n[EN] Computed: 1 if any phase goal of the chosen project path');
    expect(h.d).toContain('„Werden Phasenziele nicht oder nur unvollständig erreicht, ist die Prüfung eines Projektstopps erforderlich.“');
  });

  it('c. apply again: 0 changes (full dump compare), archives unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    expect(dumpDiff(before, await dump())).toEqual([]);
    expect(await archiveCounts()).toEqual({ equations: 1, fields: 2 });
  });

  it('d. rollback: byte-equal to the pre-state, archives emptied; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    log('rollback diff vs pre', dumpDiff(PRE, after));
    expect(dumpDiff(PRE, after)).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await archiveCounts()).toEqual({ equations: 0, fields: 0 });
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await archiveCounts()).toEqual({ equations: 0, fields: 0 });
  });

  it('d2. a value edited after the apply is left alone by the rollback (archive row kept); the rest is restored', async () => {
    await runFile(MIGRATION);
    await harness.sql`UPDATE fields SET description = description || ' (edited)' WHERE symbol = 'projektstopp_code'`;
    await runFile(ROLLBACK);
    const s = { d1: await d1State(), archive: await archiveCounts() };
    log('rollback with an edited hint', s);
    expect(s.d1).toEqual({ formula: OLD_F, inputs: OLD_IN, n: 67, first: 'pz_52_1_status' });
    expect(s.archive).toEqual({ equations: 0, fields: 1 });
    await harness.sql`UPDATE fields SET description = left(description, length(description) - length(' (edited)')) WHERE symbol = 'projektstopp_code'`;
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await archiveCounts()).toEqual({ equations: 0, fields: 0 });
  });

  it('e. the read-back file runs before and after an apply and shows the expected values', async () => {
    const text = readFileSync(READBACK, 'utf8');
    const stmts = splitOnUnquotedSemicolons(text).filter((s) => s.trim());
    expect(stmts).toHaveLength(3);
    expect(text.split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(3);
    const run = async (list: string[]) => { const out: unknown[][] = []; for (const st of list) out.push([...(await harness.sql.unsafe(st))]); return out; };
    const pre = await run(stmts.slice(0, 2));
    log('read-back (before)', pre);
    expect(pre[0]).toEqual([{ equation_number: 'M8203-24-D1', formula_state: 'old', n_inputs: 67, first_input: 'pz_52_1_status', output_symbol: 'projektstopp_code', clause_reference: '§3', pt_reaches_24: false, pt_list: 'block19', hint_new: false }]);
    await runFile(MIGRATION);
    const post = await run(stmts);
    log('read-back (after)', post);
    expect(post[0]).toEqual([{ equation_number: 'M8203-24-D1', formula_state: 'new', n_inputs: 68, first_input: 'project_type', output_symbol: 'projektstopp_code', clause_reference: '§3', pt_reaches_24: true, pt_list: 'block19+M8203-24', hint_new: true }]);
    expect((post[1] as Array<{ project: string }>).length).toBe(8); // every case project with a project_type
    expect(post[2]).toEqual([{ equation_archive: '1', field_archive: '2' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('f. AFTER: the code computes for gesamtsystem / einzelprojekt / both with the hand values; REQ-31 decides; summary sheets compute on their path', async () => {
    await runFile(MIGRATION);
    const after = {
      c2: { a: await codeA(P.c2), totalA: await totalA(P.c2), code: await code24(P.c2) },
      c1: { b: await codeB(P.c1), totalB: await totalB(P.c1), code: await code24(P.c1) },
      c1live: { a: await codeA(P.c1live), b: await codeB(P.c1live), code: await code24(P.c1live) },
      both: { a: await codeA(P.both), b: await codeB(P.both), code: await code24(P.both) },
      bothOk: await code24(P.bothOk),
      bothHalf: await code24(P.bothHalf),
      gOk: await code24(P.gOk),
      eStale: await code24(P.eStale),
      noType: await code24(P.noType),
    };
    log('AFTER', after);
    // C2 (Gesamtsystem): code = code_a = 1 (pz_52_1 teilweise_erreicht); Anhang A total 15 + 8 + 12 + 3 = 38
    expect(after.c2).toEqual({ a: { kind: 'computed', value: 1 }, totalA: { kind: 'computed', value: 38 }, code: { kind: 'computed', value: 1 } });
    // C1 (Einzelprojekt): code = code_b = 1 (pz_62_3 teilweise_erreicht); Anhang B total 15 + 21 + 19 + 17 + 33 + 34 + 10 + 6 = 155
    expect(after.c1).toEqual({ b: { kind: 'computed', value: 1 }, totalB: { kind: 'computed', value: 155 }, code: { kind: 'computed', value: 1 } });
    expect(after.c1live).toEqual({ a: { kind: 'computed', value: 0 }, b: { kind: 'computed', value: 1 }, code: { kind: 'computed', value: 1 } });
    // both: all 67 as before
    expect(after.both).toEqual({ a: { kind: 'computed', value: 1 }, b: { kind: 'computed', value: 1 }, code: { kind: 'computed', value: 1 } });
    expect(after.bothOk).toEqual({ kind: 'computed', value: 0 });
    expect(after.bothHalf).toMatchObject({ kind: 'not_computed', missing: 54 });
    expect(after.gOk).toEqual({ kind: 'computed', value: 0 });
    // PS-1: a stored status on the other path's hidden sheets is not read
    expect(after.eStale).toEqual({ kind: 'computed', value: 0 });
    // PS-2: no project_type → not computed (never a silent 0); the stale stored 0 of the BEFORE run is not overwritten
    expect(after.noType).toMatchObject({ kind: 'not_computed', missing: 1, firstMissing: ['project_type'] });

    // REQ-31 (warn) decides on both single-path projects: code 1 + review not triggered → fail; review triggered → pass
    const r31 = { c2: await req31(P.c2), c1: await req31(P.c1) };
    log('AFTER: REQ-31 (review_triggered = false)', r31);
    expect(r31).toEqual({ c2: { kind: 'fail' }, c1: { kind: 'fail' } });
    await put(P.c2, { projektstopp_review_triggered: bo(true) });
    await put(P.c1, { projektstopp_review_triggered: bo(true) });
    const r31b = { c2: await req31(P.c2), c1: await req31(P.c1) };
    log('AFTER: REQ-31 (review_triggered = true)', r31b);
    expect(r31b).toEqual({ c2: { kind: 'pass' }, c1: { kind: 'pass' } });

    // the path summary sheets stay on their path (block 19, unchanged here): Anhang B / code_b do not compute for C2 (nothing answered)
    expect(await codeB(P.c2)).toMatchObject({ kind: 'not_computed', missing: 54 });
    expect(await codeA(P.c1)).toMatchObject({ kind: 'not_computed', missing: 13 });
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('g. order: after the hint block (which rewrites both hints unconditionally) and before any rollback of block 19', async () => {
    await runFile(MIGRATION);
    const normal = await dump();
    // hints applied AFTER this block: the formula stays, the two hints fall back to the hint-wave text (the reason for the order)
    await runFile(ROLLBACK);
    await runFile(HINTS_ROLLBACK);
    await runFile(MIGRATION);
    await runFile(HINTS_MIGRATION);
    const wrong = dumpDiff(normal, await dump());
    log('WRONG ORDER (hints after this block): rows differing from the normal order', wrong.map((l) => l.slice(0, 90)));
    expect(wrong.length).toBe(4); // equations ±1 (description), fields ±1 (projektstopp_code description)
    expect(await d1State()).toEqual({ formula: NEW_F, inputs: NEW_IN, n: 68, first: 'project_type' });
    // recover: hints back, this block's rollback (formula restored; hint text is the hint wave's, archive rows deleted as equal), hints on
    await runFile(HINTS_ROLLBACK);
    await runFile(ROLLBACK);
    await runFile(HINTS_MIGRATION);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await archiveCounts()).toEqual({ equations: 0, fields: 0 });
    // LAST (destructive for the seed, so it runs at the end): block 19 rolled back while this block is applied leaves project_type
    // alone (its guard needs its own 17-sheet list) → this block's rollback must run first; run in that order project_type returns
    // to block 19's list and block 19's rollback can then restore it
    await runFile(MIGRATION);
    await runFile(BLOCK19_ROLLBACK);
    const ptCw = async () => (await harness.sql<{ cw: string[] }[]>`SELECT f.consumer_worksheets AS cw FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = 'M8203-01' AND f.symbol = 'project_type'`)[0].cw;
    const wrong19 = await ptCw();
    log('WRONG ORDER (block 19 rolled back first): project_type consumer list', wrong19);
    expect(wrong19).toHaveLength(18);
    await runFile(ROLLBACK);
    expect(await ptCw()).toHaveLength(17);
    await runFile(BLOCK19_ROLLBACK);
    const right19 = await ptCw();
    log('RIGHT ORDER (this rollback, then block 19 rollback): project_type consumer list', right19);
    expect(right19).toEqual(['ALL']);
  });
});
