/**
 * DWA-M 820-1 · case C4 finding F2, 820-1 part (2026-10-15) — embedded-Postgres proof of
 *   scripts/migrations/20261015150000_m820_1_c4_phase_drivers.sql
 *   scripts/rollback-20261015150000-m820-1-c4-phase-drivers.sql
 *   scripts/verification/apply/readback-20261015150000-m820-1-c4-phase-drivers.sql
 * (apply order + behaviour list: vault 01-Projects/ekowai-wizard/m820-wizard-test/78_APPLY-ORDER-m820-1-c4-phase-drivers.md).
 *   Fix round 1: TWO phase drivers (C-9 pattern). M820-17 phase_vergabeverfahren_erreicht (procedure started) guards M820-20 (5), M820-21 (6)
 *   + REQ-21, M820-22 (4); M820-23 phase_auftrag_erteilt (award; shown only when the first is Ja) guards M820-23 award_date + contractor,
 *   M820-24 (5, on top of the 20261015130000 law clause), REQ-20, REQ-23, REQ-23-2 (nested inside the existing guards).
 *   M820-07 mitigation_plan_date guarded by the existing mitigation_plan_approved (tool logic: no approval, no approval date).
 *
 * Disposable embedded Postgres only — no prod, no .env.local. REAL saveWorksheet / checkApprovalGate / loadInheritedFields +
 * computeVisibility (the form's pair) / loadRequiredFieldCounts (progress) / loadStandardReportData (verdicts incl. warnings + the C-9
 * list). SEED: the three 2026-10-05 dumps + prior.json consumers, every M820 block applied on prod up to 20261008100000 AND the staged
 * 820-1 block 20261015130000 (this block must apply after it — test a2 proves the order guard). The block's pre-signatures were taken from
 * this seed; read-back R0 on prod (step 0) must show fields_pre 24 / gates_pre 4 / new_drivers 0 / f1_m820_24 5 (after: new_drivers 2). 20261014100000 (staged,
 * 820-2 only) is applied before AND after this block in test h. ROWS: synthetic projects, no client data (C4 = the driver answers of case
 * C4 on 820-1, same fixture as the 20261015130000 harness: 50 open required on 820-1 after that block).
 * C-9 listing: this branch recognises `phase_<name>_erreicht` (lists the procedure driver); the `_erteilt` rule (award driver) is the
 * phase-deferral.ts change of branch data/m820-2-c4-phase-guards. Test g asserts the listing for whichever rule is present.
 * DISCOVER=1 (env C4D_DISCOVER) records probe values + post signatures to C4D_OUT instead of asserting them.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startHarness, type Harness } from './embedded-pg';
import { applyM820ProdOverlay, lostProdQuotes } from './m820-prod-overlay';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { loadInheritedFields as LoadInheritedFields } from '@/lib/db/queries/worksheet';
import type { loadRequiredFieldCounts as LoadRequiredFieldCounts } from '@/lib/projects/load-required-field-counts';
import type { loadStandardReportData as LoadStandardReportData } from '@/lib/pdf/load-standard-report';
import { computeVisibility } from '@/lib/compliance/visibility';
import { isPhaseDriver } from '@/lib/compliance/phase-deferral';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008c6';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261015150000_m820_1_c4_phase_drivers.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261015150000-m820-1-c4-phase-drivers.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261015150000-m820-1-c4-phase-drivers.sql');
const F1 = resolve(ROOT, 'scripts/migrations/20261015130000_m820_1_c4_procurement_guards.sql');
const F1_ROLLBACK = resolve(ROOT, 'scripts/rollback-20261015130000-m820-1-c4-procurement-guards.sql');
const O23 = resolve(ROOT, 'scripts/migrations/20261014100000_m820_followup_o2_o3.sql');
const O23_ROLLBACK = resolve(ROOT, 'scripts/rollback-20261014100000-m820-followup-o2-o3.sql');
const O23_READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261014100000-m820-followup-o2-o3.sql');
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
const DISCOVER = !!process.env.C4D_DISCOVER;
const DISCOVERED: Record<string, unknown> = {};
const log = (label: string, v: unknown) => {
  const line = `[M820-1 C4 PHASE DRIVERS] ${label}: ${JSON.stringify(v)}`;
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
let loadRequiredFieldCounts: typeof LoadRequiredFieldCounts;

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

let loadStandardReportData: typeof LoadStandardReportData;

async function runFile(path: string): Promise<void> {
  const conn = await harness.sql.reserve();
  try {
    await conn.unsafe(readFileSync(path, 'utf8'));
  } catch (err) {
    await conn.unsafe('ROLLBACK').catch(() => undefined); // an aborted BEGIN … block must not leave the pooled connection in a failed transaction
    throw err;
  } finally { conn.release(); }
}
const LEDGERS = ['compliance_requirements_archive_m820_c4d', 'fields_archive_m820_c4d', 'm820_c4d_written'];
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
const NONE = { compliance_requirements_archive_m820_c4d: null, fields_archive_m820_c4d: null, m820_c4d_written: null };
const EMPTY = { compliance_requirements_archive_m820_c4d: 0, fields_archive_m820_c4d: 0, m820_c4d_written: 0 };
const FULL = { compliance_requirements_archive_m820_c4d: 4, fields_archive_m820_c4d: 24, m820_c4d_written: 30 };
const stmts = (p: string) => splitOnUnquotedSemicolons(readFileSync(p, 'utf8')).filter((s) => s.replace(/--.*$/gm, '').trim());
const RB_STMTS = stmts(READBACK);
/** R5 reads the block's ledgers, which exist only after an apply — before the apply run R0 … R4 (step 0 on prod). */
async function readback(n = RB_STMTS.length): Promise<unknown[][]> { const out: unknown[][] = []; for (const st of RB_STMTS.slice(0, n)) out.push([...(await harness.sql.unsafe(st))]); return out; }
async function o23R0(): Promise<unknown> { return [...(await harness.sql.unsafe(stmts(O23_READBACK)[0]))]; }

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
type V = { type: 'boolean'; value: boolean } | { type: 'enum'; value: string } | { type: 'number'; value: number };
const e = (value: string): V => ({ type: 'enum', value });
const b = (value: boolean): V => ({ type: 'boolean', value });
const nu = (value: number): V => ({ type: 'number', value });
async function save(p: Proj, ws: string, vals: Record<string, V>) {
  const ids = await harness.sql<{ id: string; symbol: string }[]>`
    SELECT f.id, f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
    WHERE s.code = 'DWA-M-820-1' AND w.code = ${ws} AND f.active AND f.symbol IN ${harness.sql(Object.keys(vals))}`;
  expect(ids.length, `${ws} fields ${Object.keys(vals)}`).toBe(Object.keys(vals).length);
  const values = Object.fromEntries(ids.map((f) => [f.id, vals[f.symbol]]));
  const r = await saveWorksheet({ instanceId: p.inst.get(ws)!, values: values as never });
  expect(r.ok, `${ws} save ${JSON.stringify(r)}`).toBe(true);
  return r;
}
async function unset(p: Proj, sym: string) {
  await harness.sql`DELETE FROM project_parameters pp USING fields f, worksheet_templates w, standards s
    WHERE pp.field_id = f.id AND f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND pp.project_id = ${p.id} AND f.symbol = ${sym}`;
}

/** The form's pair (visibility.ts): own fields are hideable; the lookup resolves own + inherited (consumer_worksheets) saved values. */
async function formHidden(p: Proj, ws: string): Promise<string[]> {
  const sql = harness.sql;
  const [t] = await sql<{ id: string; standard_id: string }[]>`SELECT w.id, w.standard_id FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-1' AND w.code = ${ws}`;
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
  const bySym = new Map<string, string | boolean | number | null>();
  for (const r of vals) {
    const v = r.v === 'true' ? true : r.v === 'false' ? false : r.v;
    bySym.set(symById.get(r.field_id)!, typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v);
  }
  const vis = computeVisibility(
    own.map((f) => ({ id: f.id, symbol: f.symbol, sectionId: f.section_id, visibleWhen: f.visible_when })),
    secs.map((s) => ({ id: s.id, parentSectionId: s.parent_section_id, visibleWhen: s.visible_when })),
    (s) => bySym.get(s) ?? undefined,
  );
  return [...vis.hiddenSymbols].sort();
}
const DRV = 'phase_auftrag_erteilt'; // award (M820-23), shown only when D1 = Ja
const D1 = 'phase_vergabeverfahren_erreicht'; // procedure started (M820-17) — fix round 1
const DRIVER_AT: Record<string, string> = { 'M820-17': D1, 'M820-23': DRV };
/** The guarded symbols per sheet (F2, 820-1 part). */
const GUARDED: Record<string, string[]> = {
  'M820-07': ['mitigation_plan_date'],
  'M820-17': [],
  'M820-20': ['negotiation_rounds', 'protokoll_signiert', 'verhandlung_datum', 'verhandlung_ergebnis', 'verhandlung_thema'],
  'M820-21': ['gewaehrleistung_geregelt', 'kuendigung_geregelt', 'leistung_klar_definiert', 'verguetung_geregelt', 'vertragsentwurf_in_unterlagen', 'vertragspruefung_date'],
  'M820-22': ['berufshaftpflicht_vorhanden', 'gewaehrleistungszeit_jahre', 'haftpflicht_versicherungssumme', 'verschuldensgrenzen_definiert'],
  'M820-23': ['award_date', 'contractor_auftragnehmer'],
  'M820-24': ['alle_unterlagen_archiviert', 'archive_location', 'final_signoff_date', 'vergabeakte_unterzeichnet', 'vergabevermerk_complete'],
};
/** Which guarded symbols (+ the driver) the form hides, per sheet. */
async function guardHidden(p: Proj): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const ws of Object.keys(GUARDED)) {
    const h = await formHidden(p, ws);
    const watch = [...GUARDED[ws], ...(DRIVER_AT[ws] ? [DRIVER_AT[ws]] : [])];
    out[ws] = h.filter((s) => watch.includes(s));
  }
  return out;
}
/** Missing required (real approval gate) on the touched sheets. */
async function missing(p: Proj): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const ws of Object.keys(GUARDED)) {
    const g = await checkApprovalGate(p.inst.get(ws)!);
    const m = g.missingRequiredFields.map((f) => f.symbol).sort();
    if (m.length) out[ws] = m;
  }
  return out;
}
/** Progress surface (get_standard_progress / sidebar): open required per 820-1 sheet + total, by the shared rule. */
async function openRequired(p: Proj): Promise<Record<string, number>> {
  const sql = harness.sql;
  const [s] = await sql<{ id: string }[]>`SELECT id FROM standards WHERE code = 'DWA-M-820-1'`;
  const tm = await sql<{ id: string; code: string }[]>`SELECT id, code FROM worksheet_templates WHERE standard_id = ${s.id} ORDER BY order_index`;
  const counts = await loadRequiredFieldCounts(p.id, s.id);
  const out: Record<string, number> = {};
  let total = 0;
  for (const tp of tm) {
    const c = counts.get(tp.id);
    const open = c ? c.totalRequired - c.filledRequired : 0;
    total += open;
    if (open) out[tp.code] = open;
  }
  out.ALL_820_1 = total;
  return out;
}
/** The guarded gates (REQ-20, -21, -23, -23-2) + the two NOT guarded pre-award gates on M820-23 (REQ-22, REQ-26) as control. */
const GATES: Array<[string, string]> = [['M820-20', 'REQ-20'], ['M820-21', 'REQ-21'], ['M820-23', 'REQ-22'], ['M820-23', 'REQ-26'], ['M820-24', 'REQ-23'], ['M820-24', 'REQ-23-2']];
/** Verdicts from the standard report: kind, ':skipped' for a guard-skipped pass; for block gates also the REAL approval gate (fail / wait / none). */
async function gateView(p: Proj): Promise<Record<string, string>> {
  const rep = await loadStandardReportData(p.id, 'DWA-M-820-1');
  const out: Record<string, string> = {};
  for (const [ws, code] of GATES) {
    const c = rep.worksheets.find((w) => w.code === ws)!.compliance.find((x) => x.code === code)!;
    const r = c.result as { kind: string; guardSkipped?: boolean };
    let v = `${c.severity}:${r.kind}${r.guardSkipped ? ':skipped' : ''}`;
    if (c.severity === 'block') {
      const g = await checkApprovalGate(p.inst.get(ws)!);
      v += g.failingBlockConditions.some((x) => x.code === code) ? '/fail' : g.pendingBlockConditions.some((x) => x.code === code) ? '/wait' : '/none';
    }
    out[code] = v;
  }
  return out;
}
/** C-9: the „phases not reached / not completed“ list of the standard report (driver + gates not checked because of it). */
async function c9(p: Proj): Promise<Array<{ ws: string; symbol: string; gates: string[]; elsewhere: string[] }>> {
  const rep = await loadStandardReportData(p.id, 'DWA-M-820-1');
  return (rep.phaseDeferrals ?? []).map((d) => ({ ws: d.worksheetCode, symbol: d.symbol, gates: d.gates.map((g) => g.code).sort(), elsewhere: d.skippedElsewhere.map((g) => g.code).sort() }));
}
const inherits = async (ws: string, sym: string) => {
  const [tp] = await harness.sql<{ id: string; standard_id: string }[]>`SELECT w.id, w.standard_id FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-1' AND w.code = ${ws}`;
  return (await loadInheritedFields(tp.id, tp.standard_id, ws)).some((f) => f.symbol === sym);
};
/** Is the `_erteilt` driver rule of data/m820-2-c4-phase-guards present in this checkout? (C-9 listing only.) */
const C9_LISTS_DRIVER = isPhaseDriver({ symbol: DRV, dataType: 'boolean' });
// the procedure driver ends in _erreicht: listed by this branch's rule already
expect(isPhaseDriver({ symbol: D1, dataType: 'boolean' })).toBe(true);

/** Phase state: 'nein' = procedure not started (award question hidden, not saved) · 'started' = started, not awarded · 'ja' = awarded.
 *  mitigation_plan_approved follows (Nein / Nein / Ja) — as C4 answered it on day 0. */
type Phase = 'nein' | 'started' | 'ja';
const SET = (st: Phase) => async (p: Proj) => {
  await save(p, 'M820-17', { [D1]: b(st !== 'nein') });
  if (st !== 'nein') await save(p, 'M820-23', { [DRV]: b(st === 'ja') });
  else await unset(p, DRV); // never answer a hidden question; a stale award answer would not be shown anyway
  await save(p, 'M820-07', { mitigation_plan_approved: b(st === 'ja') });
};
async function unsetDrivers(p: Proj) { await unset(p, D1); await unset(p, DRV); await unset(p, 'mitigation_plan_approved'); }

let PRE: TableDump;
const P: Record<string, Proj> = {};
type Probe = { label: string; run: () => Promise<unknown>; before: unknown; after: unknown };
let PROBES: Probe[] = [];
const EXPECTED: Record<string, [unknown, unknown]> = JSON.parse(readFileSync(resolve(__dirname, 'm820-1-c4-phase-drivers.expected.json'), 'utf8')) as never;

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-1-c4-phase-drivers@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820-1 C4 phase drivers harness', ${'m820-c4d-' + Date.now()}) RETURNING id`;
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
  expect(await applyM820ProdOverlay(sql)).toEqual({ fields: 729, matched: 729 }); // + prod verification_quote (2026-10-17): seed = prod
  await runFile(F1); // + the staged 820-1 F1 block this one builds on
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadInheritedFields } = await import('@/lib/db/queries/worksheet'));
  ({ loadRequiredFieldCounts } = await import('@/lib/projects/load-required-field-counts'));
  ({ loadStandardReportData } = await import('@/lib/pdf/load-standard-report'));

  // C4: the driver answers of case C4 on 820-1 (fixture of the 20261015130000 harness: 50 open required on 820-1 after that block)
  P.c4 = await makeProject('C4-like: private client without funding, law not applied, direct award, day 0');
  await save(P.c4, 'M820-01', { client_organization_type: e('privat_ohne_foerderung'), vergaberecht_freiwillig_angewendet: b(false), estimated_engineering_fee: nu(3500) });
  await save(P.c4, 'M820-09', { eu_threshold_value: nu(214000), threshold_status: e('unterschwellig'), oberschwellig_check: b(false), auftragswert_manipulation_check: b(true) });
  await save(P.c4, 'M820-10', { procurement_procedure: e('direktvergabe') });
  await save(P.c4, 'M820-15', { leistungsbeschreibung_complete: b(false) });
  // public client, VgV-F, failing answers on the guarded gates (must keep failing with Ja)
  P.pub = await makeProject('municipality, VgV-F, no negotiation round, no contract draft in the documents, no procurement memo');
  await save(P.pub, 'M820-01', { client_organization_type: e('municipality'), estimated_engineering_fee: nu(300000) });
  await save(P.pub, 'M820-09', { eu_threshold_value: nu(214000), threshold_status: e('oberschwellig'), oberschwellig_check: b(true), auftragswert_manipulation_check: b(true) });
  await save(P.pub, 'M820-10', { procurement_procedure: e('vgv_f') });
  await save(P.pub, 'M820-20', { negotiation_rounds: nu(0) });
  await save(P.pub, 'M820-21', { vertragsentwurf_in_unterlagen: b(false) });
  await save(P.pub, 'M820-24', { vergabevermerk_complete: b(false) });
  // public client, direct award, no procurement memo (REQ-23-2 warning)
  P.pubdir = await makeProject('municipality, direct award, no procurement memo');
  await save(P.pubdir, 'M820-01', { client_organization_type: e('municipality'), estimated_engineering_fee: nu(3500) });
  await save(P.pubdir, 'M820-10', { procurement_procedure: e('direktvergabe') });
  await save(P.pubdir, 'M820-24', { vergabevermerk_complete: b(false) });
  P.empty = await makeProject('nothing answered on 820-1');
  P.rb = await makeProject('rollback / read-back check: driver answers saved while the block is applied');

  PROBES = [];
  for (const k of ['c4', 'pub', 'pubdir', 'empty']) {
    PROBES.push({ label: `form hides (guarded + driver) · ${k}`, run: () => guardHidden(P[k]), before: undefined, after: undefined });
    PROBES.push({ label: `missing required (gate) · ${k}`, run: () => missing(P[k]), before: undefined, after: undefined });
    PROBES.push({ label: `open required 820-1 (progress) · ${k}`, run: () => openRequired(P[k]), before: undefined, after: undefined });
    PROBES.push({ label: `gates · ${k}`, run: () => gateView(P[k]), before: undefined, after: undefined });
  }
  PROBES.push({ label: 'drivers inherited (D1 on M820-20 … -24, award on M820-20 / -24, neither on M820-25)', run: async () => ({ d1: [await inherits('M820-20', D1), await inherits('M820-21', D1), await inherits('M820-22', D1), await inherits('M820-23', D1), await inherits('M820-24', D1), await inherits('M820-25', D1)], award: [await inherits('M820-20', DRV), await inherits('M820-24', DRV), await inherits('M820-25', DRV)] }), before: undefined, after: undefined });
  for (const p of PROBES) {
    const x = EXPECTED[p.label];
    if (!x) { if (DISCOVER) continue; throw new Error(`no expectation for ${p.label}`); }
    [p.before, p.after] = x;
  }
}, 900_000);

afterAll(async () => {
  if (DISCOVER && process.env.C4D_OUT) writeFileSync(process.env.C4D_OUT, JSON.stringify(DISCOVERED, null, 1));
  await harness?.stop();
});

async function probeAll(): Promise<unknown[]> { const out: unknown[] = []; for (const p of PROBES) out.push(await p.run()); return out; }
const check = (key: string, got: unknown, want: unknown) => { if (DISCOVER) { DISCOVERED[key] = got; return; } expect(got, key).toEqual(want); };
const sigs = () => harness.sql`SELECT 'g ' || w.code || ' ' || cr.code AS k, md5(concat_ws('|', coalesce(cr.condition,''), cr.severity, md5(coalesce(cr.description,'')), coalesce(cr.clause_reference,''))) AS sig
    FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE cr.id IN (SELECT id FROM compliance_requirements_archive_m820_c4d)
  UNION ALL SELECT 'f ' || w.code || ' ' || f.symbol, md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, md5(coalesce(f.verification_quote,'')), coalesce(f.source_anchor,'')))
    FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE f.id IN (SELECT id FROM fields_archive_m820_c4d) ORDER BY 1`;
const touchedTexts = () => harness.sql<{ k: string; description: string; vq: string | null; sa: string | null }[]>`
    SELECT 'g ' || w.code || ' ' || cr.code AS k, cr.description, NULL::text AS vq, NULL::text AS sa FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
     WHERE cr.id IN (SELECT id FROM compliance_requirements_archive_m820_c4d)
    UNION ALL SELECT 'f ' || w.code || ' ' || f.symbol, f.description, f.verification_quote, f.source_anchor FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
     WHERE f.id IN (SELECT id FROM fields_archive_m820_c4d) OR f.id IN (SELECT id FROM m820_c4d_written WHERE tbl = 'fields_new') ORDER BY 1`;
const R0_PRE = { fields: '24', fields_pre: '24', fields_post: '0', gates: '4', gates_pre: '4', gates_post: '0', fields_neither: null, gates_neither: null, new_drivers: '0', f1_m820_24: '5' };
const R0_POST = { fields: '24', fields_pre: '0', fields_post: '24', gates: '4', gates_pre: '0', gates_post: '4', fields_neither: null, gates_neither: null, new_drivers: '2', f1_m820_24: '5' };

describe('DWA-M 820-1 case C4 F2 phase driver — staged block on embedded Postgres (seed = prod after 20261008100000 + staged 20261015130000)', () => {
  it('a. pre-state (read-back R0 fields_pre 24 / gates_pre 4 / new_drivers 0 / f1_m820_24 5, R3 = REQ-20, -21, -23, -23-2); probes BEFORE through the real paths', async () => {
    expect(await ledgers()).toEqual(NONE);
    const r = await readback(5);
    log('BEFORE read-back R0..R4', r);
    expect(r[0]).toEqual([R0_PRE]);
    expect(r[1]).toHaveLength(28); // 24 touched fields + 4 gates (driver absent)
    expect((r[2] as unknown[]).length).toBe(23);
    expect((r[3] as Array<{ code: string }>).map((x) => x.code)).toEqual(['REQ-20', 'REQ-21', 'REQ-23', 'REQ-23-2']);
    expect(r[4]).toEqual([]);
    const before = await probeAll();
    log('BEFORE probes', Object.fromEntries(PROBES.map((p, i) => [p.label, before[i]])));
    PROBES.forEach((p, i) => check(`before ${p.label}`, before[i], p.before));
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('a2. order guard: without 20261015130000 the block aborts and writes nothing; after it, it applies', async () => {
    await runFile(F1_ROLLBACK);
    const noF1 = await dump();
    expect(tally(dumpDiff(PRE, noF1))).toEqual({ 'fields +': 18, 'fields -': 18, 'worksheet_sections +': 7, 'worksheet_sections -': 7 });
    const r0noF1 = (await readback(1))[0] as Array<{ fields_pre: string; fields_neither: string; f1_m820_24: string }>;
    expect([r0noF1[0].fields_pre, r0noF1[0].f1_m820_24, r0noF1[0].fields_neither.split(',').sort()]).toEqual(['19', '0', ['M820-24 alle_unterlagen_archiviert', 'M820-24 archive_location', 'M820-24 final_signoff_date', 'M820-24 vergabeakte_unterzeichnet', 'M820-24 vergabevermerk_complete']]);
    let err = '';
    try { await runFile(MIGRATION); } catch (x) { err = String((x as Error).message); }
    log('apply without 20261015130000', err);
    expect(err).toMatch(/pre-state mismatch \(fields 19 of 24, gates 4 of 4/);
    expect(dumpDiff(noF1, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(NONE);
    await runFile(F1);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('b. apply: 24 fields + 4 gates changed, 2 drivers inserted, nothing else; severities unchanged; every touched text DE + [EN] with its quote', async () => {
    const sevBefore = await harness.sql`SELECT cr.id, cr.severity, cr.clause_reference FROM compliance_requirements cr ORDER BY 1`;
    await runFile(MIGRATION);
    const diff = dumpDiff(PRE, await dump());
    log('apply diff (table / sign counts)', tally(diff));
    expect(tally(diff)).toEqual({ 'compliance_requirements +': 4, 'compliance_requirements -': 4, 'fields +': 26, 'fields -': 24 });
    expect(await ledgers()).toEqual(FULL);
    const sevAfter = await harness.sql`SELECT cr.id, cr.severity, cr.clause_reference FROM compliance_requirements cr ORDER BY 1`;
    expect([...sevAfter]).toEqual([...sevBefore]);
    const texts = await touchedTexts();
    // 2026-10-17: every printed quote prod already held in verification_quote survives (kept first, the guard quote appended after " | ")
    expect(lostProdQuotes('DWA-M-820-1', texts)).toEqual([]);
    expect(texts).toHaveLength(30);
    // exactly one '[EN] ' block, after a newline, in every touched text
    expect(texts.filter((x) => x.description.split('\n[EN] ').length !== 2).map((x) => x.k)).toEqual([]);
    // every phase-guarded field + both drivers carry a verbatim print quote in description + verification_quote + source_anchor (PDF page)
    // (M820-07: the date guard is TOOL LOGIC, labelled as such — no print quote; mitigation_plan_approved: hint only)
    const quoted = texts.filter((x) => x.vq !== null && !x.k.startsWith('f M820-07 '));
    expect(quoted.map((x) => x.k)).toHaveLength(24);
    expect(quoted.filter((x) => !/„.{20,}“/.test(x.vq!) || !/PDF S\. \d+/.test(x.sa ?? '') || !/„.{20,}“/.test(x.description)).map((x) => x.k)).toEqual([]);
    const m07 = texts.find((x) => x.k === 'f M820-07 mitigation_plan_date')!;
    expect([m07.vq!.startsWith('Werkzeug-Logik / tool logic'), m07.sa!.startsWith('Werkzeug-Logik / tool logic'), m07.description.includes('Werkzeug-Logik'), m07.description.includes('Anhang A (S.')]).toEqual([true, true, true, false]);
    // review F-2 / F-4: the tool inferences presented as print are gone
    expect(texts.filter((x) => /am geschlossenen Ingenieurvertrag beantwortet|stehen erst mit dem Ingenieurvertrag fest/.test(x.description)).map((x) => x.k)).toEqual([]);
    // every phase-guarded field and gate names its driver; M820-20 … -22 + REQ-21 by the procedure driver, M820-23 / -24 + REQ-20 / -23 / -23-2 by both
    const phaseTexts = texts.filter((x) => (x.k.startsWith('g ') || /M820-2[0-4] /.test(x.k)) && !x.k.endsWith(` ${DRV}`) && !x.k.endsWith(` ${D1}`));
    expect(phaseTexts.filter((x) => !x.description.includes(D1)).map((x) => x.k)).toEqual([]);
    // review F-8: § 8.3 has one EN wording in REQ-23 / REQ-23-2 / M820-24
    expect(texts.filter((x) => x.description.includes('close the procurement procedure (§ 8 VgV)')).map((x) => x.k)).toEqual([]);
    // review F-6: the award driver names its 820-2 twin
    expect(texts.find((x) => x.k === `f M820-23 ${DRV}`)!.description).toMatch(/Gleiches Ereignis wie die Frage phase_auftrag_erteilt auf 820-2-09[\s\S]*Same event as the question phase_auftrag_erteilt on 820-2-09/);
    // the C-9 phase definition (820-3 § 2.1) is quoted on both drivers
    expect(texts.filter((x) => x.description.includes('der einen eindeutigen Beginn und ein definiertes Ende aufweist')).map((x) => x.k)).toEqual([`f M820-17 ${D1}`, `f M820-23 ${DRV}`]);
    // the drivers follow the C-9 pattern of 20261008100000: boolean, required, section B, order 0, imported_unverified; award only after start
    const drv = await harness.sql`SELECT w.code AS ws, f.symbol, f.data_type, f.is_required AS req, ws.code AS sec, f.order_index AS oi, f.verification_status AS vs, coalesce(f.visible_when, '') AS vis, array_to_string(f.consumer_worksheets, ',') AS cons
      FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN worksheet_sections ws ON ws.id = f.section_id
     WHERE f.symbol IN (${D1}, ${DRV}) ORDER BY 1`;
    expect([...drv]).toEqual([
      { ws: 'M820-17', symbol: D1, data_type: 'boolean', req: true, sec: 'B', oi: 0, vs: 'imported_unverified', vis: '', cons: 'M820-20,M820-21,M820-22,M820-23,M820-24' },
      { ws: 'M820-23', symbol: DRV, data_type: 'boolean', req: true, sec: 'B', oi: 0, vs: 'imported_unverified', vis: `${D1} == true`, cons: 'M820-20,M820-24' },
    ]);
    const post = Object.fromEntries((await sigs()).map((r) => [r.k, r.sig]));
    log('post-state signatures (read-back R0 sig1)', post);
    if (DISCOVER) DISCOVERED.sig1 = post;
  });

  it('c. apply again: 0 changes (full dump compare), ledgers unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    expect(dumpDiff(before, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(FULL);
  });

  it('d. rollback: byte-equal to the pre-state (drivers and their saved answers removed), archives and ledger emptied; second rollback no-op', async () => {
    await SET('started')(P.rb); // saved driver answers must not block the rollback (own project)
    await runFile(ROLLBACK);
    const after = await dump();
    expect(dumpDiff(PRE, after)).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await ledgers()).toEqual(EMPTY);
    const [left] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM project_parameters pp JOIN fields f ON f.id = pp.field_id WHERE f.symbol IN (${D1}, ${DRV})`;
    expect(left.n).toBe(0);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('d2. a gate and a driver edited after the apply are left alone by the rollback (archive + ledger rows kept); the rest is restored', async () => {
    await runFile(MIGRATION);
    await harness.sql`UPDATE compliance_requirements cr SET description = cr.description || ' (edited)' FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = 'M820-20' AND cr.code = 'REQ-20'`;
    await harness.sql`UPDATE fields f SET label_de = f.label_de || ' (edited)' WHERE f.symbol = ${DRV}`;
    await runFile(ROLLBACK);
    const l = await ledgers();
    const req20 = (await harness.sql<{ condition: string }[]>`SELECT cr.condition FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE w.code = 'M820-20' AND cr.code = 'REQ-20'`)[0].condition;
    const drivers = (await harness.sql<{ symbol: string }[]>`SELECT symbol FROM fields WHERE symbol IN (${D1}, ${DRV}) ORDER BY 1`).map((x) => x.symbol);
    log('rollback with one edited gate + the edited award driver', { l, req20, drivers });
    expect(l).toEqual({ compliance_requirements_archive_m820_c4d: 1, fields_archive_m820_c4d: 0, m820_c4d_written: 2 });
    expect(req20).toMatch(/THEN \(IF phase_vergabeverfahren_erreicht == true THEN \(IF phase_auftrag_erteilt == true THEN \(negotiation_rounds >= 1\)\)\)$/);
    expect(drivers).toEqual([DRV]); // the unedited procedure driver is gone, the edited award driver stays
    await harness.sql`UPDATE compliance_requirements cr SET description = left(cr.description, length(cr.description) - length(' (edited)')) FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = 'M820-20' AND cr.code = 'REQ-20'`;
    await harness.sql`UPDATE fields f SET label_de = left(f.label_de, length(f.label_de) - length(' (edited)')) WHERE f.symbol = ${DRV}`;
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('e. the read-back file runs before and after an apply and shows the expected values', async () => {
    expect(RB_STMTS).toHaveLength(6);
    expect(readFileSync(READBACK, 'utf8').split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(6);
    await runFile(MIGRATION);
    await SET('started')(P.rb);
    const post = await readback();
    log('read-back (after)', post);
    if (!DISCOVER) expect(post[0]).toEqual([R0_POST]);
    expect(post[1]).toHaveLength(30);
    check('read-back R1 after', post[1], EXPECTED['read-back R1 after']?.[1]);
    expect(post[3]).toEqual([]);
    expect((post[4] as Array<{ symbol: string; value: string }>).map((x) => `${x.symbol} ${x.value}`)).toEqual([`${D1} true`, `${DRV} false`]);
    expect(post[5]).toEqual([{ gate_archive: '4', field_archive: '24', written: '30', written_new: '2' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('f. AFTER, drivers unanswered: guarded questions stay visible (fail-safe), REQ-20 / REQ-21 / REQ-23 wait and name the procedure driver', async () => {
    await runFile(MIGRATION);
    const after = await probeAll();
    log('AFTER probes (drivers unanswered)', Object.fromEntries(PROBES.map((p, i) => [p.label, after[i]])));
    PROBES.forEach((p, i) => check(`after ${p.label}`, after[i], p.after));
    if (!DISCOVER) {
      // non-vacuity: the block changes what the real paths report (not only the definition rows)
      const changed = PROBES.filter((p) => JSON.stringify(p.before) !== JSON.stringify(p.after)).map((p) => p.label);
      log('probes that changed', changed);
      expect(changed).toEqual(expect.arrayContaining(['missing required (gate) · c4', 'open required 820-1 (progress) · c4', 'gates · pub', 'gates · pubdir',
        'drivers inherited (D1 on M820-20 … -24, award on M820-20 / -24, neither on M820-25)']));
      expect(changed).not.toContain('form hides (guarded + driver) · c4'); // unanswered drivers: nothing hidden (fail-safe)
    }
    const named: Record<string, string[] | null> = {};
    for (const [ws, code] of [['M820-20', 'REQ-20'], ['M820-21', 'REQ-21'], ['M820-24', 'REQ-23']]) {
      const g = await checkApprovalGate(P.pub.inst.get(ws)!);
      named[code] = g.pendingBlockConditions.find((c) => c.code === code)?.missingInputs.map((x) => x.symbol) ?? null;
    }
    log('pending block gates name', named);
    expect(Object.entries(named).filter(([, n]) => !n || !n.includes(D1)).map(([c]) => c)).toEqual([]);
    // procedure started, award unanswered: REQ-21 applies (fails), REQ-20 / REQ-23 now wait for the award driver
    await save(P.pub, 'M820-17', { [D1]: b(true) });
    const g20 = await checkApprovalGate(P.pub.inst.get('M820-20')!);
    const g21 = await checkApprovalGate(P.pub.inst.get('M820-21')!);
    expect(g20.pendingBlockConditions.find((c) => c.code === 'REQ-20')?.missingInputs.map((x) => x.symbol)).toContain(DRV);
    expect(g21.failingBlockConditions.map((c) => c.code)).toContain('REQ-21');
    await unset(P.pub, D1);
    await runFile(ROLLBACK);
  });

  it('g. AFTER, C4 benchmark + public both ways: Nein ⇒ hidden, gates not applicable, C-9; started ⇒ REQ-21 fails as before; awarded ⇒ all checks refuse as before', async () => {
    await runFile(MIGRATION);
    const view = async (p: Proj) => ({ hidden: await guardHidden(p), missing: await missing(p), open: await openRequired(p), gates: await gateView(p), c9: await c9(p) });
    const res: Record<string, Awaited<ReturnType<typeof view>>> = {};
    for (const [k, p, st] of [['c4Nein', 'c4', 'nein'], ['c4Started', 'c4', 'started'], ['c4Ja', 'c4', 'ja'], ['c4Back', 'c4', 'nein'],
      ['pubNein', 'pub', 'nein'], ['pubStarted', 'pub', 'started'], ['pubJa', 'pub', 'ja'],
      ['pubdirNein', 'pubdir', 'nein'], ['pubdirStarted', 'pubdir', 'started'], ['pubdirJa', 'pubdir', 'ja']] as Array<[string, string, Phase]>) {
      await SET(st)(P[p]);
      res[k] = await view(P[p]);
    }
    log('C4 benchmark + public both ways (after)', res);
    const noC9 = (x: Record<string, unknown>) => { const { c9: _c9, ...rest } = x; return rest; };
    for (const [k, v] of Object.entries(res)) check(`g ${k}`, noC9(v), EXPECTED[`g ${k}`]?.[1]);
    const c9of = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v.c9]));
    log(`C-9 lists (rule for _erteilt present: ${C9_LISTS_DRIVER})`, c9of);
    if (DISCOVER) DISCOVERED[C9_LISTS_DRIVER ? 'g C-9 with the _erteilt rule' : 'g C-9 with this branch rule'] = c9of;
    if (!DISCOVER) {
      // C4 day-0 count on 820-1: 50 after 20261015130000 → 52 with both new drivers unanswered → 31 when the procedure driver (and
      // mitigation_plan_approved, as C4 answered it) say Nein
      expect((PROBES.find((p) => p.label === 'open required 820-1 (progress) · c4')!.before as Record<string, number>).ALL_820_1).toBe(50);
      expect((PROBES.find((p) => p.label === 'open required 820-1 (progress) · c4')!.after as Record<string, number>).ALL_820_1).toBe(52);
      expect(res.c4Nein.open.ALL_820_1).toBe(31);
      expect(res.c4Back.hidden).toEqual(res.c4Nein.hidden);
      // review F-1: a bound VgV-F client between notice and award: REQ-21 refuses as before the block
      expect(res.pubStarted.gates['REQ-21']).toBe('block:fail/fail');
      expect(c9of).toEqual(EXPECTED[C9_LISTS_DRIVER ? 'g C-9 with the _erteilt rule' : 'g C-9 with this branch rule'][1]);
    }
    await unsetDrivers(P.c4); await unsetDrivers(P.pub); await unsetDrivers(P.pubdir);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });

  it('h. rollback order with 20261015130000 + independence of the staged 20261014100000 (820-2 only)', async () => {
    // h1 · 20261015130000 rolled back FIRST while this block is live: its byte-equal rollback leaves the five M820-24 rows alone
    await runFile(MIGRATION);
    const live = await dump();
    await runFile(F1_ROLLBACK);
    const m24 = await harness.sql<{ symbol: string; vis: string }[]>`SELECT f.symbol, f.visible_when AS vis FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
      WHERE w.code = 'M820-24' AND f.symbol IN ('vergabevermerk_complete', 'alle_unterlagen_archiviert', 'vergabeakte_unterzeichnet', 'archive_location', 'final_signoff_date') ORDER BY 1`;
    log('M820-24 after rolling back 20261015130000 first', m24);
    expect(m24.every((r) => r.vis.endsWith(`AND (${DRV} == true)`) && r.vis.includes('vergaberecht_freiwillig_angewendet'))).toBe(true);
    expect(tally(dumpDiff(live, await dump()))).toEqual({ 'fields +': 13, 'fields -': 13, 'worksheet_sections +': 7, 'worksheet_sections -': 7 });
    await runFile(ROLLBACK); // then this block: M820-24 back to the 20261015130000 state
    await runFile(F1_ROLLBACK); // and 20261015130000 again: now byte-equal to before it
    await runFile(F1);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
    // h2 · O-2/O-3 first, then this block
    await runFile(O23);
    const afterO23 = await dump();
    await runFile(MIGRATION);
    const both1 = await dump();
    expect(tally(dumpDiff(afterO23, both1))).toEqual({ 'compliance_requirements +': 4, 'compliance_requirements -': 4, 'fields +': 26, 'fields -': 24 });
    const rb1 = await readback(1);
    if (!DISCOVER) expect(rb1[0]).toEqual([R0_POST]);
    expect(await o23R0()).toMatchObject([{ fields_post: '2', gates_post: '1', fields_neither: null, gates_neither: null }]);
    await SET('nein')(P.c4);
    const c4Both = { hidden: await guardHidden(P.c4), open: await openRequired(P.c4), gates: await gateView(P.c4) };
    await unsetDrivers(P.c4);
    await runFile(ROLLBACK);
    expect(dumpDiff(afterO23, await dump())).toEqual([]);
    await runFile(O23_ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    // h3 · this block first, then O-2/O-3
    await runFile(MIGRATION);
    await runFile(O23);
    expect(dumpDiff(both1, await dump()).filter((l) => !l.includes(DRV) && !l.includes(D1))).toEqual([]);
    expect(await o23R0()).toMatchObject([{ fields_post: '2', gates_post: '1', fields_neither: null, gates_neither: null }]);
    expect((await readback(1))[0]).toEqual(rb1[0]);
    log('C4 with both blocks', c4Both);
    if (!DISCOVER) {
      const n = EXPECTED['g c4Nein'][1] as { hidden: unknown; open: unknown; gates: unknown };
      expect(c4Both).toEqual({ hidden: n.hidden, open: n.open, gates: n.gates });
    }
    await runFile(O23_ROLLBACK);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
  });
});
