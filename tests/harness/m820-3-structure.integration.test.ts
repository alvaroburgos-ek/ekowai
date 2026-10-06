/**
 * DWA-M 820-3 structure block — embedded-Postgres proof of the staged block
 *   scripts/migrations/20261006120000_m820_3_structure.sql
 *   scripts/rollback-20261006120000-m820-3-structure.sql
 *   scripts/verification/apply/readback-20261006120000-m820-3-structure.sql
 * (apply order: vault 01-Projects/ekowai-wizard/m820-wizard-test/19_APPLY-ORDER-m820-3-structure.md).
 *
 * Disposable embedded Postgres only (embedded-pg.ts, schema from the Drizzle model) — no prod, no .env.local.
 * Auth seam: BYPASS_AUTH + BYPASS_AUTH_USER_ID, so the REAL saveWorksheet (incl. the derived-output materialiser) and the REAL
 * checkApprovalGate run; loadInheritedFields + computeVisibility show what the form resolves on the consumer sheets.
 *
 * SEED (pre-state = what prod holds today): the byte copy of the 2026-10-05 vault dump (tests/harness/m820-3-structure.dump.json,
 *   md5 3960aae41acfc0c638742dbc174c73f4), consumer_worksheets from src/lib/eval/field-configs/m820_3.prior.json (read-only prod
 *   capture 2026-09-18 — R-2 lead; the Plan-3-created fields carry none), fields.source_anchor added. PLUS a one-field stand-in of
 *   DWA-M 820-1 (M820-01 project_type, tokens konzept / projekt — the 820-1 prior's list) so the projects carry a same-named
 *   foreign symbol, as every real project that holds both parts of the series does. "Rollback byte-equal" is measured against the
 *   seeded state.
 *
 * CASES (short facts; client data stays local):
 *   Forscheln C1 — Einzelprojekt (the pond), built Aug–Sep 2026, no acceptance on file → § 6.6 / § 6.7 "noch_nicht_erreicht"; § 6.2 …
 *     § 6.5 as recorded in 14_Readiness-Run_M820-3 §2.2; 820-1 project_type = projekt (14_Readiness-Run_M820-1). Private client
 *     (kleiner_kommunaler_betrieb = No), no BIM.
 *   Paula C2 — Gesamtsystem concept (project_type gesamtsystem), § 5 goals as 14_Readiness-Run_M820-3 §3.2; § 6 not answered.
 *   Unanswered — project_type blank (with an 820-1 project_type = konzept saved): the routed checks wait.
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
import { computeVisibility } from '@/lib/compliance/visibility';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008a4';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261006120000_m820_3_structure.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006120000-m820-3-structure.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261006120000-m820-3-structure.sql');
const PREDEPLOY = resolve(ROOT, 'scripts/verification/apply/predeploy-own-standard-scoping.sql');
const log = (label: string, v: unknown) => console.log(`[M820-3 STRUCTURE] ${label}: ${JSON.stringify(v)}`);
const md5 = (s: string) => createHash('md5').update(s).digest('hex');
const TOKEN = 'noch_nicht_erreicht';

type DumpField = {
  id: string; worksheet: string; section_id: string | null; symbol: string; label_de: string; label_en: string | null;
  data_type: string; unit: string | null; is_required: boolean; enum_values: unknown; validation_rules: unknown;
  clause_reference: string | null; description: string | null; order_index: number; verification_status: string;
  source_anchor: string | null; active: boolean; default_value: unknown; widget: string | null; ui_config: unknown;
  lookup: unknown; visible_when: string | null;
};
type Dump = {
  standard: { id: string; code: string; title_de: string; title_en: string | null; version: string };
  worksheets: Array<{ id: string; code: string; title_de: string; title_en: string | null; order_index: number }>;
  sections: Array<{ id: string; worksheet: string; parent_section_id: string | null; code: string | null; title_de: string; title_en: string | null; order_index: number; visible_when: string | null }>;
  fields: DumpField[];
  equations: Array<{ id: string; worksheet: string; equation_number: string; formula: string; output_symbol: string | null; output_unit: string | null; input_symbols: string[] | null; clause_reference: string | null }>;
  gates: Array<{ id: string; worksheet: string; code: string; title_de: string; title_en: string | null; description: string | null; suggestion: string | null; severity: string; condition: string; clause_reference: string | null }>;
};
const readJson = <T>(p: string): T => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8').replace(/^﻿/, '')) as T;
const DUMP = readJson<Dump>('tests/harness/m820-3-structure.dump.json');

const PHASE_SHEETS = { 'M8203-04': '52', 'M8203-05': '53', 'M8203-06': '54', 'M8203-11': '62', 'M8203-12': '63', 'M8203-14': '64', 'M8203-16': '65', 'M8203-17': '66', 'M8203-18': '67' } as const;
const NEW_SYMBOLS = [...Object.values(PHASE_SHEETS).map((p) => `pz_${p}_projektstopp_risikoanalyse`), 'kleiner_kommunaler_betrieb', 'digitale_methoden_bim_angewendet'];
const EDITED = ['REQ-02', 'REQ-03', 'REQ-05', 'REQ-06', 'REQ-07', 'REQ-08', 'REQ-09', 'REQ-10', 'REQ-11', 'REQ-12', 'REQ-13', 'REQ-14', 'REQ-25', 'REQ-26', 'REQ-27', 'REQ-29', 'REQ-30', 'REQ-31'];
const REVIEW_GATES = ['REQ-06-2', 'REQ-07-2', 'REQ-08-2', 'REQ-09-2', 'REQ-10-2', 'REQ-11-2', 'REQ-12-2', 'REQ-13-2', 'REQ-14-2'];
const TOKEN_GATES = REVIEW_GATES.map((c) => c.replace(/-2$/, '-3')); // review fix I-n (warn)
const NEW_GATES = [...REVIEW_GATES, ...TOKEN_GATES];
const SHEETS_A = ['M8203-04', 'M8203-05', 'M8203-06', 'M8203-07', 'M8203-08', 'M8203-09', 'M8203-10', 'M8203-22'];
const SHEETS_B = ['M8203-11', 'M8203-12', 'M8203-13', 'M8203-14', 'M8203-15', 'M8203-16', 'M8203-17', 'M8203-18', 'M8203-23'];
const pzOf = (ws: string) => DUMP.fields.filter((f) => f.worksheet === ws && /^pz_\d+_\d+_status$/.test(f.symbol)).map((f) => f.symbol);

let harness: Harness;
let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;
let loadInheritedFields: typeof LoadInheritedFields;

async function seed(): Promise<void> {
  const sql = harness.sql;
  const d = DUMP;
  const prior = readJson<Record<string, { consumer_worksheets?: string[] | null }>>('src/lib/eval/field-configs/m820_3.prior.json');
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
  for (const e of d.equations) {
    await sql`INSERT INTO equations (id, worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference)
              VALUES (${e.id}, ${tmpl.get(e.worksheet)!}, ${e.equation_number}, ${e.formula}, ${e.input_symbols}, ${e.output_symbol}, ${e.output_unit}, ${e.clause_reference})`;
  }
  for (const g of d.gates) {
    await sql`INSERT INTO compliance_requirements (id, worksheet_template_id, code, title_de, title_en, condition, description, clause_reference, severity, suggestion)
              VALUES (${g.id}, ${tmpl.get(g.worksheet)!}, ${g.code}, ${g.title_de}, ${g.title_en}, ${g.condition}, ${g.description}, ${g.clause_reference}, ${g.severity}, ${g.suggestion})`;
  }
  // the DWA-M 820-1 stand-in: one sheet, one field project_type with the 820-1 tokens
  const [s1] = await sql<{ id: string }[]>`INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-820-1', 'DWA-M 820-1 (harness stand-in: project_type only)', '2020') RETURNING id`;
  const [w1] = await sql<{ id: string }[]>`INSERT INTO worksheet_templates (standard_id, code, title_de, order_index) VALUES (${s1.id}, 'M820-01', 'Projektregistrierung (820-1)', 1) RETURNING id`;
  await sql`INSERT INTO fields (worksheet_template_id, symbol, label_de, data_type, is_required, enum_values, order_index, verification_status, active)
            VALUES (${w1.id}, 'project_type', 'Projekttyp (820-1)', 'enum', true,
                    ${sql.json([{ value: 'konzept', label_de: 'Konzept', order_index: 1 }, { value: 'projekt', label_de: 'Projekt', order_index: 2 }] as never)}, 1, 'imported_unverified', true)`;
  log('seeded', { worksheets: d.worksheets.length, sections: d.sections.length, fields: d.fields.length, equations: d.equations.length, gates: d.gates.length, foreign: 'DWA-M-820-1 M820-01 project_type' });
}

// ── full-table dump of the definition tables ─────────────────────────────────
const TOUCHED = ['standards', 'worksheet_templates', 'worksheet_sections', 'fields', 'equations', 'compliance_requirements'] as const;
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
    for (const r of a[t]) if (!sb.has(r)) d.push(`${t} - ${r.slice(0, 200)}`);
    for (const r of b[t]) if (!sa.has(r)) d.push(`${t} + ${r.slice(0, 200)}`);
  }
  return d;
}
const digest = (d: TableDump) => Object.fromEntries(TOUCHED.map((t) => [t, `${d[t].length} rows md5 ${md5(d[t].join('\n'))}`]));
async function runFile(path: string): Promise<void> {
  const conn = await harness.sql.reserve();
  try { await conn.unsafe(readFileSync(path, 'utf8')); } finally { conn.release(); }
}
async function archiveCounts(): Promise<{ gates: number | null; fields: number | null; sections: number | null }> {
  const one = async (t: string) => {
    const [r] = await harness.sql<{ t: string | null }[]>`SELECT to_regclass(${'public.' + t})::text AS t`;
    if (!r.t) return null;
    const [c] = await harness.sql.unsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${t}`);
    return c.n;
  };
  return { gates: await one('compliance_requirements_archive_m820_3_structure'), fields: await one('fields_archive_m820_3_structure'), sections: await one('worksheet_sections_archive_m820_3_structure') };
}

// ── project fixture ──────────────────────────────────────────────────────────
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
const b = (value: boolean): V => ({ type: 'boolean', value });
const e = (value: string): V => ({ type: 'enum', value });
async function save(p: Proj, ws: string, vals: Record<string, V>) {
  const ids = await harness.sql<{ id: string; symbol: string }[]>`
    SELECT f.id, f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
    WHERE w.code = ${ws} AND f.symbol IN ${harness.sql(Object.keys(vals))}`;
  expect(ids.length, `${ws} fields ${Object.keys(vals)}`).toBe(Object.keys(vals).length);
  const values = Object.fromEntries(ids.map((f) => [f.id, vals[f.symbol]]));
  const r = await saveWorksheet({ instanceId: p.inst.get(ws)!, values: values as never });
  expect(r.ok, `${ws} save ${JSON.stringify(r)}`).toBe(true);
}
async function gate(p: Proj, ws: string) {
  const g = await checkApprovalGate(p.inst.get(ws)!);
  return {
    failing: g.failingBlockConditions.map((c) => c.code).sort(),
    pending: g.pendingBlockConditions.map((c) => `${c.code}<${c.missingInputs.map((m) => `${m.symbol}${m.originCode ? '@' + m.originCode : ''}`).join(',')}>`).sort(),
    missing: g.missingRequiredFields.map((f) => f.symbol).sort(),
  };
}
const routedOnly = (g: { failing: string[]; pending: string[] }) => [...g.failing, ...g.pending].filter((c) => /^REQ-(0[6-9]|1[0-4])(-2)?(<|$)/.test(c)).sort();
async function storedNumber(p: Proj, symbol: string): Promise<number | null | 'none'> {
  const r = await harness.sql<{ v: string | null }[]>`SELECT pp.value_number::text AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
    WHERE pp.project_id = ${p.id} AND f.symbol = ${symbol}`;
  return r.length === 0 ? 'none' : r[0].v === null ? null : Number(r[0].v);
}
const enumVals = (ws: string, v: string): Record<string, V> => Object.fromEntries(pzOf(ws).map((s) => [s, e(v)]));

/** Forscheln C1 § 6 goals (14_Readiness-Run_M820-3 §2.2), § 6.6 / § 6.7 = phase not reached yet. */
const F62 = { pz_62_1_status: 'erreicht', pz_62_2_status: 'nicht_zutreffend', pz_62_3_status: 'teilweise_erreicht', pz_62_4_status: 'teilweise_erreicht', pz_62_5_status: 'erreicht' };
const F65 = { pz_65_1_status: 'teilweise_erreicht', pz_65_2_status: 'teilweise_erreicht', pz_65_3_status: 'teilweise_erreicht', pz_65_4_status: 'erreicht', pz_65_5_status: 'erreicht', pz_65_6_status: 'nicht_erreicht', pz_65_7_status: 'erreicht', pz_65_8_status: 'teilweise_erreicht', pz_65_9_status: 'nicht_zutreffend', pz_65_10_status: 'erreicht', pz_65_11_status: 'erreicht', pz_65_12_status: 'nicht_zutreffend' };
const asEnum = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, e(v)]));
/** Paula C2 § 5 goals (14_Readiness-Run_M820-3 §3.2). */
const P52 = { pz_52_1_status: 'teilweise_erreicht', pz_52_2_status: 'teilweise_erreicht', pz_52_3_status: 'erreicht', pz_52_4_status: 'erreicht', pz_52_5_status: 'teilweise_erreicht' };
const P53 = { pz_53_1_status: 'teilweise_erreicht', pz_53_2_status: 'nicht_erreicht', pz_53_3_status: 'erreicht', pz_53_4_status: 'teilweise_erreicht', pz_53_5_status: 'nicht_erreicht' };
const P54 = { pz_54_1_status: 'erreicht', pz_54_2_status: 'erreicht', pz_54_3_status: 'erreicht' };

/** How many field-level project_type rules resolve (pass / fail) vs stay pending on the consumer sheets, the form's way (own + inherited lookup). */
async function ruleResolution(p: Proj) {
  const sql = harness.sql;
  const [std] = await sql<{ id: string }[]>`SELECT id FROM standards WHERE code = 'DWA-M-820-3'`;
  const pt = await sql<{ v: string | null }[]>`SELECT pp.value_enum AS v FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
    JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE pp.project_id = ${p.id} AND w.code = 'M8203-01' AND f.symbol = 'project_type'`;
  const ptValue = pt[0]?.v ?? undefined;
  const out = { resolved: 0, pending: 0, hidden: 0, sheetsInheriting: 0 };
  for (const ws of [...SHEETS_A, ...SHEETS_B]) {
    const [t] = await sql<{ id: string }[]>`SELECT id FROM worksheet_templates WHERE code = ${ws}`;
    const inherited = await loadInheritedFields(t.id, std.id, ws);
    const hasPt = inherited.some((f) => f.symbol === 'project_type');
    if (hasPt) out.sheetsInheriting++;
    const own = await sql<{ id: string; symbol: string; section_id: string | null; visible_when: string | null }[]>`
      SELECT id, symbol, section_id, visible_when FROM fields WHERE worksheet_template_id = ${t.id} AND active`;
    const lookup = (s: string) => (s === 'project_type' && hasPt ? ptValue : undefined);
    for (const f of own.filter((x) => x.visible_when?.includes('project_type'))) {
      const k = evaluateCondition(f.visible_when!, lookup, { existsOnAbsent: 'definite' }).kind;
      if (k === 'pending') out.pending++; else out.resolved++;
    }
    const secs = await sql<{ id: string; parent_section_id: string | null; visible_when: string | null }[]>`SELECT id, parent_section_id, visible_when FROM worksheet_sections WHERE worksheet_template_id = ${t.id}`;
    const vis = computeVisibility(own.map((f) => ({ id: f.id, symbol: f.symbol, sectionId: f.section_id, visibleWhen: f.visible_when })),
      secs.map((s) => ({ id: s.id, parentSectionId: s.parent_section_id, visibleWhen: s.visible_when })), lookup);
    out.hidden += vis.hiddenFieldIds.size;
  }
  return out;
}

let PRE: TableDump;
let forscheln: Proj;
let paula: Proj;

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-3-structure@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820-3 structure harness', ${'m820-3-str-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${USER_ID}, 'owner')`;
  await seed();
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadInheritedFields } = await import('@/lib/db/queries/worksheet'));
}, 180_000);

afterAll(async () => {
  await harness?.stop();
});

describe('DWA-M 820-3 structure block — staged block on embedded Postgres', () => {
  it('a. pre-state: nothing of the block; BROKEN BEFORE — forced answers on the other path, a running project blocks, project_type reaches no sheet', async () => {
    expect(await archiveCounts()).toEqual({ gates: null, fields: null, sections: null });
    forscheln = await makeProject('forscheln-c1');
    await save(forscheln, 'M820-01', { project_type: e('projekt') }); // the 820-1 answer of the same project
    await save(forscheln, 'M8203-01', { project_type: e('einzelprojekt') });
    await save(forscheln, 'M8203-11', asEnum(F62));
    await save(forscheln, 'M8203-17', enumVals('M8203-17', 'nicht_erreicht')); // the only truthful token before the block
    const before = { '-04': await gate(forscheln, 'M8203-04'), '-17': await gate(forscheln, 'M8203-17') };
    log('Forscheln BEFORE (Einzelprojekt, § 6.6 forced nicht_erreicht)', { '-04 missing': before['-04'].missing, '-04 routed': routedOnly(before['-04']), '-17 routed': routedOnly(before['-17']) });
    expect(before['-04'].missing).toEqual(pzOf('M8203-04').sort()); // the Gesamtsystem goals must be answered by a single project
    expect(before['-17'].failing).toContain('REQ-13');
    const res = await ruleResolution(forscheln);
    log('project_type rules on the 17 path sheets BEFORE (form lookup: own + inherited)', res);
    expect(res).toMatchObject({ resolved: 0, pending: 126, hidden: 0, sheetsInheriting: 0 });
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: 18 gates edited + 9 new, 11 new fields, 67 enums, 153 section rules, 8 field rules, project_type reach; archives filled', async () => {
    await runFile(MIGRATION);
    const gates = await harness.sql<{ code: string; ws: string; severity: string }[]>`
      SELECT cr.code, w.code AS ws, cr.severity FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
      WHERE cr.code IN ${harness.sql([...EDITED, ...NEW_GATES])} ORDER BY cr.code`;
    log('gates after apply', gates.map((g) => `${g.code}@${g.ws}/${g.severity}`));
    expect(gates).toHaveLength(36);
    const preGates = new Map(PRE.compliance_requirements.map((r) => JSON.parse(r) as { code: string; severity: string; condition: string }).map((g) => [g.code, g]));
    for (const g of gates.filter((x) => EDITED.includes(x.code))) expect(g.severity, g.code).toBe(preGates.get(g.code)!.severity);
    expect(gates.filter((g) => REVIEW_GATES.includes(g.code)).every((g) => g.severity === 'block')).toBe(true);
    expect(gates.filter((g) => TOKEN_GATES.includes(g.code)).every((g) => g.severity === 'warn')).toBe(true);
    expect(Object.fromEntries(gates.filter((g) => ['REQ-02', 'REQ-03', 'REQ-05', 'REQ-27', 'REQ-29', 'REQ-30', 'REQ-31'].includes(g.code)).map((g) => [g.code, g.ws])))
      .toEqual({ 'REQ-02': 'M8203-02', 'REQ-03': 'M8203-03', 'REQ-05': 'M8203-02', 'REQ-27': 'M8203-20', 'REQ-29': 'M8203-21', 'REQ-30': 'M8203-21', 'REQ-31': 'M8203-24' });
    const nf = await harness.sql<{ ws: string; symbol: string; req: boolean; section: string }[]>`
      SELECT w.code AS ws, f.symbol, f.is_required AS req, s.code AS section FROM fields f
      JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN worksheet_sections s ON s.id = f.section_id
      WHERE f.symbol IN ${harness.sql(NEW_SYMBOLS)} ORDER BY 1, 2`;
    log('new fields', nf.map((f) => `${f.ws}:${f.symbol}:${f.req}:${f.section}`));
    expect(nf).toHaveLength(11);
    const [tok] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM fields WHERE symbol LIKE 'pz\\_%\\_status' AND enum_values @> ${harness.sql.json([{ value: TOKEN }] as never)}`;
    const [secs] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM worksheet_sections WHERE visible_when IS NOT NULL`;
    const [pt] = await harness.sql<{ cw: string[] }[]>`SELECT f.consumer_worksheets AS cw FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = 'M8203-01' AND f.symbol = 'project_type'`;
    log('token enums / section rules / project_type reach', { tok: tok.n, secs: secs.n, reach: pt.cw });
    expect([tok.n, secs.n, pt.cw.length]).toEqual([67, 153, 17]);
    log('archives', await archiveCounts());
    expect(await archiveCounts()).toEqual({ gates: 18, fields: 76, sections: 153 });
    const [eqs] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM equations`;
    expect(eqs.n).toBe(115);
    expect(dumpDiff(PRE, await dump()).filter((l) => l.startsWith('equations'))).toEqual([]);
  });

  it('c. apply again: 0 changes (full dump compare), archives unchanged', async () => {
    const before = await dump();
    const arch = await archiveCounts();
    await runFile(MIGRATION);
    const diff = dumpDiff(before, await dump());
    log('re-apply diff', diff);
    expect(diff).toEqual([]);
    expect(await archiveCounts()).toEqual(arch);
  });

  it('d. rollback: byte-equal to the seeded state, archives emptied; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    const diff = dumpDiff(PRE, after);
    log('rollback diff vs pre', diff);
    log('rollback digest', digest(after));
    expect(diff).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await archiveCounts()).toEqual({ gates: 0, fields: 0, sections: 0 });
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('d2. the read-back file runs before and after an apply and shows the expected values', async () => {
    const stmts = splitOnUnquotedSemicolons(readFileSync(READBACK, 'utf8')).filter((s) => s.trim());
    expect(stmts).toHaveLength(11);
    expect(readFileSync(READBACK, 'utf8').split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(11);
    const pre: unknown[][] = [];
    for (const st of stmts.slice(0, 3)) pre.push([...(await harness.sql.unsafe(st))]);
    log('read-back R0a..R0c (before)', pre.map((r) => r.map((row) => JSON.stringify(row).slice(0, 160))));
    expect(pre[0]).toHaveLength(18);
    expect((pre[0] as Array<{ live_ok: boolean }>).every((r) => r.live_ok)).toBe(true);
    expect(pre[2][0]).toEqual({ new_fields: '0', new_gates: '0', token_enums: '0', section_rules: '0', pt_all: '1' });
    await runFile(MIGRATION);
    const res: unknown[][] = [];
    for (const st of stmts) res.push([...(await harness.sql.unsafe(st))]);
    log('read-back R0..R8 (after)', res.map((r) => r.map((row) => JSON.stringify(row).slice(0, 200))));
    expect(res[2][0]).toEqual({ new_fields: '11', new_gates: '18', token_enums: '67', section_rules: '153', pt_all: '0' });
    expect(res[3]).toHaveLength(36);
    expect((res[3] as Array<{ cond_ok: boolean }>).every((r) => r.cond_ok)).toBe(true);
    expect((res[3] as Array<{ severity: string }>).filter((r) => r.severity === 'block')).toHaveLength(18);
    expect(res[4]).toHaveLength(11);
    expect((res[5] as Array<{ with_token: string }>).map((r) => Number(r.with_token)).reduce((a, n) => a + n, 0)).toBe(67);
    expect(res[6]).toHaveLength(8);
    expect(res[8]).toHaveLength(17);
    expect(res[9][0]).toEqual({ gate_archive: '18', field_archive: '76', section_archive: '153' });
    expect(res[10]).toEqual([]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('e. re-apply, then the REAL saveWorksheet + checkApprovalGate — Forscheln (Einzelprojekt, running), Paula (Gesamtsystem), project type blank', async () => {
    await runFile(MIGRATION);

    // the visible_when rules now resolve on the consumer sheets (the form's lookup: own + inherited)
    const res = await ruleResolution(forscheln);
    log('project_type rules on the 17 path sheets AFTER (Forscheln = einzelprojekt)', res);
    expect(res.sheetsInheriting).toBe(17);
    expect(res).toMatchObject({ resolved: 126, pending: 0 });

    // ── Forscheln: Einzelprojekt, the § 6.6 / § 6.7 phases not reached yet; 820-1 project_type = projekt in the same project
    const f = forscheln;
    const g04 = await gate(f, 'M8203-04');
    log('Forscheln -04 (Gesamtsystem sheet, hidden)', g04);
    expect(g04).toEqual({ failing: [], pending: [], missing: [] });
    for (const ws of ['M8203-05', 'M8203-06', 'M8203-07', 'M8203-22']) expect(await gate(f, ws), ws).toEqual({ failing: [], pending: [], missing: [] });
    await save(f, 'M8203-17', enumVals('M8203-17', TOKEN));
    await save(f, 'M8203-18', enumVals('M8203-18', TOKEN));
    const g17 = await gate(f, 'M8203-17'); const g18 = await gate(f, 'M8203-18');
    log('Forscheln -17 / -18 (phase not reached yet) routed gates', { g17: routedOnly(g17), g18: routedOnly(g18) });
    expect([routedOnly(g17), routedOnly(g18)]).toEqual([[], []]);
    // § 6.2 has partial goals → the printed review is owed (REQ-09-2 waits for the record); § 6.5 one goal missed → REQ-12 blocks
    const g11 = await gate(f, 'M8203-11');
    log('Forscheln -11 (§ 6.2: two goals partial)', routedOnly(g11));
    expect(routedOnly(g11)).toEqual(['REQ-09-2<pz_62_projektstopp_risikoanalyse>']);
    await save(f, 'M8203-11', { pz_62_projektstopp_risikoanalyse: b(false) });
    expect(routedOnly(await gate(f, 'M8203-11'))).toEqual(['REQ-09-2']);
    await save(f, 'M8203-11', { pz_62_projektstopp_risikoanalyse: b(true) });
    expect(routedOnly(await gate(f, 'M8203-11'))).toEqual([]);
    await save(f, 'M8203-16', { ...asEnum(F65), pz_65_projektstopp_risikoanalyse: b(true) });
    const g16 = await gate(f, 'M8203-16');
    log('Forscheln -16 (§ 6.5: pz_65_6 nicht_erreicht, review recorded)', routedOnly(g16));
    expect(routedOnly(g16)).toEqual(['REQ-12']);
    // Projektstopp code (derived, real save path): § 6.6 / § 6.7 not reached → no stop signal from them
    const v = await makeProject('forscheln-variant-all-met');
    await save(v, 'M8203-01', { project_type: e('einzelprojekt') });
    for (const ws of ['M8203-11', 'M8203-12', 'M8203-14', 'M8203-16']) await save(v, ws, enumVals(ws, 'erreicht'));
    await save(v, 'M8203-17', enumVals('M8203-17', TOKEN));
    await save(v, 'M8203-18', enumVals('M8203-18', TOKEN));
    const { recomputeWorksheetEquations } = await import('@/lib/actions/recompute-worksheet'); // the code behind MCP recompute_worksheet (= the form's write-back)
    await recomputeWorksheetEquations(v.inst.get('M8203-23')!);
    await recomputeWorksheetEquations(v.inst.get('M8203-24')!);
    const codes = { code_b: await storedNumber(v, 'projektstopp_code_b'), code: await storedNumber(v, 'projektstopp_code') };
    log('variant: § 6.2–6.5 met, § 6.6 / 6.7 not reached → stored Projektstopp codes (code = all 67 goals, § 5 hidden = never answered)', codes);
    expect(codes.code_b).toBe(0);
    await save(v, 'M8203-17', { pz_66_1_status: e('teilweise_erreicht') });
    await recomputeWorksheetEquations(v.inst.get('M8203-23')!);
    const codeAfter = await storedNumber(v, 'projektstopp_code_b');
    log('variant: one § 6.6 goal partial → projektstopp_code_b', codeAfter);
    expect(codeAfter).toBe(1);

    // ── Paula: Gesamtsystem concept; § 6 never answered
    paula = await makeProject('paula-c2');
    await save(paula, 'M820-01', { project_type: e('konzept') });
    await save(paula, 'M8203-01', { project_type: e('gesamtsystem') });
    await save(paula, 'M8203-04', asEnum(P52));
    await save(paula, 'M8203-05', asEnum(P53));
    await save(paula, 'M8203-06', asEnum(P54));
    const pB: Record<string, unknown> = {};
    for (const ws of SHEETS_B) pB[ws] = await gate(paula, ws);
    log('Paula § 6 sheets (hidden path)', pB);
    for (const ws of SHEETS_B) expect(pB[ws], ws).toEqual({ failing: [], pending: [], missing: [] });
    const p04 = await gate(paula, 'M8203-04'); const p05 = await gate(paula, 'M8203-05'); const p06 = await gate(paula, 'M8203-06');
    log('Paula § 5 sheets (routed gates)', { p04: routedOnly(p04), p05: routedOnly(p05), p06: routedOnly(p06) });
    expect(routedOnly(p04)).toEqual(['REQ-06-2<pz_52_projektstopp_risikoanalyse>']);
    expect(routedOnly(p05)).toEqual(['REQ-07', 'REQ-07-2<pz_53_projektstopp_risikoanalyse>']);
    expect(routedOnly(p06)).toEqual([]);
    await save(paula, 'M8203-04', { pz_52_projektstopp_risikoanalyse: b(true) });
    expect(routedOnly(await gate(paula, 'M8203-04'))).toEqual([]);

    // ── project type blank (820-1 answered 'konzept' in the same project): the routed checks wait, nothing passes silently
    const u = await makeProject('project-type-blank');
    await save(u, 'M820-01', { project_type: e('konzept') });
    await save(u, 'M8203-04', enumVals('M8203-04', 'erreicht'));
    await save(u, 'M8203-11', enumVals('M8203-11', 'erreicht'));
    const u04 = await gate(u, 'M8203-04'); const u11 = await gate(u, 'M8203-11');
    log('project type blank: -04 / -11 routed gates', { u04: routedOnly(u04), u11: routedOnly(u11) });
    expect(routedOnly(u04)).toEqual(['REQ-06<project_type@M8203-01>']);
    expect(routedOnly(u11)).toEqual(['REQ-09<project_type@M8203-01>']);
    // review fix I-e: M8203-01's required project_type is NOT "filled" by the 820-1 token (A4 scoped to the own standard)
    const u01 = await gate(u, 'M8203-01');
    log('project type blank: M8203-01 missing (820-1 project_type = konzept saved)', u01.missing);
    expect(u01.missing).toContain('project_type');

    // ── S-14 / S-07 drivers on Forscheln: private client, no BIM → the hidden required questions are not demanded
    const g02a = await gate(f, 'M8203-02');
    expect(g02a.missing).toContain('kleiner_kommunaler_betrieb');
    await save(f, 'M8203-02', { kleiner_kommunaler_betrieb: b(false) });
    await save(f, 'M8203-19', { digitale_methoden_bim_angewendet: b(false) });
    const g02 = await gate(f, 'M8203-02'); const g19 = await gate(f, 'M8203-19'); const g21 = await gate(f, 'M8203-21');
    log('Forscheln -02 / -19 / -21 missing after the two drivers = No', { g02: g02.missing, g19: g19.missing, g21: g21.missing });
    expect(g02.missing).not.toContain('grundsatz_two_step_followed');
    expect(g19.missing.filter((s) => ['aia_available', 'bap_defined', 'bim_project_definition_complete', 'cde_platform_defined', 'digital_twin_after_project'].includes(s))).toEqual([]);
    expect(g21.missing.filter((s) => ['bim_communication_interfaces', 'cde_used_for_communication'].includes(s))).toEqual([]);
    expect(g21.missing).toEqual(expect.arrayContaining(['communication_concept_adaptive', 'public_info_via_digital_media']));
  });

  it('f. the pre-deploy read-only query runs (prod-query split) and lists the projects where another standard holds a same-named value', async () => {
    const text = readFileSync(PREDEPLOY, 'utf8');
    const stmts = text.split(/;\s*(?:\n|$)/).filter((x) => x.replace(/--.*$/gm, '').trim());
    expect(stmts).toHaveLength(2);
    const p1 = [...(await harness.sql.unsafe(stmts[0]))] as unknown as Array<{ project: string; symbol: string; own_std: string; own_has_value: boolean; other_has_value: boolean; other_values: string }>;
    const p2 = [...(await harness.sql.unsafe(stmts[1]))];
    log('pre-deploy P1 (project, symbol, own std, own value?, other values)', p1.map((r) => `${r.project} · ${r.symbol} · ${r.own_std} · own=${r.own_has_value} · other=${r.other_values}`));
    log('pre-deploy P2 rows (the harness keeps no project_standards rows)', p2.length);
    expect(p1.find((r) => r.project === 'project-type-blank' && r.own_std === 'DWA-M-820-3')).toMatchObject({ symbol: 'project_type', own_has_value: false, other_has_value: true });
    expect(p1.find((r) => r.project === 'forscheln-c1' && r.own_std === 'DWA-M-820-3')).toMatchObject({ symbol: 'project_type', own_has_value: true, other_has_value: true });
  });
});
