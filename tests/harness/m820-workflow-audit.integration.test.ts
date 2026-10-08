/**
 * DWA-M 820 · workflow improvements from the Forscheln audit (2026-10-08) — embedded-Postgres proof of
 *   scripts/migrations/20261008100000_m820_workflow_audit.sql
 *   scripts/rollback-20261008100000-m820-workflow-audit.sql
 *   scripts/verification/apply/readback-20261008100000-m820-workflow-audit.sql
 * (apply order + behaviour list: vault 01-Projects/ekowai-wizard/m820-wizard-test/63_APPLY-ORDER-m820-workflow-audit.md).
 *   1. direct award (820-1): competition entries on M820-11, -13 … -19 hidden, REQ-12 / -15 / -16 / -17 guarded (procurement != direktvergabe)
 *   2. REQ-02 by project_type, 820-2 REQ-12 reworded (cost structure, DIN 276 only an example), REQ-33 by a yes/no driver
 *   3. phase drivers on 820-2-20 / -22 / -24 (REQ-43, -47, -48, -49, -51, -52 not applicable until the phase is reached)
 *   4. tokens wasserwirtschaft (820-1 sector) / anlassbezogen (820-2-05)   5. ask-once hints   6. 820-2-04 register weitere_regelwerke
 *
 * Disposable embedded Postgres only — no prod, no .env.local. REAL saveWorksheet / recomputeWorksheetEquations / checkApprovalGate /
 * loadInheritedFields + computeVisibility (the form's pair). SEED (= prod 2026-10-08): the three 2026-10-05 dumps + prior.json consumers and
 * every M820 block applied on prod, the small-fix block 20261007120000 included. Read-back R0 pins the pre-state of the 63 fields and 14 gates
 * the block touches to signatures taken from the LIVE rows (prod-query 2026-10-08): fields_pre 63 / gates_pre 14 proves the seed is
 * byte-identical to prod for every column the block guards. ROWS: synthetic projects, no client data.
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
const USER_ID = '00000000-0000-4000-8000-0000000008fd';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261008100000_m820_workflow_audit.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261008100000-m820-workflow-audit.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261008100000-m820-workflow-audit.sql');
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
].map((p) => resolve(ROOT, p));
const LIVE_PHASE: Record<string, Array<[number, number, number]>> = {
  'DWA-M-820-1': [[1, 3, 1], [4, 9, 2], [10, 15, 3], [16, 20, 4], [21, 23, 5], [24, 25, 6]],
  'DWA-M-820-2': [[1, 4, 1], [5, 10, 2], [11, 15, 3], [16, 19, 4], [20, 24, 5], [25, 28, 6]],
  'DWA-M-820-3': [[1, 3, 1], [4, 6, 2], [7, 10, 3], [11, 18, 4], [19, 21, 5], [22, 24, 6]],
};
const log = (label: string, v: unknown) => console.log(`[M820 WORKFLOW AUDIT] ${label}: ${JSON.stringify(v)}`);
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
const LEDGERS = ['compliance_requirements_archive_m820_wa', 'fields_archive_m820_wa', 'm820_wa_written'];
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
const EMPTY = { compliance_requirements_archive_m820_wa: 0, fields_archive_m820_wa: 0, m820_wa_written: 0 };
const FULL = { compliance_requirements_archive_m820_wa: 14, fields_archive_m820_wa: 63, m820_wa_written: 77 };
const NEW_FIELDS = ['oeffentlichkeitsbeteiligung_vorgesehen', 'phase_ausfuehrung_erreicht', 'phase_gewaehrleistung_erreicht', 'phase_inbetriebnahme_erreicht', 'weitere_regelwerke'];
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
type V = { type: 'boolean'; value: boolean } | { type: 'enum'; value: string } | { type: 'number'; value: number } | { type: 'json'; value: unknown };
const e = (value: string): V => ({ type: 'enum', value });
const b = (value: boolean): V => ({ type: 'boolean', value });
const n = (value: number): V => ({ type: 'number', value });
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
const inherits = async (ws: string, sym: string) => {
  const [t] = await harness.sql<{ id: string; standard_id: string }[]>`SELECT id, standard_id FROM worksheet_templates WHERE code = ${ws}`;
  return (await loadInheritedFields(t.id, t.standard_id, ws)).some((f) => f.symbol === sym);
};
/** Required questions a project has to answer in one part: active required fields that the form does not hide, summed over its sheets. */
async function requiredCount(p: Proj, std: string, skip: string[] = []): Promise<number> {
  const sheets = await harness.sql<{ code: string }[]>`SELECT w.code FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = ${std} ORDER BY w.order_index`;
  let total = 0;
  for (const { code } of sheets) {
    if (skip.includes(code)) continue;
    const req = await harness.sql<{ symbol: string }[]>`SELECT f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = ${code} AND f.active AND f.is_required`;
    const hidden = new Set(await formHidden(p, code));
    total += req.filter((r) => !hidden.has(r.symbol)).length;
  }
  return total;
}

let PRE: TableDump;
const P: Record<string, Proj> = {};
const C1_SKIP = ['M820-09', 'M820-12', 'M820-23']; // set N.A. (deactivated) on the Forscheln record — excluded as in the audit's count
const M820_14_ALL = ['award_criteria_list', 'award_weight_sum_pct', 'doppelbewertungsverbot_check', 'festpreis_used', 'price_weight_calc_pct', 'price_weight_percent', 'qualitaets_kriterien_count', 'schluesselpersonal_count'];
const M820_04_KONZEPT = ['alternatives_considered', 'bedarfsplanung_konzept_complete', 'date_bedarfsplanung_complete', 'quality_targets_konzept'];
type Probe = { label: string; run: () => Promise<unknown>; before: unknown; after: unknown };
let PROBES: Probe[] = [];
const COUNT_BEFORE: Record<string, number> = {};

async function competitiveAnswers(p: Proj) {
  await save(p, 'M820-04', { bedarfsplanung_konzept_complete: b(false) });
  await save(p, 'M820-11', { leistungswettbewerb_only: b(false) });
  await save(p, 'M820-12', { exclusion_123_gwb_checked: b(false) });
  await save(p, 'M820-13', { min_annual_revenue_multiplier: n(3) });
  await save(p, 'M820-14', { price_weight_percent: n(30), festpreis_used: b(false), doppelbewertungsverbot_check: b(false) });
}

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-workflow-audit@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820 workflow audit harness', ${'m820-wa-' + Date.now()}) RETURNING id`;
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
  for (const blk of PRIOR_BLOCKS) await runFile(blk); // = prod 2026-10-08 (small fixes included)
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadInheritedFields } = await import('@/lib/db/queries/worksheet'));
  ({ recomputeWorksheetEquations: recompute } = await import('@/lib/actions/recompute-worksheet'));

  // ── 820-1 projects: the same "wrong" answers on the competition sheets, four procedures ──
  P.c1 = await makeProject('820-1 C1: private client, direct award, Projekt');
  await save(P.c1, 'M820-01', { client_organization_type: e('privat_ohne_foerderung'), vergaberecht_freiwillig_angewendet: b(false), project_type: e('projekt') });
  await save(P.c1, 'M820-10', { procurement_procedure: e('direktvergabe') });
  await competitiveAnswers(P.c1);
  P.vgv = await makeProject('820-1 C3: municipality, VgV-F, Konzept');
  await save(P.vgv, 'M820-01', { client_organization_type: e('municipality'), project_type: e('konzept') });
  await save(P.vgv, 'M820-10', { procurement_procedure: e('vgv_f') });
  await competitiveAnswers(P.vgv);
  P.such = await makeProject('820-1 C2: municipality, Suchverfahren, Projekt');
  await save(P.such, 'M820-01', { client_organization_type: e('municipality'), project_type: e('projekt') });
  await save(P.such, 'M820-10', { procurement_procedure: e('suchverfahren') });
  await competitiveAnswers(P.such);
  P.open = await makeProject('820-1: procedure unanswered, performance competition confirmed');
  await save(P.open, 'M820-01', { client_organization_type: e('municipality') });
  await save(P.open, 'M820-11', { leistungswettbewerb_only: b(true) });
  for (const p of [P.c1, P.vgv, P.such, P.open]) for (const ws of ['M820-13', 'M820-14']) await recompute(p.inst.get(ws)!);

  // ── 820-2 projects ──
  P.b1 = await makeProject('820-2 C1: self-built, LPH 8/9 by the client, planning phase');
  await save(P.b1, '820-2-01', { verantwortung_lph8: e('auftraggeber'), verantwortung_lph9: e('auftraggeber') });
  await save(P.b1, '820-2-17', { bauleistungen_vergeben: b(false) });
  await save(P.b1, '820-2-08', { cost_planning_din276: b(false) });
  await save(P.b1, '820-2-14', { public_relations_strategy: b(false) });
  await save(P.b1, '820-2-20', { quality_supervision_active: b(false) });
  await save(P.b1, '820-2-22', { abnahme_per_bild4: b(false) });
  await save(P.b1, '820-2-23', { training_complete: b(false), operating_manuals_complete: b(false) });
  P.b2 = await makeProject('820-2: construction awarded, LPH 9 by the contractor, defect tracking not confirmed');
  await save(P.b2, '820-2-01', { verantwortung_lph9: e('auftragnehmer') });
  await save(P.b2, '820-2-17', { bauleistungen_vergeben: b(true) });
  await save(P.b2, '820-2-24', { defect_tracking_active: b(false) });
  await recompute(P.b2.inst.get('820-2-24')!);

  // ── counting profiles (drivers only) ──
  P.cnt1 = await makeProject('count C1 (Forscheln profile)');
  await save(P.cnt1, 'M820-01', { client_organization_type: e('privat_ohne_foerderung'), vergaberecht_freiwillig_angewendet: b(false), project_type: e('projekt') });
  await save(P.cnt1, 'M820-10', { procurement_procedure: e('direktvergabe') });
  await save(P.cnt1, '820-2-01', { verantwortung_lph8: e('auftraggeber'), verantwortung_lph9: e('auftraggeber') });
  await save(P.cnt1, '820-2-17', { bauleistungen_vergeben: b(false) });
  P.cnt2 = await makeProject('count C2 (public profile)');
  await save(P.cnt2, 'M820-01', { client_organization_type: e('municipality'), project_type: e('konzept') });
  await save(P.cnt2, 'M820-09', { threshold_status: e('unterschwellig') });
  await save(P.cnt2, 'M820-10', { procurement_procedure: e('suchverfahren') });
  await save(P.cnt2, '820-2-01', { verantwortung_lph8: e('auftragnehmer'), verantwortung_lph9: e('auftragnehmer') });
  await save(P.cnt2, '820-2-17', { bauleistungen_vergeben: b(true) });

  PROBES = [
    // item 2 · REQ-02 by project type
    { label: 'REQ-02 refuses · C1 Projekt', run: () => refuses(P.c1, 'M820-04', 'REQ-02'), before: true, after: false },
    { label: 'REQ-02 refuses · VgV-F Konzept', run: () => refuses(P.vgv, 'M820-04', 'REQ-02'), before: true, after: true },
    { label: 'form-hidden M820-04 · C1 Projekt', run: () => formHidden(P.c1, 'M820-04'), before: [], after: M820_04_KONZEPT },
    { label: 'form-hidden M820-04 · VgV-F Konzept', run: () => formHidden(P.vgv, 'M820-04'), before: [], after: [] },
    // item 1 · direct award
    { label: 'REQ-17 refuses · C1 direct award', run: () => refuses(P.c1, 'M820-11', 'REQ-17'), before: true, after: false },
    { label: 'REQ-17 refuses · VgV-F', run: () => refuses(P.vgv, 'M820-11', 'REQ-17'), before: true, after: true },
    { label: 'REQ-17 refuses · Suchverfahren', run: () => refuses(P.such, 'M820-11', 'REQ-17'), before: true, after: true },
    { label: 'REQ-17 refuses · procedure unanswered (competition confirmed)', run: () => refuses(P.open, 'M820-11', 'REQ-17'), before: false, after: true },
    { label: 'REQ-12 refuses · C1 direct award', run: () => refuses(P.c1, 'M820-13', 'REQ-12'), before: true, after: false },
    { label: 'REQ-12 refuses · VgV-F', run: () => refuses(P.vgv, 'M820-13', 'REQ-12'), before: true, after: true },
    { label: 'REQ-12 refuses · Suchverfahren', run: () => refuses(P.such, 'M820-13', 'REQ-12'), before: true, after: true },
    { label: 'REQ-16 refuses · C1 direct award', run: () => refuses(P.c1, 'M820-14', 'REQ-16'), before: true, after: false },
    { label: 'REQ-16 refuses · VgV-F', run: () => refuses(P.vgv, 'M820-14', 'REQ-16'), before: true, after: true },
    { label: 'REQ-15 (warn) fires · C1 direct award', run: () => warnFires(P.c1, 'M820-14', 'REQ-15'), before: true, after: false },
    { label: 'REQ-15 (warn) fires · VgV-F', run: () => warnFires(P.vgv, 'M820-14', 'REQ-15'), before: true, after: true },
    { label: 'REQ-10 refuses · C1 direct award (vgv_f guard, unchanged)', run: () => refuses(P.c1, 'M820-12', 'REQ-10'), before: false, after: false },
    { label: 'REQ-10 refuses · VgV-F (unchanged)', run: () => refuses(P.vgv, 'M820-12', 'REQ-10'), before: true, after: true },
    { label: 'missing required M820-14 · C1', run: () => missingReq(P.c1, 'M820-14'), before: ['award_criteria_list', 'schluesselpersonal_count'], after: [] },
    { label: 'missing required M820-14 · VgV-F', run: () => missingReq(P.vgv, 'M820-14'), before: ['award_criteria_list', 'schluesselpersonal_count'], after: ['award_criteria_list', 'schluesselpersonal_count'] },
    { label: 'form-hidden M820-14 · C1', run: () => formHidden(P.c1, 'M820-14'), before: [], after: M820_14_ALL },
    { label: 'form-hidden M820-14 · VgV-F', run: () => formHidden(P.vgv, 'M820-14'), before: [], after: [] },
    { label: 'form-hidden M820-16 · C1', run: async () => (await formHidden(P.c1, 'M820-16')).length, before: 0, after: 9 },
    { label: 'form-hidden M820-20 · C1 (negotiations stay)', run: () => formHidden(P.c1, 'M820-20'), before: [], after: [] },
    { label: 'procurement_procedure inherited on M820-13', run: () => inherits('M820-13', 'procurement_procedure'), before: false, after: true },
    { label: 'procurement_procedure inherited on M820-15', run: () => inherits('M820-15', 'procurement_procedure'), before: false, after: true },
    // items 2 + 3 · 820-2 (drivers unanswered right after the apply: block gates wait, questions stay visible)
    { label: 'REQ-48 refuses · C1 820-2', run: () => refuses(P.b1, '820-2-23', 'REQ-48'), before: true, after: true },
    { label: 'REQ-49 refuses · C1 820-2', run: () => refuses(P.b1, '820-2-23', 'REQ-49'), before: true, after: true },
    { label: 'REQ-47 (warn) fires · C1 820-2', run: () => warnFires(P.b1, '820-2-22', 'REQ-47'), before: true, after: true },
    { label: 'REQ-43 refuses · C1 820-2 (LPH 8 by the client)', run: () => refuses(P.b1, '820-2-20', 'REQ-43'), before: true, after: true },
    { label: 'REQ-33 (warn) fires · C1 820-2', run: () => warnFires(P.b1, '820-2-14', 'REQ-33'), before: true, after: true },
    { label: 'REQ-12 refuses · C1 820-2 (cost structure not confirmed)', run: () => refuses(P.b1, '820-2-08', 'REQ-12'), before: true, after: true },
    { label: 'REQ-52 refuses · awarded', run: () => refuses(P.b2, '820-2-24', 'REQ-52'), before: true, after: true },
    { label: 'form-hidden 820-2-23 · C1 (phase unanswered)', run: () => formHidden(P.b1, '820-2-23'), before: [], after: [] },
  ];
  COUNT_BEFORE.c1_820_1 = await requiredCount(P.cnt1, 'DWA-M-820-1', C1_SKIP);
  COUNT_BEFORE.c1_820_2 = await requiredCount(P.cnt1, 'DWA-M-820-2');
  COUNT_BEFORE.c2_820_1 = await requiredCount(P.cnt2, 'DWA-M-820-1');
  COUNT_BEFORE.c2_820_2 = await requiredCount(P.cnt2, 'DWA-M-820-2');
}, 900_000);

afterAll(async () => {
  await harness?.stop();
});

async function probeAll(): Promise<unknown[]> { const out: unknown[] = []; for (const p of PROBES) out.push(await p.run()); return out; }
const sigs = () => harness.sql`SELECT 'g ' || w.code || ' ' || cr.code AS k, md5(concat_ws('|', coalesce(cr.condition,''), cr.severity, md5(coalesce(cr.description,'')), coalesce(cr.clause_reference,''))) AS sig
    FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE cr.id IN (SELECT id FROM compliance_requirements_archive_m820_wa)
  UNION ALL SELECT 'f ' || w.code || ' ' || f.symbol, md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type))
    FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE f.id IN (SELECT id FROM fields_archive_m820_wa) ORDER BY 1`;

describe('DWA-M 820 workflow audit — staged block on embedded Postgres (seed = prod 2026-10-08)', () => {
  it('a. pre-state = the LIVE rows (read-back R0 fields_pre 63 / gates_pre 14); verdicts BEFORE through the real gate path', async () => {
    expect(await ledgers()).toEqual({ compliance_requirements_archive_m820_wa: null, fields_archive_m820_wa: null, m820_wa_written: null });
    const r = await readback(4);
    log('BEFORE read-back R0..R3', r);
    expect(r[0]).toMatchObject([{ fields: '63', fields_pre: '63', fields_post: '0', gates: '14', gates_pre: '14', gates_post: '0', fields_neither: null, gates_neither: null }]);
    expect(r[1]).toEqual([]);
    expect(r[2]).toHaveLength(14);
    expect(r[3]).toEqual([]);
    const before = await probeAll();
    log('BEFORE probes', Object.fromEntries(PROBES.map((p, i) => [p.label, before[i]])));
    expect(before).toEqual(PROBES.map((p) => p.before));
    log('required answers BEFORE (C1 820-1 without M820-09/-12/-23, C1 820-2, C2 820-1, C2 820-2)', COUNT_BEFORE);
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: 14 gates + 63 fields changed, 5 fields inserted, nothing else; severities unchanged; every touched hint DE + [EN]', async () => {
    const sevBefore = await harness.sql`SELECT cr.id, cr.severity FROM compliance_requirements cr ORDER BY 1`;
    await runFile(MIGRATION);
    const diff = dumpDiff(PRE, await dump());
    log('apply diff (table / sign counts)', tally(diff));
    expect(tally(diff)).toEqual({ 'compliance_requirements +': 14, 'compliance_requirements -': 14, 'fields +': 68, 'fields -': 63 });
    expect(await ledgers()).toEqual(FULL);
    const sevAfter = await harness.sql`SELECT cr.id, cr.severity FROM compliance_requirements cr ORDER BY 1`;
    expect([...sevAfter]).toEqual([...sevBefore]);
    const hints = await harness.sql<{ id: string; ok: boolean }[]>`SELECT cr.id, (cr.description LIKE '%' || chr(10) || '[EN] %') AS ok
      FROM compliance_requirements cr WHERE cr.id IN (SELECT id FROM compliance_requirements_archive_m820_wa)
      UNION ALL SELECT f.id, (f.description LIKE '%' || chr(10) || '[EN] %') FROM fields f WHERE f.id IN (SELECT id FROM fields_archive_m820_wa) OR f.symbol IN ${harness.sql(NEW_FIELDS)}`;
    expect(hints.filter((h) => !h.ok)).toEqual([]);
    expect(hints).toHaveLength(82);
    const nw = await harness.sql<{ ws: string; symbol: string; section: string | null; req: boolean; data_type: string }[]>`
      SELECT w.code AS ws, f.symbol, s.code AS section, f.is_required AS req, f.data_type FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
      LEFT JOIN worksheet_sections s ON s.id = f.section_id WHERE f.symbol IN ${harness.sql(NEW_FIELDS)} ORDER BY 1`;
    log('new fields', nw);
    expect(nw.map((x) => `${x.ws} ${x.symbol} ${x.section} ${x.req} ${x.data_type}`)).toEqual([
      '820-2-04 weitere_regelwerke C false json',
      '820-2-14 oeffentlichkeitsbeteiligung_vorgesehen B true boolean',
      '820-2-20 phase_ausfuehrung_erreicht B true boolean',
      '820-2-22 phase_inbetriebnahme_erreicht B true boolean',
      '820-2-24 phase_gewaehrleistung_erreicht B true boolean',
    ]);
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
    await harness.sql`UPDATE compliance_requirements cr SET description = cr.description || ' (edited)' FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = '820-2-23' AND cr.code = 'REQ-48'`;
    await runFile(ROLLBACK);
    const l = await ledgers();
    const r = { REQ48: (await gateRow('820-2-23', 'REQ-48'))!.condition, REQ49: (await gateRow('820-2-23', 'REQ-49'))!.condition };
    log('rollback with one edited gate', { l, r });
    expect(l).toEqual({ compliance_requirements_archive_m820_wa: 1, fields_archive_m820_wa: 0, m820_wa_written: 1 });
    expect(r).toEqual({ REQ48: 'IF phase_inbetriebnahme_erreicht == true THEN (operating_manuals_complete == true)', REQ49: 'training_complete == true' });
    await harness.sql`UPDATE compliance_requirements cr SET description = left(cr.description, length(cr.description) - length(' (edited)')) FROM worksheet_templates w WHERE w.id = cr.worksheet_template_id AND w.code = '820-2-23' AND cr.code = 'REQ-48'`;
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
    expect(post[0]).toEqual([{ fields: '63', fields_pre: '0', fields_post: '63', gates: '14', gates_pre: '0', gates_post: '14', fields_neither: null, gates_neither: null }]);
    expect(post[1]).toEqual([
      { ws: '820-2-04', symbol: 'weitere_regelwerke', data_type: 'json', req: false, consumers: '', visible_when: '' },
      { ws: '820-2-14', symbol: 'oeffentlichkeitsbeteiligung_vorgesehen', data_type: 'boolean', req: true, consumers: '', visible_when: '' },
      { ws: '820-2-20', symbol: 'phase_ausfuehrung_erreicht', data_type: 'boolean', req: true, consumers: '820-2-21', visible_when: '' },
      { ws: '820-2-22', symbol: 'phase_inbetriebnahme_erreicht', data_type: 'boolean', req: true, consumers: '820-2-23', visible_when: '' },
      { ws: '820-2-24', symbol: 'phase_gewaehrleistung_erreicht', data_type: 'boolean', req: true, consumers: '', visible_when: "(verantwortung_lph9 != 'entfaellt') AND (bauleistungen_vergeben == true)" },
    ]);
    expect((post[2] as Array<{ ws: string; code: string; sev: string }>).map((x) => `${x.ws} ${x.code} ${x.sev}`)).toEqual([
      '820-2-08 REQ-12 block', '820-2-14 REQ-33 warn', '820-2-20 REQ-43 block', '820-2-22 REQ-47 warn', '820-2-23 REQ-48 block', '820-2-23 REQ-49 block', '820-2-24 REQ-51 warn',
      '820-2-24 REQ-52 block', 'M820-01 REQ-01 warn', 'M820-04 REQ-02 block', 'M820-11 REQ-17 block', 'M820-13 REQ-12 block', 'M820-14 REQ-15 warn', 'M820-14 REQ-16 block',
    ]);
    expect(post[3]).toEqual([]);
    expect(post[4]).toEqual([{ gate_archive: '14', field_archive: '63', written: '77' }]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('f. AFTER: verdicts through the REAL approval gate + the form visibility pair (820-1 direct award, VgV-F unchanged, REQ-02, unanswered procedure named)', async () => {
    await runFile(MIGRATION);
    const after = await probeAll();
    log('AFTER probes', Object.fromEntries(PROBES.map((p, i) => [p.label, after[i]])));
    expect(after).toEqual(PROBES.map((p) => p.after));
    expect(await pendingNamed(P.open, 'M820-11', 'REQ-17')).toEqual(['procurement_procedure']);
    // direct award: the justification and the task description stay required; the hidden competition fields are not
    const c1Missing = { m10: await missingReq(P.c1, 'M820-10'), m04: await missingReq(P.c1, 'M820-04'), m13: await missingReq(P.c1, 'M820-13'), m19: await missingReq(P.c1, 'M820-19') };
    log('C1 missing required after (M820-10 / -04 / -13 / -19)', c1Missing);
    expect(c1Missing.m10).toContain('procedure_rationale');
    expect(c1Missing.m04).toEqual(['aufgabenbeschreibung_eindeutig']);
    expect(c1Missing.m13).toEqual(['liability_insurance_personenschaden', 'liability_insurance_sonstige']);
    expect(c1Missing.m19).toEqual([]);
    // VgV-F: M820-11 … M820-19 hide nothing (only the pre-existing vgv_f-only publication rules)
    for (const ws of ['M820-11', 'M820-13', 'M820-15', 'M820-16', 'M820-17', 'M820-18', 'M820-19']) expect(await formHidden(P.vgv, ws), `VgV-F ${ws}`).toEqual([]);
    // sector token: saves, REQ-01 (warn) silent
    await save(P.c1, 'M820-01', { sector: e('wasserwirtschaft') });
    expect(await warnFires(P.c1, 'M820-01', 'REQ-01')).toBe(false);
    await runFile(ROLLBACK);
  });

  it('g. AFTER: 820-2 phase drivers, REQ-33 driver, REQ-12 cost structure, register + token', async () => {
    await runFile(MIGRATION);
    // phase not reached → hidden + not applicable; reached → as today
    await save(P.b1, '820-2-22', { phase_inbetriebnahme_erreicht: b(false) });
    await save(P.b1, '820-2-20', { phase_ausfuehrung_erreicht: b(false) });
    await save(P.b1, '820-2-14', { oeffentlichkeitsbeteiligung_vorgesehen: b(false) });
    const notReached = {
      REQ48: await refuses(P.b1, '820-2-23', 'REQ-48'), REQ49: await refuses(P.b1, '820-2-23', 'REQ-49'), REQ47: await warnFires(P.b1, '820-2-22', 'REQ-47'),
      REQ43: await refuses(P.b1, '820-2-20', 'REQ-43'), REQ33: await warnFires(P.b1, '820-2-14', 'REQ-33'),
      hidden23: await formHidden(P.b1, '820-2-23'), hidden22: await formHidden(P.b1, '820-2-22'), hidden21: await formHidden(P.b1, '820-2-21'),
      missing23: await missingReq(P.b1, '820-2-23'),
    };
    log('820-2 C1 · phase not reached / no public participation', notReached);
    expect(notReached).toEqual({ REQ48: false, REQ49: false, REQ47: false, REQ43: false, REQ33: false,
      hidden23: ['operating_manuals_complete', 'training_complete'], hidden22: ['abnahme_per_bild4'], hidden21: ['oeffentlichkeitsarbeit_durchgefuehrt'], missing23: [] });
    await save(P.b1, '820-2-22', { phase_inbetriebnahme_erreicht: b(true) });
    await save(P.b1, '820-2-20', { phase_ausfuehrung_erreicht: b(true) });
    await save(P.b1, '820-2-14', { oeffentlichkeitsbeteiligung_vorgesehen: b(true) });
    const reached = {
      REQ48: await refuses(P.b1, '820-2-23', 'REQ-48'), REQ49: await refuses(P.b1, '820-2-23', 'REQ-49'), REQ47: await warnFires(P.b1, '820-2-22', 'REQ-47'),
      REQ43: await refuses(P.b1, '820-2-20', 'REQ-43'), REQ33: await warnFires(P.b1, '820-2-14', 'REQ-33'), hidden23: await formHidden(P.b1, '820-2-23'),
    };
    log('820-2 C1 · phase reached (as today)', reached);
    expect(reached).toEqual({ REQ48: true, REQ49: true, REQ47: true, REQ43: true, REQ33: true, hidden23: [] });
    // awarded project: warranty phase driver
    expect(await pendingNamed(P.b2, '820-2-24', 'REQ-52')).toEqual(['phase_gewaehrleistung_erreicht']);
    await save(P.b2, '820-2-24', { phase_gewaehrleistung_erreicht: b(false) });
    const w0 = { REQ52: await refuses(P.b2, '820-2-24', 'REQ-52'), hidden: await formHidden(P.b2, '820-2-24') };
    await save(P.b2, '820-2-24', { phase_gewaehrleistung_erreicht: b(true) });
    const w1 = { REQ52: await refuses(P.b2, '820-2-24', 'REQ-52'), hidden: await formHidden(P.b2, '820-2-24') };
    log('820-2-24 awarded · warranty phase no / yes', { w0, w1 });
    expect(w0).toEqual({ REQ52: false, hidden: ['defect_tracking_active', 'gewaehrleistungen', 'warranty_count', 'warranty_end_date', 'warranty_open_defects', 'warranty_start_date'] });
    expect(w1).toEqual({ REQ52: true, hidden: [] });
    // REQ-12: a documented cost structure without DIN 276 passes (same condition, field now asks for the structure, DIN 276 only an example)
    const [lab] = await harness.sql<{ label_de: string; label_en: string; d: string; cl: string }[]>`SELECT f.label_de, f.label_en, f.description AS d, (SELECT clause_reference FROM compliance_requirements WHERE code = 'REQ-12' AND worksheet_template_id = f.worksheet_template_id) AS cl FROM fields f WHERE f.symbol = 'cost_planning_din276'`;
    expect(lab.label_de).toBe('Kostenziele mit einheitlicher Kostenstruktur festgelegt (z. B. DIN 276)');
    expect(lab.label_en).toBe('Cost targets set with a uniform cost structure (e.g. DIN 276)');
    expect(lab.d).toContain('DIN 276 ist ein gedrucktes Beispiel, keine Pflicht');
    expect(lab.cl).toBe('§4.5.1, §4.5.2');
    await save(P.b1, '820-2-08', { cost_planning_din276: b(true) });
    expect(await refuses(P.b1, '820-2-08', 'REQ-12')).toBe(false);
    // token anlassbezogen + register weitere_regelwerke through the real save path
    await save(P.b1, '820-2-05', { mgmt_cycle_frequency: e('anlassbezogen') });
    const r = await save(P.b1, '820-2-04', { weitere_regelwerke: jv({ rows: [{ id: 'r1', regelwerk: 'FLL Gewässerabdichtungsrichtlinien', ausgabe: '2023', anwendung: 'Abdichtung und Aufbau' }] }) });
    log('save register weitere_regelwerke (result)', r);
    const rb3 = (await readback(4))[3] as Array<{ symbol: string }>;
    log('read-back R3 with saved values', rb3);
    expect(rb3.map((x) => x.symbol).sort()).toEqual(['mgmt_cycle_frequency', 'oeffentlichkeitsbeteiligung_vorgesehen', 'phase_ausfuehrung_erreicht', 'phase_gewaehrleistung_erreicht', 'phase_inbetriebnahme_erreicht', 'sector', 'weitere_regelwerke']);
    // rollback with saved values: definitions byte-equal, values on the new fields deleted, the anlassbezogen value (and the wasserwirtschaft value saved in f) stay saved
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
    expect(await ledgers()).toEqual(EMPTY);
    expect(((await readback(4))[3] as Array<{ symbol: string }>).map((x) => x.symbol).sort()).toEqual(['mgmt_cycle_frequency', 'sector']);
  });

  it('h. required answers before → after for the Forscheln profile (C1) and the public profile (C2); hints name the master once', async () => {
    await runFile(MIGRATION);
    await save(P.cnt1, '820-2-14', { oeffentlichkeitsbeteiligung_vorgesehen: b(false) });
    await save(P.cnt1, '820-2-20', { phase_ausfuehrung_erreicht: b(false) });
    await save(P.cnt1, '820-2-22', { phase_inbetriebnahme_erreicht: b(false) });
    await save(P.cnt2, '820-2-14', { oeffentlichkeitsbeteiligung_vorgesehen: b(true) });
    await save(P.cnt2, '820-2-20', { phase_ausfuehrung_erreicht: b(false) });
    await save(P.cnt2, '820-2-22', { phase_inbetriebnahme_erreicht: b(false) });
    await save(P.cnt2, '820-2-24', { phase_gewaehrleistung_erreicht: b(false) });
    const after = {
      c1_820_1: await requiredCount(P.cnt1, 'DWA-M-820-1', C1_SKIP), c1_820_2: await requiredCount(P.cnt1, 'DWA-M-820-2'),
      c2_820_1: await requiredCount(P.cnt2, 'DWA-M-820-1'), c2_820_2: await requiredCount(P.cnt2, 'DWA-M-820-2'),
    };
    log('required answers BEFORE → AFTER', { before: COUNT_BEFORE, after });
    // C1: 820-1 −27 (direct award −24, Projekt −3) · 820-2 −3 (5 phase-bound questions + PR strategy hidden, 3 drivers asked)
    // C2: 820-1 unchanged (Suchverfahren + Konzept) · 820-2 −4 (8 phase-bound questions hidden, 4 drivers asked; PR strategy stays)
    expect(COUNT_BEFORE).toEqual({ c1_820_1: 87, c1_820_2: 96, c2_820_1: 96, c2_820_2: 107 });
    expect(after).toEqual({ c1_820_1: 60, c1_820_2: 93, c2_820_1: 96, c2_820_2: 103 });
    // ask-once: exactly one master hint, three repeating hints
    const h = await harness.sql<{ ws: string; symbol: string; master: boolean; repeat: boolean }[]>`SELECT w.code AS ws, f.symbol,
        f.description LIKE '%Maßgeblich (Master) ist die Antwort hier%' AS master, f.description LIKE '%diese Antwort wiederholt die Bedarfsplanung%' AS repeat
      FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
      WHERE f.description LIKE '%Einmal beantworten:%' ORDER BY 1`;
    expect(h.map((x) => `${x.ws} ${x.symbol} ${x.master ? 'master' : x.repeat ? 'repeat' : '?'}`)).toEqual([
      '820-2-11 framework_conditions_clarified repeat', 'M820-04 aufgabenbeschreibung_eindeutig repeat', 'M820-05 bedarfsplanung_projekt_complete master', 'M8203-11 pz_62_1_status repeat',
    ]);
    // sector list: the four printed § 1 fields are all offered
    const [sec] = await harness.sql<{ t: string }[]>`SELECT string_agg(e->>'value', ',' ORDER BY (e->>'order_index')::int) AS t FROM fields f, jsonb_array_elements(f.enum_values) e WHERE f.symbol = 'sector'`;
    expect(sec.t).toBe('wasserwirtschaft,wastewater,water_supply,flood_protection,waste,water_engineering,other');
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });
});
