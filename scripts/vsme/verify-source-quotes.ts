/**
 * verify-source-quotes.ts
 *
 * Verifies every `source_quote` backfilled for the VSME standard (Task 7,
 * dp-vsme-03) is a genuine verbatim substring of data/norm-text/VSME.md — the
 * committed pdftotext rendering of the VSME Standard PDF (SR-3 ground truth
 * for this repo; see docs/verification-doctrine.md).
 *
 * Two modes:
 *   --file (default)   Parses the staged migration SQL
 *                       (scripts/migrations/20260727120000_vsme_source_quotes.sql)
 *                       directly — no DB required. This is what CI / a reviewer
 *                       runs before the migration is ever applied anywhere.
 *   --db <url>          Reads source_quote back from a live database (fields,
 *                       equations, compliance_requirements, standard='VSME')
 *                       and re-checks each non-null value the same way. Use
 *                       this AFTER the migration has actually been applied to
 *                       confirm the backfill landed and stayed verbatim.
 *
 * Check performed (per row): strip the trailing " [p.N]" page tag, then
 * whitespace-normalise both the quote and the full norm-text (collapse any
 * run of whitespace to a single space) and confirm the quote is a substring
 * of the norm-text. This tolerates the source's own line wraps without
 * permitting any actual paraphrase — every surviving character must appear
 * in the same order in VSME.md.
 *
 * Prints a quoted/total count per table plus up to 10 failures (with the
 * offending row identifier and quote) and exits non-zero if any check fails
 * or if a row's quote does not parse as `<text> [p.N]`.
 *
 * --db mode EXPECTED-TOTAL GUARD: `--db` only ever SELECTs rows where
 * source_quote IS NOT NULL (that's the set there is anything to verify
 * against). Naively reporting "quoted/total" over that same pre-filtered set
 * is vacuously 100% by construction and CANNOT detect a partial or
 * mis-ordered apply (e.g. applying this migration before the Task 10 Step 2
 * VSME Pass3c re-import re-hosts compliance_requirements — see the migration
 * file's header — silently no-ops 23 of the 31 CR UPDATEs). To catch that,
 * --db mode additionally parses the migration file itself to compute the
 * EXPECTED row count per table (fields 138, equations 8,
 * compliance_requirements 31 as of this migration) and FAILS (non-zero exit)
 * if the DB's quoted-row count for any table is below that expectation, even
 * if every row that IS present verifies verbatim. --file mode is unaffected
 * — it already checks 100% of what it parsed, so there is nothing to guard.
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const NORM_TEXT_PATH = path.join(REPO_ROOT, 'data', 'norm-text', 'VSME.md');
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'scripts',
  'migrations',
  '20260727120000_vsme_source_quotes.sql',
);

type Row = {
  table: 'fields' | 'equations' | 'compliance_requirements';
  ws: string;
  key: string; // symbol / output_symbol / code
  quote: string; // full source_quote value, including the "[p.N]" tag
};

type CheckResult = {
  row: Row;
  ok: boolean;
  reason?: string;
};

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes CRLF -> LF. Applied once, at read time, to every text file this
 * module loads (the migration SQL and VSME.md) — see `loadNormTextNormalized`
 * and the two `fs.readFileSync(MIGRATION_PATH, ...)` call sites below. Without
 * this, `parseMigrationRows`'s statement regex (which anchors on literal
 * `\n` sequences between the SQL clauses of each `UPDATE ... SET
 * source_quote = '...'` statement) fails to match when the migration file
 * was materialized with CRLF line endings (e.g. a fresh Windows checkout of
 * a repo without a `.gitattributes` pin for `scripts/migrations/*.sql`) —
 * every `\r\n` in the file breaks the literal `\n` match, so zero rows parse.
 */
function normalizeLineEndings(s: string): string {
  return s.replace(/\r\n/g, '\n');
}

/** Splits a source_quote into { body, page } or returns null if it doesn't
 *  end in the expected " [p.N]" tag. */
function parsePageTag(quote: string): { body: string; page: string } | null {
  const m = quote.match(/^([\s\S]*)\s\[p\.(\d+)\]$/);
  if (!m) return null;
  return { body: m[1], page: m[2] };
}

function loadNormTextNormalized(): string {
  const raw = normalizeLineEndings(fs.readFileSync(NORM_TEXT_PATH, 'utf8'));
  return normalizeWs(raw);
}

/**
 * Parses the migration SQL and extracts every UPDATE's target table, WHERE-key
 * (symbol / output_symbol / code) and the SET source_quote literal value.
 * SQL-unescapes doubled single quotes ('' -> ').
 */
function parseMigrationRows(sqlText: string): Row[] {
  const rows: Row[] = [];
  // One UPDATE statement per row, always of the shape:
  //   UPDATE <table> <alias> SET source_quote = '<...>'
  //   FROM worksheet_templates wt, standards s
  //   WHERE ... AND wt.code = '<ws>'
  //     AND <alias>.<keycol> = '<key>'
  //     AND <alias>.source_quote IS NULL;
  const stmtRe =
    /UPDATE (fields|equations|compliance_requirements) \w+ SET source_quote = '([\s\S]*?)'\nFROM worksheet_templates wt, standards s\n[\s\S]*?AND wt\.code = '([^']+)'\n\s*AND \w+\.(?:symbol|output_symbol|code) = '([^']+)'\n\s*AND \w+\.source_quote IS NULL;/g;

  let m: RegExpExecArray | null;
  while ((m = stmtRe.exec(sqlText)) !== null) {
    const [, table, quoteLiteral, ws, key] = m;
    const quote = quoteLiteral.replace(/''/g, "'");
    rows.push({ table: table as Row['table'], ws, key, quote });
  }
  return rows;
}

type ExpectedCounts = Record<Row['table'], number>;

/**
 * Derives the expected quoted-row count per table straight from the
 * migration file itself (one UPDATE parsed by parseMigrationRows == one row
 * this migration expects to carry a source_quote once fully, correctly
 * applied). This is the source of truth --db mode checks live DB counts
 * against — never a hardcoded number, so it can't drift from the migration.
 */
function expectedCountsFromMigration(sqlText: string): ExpectedCounts {
  const rows = parseMigrationRows(sqlText);
  const counts: ExpectedCounts = { fields: 0, equations: 0, compliance_requirements: 0 };
  for (const r of rows) counts[r.table]++;
  return counts;
}

function checkRow(row: Row, normText: string): CheckResult {
  const parsed = parsePageTag(row.quote);
  if (!parsed) {
    return { row, ok: false, reason: 'does not end in a " [p.N]" page tag' };
  }
  const normalizedBody = normalizeWs(parsed.body);
  if (normalizedBody.length === 0) {
    return { row, ok: false, reason: 'empty quote body' };
  }
  if (!normText.includes(normalizedBody)) {
    return { row, ok: false, reason: 'not a substring of VSME.md (whitespace-normalized)' };
  }
  return { row, ok: true };
}

function printReport(results: CheckResult[], expected?: ExpectedCounts): boolean {
  const byTable = new Map<string, CheckResult[]>();
  for (const r of results) {
    if (!byTable.has(r.row.table)) byTable.set(r.row.table, []);
    byTable.get(r.row.table)!.push(r);
  }

  console.log('VSME source_quote verification');
  console.log('='.repeat(60));

  let anyFail = false;
  const failures: CheckResult[] = [];
  const shortfalls: { table: string; found: number; expected: number }[] = [];

  for (const table of ['fields', 'equations', 'compliance_requirements'] as const) {
    const rs = byTable.get(table) ?? [];
    const ok = rs.filter((r) => r.ok).length;
    console.log(`${table}: ${ok}/${rs.length} quoted rows verified verbatim`);
    for (const r of rs) {
      if (!r.ok) {
        anyFail = true;
        failures.push(r);
      }
    }
    if (expected) {
      const exp = expected[table];
      console.log(`  expected from migration file: ${exp} row(s) should carry a source_quote`);
      if (rs.length < exp) {
        anyFail = true;
        shortfalls.push({ table, found: rs.length, expected: exp });
      }
    }
  }

  const total = results.length;
  const totalOk = results.filter((r) => r.ok).length;
  console.log('-'.repeat(60));
  console.log(`TOTAL: ${totalOk}/${total} verified`);

  if (shortfalls.length > 0) {
    console.log('');
    console.log('EXPECTED-TOTAL SHORTFALL (partial or mis-ordered apply?):');
    for (const s of shortfalls) {
      console.log(
        `  [${s.table}] found ${s.found} quoted row(s) in the DB but the migration file expects ` +
          `${s.expected} — missing ${s.expected - s.found}. If this is compliance_requirements, ` +
          'check whether the Task 10 Step 2 VSME Pass3c re-import (which re-hosts CRs onto their ' +
          'owning worksheets) has run yet — see the migration file header.',
      );
    }
  }

  if (failures.length > 0) {
    console.log('');
    console.log(`FAILURES (showing up to 10 of ${failures.length}):`);
    for (const f of failures.slice(0, 10)) {
      console.log(
        `  [${f.row.table}] ${f.row.ws} / ${f.row.key} — ${f.reason}\n` +
          `    quote: ${f.row.quote.slice(0, 160)}${f.row.quote.length > 160 ? '…' : ''}`,
      );
    }
  }

  return !anyFail;
}

async function runFileMode(): Promise<boolean> {
  if (!fs.existsSync(MIGRATION_PATH)) {
    console.error(`Migration file not found: ${MIGRATION_PATH}`);
    return false;
  }
  const sqlText = normalizeLineEndings(fs.readFileSync(MIGRATION_PATH, 'utf8'));
  const normText = loadNormTextNormalized();
  const rows = parseMigrationRows(sqlText);

  if (rows.length === 0) {
    console.error('No UPDATE ... SET source_quote rows parsed out of the migration file.');
    return false;
  }

  const results = rows.map((row) => checkRow(row, normText));
  return printReport(results);
}

async function runDbMode(dbUrl: string): Promise<boolean> {
  if (!fs.existsSync(MIGRATION_PATH)) {
    console.error(`Migration file not found (needed to derive expected totals): ${MIGRATION_PATH}`);
    return false;
  }
  const expected = expectedCountsFromMigration(normalizeLineEndings(fs.readFileSync(MIGRATION_PATH, 'utf8')));

  const { default: postgres } = await import('postgres');
  const sql = postgres(dbUrl, { prepare: false, max: 1 });
  try {
    const normText = loadNormTextNormalized();

    const fieldRows = await sql<{ ws: string; key: string; quote: string }[]>`
      SELECT wt.code AS ws, f.symbol AS key, f.source_quote AS quote
      FROM fields f
      JOIN worksheet_templates wt ON f.worksheet_template_id = wt.id
      JOIN standards s ON wt.standard_id = s.id
      WHERE s.code = 'VSME' AND f.source_quote IS NOT NULL
    `;
    const eqRows = await sql<{ ws: string; key: string; quote: string }[]>`
      SELECT wt.code AS ws, eq.output_symbol AS key, eq.source_quote AS quote
      FROM equations eq
      JOIN worksheet_templates wt ON eq.worksheet_template_id = wt.id
      JOIN standards s ON wt.standard_id = s.id
      WHERE s.code = 'VSME' AND eq.source_quote IS NOT NULL
    `;
    const crRows = await sql<{ ws: string; key: string; quote: string }[]>`
      SELECT wt.code AS ws, cr.code AS key, cr.source_quote AS quote
      FROM compliance_requirements cr
      JOIN worksheet_templates wt ON cr.worksheet_template_id = wt.id
      JOIN standards s ON wt.standard_id = s.id
      WHERE s.code = 'VSME' AND cr.source_quote IS NOT NULL
    `;

    const rows: Row[] = [
      ...fieldRows.map((r) => ({ table: 'fields' as const, ws: r.ws, key: r.key, quote: r.quote })),
      ...eqRows.map((r) => ({ table: 'equations' as const, ws: r.ws, key: r.key, quote: r.quote })),
      ...crRows.map((r) => ({
        table: 'compliance_requirements' as const,
        ws: r.ws,
        key: r.key,
        quote: r.quote,
      })),
    ];

    if (rows.length === 0) {
      console.error('No VSME rows with a non-null source_quote found in the database.');
      return false;
    }

    const results = rows.map((row) => checkRow(row, normText));
    return printReport(results, expected);
  } finally {
    await sql.end();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dbIdx = args.indexOf('--db');
  const ok =
    dbIdx !== -1
      ? await runDbMode(args[dbIdx + 1])
      : await runFileMode();
  process.exit(ok ? 0 : 1);
}

// Only auto-run when executed directly (so the vitest test can import
// parseMigrationRows/checkRow/runFileMode-equivalent logic without triggering
// process.exit).
if (require.main === module) {
  main();
}

export {
  parseMigrationRows,
  checkRow,
  loadNormTextNormalized,
  normalizeLineEndings,
  runFileMode,
  printReport,
  expectedCountsFromMigration,
};
export type { Row, CheckResult, ExpectedCounts };
