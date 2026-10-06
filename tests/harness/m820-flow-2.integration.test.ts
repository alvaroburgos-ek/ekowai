/**
 * M820 flow block 2 — order and home rulings — embedded-Postgres proof of the staged block
 *   scripts/migrations/20261006200000_m820_flow_2.sql
 *   scripts/rollback-20261006200000-m820-flow-2.sql
 *   scripts/verification/apply/readback-20261006200000-m820-flow-2.sql
 * (requirements: vault 01-Projects/ekowai-wizard/m820-wizard-test/_briefs/flow-2-3-brief.md "Block 2" items 1–3, owner ruling
 *  2026-10-06; evidence 33_FLOW-AUDIT 1-a1 / 3-a1 / 2-a2; apply order 36_APPLY-ORDER-m820-flow-2.md; sign-off 38_SIGN-OFF-m820-flow-2-3.md).
 *
 * Disposable embedded Postgres only (embedded-pg.ts, schema from the Drizzle model) — no prod, no .env.local.
 * Auth seam: BYPASS_AUTH + BYPASS_AUTH_USER_ID, so the REAL saveWorksheet and the REAL checkApprovalGate run. The form's gate panel
 * is reproduced with the form's own pieces: own + inherited fields (loadInheritedFields), makeSymbolLookup, evaluateCondition.
 *
 * SEED: the three 2026-10-05 dumps + consumer_worksheets from m820_{1,2,3}.prior.json (as in the other m820 harnesses), then the
 * six applied blocks (= prod 2026-10-06), then the two STAGED blocks this one builds on — REQ-05 home (20261006180000) and flow
 * block 1 (20261006190000) — i.e. the harness ASSUMES both applied (brief). Case h proves order independence: block 2 applied on the
 * prod state without them and then them on top gives the same tables. worksheet_templates.phase is not in the dumps; it is set from
 * the live values (read-only prod check 2026-10-06) — LIVE_PHASE below. "Rollback byte-equal" is measured against the seeded state.
 * ROWS: synthetic (no client data).
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startHarness, type Harness } from './embedded-pg';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { loadInheritedFields as LoadInheritedFields } from '@/lib/db/queries/worksheet';
import type { recomputeWorksheetEquations as RecomputeWorksheetEquations } from '@/lib/actions/recompute-worksheet';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import { makeSymbolLookup, type LookupValue } from '@/lib/compliance/symbol-lookup';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008f8';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261006200000_m820_flow_2.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006200000-m820-flow-2.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261006200000-m820-flow-2.sql');
const REQ05_MIGRATION = resolve(ROOT, 'scripts/migrations/20261006180000_m820_1_req05_home.sql');
const REQ05_ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006180000-m820-1-req05-home.sql');
const FLOW1_MIGRATION = resolve(ROOT, 'scripts/migrations/20261006190000_m820_flow_1.sql');
const FLOW1_ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006190000-m820-flow-1.sql');
const PRIOR_BLOCKS = [
  'scripts/migrations/20261005193000_m820_1_client_route.sql',
  'scripts/migrations/20261005200000_m820_2_registers.sql',
  'scripts/migrations/20261006100000_m820_2_structure.sql',
  'scripts/migrations/20261006120000_m820_3_structure.sql',
  'scripts/migrations/20261006160000_m820_followup_1.sql',
  'scripts/migrations/20261006170000_m820_1_risk_changes.sql',
].map((p) => resolve(ROOT, p));
/** worksheet_templates.phase per sheet number (live 2026-10-06, read-only prod check). */
const LIVE_PHASE: Record<string, Array<[number, number, number]>> = {
  'DWA-M-820-1': [[1, 3, 1], [4, 9, 2], [10, 15, 3], [16, 20, 4], [21, 23, 5], [24, 25, 6]],
  'DWA-M-820-2': [[1, 4, 1], [5, 10, 2], [11, 15, 3], [16, 19, 4], [20, 24, 5], [25, 28, 6]],
  'DWA-M-820-3': [[1, 3, 1], [4, 6, 2], [7, 10, 3], [11, 18, 4], [19, 21, 5], [22, 24, 6]],
};
const GATE_MD5: Record<string, string> = {
  'REQ-10': '179cbd016843c9a978922a1f8938031b', 'REQ-10-2': 'de928cafb161348fce101a8a0f0e27f7', 'REQ-10-3': '90526a541774bb75a5e4ff117cb83866',
  'REQ-11': 'c90bc125c86d72d2981080223b487aa9', 'REQ-11-2': '98b5acb5860fd369d7212a0faba82a04', 'REQ-11-3': '2b5c3fd599db7e1d751010aad78e4a36',
};
const log = (label: string, v: unknown) => console.log(`[M820 FLOW 2] ${label}: ${JSON.stringify(v)}`);
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
async function archiveCounts(): Promise<{ templates: number | null; fields: number | null; gates: number | null }> {
  const one = async (t: string) => {
    const [r] = await harness.sql<{ t: string | null }[]>`SELECT to_regclass(${'public.' + t})::text AS t`;
    if (!r.t) return null;
    const [c] = await harness.sql.unsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${t}`);
    return c.n;
  };
  return { templates: await one('worksheet_templates_archive_m820_flow_2'), fields: await one('fields_archive_m820_flow_2'), gates: await one('compliance_requirements_archive_m820_flow_2') };
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

/** Sheets of a standard in sidebar order (phase, then order_index — worksheet-list-sidebar.tsx / standards.ts). */
async function sheetOrder(std: string): Promise<string[]> {
  const r = await harness.sql<{ code: string }[]>`SELECT w.code FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
    WHERE s.code = ${std} ORDER BY w.phase NULLS LAST, w.order_index, w.code`;
  return r.map((x) => x.code);
}
/**
 * P2 / P3 scan in sidebar order: consumer entries pointing to an EARLIER sheet, and gates reading a field whose home is a LATER
 * sheet (token match on the condition, same standard, active fields; local fields excluded).
 */
async function backwardScan(): Promise<string[]> {
  const rows = await harness.sql.unsafe<{ k: string }[]>(`
    WITH pos AS (SELECT w.id, w.code, s.code AS std, row_number() OVER (PARTITION BY s.id ORDER BY w.phase NULLS LAST, w.order_index, w.code) AS p
                   FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code LIKE 'DWA-M-820%')
    SELECT 'consumer ' || h.code || ':' || f.symbol || ' -> ' || c.code AS k
      FROM fields f JOIN pos h ON h.id = f.worksheet_template_id CROSS JOIN LATERAL unnest(f.consumer_worksheets) AS cw(code)
      JOIN pos c ON c.code = cw.code AND c.std = h.std
     WHERE f.active AND c.p < h.p
    UNION ALL
    SELECT DISTINCT 'gate ' || g.code || ':' || cr.code || ' reads ' || h.code || ':' || f.symbol
      FROM compliance_requirements cr JOIN pos g ON g.id = cr.worksheet_template_id
      JOIN fields f ON f.active AND cr.condition ~ ('\\m' || f.symbol || '\\M')
      JOIN pos h ON h.id = f.worksheet_template_id AND h.std = g.std
     WHERE h.p > g.p
       AND NOT EXISTS (SELECT 1 FROM fields l WHERE l.worksheet_template_id = cr.worksheet_template_id AND l.symbol = f.symbol AND l.active)
    ORDER BY 1`);
  return rows.map((r) => r.k);
}
async function gatesOn(ws: string): Promise<string[]> {
  const r = await harness.sql<{ g: string }[]>`SELECT cr.code || '/' || cr.severity AS g FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
    WHERE w.code = ${ws} ORDER BY cr.code`;
  return r.map((x) => x.g);
}
async function ownSymbols(ws: string, prefix: string): Promise<string[]> {
  const r = await harness.sql<{ s: string }[]>`SELECT f.symbol || '@' || sc.code AS s FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
    JOIN worksheet_sections sc ON sc.id = f.section_id WHERE w.code = ${ws} AND f.active AND f.symbol LIKE ${prefix + '%'} ORDER BY f.symbol`;
  return r.map((x) => x.s);
}
async function allState(): Promise<string> {
  const d = await dump();
  return JSON.stringify(TOUCHED.map((t) => [...d[t]].sort()));
}
const R10 = ['REQ-10', 'REQ-10-2', 'REQ-10-3'];
const R11 = ['REQ-11', 'REQ-11-2', 'REQ-11-3'];
const PZ63 = Array.from({ length: 8 }, (_, i) => `pz_63_${i + 1}_status`);
const PZ64 = Array.from({ length: 12 }, (_, i) => `pz_64_${i + 1}_status`);
const statuses = (syms: string[], first: string, rest: string): Record<string, V> => Object.fromEntries(syms.map((s, i) => [s, e(i === 0 ? first : rest)]));
const ORDER_1_BEFORE = [...seq('M820-', 1, 25)];
const ORDER_1_AFTER = [...seq('M820-', 1, 10), 'M820-16', ...seq('M820-', 11, 15), ...seq('M820-', 17, 25)];
const ORDER_2_BEFORE = [...seq('820-2-', 1, 28)];
const ORDER_2_AFTER = [...seq('820-2-', 1, 14), '820-2-16', '820-2-15', ...seq('820-2-', 17, 28)];

let PRE: TableDump;
let SCAN_PRE: string[];
let ein: Proj; // 820-3 project path (einzelprojekt): § 6.3 rated on -12 (one goal partially met), § 6.4 rated on -14 (all met)
let ges: Proj; // 820-3 whole-system path (gesamtsystem): nothing rated
let ein63Before: unknown; let ges63Before: unknown; let ein64Before: unknown;

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-flow-2@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820 flow 2 harness', ${'m820-flow2-' + Date.now()}) RETURNING id`;
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
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadInheritedFields } = await import('@/lib/db/queries/worksheet'));
  ({ recomputeWorksheetEquations: recompute } = await import('@/lib/actions/recompute-worksheet'));
}, 300_000);

afterAll(async () => {
  await harness?.stop();
});

describe('M820 flow block 2 — staged block on embedded Postgres (seed = prod 2026-10-06 + REQ-05 block + flow block 1)', () => {
  it('a. pre-state = the live guards; BROKEN BEFORE: M820-16 after the criteria sheets, the § 6.3 / § 6.4 goals on the part-1 sheets, 820-2-15 before -16', async () => {
    expect(await archiveCounts()).toEqual({ templates: null, fields: null, gates: null });
    // order_index from the dumps = the live order; phase = LIVE_PHASE
    const tp = await harness.sql<{ code: string; phase: number; order_index: number }[]>`SELECT w.code, w.phase, w.order_index FROM worksheet_templates w
      WHERE w.code IN ('M820-11','M820-12','M820-13','M820-14','M820-15','M820-16','820-2-15','820-2-16') ORDER BY w.code`;
    log('templates pre-state', tp.map((x) => `${x.code} ${x.phase}/${x.order_index}`));
    expect(tp.map((x) => `${x.code} ${x.phase}/${x.order_index}`)).toEqual(['820-2-15 3/15', '820-2-16 4/16', 'M820-11 3/11', 'M820-12 3/12', 'M820-13 3/13', 'M820-14 3/14', 'M820-15 3/15', 'M820-16 4/16']);
    expect(await sheetOrder('DWA-M-820-1')).toEqual(ORDER_1_BEFORE);
    expect(await sheetOrder('DWA-M-820-2')).toEqual(ORDER_2_BEFORE);
    // the guarded gates and fields
    const g = await harness.sql<{ code: string; ws: string; severity: string; condition: string }[]>`
      SELECT cr.code, w.code AS ws, cr.severity, cr.condition FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
       WHERE cr.code IN ('REQ-10','REQ-10-2','REQ-10-3','REQ-11','REQ-11-2','REQ-11-3') AND w.code LIKE 'M8203-%' ORDER BY 1`;
    log('gates pre-state', g.map((x) => `${x.code}@${x.ws}/${x.severity}/${md5(x.condition)}`));
    for (const x of g) expect([x.ws, md5(x.condition)]).toEqual([x.code.startsWith('REQ-10') ? 'M8203-12' : 'M8203-14', GATE_MD5[x.code]]);
    expect(g).toHaveLength(6);
    expect(await ownSymbols('M8203-12', 'pz_')).toEqual([...PZ63, 'pz_63_projektstopp_risikoanalyse'].sort().map((s) => `${s}@B`));
    expect(await ownSymbols('M8203-14', 'pz_')).toEqual([...PZ64, 'pz_64_projektstopp_risikoanalyse'].sort().map((s) => `${s}@B`));
    expect(await ownSymbols('M8203-13', 'pz_')).toEqual([]);
    expect(await ownSymbols('M8203-15', 'pz_')).toEqual([]);
    const sb = await harness.sql<{ ws: string; vw: string | null; n: number }[]>`SELECT w.code AS ws, sc.visible_when AS vw,
      (SELECT count(*)::int FROM fields f WHERE f.section_id = sc.id AND f.active) AS n FROM worksheet_sections sc JOIN worksheet_templates w ON w.id = sc.worksheet_template_id
      WHERE w.code IN ('M8203-12','M8203-13','M8203-14','M8203-15') AND sc.code = 'B' ORDER BY 1`;
    log('section B of -12 … -15', sb);
    expect(new Set(sb.map((x) => x.vw)).size).toBe(1);
    expect(sb.map((x) => x.n)).toEqual([9, 0, 13, 0]);

    // BROKEN BEFORE (3-a1): the project path rates § 6.3 on the part-1 sheet; part 1 (Vorplanung) cannot be approved until the whole
    // phase (incl. Entwurf / Genehmigungsplanung on -13) is rated
    ein = await makeProject('flow2-einzelprojekt');
    ges = await makeProject('flow2-gesamtsystem');
    await save(ein, 'M8203-01', { project_type: e('einzelprojekt') });
    await save(ges, 'M8203-01', { project_type: e('gesamtsystem') });
    const a12empty = await approval(ein, 'M8203-12');
    log('BEFORE: checkApprovalGate(M8203-12), project path, nothing rated', a12empty);
    expect(a12empty.pending).toEqual(expect.arrayContaining(['REQ-10']));
    expect(a12empty.missing).toEqual(expect.arrayContaining(PZ63));
    await save(ein, 'M8203-12', statuses(PZ63, 'teilweise_erreicht', 'erreicht'));
    await save(ein, 'M8203-14', statuses(PZ64, 'erreicht', 'erreicht'));
    ein63Before = { panel: pick(await panel(ein, 'M8203-12'), R10), approval: await approval(ein, 'M8203-12') };
    ein64Before = { panel: pick(await panel(ein, 'M8203-14'), R11), approval: await approval(ein, 'M8203-14') };
    ges63Before = { panel: pick(await panel(ges, 'M8203-12'), R10), approval: await approval(ges, 'M8203-12') };
    log('BEFORE: § 6.3 on M8203-12 (one goal partially met) / § 6.4 on M8203-14 / whole-system path on M8203-12', { ein63Before, ein64Before, ges63Before });

    SCAN_PRE = await backwardScan();
    log('P2/P3 backward scan (pre)', SCAN_PRE);
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: 8 sheet-order rows, 22 fields, 6 gates; archives 8 / 22 / 6; only these rows change; project values untouched', async () => {
    const ppBefore = await projectParams();
    await runFile(MIGRATION);
    expect(await archiveCounts()).toEqual({ templates: 8, fields: 22, gates: 6 });
    const diff = dumpDiff(PRE, await dump());
    const kinds = diff.map((l) => l.split(' ').slice(0, 2).join(' '));
    const tally = Object.fromEntries([...new Set(kinds)].map((k) => [k, kinds.filter((x) => x === k).length]));
    log('apply diff (table / sign counts)', tally);
    expect(tally).toEqual({ 'worksheet_templates -': 8, 'worksheet_templates +': 8, 'fields -': 22, 'fields +': 22, 'compliance_requirements -': 6, 'compliance_requirements +': 6 });
    expect(await projectParams()).toEqual(ppBefore);
    expect(await sheetOrder('DWA-M-820-1')).toEqual(ORDER_1_AFTER);
    expect(await sheetOrder('DWA-M-820-2')).toEqual(ORDER_2_AFTER);
    const tp = await harness.sql<{ code: string; phase: number; order_index: number }[]>`SELECT w.code, w.phase, w.order_index FROM worksheet_templates w
      WHERE w.code IN ('M820-11','M820-12','M820-13','M820-14','M820-15','M820-16','820-2-15','820-2-16') ORDER BY w.code`;
    log('templates after apply', tp.map((x) => `${x.code} ${x.phase}/${x.order_index}`));
    expect(tp.map((x) => `${x.code} ${x.phase}/${x.order_index}`)).toEqual(['820-2-15 3/16', '820-2-16 3/15', 'M820-11 3/12', 'M820-12 3/13', 'M820-13 3/14', 'M820-14 3/15', 'M820-15 3/16', 'M820-16 3/11']);
    expect(await ownSymbols('M8203-13', 'pz_')).toEqual([...PZ63, 'pz_63_projektstopp_risikoanalyse'].sort().map((s) => `${s}@B`));
    expect(await ownSymbols('M8203-15', 'pz_')).toEqual([...PZ64, 'pz_64_projektstopp_risikoanalyse'].sort().map((s) => `${s}@B`));
    expect(await ownSymbols('M8203-12', 'pz_')).toEqual([]);
    expect(await ownSymbols('M8203-14', 'pz_')).toEqual([]);
    const cw = await harness.sql<{ symbol: string; cw: string | null }[]>`SELECT f.symbol, array_to_string(f.consumer_worksheets, ',') AS cw FROM fields f
      WHERE f.symbol LIKE 'pz_63_%' OR f.symbol LIKE 'pz_64_%' ORDER BY 1`;
    for (const r of cw) expect(r.cw, r.symbol).toBe(r.symbol.endsWith('_status') ? 'M8203-23,M8203-24' : null);
    const preG = new Map(PRE.compliance_requirements.map((x) => JSON.parse(x) as { id: string; title_de: string; severity: string; condition: string; clause_reference: string | null; description: string | null }).map((x) => [x.id, x]));
    const g = await harness.sql<{ id: string; code: string; ws: string; title_de: string; severity: string; condition: string; clause_reference: string | null; description: string }[]>`
      SELECT cr.id, cr.code, w.code AS ws, cr.title_de, cr.severity, cr.condition, cr.clause_reference, cr.description FROM compliance_requirements cr
        JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE cr.code IN ('REQ-10','REQ-10-2','REQ-10-3','REQ-11','REQ-11-2','REQ-11-3') AND w.code LIKE 'M8203-%' ORDER BY 2`;
    log('gates after apply', g.map((x) => `${x.code}@${x.ws}/${x.severity}`));
    for (const x of g) {
      const p = preG.get(x.id)!;
      expect(x.ws).toBe(x.code.startsWith('REQ-10') ? 'M8203-13' : 'M8203-15');
      expect([x.title_de, x.severity, x.condition, x.clause_reference]).toEqual([p.title_de, p.severity, p.condition, p.clause_reference]);
      expect(x.description.startsWith(`${p.description ?? ''}\n[Flow 2, 2026-10-06] Blatt / sheet ${x.ws}`)).toBe(true);
    }
  });

  it('c. apply again: 0 changes (full dump compare), archives unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    expect(dumpDiff(before, await dump())).toEqual([]);
    expect(await archiveCounts()).toEqual({ templates: 8, fields: 22, gates: 6 });
  });

  it('d. rollback: byte-equal to the pre-state, archives emptied; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    const diff = dumpDiff(PRE, after);
    log('rollback diff vs pre', diff);
    log('rollback digest', digest(after));
    expect(diff).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await archiveCounts()).toEqual({ templates: 0, fields: 0, gates: 0 });
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await archiveCounts()).toEqual({ templates: 0, fields: 0, gates: 0 });
  });

  it('d2. a group edited after the apply is left alone by the rollback (all-or-nothing per group, never a half move)', async () => {
    await runFile(MIGRATION);
    // someone edits one moved § 6.4 field and the 820-2 order after the apply
    await harness.sql`UPDATE fields SET consumer_worksheets = ARRAY['M8203-24'] WHERE symbol = 'pz_64_1_status'`;
    await harness.sql`UPDATE worksheet_templates SET order_index = 17 WHERE code = '820-2-16'`;
    await runFile(ROLLBACK);
    const r = { s64: (await ownSymbols('M8203-15', 'pz_')).filter((x) => x.startsWith('pz_64_1_status')), s63: (await ownSymbols('M8203-12', 'pz_')).filter((x) => x.startsWith('pz_63_1_status')), o1: await sheetOrder('DWA-M-820-1'), a: await archiveCounts() };
    log('rollback with an edited § 6.4 family and an edited 820-2 order', r);
    expect(r.s64).toEqual(['pz_64_1_status@B']); // § 6.4 family stays on -15 (edited)
    expect(r.s63).toEqual(['pz_63_1_status@B']); // § 6.3 family restored to -12
    expect(r.o1).toEqual(ORDER_1_BEFORE); // 820-1 order restored
    expect(r.a).toEqual({ templates: 2, fields: 13, gates: 3 }); // 820-2 (2 rows) and § 6.4 (13 + 3) kept
    // repair the edits, then the rollback finishes the rest
    await harness.sql`UPDATE fields SET consumer_worksheets = ARRAY['M8203-23','M8203-24'] WHERE symbol = 'pz_64_1_status'`;
    await harness.sql`UPDATE worksheet_templates SET order_index = 15 WHERE code = '820-2-16'`;
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await archiveCounts()).toEqual({ templates: 0, fields: 0, gates: 0 });
  });

  it('e. the read-back file runs before and after an apply and shows the expected values', async () => {
    const text = readFileSync(READBACK, 'utf8');
    const stmts = splitOnUnquotedSemicolons(text).filter((s) => s.trim());
    expect(stmts).toHaveLength(5);
    expect(text.split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(5);
    const run = async (list: string[]) => { const out: unknown[][] = []; for (const st of list) out.push([...(await harness.sql.unsafe(st))]); return out; };
    const pre = await run(stmts.slice(0, 2));
    log('read-back R0..R4 (before)', pre);
    expect(pre[0]).toEqual([
      { std: 'DWA-M-820-1', old_match: '6', new_match: '0', found: '6' },
      { std: 'DWA-M-820-2', old_match: '2', new_match: '0', found: '2' },
    ]);
    expect(pre[1]).toEqual([
      { fam: '63', ws: 'M8203-12', fields: '9', gates: '3', live_ok: true, saved_values: '8' },
      { fam: '64', ws: 'M8203-14', fields: '13', gates: '3', live_ok: true, saved_values: '12' },
    ]);
    await runFile(MIGRATION);
    const post = await run(stmts);
    log('read-back R0..R4 (after)', post);
    expect(post[0]).toEqual([
      { std: 'DWA-M-820-1', old_match: '0', new_match: '6', found: '6' },
      { std: 'DWA-M-820-2', old_match: '0', new_match: '2', found: '2' },
    ]);
    expect(post[2]).toEqual([
      { fam: '63', ws: 'M8203-13', fields: '9', gates: '3', note_ok: '3', cw_ok: '9', saved_values: '8' },
      { fam: '64', ws: 'M8203-15', fields: '13', gates: '3', note_ok: '3', cw_ok: '13', saved_values: '12' },
    ]);
    expect(post[3]).toEqual([{ template_archive: '8', field_archive: '22', gate_archive: '6' }]);
    expect((post[4] as Array<{ code: string }>).map((r) => r.code)).toEqual(ORDER_1_AFTER.concat(ORDER_2_AFTER));
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('f. item 2 after the apply: the goals and REQ-10 / -11 families decide on -13 / -15 exactly as before on -12 / -14; part-1 sheets no longer held; values moved with the field ids', async () => {
    await runFile(MIGRATION);
    const ein63After = { panel: pick(await panel(ein, 'M8203-13'), R10), approval: await approval(ein, 'M8203-13') };
    const ein64After = { panel: pick(await panel(ein, 'M8203-15'), R11), approval: await approval(ein, 'M8203-15') };
    const ges63After = { panel: pick(await panel(ges, 'M8203-13'), R10), approval: await approval(ges, 'M8203-13') };
    log('AFTER: § 6.3 on M8203-13 / § 6.4 on M8203-15 / whole-system path on M8203-13', { ein63After, ein64After, ges63After });
    // the phase-goal verdicts are the same verdicts, on the sheet that closes the phase (the -13/-15 own required fields add to `missing`)
    const strip = (x: unknown) => { const o = x as { panel: unknown; approval: { failing: string[]; pending: string[] } }; return { panel: o.panel, failing: o.approval.failing.filter((c) => /^REQ-1[01]/.test(c)), pending: o.approval.pending.filter((c) => /^REQ-1[01]/.test(c)) }; };
    expect(strip(ein63After)).toEqual(strip(ein63Before));
    expect(strip(ein64After)).toEqual(strip(ein64Before));
    expect(strip(ges63After)).toEqual(strip(ges63Before));
    // one goal partially met → REQ-10-2 (block) asks for the Projektstopp review; answered on -13 through the real save path
    expect((ein63After.panel as Record<string, { kind: string; missing?: string[] }>)['REQ-10-2/block']).toEqual({ kind: 'pending', missing: ['pz_63_projektstopp_risikoanalyse'] });
    await save(ein, 'M8203-13', { pz_63_projektstopp_risikoanalyse: b(true) });
    const fixed = pick(await panel(ein, 'M8203-13'), R10);
    log('AFTER: Projektstopp review answered on M8203-13', fixed);
    expect(fixed['REQ-10-2/block'].kind).toBe('pass');
    expect(fixed['REQ-10/block'].kind).toBe('pass');
    // the part-1 sheets no longer carry the phase checks nor the goal questions
    const a12 = await approval(ein, 'M8203-12');
    const a14 = await approval(ein, 'M8203-14');
    log('AFTER: checkApprovalGate(M8203-12 / -14), project path', { a12, a14 });
    for (const a of [a12, a14]) {
      expect([...a.failing, ...a.pending].filter((c) => /^REQ-1[01]/.test(c))).toEqual([]);
      expect(a.missing.filter((s) => s.startsWith('pz_'))).toEqual([]);
    }
    expect(await gatesOn('M8203-12')).not.toContain('REQ-10/block');
    expect(await gatesOn('M8203-13')).toEqual(expect.arrayContaining(['REQ-10/block', 'REQ-10-2/block', 'REQ-10-3/warn']));
    expect(await gatesOn('M8203-15')).toEqual(expect.arrayContaining(['REQ-11/block', 'REQ-11-2/block', 'REQ-11-3/warn']));
    // the summaries still receive the statuses; -13 / -15 no longer "inherit" their own questions
    const i23 = await inheritedSymbols('M8203-23');
    const i24 = await inheritedSymbols('M8203-24');
    for (const s of PZ63) { expect(i23).toContain(`M8203-13:${s}`); expect(i24).toContain(`M8203-13:${s}`); }
    for (const s of PZ64) { expect(i23).toContain(`M8203-15:${s}`); expect(i24).toContain(`M8203-15:${s}`); }
    expect((await inheritedSymbols('M8203-13')).filter((s) => s.includes('pz_63'))).toEqual([]);
    expect((await inheritedSymbols('M8203-15')).filter((s) => s.includes('pz_64'))).toEqual([]);
    const [cnt] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM project_parameters pp JOIN fields f ON f.id = pp.field_id WHERE f.symbol LIKE 'pz_63_%' OR f.symbol LIKE 'pz_64_%'`;
    expect(cnt.n).toBe(8 + 12 + 1);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('g. items 1 / 3 after the apply: M820-16 works in its new slot; nothing became backward (P2 / P3 scan unchanged)', async () => {
    await runFile(MIGRATION);
    const p = await makeProject('flow2-commission');
    await save(p, 'M820-10', { procurement_procedure: e('vgv_f') });
    await save(p, 'M820-16', { bewertungskommission_size: n(1) });
    const one = pick(await panel(p, 'M820-16'), ['REQ-09']);
    await save(p, 'M820-16', { bewertungskommission_size: n(3) });
    const three = pick(await panel(p, 'M820-16'), ['REQ-09']);
    const inh16 = await inheritedSymbols('M820-16');
    log('item 1 AFTER: REQ-09 on M820-16 (procurement_procedure from M820-10), inherited on M820-16', { one, three, inh16 });
    expect(one).toEqual({ 'REQ-09/block': { kind: 'fail' } });
    expect(three).toEqual({ 'REQ-09/block': { kind: 'pass' } });
    expect(inh16).toEqual(expect.arrayContaining(['M820-10:procurement_procedure', 'M820-03:stakeholder_list']));
    const scan = await backwardScan();
    log('P2/P3 backward scan (after)', scan);
    expect(scan).toEqual(SCAN_PRE);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('h. order independence: block 2 on the prod state, then REQ-05 + flow 1 on top = the seeded order; rollbacks in reverse → the prod state', async () => {
    await runFile(MIGRATION);
    const normal = await allState();
    await runFile(ROLLBACK);
    await runFile(FLOW1_ROLLBACK);
    await runFile(REQ05_ROLLBACK);
    const prod = await dump();
    await runFile(MIGRATION); // block 2 first, on the prod state
    expect(await archiveCounts()).toEqual({ templates: 8, fields: 22, gates: 6 });
    await runFile(REQ05_MIGRATION);
    await runFile(FLOW1_MIGRATION);
    const swapped = await allState();
    log('order independence: same tables either order', { equal: swapped === normal });
    expect(swapped).toBe(normal);
    await runFile(FLOW1_ROLLBACK);
    await runFile(REQ05_ROLLBACK);
    await runFile(ROLLBACK);
    expect(dumpDiff(prod, await dump())).toEqual([]);
    await runFile(REQ05_MIGRATION);
    await runFile(FLOW1_MIGRATION);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });
});
