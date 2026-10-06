/**
 * DWA-M 820-1 M820-06 risk-analysis change log — embedded-Postgres proof of the staged block
 *   scripts/migrations/20261006170000_m820_1_risk_changes.sql
 *   scripts/rollback-20261006170000-m820-1-risk-changes.sql
 *   scripts/verification/apply/readback-20261006170000-m820-1-risk-changes.sql
 * (apply order: vault 01-Projects/ekowai-wizard/m820-wizard-test/27_APPLY-ORDER-m820-1-risk-changes.md).
 *
 * Disposable embedded Postgres only — no prod, no .env.local. BYPASS_AUTH seam: the REAL saveWorksheet (register materialiser +
 * register row warnings) and the REAL recomputeWorksheetEquations run.
 * SEED (pre-state = prod after block 15): the 2026-10-05 dump tests/harness/m820-1-client-route.dump.json (incl. equations and the
 * six regulation tables, edition 2020), consumer_worksheets from src/lib/eval/field-configs/m820_1.prior.json (R-2 lead), then
 * block 15 (20261005193000). "Rollback byte-equal" is measured against that state.
 * ROWS: synthetic (no client data) — two complete change rows; then one row without its required "begruendung".
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startHarness, type Harness } from './embedded-pg';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { recomputeWorksheetEquations as RecomputeWorksheetEquations } from '@/lib/actions/recompute-worksheet';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008f5';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261006170000_m820_1_risk_changes.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006170000-m820-1-risk-changes.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261006170000-m820-1-risk-changes.sql');
const PRIOR_BLOCKS = ['scripts/migrations/20261005193000_m820_1_client_route.sql'].map((p) => resolve(ROOT, p));
const log = (label: string, v: unknown) => console.log(`[M820-1 RISK-CHANGES] ${label}: ${JSON.stringify(v)}`);
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
async function stored(p: Proj, ws: string, symbol: string): Promise<number | null | 'none'> {
  const r = await harness.sql<{ v: string | null }[]>`SELECT pp.value_number::text AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
    JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE pp.project_id = ${p.id} AND w.code = ${ws} AND f.symbol = ${symbol}`;
  return r.length === 0 ? 'none' : r[0].v === null ? null : Number(r[0].v);
}

const ROW_A = { id: 'r1', datum: '2026-09-02', risiko_id: 'R-S2', aenderung: 'bewertung_geaendert', bewertung_alt: 'P 3 · S 3', bewertung_neu: 'P 2 · S 3', begruendung: 'Baugrund erkundet', quelle: 'C1 v1.3 → v1.4' };
const ROW_B = { id: 'r2', datum: '2026-09-08', risiko_id: 'R-P5', aenderung: 'neu', begruendung: 'Lieferzeit Folie', quelle: 'C1 v1.5 → v1.6' };
const NEW_SYMBOLS = ['risiko_aenderungen', 'risiko_aenderungen_count'];
let PRE: TableDump;

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-1-risk-changes@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820-1 risk changes harness', ${'m820-1-rc-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${USER_ID}, 'owner')`;
  await seedDump('tests/harness/m820-1-client-route.dump.json', 'src/lib/eval/field-configs/m820_1.prior.json', '2020');
  for (const b of PRIOR_BLOCKS) await runFile(b); // block 15 = prod today
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ recomputeWorksheetEquations: recompute } = await import('@/lib/actions/recompute-worksheet'));
}, 240_000);

afterAll(async () => {
  await harness?.stop();
});

describe('DWA-M 820-1 M820-06 risk-analysis change log — staged block on embedded Postgres (after block 15)', () => {
  it('a. pre-state: nothing of the block on M820-06', async () => {
    const [c] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM fields WHERE symbol IN ${harness.sql(NEW_SYMBOLS)}`;
    const [eq] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM equations WHERE equation_number = 'M820-06-D1'`;
    expect([c.n, eq.n]).toEqual([0, 0]);
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: 2 fields (register in section B, derived counter in section F) + equation M820-06-D1; nothing else changes', async () => {
    await runFile(MIGRATION);
    const f = await harness.sql<{ symbol: string; section: string; widget: string; is_required: boolean; cols: string | null }[]>`
      SELECT f.symbol, ws.code AS section, f.widget, f.is_required,
             (SELECT string_agg(c->>'key' || CASE WHEN (c->>'required')::boolean THEN '*' ELSE '' END, ',' ORDER BY o) FROM jsonb_array_elements(f.ui_config->'columns') WITH ORDINALITY AS t(c, o)) AS cols
        FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN worksheet_sections ws ON ws.id = f.section_id
       WHERE w.code = 'M820-06' AND f.symbol IN ${harness.sql(NEW_SYMBOLS)} ORDER BY 1`;
    log('new fields', f);
    expect([...f]).toEqual([
      { symbol: 'risiko_aenderungen', section: 'B', widget: 'register', is_required: false, cols: 'datum*,risiko_id*,aenderung*,bewertung_alt,bewertung_neu,begruendung*,quelle' },
      { symbol: 'risiko_aenderungen_count', section: 'F', widget: 'derived', is_required: false, cols: null },
    ]);
    const diff = dumpDiff(PRE, await dump());
    log('apply diff', diff.map((l) => l.slice(0, 120)));
    expect(diff.every((l) => l.startsWith('fields +') || l.startsWith('equations +'))).toBe(true);
    expect(diff).toHaveLength(3);
  });

  it('c. apply again: 0 changes', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    expect(dumpDiff(before, await dump())).toEqual([]);
  });

  it('d. rollback: byte-equal to the pre-state; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    log('rollback diff vs pre', dumpDiff(PRE, after));
    expect(dumpDiff(PRE, after)).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('d2. read-back runs before and after an apply with the expected values', async () => {
    const text = readFileSync(READBACK, 'utf8');
    const stmts = splitOnUnquotedSemicolons(text).filter((s) => s.trim());
    expect(stmts).toHaveLength(4);
    expect(text.split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(4);
    const [pre] = [...(await harness.sql.unsafe(stmts[0]))];
    expect(pre).toEqual({ fields: '0', equations: '0', saved_values: '0' });
    await runFile(MIGRATION);
    const res: unknown[][] = [];
    for (const st of stmts) res.push([...(await harness.sql.unsafe(st))]);
    log('read-back after', res);
    expect(res[0][0]).toEqual({ fields: '2', equations: '1', saved_values: '0' });
    expect((res[1] as Array<{ symbol: string; columns: string | null }>).map((r) => [r.symbol, r.columns])).toEqual([
      ['risiko_aenderungen', 'datum*, risiko_id*, aenderung*, bewertung_alt, bewertung_neu, begruendung*, quelle'], ['risiko_aenderungen_count', null]]);
    expect(res[2]).toEqual([expect.objectContaining({ equation_number: 'M820-06-D1', formula: 'risiko_aenderungen_count = count_rows(risiko_aenderungen)', gates: '0' })]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    await runFile(MIGRATION); // leave the block applied for the save-path case
  });

  it('e. REAL save path: 2 complete rows → counter 2, no register warning; a row without "begruendung" → warning, counter 1; never saved → not computed', async () => {
    const p = await makeProject('risk-changes');
    const ok = await save(p, 'M820-06', { risiko_aenderungen: jv({ rows: [ROW_A, ROW_B] }) });
    const okWarnings = ok.ok ? ok.warnings.filter((w) => w.includes('risiko_aenderungen')) : ['save failed'];
    const c2 = await stored(p, 'M820-06', 'risiko_aenderungen_count');
    const r2 = await recompute(p.inst.get('M820-06')!);
    log('2 complete rows', { counter: c2, warnings: okWarnings, recomputeNotComputed: r2.notComputed.filter((x) => x.outputSymbol === 'risiko_aenderungen_count') });
    expect(c2).toBe(2);
    expect(okWarnings).toEqual([]);
    expect(r2.notComputed.filter((x) => x.outputSymbol === 'risiko_aenderungen_count')).toEqual([]);

    const rowBWithoutReason = Object.fromEntries(Object.entries(ROW_B).filter(([k]) => k !== 'begruendung'));
    const bad = await save(p, 'M820-06', { risiko_aenderungen: jv({ rows: [ROW_A, rowBWithoutReason] }) });
    const badWarnings = bad.ok ? bad.warnings.filter((w) => w.includes('risiko_aenderungen')) : ['save failed'];
    const c1 = await stored(p, 'M820-06', 'risiko_aenderungen_count');
    log('row 2 without begruendung', { counter: c1, warnings: badWarnings });
    expect(c1).toBe(1);
    expect(badWarnings).toHaveLength(1);
    expect(badWarnings[0]).toContain('Zeile 2 unvollständig (Pflichtspalte begruendung fehlt)');

    const q = await makeProject('risk-changes-untouched');
    const rq = await recompute(q.inst.get('M820-06')!);
    log('never saved', { stored: await stored(q, 'M820-06', 'risiko_aenderungen_count'), notComputed: rq.notComputed.filter((x) => x.outputSymbol === 'risiko_aenderungen_count') });
    expect(await stored(q, 'M820-06', 'risiko_aenderungen_count')).toBe('none');
    expect(rq.notComputed.find((x) => x.outputSymbol === 'risiko_aenderungen_count')?.reason).toBe('Fehlende oder leere Eingaben: risiko_aenderungen');
  });
});
