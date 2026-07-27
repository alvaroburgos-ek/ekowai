import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseMigrationRows,
  checkRow,
  loadNormTextNormalized,
  normalizeLineEndings,
  printReport,
  expectedCountsFromMigration,
} from '../verify-source-quotes';

const MIGRATION_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'migrations',
  '20260727120000_vsme_source_quotes.sql',
);
const NORM_TEXT_PATH = path.resolve(__dirname, '..', '..', '..', 'data', 'norm-text', 'VSME.md');

describe('verify-source-quotes (--file mode, programmatic)', () => {
  it('the staged migration file exists', () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  it('parses exactly 177 UPDATE ... SET source_quote rows (138 fields + 8 equations + 31 CRs)', () => {
    const sqlText = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const rows = parseMigrationRows(sqlText);
    expect(rows).toHaveLength(177);
    expect(rows.filter((r) => r.table === 'fields')).toHaveLength(138);
    expect(rows.filter((r) => r.table === 'equations')).toHaveLength(8);
    expect(rows.filter((r) => r.table === 'compliance_requirements')).toHaveLength(31);
  });

  it('every parsed row is a verbatim (whitespace-normalized) substring of VSME.md', () => {
    const sqlText = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const normText = loadNormTextNormalized();
    const rows = parseMigrationRows(sqlText);
    const failures = rows.map((row) => checkRow(row, normText)).filter((r) => !r.ok);
    if (failures.length > 0) {
      const detail = failures
        .map((f) => `  [${f.row.table}] ${f.row.ws}/${f.row.key}: ${f.reason}`)
        .join('\n');
      throw new Error(`${failures.length} quote(s) failed verbatim check:\n${detail}`);
    }
    expect(failures).toHaveLength(0);
  });

  it('every row ends in a well-formed "[p.N]" page tag', () => {
    const sqlText = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const rows = parseMigrationRows(sqlText);
    for (const row of rows) {
      expect(row.quote, `${row.table}/${row.key}`).toMatch(/\[p\.\d+\]$/);
    }
  });

  it('detects a corrupted quote as a failure (negative control)', () => {
    const normText = loadNormTextNormalized();
    const bad = {
      table: 'fields' as const,
      ws: 'VSME-B01.000',
      key: 'BasisForPreparation',
      quote: 'this text does not appear anywhere in the VSME standard [p.8]',
    };
    const result = checkRow(bad, normText);
    expect(result.ok).toBe(false);
  });

  it('rejects a quote missing the page tag', () => {
    const normText = loadNormTextNormalized();
    const bad = {
      table: 'fields' as const,
      ws: 'VSME-B01.000',
      key: 'BasisForPreparation',
      quote: 'which of the following options it has selected',
    };
    const result = checkRow(bad, normText);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/page tag/);
  });
});

describe('expectedCountsFromMigration', () => {
  it('derives 138 fields / 8 equations / 31 compliance_requirements from the migration file', () => {
    const sqlText = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const expected = expectedCountsFromMigration(sqlText);
    expect(expected).toEqual({ fields: 138, equations: 8, compliance_requirements: 31 });
  });
});

describe('--file check is CRLF-safe (regression)', () => {
  // A repo without a `.gitattributes` pin materializes both
  // `scripts/migrations/*.sql` and `data/norm-text/*.md` with CRLF line
  // endings on a fresh Windows checkout (core.autocrlf=true). Two things
  // break if that CRLF text is used unnormalized:
  //   - `parseMigrationRows`'s statement regex anchors on literal `\n`
  //     sequences between the clauses of each `UPDATE ... SET source_quote`
  //     statement; every `\r\n` in the file breaks that literal match, so
  //     zero rows parse out of a CRLF migration file.
  //   - `loadNormTextNormalized`'s substring check would still tolerate
  //     stray `\r` (it whitespace-collapses), but is exercised here anyway
  //     for full "--file check" parity.
  // `runFileMode` normalizes both inputs via `normalizeLineEndings` at read
  // time (see verify-source-quotes.ts); this test reproduces that same
  // pipeline directly against CRLF-converted copies of the real committed
  // migration file and VSME.md, and asserts identical results to the LF
  // (as-committed) versions.
  const lfSqlText = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const lfNormRaw = fs.readFileSync(NORM_TEXT_PATH, 'utf8');
  const crlfSqlText = normalizeLineEndings(lfSqlText).replace(/\n/g, '\r\n');
  const crlfNormRaw = normalizeLineEndings(lfNormRaw).replace(/\n/g, '\r\n');

  it('parses the same 177 rows (138 fields + 8 equations + 31 CRs) from a CRLF migration file', () => {
    const rows = parseMigrationRows(normalizeLineEndings(crlfSqlText));
    expect(rows).toHaveLength(177);
    expect(rows.filter((r) => r.table === 'fields')).toHaveLength(138);
    expect(rows.filter((r) => r.table === 'equations')).toHaveLength(8);
    expect(rows.filter((r) => r.table === 'compliance_requirements')).toHaveLength(31);
  });

  it('every row from the CRLF migration file still verifies verbatim against CRLF VSME.md', () => {
    const rows = parseMigrationRows(normalizeLineEndings(crlfSqlText));
    const normText = normalizeLineEndings(crlfNormRaw).replace(/\s+/g, ' ').trim();
    const failures = rows.map((row) => checkRow(row, normText)).filter((r) => !r.ok);
    expect(failures).toHaveLength(0);
  });

  it('derives the same expected counts from a CRLF migration file', () => {
    const expected = expectedCountsFromMigration(normalizeLineEndings(crlfSqlText));
    expect(expected).toEqual({ fields: 138, equations: 8, compliance_requirements: 31 });
  });

  it('WITHOUT normalization, a CRLF migration file fails to parse (proves the bug this test guards against)', () => {
    const rows = parseMigrationRows(crlfSqlText);
    expect(rows.length).toBe(0);
  });
});

describe('--db mode expected-total shortfall guard (simulated, no live DB required)', () => {
  // Reproduces the real-world failure mode from FIX-round-1 Finding 2: applying
  // the migration BEFORE the Task 10 Step 2 Pass3c re-import re-hosts
  // compliance_requirements means 23 of the 31 CR UPDATEs match zero rows on
  // the legacy VSME-B01.000-only topology and silently no-op. A DB query that
  // only ever selects `source_quote IS NOT NULL` would report those 8
  // surviving CRs as "8/8 verified" (100%, vacuously) unless compared against
  // the migration's own expected total (31). This simulates exactly that: a
  // "DB" result set containing every field/equation row plus only the 8 CR
  // rows that still resolve on the legacy topology (VSME-B01.000-hosted).
  const sqlText = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const normText = loadNormTextNormalized();
  const expected = expectedCountsFromMigration(sqlText);
  const allRows = parseMigrationRows(sqlText);

  it('flags a shortfall and fails when 23/31 compliance_requirements rows are missing', () => {
    const simulatedDbRows = allRows.filter(
      (r) => r.table !== 'compliance_requirements' || r.ws === 'VSME-B01.000',
    );
    // Sanity: the simulated legacy-topology DB really is short exactly the
    // 23 re-hosted CRs (31 total - 8 still on VSME-B01.000 = 23 missing).
    const simulatedCrCount = simulatedDbRows.filter((r) => r.table === 'compliance_requirements').length;
    expect(simulatedCrCount).toBe(8);
    expect(expected.compliance_requirements).toBe(31);

    const results = simulatedDbRows.map((row) => checkRow(row, normText));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const ok = printReport(results, expected);
      expect(ok).toBe(false); // must FAIL even though every present row verifies verbatim
      const printed = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(printed).toMatch(/SHORTFALL/);
      expect(printed).toMatch(/compliance_requirements/);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('passes when the full expected set is present (positive control)', () => {
    const results = allRows.map((row) => checkRow(row, normText));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const ok = printReport(results, expected);
      expect(ok).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('--file mode (no expected argument) is unaffected by the shortfall guard', () => {
    // Same partial set as the shortfall test above, but called the way --file
    // mode calls printReport (no `expected` argument) — must NOT fail purely
    // on count, only on verbatim-correctness of what's present.
    const simulatedDbRows = allRows.filter(
      (r) => r.table !== 'compliance_requirements' || r.ws === 'VSME-B01.000',
    );
    const results = simulatedDbRows.map((row) => checkRow(row, normText));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const ok = printReport(results); // no expected -> old, unchanged behaviour
      expect(ok).toBe(true); // every present row is verbatim-correct -> passes
    } finally {
      logSpy.mockRestore();
    }
  });
});
