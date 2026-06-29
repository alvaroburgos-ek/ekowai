import { describe, it, expect } from 'vitest';
import { normalizeRainfallCarrier, RETURN_PERIODS } from '../rainfall-tables';

describe('normalizeRainfallCarrier (2D)', () => {
  it('wraps a legacy {rows} curve as one design-column 2D table', () => {
    const out = normalizeRainfallCarrier({ rows: [{ D_min: 30, r_D_n: 130 }] });
    expect(out.tables).toHaveLength(1);
    const t = out.tables[0];
    expect(t.legacyDesignColumn).toBe(true);
    expect(t.columns).toEqual([...RETURN_PERIODS]);
    expect(t.rows[0].D_min).toBe(30);
  });
  it('wraps a Piece-2 {tables:[{rows}]} curve as design-column 2D tables', () => {
    const out = normalizeRainfallCarrier({ tables: [{ id: 'k1', name: 'A', source: 'KOSTRA-DWD-2020', rows: [{ D_min: 30, r_D_n: 130 }] }] });
    expect(out.tables[0].legacyDesignColumn).toBe(true);
    expect(out.tables[0].id).toBe('k1');
  });
  it('passes a native 2D grid through', () => {
    const out = normalizeRainfallCarrier({ tables: [{ id: 'g', name: 'G', source: 'KOSTRA-DWD-2020', columns: [5, 30], rows: [{ D_min: 30, r: { '5': 130, '30': 200 } }] }] });
    expect(out.tables[0].legacyDesignColumn).toBeFalsy();
    expect(out.tables[0].rows[0].r['30']).toBe(200);
  });
  it('malformed → {tables: []}', () => {
    expect(normalizeRainfallCarrier(null)).toEqual({ tables: [] });
  });
});
