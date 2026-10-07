/**
 * DWA-M 820-1 / -2 / -3 · the controller's decisions on sign-off sheets 48_ and 50_ — embedded-Postgres proof of
 *   scripts/migrations/20261007110000_m820_decisions_48_50.sql
 *   scripts/rollback-20261007110000-m820-decisions-48-50.sql
 *   scripts/verification/apply/readback-20261007110000-m820-decisions-48-50.sql
 * (decisions: vault 01-Projects/ekowai-wizard/m820-wizard-test/51_DECISIONS-48-50-by-controller_2026-10-07.md; apply order 52_).
 *
 * Disposable embedded Postgres only — no prod, no .env.local. REAL saveWorksheet / recomputeWorksheetEquations / checkApprovalGate.
 * SEED (= prod 2026-10-07): the three 2026-10-05 dumps + prior.json consumers and every M820 block applied on prod (client route …
 * guideline criteria 20261006240000, size declaration 20261007100000). Read-back R0 pins the pre-state of the 22 gates and 23 fields the
 * block touches to tuples taken from the LIVE rows (prod-query 2026-10-07): gates_pre 22 / fields_pre 23 proves the seed is
 * byte-identical to prod for every column the block guards. ROWS: synthetic projects, no client data.
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
import type { recomputeWorksheetEquations as RecomputeWorksheetEquations } from '@/lib/actions/recompute-worksheet';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008fd';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261007110000_m820_decisions_48_50.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261007110000-m820-decisions-48-50.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261007110000-m820-decisions-48-50.sql');
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
].map((p) => resolve(ROOT, p));
const LIVE_PHASE: Record<string, Array<[number, number, number]>> = {
  'DWA-M-820-1': [[1, 3, 1], [4, 9, 2], [10, 15, 3], [16, 20, 4], [21, 23, 5], [24, 25, 6]],
  'DWA-M-820-2': [[1, 4, 1], [5, 10, 2], [11, 15, 3], [16, 19, 4], [20, 24, 5], [25, 28, 6]],
  'DWA-M-820-3': [[1, 3, 1], [4, 6, 2], [7, 10, 3], [11, 18, 4], [19, 21, 5], [22, 24, 6]],
};
const log = (label: string, v: unknown) => console.log(`[M820 DECISIONS 48/50] ${label}: ${JSON.stringify(v)}`);
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
const tally = (diff: string[]) => { const k = diff.map((l) => l.split(' ').slice(0, 2).join(' ')); return Object.fromEntries([...new Set(k)].sort().map((x) => [x, k.filter((y) => y === x).length])); };
const digest = (d: TableDump) => Object.fromEntries(TOUCHED.map((t) => [t, `${d[t].length} rows md5 ${md5(d[t].join('\n'))}`]));
async function runFile(path: string): Promise<void> {
  const conn = await harness.sql.reserve();
  try { await conn.unsafe(readFileSync(path, 'utf8')); } finally { conn.release(); }
}
const LEDGERS = ['compliance_requirements_archive_m820_d48', 'fields_archive_m820_d48', 'm820_d48_written', 'm820_d48_added'];
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
const EMPTY = { compliance_requirements_archive_m820_d48: 0, fields_archive_m820_d48: 0, m820_d48_written: 0, m820_d48_added: 0 };
const FULL = { compliance_requirements_archive_m820_d48: 22, fields_archive_m820_d48: 23, m820_d48_written: 45, m820_d48_added: 4 };
const RB_STMTS = splitOnUnquotedSemicolons(readFileSync(READBACK, 'utf8')).filter((s) => s.replace(/--.*$/gm, '').trim());
/** R5 reads the block's ledgers, which exist only after an apply — before the apply run R0 … R4 (step 0 on prod). */
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
type Case = { ws: string; code: string; p: () => Proj; before: boolean; after: boolean; why: string };

let PRE: TableDump;
const P: Record<string, Proj> = {};
let CASES: Case[] = [];
const WARRANTY_ROW = { id: 'g1', auftragnehmer: 'Firma A (Los 1)', abnahme: '2026-05-04', beginn: '2026-05-04', ende: '2031-05-03' };

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
  // prod's compliance_requirements carries the audit columns source_quote / source_anchor (information_schema, prod-query 2026-10-07);
  // the drizzle schema of the harness does not — the new gate REQ-23-2 writes both.
  await sql`ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS source_quote text`;
  await sql`ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS source_anchor text`;
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-decisions-48-50@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820 decisions 48/50 harness', ${'m820-d48-' + Date.now()}) RETURNING id`;
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
  ({ recomputeWorksheetEquations: recompute } = await import('@/lib/actions/recompute-worksheet'));

  // ── 820-2: the same base answers in three projects; they differ only in the three driver answers (typed after the apply) ──
  const base820_2 = async (p: Proj) => {
    await save(p, '820-2-01', { verantwortung_lph9: e('auftragnehmer') });
    await save(p, '820-2-04', { regulations_current_check: b(false) });
    await save(p, '820-2-09', { approval_procedure_defined: b(false) });
    await save(p, '820-2-17', { bauleistungen_vergeben: b(true), nebenangebote_conditions: b(false) });
    await save(p, '820-2-25', { approval_release_process: b(false) });
    await save(p, '820-2-26', { liability_clarified: b(false), ip_rights_defined: b(false) });
  };
  P.no = await makeProject('820-2: client WITHOUT own rules, no innovation required, alternative bids NOT admitted (drivers = no)');
  await base820_2(P.no);
  P.yes = await makeProject('820-2: client WITH own rules but no release process, innovation required, alternative bids admitted (drivers = yes)');
  await base820_2(P.yes);
  P.open = await makeProject('820-2: driver questions left unanswered');
  await base820_2(P.open);
  P.nobau = await makeProject('820-2: no construction award (client builds itself)');
  await save(P.nobau, '820-2-17', { bauleistungen_vergeben: b(false), nebenangebote_conditions: b(false) });
  // ── 820-1: VgV-F, municipal client, no award criteria, risk register without a measure plan ──
  P.vgv = await makeProject('820-1: municipality, VgV-F, no award criteria yet, risk register but empty measure plan');
  await save(P.vgv, 'M820-01', { client_organization_type: e('municipality') });
  await save(P.vgv, 'M820-10', { procurement_procedure: e('vgv_f') });
  await save(P.vgv, 'M820-06', { risk_register: jv({ rows: [{ id: 'r1', risiko: 'Baugrund', gruppe: 'Rahmenbedingungen' }] }) });
  await save(P.vgv, 'M820-07', { risk_mitigation_plan: jv({ rows: [] }) });
  // ── 820-1: direct award, municipal client, no procurement memo ──
  P.direct = await makeProject('820-1: municipality, direct award, procurement memo not confirmed');
  await save(P.direct, 'M820-01', { client_organization_type: e('municipality') });
  await save(P.direct, 'M820-10', { procurement_procedure: e('direktvergabe') });
  await save(P.direct, 'M820-24', { vergabevermerk_complete: b(false) });
  // ── 820-3: critical-infrastructure requirements not assessed ──
  P.kritis = await makeProject('820-3: data complete + AKZ, critical-infrastructure requirements not assessed');
  await save(P.kritis, 'M8203-01', { project_type: e('einzelprojekt') });
  await save(P.kritis, 'M8203-20', { bestandsdaten_complete_digital: b(true), akz_in_place: b(true), critical_infra_assessed: b(false) });

  CASES = [
    { ws: '820-2-04', code: 'REQ-53', p: () => P.no, before: true, after: false, why: 'no own rules → § 6 does not apply' },
    { ws: '820-2-04', code: 'REQ-53', p: () => P.yes, before: true, after: true, why: 'own rules, currency not checked → § 6.3.1 „müssen“' },
    { ws: '820-2-25', code: 'REQ-54', p: () => P.no, before: true, after: false, why: 'no own rules → no refusal (48_ C-1)' },
    { ws: '820-2-25', code: 'REQ-54', p: () => P.yes, before: true, after: true, why: 'own rules, no process → § 6.3.1 „muss ein Prozess eingerichtet sein“' },
    { ws: '820-2-25', code: 'REQ-54', p: () => P.open, before: true, after: true, why: 'question unanswered → waits' },
    { ws: '820-2-17', code: 'REQ-38', p: () => P.no, before: true, after: false, why: 'alternative bids not admitted → § 5.5.1 does not apply' },
    { ws: '820-2-17', code: 'REQ-38', p: () => P.yes, before: true, after: true, why: 'admitted, no minimum requirements → „sind … zu formulieren“' },
    { ws: '820-2-26', code: 'REQ-55', p: () => P.no, before: false, after: false, why: 'no innovation required (was warn)' },
    { ws: '820-2-26', code: 'REQ-55', p: () => P.yes, before: false, after: true, why: 'innovation required, liability open → § 7.3.4 „müssen“ (warn → block)' },
    { ws: '820-2-26', code: 'REQ-56', p: () => P.no, before: true, after: false, why: 'no innovation required → § 7.2 does not apply' },
    { ws: '820-2-26', code: 'REQ-56', p: () => P.yes, before: true, after: true, why: 'innovation required, rights not discussed → § 7.2 „muss immer“' },
    { ws: '820-2-09', code: 'REQ-17', p: () => P.no, before: true, after: false, why: 'block → warn (indicative § 4.6.2)' },
    { ws: '820-2-24', code: 'REQ-51', p: () => P.no, before: true, after: false, why: 'block → warn + re-bound to the warranty calendar' },
    { ws: '820-2-27', code: 'REQ-57', p: () => P.no, before: false, after: false, why: 'stays warn (fix round 1: „sollten nur in Einzelfällen“), register never filled' },
    { ws: 'M820-14', code: 'REQ-14', p: () => P.vgv, before: false, after: true, why: 'empty condition → refuses without award criteria (§ 8.10.3.3)' },
    { ws: 'M820-14', code: 'REQ-14', p: () => P.direct, before: false, after: false, why: 'direct award → VgV-F guard, does not apply' },
    { ws: 'M820-07', code: 'REQ-05', p: () => P.vgv, before: false, after: true, why: 'warn → block: measure plan empty (Anh. A „muss … ergänzt werden“)' },
    { ws: 'M820-24', code: 'REQ-23', p: () => P.direct, before: false, after: false, why: 'stays VgV-F only' },
    { ws: 'M8203-20', code: 'REQ-27', p: () => P.kritis, before: false, after: false, why: 'stays warn (fix round 1: conditional duty)' },
    { ws: '820-2-17', code: 'REQ-38', p: () => P.nobau, before: false, after: false, why: 'no construction award → driver hidden, REQ-38 not applicable' },
    { ws: '820-2-17', code: 'REQ-38', p: () => P.open, before: true, after: true, why: 'driver unanswered → waits (named)' },
    { ws: '820-2-26', code: 'REQ-55', p: () => P.open, before: false, after: true, why: 'driver unanswered → waits (named)' },
    { ws: '820-2-26', code: 'REQ-56', p: () => P.open, before: true, after: true, why: 'driver unanswered → waits (named)' },
  ];
}, 900_000);

afterAll(async () => {
  await harness?.stop();
});

/** Driver answers, typed through the real save path (the fields exist only after the apply). */
async function typeDrivers(): Promise<void> {
  for (const [p, v] of [[P.no, false], [P.yes, true]] as const) {
    await save(p, '820-2-04', { eigene_regelwerke_vorhanden: b(v) });
    await save(p, '820-2-17', { nebenangebote_zugelassen: b(v) });
    await save(p, '820-2-26', { innovation_verlangt: b(v) });
  }
}
async function clearDriverValues(): Promise<number> {
  const r = await harness.sql`DELETE FROM project_parameters pp USING fields f WHERE pp.field_id = f.id AND f.symbol IN ('eigene_regelwerke_vorhanden', 'nebenangebote_zugelassen', 'innovation_verlangt')`;
  return r.count;
}

describe('DWA-M 820 decisions on 48_ / 50_ — staged block on embedded Postgres (seed = prod 2026-10-07)', () => {
  it('a. pre-state = the LIVE rows (read-back R0 gates_pre 22 / fields_pre 23); severities; approval verdicts BEFORE', async () => {
    expect(await ledgers()).toEqual({ compliance_requirements_archive_m820_d48: null, fields_archive_m820_d48: null, m820_d48_written: null, m820_d48_added: null });
    const r = await readback(5);
    log('BEFORE read-back R0..R4', r);
    expect(r[0]).toEqual([{ gates: '22', gates_pre: '22', gates_post: '0', fields: '23', fields_pre: '23', fields_post: '0', gates_neither: null, fields_neither: null, new_gate: '0', new_fields: '0' }]);
    expect(r[1]).toEqual([
      { std: 'DWA-M-820-1', block: '17', warn: '9', other: '0' },
      { std: 'DWA-M-820-2', block: '51', warn: '10', other: '0' },
      { std: 'DWA-M-820-3', block: '20', warn: '30', other: '0' },
    ]);
    expect(r[2]).toEqual([]);
    expect(r[3]).toEqual([{ b_fields: '17', distinct_orders: '5', gap: 4 }]);
    expect(r[4]).toEqual([]);
    const before: Record<string, boolean> = {};
    for (const c of CASES) before[`${c.ws} ${c.code} (${c.why})`] = await refuses(c.p(), c.ws, c.code);
    log('BEFORE: approval refused by the gate', before);
    expect(Object.values(before)).toEqual(CASES.map((c) => c.before));
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: 22 gates + 23 fields changed, 1 gate + 3 fields added; nothing else; severities after', async () => {
    await runFile(MIGRATION);
    const diff = dumpDiff(PRE, await dump());
    log('apply diff (table / sign counts)', tally(diff));
    expect(tally(diff)).toEqual({ 'compliance_requirements +': 23, 'compliance_requirements -': 22, 'fields +': 26, 'fields -': 23 });
    expect(await ledgers()).toEqual(FULL);
    const sev = await harness.sql<{ std: string; block: number; warn: number }[]>`SELECT s.code AS std, sum((cr.severity = 'block')::int)::int AS block, sum((cr.severity = 'warn')::int)::int AS warn
      FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id GROUP BY 1 ORDER BY 1`;
    log('severity after', sev);
    expect(sev).toEqual([{ std: 'DWA-M-820-1', block: 18, warn: 9 }, { std: 'DWA-M-820-2', block: 40, warn: 21 }, { std: 'DWA-M-820-3', block: 20, warn: 30 }]);
    // guards in REQ-10's form / the driver form; every touched hint is bilingual
    expect((await gateRow('820-2-25', 'REQ-54'))!.condition).toBe('IF eigene_regelwerke_vorhanden == true THEN (approval_release_process == true)');
    expect((await gateRow('M820-24', 'REQ-23-2'))!.condition).toBe("IF (client_organization_type != 'privat_ohne_foerderung' OR vergaberecht_freiwillig_angewendet == true) AND procurement_procedure IN {suchverfahren, direktvergabe} THEN (vergabevermerk_complete == true)");
    const hints = await harness.sql<{ code: string; ok: boolean }[]>`SELECT cr.code, (cr.description LIKE '%' || chr(10) || '[EN] %' AND cr.description ~ '\\(S\\. [0-9]') AS ok
      FROM compliance_requirements cr WHERE cr.id IN (SELECT id FROM compliance_requirements_archive_m820_d48) OR cr.code = 'REQ-23-2'`;
    expect(hints.filter((h) => !h.ok)).toEqual([]);
    expect(hints).toHaveLength(23);
  });

  it('c. apply again: 0 changes (full dump compare), ledgers unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    expect(dumpDiff(before, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(FULL);
  });

  it('d. rollback: byte-equal to the pre-state, archives and ledgers emptied; second rollback no-op', async () => {
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
    await harness.sql`UPDATE compliance_requirements cr SET description = cr.description || ' (edited)' FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = '820-2-25' AND cr.code = 'REQ-54'`;
    await runFile(ROLLBACK);
    const l = await ledgers();
    const r = { REQ54: (await gateRow('820-2-25', 'REQ-54'))!.condition, REQ17: (await gateRow('820-2-09', 'REQ-17'))!.severity };
    log('rollback with one edited gate', { l, r });
    expect(l).toEqual({ compliance_requirements_archive_m820_d48: 1, fields_archive_m820_d48: 0, m820_d48_written: 1, m820_d48_added: 0 });
    expect(r).toEqual({ REQ54: 'IF eigene_regelwerke_vorhanden == true THEN (approval_release_process == true)', REQ17: 'block' });
    await harness.sql`UPDATE compliance_requirements cr SET description = left(cr.description, length(cr.description) - length(' (edited)')) FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = '820-2-25' AND cr.code = 'REQ-54'`;
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('e. the read-back file runs before and after an apply and shows the expected values', async () => {
    expect(RB_STMTS).toHaveLength(6);
    expect(readFileSync(READBACK, 'utf8').split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(6);
    await runFile(MIGRATION);
    const post = await readback();
    log('read-back (after)', post);
    expect(post[0]).toEqual([{ gates: '22', gates_pre: '0', gates_post: '22', fields: '23', fields_pre: '0', fields_post: '23', gates_neither: null, fields_neither: null, new_gate: '1', new_fields: '3' }]);
    expect(post[1]).toEqual([
      { std: 'DWA-M-820-1', block: '18', warn: '9', other: '0' },
      { std: 'DWA-M-820-2', block: '40', warn: '21', other: '0' },
      { std: 'DWA-M-820-3', block: '20', warn: '30', other: '0' },
    ]);
    expect(post[2]).toEqual([
      { ws: '820-2-04', symbol: 'eigene_regelwerke_vorhanden', section: 'B', data_type: 'boolean', is_required: true, active: true, visible_when: null, consumers: '820-2-25', order_index: 0 },
      { ws: '820-2-17', symbol: 'nebenangebote_zugelassen', section: 'B', data_type: 'boolean', is_required: true, active: true, visible_when: 'bauleistungen_vergeben == true', consumers: null, order_index: 2 },
      { ws: '820-2-26', symbol: 'innovation_verlangt', section: 'B', data_type: 'boolean', is_required: true, active: true, visible_when: null, consumers: null, order_index: 0 },
    ]);
    expect(post[3]).toEqual([{ b_fields: '17', distinct_orders: '17', gap: 1 }]);
    expect(post[4]).toEqual([]);
    expect(post[5]).toEqual([{ gate_archive: '22', field_archive: '23', written: '45', added: '4' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('f. AFTER: verdicts through the REAL approval gate (drivers typed through the real save path); warn gates probed', async () => {
    await runFile(MIGRATION);
    await typeDrivers();
    const after: Record<string, boolean> = {};
    for (const c of CASES) after[`${c.ws} ${c.code} (${c.why})`] = await refuses(c.p(), c.ws, c.code);
    log('AFTER: approval refused by the gate', after);
    expect(Object.values(after)).toEqual(CASES.map((c) => c.after));

    // unanswered drivers: the waiting gate names the question, and the question is on the missing-required list; a hidden driver is not
    const named = async (p: Proj, ws: string, code: string) => (await checkApprovalGate(p.inst.get(ws)!)).pendingBlockConditions.find((c) => c.code === code)?.missingInputs.map((i) => i.symbol) ?? null;
    const missingReq = async (p: Proj, ws: string) => (await checkApprovalGate(p.inst.get(ws)!)).missingRequiredFields.map((f) => f.symbol);
    const open = { REQ38: await named(P.open, '820-2-17', 'REQ-38'), REQ55: await named(P.open, '820-2-26', 'REQ-55'), REQ56: await named(P.open, '820-2-26', 'REQ-56'), REQ54: await named(P.open, '820-2-25', 'REQ-54'),
      req17: (await missingReq(P.open, '820-2-17')).includes('nebenangebote_zugelassen'), req26: (await missingReq(P.open, '820-2-26')).includes('innovation_verlangt'), req04: (await missingReq(P.open, '820-2-04')).includes('eigene_regelwerke_vorhanden'),
      nobau17: (await missingReq(P.nobau, '820-2-17')).includes('nebenangebote_zugelassen'), no26: (await missingReq(P.no, '820-2-26')).includes('innovation_verlangt') };
    log('unanswered drivers: pending inputs named / on the missing-required list', open);
    expect(open).toEqual({ REQ38: ['nebenangebote_zugelassen'], REQ55: ['innovation_verlangt'], REQ56: ['innovation_verlangt'], REQ54: ['eigene_regelwerke_vorhanden'], req17: true, req26: true, req04: true, nobau17: false, no26: false });

    // REQ-14 passes once the award criteria and their weighting are entered (recompute fills award_weight_sum_pct)
    await save(P.vgv, 'M820-14', { award_criteria_list: jv({ rows: [
      { id: 'k1', kriterium: 'Schlüsselpersonal', gewichtung: 50 },
      { id: 'k2', kriterium: 'Analyse der Aufgabenstellung durch den Bieter', gewichtung: 30 },
      { id: 'k3', kriterium: 'Preis', gewichtung: 20 },
    ] }) });
    await recompute(P.vgv.inst.get('M820-14')!);
    // REQ-05 passes once the measure plan has a row
    await save(P.vgv, 'M820-07', { risk_mitigation_plan: jv({ rows: [{ id: 'm1', risiko: 'Baugrund', massnahme: 'Baugrundgutachten' }] }) });
    const pass = { REQ14: await refuses(P.vgv, 'M820-14', 'REQ-14'), REQ05: await refuses(P.vgv, 'M820-07', 'REQ-05') };
    log('AFTER with criteria + plan entered (refused?)', pass);
    expect(pass).toEqual({ REQ14: false, REQ05: false });

    // warn gates: REQ-23-2 fires for a direct award without a memo and is silent once confirmed / for VgV-F (REQ-23's turn)
    const w23 = { direct_no_memo: await warnFires(P.direct, 'M820-24', 'REQ-23-2'), vgvf: await warnFires(P.vgv, 'M820-24', 'REQ-23-2') };
    await save(P.direct, 'M820-24', { vergabevermerk_complete: b(true) });
    const w23ok = await warnFires(P.direct, 'M820-24', 'REQ-23-2');
    log('REQ-23-2 (warn) fires?', { ...w23, direct_memo: w23ok });
    expect({ ...w23, direct_memo: w23ok }).toEqual({ direct_no_memo: true, vgvf: false, direct_memo: false });

    // REQ-51 (warn) reads the warranty calendar: empty → fires; a row without its end date is incomplete → still fires; complete → silent
    await recompute(P.no.inst.get('820-2-24')!);
    const w51 = [await warnFires(P.no, '820-2-24', 'REQ-51')];
    await save(P.no, '820-2-24', { gewaehrleistungen: jv({ rows: [{ ...WARRANTY_ROW, ende: undefined }] }) });
    await recompute(P.no.inst.get('820-2-24')!);
    w51.push(await warnFires(P.no, '820-2-24', 'REQ-51'));
    await save(P.no, '820-2-24', { gewaehrleistungen: jv({ rows: [WARRANTY_ROW] }) });
    await recompute(P.no.inst.get('820-2-24')!);
    w51.push(await warnFires(P.no, '820-2-24', 'REQ-51'));
    const [cnt] = await harness.sql<{ v: string }[]>`SELECT pp.value_number::text AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id WHERE pp.project_id = ${P.no.id} AND f.symbol = 'warranty_count'`;
    log('REQ-51 fires? [empty, row without end, complete row] · warranty_count', { w51, warranty_count: cnt?.v });
    expect(w51).toEqual([true, true, false]);
    expect(Number(cnt.v)).toBe(1);

    // rollback with saved driver answers: the three driver fields are KEPT (read-back R4 lists the values); everything else restored
    await runFile(ROLLBACK);
    const kept = await harness.sql<{ symbol: string }[]>`SELECT symbol FROM fields WHERE symbol IN ('eigene_regelwerke_vorhanden', 'nebenangebote_zugelassen', 'innovation_verlangt') ORDER BY 1`;
    const l = await ledgers();
    log('rollback with saved driver values', { kept: kept.map((k) => k.symbol), l });
    expect(kept.map((k) => k.symbol)).toEqual(['eigene_regelwerke_vorhanden', 'innovation_verlangt', 'nebenangebote_zugelassen']);
    expect(l).toEqual({ ...EMPTY, m820_d48_added: 3 });
    expect((await gateRow('820-2-25', 'REQ-54'))!.condition).toBe('approval_release_process == true');
    // export / delete the values first (52_ rollback step) → the rollback completes byte-equal
    expect(await clearDriverValues()).toBe(6);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('g. 50_ PS-1 order, 44_ E 2-3 label, REQ-14 guard consumers', async () => {
    await runFile(MIGRATION);
    const order = await harness.sql<{ symbol: string }[]>`SELECT f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
      JOIN worksheet_sections ws ON ws.id = f.section_id WHERE w.code = '820-2-01' AND ws.code = 'B' AND f.active ORDER BY f.order_index`;
    const syms = order.map((o) => o.symbol);
    log('820-2-01 section B order', syms);
    expect(syms).toEqual(['project_name', 'project_number', 'project_location', 'client_name', 'client_type', 'complexity_level', 'included_hoai_phases',
      'project_category', 'project_size', 'project_size_begruendung', 'project_name_short', 'primary_sector', 'scope_technical', 'scope_excluded',
      'verantwortung_lph0', 'verantwortung_lph8', 'verantwortung_lph9']);
    const [scope] = await harness.sql<{ labels: string[]; tokens: string[] }[]>`SELECT array_agg(e->>'label_de' ORDER BY (e->>'order_index')::int) AS labels, array_agg(e->>'value' ORDER BY (e->>'order_index')::int) AS tokens
      FROM fields f, jsonb_array_elements(f.enum_values) e WHERE f.symbol = 'projektsteuerung_scope'`;
    expect(scope.tokens).toEqual(['Projektorganisation', 'Terminmanagement', 'Kostenmanagement', 'Vertragsmanagement', 'Qualitätsmanagement', 'Risikomanagement', 'keine']);
    expect(scope.labels[5]).toBe('Risikomanagement (Werkzeug-Option, in § 4.1 nicht genannt)');
    const cons = await harness.sql<{ symbol: string; has: boolean }[]>`SELECT f.symbol, 'M820-14' = ANY(f.consumer_worksheets) AS has FROM fields f
      WHERE f.symbol IN ('client_organization_type', 'vergaberecht_freiwillig_angewendet', 'procurement_procedure') ORDER BY 1`;
    expect(cons.every((c) => c.has)).toBe(true);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  // 50_ PS-2 is CODE (src/lib/projects/cross-standard-carry.ts, second commit); data-independent of this block.
  it('h. 50_ PS-2: the copies on M820-01 / M8203-01 take only the 820-2-01 answer, show "taken from DWA-M 820-2" and count under A4', async () => {
    const p = await makeProject('size on 820-2-01 = mittel, then a different answer on M820-01');
    expect(await pagePrefill(p, 'M8203-01')).toEqual({ candidates: [], prefill: null, from: null, note: null }); // nothing saved → nothing offered
    await save(p, '820-2-01', { project_size: e('mittel') });
    const NOTE = 'Übernommen aus DWA-M 820-2 (820-2-01) — hier überschreibbar. [EN] taken from DWA-M 820-2 (820-2-01) — can be overwritten here.';
    const on1 = await pagePrefill(p, 'M820-01');
    const on3 = await pagePrefill(p, 'M8203-01');
    log('PS-2 prefill with 820-2-01 = mittel', { on1, on3 });
    expect(on1).toEqual({ candidates: ['820-2-01:mittel'], prefill: { type: 'enum', value: 'mittel' }, from: '820-2-01', note: NOTE });
    expect(on3).toEqual({ candidates: ['820-2-01:mittel'], prefill: { type: 'enum', value: 'mittel' }, from: '820-2-01', note: NOTE });
    // A4: the 820-2 value counts as answered for both copies
    const a4 = { m1: (await loadInheritedSymbolsForTemplate(p.id, (await tmplOf('M820-01')).id)).has('project_size'), m3: (await loadInheritedSymbolsForTemplate(p.id, (await tmplOf('M8203-01')).id)).has('project_size') };
    log('PS-2 A4 counts project_size on the copies', a4);
    expect(a4).toEqual({ m1: true, m3: true });
    // a different 820-1 answer no longer makes M8203-01 ambiguous: only own + 820-2 occurrences are candidates
    await save(p, 'M820-01', { project_size: e('klein') });
    const amb = await pagePrefill(p, 'M8203-01');
    log('PS-2 prefill on M8203-01 when 820-2-01 = mittel and M820-01 = klein', amb);
    expect(amb).toEqual({ candidates: ['820-2-01:mittel'], prefill: { type: 'enum', value: 'mittel' }, from: '820-2-01', note: NOTE });
    // the 820-2 sheet itself is never filled from a copy (no reverse entry)
    const p2 = await makeProject('size only on M820-01');
    await save(p2, 'M820-01', { project_size: e('klein') });
    expect((await loadInheritedSymbolsForTemplate(p2.id, (await tmplOf('820-2-01')).id)).has('project_size')).toBe(false);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });
});

async function tmplOf(ws: string): Promise<{ id: string; std: string }> {
  const [r] = await harness.sql<{ id: string; std: string }[]>`SELECT w.id, s.code AS std FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE w.code = ${ws}`;
  return r;
}
/** Worksheet page step 2 for `project_size` on `ws` (page.tsx: same-symbol upstreams → allow-list filter → unambiguous → coerce → note). */
async function pagePrefill(p: Proj, ws: string): Promise<{ candidates: string[]; prefill: unknown; from: string | null; note: string | null }> {
  const { id, std } = await tmplOf(ws);
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
