/**
 * DWA-M 820-1 / -2 / -3 · project-size SELF-DECLARATION — embedded-Postgres proof of the staged block
 *   scripts/migrations/20261007100000_m820_project_size_declaration.sql
 *   scripts/rollback-20261007100000-m820-project-size-declaration.sql
 *   scripts/verification/apply/readback-20261007100000-m820-project-size-declaration.sql
 * (apply order: vault 01-Projects/ekowai-wizard/m820-wizard-test/49_APPLY-ORDER-m820-project-size-declaration.md, sign-off 50_).
 *
 * Disposable embedded Postgres only — no prod, no .env.local. REAL saveWorksheet / checkApprovalGate / loadInheritedSymbolsForTemplate /
 * loadSameSymbolValues, and the worksheet page's step-2 prefill composed from its REAL pure helpers (selectPrefillUpstreams →
 * unambiguous check → coerceSameSymbolValue → crossStandardCarryNote), in the order page.tsx step 2 calls them.
 * SEED (= prod 2026-10-07): the three 2026-10-05 dumps + prior.json consumers, every M820 block applied on prod (client route …
 * Projektstopp paths, guideline criteria 20261006240000). Read-back R0 untouched_ok pins the seeded 820-2-01 project_size /
 * complexity_level to the md5s of the LIVE rows (prod-query 2026-10-07). ROWS: synthetic projects, no client data.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startHarness, type Harness } from './embedded-pg';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { checkApprovalGate as CheckApprovalGate, loadInheritedSymbolsForTemplate as LoadInheritedSymbolsForTemplate } from '@/lib/actions/approval-gate';
import type { loadSameSymbolValues as LoadSameSymbolValues } from '@/lib/db/queries/worksheet';
import { coerceSameSymbolValue, type EnumOption } from '@/lib/eval/same-symbol-prefill';
import { crossStandardCarryNote, selectPrefillUpstreams } from '@/lib/projects/cross-standard-carry';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008fc';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261007100000_m820_project_size_declaration.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261007100000-m820-project-size-declaration.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261007100000-m820-project-size-declaration.sql');
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
].map((p) => resolve(ROOT, p));
const LIVE_PHASE: Record<string, Array<[number, number, number]>> = {
  'DWA-M-820-1': [[1, 3, 1], [4, 9, 2], [10, 15, 3], [16, 20, 4], [21, 23, 5], [24, 25, 6]],
  'DWA-M-820-2': [[1, 4, 1], [5, 10, 2], [11, 15, 3], [16, 19, 4], [20, 24, 5], [25, 28, 6]],
  'DWA-M-820-3': [[1, 3, 1], [4, 6, 2], [7, 10, 3], [11, 18, 4], [19, 21, 5], [22, 24, 6]],
};
const log = (label: string, v: unknown) => console.log(`[M820 PROJECT SIZE] ${label}: ${JSON.stringify(v)}`);
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
let loadInheritedSymbolsForTemplate: typeof LoadInheritedSymbolsForTemplate;
let loadSameSymbolValues: typeof LoadSameSymbolValues;

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
const RB_STMTS = splitOnUnquotedSemicolons(readFileSync(READBACK, 'utf8')).filter((s) => s.replace(/--.*$/gm, '').trim());
async function readback(): Promise<unknown[][]> { const out: unknown[][] = []; for (const st of RB_STMTS) out.push([...(await harness.sql.unsafe(st))]); return out; }

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
type V = { type: 'enum'; value: string } | { type: 'text'; value: string };
const e = (value: string): V => ({ type: 'enum', value });
const t = (value: string): V => ({ type: 'text', value });
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
async function stored(p: Proj): Promise<string[]> {
  const r = await harness.sql<{ ws: string; symbol: string; v: string | null }[]>`
    SELECT w.code AS ws, f.symbol, COALESCE(pp.value_enum, pp.value_text) AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
      JOIN worksheet_templates w ON w.id = f.worksheet_template_id
     WHERE pp.project_id = ${p.id} AND f.symbol IN ('project_size', 'project_size_begruendung') ORDER BY 1, 2`;
  return r.map((x) => `${x.ws}:${x.symbol}=${x.v}`);
}
async function tmpl(ws: string): Promise<{ id: string; std: string }> {
  const [r] = await harness.sql<{ id: string; std: string }[]>`SELECT w.id, s.code AS std FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE w.code = ${ws}`;
  return r;
}
/** Worksheet page step 2 for `project_size` on `ws` (page.tsx: same-symbol upstreams → allow-list filter → unambiguous → coerce → note). */
async function pagePrefill(p: Proj, ws: string): Promise<{ candidates: string[]; prefill: unknown; from: string | null; note: string | null }> {
  const { id, std } = await tmpl(ws);
  const [f] = await harness.sql<{ data_type: string; enum_values: EnumOption[] | null }[]>`
    SELECT data_type, enum_values FROM fields WHERE worksheet_template_id = ${id} AND symbol = 'project_size'`;
  const same = await loadSameSymbolValues(p.id, id, ['project_size']);
  const ups = selectPrefillUpstreams('project_size', std, same.get('project_size') ?? []);
  const candidates = ups.map((u) => `${u.worksheetCode}:${String(u.value)}`).sort();
  if (ups.length === 0) return { candidates, prefill: null, from: null, note: null };
  const ambiguous = ups.length > 1 && !ups.every((u) => u.value === ups[0].value); // string tokens: the page's sameSymbolValueEqual reduces to ===
  if (ambiguous) return { candidates, prefill: null, from: null, note: null };
  const coerced = coerceSameSymbolValue(f.data_type, ups[0].value, f.enum_values);
  const note = ups[0].isFromCurrentStandard ? null : crossStandardCarryNote('project_size', ups[0].sourceStandardCode, std);
  return { candidates, prefill: coerced, from: coerced ? ups[0].worksheetCode : null, note };
}

const TOKENS = 'klein:Klein:Small, mittel:Mittel:Medium, gross:Groß:Large';
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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-project-size@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820 project size harness', ${'m820-ps-' + Date.now()}) RETURNING id`;
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
  for (const blk of PRIOR_BLOCKS) await runFile(blk); // = prod 2026-10-07
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate, loadInheritedSymbolsForTemplate } = await import('@/lib/actions/approval-gate'));
  ({ loadSameSymbolValues } = await import('@/lib/db/queries/worksheet'));
}, 900_000);

afterAll(async () => {
  await harness?.stop();
});

describe('DWA-M 820 project-size declaration — staged block on embedded Postgres (seed = prod 2026-10-07)', () => {
  it('a. pre-state: none of the three fields; read-back R0 = 0 / 0 / untouched_ok true (seeded 820-2-01 rows = LIVE md5s); R2 nothing reads the size', async () => {
    const r = await readback();
    log('BEFORE read-back', r);
    expect(r[0]).toEqual([{ new_fields: '0', saved_values: '0', untouched_ok: true }]);
    expect(r[1]).toEqual([expect.objectContaining({ std: 'DWA-M-820-2', ws: '820-2-01', symbol: 'project_size', is_required: true, tokens: TOKENS })]);
    expect(r[2]).toEqual([{ gates: '0', equations: '0', visible_when: '0', section_visible: '0' }]);
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: exactly 3 field rows added (section B, optional, no widget / visible_when); the copies carry the identical tokens + labels', async () => {
    await runFile(MIGRATION);
    const diff = dumpDiff(PRE, await dump());
    log('apply diff', diff.map((l) => l.slice(0, 140)));
    expect(diff).toHaveLength(3);
    expect(diff.every((l) => l.startsWith('fields +'))).toBe(true);
    const rows = await harness.sql<{ std: string; ws: string; symbol: string; sec: string; data_type: string; is_required: boolean; widget: string | null; visible_when: string | null; ev: unknown; desc_ok: boolean }[]>`
      SELECT s.code AS std, w.code AS ws, f.symbol, ws.code AS sec, f.data_type, f.is_required, f.widget, f.visible_when,
             (SELECT jsonb_agg(jsonb_build_object('value', x->'value', 'label_de', x->'label_de', 'label_en', x->'label_en') ORDER BY (x->>'order_index')::int) FROM jsonb_array_elements(f.enum_values) x) AS ev,
             (f.description LIKE '%keine Größenklassen%' AND f.description LIKE '%[EN]%' AND f.description LIKE '%relaxes no printed requirement%') AS desc_ok
        FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
        JOIN worksheet_sections ws ON ws.id = f.section_id
       WHERE (s.code, w.code, f.symbol) IN (('DWA-M-820-2','820-2-01','project_size_begruendung'),('DWA-M-820-1','M820-01','project_size'),('DWA-M-820-3','M8203-01','project_size'),('DWA-M-820-2','820-2-01','project_size'))
       ORDER BY 1, 3`;
    log('fields', rows.map((r) => ({ ...r, ev: r.ev ? 'tokens' : null })));
    const primary = rows.find((r) => r.ws === '820-2-01' && r.symbol === 'project_size')!;
    expect(primary.is_required).toBe(true);
    for (const r of rows.filter((x) => x !== primary)) {
      expect([r.sec, r.is_required, r.widget, r.visible_when, r.desc_ok], `${r.ws} ${r.symbol}`).toEqual(['B', false, null, null, true]);
    }
    expect(rows.find((r) => r.symbol === 'project_size_begruendung')!.data_type).toBe('text');
    for (const ws of ['M820-01', 'M8203-01']) {
      const c = rows.find((r) => r.ws === ws)!;
      expect([c.symbol, c.data_type]).toEqual(['project_size', 'enum']);
      expect(c.ev).toEqual(primary.ev); // identical value / label_de / label_en, in order
    }
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

  it('d2. read-back after an apply: R0 3 / 0 / true, R1 four rows, R2 nothing reads the size', async () => {
    expect(RB_STMTS).toHaveLength(4);
    await runFile(MIGRATION);
    const r = await readback();
    log('AFTER read-back', r);
    expect(r[0]).toEqual([{ new_fields: '3', saved_values: '0', untouched_ok: true }]);
    expect((r[1] as Array<Record<string, unknown>>).map((x) => [x.std, x.ws, x.symbol, x.section, x.data_type, x.is_required, x.tokens])).toEqual([
      ['DWA-M-820-1', 'M820-01', 'project_size', 'B', 'enum', false, TOKENS],
      ['DWA-M-820-2', '820-2-01', 'project_size', 'B', 'enum', true, TOKENS],
      ['DWA-M-820-2', '820-2-01', 'project_size_begruendung', 'B', 'text', false, null],
      ['DWA-M-820-3', 'M8203-01', 'project_size', 'B', 'enum', false, TOKENS],
    ]);
    expect(r[2]).toEqual([{ gates: '0', equations: '0', visible_when: '0', section_visible: '0' }]);
    expect(r[3]).toEqual([]);
  });

  it('e. REAL save path: the three fields persist; only 820-2-01 project_size is required; the copies and the reason are never missing', async () => {
    const p = await makeProject('size declared on all three sheets');
    await save(p, '820-2-01', { project_size: e('klein'), project_size_begruendung: t('Synthetisch: eine Maßnahme, Baukosten rund 0,3 Mio. €, ein Ansprechpartner beim Auftraggeber.') });
    await save(p, 'M820-01', { project_size: e('klein') });
    await save(p, 'M8203-01', { project_size: e('klein') });
    const s = await stored(p);
    log('stored', s);
    expect(s).toEqual([
      '820-2-01:project_size=klein',
      '820-2-01:project_size_begruendung=Synthetisch: eine Maßnahme, Baukosten rund 0,3 Mio. €, ein Ansprechpartner beim Auftraggeber.',
      'M820-01:project_size=klein',
      'M8203-01:project_size=klein',
    ]);
    const [rb] = await readback();
    expect(rb).toEqual([{ new_fields: '3', saved_values: '3', untouched_ok: true }]);

    const q = await makeProject('size not declared anywhere');
    const missing: Record<string, string[]> = {};
    for (const ws of ['820-2-01', 'M820-01', 'M8203-01']) {
      const g = await checkApprovalGate(q.inst.get(ws)!);
      missing[ws] = g.missingRequiredFields.map((f) => f.symbol).filter((x) => x.startsWith('project_size'));
    }
    log('missing required (size symbols only), nothing declared', missing);
    expect(missing).toEqual({ '820-2-01': ['project_size'], 'M820-01': [], 'M8203-01': [] });
  });

  it('f. prefill of the copies (page step 2): the 820-2-01 answer is offered while agreed; no carry note (not on the allow-list); A4 does not count it', async () => {
    const p = await makeProject('size only on 820-2-01');
    expect(await pagePrefill(p, 'M8203-01')).toEqual({ candidates: [], prefill: null, from: null, note: null }); // nothing saved → nothing offered
    await save(p, '820-2-01', { project_size: e('mittel') });
    const on1 = await pagePrefill(p, 'M820-01');
    const on3 = await pagePrefill(p, 'M8203-01');
    log('prefill with only 820-2-01 = mittel', { on1, on3 });
    expect(on1).toEqual({ candidates: ['820-2-01:mittel'], prefill: { type: 'enum', value: 'mittel' }, from: '820-2-01', note: null });
    expect(on3).toEqual({ candidates: ['820-2-01:mittel'], prefill: { type: 'enum', value: 'mittel' }, from: '820-2-01', note: null });
    // own-value rule A4: an enum of another standard never counts for the copy (it is optional anyway)
    const a4 = [...(await loadInheritedSymbolsForTemplate(p.id, (await tmpl('M8203-01')).id))];
    log('A4 set on M8203-01 contains project_size?', a4.includes('project_size'));
    expect(a4).not.toContain('project_size');
    // the answers disagree → ambiguous → no prefill on the third sheet
    await save(p, 'M820-01', { project_size: e('klein') });
    const amb = await pagePrefill(p, 'M8203-01');
    log('prefill on M8203-01 when 820-2-01 = mittel and M820-01 = klein', amb);
    expect(amb).toEqual({ candidates: ['820-2-01:mittel', 'M820-01:klein'], prefill: null, from: null, note: null });
    // agreement again → offered again
    await save(p, 'M820-01', { project_size: e('mittel') });
    expect((await pagePrefill(p, 'M8203-01')).prefill).toEqual({ type: 'enum', value: 'mittel' });
    // nothing reads the size: no gate in the three standards names it
    const [g] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM compliance_requirements WHERE condition ~ '\\mproject_size'`;
    expect(g.n).toBe(0);
    // the rollback deletes the saved copy values with their fields and is still byte-equal for the definition tables
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await stored(p)).toEqual(['820-2-01:project_size=mittel']);
  });
});
