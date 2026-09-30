/**
 * Disposable proof for FLL-GAR-2023 coverage block 5a/5b (NO prod, NO credentials): harness embedded Postgres with the full
 * Drizzle schema (+ prod-only audit columns), block 1 (tables) applied first, the touched templates seeded, then 5a ×2, 5b ×2,
 * read-back, the three new gates through the real condition evaluator, the rewritten plant-register formula through the real
 * formula engine (prepareRegisterRows + evaluateFormula) with a Tab.-29 row, rollbacks.
 * Run: pnpm exec tsx scripts/verification/loadtest-fll-gar-block5.ts
 */
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { startHarness } from '../../tests/harness/embedded-pg';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';

type V = number | string | boolean;
const M = (p: string) => readFileSync(p, 'utf8');
const B1 = 'scripts/migrations/20260929200000_fll_gar_2023_tables_coverage_block1.sql';
const A = 'scripts/migrations/20260930100000_fll_gar_2023_widgets_coverage_block5a.sql';
const B = 'scripts/migrations/20260930100100_fll_gar_2023_gates_coverage_block5b.sql';
const RA = 'scripts/migrations/rollback-20260930100000_fll_gar_2023_widgets_coverage_block5a.sql';
const RB = 'scripts/migrations/rollback-20260930100100_fll_gar_2023_gates_coverage_block5b.sql';

async function main() {
  const h = await startHarness();
  const sql = h.sql;
  const raw = postgres(h.databaseUrl, { max: 1, prepare: false });
  const apply = (p: string) => raw.unsafe(M(p));
  let failures = 0;
  const check = (label: string, ok: boolean, detail?: unknown) => {
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
    if (!ok) failures++;
  };
  try {
    await sql.unsafe("ALTER TABLE fields ADD COLUMN IF NOT EXISTS source_anchor text, ADD COLUMN IF NOT EXISTS source_quote text, ADD COLUMN IF NOT EXISTS audit_status text; ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS requires_attestation boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS source_quote text, ADD COLUMN IF NOT EXISTS source_anchor text, ADD COLUMN IF NOT EXISTS audit_status text; ALTER TABLE equations ADD COLUMN IF NOT EXISTS source_quote text, ADD COLUMN IF NOT EXISTS source_anchor text;");
    await apply(B1);
    const [tabs] = await sql`select count(*)::int n from regulation_tables where standard_code = 'FLL-GAR-2023'`;
    check('block 1 present in harness (12 tables)', tabs.n === 12, tabs);
    const [std] = await sql`insert into standards (code, title_de, version) values ('FLL-GAR-2023', 'FLL Gewässerabdichtungsrichtlinien', '2023-12') returning id`;
    const wt: Record<string, string> = {};
    for (const c of ['FLL-GAR-12', 'FLL-GAR-14', 'FLL-GAR-15', 'FLL-GAR-16', 'FLL-GAR-17', 'FLL-GAR-24']) {
      const [r] = await sql`insert into worksheet_templates (standard_id, code, title_de) values (${std.id}, ${c}, ${c}) returning id`;
      wt[c] = r.id;
      await sql`insert into worksheet_sections (worksheet_template_id, code, title_de) values (${r.id}, 'C', 'C')`;
    }
    const oldCols = [{ key: 'art', type: 'text', label: 'Pflanzenart', required: true }, { key: 'aggressiv', type: 'boolean', label: 'aggressiv wurzelnd / rhizombildend' }];
    await sql`insert into fields (worksheet_template_id, symbol, label_de, data_type, widget, ui_config) values (${wt['FLL-GAR-24']}, 'pflanzenarten', 'Pflanzenarten', 'json', 'register', ${sql.json({ title: 'Pflanzenarten (Rhizom-Screening)', columns: oldCols, footer: ['pflanzen_aggressiv_count'] })})`;
    await sql`insert into equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol) values (${wt['FLL-GAR-24']}, 'FLL-GAR-24-D2', 'pflanzen_aggressiv_count = count_rows(pflanzenarten, aggressiv == true)', ${sql.array(['pflanzenarten'])}, 'pflanzen_aggressiv_count')`;
    const counts = async () => {
      const [f] = await sql`select count(*)::int n from fields`;
      const [g] = await sql`select count(*)::int n from compliance_requirements`;
      return { fields: f.n, gates: g.n };
    };
    const c0 = await counts();
    check('seed', c0.fields === 1 && c0.gates === 0, c0);

    await apply(A);
    const c1 = await counts();
    await apply(A);
    const c1b = await counts();
    check('5a applied: 25 new fields', c1.fields === 26, c1);
    check('5a idempotent', JSON.stringify(c1) === JSON.stringify(c1b), c1b);
    const opts = await sql`select symbol, jsonb_array_length(enum_values) n, enum_values->0 first from fields where widget = 'select_one' order by symbol`;
    const want: Record<string, number> = { bb_kurzzeichen_tab19: 14, bahn_bezeichnung_tab21: 47, fk_stoff_tab23: 3, gtd_geotextil_art_tab14: 2, frischbeton_lufttemperatur_fall: 3, zementfestigkeitsklasse_tab10: 3 };
    check('5a selections carry the table rows as options (14/47/3/2/3/3)', Object.entries(want).every(([s, n]) => opts.find((o) => o.symbol === s)?.n === n), opts.map((o) => `${o.symbol}:${o.n}`));
    check('5a option value = row_key, label carries the printed text', opts.every((o) => typeof o.first?.value === 'string' && typeof o.first?.label_de === 'string' && o.first.label_de.length > 0), opts.map((o) => o.first));
    const fills = await sql`select symbol, lookup->>'table_code' tc from fields where widget = 'lookup_fill' order by symbol`;
    check('5a lookup fills bound to the block-1 tables (10)', fills.length === 10 && fills.every((f) => ['TAB19', 'TAB21', 'TAB23', 'TAB14', 'TAB9', 'TAB10'].includes(f.tc)), fills.map((f) => `${f.symbol}→${f.tc}`));

    await apply(B);
    const c2 = await counts();
    await apply(B);
    const c2b = await counts();
    check('5b applied: 3 new gates', c2.gates === 3, c2);
    check('5b idempotent', JSON.stringify(c2) === JSON.stringify(c2b), c2b);
    const [reg] = await sql`select ui_config from fields where symbol = 'pflanzenarten'`;
    const cols = (reg.ui_config as { columns: { key: string; type: string; expr?: string; lookup?: { table_code: string } }[] }).columns;
    check('5b plant register has the Tab.-29 column + derived flag', cols.some((c) => c.key === 'tab29_art' && c.type === 'lookup_key' && c.lookup?.table_code === 'TAB29') && cols.some((c) => c.key === 'tab29_flag' && c.type === 'derived'), cols.map((c) => c.key));
    const [eq] = await sql`select formula from equations where equation_number = 'FLL-GAR-24-D2'`;
    check('5b D2 counts engineer flag OR Tab.-29 match', eq.formula === 'pflanzen_aggressiv_count = count_rows(pflanzenarten, aggressiv == true OR tab29_flag == 1)', eq);

    // gates through the real evaluator
    const gates = await sql`select code, condition from compliance_requirements order by code`;
    const cases: Record<string, { pass: Record<string, V>; fail: Record<string, V>; na: Record<string, V>; alt?: Record<string, V> }> = {
      'REQ-41': { pass: { abdichtungs_art: 'fluessigkunststoff', fk_trockenschichtdicke: 2.2, fk_schichtdicke_min_mm: 2.0, fk_einlage_g_m2: 120, fk_einlage_min_g_m2: 110 }, fail: { abdichtungs_art: 'fluessigkunststoff', fk_trockenschichtdicke: 2.2, fk_schichtdicke_min_mm: 2.0, fk_eta_mindestschichtdicke_mm: 2.5, fk_einlage_g_m2: 120, fk_einlage_min_g_m2: 110 }, na: { abdichtungs_art: 'bahn_pe' } },
      'REQ-42': { pass: { abdichtungs_art: 'verbundwerkstoff_gtd', gtd_geotextil_flaecheneinheit_g_m2: 220, gtd_geotextil_flaecheneinheit_min: 200, gtd_zugfestigkeit_kn_m: 12, gtd_zugfestigkeitsdehnung_pct: 20, gtd_verbundfestigkeit_n_m: 400, gtd_kf_m_s: 2e-11, gtd_permittivitaet_m_s: 1e-9 }, fail: { abdichtungs_art: 'verbundwerkstoff_gtd', gtd_geotextil_flaecheneinheit_g_m2: 220, gtd_geotextil_flaecheneinheit_min: 200, gtd_zugfestigkeit_kn_m: 12, gtd_zugfestigkeitsdehnung_pct: 20, gtd_verbundfestigkeit_n_m: 400, gtd_kf_m_s: 8e-11, gtd_permittivitaet_m_s: 1e-9 }, na: { abdichtungs_art: 'bahn_pe' } },
      'REQ-43': { pass: { abdichtungs_art: 'mineralisch_hydraulisch', frischbeton_temperatur_c: 12, frischbeton_temp_min_c: 10 }, fail: { abdichtungs_art: 'mineralisch_hydraulisch', frischbeton_temperatur_c: 8, frischbeton_temp_min_c: 10 }, na: { abdichtungs_art: 'bahn_pe' } },
    };
    const ev = (cond: string, vals: Record<string, V>) => evaluateCondition(cond, (s) => vals[s]);
    for (const { code, condition } of gates) {
      const cs = cases[code];
      if (!cs) { check(`${code} has an evaluator case`, false); continue; }
      const empty = ev(condition, {}); const p = ev(condition, cs.pass); const f = ev(condition, cs.fail); const na = ev(condition, cs.na);
      check(`${code} empty → ${empty.kind}`, empty.kind !== 'fail', empty);
      check(`${code} pass state → ${p.kind}`, p.kind === 'pass', p.kind === 'pass' ? undefined : p);
      check(`${code} fail state → ${f.kind}`, f.kind === 'fail', f.kind === 'fail' ? undefined : f);
      check(`${code} not-applicable state → ${na.kind}`, na.kind === 'pass', na.kind === 'pass' ? undefined : na);
    }

    // plant register through the real formula engine, with a TAB29 row from the harness tables
    const t29 = await sql`select r.row_key, r.row_values from regulation_table_rows r join regulation_tables t on t.id = r.table_id where t.table_code = 'TAB29' order by r.order_index`;
    const table = (tableCode: string, key: string, col: string) => tableCode === 'TAB29' ? ((t29.find((r) => r.row_key === key)?.row_values as Record<string, V> | undefined)?.[col]) : undefined;
    const tableRows = (tableCode: string) => tableCode === 'TAB29' ? t29.map((r) => ({ row_key: r.row_key, keys: { art: r.row_key }, row_values: r.row_values, label_de: r.row_key, order_index: 0, group_label: null, verbatim_quote: '' })) : undefined;
    const carrier = { rows: [
      { id: '1', art: 'Acorus calamus', tab29_art: null, aggressiv: false },
      { id: '2', art: 'Phragmites australis', tab29_art: 'phragmites_australis', aggressiv: false },
      { id: '3', art: 'Typha minima', tab29_art: null, aggressiv: true },
    ] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prepared = prepareRegisterRows(carrier, cols as any, { table: table as any, tableRows: tableRows as any });
    const flags = prepared.rows.map((r) => (r as unknown as { cells: Record<string, unknown> }).cells?.tab29_flag ?? (r as unknown as Record<string, unknown>).tab29_flag);
    const res = evaluateFormula({ equationId: 'test-d2', formula: eq.formula, inputSymbols: ['pflanzenarten'], outputSymbol: 'pflanzen_aggressiv_count', inputs: [], registers: { pflanzenarten: prepared }, tableLookup: table as never });
    check(`D2 formula engine: Tab.-29 match counts (expect 2) → ${res.kind}`, res.kind === 'computed' && (res as { value: number }).value === 2, { res, flags, diagnostics: prepared.diagnostics });

    await apply(RB);
    const [eq2] = await sql`select formula from equations where equation_number = 'FLL-GAR-24-D2'`;
    const [reg2] = await sql`select (ui_config->'columns')::text like '%tab29_art%' has from fields where symbol = 'pflanzenarten'`;
    const c3 = await counts();
    check('5b rollback', c3.gates === 0 && eq2.formula.endsWith('aggressiv == true)') && reg2.has === false, { c3, eq2, reg2 });
    await apply(RA);
    const c4 = await counts();
    check('5a rollback → seed state', JSON.stringify(c4) === JSON.stringify(c0), c4);
  } finally {
    await raw.end({ timeout: 5 });
    await h.stop();
  }
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
