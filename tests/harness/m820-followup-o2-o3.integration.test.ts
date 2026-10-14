/**
 * DWA-M 820 · follow-up O-2 / O-3 (2026-10-14) — embedded-Postgres proof of
 *   scripts/migrations/20261014100000_m820_followup_o2_o3.sql
 *   scripts/rollback-20261014100000-m820-followup-o2-o3.sql
 *   scripts/verification/apply/readback-20261014100000-m820-followup-o2-o3.sql
 * (apply order + behaviour list: vault 01-Projects/ekowai-wizard/m820-wizard-test/69_APPLY-ORDER-m820-followup-O2-O3.md).
 *   O-2 · 820-2-18 testbetrieb_vs_abnahme_choice only with awarded construction works (visible_when bauleistungen_vergeben == true);
 *         820-2-22 REQ-46 nested award guard (style of REQ-51 / REQ-52); bauleistungen_vergeben reaches 820-2-22.
 *   O-3 · no row change: M8203-23 under Einzelprojekt lists 0 derived and 0 Gesamtsystem (Anhang A) fields as missing; the class scan over
 *         all 820-3 sheets (computed fields required · other-path sheets missing / waiting) is empty before and after.
 *
 * Disposable embedded Postgres only — no prod, no .env.local. REAL saveWorksheet / checkApprovalGate / loadInheritedFields +
 * computeVisibility (the form's pair). SEED: the three 2026-10-05 dumps + prior.json consumers and every M820 block applied on prod up
 * to 20261008100000 (workflow audit). The block's pre-signatures were taken from this seed; read-back R0 on prod (step 0) must show
 * fields_pre 2 / gates_pre 1. ROWS: synthetic projects, no client data.
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
import { computeVisibility } from '@/lib/compliance/visibility';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008fe';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261014100000_m820_followup_o2_o3.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261014100000-m820-followup-o2-o3.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261014100000-m820-followup-o2-o3.sql');
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
  'scripts/migrations/20261007100000_m820_project_size_declaration.sql',
  'scripts/migrations/20261007110000_m820_decisions_48_50.sql',
  'scripts/migrations/20261007120000_m820_small_fixes.sql',
  'scripts/migrations/20261008100000_m820_workflow_audit.sql',
].map((p) => resolve(ROOT, p));
const LIVE_PHASE: Record<string, Array<[number, number, number]>> = {
  'DWA-M-820-1': [[1, 3, 1], [4, 9, 2], [10, 15, 3], [16, 20, 4], [21, 23, 5], [24, 25, 6]],
  'DWA-M-820-2': [[1, 4, 1], [5, 10, 2], [11, 15, 3], [16, 19, 4], [20, 24, 5], [25, 28, 6]],
  'DWA-M-820-3': [[1, 3, 1], [4, 6, 2], [7, 10, 3], [11, 18, 4], [19, 21, 5], [22, 24, 6]],
};
const log = (label: string, v: unknown) => {
  const line = `[M820 FOLLOW-UP O2/O3] ${label}: ${JSON.stringify(v)}`;
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
const LEDGERS = ['compliance_requirements_archive_m820_o23', 'fields_archive_m820_o23', 'm820_o23_written'];
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
const EMPTY = { compliance_requirements_archive_m820_o23: 0, fields_archive_m820_o23: 0, m820_o23_written: 0 };
const FULL = { compliance_requirements_archive_m820_o23: 1, fields_archive_m820_o23: 2, m820_o23_written: 3 };
const RB_STMTS = splitOnUnquotedSemicolons(readFileSync(READBACK, 'utf8')).filter((s) => s.replace(/--.*$/gm, '').trim());
/** R4 reads the block's ledgers, which exist only after an apply — before the apply run R0 … R3 (step 0 on prod). */
async function readback(n = RB_STMTS.length): Promise<unknown[][]> { const out: unknown[][] = []; for (const st of RB_STMTS.slice(0, n)) out.push([...(await harness.sql.unsafe(st))]); return out; }
async function gateRow(ws: string, code: string): Promise<{ severity: string; condition: string; description: string } | undefined> {
  const [r] = await harness.sql<{ severity: string; condition: string; description: string }[]>`
    SELECT cr.severity, cr.condition, cr.description FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
     WHERE w.code = ${ws} AND cr.code = ${code}`;
  return r;
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
type V = { type: 'boolean'; value: boolean } | { type: 'enum'; value: string };
const e = (value: string): V => ({ type: 'enum', value });
const b = (value: boolean): V => ({ type: 'boolean', value });
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
/** The REAL approval gate: is the gate among the refusing (failing or waiting) block gates? */
async function refuses(p: Proj, ws: string, code: string): Promise<boolean> {
  const g = await checkApprovalGate(p.inst.get(ws)!);
  return [...g.failingBlockConditions, ...g.pendingBlockConditions].some((c) => c.code === code);
}
/** 'fail' | 'wait' | 'none' — how the real gate treats one block gate. */
async function verdict(p: Proj, ws: string, code: string): Promise<string> {
  const g = await checkApprovalGate(p.inst.get(ws)!);
  if (g.failingBlockConditions.some((c) => c.code === code)) return 'fail';
  if (g.pendingBlockConditions.some((c) => c.code === code)) return 'wait';
  return 'none';
}
const missingReq = async (p: Proj, ws: string) => (await checkApprovalGate(p.inst.get(ws)!)).missingRequiredFields.map((f) => f.symbol).sort();
const pendingNamed = async (p: Proj, ws: string, code: string) =>
  (await checkApprovalGate(p.inst.get(ws)!)).pendingBlockConditions.find((c) => c.code === code)?.missingInputs.map((i) => i.symbol) ?? null;

/** The form's pair (visibility.ts): own fields are hideable; the lookup resolves own + inherited (consumer_worksheets) saved values. */
async function formHidden(p: Proj, ws: string): Promise<string[]> {
  const sql = harness.sql;
  const [t] = await sql<{ id: string; standard_id: string }[]>`SELECT id, standard_id FROM worksheet_templates WHERE code = ${ws}`;
  const own = await sql<{ id: string; symbol: string; section_id: string | null; visible_when: string | null }[]>`
    SELECT id, symbol, section_id, visible_when FROM fields WHERE worksheet_template_id = ${t.id} AND active`;
  const secs = await sql<{ id: string; parent_section_id: string | null; visible_when: string | null }[]>`
    SELECT id, parent_section_id, visible_when FROM worksheet_sections WHERE worksheet_template_id = ${t.id}`;
  const inh = await loadInheritedFields(t.id, t.standard_id, ws);
  const ids = [...own.map((f) => f.id), ...inh.map((f) => f.id)];
  const symById = new Map<string, string>([...own.map((f) => [f.id, f.symbol] as const), ...inh.map((f) => [f.id, f.symbol] as const)]);
  const vals = await sql<{ field_id: string; v: string | boolean | null }[]>`
    SELECT field_id, COALESCE(value_boolean::text, value_enum, value_text, value_number::text) AS v
      FROM project_parameters WHERE project_id = ${p.id} AND field_id IN ${sql(ids)}`;
  const bySym = new Map<string, string | boolean | null>();
  for (const r of vals) bySym.set(symById.get(r.field_id)!, r.v === 'true' ? true : r.v === 'false' ? false : r.v);
  const vis = computeVisibility(
    own.map((f) => ({ id: f.id, symbol: f.symbol, sectionId: f.section_id, visibleWhen: f.visible_when })),
    secs.map((s) => ({ id: s.id, parentSectionId: s.parent_section_id, visibleWhen: s.visible_when })),
    (s) => bySym.get(s) ?? undefined,
  );
  return [...vis.hiddenSymbols].sort();
}
const inherits = async (ws: string, sym: string) => {
  const [t] = await harness.sql<{ id: string; standard_id: string }[]>`SELECT id, standard_id FROM worksheet_templates WHERE code = ${ws}`;
  return (await loadInheritedFields(t.id, t.standard_id, ws)).some((f) => f.symbol === sym);
};

// ── O-3 · 820-3 path scan through the real gate ─────────────────────────────────────────────────────────────────────
const PATH_SHEETS: Record<string, string[]> = {
  gesamtsystem: ['M8203-04', 'M8203-05', 'M8203-06', 'M8203-07', 'M8203-08', 'M8203-09', 'M8203-10', 'M8203-22'],
  einzelprojekt: ['M8203-11', 'M8203-12', 'M8203-13', 'M8203-14', 'M8203-15', 'M8203-16', 'M8203-17', 'M8203-18', 'M8203-23'],
};
/** Computed symbols of 820-3 (equation outputs + widget derived). */
async function computed820_3(): Promise<Set<string>> {
  const r = await harness.sql<{ s: string }[]>`
    SELECT e.output_symbol AS s FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id JOIN standards st ON st.id = w.standard_id
     WHERE st.code = 'DWA-M-820-3' AND e.output_symbol IS NOT NULL
    UNION SELECT f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards st ON st.id = w.standard_id
     WHERE st.code = 'DWA-M-820-3' AND f.widget = 'derived'`;
  return new Set(r.map((x) => x.s));
}
/** Per path: missing required + waiting gates on the OTHER path's sheets, and computed symbols missing anywhere. */
async function pathScan(p: Proj, path: 'einzelprojekt' | 'gesamtsystem'): Promise<{ otherPathMissing: string[]; otherPathWaiting: string[]; computedMissing: string[] }> {
  const other = path === 'einzelprojekt' ? PATH_SHEETS.gesamtsystem : PATH_SHEETS.einzelprojekt;
  const comp = await computed820_3();
  const sheets = await harness.sql<{ code: string }[]>`SELECT w.code FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-3' ORDER BY w.order_index`;
  const out = { otherPathMissing: [] as string[], otherPathWaiting: [] as string[], computedMissing: [] as string[] };
  for (const { code } of sheets) {
    const g = await checkApprovalGate(p.inst.get(code)!);
    if (other.includes(code)) {
      out.otherPathMissing.push(...g.missingRequiredFields.map((f) => `${code} ${f.symbol}`));
      out.otherPathWaiting.push(...g.pendingBlockConditions.map((c) => `${code} ${c.code}`));
    }
    out.computedMissing.push(...g.missingRequiredFields.filter((f) => comp.has(f.symbol)).map((f) => `${code} ${f.symbol}`));
  }
  return out;
}

let PRE: TableDump;
const P: Record<string, Proj> = {};
const M8203_23_MANUAL = ['gesamt_anhang_b_fulfilment_pct', 'gesamt_anhang_b_items_total', 'gesamt_anhang_b_verdict'];
type Probe = { label: string; run: () => Promise<unknown>; before: unknown; after: unknown };
let PROBES: Probe[] = [];

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-followup-o2-o3@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820 follow-up O2/O3 harness', ${'m820-o23-' + Date.now()}) RETURNING id`;
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
  for (const blk of PRIOR_BLOCKS) await runFile(blk); // = prod after 20261008100000
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadInheritedFields } = await import('@/lib/db/queries/worksheet'));

  // ── O-2 projects (820-2) ──
  P.self = await makeProject('820-2: self-built, leftover choice testbetrieb, test operation not planned');
  await save(P.self, '820-2-17', { bauleistungen_vergeben: b(true) });
  await save(P.self, '820-2-18', { testbetrieb_vs_abnahme_choice: e('testbetrieb') });
  await save(P.self, '820-2-17', { bauleistungen_vergeben: b(false) }); // the award answer changed afterwards: the choice is a leftover
  await save(P.self, '820-2-22', { testbetrieb_planned: b(false) });
  P.selfNew = await makeProject('820-2: self-built, choice never answered');
  await save(P.selfNew, '820-2-17', { bauleistungen_vergeben: b(false) });
  P.award = await makeProject('820-2: construction awarded, choice testbetrieb, test operation not planned');
  await save(P.award, '820-2-17', { bauleistungen_vergeben: b(true) });
  await save(P.award, '820-2-18', { testbetrieb_vs_abnahme_choice: e('testbetrieb') });
  await save(P.award, '820-2-22', { testbetrieb_planned: b(false) });
  P.abn = await makeProject('820-2: construction awarded, acceptance tests only');
  await save(P.abn, '820-2-17', { bauleistungen_vergeben: b(true) });
  await save(P.abn, '820-2-18', { testbetrieb_vs_abnahme_choice: e('abnahmepruefung') });
  await save(P.abn, '820-2-22', { testbetrieb_planned: b(false) });
  P.open = await makeProject('820-2: award unanswered, choice mischform, test operation not planned');
  await save(P.open, '820-2-18', { testbetrieb_vs_abnahme_choice: e('mischform') });
  await save(P.open, '820-2-22', { testbetrieb_planned: b(false) });

  // ── O-3 projects (820-3), driver only ──
  P.einzel = await makeProject('820-3: Einzelprojekt');
  await save(P.einzel, 'M8203-01', { project_type: e('einzelprojekt') });
  P.gesamt = await makeProject('820-3: Gesamtsystem');
  await save(P.gesamt, 'M8203-01', { project_type: e('gesamtsystem') });

  PROBES = [
    // O-2
    { label: 'REQ-46 · self-built, leftover choice testbetrieb, planned=false', run: () => verdict(P.self, '820-2-22', 'REQ-46'), before: 'fail', after: 'none' },
    { label: 'REQ-46 · awarded, choice testbetrieb, planned=false', run: () => verdict(P.award, '820-2-22', 'REQ-46'), before: 'fail', after: 'fail' },
    { label: 'REQ-46 · awarded, choice abnahmepruefung, planned=false', run: () => verdict(P.abn, '820-2-22', 'REQ-46'), before: 'none', after: 'none' },
    { label: 'REQ-46 · award unanswered, choice mischform, planned=false', run: () => verdict(P.open, '820-2-22', 'REQ-46'), before: 'fail', after: 'wait' },
    { label: 'form-hidden 820-2-18 · self-built', run: () => formHidden(P.self, '820-2-18'), before: ['leistungsbeschreibung_type'], after: ['leistungsbeschreibung_type', 'testbetrieb_vs_abnahme_choice'] },
    { label: 'form-hidden 820-2-18 · awarded', run: () => formHidden(P.award, '820-2-18'), before: [], after: [] },
    { label: 'form-hidden 820-2-18 · award unanswered', run: () => formHidden(P.open, '820-2-18'), before: [], after: [] },
    { label: 'missing required 820-2-18 · self-built, choice never answered', run: () => missingReq(P.selfNew, '820-2-18'), before: ['rahmenterminplan_attached', 'testbetrieb_vs_abnahme_choice'], after: ['rahmenterminplan_attached'] },
    { label: 'missing required 820-2-18 · awarded', run: () => missingReq(P.award, '820-2-18'), before: ['leistungsbeschreibung_type', 'rahmenterminplan_attached'], after: ['leistungsbeschreibung_type', 'rahmenterminplan_attached'] },
    { label: 'bauleistungen_vergeben inherited on 820-2-22', run: () => inherits('820-2-22', 'bauleistungen_vergeben'), before: false, after: true },
    // O-3 (no row change — before = after)
    { label: 'missing required M8203-23 · Einzelprojekt', run: () => missingReq(P.einzel, 'M8203-23'), before: M8203_23_MANUAL, after: M8203_23_MANUAL },
    { label: 'missing required M8203-22 · Einzelprojekt (Anhang A = Gesamtsystem, hidden path)', run: () => missingReq(P.einzel, 'M8203-22'), before: [], after: [] },
    { label: 'missing required M8203-23 · Gesamtsystem (hidden path)', run: () => missingReq(P.gesamt, 'M8203-23'), before: [], after: [] },
    { label: 'path scan · Einzelprojekt', run: () => pathScan(P.einzel, 'einzelprojekt'), before: { otherPathMissing: [], otherPathWaiting: [], computedMissing: [] }, after: { otherPathMissing: [], otherPathWaiting: [], computedMissing: [] } },
    { label: 'path scan · Gesamtsystem', run: () => pathScan(P.gesamt, 'gesamtsystem'), before: { otherPathMissing: [], otherPathWaiting: [], computedMissing: [] }, after: { otherPathMissing: [], otherPathWaiting: [], computedMissing: [] } },
  ];
}, 900_000);

afterAll(async () => {
  await harness?.stop();
});

async function probeAll(): Promise<unknown[]> { const out: unknown[] = []; for (const p of PROBES) out.push(await p.run()); return out; }
const sigs = () => harness.sql`SELECT 'g ' || w.code || ' ' || cr.code AS k, md5(concat_ws('|', coalesce(cr.condition,''), cr.severity, md5(coalesce(cr.description,'')), coalesce(cr.clause_reference,''))) AS sig
    FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE cr.id IN (SELECT id FROM compliance_requirements_archive_m820_o23)
  UNION ALL SELECT 'f ' || w.code || ' ' || f.symbol, md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type))
    FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE f.id IN (SELECT id FROM fields_archive_m820_o23) ORDER BY 1`;

describe('DWA-M 820 follow-up O-2 / O-3 — staged block on embedded Postgres (seed = prod after 20261008100000)', () => {
  it('a. pre-state (read-back R0 fields_pre 2 / gates_pre 1, R3 class scan empty); verdicts BEFORE through the real gate path', async () => {
    expect(await ledgers()).toEqual({ compliance_requirements_archive_m820_o23: null, fields_archive_m820_o23: null, m820_o23_written: null });
    const r = await readback(4);
    log('BEFORE read-back R0..R3', r);
    expect(r[0]).toMatchObject([{ fields: '2', fields_pre: '2', fields_post: '0', gates: '1', gates_pre: '1', gates_post: '0', fields_neither: null, gates_neither: null }]);
    expect(r[1]).toHaveLength(3);
    expect((r[2] as Array<{ project: string; choice: string; bauleistungen_vergeben: string }>).map((x) => `${x.choice} ${x.bauleistungen_vergeben}`).sort())
      .toEqual(['abnahmepruefung true', 'mischform (unanswered)', 'testbetrieb false', 'testbetrieb true']);
    expect(r[3]).toEqual([]);
    const before = await probeAll();
    log('BEFORE probes', Object.fromEntries(PROBES.map((p, i) => [p.label, before[i]])));
    expect(before).toEqual(PROBES.map((p) => p.before));
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: 1 gate + 2 fields changed, nothing else; severities unchanged; touched hints DE + [EN]', async () => {
    const sevBefore = await harness.sql`SELECT cr.id, cr.severity FROM compliance_requirements cr ORDER BY 1`;
    await runFile(MIGRATION);
    const diff = dumpDiff(PRE, await dump());
    log('apply diff (table / sign counts)', tally(diff));
    expect(tally(diff)).toEqual({ 'compliance_requirements +': 1, 'compliance_requirements -': 1, 'fields +': 2, 'fields -': 2 });
    expect(await ledgers()).toEqual(FULL);
    const sevAfter = await harness.sql`SELECT cr.id, cr.severity FROM compliance_requirements cr ORDER BY 1`;
    expect([...sevAfter]).toEqual([...sevBefore]);
    const hints = await harness.sql<{ id: string; ok: boolean }[]>`SELECT cr.id, (cr.description LIKE '%' || chr(10) || '[EN] %') AS ok
      FROM compliance_requirements cr WHERE cr.id IN (SELECT id FROM compliance_requirements_archive_m820_o23)
      UNION ALL SELECT f.id, (f.description LIKE '%' || chr(10) || '[EN] %') FROM fields f WHERE f.id IN (SELECT id FROM fields_archive_m820_o23)`;
    expect(hints).toHaveLength(3);
    expect(hints.filter((h) => !h.ok)).toEqual([]);
    // the verbatim § 5.7.1 sentence is carried by all three touched texts
    const q = 'In den Vergabeunterlagen für die ausführenden Firmen';
    const carried = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM (
        SELECT description FROM compliance_requirements WHERE id IN (SELECT id FROM compliance_requirements_archive_m820_o23)
        UNION ALL SELECT description FROM fields WHERE id IN (SELECT id FROM fields_archive_m820_o23)) x WHERE description LIKE ${'%' + q + '%'}`;
    expect(carried[0].n).toBe(3);
    log('post-state signatures (read-back R0 sig1)', Object.fromEntries((await sigs()).map((r) => [r.k, r.sig])));
  });

  it('c. apply again: 0 changes (full dump compare), ledgers unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    expect(dumpDiff(before, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(FULL);
  });

  it('d. rollback: byte-equal to the pre-state, archives and ledger emptied; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    expect(dumpDiff(PRE, after)).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await ledgers()).toEqual(EMPTY);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('d2. a gate edited after the apply is left alone by the rollback (archive + ledger rows kept); the rest is restored', async () => {
    await runFile(MIGRATION);
    await harness.sql`UPDATE compliance_requirements cr SET description = cr.description || ' (edited)' FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = '820-2-22' AND cr.code = 'REQ-46'`;
    await runFile(ROLLBACK);
    const l = await ledgers();
    const req46 = (await gateRow('820-2-22', 'REQ-46'))!.condition;
    log('rollback with one edited gate', { l, req46 });
    expect(l).toEqual({ compliance_requirements_archive_m820_o23: 1, fields_archive_m820_o23: 0, m820_o23_written: 1 });
    expect(req46).toMatch(/^IF bauleistungen_vergeben == true THEN/);
    await harness.sql`UPDATE compliance_requirements cr SET description = left(cr.description, length(cr.description) - length(' (edited)')) FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = '820-2-22' AND cr.code = 'REQ-46'`;
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
    expect(post[0]).toEqual([{ fields: '2', fields_pre: '0', fields_post: '2', gates: '1', gates_pre: '0', gates_post: '1', fields_neither: null, gates_neither: null }]);
    expect(post[1]).toEqual([
      { ws: '820-2-17', kind: 'field', item: 'bauleistungen_vergeben', rule: '', consumers: '820-2-18,820-2-19,820-2-22,820-2-24', sev: '' },
      { ws: '820-2-18', kind: 'field', item: 'testbetrieb_vs_abnahme_choice', rule: 'bauleistungen_vergeben == true', consumers: '820-2-22', sev: '' },
      { ws: '820-2-22', kind: 'gate', item: 'REQ-46', rule: "IF bauleistungen_vergeben == true THEN (IF testbetrieb_vs_abnahme_choice == 'testbetrieb' OR testbetrieb_vs_abnahme_choice == 'mischform' THEN (testbetrieb_planned == true))", consumers: '§5.7.1, §5.7.2, Bild 3', sev: 'block' },
    ]);
    expect(post[2]).toHaveLength(4);
    expect(post[3]).toEqual([]);
    expect(post[4]).toEqual([{ gate_archive: '1', field_archive: '2', written: '3' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('f. AFTER: verdicts through the REAL approval gate + the form visibility pair (O-2 behaviour, O-3 unchanged)', async () => {
    await runFile(MIGRATION);
    const after = await probeAll();
    log('AFTER probes', Object.fromEntries(PROBES.map((p, i) => [p.label, after[i]])));
    expect(after).toEqual(PROBES.map((p) => p.after));
    // award unanswered: REQ-46 waits and names the award question
    expect(await pendingNamed(P.open, '820-2-22', 'REQ-46')).toEqual(['bauleistungen_vergeben']);
    // O-3: none of the three fields M8203-23 still asks for under Einzelprojekt is computed or belongs to Anhang A
    const comp = await computed820_3();
    expect(M8203_23_MANUAL.filter((s) => comp.has(s) || s.includes('anhang_a'))).toEqual([]);
    await runFile(ROLLBACK);
  });

  it('g. AFTER: REQ-46 both ways on real values; self-built leftover stays saved and hidden; award again = as today', async () => {
    await runFile(MIGRATION);
    // awarded: planned=false fails (above) → planned=true passes
    await save(P.award, '820-2-22', { testbetrieb_planned: b(true) });
    const awardPass = await verdict(P.award, '820-2-22', 'REQ-46');
    // award answered for the unanswered project: true → fails on mischform + planned=false; false → not applicable
    await save(P.open, '820-2-17', { bauleistungen_vergeben: b(true) });
    const openAwarded = await verdict(P.open, '820-2-22', 'REQ-46');
    await save(P.open, '820-2-17', { bauleistungen_vergeben: b(false) });
    const openSelf = { REQ46: await verdict(P.open, '820-2-22', 'REQ-46'), hidden18: await formHidden(P.open, '820-2-18') };
    // self-built leftover: the saved value is kept (not deleted), only hidden; switching back to an award brings the check back
    const [left] = await harness.sql<{ v: string | null }[]>`SELECT pp.value_enum AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
      WHERE pp.project_id = ${P.self.id} AND f.symbol = 'testbetrieb_vs_abnahme_choice'`;
    await save(P.self, '820-2-17', { bauleistungen_vergeben: b(true) });
    const selfAwarded = await verdict(P.self, '820-2-22', 'REQ-46');
    await save(P.self, '820-2-17', { bauleistungen_vergeben: b(false) });
    const res = { awardPass, openAwarded, openSelf, leftover: left?.v ?? null, selfAwarded, selfBack: await verdict(P.self, '820-2-22', 'REQ-46') };
    log('REQ-46 both ways (after)', res);
    expect(res).toEqual({ awardPass: 'none', openAwarded: 'fail', openSelf: { REQ46: 'none', hidden18: ['leistungsbeschreibung_type', 'testbetrieb_vs_abnahme_choice'] },
      leftover: 'testbetrieb', selfAwarded: 'fail', selfBack: 'none' });
    await save(P.award, '820-2-22', { testbetrieb_planned: b(false) });
    await save(P.open, '820-2-17', { bauleistungen_vergeben: b(true) });
    await harness.sql`DELETE FROM project_parameters pp USING fields f WHERE pp.field_id = f.id AND pp.project_id = ${P.open.id} AND f.symbol = 'bauleistungen_vergeben'`;
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });
});
