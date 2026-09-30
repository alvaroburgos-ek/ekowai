import { describe, it, expect, vi } from 'vitest';
import type { ValuetableData } from '@/lib/pdf/load-valuetable';

/**
 * Readiness run 2026-09-30: prod returned 500 "unsupported number: -1.77e+21" for the
 * DWA-A-138-1 Wertetabelle and no local input reproduced it. The builder therefore names
 * the rows the renderer cannot draw (bisection) instead of surfacing an opaque message.
 */
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn(async (el: { props: { data: ValuetableData } }) => {
    const rows = el.props.data.rows;
    if (rows.some((r) => r.symbol.startsWith('BAD'))) throw new Error('unsupported number: -1.7793471615011557e+21');
    return Buffer.from('%PDF-ok');
  }),
}));
vi.mock('@/components/pdf/valuetable-document', () => ({
  ValuetableDocument: (props: { data: ValuetableData }) => ({ props }),
}));
vi.mock('@/lib/pdf/load-valuetable', () => ({ loadValuetableData: vi.fn() }));

import { buildValuetablePdf, ValuetableRenderError } from '../build-valuetable';

const row = (symbol: string): ValuetableData['rows'][number] => ({
  worksheetCode: 'A138-13', symbol, labelDe: symbol, value: '1', unit: null, clauseReference: null,
});
const data = (rows: ValuetableData['rows']): ValuetableData => ({
  project: { id: 'p', name: 'n', projectCode: null },
  standard: { code: 'DWA-A-138-1', titleDe: 't', version: '2024' },
  rows, snapshotId: null, snapshotTakenAt: null, generatedAt: '2026-09-30T00:00:00Z',
});

describe('buildValuetablePdf — names the rows the renderer cannot draw', () => {
  it('renders normally when nothing fails', async () => {
    const buf = await buildValuetablePdf(data([row('a'), row('b')]));
    expect(buf.toString()).toBe('%PDF-ok');
  });
  it('bisects to the single offending row and keeps the original message', async () => {
    const rows = Array.from({ length: 37 }, (_, i) => row(i === 23 ? 'BAD_x' : `s${i}`));
    const err = await buildValuetablePdf(data(rows)).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValuetableRenderError);
    const e = err as ValuetableRenderError;
    expect(e.message).toContain('unsupported number');
    expect(e.offendingRows.map((r) => r.symbol)).toEqual(['BAD_x']);
  });
  it('finds several offenders', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => row(i === 2 || i === 17 ? `BAD_${i}` : `s${i}`));
    const err = (await buildValuetablePdf(data(rows)).catch((e: unknown) => e)) as ValuetableRenderError;
    expect(err.offendingRows.map((r) => r.symbol)).toEqual(['BAD_2', 'BAD_17']);
  });
});
