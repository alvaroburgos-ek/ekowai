import { describe, it, expect } from 'vitest';
import { normalizeRainfallCarrier } from '../rainfall-tables';

describe('normalizeRainfallCarrier', () => {
  it('wraps a legacy { rows } carrier as one engineer table (id "default")', () => {
    const out = normalizeRainfallCarrier({ rows: [{ D_min: 5, r_D_n: 300 }, { D_min: 10, r_D_n: 220 }] });
    expect(out).toEqual({
      tables: [
        {
          id: 'default',
          name: 'Standardtabelle',
          source: 'engineer',
          rows: [{ D_min: 5, r_D_n: 300 }, { D_min: 10, r_D_n: 220 }],
        },
      ],
    });
  });

  it('passes a new { tables } carrier through (normalized)', () => {
    const out = normalizeRainfallCarrier({
      tables: [{ id: 'k1', name: 'KOSTRA Krefeld', source: 'KOSTRA-DWD-2020', gridCell: '137089', rows: [{ D_min: 10, r_D_n: 220 }] }],
    });
    expect(out.tables).toHaveLength(1);
    expect(out.tables[0].id).toBe('k1');
    expect(out.tables[0].source).toBe('KOSTRA-DWD-2020');
    expect(out.tables[0].gridCell).toBe('137089');
    expect(out.tables[0].rows).toEqual([{ D_min: 10, r_D_n: 220 }]);
  });

  it('coerces non-finite/absent cell values to null and keeps row shape', () => {
    const out = normalizeRainfallCarrier({ rows: [{ D_min: 5, r_D_n: 'x' }, { D_min: null, r_D_n: 7 }] });
    expect(out.tables[0].rows).toEqual([{ D_min: 5, r_D_n: null }, { D_min: null, r_D_n: 7 }]);
  });

  it('returns { tables: [] } on malformed input', () => {
    expect(normalizeRainfallCarrier(null)).toEqual({ tables: [] });
    expect(normalizeRainfallCarrier({})).toEqual({ tables: [] });
    expect(normalizeRainfallCarrier({ tables: 'x' })).toEqual({ tables: [] });
  });
});
