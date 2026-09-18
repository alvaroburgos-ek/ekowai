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
// test passes the real one and main() loads it via tsx) live in ./prior-snapshot-fold.mjs (re-exported here) and are
// unit-tested in scripts/regulation-tables/__tests__/build-prior-snapshot.test.mjs; only main() touches the network.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { foldSnapshot, detectColumns, buildQueries } from './prior-snapshot-fold.mjs';

export { OPTIONAL_FIELD_COLUMNS, OPTIONAL_SECTION_COLUMNS, detectColumns, buildQueries, sectionPath, foldSnapshot } from './prior-snapshot-fold.mjs';

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
