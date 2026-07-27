import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseMigrationRows,
  checkRow,
  loadNormTextNormalized,
} from '../verify-source-quotes';

const MIGRATION_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'migrations',
  '20260727120000_vsme_source_quotes.sql',
);

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
