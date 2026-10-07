/**
 * DWA-M 820 · three small owner-requested fixes (2026-10-07) — embedded-Postgres proof of
 *   scripts/migrations/20261007120000_m820_small_fixes.sql
 *   scripts/rollback-20261007120000-m820-small-fixes.sql
 *   scripts/verification/apply/readback-20261007120000-m820-small-fixes.sql
 * (apply order + choices: vault 01-Projects/ekowai-wizard/m820-wizard-test/60_APPLY-ORDER-m820-small-fixes.md).
 *   1. 820-2-24 routed by bauleistungen_vergeben (REQ-51 / REQ-52 not applicable and the warranty part hidden without a construction award)
 *   2. 820-2-06 status_report_frequency token `halbjaehrlich`
 *   3. M820-01 / M8203-01 project_size hint sentence (carried over, counts as answered)
 *
 * Disposable embedded Postgres only — no prod, no .env.local. REAL saveWorksheet / recomputeWorksheetEquations / checkApprovalGate /
 * loadInheritedFields + computeVisibility (the form's pair). SEED (= prod 2026-10-07): the three 2026-10-05 dumps + prior.json consumers
 * and every M820 block applied on prod, the decisions block 20261007110000 included. Read-back R0 pins the pre-state of the 2 gates and
 * 10 fields the block touches to signatures taken from the LIVE rows (prod-query 2026-10-07): gates_pre 2 / fields_pre 10 proves the
 * seed is byte-identical to prod for every column the block guards. ROWS: synthetic projects, no client data.
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
import { computeVisibility } from '@/lib/compliance/visibility';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008fe';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261007120000_m820_small_fixes.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261007120000-m820-small-fixes.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261007120000-m820-small-fixes.sql');
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
].map((p) => resolve(ROOT, p));
const LIVE_PHASE: Record<string, Array<[number, number, number]>> = {
  'DWA-M-820-1': [[1, 3, 1], [4, 9, 2], [10, 15, 3], [16, 20, 4], [21, 23, 5], [24, 25, 6]],
  'DWA-M-820-2': [[1, 4, 1], [5, 10, 2], [11, 15, 3], [16, 19, 4], [20, 24, 5], [25, 28, 6]],
  'DWA-M-820-3': [[1, 3, 1], [4, 6, 2], [7, 10, 3], [11, 18, 4], [19, 21, 5], [22, 24, 6]],
};
const log = (label: string, v: unknown) => console.log(`[M820 SMALL FIXES] ${label}: ${JSON.stringify(v)}`);
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
const LEDGERS = ['compliance_requirements_archive_m820_sf', 'fields_archive_m820_sf', 'm820_sf_written'];
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
const EMPTY = { compliance_requirements_archive_m820_sf: 0, fields_archive_m820_sf: 0, m820_sf_written: 0 };
const FULL = { compliance_requirements_archive_m820_sf: 2, fields_archive_m820_sf: 10, m820_sf_written: 12 };
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
type V = { type: 'boolean'; value: boolean } | { type: 'enum'; value: string } | { type: 'json'; value: unknown };
const e = (value: string): V => ({ type: 'enum', value });
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
/** The REAL approval gate: is the gate among the refusing (failing or waiting) block gates? */
async function refuses(p: Proj, ws: string, code: string): Promise<boolean> {
  const g = await checkApprovalGate(p.inst.get(ws)!);
  return [...g.failingBlockConditions, ...g.pendingBlockConditions].some((c) => c.code === code);
}
/** A WARN gate's verdict through the same real gate: severity flipped to block for the call only, then restored byte-identically. */
async function warnFires(p: Proj, ws: string, code: string): Promise<boolean> {
  const r = await gateRow(ws, code);
  expect(r?.severity, `${ws} ${code} is warn`).toBe('warn');
  const upd = (sev: string) => harness.sql`UPDATE compliance_requirements cr SET severity = ${sev} FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = ${ws} AND cr.code = ${code}`;
  await upd('block');
  try { return await refuses(p, ws, code); } finally { await upd('warn'); }
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
const inheritsDriver = async (ws: string) => {
  const [t] = await harness.sql<{ id: string; standard_id: string }[]>`SELECT id, standard_id FROM worksheet_templates WHERE code = ${ws}`;
  return (await loadInheritedFields(t.id, t.standard_id, ws)).some((f) => f.symbol === 'bauleistungen_vergeben');
};

let PRE: TableDump;
const P: Record<string, Proj> = {};
const WARRANTY_PART = ['defect_tracking_active', 'gewaehrleistungen', 'warranty_count', 'warranty_end_date', 'warranty_open_defects', 'warranty_start_date'];
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
  // prod's compliance_requirements carries the audit columns source_quote / source_anchor (the decisions block writes both).
  await sql`ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS source_quote text`;
  await sql`ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS source_anchor text`;
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-small-fixes@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820 small fixes harness', ${'m820-sf-' + Date.now()}) RETURNING id`;
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
  for (const blk of PRIOR_BLOCKS) await runFile(blk); // = prod 2026-10-07 (decisions 48/50 included)
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadInheritedFields } = await import('@/lib/db/queries/worksheet'));
  ({ recomputeWorksheetEquations: recompute } = await import('@/lib/actions/recompute-worksheet'));

  // ── 820-2 projects: LPH 9 by the contractor, defect tracking not confirmed, empty warranty calendar, no LPH 9 name ──
  P.bau = await makeProject('820-2: construction works awarded (bauleistungen_vergeben = yes)');
  await save(P.bau, '820-2-01', { verantwortung_lph9: e('auftragnehmer') });
  await save(P.bau, '820-2-17', { bauleistungen_vergeben: b(true) });
  await save(P.bau, '820-2-24', { defect_tracking_active: b(false) });
  P.nobau = await makeProject('820-2: no construction award, the client builds itself (bauleistungen_vergeben = no)');
  await save(P.nobau, '820-2-01', { verantwortung_lph9: e('auftragnehmer') });
  await save(P.nobau, '820-2-17', { bauleistungen_vergeben: b(false) });
  await save(P.nobau, '820-2-24', { defect_tracking_active: b(false) });
  P.open = await makeProject('820-2: construction-award question unanswered, defect tracking confirmed');
  await save(P.open, '820-2-01', { verantwortung_lph9: e('auftragnehmer') });
  await save(P.open, '820-2-24', { defect_tracking_active: b(true) });
  P.entf = await makeProject('820-2: LPH 9 does not occur (control)');
  await save(P.entf, '820-2-01', { verantwortung_lph9: e('entfaellt') });
  await save(P.entf, '820-2-17', { bauleistungen_vergeben: b(true) });
  for (const p of [P.bau, P.nobau, P.open, P.entf]) await recompute(p.inst.get('820-2-24')!);

  PROBES = [
    { label: 'REQ-52 (block) refuses · awarded', run: () => refuses(P.bau, '820-2-24', 'REQ-52'), before: true, after: true },
    { label: 'REQ-52 (block) refuses · no award', run: () => refuses(P.nobau, '820-2-24', 'REQ-52'), before: true, after: false },
    { label: 'REQ-52 (block) refuses · award unanswered (tracking confirmed)', run: () => refuses(P.open, '820-2-24', 'REQ-52'), before: false, after: true },
    { label: 'REQ-52 (block) refuses · LPH 9 entfällt', run: () => refuses(P.entf, '820-2-24', 'REQ-52'), before: false, after: false },
    { label: 'REQ-51 (warn) fires · awarded, empty calendar', run: () => warnFires(P.bau, '820-2-24', 'REQ-51'), before: true, after: true },
    { label: 'REQ-51 (warn) fires · no award', run: () => warnFires(P.nobau, '820-2-24', 'REQ-51'), before: true, after: false },
    { label: 'REQ-51 (warn) fires · LPH 9 entfällt', run: () => warnFires(P.entf, '820-2-24', 'REQ-51'), before: false, after: false },
    { label: 'REQ-52-2 (warn, kept) fires · awarded, no LPH 9 name', run: () => warnFires(P.bau, '820-2-24', 'REQ-52-2'), before: true, after: true },
    { label: 'REQ-52-2 (warn, kept) fires · no award, no LPH 9 name', run: () => warnFires(P.nobau, '820-2-24', 'REQ-52-2'), before: true, after: true },
    { label: 'missing required on 820-2-24 · awarded', run: () => missingReq(P.bau, '820-2-24'), before: ['warranty_end_date', 'warranty_start_date'], after: ['warranty_end_date', 'warranty_start_date'] },
    { label: 'missing required on 820-2-24 · no award', run: () => missingReq(P.nobau, '820-2-24'), before: ['warranty_end_date', 'warranty_start_date'], after: [] },
    { label: 'form-hidden on 820-2-24 · awarded', run: () => formHidden(P.bau, '820-2-24'), before: [], after: [] },
    { label: 'form-hidden on 820-2-24 · no award', run: () => formHidden(P.nobau, '820-2-24'), before: [], after: WARRANTY_PART },
    { label: 'form-hidden on 820-2-24 · award unanswered', run: () => formHidden(P.open, '820-2-24'), before: [], after: [] },
    { label: 'form-hidden on 820-2-24 · LPH 9 entfällt', run: () => formHidden(P.entf, '820-2-24'), before: ['defect_tracking_active', 'verantwortlich_lph9_name', 'warranty_end_date', 'warranty_start_date'], after: ['defect_tracking_active', 'verantwortlich_lph9_name', 'warranty_end_date', 'warranty_start_date'] },
    { label: 'bauleistungen_vergeben inherited on 820-2-24 (consumer_worksheets)', run: () => inheritsDriver('820-2-24'), before: false, after: true },
  ];
}, 900_000);

afterAll(async () => {
  await harness?.stop();
});

async function probeAll(): Promise<unknown[]> { const out: unknown[] = []; for (const p of PROBES) out.push(await p.run()); return out; }

describe('DWA-M 820 small fixes — staged block on embedded Postgres (seed = prod 2026-10-07)', () => {
  it('a. pre-state = the LIVE rows (read-back R0 gates_pre 2 / fields_pre 10); verdicts BEFORE through the real gate path', async () => {
    expect(await ledgers()).toEqual({ compliance_requirements_archive_m820_sf: null, fields_archive_m820_sf: null, m820_sf_written: null });
    const r = await readback(4);
    log('BEFORE read-back R0..R3', r);
    expect(r[0]).toEqual([{ gates: '2', gates_pre: '2', gates_post: '0', fields: '10', fields_pre: '10', fields_post: '0', gates_neither: null, fields_neither: null }]);
    expect(r[2]).toEqual([{ tokens: 'weekly,biweekly,monthly,quarterly,ad_hoc', n: '5' }]);
    expect(r[3]).toEqual([]);
    const before = await probeAll();
    log('BEFORE probes', Object.fromEntries(PROBES.map((p, i) => [p.label, before[i]])));
    expect(before).toEqual(PROBES.map((p) => p.before));
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: 2 gates + 10 fields changed, nothing else; severities unchanged', async () => {
    const sevBefore = await harness.sql`SELECT cr.code, cr.severity FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE w.code = '820-2-24' ORDER BY 1`;
    await runFile(MIGRATION);
    const diff = dumpDiff(PRE, await dump());
    log('apply diff (table / sign counts)', tally(diff));
    expect(tally(diff)).toEqual({ 'compliance_requirements +': 2, 'compliance_requirements -': 2, 'fields +': 10, 'fields -': 10 });
    expect(await ledgers()).toEqual(FULL);
    const sevAfter = await harness.sql`SELECT cr.code, cr.severity FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE w.code = '820-2-24' ORDER BY 1`;
    expect([...sevAfter]).toEqual([...sevBefore]);
    expect((await gateRow('820-2-24', 'REQ-51'))!.condition).toBe("IF verantwortung_lph9 != 'entfaellt' THEN (IF bauleistungen_vergeben == true THEN (warranty_count >= 1))");
    expect((await gateRow('820-2-24', 'REQ-52'))!.condition).toBe("IF verantwortung_lph9 != 'entfaellt' THEN (IF bauleistungen_vergeben == true THEN (defect_tracking_active == true))");
    const hints = await harness.sql<{ id: string; ok: boolean }[]>`SELECT cr.id, (cr.description LIKE '%' || chr(10) || '[EN] %' AND cr.description ~ '\\(S\\. [0-9]') AS ok
      FROM compliance_requirements cr WHERE cr.id IN (SELECT id FROM compliance_requirements_archive_m820_sf)
      UNION ALL SELECT f.id, (f.description LIKE '%' || chr(10) || '[EN] %') FROM fields f WHERE f.id IN (SELECT id FROM fields_archive_m820_sf)`;
    expect(hints.filter((h) => !h.ok)).toEqual([]);
    expect(hints).toHaveLength(12);
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
    await harness.sql`UPDATE compliance_requirements cr SET description = cr.description || ' (edited)' FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = '820-2-24' AND cr.code = 'REQ-52'`;
    await runFile(ROLLBACK);
    const l = await ledgers();
    const r = { REQ52: (await gateRow('820-2-24', 'REQ-52'))!.condition, REQ51: (await gateRow('820-2-24', 'REQ-51'))!.condition };
    log('rollback with one edited gate', { l, r });
    expect(l).toEqual({ compliance_requirements_archive_m820_sf: 1, fields_archive_m820_sf: 0, m820_sf_written: 1 });
    expect(r).toEqual({ REQ52: "IF verantwortung_lph9 != 'entfaellt' THEN (IF bauleistungen_vergeben == true THEN (defect_tracking_active == true))", REQ51: "IF verantwortung_lph9 != 'entfaellt' THEN (warranty_count >= 1)" });
    await harness.sql`UPDATE compliance_requirements cr SET description = left(cr.description, length(cr.description) - length(' (edited)')) FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = '820-2-24' AND cr.code = 'REQ-52'`;
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
    const sigs = await harness.sql`SELECT w.code AS ws, cr.code AS item, concat_ws('|', md5(cr.condition), cr.severity, md5(coalesce(cr.description, ''))) AS sig
        FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE cr.id IN (SELECT id FROM compliance_requirements_archive_m820_sf)
      UNION ALL SELECT w.code, f.symbol, md5(coalesce(f.description, '')) || '|' || md5(coalesce(f.visible_when, '')) || '|' || coalesce(array_to_string(f.consumer_worksheets, ','), '') || '|' || coalesce(md5(f.enum_values::text), '')
        FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE f.id IN (SELECT id FROM fields_archive_m820_sf) ORDER BY 1, 2`;
    log('post-state signatures (read-back R0 sig1)', sigs);
    expect(post[0]).toEqual([{ gates: '2', gates_pre: '0', gates_post: '2', fields: '10', fields_pre: '0', fields_post: '10', gates_neither: null, fields_neither: null }]);
    expect(post[1]).toEqual([
      { kind: 'field', item: 'defect_tracking_active', sev: 'C', rule: "(verantwortung_lph9 != 'entfaellt') AND (bauleistungen_vergeben == true)" },
      { kind: 'field', item: 'gewaehrleistungen', sev: 'C', rule: 'bauleistungen_vergeben == true' },
      { kind: 'field', item: 'verantwortlich_lph9_name', sev: 'B', rule: "verantwortung_lph9 != 'entfaellt'" },
      { kind: 'field', item: 'warranty_count', sev: 'D', rule: 'bauleistungen_vergeben == true' },
      { kind: 'field', item: 'warranty_end_date', sev: 'D', rule: "(verantwortung_lph9 != 'entfaellt') AND (bauleistungen_vergeben == true)" },
      { kind: 'field', item: 'warranty_open_defects', sev: 'D', rule: 'bauleistungen_vergeben == true' },
      { kind: 'field', item: 'warranty_start_date', sev: 'B', rule: "(verantwortung_lph9 != 'entfaellt') AND (bauleistungen_vergeben == true)" },
      { kind: 'gate', item: 'REQ-51', sev: 'warn', rule: "IF verantwortung_lph9 != 'entfaellt' THEN (IF bauleistungen_vergeben == true THEN (warranty_count >= 1))" },
      { kind: 'gate', item: 'REQ-52', sev: 'block', rule: "IF verantwortung_lph9 != 'entfaellt' THEN (IF bauleistungen_vergeben == true THEN (defect_tracking_active == true))" },
      { kind: 'gate', item: 'REQ-52-2', sev: 'warn', rule: "IF verantwortung_lph9 != 'entfaellt' THEN (verantwortlich_lph9_name IS NOT NULL)" },
    ]);
    expect(post[2]).toEqual([{ tokens: 'weekly,biweekly,monthly,quarterly,halbjaehrlich,ad_hoc', n: '6' }]);
    expect(post[3]).toEqual([]);
    expect(post[4]).toEqual([{ gate_archive: '2', field_archive: '10', written: '12' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('f. AFTER: verdicts through the REAL approval gate + the form visibility pair; the unanswered question is named; the new token saves', async () => {
    await runFile(MIGRATION);
    const after = await probeAll();
    log('AFTER probes', Object.fromEntries(PROBES.map((p, i) => [p.label, after[i]])));
    expect(after).toEqual(PROBES.map((p) => p.after));
    // award unanswered: REQ-52 waits and names the question (the same as REQ-38 … REQ-41 on 820-2-17)
    const named = await pendingNamed(P.open, '820-2-24', 'REQ-52');
    log('REQ-52 pending inputs (award unanswered)', named);
    expect(named).toEqual(['bauleistungen_vergeben']);
    // awarded: REQ-52 passes once defect tracking is confirmed; REQ-51 silent once a complete calendar row exists
    await save(P.bau, '820-2-24', { defect_tracking_active: b(true), gewaehrleistungen: jv({ rows: [{ id: 'g1', auftragnehmer: 'Firma A (Los 1)', abnahme: '2026-05-04', beginn: '2026-05-04', ende: '2031-05-03' }] }) });
    await recompute(P.bau.inst.get('820-2-24')!);
    const pass = { REQ52: await refuses(P.bau, '820-2-24', 'REQ-52'), REQ51: await warnFires(P.bau, '820-2-24', 'REQ-51') };
    log('awarded, tracking confirmed + one complete warranty row (refused / fires?)', pass);
    expect(pass).toEqual({ REQ52: false, REQ51: false });

    // item 2: the token is offered and saves through the real save path; REQ-08 (warn, IS NOT NULL) is satisfied by it
    const [opt] = await harness.sql<{ label_de: string; label_en: string; o: number }[]>`SELECT e->>'label_de' AS label_de, e->>'label_en' AS label_en, (e->>'order_index')::int AS o
      FROM fields f, jsonb_array_elements(f.enum_values) e WHERE f.symbol = 'status_report_frequency' AND e->>'value' = 'halbjaehrlich'`;
    expect(opt).toEqual({ label_de: 'Halbjährlich', label_en: 'Every six months', o: 5 });
    const req08Before = await warnFires(P.bau, '820-2-06', 'REQ-08');
    await save(P.bau, '820-2-06', { status_report_frequency: e('halbjaehrlich') });
    const [sv] = await harness.sql<{ v: string }[]>`SELECT pp.value_enum AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id WHERE pp.project_id = ${P.bau.id} AND f.symbol = 'status_report_frequency'`;
    const req08After = await warnFires(P.bau, '820-2-06', 'REQ-08');
    const rb3 = (await readback(4))[3];
    log('halbjaehrlich saved · REQ-08 fires before / after · read-back R3', { saved: sv?.v, req08Before, req08After, rb3 });
    expect({ saved: sv?.v, req08Before, req08After }).toEqual({ saved: 'halbjaehrlich', req08Before: true, req08After: false });
    expect(rb3).toEqual([{ project: 'construction works awarded (bauleistungen_vergeben = yes)'.replace(/^/, '820-2: '), value_text: null, value_enum: 'halbjaehrlich' }]);
    // no equation reads the field; the only gate reading it is REQ-08
    const readers = await harness.sql<{ k: string }[]>`SELECT 'gate ' || cr.code AS k FROM compliance_requirements cr WHERE cr.condition LIKE '%status_report_frequency%'
      UNION ALL SELECT 'equation ' || eq.equation_number FROM equations eq WHERE eq.formula LIKE '%status_report_frequency%' ORDER BY 1`;
    expect(readers.map((r) => r.k)).toEqual(['gate REQ-08']);

    // rollback with a saved halbjaehrlich value: definitions restored byte-equal, the saved value stays (read-back R3 lists it)
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
    expect((await readback(4))[3]).toHaveLength(1);
  });

  it('g. hints: project_size copies — only the pre-fill sentence changed (DE + EN), the rest byte-identical; 820-2-06 / 820-2-17 hints', async () => {
    const pre = await harness.sql<{ ws: string; d: string }[]>`SELECT w.code AS ws, f.description AS d FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
      WHERE f.symbol = 'project_size' AND w.code IN ('M820-01', 'M8203-01') ORDER BY 1`;
    await runFile(MIGRATION);
    const post = await harness.sql<{ ws: string; d: string }[]>`SELECT w.code AS ws, f.description AS d FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
      WHERE f.symbol = 'project_size' AND w.code IN ('M820-01', 'M8203-01') ORDER BY 1`;
    const OLD_DE = 'Übernommen wird sie nur als Vorbelegung: solange dieses Blatt keine eigene Antwort hat und alle im Projekt gespeicherten Antworten übereinstimmen, zeigt die Seite die dort gewählte Größe an; hier überschreibbar.';
    const NEW_DE = 'Die dort gespeicherte Größe wird übernommen: solange dieses Blatt keine eigene Antwort hat, zeigt die Seite sie mit dem Hinweis „Übernommen aus DWA-M 820-2 (820-2-01)“ an, und sie zählt hier als beantwortet; hier überschreibbar.';
    const OLD_EN = 'It is carried over only as a pre-fill: while this sheet has no own answer and all answers saved in the project agree, the page shows the size chosen there; it can be overwritten here.';
    const NEW_EN = 'The size saved there is taken over: while this sheet has no own answer, the page shows it with the note "taken from DWA-M 820-2 (820-2-01)", and it counts as answered here; it can be overwritten here.';
    for (let i = 0; i < 2; i++) {
      expect(pre[i].d.includes(OLD_DE) && pre[i].d.includes(OLD_EN), `${pre[i].ws} pre`).toBe(true);
      expect(post[i].d.includes(NEW_DE) && post[i].d.includes(NEW_EN) && !post[i].d.includes('Vorbelegung') && !post[i].d.includes('pre-fill'), `${post[i].ws} post`).toBe(true);
      expect(post[i].d.replace(NEW_DE, OLD_DE).replace(NEW_EN, OLD_EN)).toBe(pre[i].d);
    }
    const [bv] = await harness.sql<{ d: string; cw: string[] }[]>`SELECT description AS d, consumer_worksheets AS cw FROM fields WHERE symbol = 'bauleistungen_vergeben'`;
    expect(bv.cw).toEqual(['820-2-18', '820-2-19', '820-2-24']);
    expect(bv.d).toContain('Gewährleistungsteil von 820-2-24');
    expect(bv.d).toContain('warranty part of 820-2-24');
    const [srf] = await harness.sql<{ d: string }[]>`SELECT description AS d FROM fields WHERE symbol = 'status_report_frequency'`;
    expect(srf.d).toContain('„Halbjährlich“ ist eine Werkzeug-Option für vertraglich vereinbarte Berichtstakte');
    log('hint lengths after (M820-01, M8203-01, bauleistungen_vergeben, status_report_frequency)', [post[0].d.length, post[1].d.length, bv.d.length, srf.d.length]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });
});
