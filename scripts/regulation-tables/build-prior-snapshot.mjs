// Plan 3 Task 0 (fix round 1) — READ-ONLY prior-snapshot capture for the field-config emitter.
//
// Usage: node scripts/regulation-tables/build-prior-snapshot.mjs <STANDARD CODE> <slug>
//   e.g. node scripts/regulation-tables/build-prior-snapshot.mjs DWA-A-138-1 a138
// Writes src/lib/eval/field-configs/<slug>.prior.json in the exact `PriorSnapshot` shape the
// emitter consumes (scripts/regulation-tables/emit-field-configs-sql.ts):
//   { "_meta": { … }, "<worksheet> <symbol>": { enum_values, widget, ui_config, lookup, visible_when,
//     consumer_worksheets, data_type, section_code, section_id_is_null, section_path },
//     "sections": { "<worksheet> <section_code>": { visible_when, parent_code } },
//     "equations": { "<worksheet> <equation_number>": { id, output_symbol, input_symbols } },
//     "gates": { "<worksheet> <req_code>": { condition, severity, symbols[, parse_error] } } }
// gates (Task 12c) = EVERY compliance_requirements row of the standard (the table has no active flag); `symbols`
// are the free symbols the condition reads, extracted with the ENGINE's own walk (extractConditionSymbols in
// src/lib/compliance/evaluate.ts, loaded through tsx at runtime — never re-implemented here); a condition the
// engine cannot parse carries symbols: [] + parse_error: true. The emitter's gate-aware guard refuses a
// visible_when that hides a symbol a same-worksheet gate reads (hidden ⇒ null ⇒ the gate stops enforcing).
// equations (Task 3 fix round 1) = EVERY equation row of the standard; the emitter's producer guard walks
// input_symbols → output_symbol chains per worksheet so a rule can never hide an input of a consumed output.
// section_path = codes of the field's section ancestors root → own section (null for a null-coded section, [] for
// an orphan); the emitter's section-level producer guard walks it because the runtime hides every descendant of
// a hidden section. The sections query therefore captures EVERY section (null-coded ones included); the
// `sections` map keeps the coded ones.
//
// Why not prod-query.mjs: it truncates every cell to 120 chars and prints a console.table — fine for
// audits, useless for a byte-faithful restore target. This script selects the full rows as JSON
// (no truncation) and writes them straight to disk. It never prints a cell.
//
// Auth/safety: identical mechanics to scripts/verification/prod-query.mjs — DATABASE_URL_PROD is read
// from .env.local at runtime and NEVER printed; every statement runs inside a READ ONLY transaction on
// a session with default_transaction_read_only=on, so any write is rejected by Postgres itself.
//
// Plan-1 schema unapplied: `fields.widget/ui_config/lookup/visible_when` and
// `worksheet_sections.visible_when` may not exist in prod yet. The script detects the present columns
// via information_schema and writes null for the absent ones (recorded in _meta.columns_present).
//
// The pure parts (column detection → SQL, row folding — the fold takes the symbol extractor as a parameter so the
// test passes the real one and main() loads it via tsx) are exported and unit-tested
// (scripts/regulation-tables/__tests__/build-prior-snapshot.test.mjs); only main() touches the network.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const OPTIONAL_FIELD_COLUMNS = ['widget', 'ui_config', 'lookup', 'visible_when'];
export const OPTIONAL_SECTION_COLUMNS = ['visible_when'];

/** From information_schema rows `{ table_name, column_name }` → which optional columns exist. */
export function detectColumns(informationSchemaRows) {
  const has = (table, col) => informationSchemaRows.some((r) => r.table_name === table && r.column_name === col);
  return {
    fields: Object.fromEntries(OPTIONAL_FIELD_COLUMNS.map((c) => [c, has('fields', c)])),
    worksheet_sections: Object.fromEntries(OPTIONAL_SECTION_COLUMNS.map((c) => [c, has('worksheet_sections', c)])),
  };
}

/** The four capture queries, with `null as <col>` for every optional column prod does not have yet. `$1` = standards.code. */
export function buildQueries(columnsPresent) {
  const fieldSelect = OPTIONAL_FIELD_COLUMNS.map((c) => (columnsPresent.fields[c] ? `f.${c}` : `null as ${c}`)).join(', ');
  const sectionSelect = OPTIONAL_SECTION_COLUMNS.map((c) => (columnsPresent.worksheet_sections[c] ? `ws.${c}` : `null as ${c}`)).join(', ');
  return {
    fields: `select w.code as worksheet, f.symbol, f.enum_values, f.data_type, f.consumer_worksheets, f.section_id, ws.code as section_code, ${fieldSelect}
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
left join worksheet_sections ws on ws.id = f.section_id
where s.code = $1 and f.active order by w.code, f.symbol`,
    sections: `select w.code as worksheet, ws.id, ws.parent_section_id, ws.code as section_code, p.code as parent_code, ${sectionSelect}
from worksheet_sections ws join worksheet_templates w on w.id = ws.worksheet_template_id join standards s on s.id = w.standard_id
left join worksheet_sections p on p.id = ws.parent_section_id
where s.code = $1 order by w.code, ws.order_index, ws.code`,
    equations: `select w.code as worksheet, e.id, e.equation_number, e.output_symbol, e.input_symbols
from equations e join worksheet_templates w on w.id = e.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = $1 order by w.code, e.equation_number`,
    // Task 12c: every gate of the standard (compliance_requirements carries no active flag — all rows are live).
    gates: `select w.code as worksheet, cr.code as req_code, cr.condition, cr.severity
from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = $1 order by w.code, cr.code`,
  };
}

/** Codes of a section's ancestors root → itself, walking `parent_section_id` (a cycle in bad data stops the walk). */
export function sectionPath(sectionId, byId) {
  const path = [];
  const seen = new Set();
  for (let id = sectionId; id != null && byId.has(id) && !seen.has(id); id = byId.get(id).parent_section_id) {
    seen.add(id);
    path.unshift(byId.get(id).section_code ?? null);
  }
  return path;
}

/**
 * Folds the row sets into the `PriorSnapshot` object (throws on a duplicate key). `sectionRows` is EVERY
 * section of the standard (id, parent_section_id, code, parent_code, visible_when); the coded ones become the
 * `sections` map, all of them feed each field's `section_path`. `equationRows` (optional, Task 3 fix round 1)
 * is every equation of the standard → the `equations` map keyed "<worksheet> <equation_number>". `gateRows`
 * (optional, Task 12c) is every compliance_requirements row → the `gates` map keyed "<worksheet> <req_code>",
 * each with the symbols its condition reads per `extractConditionSymbols` (the engine's own walk, injected — a
 * null return = the engine cannot parse the condition ⇒ `symbols: []` + `parse_error: true`). Passing gate rows
 * without the extractor is an error: the map must never be built with a re-implemented symbol walk.
 */
export function foldSnapshot(fieldRows, sectionRows, meta, equationRows = [], gateRows = [], extractConditionSymbols = null) {
  const byId = new Map(sectionRows.filter((r) => r.id != null).map((r) => [r.id, r]));
  const coded = sectionRows.filter((r) => r.section_code != null);
  if (gateRows.length && typeof extractConditionSymbols !== 'function') throw new Error('foldSnapshot: gate rows need the engine extractor (extractConditionSymbols from src/lib/compliance/evaluate.ts)');
  const snapshot = { _meta: { ...meta, field_rows: fieldRows.length, section_rows: coded.length, sections_total: sectionRows.length, equation_rows: equationRows.length, gate_rows: gateRows.length } };
  for (const r of fieldRows) {
    const key = `${r.worksheet} ${r.symbol}`;
    if (snapshot[key]) throw new Error(`duplicate field key ${key}`);
    snapshot[key] = {
      enum_values: r.enum_values ?? null,
      widget: r.widget ?? null,
      ui_config: r.ui_config ?? null,
      lookup: r.lookup ?? null,
      visible_when: r.visible_when ?? null,
      consumer_worksheets: r.consumer_worksheets ?? null,
      data_type: r.data_type,
      section_code: r.section_code ?? null,
      section_id_is_null: r.section_id == null,
      section_path: r.section_id == null ? [] : sectionPath(r.section_id, byId),
    };
  }
  snapshot.sections = {};
  for (const r of coded) {
    const key = `${r.worksheet} ${r.section_code}`;
    if (snapshot.sections[key]) throw new Error(`duplicate section key ${key}`);
    snapshot.sections[key] = { visible_when: r.visible_when ?? null, parent_code: r.parent_code ?? null };
  }
  snapshot.equations = {};
  for (const r of equationRows) {
    const key = `${r.worksheet} ${r.equation_number}`;
    if (snapshot.equations[key]) throw new Error(`duplicate equation key ${key}`);
    snapshot.equations[key] = { id: r.id ?? null, output_symbol: r.output_symbol, input_symbols: Array.isArray(r.input_symbols) ? [...r.input_symbols] : [] };
  }
  snapshot.gates = {};
  for (const r of gateRows) {
    const key = `${r.worksheet} ${r.req_code}`;
    if (snapshot.gates[key]) throw new Error(`duplicate gate key ${key}`);
    const condition = r.condition ?? '';
    const symbols = condition.trim() ? extractConditionSymbols(condition) : null;
    snapshot.gates[key] = symbols
      ? { condition, severity: r.severity ?? null, symbols: [...symbols].sort() }
      : { condition, severity: r.severity ?? null, symbols: [], parse_error: true };
  }
  return snapshot;
}

/**
 * Loads the engine's condition-symbol walk (`extractConditionSymbols`, src/lib/compliance/evaluate.ts) from this
 * plain-node script: registers tsx's ESM + CJS hooks for the dynamic import (the repo has no "type": "module", so
 * tsx serves the .ts as CJS — the named exports then sit on `default`). Only main() calls this; the fold is pure.
 */
async function loadConditionSymbolExtractor(root) {
  // Opaque specifiers: vitest imports this module for the pure parts, and vite's import analysis would otherwise
  // inject a header ahead of the shebang for a literal dynamic import.
  const tsxEsm = 'tsx/esm/api';
  const tsxCjs = 'tsx/cjs/api';
  const [{ register: registerEsm }, { register: registerCjs }] = await Promise.all([import(/* @vite-ignore */ tsxEsm), import(/* @vite-ignore */ tsxCjs)]);
  const unregisterCjs = registerCjs();
  const unregisterEsm = registerEsm();
  const evaluatePath = pathToFileURL(path.join(root, 'src', 'lib', 'compliance', 'evaluate.ts')).href;
  const mod = await import(/* @vite-ignore */ evaluatePath);
  const api = typeof mod.extractConditionSymbols === 'function' ? mod : mod.default;
  if (typeof api?.extractConditionSymbols !== 'function') throw new Error('could not load extractConditionSymbols from src/lib/compliance/evaluate.ts');
  return { extractConditionSymbols: api.extractConditionSymbols, dispose: async () => { await unregisterEsm(); unregisterCjs(); } };
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const [code, slug] = process.argv.slice(2);
  if (!code || !slug || !/^[a-z0-9_]+$/.test(slug)) {
    console.error('usage: build-prior-snapshot.mjs <STANDARD CODE> <slug>   (slug: [a-z0-9_]+)');
    process.exit(1);
  }
  const envText = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
  const m = envText.match(/^DATABASE_URL_PROD=(.+)$/m);
  if (!m) {
    console.error('DATABASE_URL_PROD not found in .env.local');
    process.exit(1);
  }
  const url = m[1].trim().replace(/^"|"$/g, '');
  const { default: postgres } = await import('postgres');
  const sql = postgres(url, {
    prepare: false,
    max: 1,
    ssl: 'require',
    connection: { default_transaction_read_only: 'on', statement_timeout: '60000' },
  });
  const ro = (stmt, params) => sql.begin('read only', async (tx) => tx.unsafe(stmt, params));
  try {
    const columnsPresent = detectColumns(await ro(
      "select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name in ('fields', 'worksheet_sections')",
    ));
    const queries = buildQueries(columnsPresent);
    const fieldRows = await ro(queries.fields, [code]);
    const sectionRows = await ro(queries.sections, [code]);
    const equationRows = await ro(queries.equations, [code]);
    const gateRows = await ro(queries.gates, [code]);
    if (fieldRows.length === 0) {
      console.error(`no active fields found for standards.code = ${JSON.stringify(code)} — check the code (nothing written)`);
      process.exit(2);
    }
    const extractor = await loadConditionSymbolExtractor(root);
    const snapshot = foldSnapshot(fieldRows, sectionRows, {
      command: `node scripts/regulation-tables/build-prior-snapshot.mjs ${code} ${slug}`,
      captured_at: new Date().toISOString(),
      standard: code,
      slug,
      source: 'prod (READ ONLY transaction, DATABASE_URL_PROD from .env.local)',
      columns_present: columnsPresent,
    }, equationRows, gateRows, extractor.extractConditionSymbols);
    await extractor.dispose();
    const parseErrors = Object.entries(snapshot.gates).filter(([, g]) => g.parse_error).map(([k]) => k);
    const out = path.join(root, 'src', 'lib', 'eval', 'field-configs', `${slug}.prior.json`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(snapshot, null, 2) + '\n');
    console.log(`wrote ${path.relative(root, out)}: ${fieldRows.length} field rows (${fieldRows.filter((r) => r.section_id == null).length} orphan), ${snapshot._meta.section_rows} coded sections of ${sectionRows.length}, ${equationRows.length} equations, ${gateRows.length} gates (${parseErrors.length} unparseable — symbols: [] + parse_error; the emitter refuses conservatively on those worksheets); optional columns present: ${JSON.stringify(columnsPresent)}`);
  } finally {
    await sql.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => { console.error(err?.message ?? err); process.exit(1); });
}
