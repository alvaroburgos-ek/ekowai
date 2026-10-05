/**
 * DWA-M 820-2 registers — embedded-Postgres proof of the staged block
 *   scripts/migrations/20261005200000_m820_2_registers.sql
 *   scripts/rollback-20261005200000-m820-2-registers.sql
 *   scripts/verification/apply/readback-20261005200000-m820-2-registers.sql
 * (apply order: vault 01-Projects/ekowai-wizard/m820-wizard-test/16_APPLY-ORDER-m820-2-registers.md).
 *
 * Disposable embedded Postgres only (embedded-pg.ts, schema from the Drizzle model) — no prod, no .env.local.
 * Auth seam: BYPASS_AUTH + BYPASS_AUTH_USER_ID (as the m820-1 client-route harness), so the REAL saveWorksheet (incl. the
 * register materialiser that writes the counters) and the REAL checkApprovalGate run.
 *
 * SEED (pre-state):
 *   - tests/harness/m820-2-registers.dump.json = byte copy (md5 744f6883448a1877c322197122100a74) of the vault file
 *     _baseline/2026-10-05_prod_DWA-M-820-2.encoding.json (read-only prod dump, dumped_at 2026-10-05T19:16:43Z): every
 *     worksheet, section, field, equation (14) and gate of DWA-M-820-2.
 *   - consumer_worksheets from src/lib/eval/field-configs/m820_2.prior.json (read-only prod capture 2026-09-18, another
 *     session's capture — R-2, closest pre-state; the block writes no consumer arrays).
 *   - fields.source_anchor (prod column, not in the Drizzle model) added so the INSERTs run as on prod.
 *
 * FORSCHELN FACTS (short facts only, nothing uploaded; sources on this PC, Desktop\Blumen Forscheln):
 *   korrespondenz  — permit status notice to Paula / Ms Forscheln ("Notice_Paula_Permits_EN (2).md" /
 *                    "Mitteilung_Paula_Genehmigungen (2).md"; the notice carries no date — 26.08.2026 is the FILE date, not a
 *                    sent-stamp; channel not stated → "Sonstiges"; open follow-up = the client's building-authority enquiry
 *                    "before the liner is installed"); drawing Pond1_1-Modelo2 uploaded to the project 27.08.2026 (C1 v1.6
 *                    version table, row v1.2).
 *   change_orders  — change note A11 (A11-Change-Note-PRINT-EN.html: raised 07.09.2026, completed 08.09.2026 by EKOWAI;
 *                    "Position A rises by some 60 €", "Whole circuit, firm prices: 513,54 €"; client confirmation line blank on
 *                    the print → status offen); cost bearer = the client, who holds the procurement budget (C1 v1.6 §risk scope).
 *   statusberichte — C1 version table v1.3 29.08.2026 · v1.4 02.09.2026 · v1.5 07.09.2026 · v1.6 08.09.2026, author A.I.B.C.
 *   risk_register  — C1 v1.6 R-S2 (P 3, S 3), R-S4 (P 2, S 4), R-P2 (P 3, S 3); C1 "Adaptation 1 — single-perspective scoring",
 *                    so the rows are stored in the editor's single-value shape {probability, impact} (the editor shows them as
 *                    one value replicated to the three assessors, flagged — no invented per-assessor attribution).
 *   projektschritte— Arbeitplan and phases\arbeitsplan-P0-START-v1.md §3 Week 0: ST1, ST2, ST3 (status geplant, as planned).
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
import { normalizeMitigationCarrier } from '@/lib/eval/mitigation-plan';

const ROOT = resolve(__dirname, '../..');
const USER_ID = '00000000-0000-4000-8000-0000000008a2';
const MIGRATION = resolve(ROOT, 'scripts/migrations/20261005200000_m820_2_registers.sql');
const ROLLBACK = resolve(ROOT, 'scripts/rollback-20261005200000-m820-2-registers.sql');
const READBACK = resolve(ROOT, 'scripts/verification/apply/readback-20261005200000-m820-2-registers.sql');
const log = (label: string, v: unknown) => console.log(`[M820-2 REGISTERS] ${label}: ${JSON.stringify(v)}`);
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

const NEW_SYMBOLS = ['korrespondenz', 'korrespondenz_count', 'korrespondenz_nachverfolgung_offen', 'projektschritte', 'projektschritte_count',
  'projektschritte_offen', 'statusberichte', 'statusberichte_count', 'risiken_count', 'change_orders_ohne_ausloeser_kosten', 'risk_mitigation_plan'];
const NEW_EQS = ['820-2-03-D1', '820-2-03-D2', '820-2-05-D1', '820-2-05-D2', '820-2-06-D3', '820-2-10-D1', '820-2-21-D4'];

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
    for (const r of a[t]) if (!sb.has(r)) d.push(`${t} - ${r.slice(0, 300)}`);
    for (const r of b[t]) if (!sa.has(r)) d.push(`${t} + ${r.slice(0, 300)}`);
  }
  return d;
}
const digest = (d: TableDump) => Object.fromEntries(TOUCHED.map((t) => [t, `${d[t].length} rows md5 ${md5(d[t].join('\n'))}`]));
async function runFile(path: string): Promise<void> {
  const conn = await harness.sql.reserve();
  try { await conn.unsafe(readFileSync(path, 'utf8')); } finally { conn.release(); }
}
async function archiveCount(): Promise<number | null> {
  const [r] = await harness.sql<{ t: string | null }[]>`SELECT to_regclass('public.fields_archive_m820_2_registers')::text AS t`;
  if (!r.t) return null;
  const [c] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM fields_archive_m820_2_registers`;
  return c.n;
}
type FRow = { widget: string | null; ui_config: { columns?: Array<{ key: string }>; footer?: string[]; editor?: string } | null; section: string | null };
async function fieldRow(ws: string, symbol: string): Promise<FRow | undefined> {
  const [r] = await harness.sql<FRow[]>`
    SELECT f.widget, f.ui_config, s.code AS section FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
    LEFT JOIN worksheet_sections s ON s.id = f.section_id WHERE w.code = ${ws} AND f.symbol = ${symbol}`;
  return r;
}
const colKeys = (r: FRow | undefined) => r?.ui_config?.columns?.map((c) => c.key);

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
type V = { type: 'json'; value: unknown } | { type: 'boolean'; value: boolean };
const js = (rows: unknown[]): V => ({ type: 'json', value: { rows } });
async function save(p: Proj, ws: string, vals: Record<string, V>) {
  const ids = await harness.sql<{ id: string; symbol: string }[]>`
    SELECT f.id, f.symbol FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id
    WHERE w.code = ${ws} AND f.symbol IN ${harness.sql(Object.keys(vals))}`;
  expect(ids.length, `${ws} fields ${Object.keys(vals)}`).toBe(Object.keys(vals).length);
  const values = Object.fromEntries(ids.map((f) => [f.id, vals[f.symbol]]));
  const r = await saveWorksheet({ instanceId: p.inst.get(ws)!, values: values as never });
  expect(r.ok, `${ws} save ${JSON.stringify(r)}`).toBe(true);
}
async function param(p: Proj, ws: string, symbol: string) {
  const [r] = await harness.sql<{ value_number: string | null; value_json: unknown; source_type: string | null }[]>`
    SELECT pp.value_number, pp.value_json, pp.source_type FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
    JOIN worksheet_templates w ON w.id = f.worksheet_template_id
    WHERE pp.project_id = ${p.id} AND w.code = ${ws} AND f.symbol = ${symbol}`;
  return r;
}
const num = async (p: Proj, ws: string, symbol: string) => {
  const r = await param(p, ws, symbol);
  return r?.value_number == null ? null : Number(r.value_number);
};
async function gate(p: Proj, ws: string) {
  const g = await checkApprovalGate(p.inst.get(ws)!);
  return {
    failing: g.failingBlockConditions.map((c) => c.code).sort(),
    pending: g.pendingBlockConditions.map((c) => `${c.code}<${c.missingInputs.map((m) => m.symbol).join(',')}>`).sort(),
    missing: g.missingRequiredFields.map((f) => f.symbol).sort(),
  };
}

// ── Forscheln rows (short facts; see header) ─────────────────────────────────
const KORRESPONDENZ = [
  { id: 'k1', datum: '2026-08-26', richtung: 'gesendet', kanal: 'Sonstiges', von: 'EKOWAI (A. I. Burgos Cifuentes)', an: 'Paula Forscheln, Frau Forscheln',
    betreff: 'Kurzer Zwischenstand zu Genehmigungen · brief status update on permits (no building / water-law permit needed; confirmation on the earthworks recommended)',
    referenz: 'Notice_Paula_Permits_EN (2).md · Mitteilung_Paula_Genehmigungen (2).md (file date 26.08.2026)', nachverfolgung_noetig: true, faellig_am: '', erledigt: false },
  { id: 'k2', datum: '2026-08-27', richtung: 'empfangen', kanal: 'Portal/Plattform', von: '', an: 'EKOWAI',
    betreff: 'Zeichnung Pond1_1-Modelo2 (16.08.2026) ins Projekt hochgeladen · drawing uploaded to the project', referenz: 'C1 v1.6 version table, row v1.2',
    nachverfolgung_noetig: true, faellig_am: '', erledigt: true },
];
const A11 = {
  id: 'a11', aenderung: 'A11 — Entscheidungsrunde 07.–08.09.2026: routing B (no liner penetrations), closed rings, reversible manifold, flow meter branch A, nozzle 12 mm, hold point H6',
  datum: '2026-09-08', kosten_eur: null, terminwirkung: 'keine · no effect (A11 "Schedule. No effect.")', entscheidung: 'taken at the briefing; client confirmation line blank on the print', status: 'offen',
  ausloeser: 'Entscheidungsrunde 07.–08.09.2026, raised by EKOWAI (A. I. Burgos Cifuentes) — change note A11',
  kostenuebernahme: 'Auftraggeberin (holds the procurement budget, C1 v1.6) — Position A ca. +60 €, whole circuit 513,54 € firm prices',
};
const STATUS = [
  { id: 's1', nr: 1, datum: '2026-08-29', erstellt_von: 'A.I.B.C.', referenz: 'C1 Planungsbericht v1.3 consolidated (issued)' },
  { id: 's2', nr: 2, datum: '2026-09-02', erstellt_von: 'A.I.B.C.', referenz: 'C1 Planungsbericht v1.4 construction-stage (issued)' },
  { id: 's3', nr: 3, datum: '2026-09-07', erstellt_von: 'A.I.B.C.', referenz: 'C1 Planungsbericht v1.5 construction-stage (issued)' },
  { id: 's4', nr: 4, datum: '2026-09-08', erstellt_von: 'A.I.B.C.', referenz: 'C1 Planungsbericht v1.6 construction-stage (this issue)' },
];
const RISKS = { rows: [
  { id: 'R-S2', group: 'R-S Site-condition risks (C1)', risk: 'R-S2 Concentrated rainfall event exceeding 5-yr KOSTRA design depth', description: 'Overflow per KOSTRA-DWD-2020; ~1 cm design head at the notch, ~4 cm freeboard', probability: 3, impact: 3 },
  { id: 'R-S4', group: 'R-S Site-condition risks (C1)', risk: 'R-S4 Groundwater table rise above BÜK 50 Stufe 4 design assumption', description: 'Excavation 1,05 m above the 1,3–2,0 m envelope; dry excavation confirmed 30.08.2026', probability: 2, impact: 4 },
  { id: 'R-P2', group: 'R-P Procurement risks (C1)', risk: 'R-P2 VP-Mat-01 specified material substitution needed at procurement', description: 'Named substitute paths in the BoM; HDPE 1,0 mm liner widely available', probability: 3, impact: 3 },
] };
const STEPS = [
  { id: 'ST1', datum: '', schritt: 'ST1 Confirm the prod build carries the service features', verantwortlich: 'EKOWAI', ergebnis: '', nachweis_referenz: 'arbeitsplan-P0-START-v1.md §3', status: 'geplant' },
  { id: 'ST2', datum: '', schritt: 'ST2 Create the project "Blumen Forschel" in the Wizard', verantwortlich: 'EKOWAI', ergebnis: '', nachweis_referenz: 'arbeitsplan-P0-START-v1.md §3', status: 'geplant' },
  { id: 'ST3', datum: '', schritt: 'ST3 Apply the recommended structure (DWA-M-820 + DIN-276 layers)', verantwortlich: 'EKOWAI', ergebnis: '', nachweis_referenz: 'arbeitsplan-P0-START-v1.md §3', status: 'geplant' },
];

let PRE: TableDump;
let legacy: Proj;

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
  await sql`INSERT INTO profiles (id, email) VALUES (${USER_ID}, 'm820-2-registers@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('M820-2 registers harness', ${'m820-2-reg-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${USER_ID}, 'owner')`;
  await seed();

  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
}, 180_000);

afterAll(async () => {
  await harness?.stop();
});

describe('DWA-M 820-2 registers — staged block on embedded Postgres', () => {
  it('a. pre-state: no new field / equation / gate, change_orders 6 columns, risk_register widget NULL without section; a stored risk_register value (editor shape) exists', async () => {
    expect(await archiveCount()).toBeNull();
    const [c] = await harness.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM fields WHERE symbol IN ${harness.sql(NEW_SYMBOLS)}`;
    expect(c.n).toBe(0);
    expect(colKeys(await fieldRow('820-2-21', 'change_orders'))).toEqual(['aenderung', 'datum', 'kosten_eur', 'terminwirkung', 'entscheidung', 'status']);
    expect(await fieldRow('820-2-10', 'risk_register')).toEqual({ widget: null, ui_config: null, section: null });
    // a project that already holds a risk analysis in the editor's full shape (3 assessors) BEFORE the block
    legacy = await makeProject('legacy-risk-register');
    await save(legacy, '820-2-10', { risk_register: { type: 'json', value: { rows: [
      { id: 'x1', group: 'Umwelt, Ökologie', risk: 'Altlasten / Schadstoffe / Kampfmittel', description: '', migratedFromSingle: false,
        ratings: { bauherr: { probability: 9, impact: 5 }, planer: { probability: 9, impact: 5 }, betrieb: { probability: 10, impact: 5 } } },
    ] } } });
    PRE = await dump();
    log('PRE digest', digest(PRE));
  });

  it('b. apply: three registers + seven counters + seven equations + REQ-09-2; change_orders +2 columns; risk_register register/editor/section C', async () => {
    const legacyBefore = (await param(legacy, '820-2-10', 'risk_register'))?.value_json;
    await runFile(MIGRATION);
    for (const [ws, sym, cols] of [['820-2-03', 'korrespondenz', 10], ['820-2-05', 'projektschritte', 6], ['820-2-06', 'statusberichte', 12]] as const) {
      const r = await fieldRow(ws, sym);
      expect(r?.widget, sym).toBe('register');
      expect(r?.section, sym).toBe('C');
      expect(colKeys(r)?.length, sym).toBe(cols);
    }
    const derived = await harness.sql<{ symbol: string; widget: string; section: string }[]>`
      SELECT f.symbol, f.widget, s.code AS section FROM fields f JOIN worksheet_sections s ON s.id = f.section_id
      WHERE f.symbol IN ${harness.sql(NEW_SYMBOLS)} AND f.data_type = 'number' ORDER BY 1`;
    log('derived fields', derived);
    expect(derived.map((d) => `${d.symbol}:${d.widget}:${d.section}`)).toEqual(NEW_SYMBOLS.filter((s) => !['korrespondenz', 'projektschritte', 'statusberichte', 'risk_mitigation_plan'].includes(s)).sort().map((s) => `${s}:derived:D`));
    const eqs = await harness.sql<{ equation_number: string }[]>`SELECT equation_number FROM equations WHERE equation_number IN ${harness.sql(NEW_EQS)} ORDER BY 1`;
    expect(eqs.map((e) => e.equation_number)).toEqual([...NEW_EQS].sort());
    const [g] = await harness.sql<{ code: string; severity: string; condition: string; ws: string }[]>`
      SELECT cr.code, cr.severity, cr.condition, w.code AS ws FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id WHERE cr.code = 'REQ-09-2'`;
    expect(g).toEqual({ code: 'REQ-09-2', severity: 'block', condition: 'change_orders IS EMPTY OR change_orders_ohne_ausloeser_kosten == 0', ws: '820-2-21' });
    const co = await fieldRow('820-2-21', 'change_orders');
    expect(colKeys(co)).toEqual(['aenderung', 'datum', 'kosten_eur', 'terminwirkung', 'entscheidung', 'status', 'ausloeser', 'kostenuebernahme']);
    expect(co?.ui_config?.footer).toEqual(['change_orders_count', 'change_orders_sum', 'change_orders_open', 'change_orders_ohne_ausloeser_kosten']);
    const rr = await fieldRow('820-2-10', 'risk_register');
    expect({ widget: rr?.widget, editor: rr?.ui_config?.editor, section: rr?.section, keys: colKeys(rr) }).toEqual({ widget: 'register', editor: 'risk_register', section: 'C', keys: ['group', 'risk', 'description'] });
    expect(await archiveCount()).toBe(2);
    // the stored value of the legacy project is untouched by the apply
    expect((await param(legacy, '820-2-10', 'risk_register'))?.value_json).toEqual(legacyBefore);
    log('apply diff (rows changed/added)', dumpDiff(PRE, await dump()).length);
  });

  it('c. apply again: 0 changes (full dump compare), archive unchanged', async () => {
    const before = await dump();
    await runFile(MIGRATION);
    const diff = dumpDiff(before, await dump());
    log('re-apply diff', diff);
    expect(diff).toEqual([]);
    expect(await archiveCount()).toBe(2);
  });

  it('d. rollback: byte-equal to the seed (change_orders / risk_register configs restored exactly), archive emptied; second rollback no-op', async () => {
    await runFile(ROLLBACK);
    const after = await dump();
    const diff = dumpDiff(PRE, after);
    log('rollback diff vs seed', diff);
    log('rollback digest', digest(after));
    expect(diff).toEqual([]);
    expect(digest(after)).toEqual(digest(PRE));
    expect(await archiveCount()).toBe(0);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('d2. the read-back file runs before and after an apply and shows the expected values', async () => {
    const stmts = splitOnUnquotedSemicolons(readFileSync(READBACK, 'utf8')).filter((s) => s.trim());
    expect(stmts).toHaveLength(10);
    const pre: unknown[][] = [];
    for (const st of stmts.slice(0, 3)) pre.push([...(await harness.sql.unsafe(st))]);
    log('read-back R0a..R0c (before)', pre);
    expect(pre[2][0]).toEqual({ new_fields: '0', new_equations: '0', new_gates: '0' });
    expect(pre[1].map((r) => (r as { symbol: string; saved_values: string }).symbol + ':' + (r as { saved_values: string }).saved_values)).toEqual(['change_orders:0', 'risk_register:1']);
    await runFile(MIGRATION);
    const res: unknown[][] = [];
    for (const st of stmts) res.push([...(await harness.sql.unsafe(st))]);
    log('read-back R0..R7 (after)', res.map((r) => r.map((row) => JSON.stringify(row).slice(0, 220))));
    expect(res[3]).toHaveLength(11);
    expect(res[4]).toHaveLength(7);
    expect(res[5][0]).toMatchObject({ code: 'REQ-09-2', severity: 'block' });
    expect((res[6][0] as { column_keys: string }).column_keys).toBe('aenderung,datum,kosten_eur,terminwirkung,entscheidung,status,ausloeser,kostenuebernahme');
    expect(res[7][0]).toMatchObject({ widget: 'register', editor: 'risk_register', section: 'C', column_keys: 'group,risk,description' });
    expect(Number((res[8][0] as { n: string }).n)).toBe(2);
    expect(res[9]).toEqual([]);
    await runFile(ROLLBACK);
    expect(dumpDiff(PRE, await dump())).toEqual([]);
  });

  it('e. re-apply, then the REAL saveWorksheet + checkApprovalGate with Forscheln rows', async () => {
    await runFile(MIGRATION);
    const p = await makeProject('forscheln');

    // korrespondenz (820-2-03): permit notice (open follow-up) + drawing upload (followed up, done)
    await save(p, '820-2-03', { korrespondenz: js(KORRESPONDENZ) });
    const k = { count: await num(p, '820-2-03', 'korrespondenz_count'), open: await num(p, '820-2-03', 'korrespondenz_nachverfolgung_offen') };
    log('korrespondenz counters', k);
    expect(k).toEqual({ count: 2, open: 1 });
    expect((await param(p, '820-2-03', 'korrespondenz_count'))?.source_type).toBe('derived');
    const g03 = await gate(p, '820-2-03');
    log('820-2-03 gate', g03);
    expect(g03.missing.filter((s) => NEW_SYMBOLS.includes(s))).toEqual([]);

    // projektschritte (820-2-05): P0 Week-0 steps as planned
    await save(p, '820-2-05', { projektschritte: js(STEPS) });
    const ps = { count: await num(p, '820-2-05', 'projektschritte_count'), open: await num(p, '820-2-05', 'projektschritte_offen') };
    log('projektschritte counters', ps);
    expect(ps).toEqual({ count: 3, open: 3 });

    // statusberichte (820-2-06): C1 v1.3 … v1.6
    await save(p, '820-2-06', { statusberichte: js(STATUS) });
    const sb = await num(p, '820-2-06', 'statusberichte_count');
    log('statusberichte_count', sb);
    expect(sb).toBe(4);

    // risk_register (820-2-10): C1 R-S2, R-S4, R-P2 — the stored json comes back byte-equal, the counter reads 3
    await save(p, '820-2-10', { risk_register: { type: 'json', value: RISKS } });
    const rv = (await param(p, '820-2-10', 'risk_register'))?.value_json;
    expect(rv).toEqual(RISKS);
    const rc = await num(p, '820-2-10', 'risiken_count');
    log('risiken_count', rc);
    expect(rc).toBe(3);
    // review M-3: the Tab. A.2 measure plan for R-S2 (C1 v1.6 row R-S2: mitigation, residual, monitoring, plan — responsibility
    // not stated per row in C1, left blank) — stored byte-equal and read back by the editor's own parser unchanged
    const PLAN = { plans: [{ id: 'p-RS2', risiko: 'R-S2 Concentrated rainfall event exceeding 5-yr KOSTRA design depth', risikokategorie: 'R-S Site-condition risks (C1)', wert: 9,
      schaeden: 'over-spill beyond the design event; armoring displacement', gefaehrdungsbilder: 'concentrated rainfall beyond the 5-yr KOSTRA-DWD-2020 depth', bemerkung: 'C1 v1.6 risk register R-S2',
      measures: [
        { id: 'm1', type: 'T', text: 'Overflow dimensioned per KOSTRA-DWD-2020; FLL GA-RL §4.10 on-property infiltration pathway', verantwortung: '', durchfuehren: '', ueberwachung: '' },
        { id: 'm2', type: 'O', text: 'Post-event visual inspection of notch lip + overflow zone for >= 20 mm/day events; re-bed displaced stones', verantwortung: '', durchfuehren: '', ueberwachung: '' },
      ] }] };
    await save(p, '820-2-10', { risk_mitigation_plan: { type: 'json', value: PLAN } });
    const mpv = (await param(p, '820-2-10', 'risk_mitigation_plan'))?.value_json;
    expect(mpv).toEqual(PLAN);
    expect(normalizeMitigationCarrier(mpv)).toEqual(PLAN);
    const g10 = await gate(p, '820-2-10');
    log('820-2-10 gate after risk + measure plan', g10);
    expect(g10.missing).not.toContain('risk_mitigation_plan');
    // the project that held a full 3-assessor analysis before the apply. FINDING (saveWorksheet: the register materialiser
    // runs only when a register value is IN the save batch): saving another field leaves the counter unwritten (null);
    // the first save of the register itself (what the editor sends on any edit) writes it — the stored value unchanged.
    await save(legacy, '820-2-10', { risk_register_present: { type: 'boolean', value: true } });
    expect(await num(legacy, '820-2-10', 'risiken_count')).toBeNull();
    const legacyStored = (await param(legacy, '820-2-10', 'risk_register'))?.value_json;
    await save(legacy, '820-2-10', { risk_register: { type: 'json', value: legacyStored } });
    const legacyAfter = await param(legacy, '820-2-10', 'risk_register');
    log('legacy risk_register after re-save of the register', { count: await num(legacy, '820-2-10', 'risiken_count'), ratings: (legacyAfter?.value_json as { rows: Array<{ ratings: unknown }> }).rows[0].ratings });
    expect(await num(legacy, '820-2-10', 'risiken_count')).toBe(1);
    expect(legacyAfter?.value_json).toEqual(legacyStored);
    expect((legacyAfter?.value_json as { rows: Array<{ ratings: { betrieb: unknown } }> }).rows[0].ratings.betrieb).toEqual({ probability: 10, impact: 5 });

    // change_orders (820-2-21) + REQ-09-2: A11 with trigger and cost bearer → passes; the same row without Auslöser → blocked
    await save(p, '820-2-21', { change_orders: js([A11]) });
    const ok = { counter: await num(p, '820-2-21', 'change_orders_ohne_ausloeser_kosten'), gate: await gate(p, '820-2-21') };
    log('A11 complete', ok);
    expect(ok.counter).toBe(0);
    expect(ok.gate.failing).not.toContain('REQ-09-2');
    expect(ok.gate.pending.filter((x) => x.startsWith('REQ-09-2'))).toEqual([]);
    await save(p, '820-2-21', { change_orders: js([{ ...A11, ausloeser: '' }]) });
    const bad = { counter: await num(p, '820-2-21', 'change_orders_ohne_ausloeser_kosten'), gate: await gate(p, '820-2-21') };
    log('A11 without Auslöser', bad);
    expect(bad.counter).toBe(1);
    expect(bad.gate.failing).toContain('REQ-09-2');
    const req092 = (g: { failing: string[]; pending: string[] }) => [...g.failing, ...g.pending].filter((x) => x.startsWith('REQ-09-2'));
    // a project that never filled change_orders: REQ-09-2 passes (IS EMPTY arm) — nothing to document
    const fresh = await makeProject('fresh');
    const fg = await gate(fresh, '820-2-21');
    log('fresh 820-2-21 gate (never filled)', fg);
    expect(req092(fg)).toEqual([]);
    // an empty register saved: counter 0, passes
    await save(fresh, '820-2-21', { change_orders: js([]) });
    expect(await num(fresh, '820-2-21', 'change_orders_ohne_ausloeser_kosten')).toBe(0);
    expect(req092(await gate(fresh, '820-2-21'))).toEqual([]);
    // rows stored BEFORE the block (no counter written yet): pending, names the counter — never a silent pass
    const old = await makeProject('rows-before-block');
    await save(old, '820-2-21', { change_orders: js([{ id: 'o1', aenderung: 'earlier change', status: 'offen' }]) });
    await harness.sql`DELETE FROM project_parameters pp USING fields f WHERE pp.field_id = f.id AND pp.project_id = ${old.id} AND f.symbol = 'change_orders_ohne_ausloeser_kosten'`;
    const og = await gate(old, '820-2-21');
    log('rows stored, counter not yet written', og);
    expect(og.pending).toContain('REQ-09-2<change_orders_ohne_ausloeser_kosten>');
    // review I-1 / I-2: the post-apply step — recompute (the code behind the MCP tool recompute_worksheet) writes the counter
    // from the STORED rows without re-saving the register; a pre-existing row has no Auslöser / Kostenübernahme ('' = missing),
    // so REQ-09-2 then FAILS (approval refused) until both columns are filled — correct per § 4.3.7 "müssen".
    const { recomputeWorksheetEquations } = await import('@/lib/actions/recompute-worksheet');
    const rc21 = await recomputeWorksheetEquations(old.inst.get('820-2-21')!);
    log('recompute 820-2-21 (rows-before-block)', { written: rc21.written.map((w) => `${w.symbol}=${w.value}`), notComputed: rc21.notComputed.map((n) => n.equationNumber) });
    expect(await num(old, '820-2-21', 'change_orders_ohne_ausloeser_kosten')).toBe(1);
    const og2 = await gate(old, '820-2-21');
    log('rows stored, after recompute', og2);
    expect(og2.failing).toContain('REQ-09-2');
    // and the legacy 3-assessor risk project: recompute writes its counter too (no register save needed)
    const leg2 = await makeProject('legacy-risk-recompute');
    await save(leg2, '820-2-10', { risk_register: { type: 'json', value: (await param(legacy, '820-2-10', 'risk_register'))!.value_json } });
    await harness.sql`DELETE FROM project_parameters pp USING fields f WHERE pp.field_id = f.id AND pp.project_id = ${leg2.id} AND f.symbol = 'risiken_count'`; // = a value stored before the block
    expect(await num(leg2, '820-2-10', 'risiken_count')).toBeNull();
    await recomputeWorksheetEquations(leg2.inst.get('820-2-10')!);
    log('legacy risk recompute', { risiken_count: await num(leg2, '820-2-10', 'risiken_count') });
    expect(await num(leg2, '820-2-10', 'risiken_count')).toBe(1);
  });
});
