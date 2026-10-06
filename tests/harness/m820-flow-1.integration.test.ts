/**
 * M820 flow block 1 — structure-settled order fixes — embedded-Postgres proof of the staged block
 *   scripts/migrations/20261006190000_m820_flow_1.sql
 *   scripts/rollback-20261006190000-m820-flow-1.sql
 *   scripts/verification/apply/readback-20261006190000-m820-flow-1.sql
 * (requirements: vault 01-Projects/ekowai-wizard/m820-wizard-test/33_FLOW-AUDIT-m820-sheet-order_2026-10-06.md § 6 block 1, items 1–6;
 *  apply order: 34_APPLY-ORDER-m820-flow-1.md; sign-off: 35_SIGN-OFF-m820-flow-1.md).
 *
 * Disposable embedded Postgres only (embedded-pg.ts, schema from the Drizzle model) — no prod, no .env.local.
 * Auth seam: BYPASS_AUTH + BYPASS_AUTH_USER_ID, so the REAL saveWorksheet, the REAL recomputeWorksheetEquations and the REAL
 * checkApprovalGate run. The form's gate panel is reproduced with the form's own pieces: own + inherited fields (loadInheritedFields),
 * makeSymbolLookup, evaluateCondition (= ComplianceBlock).
 *
 * SEED (pre-state = prod 2026-10-06, read-only check): the three 2026-10-05 dumps (tests/harness/m820-1-client-route.dump.json,
 * m820-2-registers.dump.json, m820-3-structure.dump.json), consumer_worksheets from src/lib/eval/field-configs/m820_{1,2,3}.prior.json
 * (as in the other m820 harnesses), then the six applied blocks in apply order: 15 (20261005193000), 16 (20261005200000),
 * 17 (20261006100000), 19 (20261006120000), follow-up 1 (20261006160000), risk changes (20261006170000). The REQ-05 block
 * (20261006180000) is staged, not applied — case h proves the two blocks commute. "Rollback byte-equal" is measured against that state.
 * ROWS: synthetic (no client data); 820-1 private-client case = the Forscheln state of 21_Fill-Run_M820-1 (privat_ohne_foerderung,
 * voluntary answer blank, threshold 214 000 €) with a synthetic fee.
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
const USER_ID = '00000000-0000-4000-8000-0000000008f7';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261006190000_m820_flow_1.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006190000-m820-flow-1.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261006190000-m820-flow-1.sql');
const REQ05_MIGRATION = resolve(ROOT, 'scripts/migrations/20261006180000_m820_1_req05_home.sql');
const REQ05_ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006180000-m820-1-req05-home.sql');
const PRIOR_BLOCKS = [
  'scripts/migrations/20261005193000_m820_1_client_route.sql',
  'scripts/migrations/20261005200000_m820_2_registers.sql',
  'scripts/migrations/20261006100000_m820_2_structure.sql',
  'scripts/migrations/20261006120000_m820_3_structure.sql',
  'scripts/migrations/20261006160000_m820_followup_1.sql',
  'scripts/migrations/20261006170000_m820_1_risk_changes.sql',
].map((p) => resolve(ROOT, p));
const REQ07_MD5 = '4d24b0248a3353ee098e079f2a7749b0';
const DESC_MD5: Record<string, string> = { 'REQ-04': '6c931c4fc0603ba6dc5ebc2cc06a13b0', 'REQ-24': '9030ce6a7aa94d9cf4997f9fd07864b8', 'REQ-14': '0670f04abccbabbabb57b8bbce871c2e' };
const log = (label: string, v: unknown) => console.log(`[M820 FLOW 1] ${label}: ${JSON.stringify(v)}`);
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
async function archiveCounts(): Promise<{ gates: number | null; fields: number | null }> {
  const one = async (t: string) => {
    const [r] = await harness.sql<{ t: string | null }[]>`SELECT to_regclass(${'public.' + t})::text AS t`;
    if (!r.t) return null;
    const [c] = await harness.sql.unsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${t}`);
    return c.n;
  };
  return { gates: await one('compliance_requirements_archive_m820_flow_1'), fields: await one('fields_archive_m820_flow_1') };
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

// synthetic register rows for M820-04 (no client data)
const ALT = { rows: [{ id: 'a1', alternative: 'Variante A', beschreibung: 'Synthetisch', bewertung: 'geprüft' }] };
const QZ = { rows: [{ id: 'q1', ziel: 'Synthetisches Ziel', anforderung: 'Synthetische Anforderung' }] };
const IDENT_2 = ['project_name_full', 'project_name_short', 'project_number'];
const IDENT_3 = ['applicable_lph', 'client_auftraggeber', 'contract_reference', 'contractor_auftragnehmer', 'project_location', 'project_number', 'project_title', 'registration_date'];
const ACKS = ['phase_definition_acknowledged', 'phasenziele_definition_acknowledged', 'projektziele_definition_acknowledged', 'qe_definition_acknowledged'];
const A_RATED = ['qe52', 'qe53', 'qe54', 'qe55'].map((q, i) => [`M8203-${String(7 + i).padStart(2, '0')}`, `${q}_items_rated`] as const);
const B_RATED = ['qe62', 'qe63a', 'qe63b', 'qe64a', 'qe64b', 'qe65', 'qe66', 'qe67'].map((q, i) => [`M8203-${String(11 + i).padStart(2, '0')}`, `${q}_items_rated`] as const);

let PRE: TableDump;
let pub: Proj; // public client, fee entered, M820-09 empty, M820-04 complete
let qe: Proj; // 820-3 items-rated values stored on -07 … -18
let stopT: Proj; // 820-3 projektstopp_code 1, review answered true on M8203-02
let stopF: Proj; // … answered false

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-flow-1@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820 flow 1 harness', ${'m820-flow1-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${USER_ID}, 'owner')`;
  await seedDump('tests/harness/m820-1-client-route.dump.json', 'src/lib/eval/field-configs/m820_1.prior.json', '2020');
  await seedDump('tests/harness/m820-2-registers.dump.json', 'src/lib/eval/field-configs/m820_2.prior.json', '2023');
  await seedDump('tests/harness/m820-3-structure.dump.json', 'src/lib/eval/field-configs/m820_3.prior.json', '2026');
  for (const blk of PRIOR_BLOCKS) await runFile(blk); // = prod 2026-10-06
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadInheritedFields } = await import('@/lib/db/queries/worksheet'));
  ({ recomputeWorksheetEquations: recompute } = await import('@/lib/actions/recompute-worksheet'));
}, 300_000);

afterAll(async () => {
  await harness?.stop();
});

describe('M820 flow block 1 — staged block on embedded Postgres (pre-state = prod 2026-10-06)', () => {
  it('a. pre-state = the live guards; BROKEN BEFORE: M820-04 approval refused by REQ-07 waiting for M820-09; sums -22/-23 not computed; "ALL" / ".." deliver nothing', async () => {
    expect(await archiveCounts()).toEqual({ gates: null, fields: null });
    // the guarded live values (read-only prod check 2026-10-06) hold in the seeded pre-state
    const g = await harness.sql<{ code: string; ws: string; condition: string; description: string | null }[]>`
      SELECT cr.code, w.code AS ws, cr.condition, cr.description FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
        JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-1' AND cr.code IN ('REQ-04','REQ-07','REQ-14','REQ-24') ORDER BY 1`;
    log('gates pre-state', g.map((x) => `${x.code}@${x.ws} cond ${md5(x.condition)} desc ${md5(x.description ?? '')}`));
    expect(g.map((x) => [x.code, x.ws])).toEqual([['REQ-04', 'M820-01'], ['REQ-07', 'M820-04'], ['REQ-14', 'M820-10'], ['REQ-24', 'M820-04']]);
    expect(md5(g[1].condition)).toBe(REQ07_MD5);
    for (const x of [g[0], g[2], g[3]]) expect([x.condition, md5(x.description ?? '')]).toEqual(['', DESC_MD5[x.code]]);
    const [ts] = await harness.sql<{ cw: string[] }[]>`SELECT f.consumer_worksheets AS cw FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = 'M820-09' AND f.symbol = 'threshold_status'`;
    expect(ts.cw).toEqual(['M820-10', 'M820-11', 'M820-12', 'M820-17', 'M820-04', 'M820-23']);

    // item 1 — public client, fee entered on M820-01, M820-04 complete, M820-09 still empty
    pub = await makeProject('flow1-public-client');
    await save(pub, 'M820-01', { client_organization_type: e('municipality'), estimated_engineering_fee: n(150000) });
    await save(pub, 'M820-04', { bedarfsplanung_konzept_complete: b(true), aufgabenbeschreibung_eindeutig: b(true), alternatives_considered: jv(ALT), quality_targets_konzept: jv(QZ) });
    const p04 = await panel(pub, 'M820-04');
    const a04 = await approval(pub, 'M820-04');
    log('item 1 BEFORE: panel M820-04 REQ-07 / checkApprovalGate(M820-04) with M820-09 empty', { p04: pick(p04, ['REQ-07']), a04 });
    // the form panel also misses the fee (estimated_engineering_fee is not passed on to M820-04 — audit 1-b); approval resolves it project-wide
    expect(pick(p04, ['REQ-07'])).toEqual({ 'REQ-07/block': { kind: 'pending', missing: ['estimated_engineering_fee', 'eu_threshold_value', 'threshold_status'] } });
    expect(a04).toEqual({ ok: false, failing: [], pending: ['REQ-07'], missing: [] });

    // item 3 — the twelve items_rated values stored as their D5 equations store them; the two sums cannot read them
    qe = await makeProject('flow1-qe-rated');
    for (const [ws, sym] of A_RATED) await putDerived(qe, ws, sym, 3);
    for (const [ws, sym] of B_RATED) await putDerived(qe, ws, sym, 5);
    const r22 = await recompute(qe.inst.get('M8203-22')!);
    const r23 = await recompute(qe.inst.get('M8203-23')!);
    const nc = (r: typeof r22, out: string) => r.notComputed.filter((x) => x.outputSymbol === out).map((x) => x.reason);
    log('item 3 BEFORE: recompute M8203-22 / -23', { a: nc(r22, 'gesamt_anhang_a_items_rated'), b: nc(r23, 'gesamt_anhang_b_items_rated') });
    expect(nc(r22, 'gesamt_anhang_a_items_rated')).toHaveLength(1);
    expect(nc(r23, 'gesamt_anhang_b_items_rated')).toHaveLength(1);
    expect([await storedNum(qe, 'M8203-22', 'gesamt_anhang_a_items_rated'), await storedNum(qe, 'M8203-23', 'gesamt_anhang_b_items_rated')]).toEqual(['none', 'none']);

    // items 4 / 5 — exact-code delivery: nothing reaches the later sheets
    const inh = { s2_15: await inheritedSymbols('820-2-15'), s3_12: await inheritedSymbols('M8203-12'), s3_24: await inheritedSymbols('M8203-24') };
    log('items 4/5 BEFORE: inherited on 820-2-15 / M8203-12 / M8203-24 (subset)', inh);
    for (const s of IDENT_2) expect(inh.s2_15).not.toContain(`820-2-01:${s}`);
    for (const s of IDENT_3) expect(inh.s3_12).not.toContain(`M8203-01:${s}`);
    expect(inh.s3_12).not.toContain('M8203-03:bild1_step_4_einzelprojekt_lifecycle');
    for (const s of ACKS) expect(inh.s3_24).not.toContain(`M8203-03:${s}`);

    // item 6 — projektstopp_review_triggered answered on M8203-02, project-stop code 1 on M8203-24
    stopT = await makeProject('flow1-stop-true');
    stopF = await makeProject('flow1-stop-false');
    await save(stopT, 'M8203-02', { projektstopp_review_triggered: b(true) });
    await save(stopF, 'M8203-02', { projektstopp_review_triggered: b(false) });
    await putDerived(stopT, 'M8203-24', 'projektstopp_code', 1);
    await putDerived(stopF, 'M8203-24', 'projektstopp_code', 1);
    const s24 = { t: pick(await panel(stopT, 'M8203-24'), ['REQ-31']), f: pick(await panel(stopF, 'M8203-24'), ['REQ-31']) };
    log('item 6 BEFORE: panel M8203-24 REQ-31 (answer inherited from M8203-02)', s24);
    expect(s24).toEqual({ t: { 'REQ-31/warn': { kind: 'pass' } }, f: { 'REQ-31/warn': { kind: 'fail' } } });

    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: 4 gates re-homed, 30 consumer arrays, 1 field moved; archive 4 / 31; only compliance_requirements + fields touched; project values untouched', async () => {
    const ppBefore = await projectParams();
    await runFile(MIGRATION);
    const g = await harness.sql<{ id: string; code: string; ws: string; severity: string; condition: string; clause_reference: string | null; title_de: string; description: string }[]>`
      SELECT cr.id, cr.code, w.code AS ws, cr.severity, cr.condition, cr.clause_reference, cr.title_de, cr.description FROM compliance_requirements cr
        JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
       WHERE s.code = 'DWA-M-820-1' AND cr.code IN ('REQ-04','REQ-07','REQ-14','REQ-24') ORDER BY 2`;
    log('gates after apply', g.map((x) => `${x.code}@${x.ws}/${x.severity}/${x.clause_reference}/${md5(x.condition)}`));
    expect(g.map((x) => [x.code, x.ws, x.severity])).toEqual([['REQ-04', 'M820-03', 'warn'], ['REQ-07', 'M820-09', 'block'], ['REQ-14', 'M820-14', 'warn'], ['REQ-24', 'M820-09', 'warn']]);
    const preG = new Map(PRE.compliance_requirements.map((x) => JSON.parse(x) as { id: string; title_de: string; severity: string; condition: string; clause_reference: string | null; description: string | null }).map((x) => [x.id, x]));
    for (const x of g) {
      const p = preG.get(x.id)!;
      expect([x.title_de, x.severity, x.condition, x.clause_reference]).toEqual([p.title_de, p.severity, p.condition, p.clause_reference]);
      expect(x.description.startsWith(`${p.description ?? ''}\n[Flow 1, 2026-10-06] Blatt / sheet ${x.ws}`)).toBe(true);
    }
    const [mv] = await harness.sql<{ ws: string; sec: string; order_index: number; cw: string[] | null; description: string }[]>`
      SELECT w.code AS ws, sc.code AS sec, f.order_index, f.consumer_worksheets AS cw, f.description FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
        JOIN worksheet_sections sc ON sc.id = f.section_id WHERE f.symbol = 'projektstopp_review_triggered'`;
    log('moved field after apply', { ws: mv.ws, sec: mv.sec, order: mv.order_index, cw: mv.cw });
    expect([mv.ws, mv.sec, mv.order_index, mv.cw]).toEqual(['M8203-24', 'F', 2, null]);
    expect(await archiveCounts()).toEqual({ gates: 4, fields: 31 });
    const diff = dumpDiff(PRE, await dump());
    const kinds = diff.map((l) => l.split(' ').slice(0, 2).join(' '));
    log('apply diff (table / sign counts)', Object.fromEntries([...new Set(kinds)].map((k) => [k, kinds.filter((x) => x === k).length])));
    expect(kinds.filter((k) => k === 'compliance_requirements -')).toHaveLength(4);
    expect(kinds.filter((k) => k === 'compliance_requirements +')).toHaveLength(4);
    expect(kinds.filter((k) => k === 'fields -')).toHaveLength(31);
    expect(kinds.filter((k) => k === 'fields +')).toHaveLength(31);
    expect(diff).toHaveLength(70);
    expect(await projectParams()).toEqual(ppBefore);
  });

  it('c. apply again: 0 changes (full dump compare), archives unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    const diff = dumpDiff(before, await dump());
    log('re-apply diff', diff);
    expect(diff).toEqual([]);
    expect(await archiveCounts()).toEqual({ gates: 4, fields: 31 });
  });

  it('d. rollback: byte-equal to the pre-state, archives emptied; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    const diff = dumpDiff(PRE, after);
    log('rollback diff vs pre', diff);
    log('rollback digest', digest(after));
    expect(diff).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await archiveCounts()).toEqual({ gates: 0, fields: 0 });
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await archiveCounts()).toEqual({ gates: 0, fields: 0 });
  });

  it('d2. the read-back file runs before and after an apply and shows the expected values', async () => {
    const text = readFileSync(READBACK, 'utf8');
    const stmts = splitOnUnquotedSemicolons(text).filter((s) => s.trim());
    expect(stmts).toHaveLength(8);
    expect(text.split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(8);
    const pre: unknown[][] = [];
    for (const st of stmts.slice(0, 3)) pre.push([...(await harness.sql.unsafe(st))]);
    log('read-back R0a..R0c (before)', pre);
    expect((pre[0] as Array<{ code: string; ws: string; live_ok: boolean }>).map((r) => [r.code, r.ws, r.live_ok])).toEqual([['REQ-04', 'M820-01', true], ['REQ-07', 'M820-04', true], ['REQ-14', 'M820-10', true], ['REQ-24', 'M820-04', true]]);
    expect(pre[1]).toEqual([
      { std: 'DWA-M-820-1', old_match: '1', new_match: '0', found: '1' },
      { std: 'DWA-M-820-2', old_match: '4', new_match: '0', found: '4' },
      { std: 'DWA-M-820-3', old_match: '25', new_match: '0', found: '25' },
    ]);
    expect(pre[2]).toEqual([{ ws: 'M8203-02', section: 'C', order_index: 0, cw: 'M8203-24', saved_values: '2', note_ok: false }]);
    await runFile(MIGRATION);
    const res: unknown[][] = [];
    for (const st of stmts) res.push([...(await harness.sql.unsafe(st))]);
    log('read-back R0a..R5 (after)', res);
    expect(res[1]).toEqual([
      { std: 'DWA-M-820-1', old_match: '0', new_match: '1', found: '1' },
      { std: 'DWA-M-820-2', old_match: '0', new_match: '4', found: '4' },
      { std: 'DWA-M-820-3', old_match: '0', new_match: '25', found: '25' },
    ]);
    expect(res[2]).toEqual([{ ws: 'M8203-24', section: 'F', order_index: 2, cw: null, saved_values: '2', note_ok: true }]);
    expect((res[3] as Array<{ code: string; ws: string; cond_ok: boolean; note_ok: boolean }>).map((r) => [r.code, r.ws, r.cond_ok, r.note_ok])).toEqual([['REQ-04', 'M820-03', true, true], ['REQ-07', 'M820-09', true, true], ['REQ-14', 'M820-14', true, true], ['REQ-24', 'M820-09', true, true]]);
    expect(res[4]).toEqual([]);
    expect(res[5]).toEqual([{ ws: 'M820-09', symbol: 'threshold_status', cw: 'M820-10,M820-11,M820-12,M820-17,M820-23' }]);
    expect(res[6]).toEqual([{ gate_archive: '4', field_archive: '31' }]);
    log('read-back R5 gates per sheet (after)', res[7]);
    const r5 = Object.fromEntries((res[7] as Array<{ ws: string; gates: string }>).map((r) => [r.ws, r.gates.split(', ')]));
    expect(r5['M820-01'] ?? []).not.toContain('REQ-04/warn');
    expect(r5['M820-03']).toContain('REQ-04/warn');
    expect(r5['M820-04']).toEqual(['REQ-02/block', 'REQ-05/warn']);
    expect(r5['M820-09']).toEqual(expect.arrayContaining(['REQ-07/block', 'REQ-24/warn']));
    expect(r5['M820-10'] ?? []).not.toContain('REQ-14/warn');
    expect(r5['M820-14']).toContain('REQ-14/warn');
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('e. item 1 after the apply: M820-04 approvable; REQ-07 on M820-09 passes / blocks both ways (public, private route guard, Forscheln state)', async () => {
    await runFile(MIGRATION);
    const p04 = await panel(pub, 'M820-04');
    const a04 = await approval(pub, 'M820-04');
    log('item 1 AFTER: panel M820-04 REQ-07 / checkApprovalGate(M820-04), M820-09 still empty', { p04: pick(p04, ['REQ-07']), a04 });
    expect(pick(p04, ['REQ-07'])).toEqual({});
    expect(a04).toEqual({ ok: true, failing: [], pending: [], missing: [] });

    const r07 = async (p: Proj) => ({ panel: pick(await panel(p, 'M820-09'), ['REQ-07']), approval: await approval(p, 'M820-09') });
    const inGate = (a: { failing: string[]; pending: string[] }) => (a.failing.includes('REQ-07') ? 'failing' : a.pending.includes('REQ-07') ? 'pending' : 'not held');
    // public client: M820-09 empty → waits; 150 000 below 214 000 → unterschwellig passes, oberschwellig fails; 250 000 the reverse
    const empty = await r07(pub);
    await save(pub, 'M820-09', { eu_threshold_value: n(214000), threshold_status: e('unterschwellig') });
    const below = await r07(pub);
    await save(pub, 'M820-09', { threshold_status: e('oberschwellig') });
    const belowWrong = await r07(pub);
    await save(pub, 'M820-01', { estimated_engineering_fee: n(250000) });
    const above = await r07(pub);
    await save(pub, 'M820-09', { threshold_status: e('unterschwellig') });
    const aboveWrong = await r07(pub);
    const pubCases = { empty, below, belowWrong, above, aboveWrong };
    log('item 1 AFTER: public client on M820-09', Object.fromEntries(Object.entries(pubCases).map(([k, v]) => [k, { panel: v.panel['REQ-07/block'], gate: inGate(v.approval) }])));
    expect(empty.panel['REQ-07/block']).toEqual({ kind: 'pending', missing: ['eu_threshold_value', 'threshold_status'] });
    expect(inGate(empty.approval)).toBe('pending');
    expect([below.panel['REQ-07/block'].kind, inGate(below.approval)]).toEqual(['pass', 'not held']);
    expect([belowWrong.panel['REQ-07/block'].kind, inGate(belowWrong.approval)]).toEqual(['fail', 'failing']);
    expect([above.panel['REQ-07/block'].kind, inGate(above.approval)]).toEqual(['pass', 'not held']);
    expect([aboveWrong.panel['REQ-07/block'].kind, inGate(aboveWrong.approval)]).toEqual(['fail', 'failing']);

    // private client without funding (Forscheln state: voluntary answer blank, threshold 214 000, synthetic fee 45 000)
    const priv = await makeProject('flow1-privat-ohne-foerderung');
    await save(priv, 'M820-01', { client_organization_type: e('privat_ohne_foerderung'), estimated_engineering_fee: n(45000) });
    await save(priv, 'M820-09', { eu_threshold_value: n(214000) });
    const blank = await r07(priv);
    const a04priv = await approval(priv, 'M820-04');
    await save(priv, 'M820-01', { vergaberecht_freiwillig_angewendet: b(false) });
    const no = await r07(priv);
    await save(priv, 'M820-01', { vergaberecht_freiwillig_angewendet: b(true) });
    const yesMissing = await r07(priv);
    await save(priv, 'M820-09', { threshold_status: e('unterschwellig') });
    const yesBelow = await r07(priv);
    await save(priv, 'M820-09', { threshold_status: e('oberschwellig') });
    const yesWrong = await r07(priv);
    const privCases = { blank, no, yesMissing, yesBelow, yesWrong };
    log('item 1 AFTER: private client (guard) on M820-09; M820-04 no longer held', { a04priv: { failing: a04priv.failing, pending: a04priv.pending }, ...Object.fromEntries(Object.entries(privCases).map(([k, v]) => [k, { panel: v.panel['REQ-07/block'], gate: inGate(v.approval) }])) });
    expect([...a04priv.failing, ...a04priv.pending]).not.toContain('REQ-07');
    expect(blank.panel['REQ-07/block']).toEqual({ kind: 'pending', missing: ['vergaberecht_freiwillig_angewendet'] });
    expect(inGate(blank.approval)).toBe('pending');
    expect([no.panel['REQ-07/block'].kind, inGate(no.approval)]).toEqual(['pass', 'not held']);
    expect(yesMissing.panel['REQ-07/block']).toEqual({ kind: 'pending', missing: ['threshold_status'] });
    expect([yesBelow.panel['REQ-07/block'].kind, inGate(yesBelow.approval)]).toEqual(['pass', 'not held']);
    expect([yesWrong.panel['REQ-07/block'].kind, inGate(yesWrong.approval)]).toEqual(['fail', 'failing']);

    // item 2: the three attestations show on their new sheets (manual, warn), no longer on the old ones
    const att = {
      m03: pick(await panel(pub, 'M820-03'), ['REQ-04']), m01: pick(await panel(pub, 'M820-01'), ['REQ-04']),
      m09: pick(await panel(pub, 'M820-09'), ['REQ-24']), m04: pick(await panel(pub, 'M820-04'), ['REQ-24']),
      m14: pick(await panel(pub, 'M820-14'), ['REQ-14']), m10: pick(await panel(pub, 'M820-10'), ['REQ-14']),
    };
    log('item 2 AFTER: attestations', att);
    expect(att).toEqual({ m03: { 'REQ-04/warn': { kind: 'manual' } }, m01: {}, m09: { 'REQ-24/warn': { kind: 'manual' } }, m04: {}, m14: { 'REQ-14/warn': { kind: 'manual' } }, m10: {} });
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('f. items 3 / 4 / 5 after the apply: the sums compute on M8203-22 / -23; exact codes deliver; worksheet_status goes nowhere', async () => {
    await runFile(MIGRATION);
    const r22 = await recompute(qe.inst.get('M8203-22')!);
    const r23 = await recompute(qe.inst.get('M8203-23')!);
    const sums = { a: await storedNum(qe, 'M8203-22', 'gesamt_anhang_a_items_rated'), b: await storedNum(qe, 'M8203-23', 'gesamt_anhang_b_items_rated') };
    log('item 3 AFTER: recompute M8203-22 / -23', { sums, nc22: r22.notComputed.filter((x) => x.outputSymbol === 'gesamt_anhang_a_items_rated'), nc23: r23.notComputed.filter((x) => x.outputSymbol === 'gesamt_anhang_b_items_rated') });
    expect(sums).toEqual({ a: 4 * 3, b: 8 * 5 });
    const i22 = await inheritedSymbols('M8203-22');
    const i23 = await inheritedSymbols('M8203-23');
    const i24 = await inheritedSymbols('M8203-24');
    for (const [ws, s] of A_RATED) { expect(i22).toContain(`${ws}:${s}`); expect(i23).not.toContain(`${ws}:${s}`); expect(i24).not.toContain(`${ws}:${s}`); }
    for (const [ws, s] of B_RATED) { expect(i23).toContain(`${ws}:${s}`); expect(i22).not.toContain(`${ws}:${s}`); expect(i24).not.toContain(`${ws}:${s}`); }

    // item 4: bild1_step_4 reaches M8203-11 … -18 (+ -23 / -24 as before), nothing else new
    const step4: Record<string, boolean> = {};
    for (const ws of seq('M8203-', 2, 24)) step4[ws] = (await inheritedSymbols(ws)).includes('M8203-03:bild1_step_4_einzelprojekt_lifecycle');
    log('item 4 AFTER: bild1_step_4 inherited on', Object.keys(step4).filter((k) => step4[k]));
    expect(Object.keys(step4).filter((k) => step4[k])).toEqual([...seq('M8203-', 11, 18), 'M8203-23', 'M8203-24']);

    // item 5: identity → every later sheet of the part; acknowledgements → M8203-24 only; worksheet_status → nowhere
    for (const ws of seq('820-2-', 2, 28)) {
      const inh = await inheritedSymbols(ws);
      for (const s of IDENT_2) expect(inh, ws).toContain(`820-2-01:${s}`);
      expect(inh, ws).not.toContain('820-2-01:worksheet_status');
    }
    for (const ws of seq('M8203-', 2, 24)) {
      const inh = await inheritedSymbols(ws);
      for (const s of IDENT_3) expect(inh, ws).toContain(`M8203-01:${s}`);
      for (const s of ACKS) expect(inh.includes(`M8203-03:${s}`), `${ws} ${s}`).toBe(ws === 'M8203-24');
    }
    // a saved identity value is shown on the last sheet (the form reads the inherited row)
    const idp = await makeProject('flow1-identity');
    await save(idp, '820-2-01', { project_name_full: tx('Synthetisches Projekt') });
    const [t28] = await harness.sql<{ id: string; standard_id: string }[]>`SELECT id, standard_id FROM worksheet_templates WHERE code = '820-2-28'`;
    const f28 = (await loadInheritedFields(t28.id, t28.standard_id, '820-2-28')).find((f) => f.symbol === 'project_name_full')!;
    const [v28] = await harness.sql<{ v: string }[]>`SELECT value_text AS v FROM project_parameters WHERE project_id = ${idp.id} AND field_id = ${f28.id}`;
    log('item 5 AFTER: project_name_full on 820-2-28', { origin: f28.originWorksheetCode, value: v28.v });
    expect(v28.v).toBe('Synthetisches Projekt');
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('g. item 6 after the apply: projektstopp_review_triggered is a field of M8203-24 (section F), saved answers moved with it, REQ-31 resolves both ways', async () => {
    await runFile(MIGRATION);
    const own02 = await harness.sql<{ symbol: string }[]>`SELECT f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = 'M8203-02' AND f.active`;
    const own24 = await harness.sql<{ symbol: string; sec: string; order_index: number }[]>`SELECT f.symbol, sc.code AS sec, f.order_index FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
      JOIN worksheet_sections sc ON sc.id = f.section_id WHERE w.code = 'M8203-24' AND f.active AND sc.code = 'F' ORDER BY f.order_index, f.symbol`;
    log('item 6 AFTER: section F of M8203-24', own24);
    expect(own02.map((f) => f.symbol)).not.toContain('projektstopp_review_triggered');
    expect(own24.map((f) => `${f.symbol}:${f.order_index}`)).toEqual(['overall_quality_verdict:0', 'projektstopp_required:0', 'projektstopp_code:1', 'projektstopp_review_triggered:2']);
    expect(await inheritedSymbols('M8203-24')).not.toContain('M8203-02:projektstopp_review_triggered');
    const s24 = { t: pick(await panel(stopT, 'M8203-24'), ['REQ-31']), f: pick(await panel(stopF, 'M8203-24'), ['REQ-31']) };
    log('item 6 AFTER: panel M8203-24 REQ-31 (local field, values carried by the field id)', s24);
    expect(s24).toEqual({ t: { 'REQ-31/warn': { kind: 'pass' } }, f: { 'REQ-31/warn': { kind: 'fail' } } });
    // the answer is now entered on M8203-24 through the real save path
    await save(stopF, 'M8203-24', { projektstopp_review_triggered: b(true) });
    const fixed = pick(await panel(stopF, 'M8203-24'), ['REQ-31']);
    const a24 = await approval(stopF, 'M8203-24');
    log('item 6 AFTER: answer changed on M8203-24 → REQ-31; approval (REQ-31 is warn)', { fixed, a24: { failing: a24.failing, pending: a24.pending } });
    expect(fixed).toEqual({ 'REQ-31/warn': { kind: 'pass' } });
    expect([...a24.failing, ...a24.pending]).not.toContain('REQ-31');
    const [cnt] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM project_parameters pp JOIN fields f ON f.id = pp.field_id WHERE f.symbol = 'projektstopp_review_triggered'`;
    expect(cnt.n).toBe(2);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('h. commutes with the staged REQ-05 block (20261006180000): REQ-05 first, then this block, rollbacks in reverse → pre-state', async () => {
    await runFile(REQ05_MIGRATION);
    await runFile(MIGRATION);
    const r = await harness.sql<{ ws: string; gates: string }[]>`
      SELECT w.code AS ws, string_agg(cr.code || '/' || cr.severity, ', ' ORDER BY cr.code) AS gates FROM compliance_requirements cr
        JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
       WHERE s.code = 'DWA-M-820-1' AND w.code IN ('M820-04','M820-07','M820-09') GROUP BY 1 ORDER BY 1`;
    log('both blocks applied: gates on M820-04 / -07 / -09', r);
    expect(r.find((x) => x.ws === 'M820-04')!.gates).toBe('REQ-02/block');
    expect(r.find((x) => x.ws === 'M820-07')!.gates).toBe('REQ-05/warn');
    expect(r.find((x) => x.ws === 'M820-09')!.gates.split(', ')).toEqual(expect.arrayContaining(['REQ-07/block', 'REQ-24/warn']));
    expect(await archiveCounts()).toEqual({ gates: 4, fields: 31 });
    await runFile(ROLLBACK);
    await runFile(REQ05_ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });
});
