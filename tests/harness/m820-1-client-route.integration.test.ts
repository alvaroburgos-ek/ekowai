/**
 * DWA-M 820-1 client route — embedded-Postgres proof of the staged block
 *   scripts/migrations/20261005193000_m820_1_client_route.sql
 *   scripts/rollback-20261005193000-m820-1-client-route.sql
 * (apply order + read-back: vault 01-Projects/ekowai-wizard/m820-wizard-test/15_APPLY-ORDER-m820-1-client-route.md).
 *
 * Disposable embedded Postgres only (embedded-pg.ts, schema from the Drizzle model) — no prod, no .env.local.
 * Auth seam: BYPASS_AUTH + BYPASS_AUTH_USER_ID (as in tests/harness/fll-wave.integration.test.ts on
 * feat/fll-field-na-structure), so the REAL saveWorksheet / checkApprovalGate run their own access, visibility and gate code.
 *
 * SEED (pre-state):
 *   - tests/harness/m820-1-client-route.dump.json = byte copy (md5 cc04b95580431ee1d865f40f760672b5) of the vault file
 *     _baseline/2026-10-05_prod_DWA-M-820-1.encoding.json (read-only prod dump, dumped_at 2026-10-05T19:16:42Z): every
 *     worksheet, section, field (ids, enum_values, is_required, active, section, widget/ui_config/lookup, visible_when,
 *     verification_status, source_anchor) and gate (ids, conditions, severities) of DWA-M-820-1.
 *   - The dump carries no consumer_worksheets; they come from src/lib/eval/field-configs/m820_1.prior.json (read-only prod
 *     capture 2026-09-18; the Plan-3 go-live files 20260917101800/810/820 write no consumer_worksheets) — another
 *     session's capture (R-2), used as the closest pre-state. The migration appends only missing codes, so it is correct
 *     for any live array; the read-back R3 shows the live arrays before the owner applies.
 *   - fields.source_anchor is a prod column (key present on every dumped field) that the Drizzle model lacks; it is added
 *     here so the INSERT runs as on prod.
 *   - Equations and regulation tables are not seeded: the block touches neither, and no sheet the gates are driven on
 *     (M820-01, -04, -10, -12, -23) carries an equation.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startHarness, type Harness } from './embedded-pg';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import { conditionFromSql, splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008a1';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261005193000_m820_1_client_route.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261005193000-m820-1-client-route.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261005193000-m820-1-client-route.sql');
const log = (label: string, v: unknown) => console.log(`[M820-1 CLIENT-ROUTE] ${label}: ${JSON.stringify(v)}`);
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
  gates: Array<{ id: string; worksheet: string; code: string; title_de: string; title_en: string | null; description: string | null; suggestion: string | null; severity: string; condition: string; clause_reference: string | null }>;
};
const readJson = <T>(p: string): T => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8').replace(/^﻿/, '')) as T;

const GUARDED: Record<string, string> = {
  'M820-04 REQ-07': '2a0ff00c0efd0d54f3c34ff21b24c16d',
  'M820-10 REQ-08': '05c772bcfc41d111251f7aa2c900f845',
  'M820-12 REQ-10': '759e85932a46e82593a24a61c100ddc9',
  'M820-23 REQ-22': '7dedd983ac1ee5c379da759d5fbab75c',
  'M820-23 REQ-26': 'dda8ecb39354511117b4341ff7f427ce',
};
const G = "(client_organization_type != 'privat_ohne_foerderung' OR vergaberecht_freiwillig_angewendet == true)";
const VW_PUB = `${G} AND procurement_procedure == 'vgv_f'`;
const VW_STANDSTILL = `${G} AND threshold_status == 'oberschwellig'`;

let harness: Harness;
let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

async function seed(): Promise<void> {
  const sql = harness.sql;
  const d = readJson<Dump>('tests/harness/m820-1-client-route.dump.json');
  const prior = readJson<Record<string, { consumer_worksheets?: string[] | null }>>('src/lib/eval/field-configs/m820_1.prior.json');
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
  for (const g of d.gates) {
    await sql`INSERT INTO compliance_requirements (id, worksheet_template_id, code, title_de, title_en, condition, description, clause_reference, severity, suggestion)
              VALUES (${g.id}, ${tmpl.get(g.worksheet)!}, ${g.code}, ${g.title_de}, ${g.title_en}, ${g.condition}, ${g.description}, ${g.clause_reference}, ${g.severity}, ${g.suggestion})`;
  }
  log('seeded', { worksheets: d.worksheets.length, sections: d.sections.length, fields: d.fields.length, gates: d.gates.length });
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
    for (const r of a[t]) if (!sb.has(r)) d.push(`${t} - ${r.slice(0, 300)}`);
    for (const r of b[t]) if (!sa.has(r)) d.push(`${t} + ${r.slice(0, 300)}`);
  }
  return d;
}
const digest = (d: TableDump) => Object.fromEntries(TOUCHED.map((t) => [t, `${d[t].length} rows md5 ${md5(d[t].join('\n'))}`]));
/** Run a file exactly as the owner does: one session, the file's own BEGIN; … COMMIT;. */
async function runFile(path: string): Promise<void> {
  const conn = await harness.sql.reserve();
  try { await conn.unsafe(readFileSync(path, 'utf8')); } finally { conn.release(); }
}
async function archiveCounts(): Promise<{ gates: number | null; fields: number | null }> {
  const n = async (t: string) => {
    const [r] = await harness.sql<{ t: string | null }[]>`SELECT to_regclass(${'public.' + t})::text AS t`;
    if (!r.t) return null;
    const [c] = await harness.sql.unsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${t}`);
    return c.n;
  };
  return { gates: await n('compliance_requirements_archive_m820_1_client_route'), fields: await n('fields_archive_m820_1_client_route') };
}
async function gateMd5s(): Promise<Record<string, string>> {
  const rows = await harness.sql<{ key: string; md5: string }[]>`
    SELECT w.code || ' ' || cr.code AS key, md5(cr.condition) AS md5
    FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
    WHERE (w.code || ' ' || cr.code) IN ${harness.sql(Object.keys(GUARDED))} ORDER BY 1`;
  return Object.fromEntries(rows.map((r) => [r.key, r.md5]));
}
type FRow = { ws: string; symbol: string; is_required: boolean; visible_when: string | null; consumer_worksheets: string[] | null; enum_values: Array<{ value: string }> | null; section_id: string | null };
async function fieldRow(ws: string, symbol: string): Promise<FRow | undefined> {
  const [r] = await harness.sql<FRow[]>`
    SELECT w.code AS ws, f.symbol, f.is_required, f.visible_when, f.consumer_worksheets, f.enum_values, f.section_id
    FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id WHERE w.code = ${ws} AND f.symbol = ${symbol}`;
  return r;
}

// ── project fixture for the approval cases ───────────────────────────────────
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
type V = { type: 'number'; value: number } | { type: 'boolean'; value: boolean } | { type: 'enum'; value: string };
const en = (value: string): V => ({ type: 'enum', value });
const bo = (value: boolean): V => ({ type: 'boolean', value });
const nu = (value: number): V => ({ type: 'number', value });
async function save(p: Proj, ws: string, vals: Record<string, V>) {
  const ids = await harness.sql<{ id: string; symbol: string }[]>`
    SELECT f.id, f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
    WHERE w.code = ${ws} AND f.symbol IN ${harness.sql(Object.keys(vals))}`;
  expect(ids.length, `${ws} fields ${Object.keys(vals)}`).toBe(Object.keys(vals).length);
  const values = Object.fromEntries(ids.map((f) => [f.id, vals[f.symbol]]));
  const r = await saveWorksheet({ instanceId: p.inst.get(ws)!, values });
  expect(r.ok, `${ws} save ${JSON.stringify(r)}`).toBe(true);
}
async function gate(p: Proj, ws: string) {
  const g = await checkApprovalGate(p.inst.get(ws)!);
  return {
    failing: g.failingBlockConditions.map((c) => c.code).sort(),
    pending: g.pendingBlockConditions.map((c) => `${c.code}<${c.missingInputs.map((m) => m.symbol).join(',')}>`).sort(),
    missing: g.missingRequiredFields.map((f) => f.symbol).sort(),
  };
}
const GUARDED_CODES = ['REQ-07', 'REQ-08', 'REQ-10', 'REQ-22', 'REQ-26'];
const touchesGuarded = (g: { failing: string[]; pending: string[] }) =>
  [...g.failing, ...g.pending.map((p) => p.split('<')[0])].filter((c) => GUARDED_CODES.includes(c)).sort();

/** One project = one client situation; the same procurement facts (violating every guarded body) on every project. */
async function driveClient(name: string, client: Record<string, V>) {
  const p = await makeProject(name);
  await save(p, 'M820-01', client);
  await save(p, 'M820-09', { threshold_status: en('oberschwellig'), oberschwellig_check: bo(true), eu_threshold_value: nu(214000) });
  await save(p, 'M820-01', { estimated_engineering_fee: nu(250000) });
  await save(p, 'M820-10', { procurement_procedure: en('vgv_f') });
  await save(p, 'M820-12', { exclusion_123_gwb_checked: bo(false) });
  await save(p, 'M820-23', { information_letters_sent: bo(false), contract_invalidity_135_gwb_risk: bo(true), electronic_transmission: bo(true) });
  return p;
}

let PRE: TableDump;

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-client-route@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820 client route harness', ${'m820-cr-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${USER_ID}, 'owner')`;
  await seed();

  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
}, 180_000);

afterAll(async () => {
  await harness?.stop();
});

describe('DWA-M 820-1 client route — staged block on embedded Postgres', () => {
  it('a. pre-state: guarded md5s = the dump, six client tokens, no decision field, no archive', async () => {
    expect(await gateMd5s()).toEqual(GUARDED);
    const cot = await fieldRow('M820-01', 'client_organization_type');
    log('pre client_organization_type', { tokens: cot?.enum_values?.map((e) => e.value), consumers: cot?.consumer_worksheets });
    expect(cot?.enum_values?.map((e) => e.value)).toEqual(['municipality', 'utility', 'association', 'bundesbehoerde', 'sonstige_auftraggeber', 'other']);
    expect(await fieldRow('M820-01', 'vergaberecht_freiwillig_angewendet')).toBeUndefined();
    log('pre consumers', {
      procurement_procedure: (await fieldRow('M820-10', 'procurement_procedure'))?.consumer_worksheets,
      threshold_status: (await fieldRow('M820-09', 'threshold_status'))?.consumer_worksheets,
    });
    expect(await archiveCounts()).toEqual({ gates: null, fields: null });
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: tokens, decision field, consumer reach, five guarded gates, three visible_when rules', async () => {
    await runFile(MIGRATION);
    const cot = await fieldRow('M820-01', 'client_organization_type');
    expect(cot?.enum_values?.map((e) => e.value)).toEqual(['municipality', 'utility', 'association', 'bundesbehoerde', 'sonstige_auftraggeber', 'other', 'privat_ohne_foerderung', 'privat_mit_foerderung']);
    expect(cot?.consumer_worksheets).toEqual(['M820-08', 'M820-09', 'M820-04', 'M820-10', 'M820-12', 'M820-17', 'M820-23']);
    const v = await fieldRow('M820-01', 'vergaberecht_freiwillig_angewendet');
    log('decision field', v);
    expect(v).toMatchObject({ is_required: true, visible_when: "client_organization_type == 'privat_ohne_foerderung'", section_id: cot?.section_id,
      consumer_worksheets: ['M820-04', 'M820-08', 'M820-09', 'M820-10', 'M820-12', 'M820-17', 'M820-23'] });
    expect((await fieldRow('M820-10', 'procurement_procedure'))?.consumer_worksheets).toEqual(['M820-11', 'M820-16', 'M820-17', 'M820-18', 'M820-19', 'M820-12']);
    expect((await fieldRow('M820-09', 'threshold_status'))?.consumer_worksheets).toEqual(['M820-10', 'M820-11', 'M820-12', 'M820-17', 'M820-04', 'M820-23']);
    expect((await fieldRow('M820-17', 'publication_date'))?.visible_when).toBe(VW_PUB);
    for (const s of ['required_standstill_days', 'standstill_period_days']) {
      expect((await fieldRow('M820-23', s))?.visible_when, s).toBe(VW_STANDSTILL);
    }
    const conds = await harness.sql<{ code: string; condition: string }[]>`
      SELECT cr.code, cr.condition FROM compliance_requirements cr WHERE cr.code IN ${harness.sql(GUARDED_CODES)} ORDER BY 1`;
    for (const c of conds) expect(c.condition, c.code).toBe(conditionFromSql(MIGRATION, c.code));
    // the post-apply md5s the read-back file (R4) expects
    expect(await gateMd5s()).toEqual({
      'M820-04 REQ-07': '4d24b0248a3353ee098e079f2a7749b0', 'M820-10 REQ-08': '094314327fc9edb2e6f3dfe37bb1f218',
      'M820-12 REQ-10': '94c9cc67f87fa3416961a6afca0cd315', 'M820-23 REQ-22': 'a3d7e2430a028e455f7bab44438c3c94',
      'M820-23 REQ-26': '471a80a40ed8345f2d0fe634e846c5bc',
    });
    log('archive after apply', await archiveCounts());
    expect(await archiveCounts()).toEqual({ gates: 5, fields: 6 });
    const post = await dump();
    log('apply diff (rows changed/added)', dumpDiff(PRE, post).length);
  });

  it('c. apply again: 0 changes (full dump compare), archive unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    const after = await dump();
    const diff = dumpDiff(before, after);
    log('re-apply diff', diff);
    expect(diff).toEqual([]);
    expect(await archiveCounts()).toEqual({ gates: 5, fields: 6 });
  });

  it('d. rollback: byte-equal to the seed, archive emptied', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    const diff = dumpDiff(PRE, after);
    log('rollback diff vs seed', diff);
    log('rollback digest', digest(after));
    expect(diff).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await archiveCounts()).toEqual({ gates: 0, fields: 0 });
    await runFile(ROLLBACK); // a second rollback is a no-op
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('d2. the read-back file runs after an apply and shows the expected values (R0 … R7)', async () => {
    await runFile(MIGRATION);
    const stmts = splitOnUnquotedSemicolons(readFileSync(READBACK, 'utf8')).filter((s) => s.trim());
    expect(stmts).toHaveLength(9);
    const res: unknown[][] = [];
    for (const st of stmts) res.push([...(await harness.sql.unsafe(st))]);
    log('read-back R0..R7', res.map((r) => r.map((row) => JSON.stringify(row).slice(0, 260))));
    log('R0b blank client type (seeded projects: none)', res[1]);
    expect((res[2][0] as { tokens: string }).tokens).toBe('municipality,utility,association,bundesbehoerde,sonstige_auftraggeber,other,privat_ohne_foerderung,privat_mit_foerderung');
    expect(res[3][0]).toMatchObject({ data_type: 'boolean', is_required: true, active: true, same_section: true });
    expect(res[6].map((r) => `${(r as { symbol: string }).symbol} ${(r as { md5: string }).md5}`)).toEqual([
      'publication_date a89b0fa9514a3df2ffa9e1e69d71bbde', 'required_standstill_days 11d2d717f0a9371acb4b922a8187551a',
      'standstill_period_days 11d2d717f0a9371acb4b922a8187551a']);
    expect(res[8].map((r) => Number((r as { n: string }).n))).toEqual([5, 6]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('e. re-apply, then the REAL approval gate per client (identical violating procurement facts on every project)', async () => {
    await runFile(MIGRATION);
    expect(await archiveCounts()).toEqual({ gates: 5, fields: 6 });

    // (b) public client above the threshold: the original bodies decide → blocked with the gate codes
    const pub = await driveClient('public', { client_organization_type: en('municipality') });
    // (c) private + voluntary Yes: exactly like the public client
    const yes = await driveClient('private-yes', { client_organization_type: en('privat_ohne_foerderung'), vergaberecht_freiwillig_angewendet: bo(true) });
    // private WITH funding: bound by procurement law (§ 7.2) → like public
    const funded = await driveClient('private-funded', { client_organization_type: en('privat_mit_foerderung') });
    // (a) private without funding, No → not blocked by the guarded gates
    const no = await driveClient('private-no', { client_organization_type: en('privat_ohne_foerderung'), vergaberecht_freiwillig_angewendet: bo(false) });
    // private without funding, decision not entered → pending (blocks, names the missing input), never a silent pass
    const open = await driveClient('private-unanswered', { client_organization_type: en('privat_ohne_foerderung') });

    const out: Record<string, Record<string, ReturnType<typeof touchesGuarded>>> = {};
    const raw: Record<string, unknown> = {};
    for (const [name, p] of Object.entries({ pub, yes, funded, no, open })) {
      out[name] = {};
      for (const ws of ['M820-04', 'M820-10', 'M820-12', 'M820-23']) {
        const g = await gate(p, ws);
        raw[`${name} ${ws}`] = g;
        out[name][ws] = touchesGuarded(g);
      }
    }
    log('approval gate (raw)', raw);
    log('guarded codes blocking (failing or pending)', out);

    for (const name of ['pub', 'yes', 'funded']) {
      expect(raw[`${name} M820-12`], name).toMatchObject({ failing: expect.arrayContaining(['REQ-10']) });
      expect(raw[`${name} M820-23`], name).toMatchObject({ failing: expect.arrayContaining(['REQ-22', 'REQ-26']) });
    }
    for (const ws of ['M820-04', 'M820-10', 'M820-12', 'M820-23']) expect(out.no[ws], `private-no ${ws}`).toEqual([]);
    expect((raw['open M820-12'] as { pending: string[] }).pending).toContain('REQ-10<vergaberecht_freiwillig_angewendet>');
    expect((raw['open M820-23'] as { pending: string[] }).pending).toEqual(expect.arrayContaining([
      'REQ-22<vergaberecht_freiwillig_angewendet>', 'REQ-26<vergaberecht_freiwillig_angewendet>']));
    expect(out.open['M820-12']).toEqual(['REQ-10']);

    // M820-01: the decision is required only when shown
    const m01 = { pub: await gate(pub, 'M820-01'), no: await gate(no, 'M820-01'), open: await gate(open, 'M820-01') };
    log('M820-01 missing required (decision field)', Object.fromEntries(Object.entries(m01).map(([k, g]) => [k, g.missing.includes('vergaberecht_freiwillig_angewendet')])));
    expect(m01.pub.missing).not.toContain('vergaberecht_freiwillig_angewendet');
    expect(m01.no.missing).not.toContain('vergaberecht_freiwillig_angewendet');
    expect(m01.open.missing).toContain('vergaberecht_freiwillig_angewendet');

    // M820-23: the standstill fields are hidden (not required) for private-no, required for the public VgV-F project
    const m23 = { pub: (raw['pub M820-23'] as { missing: string[] }).missing, no: (raw['no M820-23'] as { missing: string[] }).missing };
    log('M820-23 missing required', m23);
    expect(m23.pub).toEqual(expect.arrayContaining(['required_standstill_days', 'standstill_period_days']));
    expect(m23.no).not.toContain('standstill_period_days');
    expect(m23.no).not.toContain('required_standstill_days');

    // public client below the threshold: REQ-22 / REQ-26 pass (no § 134 / § 135 duty), REQ-10 still decides in VgV-F
    await save(pub, 'M820-09', { threshold_status: en('unterschwellig'), oberschwellig_check: bo(false) });
    const below = await gate(pub, 'M820-23');
    log('public below threshold M820-23', below);
    expect(touchesGuarded(below)).toEqual([]);
    // and the passing side of the original bodies: public above the threshold with compliant inputs → not blocked
    await save(pub, 'M820-09', { threshold_status: en('oberschwellig'), oberschwellig_check: bo(true) });
    await save(pub, 'M820-12', { exclusion_123_gwb_checked: bo(true) });
    await save(pub, 'M820-23', { information_letters_sent: bo(true), contract_invalidity_135_gwb_risk: bo(false), standstill_period_days: nu(10) });
    const ok12 = await gate(pub, 'M820-12'); const ok23 = await gate(pub, 'M820-23');
    log('public above threshold, compliant', { 'M820-12': ok12, 'M820-23': ok23 });
    expect(touchesGuarded(ok12)).toEqual([]);
    expect(touchesGuarded(ok23)).toEqual([]);
  });

  it('f. review I-1: public client above the threshold with Direktvergabe, letters sent, no standstill days → BLOCKED by REQ-22', async () => {
    const p = await makeProject('public-direktvergabe-above');
    await save(p, 'M820-01', { client_organization_type: en('municipality'), estimated_engineering_fee: nu(250000) });
    await save(p, 'M820-09', { threshold_status: en('oberschwellig'), oberschwellig_check: bo(true), eu_threshold_value: nu(214000) });
    await save(p, 'M820-10', { procurement_procedure: en('direktvergabe') });
    await save(p, 'M820-23', { information_letters_sent: bo(true), contract_invalidity_135_gwb_risk: bo(false), electronic_transmission: bo(true) });
    const noDays = await gate(p, 'M820-23');
    log('I-1 public ober direktvergabe, no standstill days', noDays);
    expect(noDays.pending).toContain('REQ-22<standstill_period_days>');
    expect(noDays.missing).toEqual(expect.arrayContaining(['required_standstill_days', 'standstill_period_days']));
    await save(p, 'M820-23', { standstill_period_days: nu(5) });
    const short = await gate(p, 'M820-23');
    log('I-1 public ober direktvergabe, 5 days', short);
    expect(short.failing).toContain('REQ-22');
    await save(p, 'M820-23', { standstill_period_days: nu(10) });
    const enough = await gate(p, 'M820-23');
    log('I-1 public ober direktvergabe, 10 days', enough);
    expect(touchesGuarded(enough)).toEqual([]);
  });
});
