/**
 * M820 follow-up block 1 — embedded-Postgres proof of the staged block
 *   scripts/migrations/20261006160000_m820_followup_1.sql
 *   scripts/rollback-20261006160000-m820-followup-1.sql
 *   scripts/verification/apply/readback-20261006160000-m820-followup-1.sql
 * plus the [CODE] fix of item 4 (src/lib/eval/materialize-derived.ts) through the real save path.
 * (apply order: vault 01-Projects/ekowai-wizard/m820-wizard-test/25_APPLY-ORDER-m820-followup-1.md).
 *
 * Disposable embedded Postgres only (embedded-pg.ts, schema from the Drizzle model) — no prod, no .env.local.
 * Auth seam: BYPASS_AUTH + BYPASS_AUTH_USER_ID, so the REAL saveWorksheet (incl. the register materialiser), the REAL
 * recomputeWorksheetEquations (the code behind MCP set_field_values / recompute_worksheet) and the REAL checkApprovalGate run.
 * The form's gate panel is reproduced with the form's own pieces: own + inherited fields (loadInheritedFields), makeSymbolLookup,
 * evaluateCondition (= ComplianceBlock).
 *
 * SEED (pre-state = prod after blocks 15 / 16 / 17 / 19):
 *   - the three 2026-10-05 prod dumps (byte copies of the vault _baseline files): tests/harness/m820-1-client-route.dump.json
 *     (incl. its 36 equations and 6 regulation tables, edition 2020 = the seed migration's edition), m820-2-registers.dump.json,
 *     m820-3-structure.dump.json; consumer_worksheets from src/lib/eval/field-configs/m820_{1,2,3}.prior.json (read-only prod
 *     captures 2026-09-18 — R-2 leads, the closest pre-state, as in the four block harnesses); fields.source_anchor added.
 *   - then the four applied blocks in their apply order: 20261005193000 (15), 20261005200000 (16), 20261006100000 (17),
 *     20261006120000 (19). "Rollback byte-equal" is measured against that state.
 *
 * CASES (short facts only):
 *   G-1  Forscheln-like 820-3 project (Einzelprojekt) with the four Anhang-B split totals 21 / 19 / 17 / 33 (24_Gate-Read).
 *   F-01 820-1 private client WITH funding, entered threshold 214000; a private client WITHOUT funding, voluntary answer blank
 *        (the Forscheln state of 21_Fill-Run_M820-1).
 *   F2   820-2 registers: absent (never saved) vs explicitly empty {rows: []} on 820-2-06 / 820-2-03.
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
const USER_ID = '00000000-0000-4000-8000-0000000008f1';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261006160000_m820_followup_1.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006160000-m820-followup-1.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261006160000-m820-followup-1.sql');
const PRIOR_BLOCKS = [
  'scripts/migrations/20261005193000_m820_1_client_route.sql',
  'scripts/migrations/20261005200000_m820_2_registers.sql',
  'scripts/migrations/20261006100000_m820_2_structure.sql',
  'scripts/migrations/20261006120000_m820_3_structure.sql',
].map((p) => resolve(ROOT, p));
const log = (label: string, v: unknown) => console.log(`[M820 FOLLOW-UP 1] ${label}: ${JSON.stringify(v)}`);
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

// ── full-table dump of the definition tables (+ the regulation tables this block writes) ────────────────────────────
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
async function archiveCounts(): Promise<{ gates: number | null; rows: number | null }> {
  const one = async (t: string) => {
    const [r] = await harness.sql<{ t: string | null }[]>`SELECT to_regclass(${'public.' + t})::text AS t`;
    if (!r.t) return null;
    const [c] = await harness.sql.unsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${t}`);
    return c.n;
  };
  return { gates: await one('compliance_requirements_archive_m820_followup_1'), rows: await one('regulation_table_rows_added_m820_followup_1') };
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
type V = { type: 'boolean'; value: boolean } | { type: 'enum'; value: string } | { type: 'number'; value: number } | { type: 'json'; value: unknown };
const e = (value: string): V => ({ type: 'enum', value });
const n = (value: number): V => ({ type: 'number', value });
const jv = (value: unknown): V => ({ type: 'json', value });
async function save(p: Proj, ws: string, vals: Record<string, V>) {
  const ids = await harness.sql<{ id: string; symbol: string }[]>`
    SELECT f.id, f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
    WHERE w.code = ${ws} AND f.symbol IN ${harness.sql(Object.keys(vals))}`;
  expect(ids.length, `${ws} fields ${Object.keys(vals)}`).toBe(Object.keys(vals).length);
  const values = Object.fromEntries(ids.map((f) => [f.id, vals[f.symbol]]));
  const r = await saveWorksheet({ instanceId: p.inst.get(ws)!, values: values as never });
  expect(r.ok, `${ws} save ${JSON.stringify(r)}`).toBe(true);
  return r;
}
async function stored(p: Proj, ws: string, symbol: string): Promise<number | null | 'none'> {
  const r = await harness.sql<{ v: string | null }[]>`SELECT pp.value_number::text AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
    JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE pp.project_id = ${p.id} AND w.code = ${ws} AND f.symbol = ${symbol}`;
  return r.length === 0 ? 'none' : r[0].v === null ? null : Number(r[0].v);
}
/** The form's gate panel on a sheet: own + inherited fields (loadInheritedFields), makeSymbolLookup, evaluateCondition. */
async function panel(p: Proj, ws: string): Promise<Record<string, string>> {
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
  return Object.fromEntries(gates.map((g) => [`${g.code}/${g.severity}`, evaluateCondition(g.condition, lookup).kind]));
}
async function approval(p: Proj, ws: string) {
  const g = await checkApprovalGate(p.inst.get(ws)!);
  return { ok: g.ok, failing: g.failingBlockConditions.map((c) => c.code).sort(), pending: g.pendingBlockConditions.map((c) => c.code).sort(), missing: g.missingRequiredFields.map((f) => f.symbol).sort() };
}
const pick = (o: Record<string, string>, codes: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => codes.some((c) => k.startsWith(`${c}/`))));

let PRE: TableDump;
let g1: Proj;
let privMit: Proj;

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-followup-1@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820 follow-up 1 harness', ${'m820-fu1-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${USER_ID}, 'owner')`;
  await seedDump('tests/harness/m820-1-client-route.dump.json', 'src/lib/eval/field-configs/m820_1.prior.json', '2020');
  await seedDump('tests/harness/m820-2-registers.dump.json', 'src/lib/eval/field-configs/m820_2.prior.json', '2023');
  await seedDump('tests/harness/m820-3-structure.dump.json', 'src/lib/eval/field-configs/m820_3.prior.json', '2026');
  for (const b of PRIOR_BLOCKS) await runFile(b); // blocks 15 / 16 / 17 / 19 = prod today
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadInheritedFields } = await import('@/lib/db/queries/worksheet'));
  ({ recomputeWorksheetEquations: recompute } = await import('@/lib/actions/recompute-worksheet'));
}, 240_000);

afterAll(async () => {
  await harness?.stop();
});

describe('M820 follow-up 1 — staged block on embedded Postgres (after blocks 15 / 16 / 17 / 19)', () => {
  it('a. pre-state: BROKEN BEFORE — G-1 REQ-20/21 wait for good on M8203-11; F-01 the private-client threshold twin stays empty, D3 never computes', async () => {
    expect(await archiveCounts()).toEqual({ gates: null, rows: null });
    // G-1 — the C1 values (24_Gate-Read): 21 + 19 = 40, 17 + 33 = 50
    g1 = await makeProject('g1-einzelprojekt');
    await save(g1, 'M8203-01', { project_type: e('einzelprojekt') });
    await save(g1, 'M8203-12', { qe63a_items_total: n(21) });
    await save(g1, 'M8203-13', { qe63b_items_total: n(19) });
    await save(g1, 'M8203-14', { qe64a_items_total: n(17) });
    await save(g1, 'M8203-15', { qe64b_items_total: n(33) });
    const p11 = await panel(g1, 'M8203-11');
    log('G-1 BEFORE: form panel on M8203-11 (own + inherited lookup)', p11);
    expect(pick(p11, ['REQ-20', 'REQ-21'])).toEqual({ 'REQ-20/warn': 'pending', 'REQ-21/warn': 'pending' });
    const a11 = await approval(g1, 'M8203-11');
    log('G-1 BEFORE: checkApprovalGate(M8203-11) — REQ-20/21 are warn, so they are not in the approval refusal', a11);
    expect([...a11.failing, ...a11.pending].filter((c) => c === 'REQ-20' || c === 'REQ-21')).toEqual([]);

    // F-01 — private client WITH funding, entered threshold 214000
    privMit = await makeProject('privat-mit-foerderung');
    await save(privMit, 'M820-01', { client_organization_type: e('privat_mit_foerderung') });
    await save(privMit, 'M820-09', { eu_threshold_value: n(214000) });
    const r = await recompute(privMit.inst.get('M820-09')!);
    const d3 = r.notComputed.find((x) => x.outputSymbol === 'eu_threshold_konsistent_code');
    log('F-01 BEFORE: recompute M820-09 (privat_mit_foerderung)', { twin: await stored(privMit, 'M820-09', 'eu_threshold_value_anhb23'), d3 });
    expect(await stored(privMit, 'M820-09', 'eu_threshold_value_anhb23')).toBe('none');
    expect(d3?.reason).toBe('Fehlende oder leere Eingaben: eu_threshold_value_anhb23');

    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: REQ-20/21 on M8203-23 (severity / condition / clause unchanged), ANHB23 + 2 rows; archive 2, ledger 2', async () => {
    await runFile(MIGRATION);
    const gates = await harness.sql<{ id: string; code: string; ws: string; severity: string; condition: string; clause_reference: string; title_de: string }[]>`
      SELECT cr.id, cr.code, w.code AS ws, cr.severity, cr.condition, cr.clause_reference, cr.title_de FROM compliance_requirements cr
        JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
       WHERE s.code = 'DWA-M-820-3' AND cr.code IN ('REQ-20', 'REQ-21') ORDER BY 2`;
    log('REQ-20/21 after apply', gates.map((g) => `${g.code}@${g.ws}/${g.severity}/${g.clause_reference}/${md5(g.condition)}`));
    expect(gates.map((g) => [g.code, g.ws, g.severity, g.clause_reference, md5(g.condition)])).toEqual([
      ['REQ-20', 'M8203-23', 'warn', 'Anhang B.2', 'bbae8277c3de31e19ff4303da2b66633'],
      ['REQ-21', 'M8203-23', 'warn', 'Anhang B.3', 'ab3758b9f6a5a3fa1878465ecf48989b'],
    ]);
    const preGates = new Map(PRE.compliance_requirements.map((x) => JSON.parse(x) as { id: string; title_de: string; severity: string }).map((g) => [g.id, g]));
    for (const g of gates) expect([g.title_de, g.severity]).toEqual([preGates.get(g.id)!.title_de, preGates.get(g.id)!.severity]);
    const rows = await harness.sql<{ row_key: string; eur: string }[]>`
      SELECT r.row_key, r.row_values->>'schwellenwert_eur' AS eur FROM regulation_table_rows r JOIN regulation_tables t ON t.id = r.table_id
       WHERE t.standard_code = 'DWA-M-820-1' AND t.table_code = 'ANHB23' ORDER BY r.order_index, r.row_key`;
    log('ANHB23 rows after apply', rows.map((x) => `${x.row_key}=${x.eur}`));
    expect(rows.map((x) => `${x.row_key}=${x.eur}`)).toEqual(['municipality=214000', 'utility=214000', 'association=214000', 'bundesbehoerde=139000', 'sonstige_auftraggeber=214000', 'other=214000', 'privat_ohne_foerderung=214000', 'privat_mit_foerderung=214000']);
    expect(await archiveCounts()).toEqual({ gates: 2, rows: 2 });
    const diff = dumpDiff(PRE, await dump());
    log('apply diff (tables touched)', [...new Set(diff.map((l) => l.split(' ')[0]))]);
    expect([...new Set(diff.map((l) => l.split(' ')[0]))].sort()).toEqual(['compliance_requirements', 'regulation_table_rows']);
    expect(diff.filter((l) => l.startsWith('compliance_requirements -'))).toHaveLength(2);
    expect(diff.filter((l) => l.startsWith('regulation_table_rows +'))).toHaveLength(2);
    expect(diff.filter((l) => l.startsWith('regulation_table_rows -'))).toHaveLength(0);
  });

  it('c. apply again: 0 changes (full dump compare), archive / ledger unchanged', async () => {
    const before = await dump();
    const arch = await archiveCounts();
    await runFile(MIGRATION);
    const diff = dumpDiff(before, await dump());
    log('re-apply diff', diff);
    expect(diff).toEqual([]);
    expect(await archiveCounts()).toEqual(arch);
  });

  it('d. rollback: byte-equal to the pre-state, archive / ledger emptied; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    const diff = dumpDiff(PRE, after);
    log('rollback diff vs pre', diff);
    log('rollback digest', digest(after));
    expect(diff).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await archiveCounts()).toEqual({ gates: 0, rows: 0 });
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('d2. the read-back file runs before and after an apply and shows the expected values', async () => {
    const text = readFileSync(READBACK, 'utf8');
    const stmts = splitOnUnquotedSemicolons(text).filter((s) => s.trim());
    expect(stmts).toHaveLength(7);
    expect(text.split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(7);
    const pre: unknown[][] = [];
    for (const st of stmts.slice(0, 3)) pre.push([...(await harness.sql.unsafe(st))]);
    log('read-back R0a..R0c (before)', pre);
    expect((pre[0] as Array<{ ws: string; live_ok: boolean }>).map((r) => [r.ws, r.live_ok])).toEqual([['M8203-11', true], ['M8203-11', true]]);
    expect(pre[1][0]).toEqual({ anhb23_rows: '6', privat_rows: '0', privat_tokens: '2' });
    await runFile(MIGRATION);
    const res: unknown[][] = [];
    for (const st of stmts) res.push([...(await harness.sql.unsafe(st))]);
    log('read-back R0a..R4 (after)', res);
    expect(res[1][0]).toEqual({ anhb23_rows: '8', privat_rows: '2', privat_tokens: '2' });
    expect((res[3] as Array<{ ws: string; severity: string; cond_ok: boolean; note_ok: boolean }>).map((r) => [r.ws, r.severity, r.cond_ok, r.note_ok])).toEqual([['M8203-23', 'warn', true, true], ['M8203-23', 'warn', true, true]]);
    expect(res[4]).toHaveLength(8);
    expect(res[5][0]).toEqual({ gate_archive: '2', rows_added: '2' });
    expect(res[6]).toEqual([{ ws: 'M8203-11', gates: 'REQ-09/block, REQ-09-2/block, REQ-09-3/warn, REQ-19/warn' }, { ws: 'M8203-23', gates: 'REQ-20/warn, REQ-21/warn' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('e. G-1 after the apply — the form panel on M8203-23 passes at 21 + 19 / 17 + 33, fails on a wrong split; M8203-11 no longer carries them', async () => {
    await runFile(MIGRATION);
    const p23 = await panel(g1, 'M8203-23');
    const p11 = await panel(g1, 'M8203-11');
    log('G-1 AFTER: panel M8203-23 / M8203-11', { p23, p11 });
    expect(pick(p23, ['REQ-20', 'REQ-21'])).toEqual({ 'REQ-20/warn': 'pass', 'REQ-21/warn': 'pass' });
    expect(pick(p11, ['REQ-20', 'REQ-21'])).toEqual({});
    // a wrong split through the real save path (values the panel then reads on M8203-23)
    const bad = await makeProject('g1-wrong-split');
    await save(bad, 'M8203-01', { project_type: e('einzelprojekt') });
    await save(bad, 'M8203-12', { qe63a_items_total: n(21) });
    await save(bad, 'M8203-13', { qe63b_items_total: n(18) });
    await save(bad, 'M8203-14', { qe64a_items_total: n(16) });
    await save(bad, 'M8203-15', { qe64b_items_total: n(33) });
    const stored4 = [await stored(bad, 'M8203-13', 'qe63b_items_total'), await stored(bad, 'M8203-14', 'qe64a_items_total')];
    const pBad = await panel(bad, 'M8203-23');
    log('G-1 AFTER: wrong split 21 + 18 / 16 + 33 — stored, panel M8203-23', { stored4, pBad });
    expect(stored4).toEqual([18, 16]);
    expect(pick(pBad, ['REQ-20', 'REQ-21'])).toEqual({ 'REQ-20/warn': 'fail', 'REQ-21/warn': 'fail' });
    // approval: M8203-11 and M8203-23 — the two warn gates are in neither refusal (before: also not — see a.)
    const a11 = await approval(g1, 'M8203-11');
    const a23 = await approval(g1, 'M8203-23');
    const a23bad = await approval(bad, 'M8203-23');
    log('G-1 AFTER: checkApprovalGate M8203-11 / M8203-23 (good) / M8203-23 (wrong split)', { a11, a23, a23bad });
    for (const a of [a11, a23, a23bad]) expect([...a.failing, ...a.pending].filter((c) => c === 'REQ-20' || c === 'REQ-21')).toEqual([]);
  });

  it('f. F-01 after the apply — the private-client twin fills with 214000 and D3 computes (1 at 214000, 0 at 139000); privat_ohne_foerderung too', async () => {
    const r = await recompute(privMit.inst.get('M820-09')!);
    const twin = await stored(privMit, 'M820-09', 'eu_threshold_value_anhb23');
    const d3 = await stored(privMit, 'M820-09', 'eu_threshold_konsistent_code');
    log('F-01 AFTER: privat_mit_foerderung recompute M820-09', { written: r.written.map((w) => `${w.symbol}=${w.value}`), twin, d3, notComputed: r.notComputed.filter((x) => x.outputSymbol === 'eu_threshold_konsistent_code') });
    expect([twin, d3]).toEqual([214000, 1]);
    await save(privMit, 'M820-09', { eu_threshold_value: n(139000) });
    await recompute(privMit.inst.get('M820-09')!);
    expect(await stored(privMit, 'M820-09', 'eu_threshold_konsistent_code')).toBe(0);

    const privOhne = await makeProject('privat-ohne-foerderung');
    await save(privOhne, 'M820-01', { client_organization_type: e('privat_ohne_foerderung') });
    await save(privOhne, 'M820-09', { eu_threshold_value: n(214000) });
    await recompute(privOhne.inst.get('M820-09')!);
    const ohne = { twin: await stored(privOhne, 'M820-09', 'eu_threshold_value_anhb23'), d3: await stored(privOhne, 'M820-09', 'eu_threshold_konsistent_code') };
    const a04 = await approval(privOhne, 'M820-04');
    const a01 = await approval(privOhne, 'M820-01');
    log('F-01 AFTER: privat_ohne_foerderung (voluntary answer blank) — M820-09 twin / D3; REQ-07 (M820-04) still waits for the answer; M820-01 missing', { ohne, a04, a01: a01.missing });
    expect(ohne).toEqual({ twin: 214000, d3: 1 });
    expect(a04.pending).toContain('REQ-07');
    expect(a01.missing).toContain('vergaberecht_freiwillig_angewendet');
  });

  it('g. F2 / item 4 (code fix) — absent register: no invented 0 on the save path, "not computed" on every path; empty {rows: []}: 0 on every path', async () => {
    const p = await makeProject('f2-registers');
    // 820-2-06: the save batch carries offene_punkte (2 complete rows); statusberichte is never saved (absent)
    const s06 = await save(p, '820-2-06', { offene_punkte: jv({ rows: [{ id: 'a', punkt: 'Pumpe', status: 'offen' }, { id: 'b', punkt: 'Folie', status: 'erledigt' }] }) });
    const r06 = await recompute(p.inst.get('820-2-06')!);
    const absent06 = {
      saveDerived: s06.ok ? s06.derived.length : -1,
      lop_count: await stored(p, '820-2-06', 'lop_count'),
      statusberichte_count: await stored(p, '820-2-06', 'statusberichte_count'),
      recomputeNotComputed: r06.notComputed.filter((x) => x.outputSymbol === 'statusberichte_count').map((x) => x.reason),
    };
    log('F2 820-2-06 — statusberichte ABSENT (sibling register saved)', absent06);
    expect(absent06.lop_count).toBe(1 + 1);
    expect(absent06.statusberichte_count).toBeNull(); // before the fix: 0 (invented) while recompute said "not computed"
    expect(absent06.recomputeNotComputed).toEqual(['Fehlende oder leere Eingaben: statusberichte']);
    // the same sheet with an explicitly EMPTY register
    await save(p, '820-2-06', { statusberichte: jv({ rows: [] }) });
    const r06e = await recompute(p.inst.get('820-2-06')!);
    const empty06 = { statusberichte_count: await stored(p, '820-2-06', 'statusberichte_count'), notComputed: r06e.notComputed.filter((x) => x.outputSymbol === 'statusberichte_count') };
    log('F2 820-2-06 — statusberichte EMPTY {rows: []}', empty06);
    expect(empty06).toEqual({ statusberichte_count: 0, notComputed: [] });

    // 820-2-03: korrespondenz never saved (absent) → nothing stored, recompute "not computed"; then {rows: []} → 0 / 0
    const r03 = await recompute(p.inst.get('820-2-03')!);
    const absent03 = { stored: [await stored(p, '820-2-03', 'korrespondenz_count'), await stored(p, '820-2-03', 'korrespondenz_nachverfolgung_offen')], reasons: r03.notComputed.filter((x) => x.outputSymbol?.startsWith('korrespondenz')).map((x) => x.reason) };
    log('F2 820-2-03 — korrespondenz ABSENT', absent03);
    expect(absent03).toEqual({ stored: ['none', 'none'], reasons: ['Fehlende oder leere Eingaben: korrespondenz', 'Fehlende oder leere Eingaben: korrespondenz'] });
    await save(p, '820-2-03', { korrespondenz: jv({ rows: [] }) });
    const r03e = await recompute(p.inst.get('820-2-03')!);
    const empty03 = { stored: [await stored(p, '820-2-03', 'korrespondenz_count'), await stored(p, '820-2-03', 'korrespondenz_nachverfolgung_offen')], notComputed: r03e.notComputed.filter((x) => x.outputSymbol?.startsWith('korrespondenz')) };
    log('F2 820-2-03 — korrespondenz EMPTY {rows: []}', empty03);
    expect(empty03).toEqual({ stored: [0, 0], notComputed: [] });

    // 820-2-24: gewaehrleistungen {rows: []} → warranty_count 0 on both paths; the Σ (sum_rows) stays "not computed" (an aggregate of nothing)
    await save(p, '820-2-24', { gewaehrleistungen: jv({ rows: [] }) });
    const r24 = await recompute(p.inst.get('820-2-24')!);
    const empty24 = { warranty_count: await stored(p, '820-2-24', 'warranty_count'), warranty_open_defects: await stored(p, '820-2-24', 'warranty_open_defects'), notComputed: r24.notComputed.map((x) => `${x.outputSymbol}: ${x.reason}`) };
    log('F2 820-2-24 — gewaehrleistungen EMPTY {rows: []}', empty24);
    expect(empty24.warranty_count).toBe(0);
    expect(empty24.notComputed.some((x) => x.startsWith('warranty_count'))).toBe(false);
  });

  it('h. the pre-deploy read-only query lists a counter the old save path invented (stored 0, register never saved) — and nothing for a saved empty register', async () => {
    const text = readFileSync(resolve(ROOT, 'scripts/verification/apply/predeploy-absent-register-counters.sql'), 'utf8');
    const stmts = text.split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim());
    expect(stmts).toHaveLength(1);
    // the prod state before the deploy: a derived 0 stored for statusberichte_count while statusberichte was never saved
    const old = await makeProject('old-save-path-state');
    const [f] = await harness.sql<{ id: string }[]>`SELECT f.id FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = '820-2-06' AND f.symbol = 'statusberichte_count'`;
    await harness.sql`INSERT INTO project_parameters (project_id, field_id, value_number, source_type, entered_by) VALUES (${old.id}, ${f.id}, 0, 'derived', ${USER_ID})`;
    const rows = [...(await harness.sql.unsafe(stmts[0]))] as unknown as Array<{ standard: string; project: string; ws: string; output_symbol: string; register: string; stored_counter: string; gates_reading_it: string | null }>;
    log('pre-deploy absent-register counters', rows.map((r) => `${r.standard} · ${r.project} · ${r.ws} · ${r.output_symbol} (${r.register}) = ${r.stored_counter} · gates: ${r.gates_reading_it}`));
    expect(rows.filter((r) => r.project === 'old-save-path-state')).toEqual([expect.objectContaining({ ws: '820-2-06', output_symbol: 'statusberichte_count', register: 'statusberichte', stored_counter: '0' })]);
    expect(rows.filter((r) => r.project === 'f2-registers')).toEqual([]); // saved empty registers are not listed; absent ones store nothing now
  });
});
