/**
 * DWA-M 820 · UX pass (2026-10-08) — embedded-Postgres proof of the save-path behaviour of
 *   25d4bd1 (U-1 / R-12 own-sheet stale flag), 5442259 (R-13 cross-sheet stale flag, R-14 hidden-at-source dropped),
 *   cf21666 (R-15 hidden-at-source symbols are hidden for the approval gate), 3a167ff (R-16 verdict surfaces).
 * Until now these had only unit tests (pure planStaleFlags / gate composition); here they are driven through the REAL
 * `saveWorksheet`, the REAL `checkApprovalGate` and the REAL `loadRequiredFieldCounts` / `loadRequiredFieldState`
 * against a database.
 *
 * SEED: the same chain as m820-workflow-audit.integration.test.ts — the three 2026-10-05 dumps + prior.json consumers,
 * every M820 block applied on prod (20261005193000 … 20261007120000) — PLUS the workflow-audit block 20261008100000,
 * because the drivers the probes need (phase_inbetriebnahme_erreicht on 820-2-22; the direktvergabe rule on M820-11 /
 * M820-14) exist only after it. Disposable embedded Postgres only — no prod, no .env. ROWS: synthetic projects.
 *
 * Probes (raw read-back in every assertion message, and logged as `[M820 UX STALE]` lines):
 *   1. U-1 / R-12 own-sheet stale flag on 820-2-22 (abnahme_per_bild4 under phase_inbetriebnahme_erreicht)
 *   2. R-13 cross-sheet flag: M820-10 procurement_procedure flags M820-11 leistungswettbewerb_only; only an own save clears
 *   3. counts (loadRequiredFieldCounts / loadRequiredFieldState) after the direktvergabe save
 *   4. R-15 / R-16 gate: 4a REQ-46 on 820-2-22 with a leftover choice hidden at source (bauleistungen_vergeben lives on 820-2-17;
 *      skipped with the reason when the seed cannot hide the choice) · 4b REQ-46 on its real value · 4c R-15 on a real
 *      cross-sheet case (M8203-23 REQ-20 reading totals hidden at source on M8203-12 / -13)
 *   5. regression guard: a save on a rule-free sheet changes no is_stale flag and no row count
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startHarness, type Harness } from './embedded-pg';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type {
  loadRequiredFieldCounts as LoadRequiredFieldCounts,
  loadRequiredFieldState as LoadRequiredFieldState,
} from '@/lib/projects/load-required-field-counts';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008ab';
const BLOCKS = [
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
  'scripts/migrations/20261008100000_m820_workflow_audit.sql', // drivers used by the probes
].map((p) => resolve(ROOT, p));
const LIVE_PHASE: Record<string, Array<[number, number, number]>> = {
  'DWA-M-820-1': [[1, 3, 1], [4, 9, 2], [10, 15, 3], [16, 20, 4], [21, 23, 5], [24, 25, 6]],
  'DWA-M-820-2': [[1, 4, 1], [5, 10, 2], [11, 15, 3], [16, 19, 4], [20, 24, 5], [25, 28, 6]],
  'DWA-M-820-3': [[1, 3, 1], [4, 6, 2], [7, 10, 3], [11, 18, 4], [19, 21, 5], [22, 24, 6]],
};
const log = (label: string, v: unknown) => console.log(`[M820 UX STALE] ${label}: ${JSON.stringify(v)}`);
const J = (v: unknown) => JSON.stringify(v);

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
let loadRequiredFieldCounts: typeof LoadRequiredFieldCounts;
let loadRequiredFieldState: typeof LoadRequiredFieldState;

/** Verbatim copy of the workflow-audit harness seeder (dump + prior.json consumers). */
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
  log(`seeded ${d.standard.code}`, { worksheets: d.worksheets.length, fields: d.fields.length, gates: d.gates.length });
}
async function runFile(path: string): Promise<void> {
  const conn = await harness.sql.reserve();
  try { await conn.unsafe(readFileSync(path, 'utf8')); } finally { conn.release(); }
}

// ── project fixture ─────────────────────────────────────────────────────────────────────────────────────────────
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
const n = (value: number): V => ({ type: 'number', value });
async function save(p: Proj, ws: string, vals: Record<string, V>) {
  const ids = await harness.sql<{ id: string; symbol: string }[]>`
    SELECT f.id, f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
    WHERE w.code = ${ws} AND f.active AND f.symbol IN ${harness.sql(Object.keys(vals))}`;
  expect(ids.length, `${ws} fields ${Object.keys(vals)} → found ${J(ids)}`).toBe(Object.keys(vals).length);
  const values = Object.fromEntries(ids.map((f) => [f.id, vals[f.symbol]]));
  const r = await saveWorksheet({ instanceId: p.inst.get(ws)!, values: values as never });
  expect(r.ok, `${ws} save ${J(r)}`).toBe(true);
  log(`save ${ws} ${J(Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, v.value])))}`, { ok: r.ok });
  return r;
}
type ParamRow = { symbol: string; ws: string; value_boolean: boolean | null; value_enum: string | null; value_number: string | null; value_text: string | null; is_stale: boolean; source_type: string };
/** Raw project_parameters read-back of one symbol (null = no row). */
async function row(p: Proj, ws: string, symbol: string): Promise<ParamRow | null> {
  const [r] = await harness.sql<ParamRow[]>`
    SELECT f.symbol, w.code AS ws, pp.value_boolean, pp.value_enum, pp.value_number::text AS value_number, pp.value_text, pp.is_stale, pp.source_type
      FROM project_parameters pp JOIN fields f ON f.id = pp.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
     WHERE pp.project_id = ${p.id} AND w.code = ${ws} AND f.symbol = ${symbol}`;
  return r ?? null;
}
async function allRows(p: Proj): Promise<Array<{ field_id: string; is_stale: boolean }>> {
  return harness.sql<{ field_id: string; is_stale: boolean }[]>`
    SELECT field_id::text, is_stale FROM project_parameters WHERE project_id = ${p.id} ORDER BY field_id`;
}
async function fieldDef(ws: string, symbol: string) {
  const [r] = await harness.sql<{ symbol: string; is_required: boolean; visible_when: string | null; consumer_worksheets: string[] | null; section_vw: string | null }[]>`
    SELECT f.symbol, f.is_required, f.visible_when, f.consumer_worksheets, s.visible_when AS section_vw
      FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id LEFT JOIN worksheet_sections s ON s.id = f.section_id
     WHERE w.code = ${ws} AND f.symbol = ${symbol} AND f.active`;
  return r ?? null;
}
async function gateDef(ws: string, code: string) {
  const [r] = await harness.sql<{ code: string; severity: string; condition: string }[]>`
    SELECT cr.code, cr.severity, cr.condition FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
     WHERE w.code = ${ws} AND cr.code = ${code}`;
  return r ?? null;
}
async function templateId(ws: string): Promise<{ id: string; standard_id: string }> {
  const [t] = await harness.sql<{ id: string; standard_id: string }[]>`SELECT id, standard_id FROM worksheet_templates WHERE code = ${ws}`;
  return t;
}
async function gate(p: Proj, ws: string) {
  const g = await checkApprovalGate(p.inst.get(ws)!);
  return {
    ok: g.ok,
    failing: g.failingBlockConditions.map((c) => c.code).sort(),
    pending: g.pendingBlockConditions.map((c) => `${c.code}[${c.missingInputs.map((i) => i.symbol).join(',')}]`).sort(),
    missing: g.missingRequiredFields.map((f) => f.symbol).sort(),
  };
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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-ux-stale@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820 UX stale harness', ${'m820-ux-' + Date.now()}) RETURNING id`;
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
  for (const blk of BLOCKS) await runFile(blk);
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadRequiredFieldCounts, loadRequiredFieldState } = await import('@/lib/projects/load-required-field-counts'));

  // Definitions the probes rely on, as seeded (raw evidence).
  for (const [ws, sym] of [
    ['820-2-22', 'abnahme_per_bild4'], ['820-2-22', 'phase_inbetriebnahme_erreicht'], ['820-2-22', 'testbetrieb_planned'],
    ['820-2-17', 'bauleistungen_vergeben'], ['820-2-18', 'testbetrieb_vs_abnahme_choice'],
    ['M820-10', 'procurement_procedure'], ['M820-11', 'leistungswettbewerb_only'],
  ] as const) log(`def ${ws} ${sym}`, await fieldDef(ws, sym));
  for (const [ws, code] of [['820-2-22', 'REQ-46'], ['820-2-22', 'REQ-47']] as const) log(`gate ${ws} ${code}`, await gateDef(ws, code));
}, 900_000);

afterAll(async () => {
  await harness?.stop();
});

describe('DWA-M 820 UX — stale flags + hidden-at-source through the REAL save path', () => {
  // ── 1 · U-1 / R-12 ────────────────────────────────────────────────────────────────────────────────────────────
  it('probe 1 · U-1 (R-12): own-sheet stale flag on 820-2-22 abnahme_per_bild4', async () => {
    const def = await fieldDef('820-2-22', 'abnahme_per_bild4');
    expect(def?.visible_when ?? def?.section_vw, `abnahme_per_bild4 def ${J(def)}`).toMatch(/phase_inbetriebnahme_erreicht/);
    const P = await makeProject('probe 1 · 820-2-22 own-sheet stale');

    await save(P, '820-2-22', { phase_inbetriebnahme_erreicht: b(true), abnahme_per_bild4: b(false) });
    const r1 = await row(P, '820-2-22', 'abnahme_per_bild4');
    log('P1 step a (phase=true, abnahme=false)', r1);
    expect(r1?.value_boolean, `step a row ${J(r1)}`).toBe(false);
    expect(r1?.is_stale, `step a row ${J(r1)}`).toBe(false);

    await save(P, '820-2-22', { phase_inbetriebnahme_erreicht: b(false) });
    const r2 = await row(P, '820-2-22', 'abnahme_per_bild4');
    log('P1 step b (phase=false)', r2);
    expect(r2, 'step b: row must not be deleted').not.toBeNull();
    expect(r2?.value_boolean, `step b row kept, not nulled ${J(r2)}`).toBe(false);
    expect(r2?.is_stale, `step b row flagged ${J(r2)}`).toBe(true);

    await save(P, '820-2-22', { phase_inbetriebnahme_erreicht: b(true), abnahme_per_bild4: b(true) });
    const r3 = await row(P, '820-2-22', 'abnahme_per_bild4');
    log('P1 step c (phase=true, abnahme=true)', r3);
    expect(r3?.value_boolean, `step c row ${J(r3)}`).toBe(true);
    expect(r3?.is_stale, `step c row cleared ${J(r3)}`).toBe(false);
  }, 300_000);

  // ── 2 + 3 · R-13 cross-sheet flag + counts ────────────────────────────────────────────────────────────────────
  it('probe 2 · R-13: M820-10 save flags M820-11 leistungswettbewerb_only; only the own save clears it — probe 3 · counts', async () => {
    const def = await fieldDef('M820-11', 'leistungswettbewerb_only');
    expect(def?.visible_when, `leistungswettbewerb_only def ${J(def)}`).toMatch(/procurement_procedure/);
    const P = await makeProject('probe 2 · 820-1 cross-sheet stale');
    const std = (await templateId('M820-11')).standard_id;
    const t11 = (await templateId('M820-11')).id;
    const t14 = (await templateId('M820-14')).id;

    await save(P, 'M820-10', { procurement_procedure: e('vgv_f') });
    await save(P, 'M820-11', { leistungswettbewerb_only: b(true) });
    await save(P, 'M820-14', { price_weight_percent: n(20), doppelbewertungsverbot_check: b(true), festpreis_used: b(false) });
    const a = await row(P, 'M820-11', 'leistungswettbewerb_only');
    log('P2 step a (vgv_f, M820-11 saved true)', a);
    expect(a?.value_boolean, `step a ${J(a)}`).toBe(true);
    expect(a?.is_stale, `step a ${J(a)}`).toBe(false);
    const countsVgv = await loadRequiredFieldCounts(P.id, std);
    log('P3 counts under vgv_f · M820-11 / M820-14', { m820_11: countsVgv.get(t11), m820_14: countsVgv.get(t14) });

    await save(P, 'M820-10', { procurement_procedure: e('direktvergabe') });
    const b1 = await row(P, 'M820-11', 'leistungswettbewerb_only');
    log('P2 step b (M820-10 → direktvergabe; consumer pass)', b1);
    expect(b1, 'step b: row kept').not.toBeNull();
    expect(b1?.value_boolean, `step b value kept ${J(b1)}`).toBe(true);
    expect(b1?.is_stale, `step b flagged by the M820-10 save ${J(b1)}`).toBe(true);
    const m14rows = await harness.sql<{ symbol: string; is_stale: boolean }[]>`
      SELECT f.symbol, pp.is_stale FROM project_parameters pp JOIN fields f ON f.id = pp.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
       WHERE pp.project_id = ${P.id} AND w.code = 'M820-14' AND pp.source_type NOT IN ('derived','computed') ORDER BY f.symbol`;
    log('P2 step b M820-14 entered rows', m14rows);

    // ── probe 3: counts right after the direktvergabe save ──
    const counts = await loadRequiredFieldCounts(P.id, std);
    const state = await loadRequiredFieldState(P.id, std);
    const hidden11 = [...(state.hiddenByTemplate.get(t11) ?? [])];
    const hidden14 = [...(state.hiddenByTemplate.get(t14) ?? [])];
    const c11 = counts.get(t11); const c14 = counts.get(t14);
    log('P3 counts after direktvergabe', { m820_11: c11, m820_14: c14, stateM820_11: state.counts.get(t11), stateM820_14: state.counts.get(t14), hidden11: hidden11.length, hidden14: hidden14.length });
    expect(c14, `M820-14 counts after direktvergabe ${J(c14)}`).toEqual({ totalRequired: 0, filledRequired: 0 });
    expect(state.counts.get(t14), 'state counts == counts (M820-14)').toEqual(c14);
    expect(state.counts.get(t11), 'state counts == counts (M820-11)').toEqual(c11);
    // Hidden ⇒ neither total nor open (C-7): the stale leftover under direktvergabe is not counted at all; R-12 "stale counts
    // as open" applies once the question is visible again (asserted below, after the switch back to vgv_f).
    const lwId = (await harness.sql<{ id: string }[]>`SELECT f.id FROM fields f WHERE f.worksheet_template_id = ${t11} AND f.symbol = 'leistungswettbewerb_only'`)[0].id;
    expect(hidden11, `leistungswettbewerb_only hidden on M820-11 under direktvergabe ${J(hidden11)}`).toContain(lwId);
    const req11 = await harness.sql<{ id: string; symbol: string }[]>`SELECT id::text, symbol FROM fields WHERE worksheet_template_id = ${t11} AND active AND is_required`;
    const hiddenReq11 = req11.filter((f) => hidden11.includes(f.id)).map((f) => f.symbol).sort();
    log('P3 M820-11 hidden required under direktvergabe', hiddenReq11);
    expect(c11!.totalRequired, `M820-11 under direktvergabe: hidden required fields ${J(hiddenReq11)} not in the total ${J(c11)} vs vgv_f ${J(countsVgv.get(t11))}`)
      .toBe(countsVgv.get(t11)!.totalRequired - hiddenReq11.length);
    expect(c11!.filledRequired, `M820-11 under direktvergabe: the hidden stale answer is not counted as filled ${J(c11)}`).toBe(0);

    // ── back to vgv_f: the M820-10 save does NOT clear the flag on M820-11 ──
    await save(P, 'M820-10', { procurement_procedure: e('vgv_f') });
    const c = await row(P, 'M820-11', 'leistungswettbewerb_only');
    log('P2 step c (M820-10 → vgv_f)', c);
    expect(c?.value_boolean, `step c value ${J(c)}`).toBe(true);
    expect(c?.is_stale, `step c: still flagged (cleared only by the own sheet) ${J(c)}`).toBe(true);
    const countsBack = await loadRequiredFieldCounts(P.id, std);
    log('P3 counts after vgv_f again (stale visible)', { m820_11: countsBack.get(t11), vgvBefore: countsVgv.get(t11) });
    expect(countsBack.get(t11)!.totalRequired, `M820-11 total back ${J(countsBack.get(t11))}`).toBe(countsVgv.get(t11)!.totalRequired);
    expect(countsBack.get(t11)!.filledRequired, `M820-11: the stale visible answer counts as OPEN ${J(countsBack.get(t11))} vs ${J(countsVgv.get(t11))}`)
      .toBe(countsVgv.get(t11)!.filledRequired - 1);

    // ── own save with the field visible clears it ──
    await save(P, 'M820-11', { leistungswettbewerb_only: b(true) });
    const d = await row(P, 'M820-11', 'leistungswettbewerb_only');
    log('P2 step d (M820-11 re-saved, visible)', d);
    expect(d?.is_stale, `step d cleared ${J(d)}`).toBe(false);
    const countsEnd = await loadRequiredFieldCounts(P.id, std);
    log('P3 counts after own re-save', { m820_11: countsEnd.get(t11) });
    expect(countsEnd.get(t11), 'M820-11 counts restored').toEqual(countsVgv.get(t11));
  }, 300_000);

  // ── 4 · R-15 / R-16 gate ──────────────────────────────────────────────────────────────────────────────────────
  // 4a (brief): REQ-46 on 820-2-22 with a leftover testbetrieb_vs_abnahme_choice hidden at source by bauleistungen_vergeben = false.
  // Driven up to the verdict, then SKIPPED if the seed carries no rule that hides the choice — the premise is then absent and
  // the R-15 expectation cannot be tested on this symbol (the observed verdict is logged as a finding, not asserted away).
  it('probe 4a · R-15/R-16: REQ-46 with a leftover choice hidden at source (skipped when the seed cannot hide the choice)', async (ctx) => {
    const req46 = await gateDef('820-2-22', 'REQ-46');
    const choiceDef = await fieldDef('820-2-18', 'testbetrieb_vs_abnahme_choice');
    log('P4a REQ-46', req46);
    log('P4a choice def (820-2-18)', choiceDef);
    expect(req46?.condition, `REQ-46 ${J(req46)}`).toMatch(/testbetrieb_vs_abnahme_choice/);
    // Discovery: every M820 gate whose condition reads a symbol that lives ONLY on other sheets and is hideable there.
    const xs = await harness.sql<{ std: string; ws: string; code: string; severity: string; symbol: string; src: string; rule: string }[]>`
      SELECT st.code AS std, gw.code AS ws, cr.code, cr.severity, f.symbol, fw.code AS src, COALESCE(f.visible_when, s.visible_when) AS rule
        FROM compliance_requirements cr JOIN worksheet_templates gw ON gw.id = cr.worksheet_template_id JOIN standards st ON st.id = gw.standard_id
        JOIN worksheet_templates fw ON fw.standard_id = gw.standard_id AND fw.id <> gw.id
        JOIN fields f ON f.worksheet_template_id = fw.id AND f.active LEFT JOIN worksheet_sections s ON s.id = f.section_id
       WHERE st.code LIKE 'DWA-M-820-%' AND (f.visible_when IS NOT NULL OR s.visible_when IS NOT NULL)
         AND cr.condition ~ ('\\m' || f.symbol || '\\M')
         AND NOT EXISTS (SELECT 1 FROM fields o WHERE o.worksheet_template_id = gw.id AND o.symbol = f.symbol AND o.active)
       ORDER BY st.code, gw.code, cr.code`;
    log('P4a discovery · gates reading a symbol hideable only on another sheet', xs);

    const P = await makeProject('probe 4a · REQ-46 leftover choice');
    // NOTE: bauleistungen_vergeben lives on 820-2-17 (the brief named 820-2-18); the choice lives on 820-2-18.
    await save(P, '820-2-17', { bauleistungen_vergeben: b(true) });
    await save(P, '820-2-18', { testbetrieb_vs_abnahme_choice: e('testbetrieb') });
    await save(P, '820-2-17', { bauleistungen_vergeben: b(false) });
    const choiceRow = await row(P, '820-2-18', 'testbetrieb_vs_abnahme_choice');
    log('P4a leftover choice row after bauleistungen_vergeben=false', choiceRow);
    expect(choiceRow?.value_enum, `leftover kept ${J(choiceRow)}`).toBe('testbetrieb');
    const t22 = await templateId('820-2-22');
    const st = await loadRequiredFieldState(P.id, t22.standard_id);
    const srcHidden22 = [...(st.sourceHiddenByTemplate.get(t22.id) ?? [])].sort();
    log('P4a R-16 sourceHiddenByTemplate[820-2-22]', srcHidden22);
    // 820-2-22 planning fields: phase reached, acceptance per Bild 4 confirmed, test operation NOT planned — only REQ-46 could bite.
    await save(P, '820-2-22', {
      phase_inbetriebnahme_erreicht: b(true), abnahme_per_bild4: b(true), testbetrieb_planned: b(false), testbetrieb_documentation_precondition: b(true),
    });
    const g1 = await gate(P, '820-2-22');
    log('P4a gate (bauleistungen_vergeben=false, leftover choice=testbetrieb, testbetrieb_planned=false)', g1);
    const hideable = !!(choiceDef?.visible_when || choiceDef?.section_vw);
    if (!hideable) {
      log('P4a SKIPPED', 'testbetrieb_vs_abnahme_choice (820-2-18) has no field or section visible_when in the seed (prod blocks + 20261008100000): '
        + 'bauleistungen_vergeben = false does not hide it, so it is never hidden at source and R-15 has nothing to act on. '
        + `Observed: REQ-46 ${g1.failing.includes('REQ-46') ? 'FAILS' : 'does not fail'} on the leftover choice — ${J(g1)}`);
      ctx.skip();
    }
    expect(srcHidden22, `R-16 choice hidden at source for 820-2-22 ${J(srcHidden22)}`).toContain('testbetrieb_vs_abnahme_choice');
    expect(g1.failing, `REQ-46 not failing ${J(g1)}`).not.toContain('REQ-46');
    expect(g1.pending.some((x) => x.startsWith('REQ-46[')), `REQ-46 not pending ${J(g1)}`).toBe(false);
  }, 300_000);

  // 4b (brief, second half): REQ-46 on its real value — bauleistungen_vergeben = true, choice testbetrieb.
  it('probe 4b · REQ-46 enforces on the real value: testbetrieb_planned=false refuses (severity read from the seed), true passes', async () => {
    const req46 = (await gateDef('820-2-22', 'REQ-46'))!;
    const P = await makeProject('probe 4b · REQ-46 real value');
    await save(P, '820-2-17', { bauleistungen_vergeben: b(true) });
    await save(P, '820-2-18', { testbetrieb_vs_abnahme_choice: e('testbetrieb') });
    await save(P, '820-2-22', {
      phase_inbetriebnahme_erreicht: b(true), abnahme_per_bild4: b(true), testbetrieb_planned: b(false), testbetrieb_documentation_precondition: b(true),
    });
    const g2 = await gate(P, '820-2-22');
    log(`P4b gate (REQ-46 severity=${req46.severity}; bauleistungen_vergeben=true, choice=testbetrieb, testbetrieb_planned=false)`, g2);
    if (req46.severity === 'block') {
      expect(g2.failing, `REQ-46 (block) fails on the real value ${J(g2)}`).toContain('REQ-46');
    } else {
      expect(g2.failing, `REQ-46 is ${req46.severity}, not in the block lists ${J(g2)}`).not.toContain('REQ-46');
    }
    await save(P, '820-2-22', { testbetrieb_planned: b(true) });
    const g3 = await gate(P, '820-2-22');
    log('P4b gate (testbetrieb_planned=true)', g3);
    expect(g3.failing, `REQ-46 passes ${J(g3)}`).not.toContain('REQ-46');
    expect(g3.pending.some((x) => x.startsWith('REQ-46[')), `REQ-46 not pending ${J(g3)}`).toBe(false);
  }, 300_000);

  // 4c (substitute R-15 proof on a REAL cross-sheet case from the discovery): DWA-M 820-3 M8203-23 REQ-20 reads the entered totals
  // qe63a_items_total (M8203-12) and qe63b_items_total (M8203-13), whose sections are hidden unless project_type (M8203-01) is
  // einzelprojekt / both. REQ-20 is WARN in the seed: its severity is flipped to block for the gate calls only and restored after
  // (the workflow-audit harness' warnFires pattern) — the R-15 verdict path is the block path.
  it('probe 4c · R-15/R-16 on real data: M8203-23 REQ-20 with totals hidden at source is not_applicable; fires when visible', async () => {
    const req20 = await gateDef('M8203-23', 'REQ-20');
    const defA = await fieldDef('M8203-12', 'qe63a_items_total');
    const defB = await fieldDef('M8203-13', 'qe63b_items_total');
    log('P4c REQ-20', req20);
    log('P4c qe63a_items_total def', defA);
    log('P4c qe63b_items_total def', defB);
    expect(req20?.condition, `REQ-20 ${J(req20)}`).toMatch(/qe63a_items_total/);
    expect(defA?.visible_when ?? defA?.section_vw, `qe63a def ${J(defA)}`).toMatch(/project_type/);
    expect(defB?.visible_when ?? defB?.section_vw, `qe63b def ${J(defB)}`).toMatch(/project_type/);
    const P = await makeProject('probe 4c · M8203-23 REQ-20 hidden at source');
    const t23 = await templateId('M8203-23');
    await save(P, 'M8203-01', { project_type: e('einzelprojekt') });
    await save(P, 'M8203-12', { qe63a_items_total: n(21) });
    await save(P, 'M8203-13', { qe63b_items_total: n(10) }); // 21 + 10 is not 40 → REQ-20 violated while visible
    const sev = req20!.severity;
    const upd = (s: string) => harness.sql`UPDATE compliance_requirements cr SET severity = ${s} FROM worksheet_templates w
      WHERE w.id = cr.worksheet_template_id AND w.code = 'M8203-23' AND cr.code = 'REQ-20'`;
    await upd('block');
    try {
      const gVis = await gate(P, 'M8203-23');
      log('P4c gate (einzelprojekt, totals 21 + 10)', gVis);
      expect(gVis.failing, `REQ-20 fires while the totals are visible ${J(gVis)}`).toContain('REQ-20');

      await save(P, 'M8203-01', { project_type: e('gesamtsystem') });
      const ra = await row(P, 'M8203-12', 'qe63a_items_total');
      const rb = await row(P, 'M8203-13', 'qe63b_items_total');
      log('P4c leftover totals after project_type=gesamtsystem (R-13 consumer pass)', { ra, rb });
      expect(ra?.value_number, `leftover kept ${J(ra)}`).not.toBeNull();
      const stt = await loadRequiredFieldState(P.id, t23.standard_id);
      const srcHidden = [...(stt.sourceHiddenByTemplate.get(t23.id) ?? [])].sort();
      log('P4c R-16 sourceHiddenByTemplate[M8203-23]', srcHidden);
      expect(srcHidden, `totals hidden at source for M8203-23 ${J(srcHidden)}`).toEqual(expect.arrayContaining(['qe63a_items_total', 'qe63b_items_total']));
      const gHid = await gate(P, 'M8203-23');
      log('P4c gate (gesamtsystem, leftover totals 21 + 10 hidden at source)', gHid);
      expect(gHid.failing, `REQ-20 not failing on hidden leftovers ${J(gHid)}`).not.toContain('REQ-20');
      expect(gHid.pending.some((x) => x.startsWith('REQ-20[')), `REQ-20 not pending ${J(gHid)}`).toBe(false);
    } finally {
      await upd(sev);
    }
    expect((await gateDef('M8203-23', 'REQ-20'))?.severity, 'REQ-20 severity restored').toBe(sev);
  }, 300_000);

  // ── 5 · regression guard ──────────────────────────────────────────────────────────────────────────────────────
  it('probe 5 · regression guard: a save on a rule-free sheet changes no is_stale flag and no row count', async () => {
    // A rule-free sheet: no field/section visible_when on it, and none of its symbols read by any rule of its standard.
    const cands = await harness.sql<{ code: string; symbol: string; data_type: string }[]>`
      WITH rules AS (
        SELECT w.standard_id, f.visible_when AS r FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE f.visible_when IS NOT NULL AND f.active
        UNION ALL
        SELECT w.standard_id, s.visible_when FROM worksheet_sections s JOIN worksheet_templates w ON w.id = s.worksheet_template_id WHERE s.visible_when IS NOT NULL
      ), bare AS (
        SELECT w.id, w.code, w.standard_id, w.order_index FROM worksheet_templates w JOIN standards st ON st.id = w.standard_id
         WHERE st.code = 'DWA-M-820-2'
           AND NOT EXISTS (SELECT 1 FROM fields f WHERE f.worksheet_template_id = w.id AND f.active AND f.visible_when IS NOT NULL)
           AND NOT EXISTS (SELECT 1 FROM worksheet_sections s WHERE s.worksheet_template_id = w.id AND s.visible_when IS NOT NULL)
           AND NOT EXISTS (SELECT 1 FROM fields f JOIN rules ON rules.standard_id = w.standard_id
                            WHERE f.worksheet_template_id = w.id AND f.active AND rules.r ~ ('\\m' || f.symbol || '\\M'))
      )
      SELECT bare.code, f.symbol, f.data_type FROM bare JOIN fields f ON f.worksheet_template_id = bare.id
       WHERE f.active AND f.data_type = 'boolean' ORDER BY bare.order_index, f.order_index LIMIT 1`;
    log('P5 rule-free sheet / field', cands);
    if (cands.length === 0) {
      log('P5 SKIPPED', 'no rule-free 820-2 sheet with a boolean field in the seed');
      return;
    }
    const { code, symbol } = cands[0];
    // Re-use a project that already carries a stale flag elsewhere (probe 1 shape) so "no change" is meaningful.
    const P = await makeProject('probe 5 · regression guard');
    await save(P, '820-2-22', { phase_inbetriebnahme_erreicht: b(true), abnahme_per_bild4: b(false) });
    await save(P, '820-2-22', { phase_inbetriebnahme_erreicht: b(false) });
    await save(P, code, { [symbol]: b(true) });
    const before = await allRows(P);
    const staleBefore = before.filter((r) => r.is_stale).map((r) => r.field_id);
    await save(P, code, { [symbol]: b(false) });
    const after = await allRows(P);
    const staleAfter = after.filter((r) => r.is_stale).map((r) => r.field_id);
    log('P5 rows before/after', { before: before.length, after: after.length, staleBefore, staleAfter });
    expect(staleBefore.length, `a stale flag exists elsewhere ${J(staleBefore)}`).toBeGreaterThan(0);
    expect(after.length, `row count unchanged ${before.length} → ${after.length}`).toBe(before.length);
    expect(after, `is_stale per row unchanged ${J({ before, after })}`).toEqual(before);
    const r = await row(P, code, symbol);
    expect(r?.value_boolean, `value written ${J(r)}`).toBe(false);
  }, 300_000);
});
