/**
 * DWA-M 820-1 / -2 / -3 · gate severity by the printed modal verb + settled encoding notes — embedded-Postgres proof of
 *   scripts/migrations/20261006240000_m820_guideline_criteria.sql
 *   scripts/rollback-20261006240000-m820-guideline-criteria.sql
 *   scripts/verification/apply/readback-20261006240000-m820-guideline-criteria.sql
 * (owner rule 2026-10-06 "follow them with the correct criteria for our tool"; audit vault 01-Projects/ekowai-wizard/m820-wizard-test/
 *  46_GATE-SEVERITY-AUDIT-m820_2026-10-06.md, apply order 47_, sign-off 48_; encoding notes 44_SIGN-OFF-hint-wave-encoding-notes.md).
 *
 * Disposable embedded Postgres only — no prod, no .env.local. REAL saveWorksheet / recomputeWorksheetEquations / checkApprovalGate.
 * SEED: the three 2026-10-05 dumps + prior.json consumers, the blocks applied on prod by 2026-10-06 (client route, registers, structure 2
 * and 3, follow-up 1, risk changes, REQ-05 home, flow 1–3, the three hint blocks) and the staged Projektstopp-paths block 20261006230000
 * (case h proves this block without it). The pre-state of all 137 gates is pinned by the read-back R0, whose md5s were taken from the LIVE
 * rows (prod-query, 2026-10-06): at_pre = n proves the seeded gates are byte-identical to prod for condition, severity, description, clause.
 * ROWS: synthetic projects, no client data.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startHarness, type Harness } from './embedded-pg';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { recomputeWorksheetEquations as RecomputeWorksheetEquations } from '@/lib/actions/recompute-worksheet';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008fb';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261006240000_m820_guideline_criteria.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006240000-m820-guideline-criteria.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261006240000-m820-guideline-criteria.sql');
const PS_MIGRATION = resolve(ROOT, 'scripts/migrations/20261006230000_m820_3_projektstopp_paths.sql');
const PS_ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006230000-m820-3-projektstopp-paths.sql');
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
  'scripts/migrations/20261006230000_m820_3_projektstopp_paths.sql', // staged, applied before this block here (case h: without it)
].map((p) => resolve(ROOT, p));
const LIVE_PHASE: Record<string, Array<[number, number, number]>> = {
  'DWA-M-820-1': [[1, 3, 1], [4, 9, 2], [10, 15, 3], [16, 20, 4], [21, 23, 5], [24, 25, 6]],
  'DWA-M-820-2': [[1, 4, 1], [5, 10, 2], [11, 15, 3], [16, 19, 4], [20, 24, 5], [25, 28, 6]],
  'DWA-M-820-3': [[1, 3, 1], [4, 6, 2], [7, 10, 3], [11, 18, 4], [19, 21, 5], [22, 24, 6]],
};
const log = (label: string, v: unknown) => console.log(`[M820 GUIDELINE CRITERIA] ${label}: ${JSON.stringify(v)}`);
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
const tally = (diff: string[]) => { const k = diff.map((l) => l.split(' ').slice(0, 2).join(' ')); return Object.fromEntries([...new Set(k)].sort().map((x) => [x, k.filter((y) => y === x).length])); };
const digest = (d: TableDump) => Object.fromEntries(TOUCHED.map((t) => [t, `${d[t].length} rows md5 ${md5(d[t].join('\n'))}`]));
async function runFile(path: string): Promise<void> {
  const conn = await harness.sql.reserve();
  try { await conn.unsafe(readFileSync(path, 'utf8')); } finally { conn.release(); }
}
async function ledgers(): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  for (const t of ['compliance_requirements_archive_m820_gc', 'fields_archive_m820_gc', 'equations_archive_m820_gc', 'm820_gc_written', 'm820_gc_added']) {
    const [r] = await harness.sql<{ t: string | null }[]>`SELECT to_regclass(${'public.' + t})::text AS t`;
    if (!r.t) { out[t] = null; continue; }
    const [c] = await harness.sql.unsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${t}`);
    out[t] = c.n;
  }
  return out;
}
const RB_STMTS = splitOnUnquotedSemicolons(readFileSync(READBACK, 'utf8')).filter((s) => s.replace(/--.*$/gm, '').trim());
/** R4 reads the block's ledgers, which exist only after an apply — before the apply run R0 … R3 (as step 0 on prod). */
async function readback(n = RB_STMTS.length): Promise<unknown[][]> { const out: unknown[][] = []; for (const st of RB_STMTS.slice(0, n)) out.push([...(await harness.sql.unsafe(st))]); return out; }
async function severityOf(ws: string, code: string): Promise<string> {
  const [r] = await harness.sql<{ s: string }[]>`SELECT cr.severity AS s FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE w.code = ${ws} AND cr.code = ${code}`;
  return r.s;
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
async function storedNum(p: Proj, ws: string, symbol: string): Promise<number | null | 'none'> {
  const r = await harness.sql<{ v: string | null }[]>`SELECT pp.value_number::text AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
    JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE pp.project_id = ${p.id} AND w.code = ${ws} AND f.symbol = ${symbol}`;
  return r.length === 0 ? 'none' : r[0].v === null ? null : Number(r[0].v);
}
/** The REAL approval gate: is the gate among the refusing (failing or waiting) block gates? */
async function refuses(p: Proj, ws: string, code: string): Promise<boolean> {
  const g = await checkApprovalGate(p.inst.get(ws)!);
  return [...g.failingBlockConditions, ...g.pendingBlockConditions].some((c) => c.code === code);
}
type Case = { std: string; ws: string; code: string; p: () => Proj; before: boolean; after: boolean; why: string };

let PRE: TableDump;
const P: Record<string, Proj> = {};
let CASES: Case[] = [];

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-guideline-criteria@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820 guideline criteria harness', ${'m820-gc-' + Date.now()}) RETURNING id`;
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
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ recomputeWorksheetEquations: recompute } = await import('@/lib/actions/recompute-worksheet'));

  // ── the approval cases (3 per standard). A project per standard; values typed through the real save path. ──
  P.p1 = await makeProject('820-1: price weight 30 %, double evaluation not observed, direct award without negotiation');
  await save(P.p1, 'M820-01', { client_organization_type: e('municipality') });
  await save(P.p1, 'M820-10', { procurement_procedure: e('direktvergabe') });
  await save(P.p1, 'M820-14', { price_weight_percent: n(30), festpreis_used: b(false), doppelbewertungsverbot_check: b(false) });
  await save(P.p1, 'M820-20', { negotiation_rounds: n(0) });
  P.p1v = await makeProject('820-1: VgV-F without negotiation');
  await save(P.p1v, 'M820-01', { client_organization_type: e('municipality') });
  await save(P.p1v, 'M820-10', { procurement_procedure: e('vgv_f') });
  await save(P.p1v, 'M820-20', { negotiation_rounds: n(0) });
  P.p2 = await makeProject('820-2: no HOAI phase, no goals, Bauherrenaufgaben not defined');
  await save(P.p2, '820-2-02', { goals_stability_signoff: b(false) });
  await save(P.p2, '820-2-05', { bauherr_tasks_defined: b(false) });
  P.p3 = await makeProject('820-3: small municipal operator without two-step approach, one § 6.2 goal partially met, no sign-off');
  await save(P.p3, 'M8203-01', { project_type: e('einzelprojekt') });
  await save(P.p3, 'M8203-02', { kleiner_kommunaler_betrieb: b(true), grundsatz_two_step_followed: b(false) });
  await save(P.p3, 'M8203-11', { pz_62_1_status: e('teilweise_erreicht'), pz_62_projektstopp_risikoanalyse: b(false) });
  CASES = [
    { std: '820-1', ws: 'M820-14', code: 'REQ-15', p: () => P.p1, before: true, after: false, why: 'block → warn: „Bewährt hat sich … max. 20 %“ (E.2.8)' },
    { std: '820-1', ws: 'M820-14', code: 'REQ-16', p: () => P.p1, before: true, after: true, why: 'stays block: „dürfen nicht“ (§ 8.10.2.4)' },
    { std: '820-1', ws: 'M820-20', code: 'REQ-20', p: () => P.p1, before: true, after: false, why: 'VgV-F guard: direct award → not applicable' },
    { std: '820-1', ws: 'M820-20', code: 'REQ-20', p: () => P.p1v, before: true, after: true, why: 'VgV-F guard: VgV-F → still „zwingend“' },
    { std: '820-2', ws: '820-2-01', code: 'REQ-01', p: () => P.p2, before: true, after: false, why: 'block → warn: tool scope check' },
    { std: '820-2', ws: '820-2-02', code: 'REQ-26', p: () => P.p2, before: false, after: true, why: 'warn → block: „Ziele müssen eindeutig definiert sein“ (§ 5.3.3)' },
    { std: '820-2', ws: '820-2-05', code: 'REQ-04', p: () => P.p2, before: true, after: true, why: 'stays block: „muss genau wissen“ (§ 4.3.2)' },
    { std: '820-3', ws: 'M8203-24', code: 'REQ-32', p: () => P.p3, before: true, after: false, why: 'block → warn: dual sign-off is a tool addition' },
    { std: '820-3', ws: 'M8203-02', code: 'REQ-05', p: () => P.p3, before: false, after: true, why: 'warn → block: „Hier ist die Zweistufigkeit erforderlich“ (§ 3)' },
    { std: '820-3', ws: 'M8203-11', code: 'REQ-09-2', p: () => P.p3, before: true, after: true, why: 'stays block: „ist die Prüfung eines Projektstopps erforderlich“ (§ 3)' },
  ];
  // ── the register case (3-1): two catalogue rows + one supplementary row "E" ──
  P.reg = await makeProject('820-3 QE registers with a project-specific supplementary row');
  await save(P.reg, 'M8203-01', { project_type: e('einzelprojekt') });
}, 900_000);

afterAll(async () => {
  await harness?.stop();
});

const REG62 = { rows: [
  { id: 'r1', nr: 'n1', rating: 'y', evidence: 'Bedarfsplan Rev. 1' },
  { id: 'r2', nr: 'n2', rating: 'n' },
  { id: 'r3', nr: 'E', kriterium_ergaenzung: 'Lärmschutz der Anlieger während der Bauzeit', rating: 'y' },
] };
const REG63A = { rows: [{ id: 's1', nr: 'n1', rating: 'p' }, { id: 's2', nr: 'E', kriterium_ergaenzung: 'Abstimmung mit dem Gewässerverband', rating: 'y' }] };
async function regCounts(p: Proj) {
  await save(p, 'M8203-11', { qe62_items: jv(REG62), qe62_items_total: n(15) });
  await save(p, 'M8203-12', { qe63a_items: jv(REG63A) });
  await recompute(p.inst.get('M8203-11')!);
  await recompute(p.inst.get('M8203-12')!);
  return {
    qe62_rated: await storedNum(p, 'M8203-11', 'qe62_items_rated'), qe62_y: await storedNum(p, 'M8203-11', 'qe62_items_y_calc'),
    qe62_n: await storedNum(p, 'M8203-11', 'qe62_items_n_calc'), qe62_share_y: await storedNum(p, 'M8203-11', 'qe62_share_y_pct'),
    qe63a_rated: await storedNum(p, 'M8203-12', 'qe63a_items_rated'), qe63a_y: await storedNum(p, 'M8203-12', 'qe63a_items_y_calc'),
  };
}

describe('DWA-M 820 guideline criteria — staged block on embedded Postgres (seed = prod 2026-10-06 + Projektstopp paths)', () => {
  it('a. pre-state = the LIVE rows of all 137 gates (read-back R0 at_pre = n, md5s taken from prod); approval verdicts BEFORE', async () => {
    expect(await ledgers()).toEqual({ compliance_requirements_archive_m820_gc: null, fields_archive_m820_gc: null, equations_archive_m820_gc: null, m820_gc_written: null, m820_gc_added: null });
    const [r0, r1] = await readback(2);
    log('BEFORE R0', r0); log('BEFORE R1', r1);
    expect(r0).toEqual([
      { std: 'DWA-M-820-1', n: '26', at_pre: '26', at_post: expect.any(String), neither: '0', neither_codes: null },
      { std: 'DWA-M-820-2', n: '61', at_pre: '61', at_post: expect.any(String), neither: '0', neither_codes: null },
      { std: 'DWA-M-820-3', n: '50', at_pre: '50', at_post: expect.any(String), neither: '0', neither_codes: null },
    ]);
    expect(r1).toEqual([
      { std: 'DWA-M-820-1', block: '20', warn: '6', other: '0', projektstopp_paths_applied: '1' },
      { std: 'DWA-M-820-2', block: '45', warn: '16', other: '0', projektstopp_paths_applied: '1' },
      { std: 'DWA-M-820-3', block: '20', warn: '30', other: '0', projektstopp_paths_applied: '1' },
    ]);
    const before: Record<string, boolean> = {};
    for (const c of CASES) before[`${c.std} ${c.code} (${c.why})`] = await refuses(c.p(), c.ws, c.code);
    log('BEFORE: approval refused by the gate', before);
    expect(Object.values(before)).toEqual(CASES.map((c) => c.before));
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: 46 gates, 34 fields, 72 equations changed; 11 table rows and 4 fields added; nothing else', async () => {
    await runFile(MIGRATION);
    const diff = dumpDiff(PRE, await dump());
    log('apply diff (table / sign counts)', tally(diff));
    expect(tally(diff)).toEqual({
      'compliance_requirements +': 46, 'compliance_requirements -': 46,
      'equations +': 72, 'equations -': 72,
      'fields +': 38, 'fields -': 34,
      'regulation_table_rows +': 11,
    });
    expect(await ledgers()).toEqual({ compliance_requirements_archive_m820_gc: 46, fields_archive_m820_gc: 34, equations_archive_m820_gc: 72, m820_gc_written: 152, m820_gc_added: 15 });
    // severities after: 820-1 20 → 17 block (−4 +1), 820-2 45 → 51 (−1 +7), 820-3 20 → 20 (−2 +2)
    const sev = await harness.sql<{ std: string; block: number; warn: number }[]>`SELECT s.code AS std, sum((cr.severity = 'block')::int)::int AS block, sum((cr.severity = 'warn')::int)::int AS warn
      FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id GROUP BY 1 ORDER BY 1`;
    log('severity after', sev);
    expect(sev).toEqual([{ std: 'DWA-M-820-1', block: 17, warn: 9 }, { std: 'DWA-M-820-2', block: 51, warn: 10 }, { std: 'DWA-M-820-3', block: 20, warn: 30 }]);
    // the guard form is REQ-10's, the hints carry the new severity wording
    const [g20] = await harness.sql<{ c: string; d: string }[]>`SELECT cr.condition AS c, cr.description AS d FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE w.code = 'M820-20' AND cr.code = 'REQ-20'`;
    expect(g20.c).toBe("IF (client_organization_type != 'privat_ohne_foerderung' OR vergaberecht_freiwillig_angewendet == true) AND procurement_procedure == 'vgv_f' THEN (negotiation_rounds >= 1)");
    const [g15] = await harness.sql<{ d: string }[]>`SELECT cr.description AS d FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE w.code = 'M820-14' AND cr.code = 'REQ-15'`;
    expect(g15.d.startsWith('Warnt (sperrt die Freigabe nicht)')).toBe(true);
    expect(g15.d).toContain('\n[EN] Warns (does not block approval)');
    // E column + note on every QE register, E row in every QE table
    const cols = await harness.sql<{ s: string; k: string; v: string | null; r: boolean }[]>`SELECT f.symbol AS s, c->>'key' AS k, c->>'visible_when' AS v, (c->>'required')::boolean AS r
      FROM fields f, jsonb_array_elements(f.ui_config->'columns') c WHERE f.symbol ~ '^qe[0-9]+[ab]?_items$' AND c->>'key' = 'kriterium_ergaenzung' ORDER BY 1`;
    expect(cols).toHaveLength(12);
    expect(new Set(cols.map((c) => `${c.v}|${c.r}`))).toEqual(new Set(["nr == 'E'|true"]));
  });

  it('c. apply again: 0 changes (full dump compare), ledgers unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    expect(dumpDiff(before, await dump())).toEqual([]);
    expect(await ledgers()).toEqual({ compliance_requirements_archive_m820_gc: 46, fields_archive_m820_gc: 34, equations_archive_m820_gc: 72, m820_gc_written: 152, m820_gc_added: 15 });
  });

  it('d. rollback: byte-equal to the pre-state, archives and ledgers emptied; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    log('rollback diff vs pre', dumpDiff(PRE, after));
    expect(dumpDiff(PRE, after)).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    const empty = { compliance_requirements_archive_m820_gc: 0, fields_archive_m820_gc: 0, equations_archive_m820_gc: 0, m820_gc_written: 0, m820_gc_added: 0 };
    expect(await ledgers()).toEqual(empty);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(empty);
  });

  it('d2. a gate edited after the apply is left alone by the rollback (archive + ledger rows kept); the rest is restored', async () => {
    await runFile(MIGRATION);
    await harness.sql`UPDATE compliance_requirements cr SET description = cr.description || ' (edited)' FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = 'M820-14' AND cr.code = 'REQ-15'`;
    await runFile(ROLLBACK);
    const l = await ledgers();
    log('rollback with one edited gate', { l, REQ15: await severityOf('M820-14', 'REQ-15'), REQ26: await severityOf('820-2-02', 'REQ-26') });
    expect(l).toEqual({ compliance_requirements_archive_m820_gc: 1, fields_archive_m820_gc: 0, equations_archive_m820_gc: 0, m820_gc_written: 1, m820_gc_added: 0 });
    expect(await severityOf('M820-14', 'REQ-15')).toBe('warn'); // left as edited
    expect(await severityOf('820-2-02', 'REQ-26')).toBe('warn'); // restored
    await harness.sql`UPDATE compliance_requirements cr SET description = left(cr.description, length(cr.description) - length(' (edited)')) FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = 'M820-14' AND cr.code = 'REQ-15'`;
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual({ compliance_requirements_archive_m820_gc: 0, fields_archive_m820_gc: 0, equations_archive_m820_gc: 0, m820_gc_written: 0, m820_gc_added: 0 });
  });

  it('e. the read-back file runs before and after an apply and shows the expected values', async () => {
    expect(RB_STMTS).toHaveLength(5);
    expect(readFileSync(READBACK, 'utf8').split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(5);
    const pre = await readback(4);
    log('read-back R2 (before)', pre[2]);
    expect(pre[2]).toEqual([{ tokens: '0', qe_e_rows: '0', anhb23_rows: '8', new_goal_fields: '0', e_filtered_equations: '0', registers_with_e_column: '0', rated_labels_new: '0', required_phase_goals: '65', applicable_at_6_1: '0', change_log_label_new: '0' }]);
    await runFile(MIGRATION);
    const post = await readback();
    log('read-back (after)', { r0: post[0], r1: post[1], r2: post[2], r4: post[4] });
    expect(post[0]).toEqual([
      { std: 'DWA-M-820-1', n: '26', at_pre: expect.any(String), at_post: '26', neither: '0', neither_codes: null },
      { std: 'DWA-M-820-2', n: '61', at_pre: expect.any(String), at_post: '61', neither: '0', neither_codes: null },
      { std: 'DWA-M-820-3', n: '50', at_pre: expect.any(String), at_post: '50', neither: '0', neither_codes: null },
    ]);
    expect(post[1]).toEqual([
      { std: 'DWA-M-820-1', block: '17', warn: '9', other: '0', projektstopp_paths_applied: '1' },
      { std: 'DWA-M-820-2', block: '51', warn: '10', other: '0', projektstopp_paths_applied: '1' },
      { std: 'DWA-M-820-3', block: '20', warn: '30', other: '0', projektstopp_paths_applied: '1' },
    ]);
    expect(post[2]).toEqual([{ tokens: '3', qe_e_rows: '10', anhb23_rows: '9', new_goal_fields: '4', e_filtered_equations: '72', registers_with_e_column: '12', rated_labels_new: '12', required_phase_goals: '67', applicable_at_6_1: '2', change_log_label_new: '1' }]);
    expect((post[3] as unknown[]).length).toBe(26); // 17 severity + 3 guard-only + 6 clause-only
    expect(post[4]).toEqual([{ gate_archive: '46', field_archive: '34', equation_archive: '72', written: '152', added: '15' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('f. AFTER: the verdict follows the printed modal verb through the REAL approval gate (3+ gates per standard)', async () => {
    await runFile(MIGRATION);
    const after: Record<string, boolean> = {};
    for (const c of CASES) after[`${c.std} ${c.code} (${c.why})`] = await refuses(c.p(), c.ws, c.code);
    log('AFTER: approval refused by the gate', after);
    expect(Object.values(after)).toEqual(CASES.map((c) => c.after));
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('g. 3-1: a project-specific row "E" is accepted and counted apart from the printed catalogue (unsplit and split register)', async () => {
    const before = await regCounts(P.reg);
    log('BEFORE: register counts with an E row (E names no table row yet)', before);
    // before: the E row is a complete row (nr + rating), so every count includes it — 3 rows rated, share y 2 / 15
    expect(before).toMatchObject({ qe62_rated: 3, qe62_y: 2, qe62_n: 1 });
    await runFile(MIGRATION);
    const after = await regCounts(P.reg);
    log('AFTER: register counts with an E row', after);
    // after: the printed-catalogue counts skip the E row (n1 y, n2 n); the split register skips it through in_teil (nr_num 0)
    expect(after).toMatchObject({ qe62_rated: 2, qe62_y: 1, qe62_n: 1, qe63a_rated: 1, qe63a_y: 0 });
    expect(after.qe62_share_y as number).toBeCloseTo(100 / 15, 6);
    // an E row without the criterion text is incomplete (the new column is required on E rows only)
    const w = await save(P.reg, 'M8203-11', { qe62_items: jv({ rows: [...REG62.rows, { id: 'r4', nr: 'E', rating: 'n' }] }) });
    const ws = (w as { warnings: string[] }).warnings.filter((x) => x.startsWith('Register qe62_items'));
    log('save warning for an E row without its criterion', ws);
    expect(ws).toEqual(['Register qe62_items: Zeile 4 unvollständig (Pflichtspalte kriterium_ergaenzung fehlt) — wird nicht gezählt [EN] row 4 incomplete (required column kriterium_ergaenzung missing) — not counted']);
    await recompute(P.reg.inst.get('M8203-11')!);
    expect(await storedNum(P.reg, 'M8203-11', 'qe62_items_n_calc')).toBe(1);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('h. without block 20261006230000 the REQ-31 change waits (stays warn); everything else applies; order back → byte-equal', async () => {
    await runFile(PS_ROLLBACK);
    await runFile(MIGRATION);
    const r = { REQ31: await severityOf('M8203-24', 'REQ-31'), REQ05: await severityOf('M8203-02', 'REQ-05'), REQ32: await severityOf('M8203-24', 'REQ-32') };
    log('without Projektstopp paths', r);
    expect(r).toEqual({ REQ31: 'warn', REQ05: 'block', REQ32: 'warn' });
    expect(await ledgers()).toMatchObject({ compliance_requirements_archive_m820_gc: 45 });
    // applying the Projektstopp block afterwards and this block again completes REQ-31
    await runFile(PS_MIGRATION);
    await runFile(MIGRATION);
    expect(await severityOf('M8203-24', 'REQ-31')).toBe('block');
    expect(await ledgers()).toMatchObject({ compliance_requirements_archive_m820_gc: 46, m820_gc_written: 152 });
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });
});
