/**
 * DWA-M 820-2 structure block — embedded-Postgres proof of the staged block
 *   scripts/migrations/20261006100000_m820_2_structure.sql
 *   scripts/rollback-20261006100000-m820-2-structure.sql
 *   scripts/verification/apply/readback-20261006100000-m820-2-structure.sql
 * (apply order: vault 01-Projects/ekowai-wizard/m820-wizard-test/17_APPLY-ORDER-m820-2-structure.md).
 *
 * Disposable embedded Postgres only (embedded-pg.ts, schema from the Drizzle model) — no prod, no .env.local.
 * Auth seam: BYPASS_AUTH + BYPASS_AUTH_USER_ID (as the registers harness), so the REAL saveWorksheet and the REAL
 * checkApprovalGate (incl. this branch's inherited-carrier read for contains()) run.
 *
 * SEED (pre-state = what prod will hold right before this block): the byte copy of the 2026-10-05 vault dump
 *   (tests/harness/m820-2-registers.dump.json, md5 744f6883448a1877c322197122100a74 — same file the registers harness uses),
 *   consumer_worksheets from src/lib/eval/field-configs/m820_2.prior.json (read-only prod capture 2026-09-18, R-2 lead),
 *   fields.source_anchor added, THEN the registers block 20261005200000_m820_2_registers.sql (earlier in the apply order).
 *   "Rollback byte-equal" is measured against that post-registers state.
 *
 * CASES (short facts; client data stays local) — review round 1: routed by WHO PERFORMS the phase (820-2-01 drivers):
 *   Forscheln — private client; EKOWAI plans only (C1 v1.6: "Planning only. No site supervision, no construction work."); the pond
 *     is built by the client in Eigenleistung (BA-00 v1.6) → bauleistungen_vergeben = No, verantwortung_lph8 = auftraggeber (the
 *     LPH 8 gates are judged on the client's own documentation: with "No" they block); LPH 9: the records name nobody for the
 *     warranty follow-up → GAP for the owner (left blank → the LPH 9 gates wait); verantwortung_lph0 = auftragnehmer is a TEST value
 *     (routes nothing). Acceptance without a long test operation (testbetrieb_vs_abnahme_choice = abnahmepruefung).
 *   Public — external supervisor (auftragnehmer), LPH 9 by the contractor, works tendered, Testbetrieb, every routed input violating.
 *   Concept-only — LPH 8 / LPH 9 entfaellt.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startHarness, type Harness } from './embedded-pg';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008a3';
const REGISTERS = resolve(ROOT, 'scripts/migrations/20261005200000_m820_2_registers.sql');
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261006100000_m820_2_structure.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261006100000-m820-2-structure.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261006100000-m820-2-structure.sql');
const log = (label: string, v: unknown) => console.log(`[M820-2 STRUCTURE] ${label}: ${JSON.stringify(v)}`);
const md5 = (s: string) => createHash('md5').update(s).digest('hex');

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

const NEW_SYMBOLS = ['verantwortung_lph0', 'verantwortung_lph8', 'verantwortung_lph9', 'verantwortlich_lph9_name', 'bauleistungen_vergeben', 'betrieb_frueh_eingebunden', 'kostenhinweise_auftragnehmer', 'kostenziele_aenderungsprozess', 'aenderungsmanagement_gefuehrt', 'inbetriebnahme_organisiert'];
const CODES = ['REQ-06', 'REQ-13', 'REQ-15', 'REQ-19', 'REQ-35', 'REQ-38', 'REQ-39', 'REQ-40', 'REQ-41', 'REQ-43', 'REQ-44', 'REQ-45', 'REQ-46', 'REQ-50', 'REQ-51', 'REQ-52', 'REQ-55', 'REQ-59'];

let harness: Harness;
let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

async function seed(): Promise<void> {
  const sql = harness.sql;
  const d = readJson<Dump>('tests/harness/m820-2-registers.dump.json');
  const prior = readJson<Record<string, { consumer_worksheets?: string[] | null }>>('src/lib/eval/field-configs/m820_2.prior.json');
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
  log('seeded', { worksheets: d.worksheets.length, sections: d.sections.length, fields: d.fields.length, equations: d.equations.length, gates: d.gates.length });
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
async function archiveCounts(): Promise<{ gates: number | null; fields: number | null }> {
  const one = async (t: string) => {
    const [r] = await harness.sql<{ t: string | null }[]>`SELECT to_regclass(${'public.' + t})::text AS t`;
    if (!r.t) return null;
    const [c] = await harness.sql.unsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${t}`);
    return c.n;
  };
  return { gates: await one('compliance_requirements_archive_m820_2_structure'), fields: await one('fields_archive_m820_2_structure') };
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
type V = { type: 'json'; value: unknown } | { type: 'text'; value: string } | { type: 'boolean'; value: boolean } | { type: 'enum'; value: string } | { type: 'date'; value: string };
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
const routed = (g: { failing: string[]; pending: string[] }, codes: string[]) =>
  [...g.failing, ...g.pending].filter((x) => codes.some((c) => x === c || x.startsWith(`${c}<`))).sort();

/** The truthful Forscheln answers on the routed sheets. */
/** The truthful Forscheln answers on the routed sheets (no driver — those exist only after the block). */
async function fillForscheln(p: Proj) {
  await save(p, '820-2-09', { qs_plan_lph8_present: b(false) });
  await save(p, '820-2-17', { eignungskriterien_set: b(false), nebenangebote_conditions: b(false) });
  await save(p, '820-2-18', { rahmenterminplan_attached: b(false), testbetrieb_vs_abnahme_choice: e('abnahmepruefung') });
  await save(p, '820-2-20', { quality_supervision_active: b(false), bauueberwachung_competencies: b(false) });
  await save(p, '820-2-22', { testbetrieb_planned: b(false), abnahme_per_bild4: b(true), testbetrieb_documentation_precondition: b(true) });
  await save(p, '820-2-24', { defect_tracking_active: b(false) });
}

let PRE: TableDump;
let forschelnBefore: Proj;

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-2-structure@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820-2 structure harness', ${'m820-2-str-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${USER_ID}, 'owner')`;
  await seed();
  await runFile(REGISTERS); // earlier in the apply order
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
}, 180_000);

afterAll(async () => {
  await harness?.stop();
});


describe('DWA-M 820-2 structure block — staged block on embedded Postgres (after the registers block)', () => {
  it('a. pre-state (post-registers): nothing of the block; BROKEN BEFORE — the truthful Forscheln answers block REQ-38 / -39 / -41 / -46', async () => {
    expect(await archiveCounts()).toEqual({ gates: null, fields: null });
    const [c] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM fields WHERE symbol IN ${harness.sql(NEW_SYMBOLS)}`;
    expect(c.n).toBe(0);
    const [r9] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM compliance_requirements WHERE code = 'REQ-09-2'`;
    expect(r9.n).toBe(1); // the registers block is in
    forschelnBefore = await makeProject('forscheln-before');
    await fillForscheln(forschelnBefore);
    const before: Record<string, string[]> = {};
    for (const ws of ['820-2-17', '820-2-18', '820-2-22']) {
      const g = await gate(forschelnBefore, ws);
      before[ws] = [...g.failing, ...g.pending];
    }
    log('Forscheln BEFORE the block (failing + pending per sheet)', before);
    expect(before['820-2-17']).toEqual(expect.arrayContaining(['REQ-38', 'REQ-39']));
    expect(before['820-2-18']).toContain('REQ-41');
    expect(before['820-2-22']).toContain('REQ-46');
    PRE = await dump();
    log('PRE digest (post-registers)', digest(PRE));
  });

  it('b. apply: 18 gates re-written + REQ-52-2, 10 new fields, 15 sections, 12 visible_when; archives filled', async () => {
    await runFile(MIGRATION);
    const gates = await harness.sql<{ code: string; ws: string; severity: string; condition: string }[]>`
      SELECT cr.code, w.code AS ws, cr.severity, cr.condition FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
      WHERE cr.code IN ${harness.sql([...CODES, 'REQ-52-2'])} ORDER BY cr.code`;
    log('gates after apply', gates.map((g) => `${g.code}@${g.ws}/${g.severity}: ${g.condition}`));
    expect(gates).toHaveLength(19);
    const preGates = new Map(PRE.compliance_requirements.map((r) => JSON.parse(r) as { code: string; severity: string; condition: string }).map((g) => [g.code, g]));
    for (const g of gates.filter((x) => x.code !== 'REQ-52-2')) {
      expect(g.severity, g.code).toBe(preGates.get(g.code)!.severity); // no severity change
      expect(g.condition, g.code).not.toBe(preGates.get(g.code)!.condition);
    }
    expect(gates.find((g) => g.code === 'REQ-52-2')).toMatchObject({ ws: '820-2-24', severity: 'block' });
    for (const c of ['REQ-21', 'REQ-22', 'REQ-23']) { // untouched
      const [g] = await harness.sql<{ condition: string }[]>`SELECT condition FROM compliance_requirements WHERE code = ${c}`;
      expect(g.condition, c).toBe(preGates.get(c)!.condition);
    }
    const nf = await harness.sql<{ ws: string; symbol: string; dt: string; req: boolean; section: string }[]>`
      SELECT w.code AS ws, f.symbol, f.data_type AS dt, f.is_required AS req, s.code AS section FROM fields f
      JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN worksheet_sections s ON s.id = f.section_id
      WHERE f.symbol IN ${harness.sql(NEW_SYMBOLS)} ORDER BY 1, 2`;
    log('new fields', nf.map((f) => `${f.ws}:${f.symbol}:${f.dt}:${f.req}:${f.section}`));
    expect(nf.map((f) => `${f.ws}:${f.symbol}:${f.dt}:${f.req}:${f.section}`)).toEqual([
      '820-2-01:verantwortung_lph0:enum:true:B', '820-2-01:verantwortung_lph8:enum:true:B', '820-2-01:verantwortung_lph9:enum:true:B',
      '820-2-05:betrieb_frueh_eingebunden:boolean:false:C', '820-2-08:kostenhinweise_auftragnehmer:boolean:false:C', '820-2-08:kostenziele_aenderungsprozess:boolean:false:C',
      '820-2-17:bauleistungen_vergeben:boolean:true:B', '820-2-21:aenderungsmanagement_gefuehrt:boolean:false:C', '820-2-22:inbetriebnahme_organisiert:boolean:false:C',
      '820-2-24:verantwortlich_lph9_name:text:false:B']);
    const [nosec] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM fields f WHERE f.active AND f.section_id IS NULL`;
    log('active fields without a section after apply (whole standard)', nosec.n);
    expect(nosec.n).toBe(0);
    const [hip] = await harness.sql<{ cw: string[] }[]>`SELECT consumer_worksheets AS cw FROM fields WHERE symbol = 'included_hoai_phases'`;
    expect(hip.cw).toEqual(['820-2-03', '820-2-15', '820-2-19']); // not touched any more (review round 1)
    log('archives', await archiveCounts());
    expect(await archiveCounts()).toEqual({ gates: 18, fields: 22 });
    log('apply diff (rows changed/added)', dumpDiff(PRE, await dump()).length);
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

  it('d. rollback: byte-equal to the post-registers state, archives emptied; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    const diff = dumpDiff(PRE, after);
    log('rollback diff vs post-registers', diff);
    log('rollback digest', digest(after));
    expect(diff).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await archiveCounts()).toEqual({ gates: 0, fields: 0 });
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('d2. the read-back file runs before and after an apply and shows the expected values', async () => {
    const stmts = splitOnUnquotedSemicolons(readFileSync(READBACK, 'utf8')).filter((s) => s.trim());
    expect(stmts).toHaveLength(10);
    // prod-query.mjs splits on `;` + newline — the same split must give the same 10 statements
    expect(readFileSync(READBACK, 'utf8').split(/;\s*(?:\n|$)/).filter((s) => s.replace(/--.*$/gm, '').trim())).toHaveLength(10);
    const pre: unknown[][] = [];
    for (const st of stmts.slice(0, 3)) pre.push([...(await harness.sql.unsafe(st))]);
    log('read-back R0a..R0c (before)', pre.map((r) => r.map((row) => JSON.stringify(row).slice(0, 160))));
    expect(pre[0]).toHaveLength(18);
    expect((pre[0] as Array<{ live_ok: boolean }>).every((r) => r.live_ok)).toBe(true);
    expect(pre[2][0]).toEqual({ new_fields: '0', sectionless: '15', new_gate: '0' });
    await runFile(MIGRATION);
    const res: unknown[][] = [];
    for (const st of stmts) res.push([...(await harness.sql.unsafe(st))]);
    log('read-back R0..R7 (after)', res.map((r) => r.map((row) => JSON.stringify(row).slice(0, 220))));
    expect(res[2][0]).toEqual({ new_fields: '10', sectionless: '0', new_gate: '1' });
    expect(res[3]).toHaveLength(19);
    expect((res[3] as Array<{ cond_ok: boolean }>).every((r) => r.cond_ok)).toBe(true);
    expect((res[3] as Array<{ severity: string }>).filter((r) => r.severity === 'block')).toHaveLength(10);
    expect(res[4]).toHaveLength(10);
    expect((res[5] as Array<{ section: string }>).every((r) => r.section === 'C')).toBe(true);
    expect(res[6]).toHaveLength(12);
    expect(Number((res[8][0] as { gate_archive: string }).gate_archive)).toBe(18);
    expect(Number((res[8][0] as { field_archive: string }).field_archive)).toBe(22);
    expect(res[9]).toEqual([]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('e. re-apply, then the REAL saveWorksheet + checkApprovalGate — Forscheln (client self-build, LPH 9 GAP), public external supervisor, concept project, unanswered drivers', async () => {
    await runFile(MIGRATION);
    const ROUTED = ['REQ-19', 'REQ-38', 'REQ-39', 'REQ-40', 'REQ-41', 'REQ-43', 'REQ-44', 'REQ-46', 'REQ-51', 'REQ-52', 'REQ-52-2'];
    const SHEETS = ['820-2-09', '820-2-17', '820-2-18', '820-2-19', '820-2-20', '820-2-22', '820-2-24'];
    const perSheet = async (p: Proj) => {
      const out: Record<string, { routed: string[]; missing: string[] }> = {};
      for (const ws of SHEETS) { const g = await gate(p, ws); out[ws] = { routed: routed(g, ROUTED), missing: g.missing }; }
      return out;
    };

    // Forscheln — the project saved BEFORE the block: the new questions wait first (I-2: no silent pass)
    const f = forschelnBefore;
    const waiting = await perSheet(f);
    log('Forscheln after apply, drivers NOT answered yet', waiting);
    expect(waiting['820-2-17'].routed).toEqual(['REQ-38<bauleistungen_vergeben>', 'REQ-39<bauleistungen_vergeben>']);
    expect(waiting['820-2-09'].routed).toEqual(['REQ-19<verantwortung_lph8@820-2-01>']);
    expect(waiting['820-2-20'].routed).toEqual(['REQ-43<verantwortung_lph8@820-2-01>', 'REQ-44<verantwortung_lph8@820-2-01>']);
    expect(waiting['820-2-24'].routed).toEqual(['REQ-51<verantwortung_lph9@820-2-01>', 'REQ-52-2<verantwortung_lph9@820-2-01>', 'REQ-52<verantwortung_lph9@820-2-01>']);

    // answers per the records: construction in Eigenleistung (No award); LPH 8 = the client herself (C1 v1.6 "Planning only — no site
    // supervision, no construction"; BA-00 v1.6 executing party "The client in Eigenleistung"); LPH 0 = TEST value auftragnehmer
    // (EKOWAI's design concept, routes nothing); LPH 9 = GAP — the records name no party for the warranty follow-up → left blank.
    await save(f, '820-2-17', { bauleistungen_vergeben: b(false) });
    await save(f, '820-2-01', { verantwortung_lph0: e('auftragnehmer'), verantwortung_lph8: e('auftraggeber') });
    const after = await perSheet(f);
    log('Forscheln AFTER (LPH 8 = auftraggeber, LPH 9 GAP, Eigenleistung)', after);
    expect(after['820-2-17'].routed).toEqual([]);
    expect(after['820-2-18'].routed).toEqual([]);
    expect(after['820-2-22'].routed).toEqual([]);
    expect(after['820-2-19'].missing.filter((s) => ['vergabeverfahren_used', 'auswahlentscheidung_dokumentiert', 'zuschlag_erteilt_datum', 'final_contract_value', 'vergabesumme_summary_date'].includes(s))).toEqual([]);
    expect(after['820-2-18'].missing).not.toContain('leistungsbeschreibung_type');
    // LPH 8 by the client: judged on the client's documentation — with "No" the gates BLOCK; REQ-44 (external supervisor) is off
    expect(after['820-2-09'].routed).toEqual(['REQ-19']);
    expect(after['820-2-20'].routed).toEqual(['REQ-43']);
    expect(after['820-2-20'].missing).not.toContain('bauueberwachung_competencies'); // hidden for a client supervisor
    // LPH 9 GAP: everything waits for the owner's answer
    expect(after['820-2-24'].routed).toEqual(['REQ-51<verantwortung_lph9@820-2-01>', 'REQ-52-2<verantwortung_lph9@820-2-01>', 'REQ-52<verantwortung_lph9@820-2-01>']);
    // both ways for the client supervisor: if the owner accepts the BA-00 hold points as the client's QA plan / supervision → passes
    await save(f, '820-2-09', { qs_plan_lph8_present: b(true) });
    await save(f, '820-2-20', { quality_supervision_active: b(true) });
    expect((await gate(f, '820-2-09')).failing).not.toContain('REQ-19');
    expect(routed(await gate(f, '820-2-20'), ROUTED)).toEqual([]);
    // variant: LPH 9 answered "client herself" but no named party, no defect tracking, no dates → all three block
    await save(f, '820-2-01', { verantwortung_lph9: e('auftraggeber') });
    const g24 = await gate(f, '820-2-24');
    log('Forscheln variant LPH 9 = auftraggeber, nothing documented', g24);
    expect(routed(g24, ROUTED)).toEqual(['REQ-51<warranty_start_date,warranty_end_date>', 'REQ-52', 'REQ-52-2<verantwortlich_lph9_name>']);
    await save(f, '820-2-24', { verantwortlich_lph9_name: { type: 'text', value: 'Auftraggeberin (Inhaberin), Pflege nach Pflegeplan' } });
    expect(routed(await gate(f, '820-2-24'), ['REQ-52-2'])).toEqual([]);

    // Public — external supervisor (auftragnehmer), LPH 9 by the contractor, award, Testbetrieb, every routed input violating
    const p = await makeProject('public-external');
    await save(p, '820-2-01', { verantwortung_lph0: e('auftraggeber'), verantwortung_lph8: e('auftragnehmer'), verantwortung_lph9: e('auftragnehmer') });
    await save(p, '820-2-09', { qs_plan_lph8_present: b(false) });
    await save(p, '820-2-17', { bauleistungen_vergeben: b(true), eignungskriterien_set: b(false), nebenangebote_conditions: b(false) });
    await save(p, '820-2-18', { rahmenterminplan_attached: b(false), testbetrieb_vs_abnahme_choice: e('testbetrieb') });
    await save(p, '820-2-20', { quality_supervision_active: b(false), bauueberwachung_competencies: b(false) });
    await save(p, '820-2-22', { testbetrieb_planned: b(false) });
    await save(p, '820-2-24', { defect_tracking_active: b(false) });
    const pub = Object.fromEntries(Object.entries(await perSheet(p)).map(([ws, v]) => [ws, v.routed]));
    log('Public external supervisor, violating (routed gates per sheet)', pub);
    expect(pub).toEqual({
      '820-2-09': ['REQ-19'], '820-2-17': ['REQ-38', 'REQ-39'], '820-2-18': ['REQ-41'], '820-2-19': [], '820-2-20': ['REQ-43', 'REQ-44'], '820-2-22': ['REQ-46'],
      '820-2-24': ['REQ-51<warranty_start_date,warranty_end_date>', 'REQ-52', 'REQ-52-2<verantwortlich_lph9_name>'],
    });
    expect((await gate(p, '820-2-18')).missing).toContain('leistungsbeschreibung_type'); // visible again with an award

    // Concept-only project: LPH 8 / 9 entfaellt → the phase checks are off and their required inputs hidden
    const k = await makeProject('concept-only');
    await save(k, '820-2-01', { verantwortung_lph0: e('auftragnehmer'), verantwortung_lph8: e('entfaellt'), verantwortung_lph9: e('entfaellt') });
    const g20 = await gate(k, '820-2-20'); const g24k = await gate(k, '820-2-24'); const g09 = await gate(k, '820-2-09');
    log('concept-only -09 / -20 / -24', { g09, g20, g24k });
    expect([routed(g09, ROUTED), routed(g20, ROUTED), routed(g24k, ROUTED)]).toEqual([[], [], []]);
    expect(g24k.missing.filter((s) => ['warranty_start_date', 'warranty_end_date', 'defect_tracking_active'].includes(s))).toEqual([]);
    expect(g20.missing.filter((s) => ['quality_supervision_active', 'bauueberwachung_competencies'].includes(s))).toEqual([]);
    expect(g09.missing).not.toContain('qs_plan_lph8_present');

    // REQ-46 with the printed alternative "Abnahmeprüfung ohne Testbetrieb" on the public project: passes; mischform: blocks
    await save(p, '820-2-18', { testbetrieb_vs_abnahme_choice: e('abnahmepruefung') });
    expect(routed(await gate(p, '820-2-22'), ['REQ-46'])).toEqual([]);
    await save(p, '820-2-18', { testbetrieb_vs_abnahme_choice: e('mischform') });
    expect(routed(await gate(p, '820-2-22'), ['REQ-46'])).toEqual(['REQ-46']);
  });
});
