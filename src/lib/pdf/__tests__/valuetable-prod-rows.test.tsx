import { describe, it, expect } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { ValuetableDocument } from '@/components/pdf/valuetable-document';
import type { ValuetableData, ValuetableRow } from '@/lib/pdf/load-valuetable';
import fixture from './fixtures/valuetable-a138-bess-2026-09-30.json';

/** Exact Wertetabelle rows of TEST-A138-BESS-Mulde on 2026-09-30 (rebuilt from the 28 worksheets). */
const rows: ValuetableRow[] = (fixture as [string, string, string, string, string | null, string | null][]).map(
  ([worksheetCode, symbol, labelDe, value, unit, clauseReference]) => ({ worksheetCode, symbol, labelDe, value, unit, clauseReference }),
);
const data = (r: ValuetableRow[]): ValuetableData => ({
  project: { id: '1f37cae4', name: 'TEST-A138-BESS-Mulde', projectCode: null },
  standard: { code: 'DWA-A-138-1', titleDe: 'x', version: '2024-01' },
  rows: r, snapshotId: null, snapshotTakenAt: null, generatedAt: '2026-09-30T13:00:00Z',
});

describe('valuetable — prod row set (readiness run 2026-09-30)', () => {
  it(`renders all ${rows.length} rows`, async () => {
    const buf = await renderToBuffer(<ValuetableDocument data={data(rows)} />);
    expect(buf.length).toBeGreaterThan(100);
  });
  it('renders first half', async () => {
    await expect(renderToBuffer(<ValuetableDocument data={data(rows.slice(0, Math.floor(rows.length / 2)))} />)).resolves.toBeTruthy();
  });
  it('renders second half', async () => {
    await expect(renderToBuffer(<ValuetableDocument data={data(rows.slice(Math.floor(rows.length / 2)))} />)).resolves.toBeTruthy();
  });
});
