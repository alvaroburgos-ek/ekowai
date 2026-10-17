/**
 * DWA-M 820 case-C4 staged blocks — PRE-STATE = PROD proof + post-signature discovery (2026-10-17).
 *
 * The four staged blocks 20261015130000 / 140000 / 150000 / 160000 guard every UPDATE with a field signature that includes
 * md5(verification_quote). Their first sig0 were taken from the harness seed (2026-10-05 dumps + 19 prior M820 blocks), which has no
 * verification_quote column → prod read-back step 0 showed fields_pre 5/18, 8/18, 5/24, 26/91. This file proves the regenerated
 * blocks against the seed + the prod overlay (m820-prod-overlay.ts: verification_quote of all 729 active 820 fields as on prod
 * 2026-10-17, then all 729 signatures asserted equal to prod):
 *   a. overlay: 729 / 729 field signatures = prod.
 *   b. read-back R0 of each block at pre-state = what prod must show at step 0 (all fields_pre; 150000: 19 of 24 + f1_m820_24 0
 *      before 130000, 24 of 24 after it).
 *   c. apply 130000 → 150000, then 140000 and 160000; every touched field reaches sig1 (R0 *_post = all).
 * M820_PRESTATE_WRITE=1 writes the observed post signatures to scripts/verification/m820-c4-prestate/<block>.sig1.json (input of
 * regen.mjs); without it they must equal the committed files. Disposable embedded Postgres only — no prod, no .env.local.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startHarness, type Harness } from './embedded-pg';
import { applyM820ProdOverlay } from './m820-prod-overlay';
import { readbackRows } from '../../scripts/verification/m820-c4-prestate/regen.mjs';
import { splitOnUnquotedSemicolons } from '@/lib/compliance/__tests__/m820-1/sql-condition';

const ROOT = resolve(__dirname, '../..');
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
const log = (l: string, v: unknown) => console.log(l, JSON.stringify(v));
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
async function runFile(path: string): Promise<void> {
  const conn = await harness.sql.reserve();
  try { await conn.unsafe(readFileSync(path, 'utf8')); } catch (x) { await conn.unsafe('ROLLBACK'); throw x; } finally { conn.release(); }
}

const WRITE = process.env.M820_PRESTATE_WRITE === '1';
const B = {
  '130000': { std: 'DWA-M-820-1', mig: 'scripts/migrations/20261015130000_m820_1_c4_procurement_guards.sql', rb: 'scripts/verification/apply/readback-20261015130000-m820-1-c4-procurement-guards.sql' },
  '140000': { std: 'DWA-M-820-2', mig: 'scripts/migrations/20261015140000_m820_2_c4_phase_guards.sql', rb: 'scripts/verification/apply/readback-20261015140000-m820-2-c4-phase-guards.sql' },
  '150000': { std: 'DWA-M-820-1', mig: 'scripts/migrations/20261015150000_m820_1_c4_phase_drivers.sql', rb: 'scripts/verification/apply/readback-20261015150000-m820-1-c4-phase-drivers.sql' },
  '160000': { std: 'DWA-M-820-3', mig: 'scripts/migrations/20261015160000_m820_3_c4_qe_guards.sql', rb: 'scripts/verification/apply/readback-20261015160000-m820-3-c4-qe-guards.sql' },
} as const;
type K = keyof typeof B;
const r0 = async (b: K) => {
  const st = splitOnUnquotedSemicolons(readFileSync(resolve(ROOT, B[b].rb), 'utf8')).filter((s) => s.replace(/--.*$/gm, '').trim())[0];
  return [...(await harness.sql.unsafe(st))][0] as Record<string, string | null>;
};
async function postSigs(b: K): Promise<Record<string, string>> {
  const rows = readbackRows(readFileSync(resolve(ROOT, B[b].rb), 'utf8')) as Array<{ ws: string; sym: string }>;
  const keys = rows.map((r) => `${r.ws} ${r.sym}`);
  const got = await harness.sql<{ k: string; sig: string }[]>`
    SELECT w.code || ' ' || f.symbol AS k, md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, md5(coalesce(f.verification_quote,'')), coalesce(f.source_anchor,''))) AS sig
      FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
     WHERE s.code = ${B[b].std} AND f.active AND (w.code || ' ' || f.symbol) IN ${harness.sql(keys)}`;
  expect(got).toHaveLength(rows.length);
  return Object.fromEntries(keys.map((k) => [k, got.find((g) => g.k === k)!.sig]));
}
function sig1(b: K, observed: Record<string, string>) {
  if (b === '160000') return; // 160000 keeps its own generator input (m820-3-c4-qe-guards/c4q-sig1.json, C4Q_DISCOVER=1)
  const f = resolve(ROOT, `scripts/verification/m820-c4-prestate/${b}.sig1.json`);
  if (WRITE) { writeFileSync(f, JSON.stringify(observed, null, 1) + '\n'); return; }
  expect(observed).toEqual(JSON.parse(readFileSync(f, 'utf8')));
}

beforeAll(async () => {
  harness = await startHarness();
  const sql = harness.sql;
  await sql`ALTER TABLE fields ADD COLUMN IF NOT EXISTS source_anchor text`;
  await sql`ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS source_quote text`;
  await sql`ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS source_anchor text`;
  await seedDump('tests/harness/m820-1-client-route.dump.json', 'src/lib/eval/field-configs/m820_1.prior.json', '2020');
  await seedDump('tests/harness/m820-2-registers.dump.json', 'src/lib/eval/field-configs/m820_2.prior.json', '2023');
  await seedDump('tests/harness/m820-3-structure.dump.json', 'src/lib/eval/field-configs/m820_3.prior.json', '2026');
  for (const [std, ranges] of Object.entries(LIVE_PHASE)) for (const [a, b2, ph] of ranges)
    await sql`UPDATE worksheet_templates w SET phase = ${ph} FROM standards s WHERE s.id = w.standard_id AND s.code = ${std} AND w.order_index BETWEEN ${a} AND ${b2}`;
  for (const blk of PRIOR_BLOCKS) await runFile(blk); // = prod after 20261008100000, before the overlay (test a)
}, 900_000);
afterAll(async () => { await harness?.stop(); });

describe('DWA-M 820 C4 blocks — pre-state = prod (overlay 2026-10-17), post signatures', () => {
  it('a. prod overlay: all 729 active 820 field signatures equal prod', async () => {
    expect(await applyM820ProdOverlay(harness.sql)).toEqual({ fields: 729, matched: 729 });
  });
  it('b. read-back R0 at pre-state = the step-0 values prod must show', async () => {
    const r = { '130000': await r0('130000'), '140000': await r0('140000'), '150000': await r0('150000'), '160000': await r0('160000') };
    log('R0 pre', r);
    expect(r['130000']).toMatchObject({ fields: '18', fields_pre: '18', fields_post: '0', sections: '7', sections_pre: '7', sections_post: '0' });
    expect(r['140000']).toMatchObject({ fields: '18', fields_pre: '18', fields_post: '0', gates: '5', gates_pre: '5', gates_post: '0' });
    expect(r['150000']).toMatchObject({ fields: '24', fields_pre: '19', fields_post: '0', gates: '4', gates_pre: '4', gates_post: '0', f1_m820_24: '0' });
    expect(r['160000']).toMatchObject({ fields: '91', fields_pre: '91', fields_post: '0', gates: '6', gates_pre: '6', gates_post: '0' });
  });
  it('c. apply 130000 → 150000, then 140000 and 160000: every touched field reaches sig1', async () => {
    await runFile(resolve(ROOT, B['130000'].mig));
    sig1('130000', await postSigs('130000'));
    const pre150 = await r0('150000');
    log('R0 150000 after 130000', pre150);
    if (!WRITE) expect(pre150).toMatchObject({ fields: '24', fields_pre: '24', fields_post: '0', f1_m820_24: '5' });
    for (const b of ['150000', '140000', '160000'] as const) {
      // discovery round 1: 150000's M820-24 sig0 is 130000's (not yet written) sig1 → its step 0 aborts; round 2 completes it
      try { await runFile(resolve(ROOT, B[b].mig)); } catch (x) { if (!WRITE) throw x; log(`discovery: ${b} aborted`, String((x as Error).message).slice(0, 160)); continue; }
      sig1(b, await postSigs(b));
    }
    const post = { '130000': await r0('130000'), '140000': await r0('140000'), '150000': await r0('150000'), '160000': await r0('160000') };
    log('R0 post', post);
    if (!WRITE) {
      // 150000 rewrites 130000's five M820-24 rows → after both, 130000's R0 shows 13 of 18 at its own sig1 (the 5 carry 150000's sig1)
      expect(post['130000']).toMatchObject({ fields_pre: '0', fields_post: '13', sections_post: '7' });
      expect(post['140000']).toMatchObject({ fields_pre: '0', fields_post: '18', gates_post: '5' });
      expect(post['150000']).toMatchObject({ fields_pre: '0', fields_post: '24', gates_post: '4' });
      expect(post['160000']).toMatchObject({ fields_pre: '0', fields_post: '91', gates_post: '6' });
    }
  });
});
