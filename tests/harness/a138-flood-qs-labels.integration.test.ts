/**
 * DWA-A 138-1 · A138-26 flood proof — F-A9 (Q_S_flood) + labels after F-A7 (2026-10-15) — embedded-Postgres proof of
 *   scripts/migrations/20261015120000_a138_flood_qs_labels.sql
 *   scripts/rollback-20261015120000-a138-flood-qs-labels.sql
 *   scripts/verification/apply/readback-20261015120000-a138-flood-qs-labels.sql
 * (apply order + behaviour list: vault 01-Projects/ekowai-wizard/m820-wizard-test/75_APPLY-ORDER-a138-flood-qs-labels.md).
 *   F-A9 · A138-26 Q_S_flood retired (active = false): Gl. (10) reads Q_S, inherited from its single producer A138-12 (Gl. (4)); the
 *          typed duplicate never entered Gl. (10). Proven through the REAL server recompute (recomputeWorksheetEquations → the report
 *          evaluator → saveWorksheet): V_Rück follows the A138-12 Q_S before AND after the block, a typed Q_S_flood never moves it.
 *   F-A7 labels · A138-26 r_D_30 relabelled r_D(T_n,Ü) (legacy 1D table only); T_n_Ue hint „leer = 30 a; 100 a, wenn …“.
 *
 * Disposable embedded Postgres only — no prod, no .env.local. REAL saveWorksheet / checkApprovalGate / loadInheritedFields /
 * recomputeWorksheetEquations. SEED: the DWA-A-138-1 encoding dump of prod taken 2026-10-15 (READ ONLY,
 * scripts/verification/dump-standard-encoding.mjs) + the consumer_worksheets capture of the same day (READ ONLY transaction). The block's
 * pre-signatures were read on prod the same day and are reproduced from this seed (test a); read-back R0 on prod (step 0) showed
 * fields_pre 3 on 2026-10-15. ROWS: synthetic projects, no client data. Rainfall: the KOSTRA-DWD-2020 T 30 / T 100 columns of the F-A7
 * hand calculation (flood-return-period.test.ts on fix/flood-check-t100), synthetic project.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startHarness, type Harness } from './embedded-pg';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { loadInheritedFields as LoadInheritedFields } from '@/lib/db/queries/worksheet';
import type { recomputeWorksheetEquations as RecomputeWorksheetEquations } from '@/lib/actions/recompute-worksheet';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000a1fa9';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261015120000_a138_flood_qs_labels.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261015120000-a138-flood-qs-labels.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261015120000-a138-flood-qs-labels.sql');
const DUMP = 'tests/harness/a138-flood-qs-labels.dump.json';
const CONSUMERS = 'tests/harness/a138-flood-qs-labels.consumers.json';
/** worksheet_templates.phase on prod (encoding snapshot; A138-01…12 re-read 2026-10-15). */
const PHASE: Array<[number, number, number]> = [[1, 3, 1], [4, 9, 2], [10, 14, 3], [15, 23, 4], [24, 25, 5], [26, 28, 6]];
const log = (label: string, v: unknown) => {
  const line = `[A138 FLOOD QS LABELS] ${label}: ${JSON.stringify(v)}`;
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
  value_columns: unknown; override_policy: string;
  rows: Array<{ row_key: string; keys: unknown; group_label: string | null; label_de: string; row_values: unknown; verbatim_quote: string }> | null;
};
type Dump = {
  standard: { id: string; code: string; title_de: string; title_en: string | null; version: string };
  worksheets: Array<{ id: string; code: string; title_de: string; title_en: string | null; order_index: number }>;
  sections: Array<{ id: string; worksheet: string; parent_section_id: string | null; code: string | null; title_de: string; title_en: string | null; order_index: number; visible_when: string | null }>;
  fields: DumpField[];
  equations: Array<{ id: string; worksheet: string; equation_number: string; formula: string; output_symbol: string | null; output_unit: string | null; input_symbols: string[] | null; clause_reference: string | null }>;
  gates: Array<{ id: string; worksheet: string; code: string; title_de: string; title_en: string | null; description: string | null; suggestion: string | null; severity: string; condition: string; clause_reference: string | null }>;
  tables: DumpTable[];
};
const readJson = <T>(p: string): T => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8').replace(/^﻿/, '')) as T;

let harness: Harness;
let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;
let loadInheritedFields: typeof LoadInheritedFields;
let recomputeWorksheetEquations: typeof RecomputeWorksheetEquations;

async function seedDump(): Promise<void> {
  const sql = harness.sql;
  const d = readJson<Dump>(DUMP);
  const cons = readJson<Record<string, { consumer_worksheets?: string[] | null }>>(CONSUMERS);
  await sql`INSERT INTO standards (id, code, title_de, title_en, version) VALUES (${d.standard.id}, ${d.standard.code}, ${d.standard.title_de}, ${d.standard.title_en}, ${d.standard.version})`;
  const tmpl = new Map<string, string>();
  for (const w of d.worksheets) {
    const ph = PHASE.find(([a, b]) => w.order_index >= a && w.order_index <= b)?.[2] ?? null;
    await sql`INSERT INTO worksheet_templates (id, standard_id, code, title_de, title_en, order_index, phase)
              VALUES (${w.id}, ${d.standard.id}, ${w.code}, ${w.title_de}, ${w.title_en}, ${w.order_index}, ${ph})`;
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
    const cw = cons[`${f.worksheet} ${f.symbol}`]?.consumer_worksheets ?? null;
    await sql`INSERT INTO fields (id, worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required,
                enum_values, validation_rules, clause_reference, description, consumer_worksheets, order_index, verification_status,
                source_anchor, active, default_value, widget, ui_config, lookup, visible_when)
              VALUES (${f.id}, ${tmpl.get(f.worksheet)!}, ${f.section_id}, ${f.symbol}, ${f.label_de}, ${f.label_en}, ${f.data_type},
                ${f.unit}, ${f.is_required}, ${j(f.enum_values)}, ${j(f.validation_rules)}, ${f.clause_reference}, ${f.description},
                ${cw}, ${f.order_index}, ${f.verification_status}, ${f.source_anchor}, ${f.active}, ${j(f.default_value)}, ${f.widget},
                ${j(f.ui_config)}, ${j(f.lookup)}, ${f.visible_when})`;
  }
  for (const e of d.equations) {
    await sql`INSERT INTO equations (id, worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference)
              VALUES (${e.id}, ${tmpl.get(e.worksheet)!}, ${e.equation_number}, ${e.formula}, ${e.input_symbols}, ${e.output_symbol}, ${e.output_unit}, ${e.clause_reference})`;
  }
  for (const g of d.gates) {
    await sql`INSERT INTO compliance_requirements (id, worksheet_template_id, code, title_de, title_en, condition, description, clause_reference, severity, suggestion)
              VALUES (${g.id}, ${tmpl.get(g.worksheet)!}, ${g.code}, ${g.title_de}, ${g.title_en}, ${g.condition}, ${g.description}, ${g.clause_reference}, ${g.severity}, ${g.suggestion})`;
  }
  for (const t of d.tables) {
    await sql`INSERT INTO regulation_tables (id, standard_code, edition, table_code, title_de, clause_reference, page_ref, key_columns, value_columns, override_policy, verification_status)
              VALUES (${t.id}, ${d.standard.code}, '2024-10', ${t.table_code}, ${t.title_de}, ${t.clause_reference}, ${t.page_ref}, ${t.key_columns}, ${sql.json(t.value_columns as never)}, ${t.override_policy}, 'md_verified')`;
    let i = 0;
    for (const r of t.rows ?? []) {
      await sql`INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
                VALUES (${t.id}, ${r.row_key}, ${sql.json(r.keys as never)}, ${r.group_label}, ${r.label_de}, ${i}, ${sql.json(r.row_values as never)}, ${r.verbatim_quote})`;
      i++;
    }
  }
  log('seeded DWA-A-138-1', { worksheets: d.worksheets.length, fields: d.fields.length, active: d.fields.filter((f) => f.active).length, equations: d.equations.length, gates: d.gates.length, tables: d.tables.length });
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
const LEDGERS = ['fields_archive_a138_fqs', 'a138_fqs_written'];
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
const EMPTY = { fields_archive_a138_fqs: 0, a138_fqs_written: 0 };
const FULL = { fields_archive_a138_fqs: 3, a138_fqs_written: 3 };
const RB_STMTS = splitOnUnquotedSemicolons(readFileSync(READBACK, 'utf8')).filter((s) => s.replace(/--.*$/gm, '').trim());
/** R4 reads the block's ledgers, which exist only after an apply — before the apply run R0 … R3 (step 0 on prod). */
async function readback(n = RB_STMTS.length): Promise<unknown[][]> { const out: unknown[][] = []; for (const st of RB_STMTS.slice(0, n)) out.push([...(await harness.sql.unsafe(st))]); return out; }
const SIG = `md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, f.active::text))`;
const sigs = async () => Object.fromEntries((await harness.sql.unsafe<{ k: string; sig: string }[]>(
  `SELECT w.code || ' ' || f.symbol AS k, ${SIG} AS sig FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
    WHERE w.code = 'A138-26' AND f.symbol IN ('Q_S_flood','r_D_30','T_n_Ue') ORDER BY 1`)).map((r) => [r.k, r.sig]));
const SIG0 = { 'A138-26 Q_S_flood': 'f5447c2739c8beda2ff1b400c02c03ea', 'A138-26 T_n_Ue': '6ebeab92c877bf70d1495f0d06791fb3', 'A138-26 r_D_30': '415570e4a1dbb034bbe1f383ab20ef2f' };

// ── project fixture (one project, every template) ─────────────────────────────────────────────────────────────────
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
type V = { type: 'number'; value: number } | { type: 'json'; value: unknown };
const n = (value: number): V => ({ type: 'number', value });
const js = (value: unknown): V => ({ type: 'json', value });
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
const missingReq = async (p: Proj, ws: string) => (await checkApprovalGate(p.inst.get(ws)!)).missingRequiredFields.map((f) => f.symbol).sort();
const ownActive = async (ws: string) => (await harness.sql<{ s: string }[]>`
  SELECT f.symbol AS s FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = ${ws} AND f.active ORDER BY 1`).map((r) => r.s);
const inheritedOn = async (ws: string) => {
  const [t] = await harness.sql<{ id: string; standard_id: string }[]>`SELECT id, standard_id FROM worksheet_templates WHERE code = ${ws}`;
  return (await loadInheritedFields(t.id, t.standard_id, ws)).map((f) => `${f.symbol}←${f.originWorksheetCode}`).sort();
};
/** The REAL server recompute of A138-26, then the stored V_Rück. */
async function vRueck(p: Proj): Promise<{ value: number | null; notComputed: string[] }> {
  const r = await recomputeWorksheetEquations(p.inst.get('A138-26')!);
  const [row] = await harness.sql<{ v: string | null }[]>`SELECT pp.value_number::text AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
    JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE pp.project_id = ${p.id} AND w.code = 'A138-26' AND f.symbol = 'V_Rueck'`;
  return { value: row?.v == null ? null : Number(row.v), notComputed: r.notComputed.filter((x) => x.equationNumber === '10').map((x) => x.reason) };
}

// ── Gl. (10) inputs (F-A7 hand calculation, KOSTRA-DWD-2020 cell 151093, synthetic project) ─────────────────────
const D = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 540, 720, 1080, 1440, 2880, 4320, 5760, 7200, 8640, 10080];
const T30 = [500, 328.3, 252.2, 208.3, 158.3, 119.6, 97.8, 73.7, 60.1, 45.1, 36.8, 27.5, 20.6, 16.8, 12.6, 10.3, 6.3, 4.7, 3.8, 3.3, 2.9, 2.6];
const T100 = [630, 413.3, 317.8, 261.7, 198.9, 150.4, 123.1, 92.6, 75.6, 56.7, 46.3, 34.7, 26, 21.2, 15.8, 12.9, 7.9, 5.9, 4.8, 4.1, 3.6, 3.2];
const GRID = { tables: [{ id: 'k151093', name: 'KOSTRA-DWD-2020 Zelle 151093', source: 'KOSTRA-DWD-2020', columns: [30, 100], rows: D.map((d, i) => ({ D_min: d, r: { '30': T30[i], '100': T100[i] } })) }] };
const AcS = 602.161; const A_VA = 50; const Q_Dr = 0; const V_VA = 70.00375052159998;
/** Hand value, § 5.3.4.1 Gl. (10) on the T 30 column (main = pre-F-A7; T_n_Ue = 30 there either way): max over D, floored at 0. */
const hand = (qs: number) => Math.max(0, ...D.map((d, i) => ((T30[i] * (AcS + A_VA)) / 10000 - (qs + Q_Dr)) * d * 60 / 1000 - V_VA));

let PRE: TableDump;
const P: Record<string, Proj> = {};
const MISSING_26_BEFORE: string[] = [];

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'a138-flood-qs-labels@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('A138 flood QS labels harness', ${'a138-fqs-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${USER_ID}, 'owner')`;
  await seedDump(); // = prod 2026-10-15
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadInheritedFields } = await import('@/lib/db/queries/worksheet'));
  ({ recomputeWorksheetEquations } = await import('@/lib/actions/recompute-worksheet'));

  P.blank = await makeProject('A138-26 nothing entered');
  P.calc = await makeProject('A138-26 Gl. 10 driven: A138-12 Q_S 0.0015, typed Q_S_flood 999 (dead)');
  await save(P.calc, 'A138-04', { r_D_n_table: js(GRID) });
  await save(P.calc, 'A138-10', { A_VA: n(A_VA) });
  await save(P.calc, 'A138-12', { Q_S: n(0.0015) });
  await save(P.calc, 'A138-13', { V_VA: n(V_VA) });
  await save(P.calc, 'A138-20', { Q_Dr: n(Q_Dr) });
  await save(P.calc, 'A138-26', { A_C_s_flood: n(AcS), T_n_Ue: n(30), Q_S_flood: n(999) });
}, 900_000);

afterAll(async () => {
  await harness?.stop();
});

describe('DWA-A 138-1 A138-26 F-A9 + F-A7 labels — staged block on embedded Postgres (seed = prod 2026-10-15)', () => {
  it('a. pre-state: signatures = prod step 0 (read-back R0 fields_pre 3, R3 producer link); behaviour BEFORE through the real paths', async () => {
    expect(await ledgers()).toEqual({ fields_archive_a138_fqs: null, a138_fqs_written: null });
    expect(await sigs()).toEqual(SIG0);
    const r = await readback(4);
    log('BEFORE read-back R0..R3', r);
    expect(r[0]).toEqual([{ fields: '3', fields_pre: '3', fields_post: '0', fields_neither: null }]);
    expect((r[1] as Array<{ symbol: string; active: boolean; req: boolean }>).map((x) => `${x.symbol} ${x.active} ${x.req}`))
      .toEqual(['Q_S_flood true true', 'T_n_Ue true true', 'r_D_30 true false']);
    expect((r[2] as Array<{ q_s_flood_saved: string; q_s_a138_12: string }>).map((x) => `${Number(x.q_s_flood_saved)} ${Number(x.q_s_a138_12)}`)).toEqual(['999 0.0015']);
    expect(r[3]).toEqual([{ a138_12_q_s_feeds_26: true, gl10_reads_q_s: true, readers_of_q_s_flood: '0' }]);
    // behaviour before
    expect(await ownActive('A138-26')).toContain('Q_S_flood');
    const inh = await inheritedOn('A138-26');
    expect(inh).toContain('Q_S←A138-12');
    expect(inh.filter((s) => s.startsWith('Q_S_final'))).toEqual([]); // A138-24 is not in the chain
    const miss = await missingReq(P.blank, 'A138-26');
    MISSING_26_BEFORE.push(...miss);
    expect(miss).toContain('Q_S_flood');
    const v = await vRueck(P.calc);
    log('BEFORE A138-26 missing required (blank) / V_Rück (calc)', { miss, v, hand: hand(0.0015) });
    expect(v.notComputed).toEqual([]);
    expect(v.value).toBeCloseTo(31.6400624064, 9); // F-A7 hand value T 30 @ D 10080 (Q_S 0.0015 ← A138-12; Q_S_flood 999 ignored)
    expect(v.value).toBeCloseTo(hand(0.0015), 9);
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: 3 fields changed, nothing else; touched texts DE + [EN] with the verbatim quotes; labels present', async () => {
    await runFile(MIGRATION);
    const diff = dumpDiff(PRE, await dump());
    log('apply diff (table / sign counts)', tally(diff));
    expect(tally(diff)).toEqual({ 'fields +': 3, 'fields -': 3 });
    expect(await ledgers()).toEqual(FULL);
    const rows = await harness.sql<{ symbol: string; active: boolean; is_required: boolean; label_de: string; label_en: string | null; unit: string | null; description: string }[]>`
      SELECT f.symbol, f.active, f.is_required, f.label_de, f.label_en, f.unit, f.description FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
       WHERE w.code = 'A138-26' AND f.symbol IN ('Q_S_flood','r_D_30','T_n_Ue') ORDER BY 1`;
    const by = Object.fromEntries(rows.map((x) => [x.symbol, x]));
    expect(rows.filter((x) => !x.description.includes('\n[EN] '))).toEqual([]);
    // F-A9
    expect(by.Q_S_flood).toMatchObject({ active: false, is_required: true, label_de: 'Versickerungsleistung Q_S (Überflutungsfall)' });
    expect(by.Q_S_flood.description).toContain('„Q_S l/s Versickerungsleistung (nach Gl. (4))“');
    // F-A7 labels
    expect(by.r_D_30).toMatchObject({ active: true, is_required: false, unit: 'l/(s·ha)', label_de: 'Regenspende r_D(T_n,Ü) – nur bei Alt-Tabelle (1D)', label_en: 'Rainfall intensity r_D(T_n,Ü) – legacy 1D table only' });
    expect(by.T_n_Ue).toMatchObject({ active: true, is_required: true, label_de: 'Wiederkehrzeit Überflutung T_n,Ü' });
    expect(by.T_n_Ue.description.startsWith('leer = 30 a; 100 a, wenn die befestigten Flächen zu mehr als 70 % aus Dachflächen und nicht überflutbaren Flächen bestehen (§ 5.3.4.1).')).toBe(true);
    const q70 = '„Bestehen die befestigten Flächen des Grundstücks zum Beispiel um mehr als 70 % aus Dachflächen und nicht überflutbaren Flächen, wie Innenhöfe, ist die Überflutungsprüfung nach DIN 1986-100 für eine Wiederkehrzeit T_n = 100 Jahren nach Gl. (10) für Regenspenden r_D(100) iterativ zu führen.“';
    expect([by.r_D_30.description.includes(q70), by.T_n_Ue.description.includes(q70)]).toEqual([true, true]);
    log('post-state signatures (read-back R0 sig1)', await sigs());
  });

  it('c. apply again: 0 changes (full dump compare), ledgers unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    expect(dumpDiff(before, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(FULL);
  });

  it('d. rollback: byte-equal to the pre-state, archive and ledger emptied; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    expect(dumpDiff(PRE, after)).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await ledgers()).toEqual(EMPTY);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('d2. a field edited after the apply is left alone by the rollback (archive + ledger row kept); the rest is restored', async () => {
    await runFile(MIGRATION);
    await harness.sql`UPDATE fields f SET description = f.description || ' (edited)' FROM worksheet_templates w WHERE w.id = f.worksheet_template_id AND w.code = 'A138-26' AND f.symbol = 'r_D_30'`;
    await runFile(ROLLBACK);
    const l = await ledgers();
    const [r] = await harness.sql<{ label_de: string }[]>`SELECT f.label_de FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = 'A138-26' AND f.symbol = 'r_D_30'`;
    const [q] = await harness.sql<{ active: boolean }[]>`SELECT f.active FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = 'A138-26' AND f.symbol = 'Q_S_flood'`;
    log('rollback with one edited field', { l, label: r.label_de, qsFloodActive: q.active });
    expect(l).toEqual({ fields_archive_a138_fqs: 1, a138_fqs_written: 1 });
    expect(r.label_de).toBe('Regenspende r_D(T_n,Ü) – nur bei Alt-Tabelle (1D)');
    expect(q.active).toBe(true);
    await harness.sql`UPDATE fields f SET description = left(f.description, length(f.description) - length(' (edited)')) FROM worksheet_templates w WHERE w.id = f.worksheet_template_id AND w.code = 'A138-26' AND f.symbol = 'r_D_30'`;
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
    expect(post[0]).toEqual([{ fields: '3', fields_pre: '0', fields_post: '3', fields_neither: null }]);
    expect((post[1] as Array<{ symbol: string; active: boolean; req: boolean; label_de: string }>).map((x) => `${x.symbol} ${x.active} ${x.req} ${x.label_de}`))
      .toEqual(['Q_S_flood false true Versickerungsleistung Q_S (Überflutungsfall)', 'T_n_Ue true true Wiederkehrzeit Überflutung T_n,Ü', 'r_D_30 true false Regenspende r_D(T_n,Ü) – nur bei Alt-Tabelle (1D)']);
    expect(post[2]).toHaveLength(1); // the saved Q_S_flood value is kept
    expect(post[3]).toEqual([{ a138_12_q_s_feeds_26: true, gl10_reads_q_s: true, readers_of_q_s_flood: '0' }]);
    expect(post[4]).toEqual([{ field_archive: '3', written: '3' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('f. AFTER: Q_S_flood gone from A138-26, Q_S ← A138-12 still inherited, V_Rück follows the producer, saved value kept', async () => {
    await runFile(MIGRATION);
    const own = await ownActive('A138-26');
    const inh = await inheritedOn('A138-26');
    const miss = await missingReq(P.blank, 'A138-26');
    const v1 = await vRueck(P.calc); // same inputs as before the apply
    await save(P.calc, 'A138-12', { Q_S: n(0.01) }); // the producer changes
    const v2 = await vRueck(P.calc);
    const [kept] = await harness.sql<{ v: string }[]>`SELECT pp.value_number::text AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
      JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE pp.project_id = ${P.calc.id} AND w.code = 'A138-26' AND f.symbol = 'Q_S_flood'`;
    const res = { ownHasQsFlood: own.includes('Q_S_flood'), inheritsQs: inh.includes('Q_S←A138-12'), miss, v1, v2, hand001: hand(0.01), kept: Number(kept.v) };
    log('AFTER behaviour', res);
    expect(res.ownHasQsFlood).toBe(false);
    expect(res.inheritsQs).toBe(true);
    expect(miss).toEqual(MISSING_26_BEFORE.filter((s) => s !== 'Q_S_flood')); // only the dead duplicate leaves the list
    expect(v1.value).toBeCloseTo(31.6400624064, 9); // unchanged by the block
    expect(v2.notComputed).toEqual([]);
    expect(v2.value).toBeCloseTo(hand(0.01), 9); // follows A138-12 Q_S
    expect(v2.value).not.toBeCloseTo(v1.value!, 3);
    expect(res.kept).toBe(999); // saved value kept, not deleted
    await save(P.calc, 'A138-12', { Q_S: n(0.0015) });
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });
});
