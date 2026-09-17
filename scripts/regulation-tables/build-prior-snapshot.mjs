#!/usr/bin/env node
// Plan 3 Task 0 (fix round 1) — READ-ONLY prior-snapshot capture for the field-config emitter.
//
// Usage: node scripts/regulation-tables/build-prior-snapshot.mjs <STANDARD CODE> <slug>
//   e.g. node scripts/regulation-tables/build-prior-snapshot.mjs DWA-A-138-1 a138
// Writes src/lib/eval/field-configs/<slug>.prior.json in the exact `PriorSnapshot` shape the
// emitter consumes (scripts/regulation-tables/emit-field-configs-sql.ts):
//   { "_meta": { … }, "<worksheet> <symbol>": { enum_values, widget, ui_config, lookup, visible_when,
//     consumer_worksheets, data_type, section_code, section_id_is_null, section_path },
//     "sections": { "<worksheet> <section_code>": { visible_when, parent_code } },
//     "equations": { "<worksheet> <equation_number>": { id, output_symbol, input_symbols } } }
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
// The pure parts (column detection → SQL, row folding) are exported and unit-tested
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

/** The three capture queries, with `null as <col>` for every optional column prod does not have yet. `$1` = standards.code. */
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
 * is every equation of the standard → the `equations` map keyed "<worksheet> <equation_number>".
 */
export function foldSnapshot(fieldRows, sectionRows, meta, equationRows = []) {
  const byId = new Map(sectionRows.filter((r) => r.id != null).map((r) => [r.id, r]));
  const coded = sectionRows.filter((r) => r.section_code != null);
  const snapshot = { _meta: { ...meta, field_rows: fieldRows.length, section_rows: coded.length, sections_total: sectionRows.length, equation_rows: equationRows.length } };
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
  return snapshot;
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
    if (fieldRows.length === 0) {
      console.error(`no active fields found for standards.code = ${JSON.stringify(code)} — check the code (nothing written)`);
      process.exit(2);
    }
    const snapshot = foldSnapshot(fieldRows, sectionRows, {
      command: `node scripts/regulation-tables/build-prior-snapshot.mjs ${code} ${slug}`,
      captured_at: new Date().toISOString(),
      standard: code,
      slug,
      source: 'prod (READ ONLY transaction, DATABASE_URL_PROD from .env.local)',
      columns_present: columnsPresent,
    }, equationRows);
    const out = path.join(root, 'src', 'lib', 'eval', 'field-configs', `${slug}.prior.json`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(snapshot, null, 2) + '\n');
    console.log(`wrote ${path.relative(root, out)}: ${fieldRows.length} field rows (${fieldRows.filter((r) => r.section_id == null).length} orphan), ${snapshot._meta.section_rows} coded sections of ${sectionRows.length}, ${equationRows.length} equations; optional columns present: ${JSON.stringify(columnsPresent)}`);
  } finally {
    await sql.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => { console.error(err?.message ?? err); process.exit(1); });
}
