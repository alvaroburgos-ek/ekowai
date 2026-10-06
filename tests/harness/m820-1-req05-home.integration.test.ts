/**
 * DWA-M 820-1 REQ-05 re-home (M820-04 → M820-07) — embedded-Postgres proof of the staged block
 *   scripts/migrations/20261006180000_m820_1_req05_home.sql
 *   scripts/rollback-20261006180000-m820-1-req05-home.sql
 *   scripts/verification/apply/readback-20261006180000-m820-1-req05-home.sql
 * (apply order: vault 01-Projects/ekowai-wizard/m820-wizard-test/32_APPLY-ORDER-m820-1-req05-home.md).
 *
 * Disposable embedded Postgres only (embedded-pg.ts, schema from the Drizzle model) — no prod, no .env.local.
 * Auth seam: BYPASS_AUTH + BYPASS_AUTH_USER_ID, so the REAL saveWorksheet and the REAL checkApprovalGate run. The form's gate panel
 * is reproduced with the form's own pieces: own + inherited fields (loadInheritedFields), makeSymbolLookup, evaluateCondition
 * (= ComplianceBlock) — the evaluation that showed "FEHLEND: RISK_REGISTER, RISK_MITIGATION_PLAN" on M820-04 in prod.
 *
 * SEED (pre-state = prod after block 15): the 2026-10-05 dump tests/harness/m820-1-client-route.dump.json, consumer_worksheets from
 * src/lib/eval/field-configs/m820_1.prior.json (R-2 lead: risk_register → M820-07, M820-25; risk_mitigation_plan → M820-25), then
 * block 15 (20261005193000). "Rollback byte-equal" is measured against that state.
 * ROWS: synthetic (no client data) — one risk row on M820-06, one measure row on M820-07.
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
import { evaluateCondition } from '@/lib/compliance/evaluate';
import { makeSymbolLookup, type LookupValue } from '@/lib/compliance/symbol-lookup';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008f6';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261006180000_m820_1_req05_home.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006180000-m820-1-req05-home.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261006180000-m820-1-req05-home.sql');
const PRIOR_BLOCKS = ['scripts/migrations/20261005193000_m820_1_client_route.sql'].map((p) => resolve(ROOT, p));
const REQ05_MD5 = '6dd012ea1d023fd20fc913b50b417c6c';
const log = (label: string, v: unknown) => console.log(`[M820-1 REQ-05 HOME] ${label}: ${JSON.stringify(v)}`);
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
async function runFile(path: string): Promise<void> {
  const conn = await harness.sql.reserve();
  try { await conn.unsafe(readFileSync(path, 'utf8')); } finally { conn.release(); }
}
async function archiveCount(): Promise<number | null> {
  const [r] = await harness.sql<{ t: string | null }[]>`SELECT to_regclass('public.compliance_requirements_archive_m820_1_req05_home')::text AS t`;
  if (!r.t) return null;
  const [c] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM compliance_requirements_archive_m820_1_req05_home`;
  return c.n;
}

// ── project fixture (one project, every template) ──────────────────────────────────────────────────────────
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
type V = { type: 'json'; value: unknown };
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
async function storedJson(p: Proj, ws: string, symbol: string): Promise<unknown | 'none'> {
  const r = await harness.sql<{ v: unknown }[]>`SELECT pp.value_json AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
    JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE pp.project_id = ${p.id} AND w.code = ${ws} AND f.symbol = ${symbol}`;
  return r.length === 0 ? 'none' : r[0].v;
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
  return { ok: g.ok, failing: g.failingBlockConditions.map((c) => c.code).sort(), pending: g.pendingBlockConditions.map((c) => c.code).sort() };
}
const pick = (o: Record<string, unknown>, code: string) => Object.fromEntries(Object.entries(o).filter(([k]) => k.startsWith(`${code}/`)));

// synthetic rows (no client data)
const RISK = { rows: [{ id: 'r1', risiko: 'Baugrund unsicher', eintritt: 6, schaden: 5 }] };
const PLAN = { rows: [{ id: 'm1', risiko: 'Baugrund unsicher', massnahme: 'Baugrunderkundung vor Ausschreibung' }] };
let PRE: TableDump;
let both: Proj;
let noPlan: Proj;

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-1-req05-home@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820-1 REQ-05 home harness', ${'m820-1-r05-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${USER_ID}, 'owner')`;
  await seedDump('tests/harness/m820-1-client-route.dump.json', 'src/lib/eval/field-configs/m820_1.prior.json', '2020');
  for (const b of PRIOR_BLOCKS) await runFile(b); // block 15 = prod today
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadInheritedFields } = await import('@/lib/db/queries/worksheet'));
}, 240_000);

afterAll(async () => {
  await harness?.stop();
});

describe('DWA-M 820-1 REQ-05 re-home M820-04 → M820-07 — staged block on embedded Postgres (after block 15)', () => {
  it('a. pre-state: BROKEN BEFORE — REQ-05 on M820-04 stays pending (missing risk_mitigation_plan, risk_register) although both are saved', async () => {
    expect(await archiveCount()).toBeNull();
    const cons = await harness.sql<{ symbol: string; ws: string; cw: string[] | null }[]>`
      SELECT f.symbol, w.code AS ws, f.consumer_worksheets AS cw FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
       WHERE f.symbol IN ('risk_register', 'risk_mitigation_plan') ORDER BY 1`;
    log('consumer reach (pre-state)', cons);
    expect(cons.map((c) => [c.symbol, c.ws, c.cw])).toEqual([['risk_mitigation_plan', 'M820-07', ['M820-25']], ['risk_register', 'M820-06', ['M820-07', 'M820-25']]]);
    both = await makeProject('req05-both-saved');
    await save(both, 'M820-06', { risk_register: jv(RISK) });
    await save(both, 'M820-07', { risk_mitigation_plan: jv(PLAN) });
    expect([await storedJson(both, 'M820-06', 'risk_register'), await storedJson(both, 'M820-07', 'risk_mitigation_plan')]).toEqual([RISK, PLAN]);
    const p04 = await panel(both, 'M820-04');
    log('BEFORE: form panel on M820-04 (both saved)', pick(p04, 'REQ-05'));
    expect(pick(p04, 'REQ-05')).toEqual({ 'REQ-05/warn': { kind: 'pending', missing: ['risk_mitigation_plan', 'risk_register'] } });
    const a04 = await approval(both, 'M820-04');
    log('BEFORE: checkApprovalGate(M820-04) — REQ-05 is warn, not in the refusal', a04);
    expect([...a04.failing, ...a04.pending]).not.toContain('REQ-05');
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: REQ-05 on M820-07 (code / title / severity / condition / clause unchanged); archive 1; only compliance_requirements touched', async () => {
    await runFile(MIGRATION);
    const [g] = await harness.sql<{ id: string; code: string; ws: string; severity: string; condition: string; clause_reference: string; title_de: string; description: string }[]>`
      SELECT cr.id, cr.code, w.code AS ws, cr.severity, cr.condition, cr.clause_reference, cr.title_de, cr.description FROM compliance_requirements cr
        JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
       WHERE s.code = 'DWA-M-820-1' AND cr.code = 'REQ-05'`;
    log('REQ-05 after apply', `${g.code}@${g.ws}/${g.severity}/${g.clause_reference}/${md5(g.condition)}`);
    expect([g.code, g.ws, g.severity, g.clause_reference, md5(g.condition)]).toEqual(['REQ-05', 'M820-07', 'warn', '§4.7, Anh. A', REQ05_MD5]);
    const pre = PRE.compliance_requirements.map((x) => JSON.parse(x) as { id: string; title_de: string; severity: string; description: string }).find((x) => x.id === g.id)!;
    expect([g.title_de, g.severity]).toEqual([pre.title_de, pre.severity]);
    expect(g.description.startsWith(`${pre.description}\n[REQ-05 home, 2026-10-06] Blatt / sheet M820-07`)).toBe(true);
    expect(await archiveCount()).toBe(1);
    const diff = dumpDiff(PRE, await dump());
    log('apply diff (tables touched)', [...new Set(diff.map((l) => l.split(' ')[0]))]);
    expect(diff.map((l) => l.split(' ').slice(0, 2).join(' ')).sort()).toEqual(['compliance_requirements +', 'compliance_requirements -']);
  });

  it('c. apply again: 0 changes (full dump compare), archive unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    const diff = dumpDiff(before, await dump());
    log('re-apply diff', diff);
    expect(diff).toEqual([]);
    expect(await archiveCount()).toBe(1);
  });

  it('d. rollback: byte-equal to the pre-state, archive emptied; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    const diff = dumpDiff(PRE, after);
    log('rollback diff vs pre', diff);
    log('rollback digest', digest(after));
    expect(diff).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await archiveCount()).toBe(0);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await archiveCount()).toBe(0);
  });

  it('d2. the read-back file runs before and after an apply and shows the expected values', async () => {
    const text = readFileSync(READBACK, 'utf8');
    const stmts = splitOnUnquotedSemicolons(text).filter((s) => s.trim());
    expect(stmts).toHaveLength(4);
    expect(text.split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(4);
    const r0 = [...(await harness.sql.unsafe(stmts[0]))] as unknown as Array<{ code: string; ws: string; severity: string; clause_reference: string; md5_live: string; live_ok: boolean }>;
    log('read-back R0 (before)', r0);
    expect(r0).toEqual([{ code: 'REQ-05', ws: 'M820-04', severity: 'warn', clause_reference: '§4.7, Anh. A', md5_live: REQ05_MD5, live_ok: true }]);
    await runFile(MIGRATION);
    const res: unknown[][] = [];
    for (const st of stmts) res.push([...(await harness.sql.unsafe(st))]);
    log('read-back R0..R3 (after)', res);
    expect(res[1]).toEqual([{ code: 'REQ-05', ws: 'M820-07', severity: 'warn', clause_reference: '§4.7, Anh. A', cond_ok: true, note_ok: true }]);
    expect(res[2][0]).toEqual({ gate_archive: '1' });
    expect(res[3]).toEqual([{ ws: 'M820-04', gates: 'REQ-02/block, REQ-07/block, REQ-24/warn' }, { ws: 'M820-07', gates: 'REQ-05/warn' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('e. after the apply — through the real gate evaluation on M820-07: both saved → met; risk_mitigation_plan absent → pending warning; M820-04 no longer carries it', async () => {
    await runFile(MIGRATION);
    const p07 = await panel(both, 'M820-07');
    const p04 = await panel(both, 'M820-04');
    log('AFTER: panel M820-07 / M820-04 (both saved)', { p07: pick(p07, 'REQ-05'), p04: pick(p04, 'REQ-05') });
    expect(pick(p07, 'REQ-05')).toEqual({ 'REQ-05/warn': { kind: 'pass' } });
    expect(pick(p04, 'REQ-05')).toEqual({});

    noPlan = await makeProject('req05-plan-absent');
    await save(noPlan, 'M820-06', { risk_register: jv(RISK) });
    expect(await storedJson(noPlan, 'M820-07', 'risk_mitigation_plan')).toBe('none');
    const pNo = await panel(noPlan, 'M820-07');
    log('AFTER: panel M820-07 (risk_register saved, risk_mitigation_plan absent)', pick(pNo, 'REQ-05'));
    expect(pick(pNo, 'REQ-05')).toEqual({ 'REQ-05/warn': { kind: 'pending', missing: ['risk_mitigation_plan'] } });

    // approval: REQ-05 is warn — in neither refusal, before (a.) or after
    const a07 = await approval(both, 'M820-07');
    const a07no = await approval(noPlan, 'M820-07');
    log('AFTER: checkApprovalGate M820-07 (both) / (plan absent)', { a07, a07no });
    for (const a of [a07, a07no]) expect([...a.failing, ...a.pending]).not.toContain('REQ-05');
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });
});
