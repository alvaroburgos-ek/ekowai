import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildValuetablePdf } from '../build-valuetable';
import type { ValuetableData, ValuetableRow } from '@/lib/pdf/load-valuetable';
import fixture from './fixtures/valuetable-a138-bess-2026-09-30.json';
import { pageContents, decodeHexStrings } from './_pdf-text';

/**
 * Exact Wertetabelle rows of TEST-A138-BESS-Mulde on 2026-09-30 (rebuilt from the 28 worksheets).
 * Prod returned 500 "unsupported number: -1.7793471615011557e+21" for this table: the dynamic
 * page-number footer fails once the document reaches ten pages (from 180 rows on). The builder
 * now renders a static footer and stamps the numbers with pdf-lib.
 */
const rows: ValuetableRow[] = (fixture as [string, string, string, string, string | null, string | null][]).map(
  ([worksheetCode, symbol, labelDe, value, unit, clauseReference]) => ({ worksheetCode, symbol, labelDe, value, unit, clauseReference }),
);
const data = (r: ValuetableRow[]): ValuetableData => ({
  project: { id: '1f37cae4', name: 'TEST-A138-BESS-Mulde', projectCode: null },
  standard: { code: 'DWA-A-138-1', titleDe: 'x', version: '2024-01' },
  rows: r, snapshotId: null, snapshotTakenAt: null, generatedAt: '2026-09-30T13:00:00Z',
});

describe('valuetable — prod row set (readiness run 2026-09-30)', () => {
  it(`renders all ${rows.length} rows across ≥ 10 pages with a page number on every page`, async () => {
    const buf = await buildValuetablePdf(data(rows));
    const count = (await PDFDocument.load(buf)).getPageCount();
    expect(count).toBeGreaterThanOrEqual(10);
    const pages = await pageContents(buf);
    pages.forEach((raw, i) => expect(decodeHexStrings(raw)).toContain(`Seite ${i + 1} / ${count}`));
  });
  for (const n of [180, 183, 185]) {
    it(`renders the first ${n} rows (the lengths that failed on prod)`, async () => {
      await expect(buildValuetablePdf(data(rows.slice(0, n)))).resolves.toBeTruthy();
    });
  }
});
