import { describe, it, expect } from 'vitest';
import { normalizeRainfallCarrier, RETURN_PERIODS } from '../rainfall-tables';

describe('normalizeRainfallCarrier', () => {
  // Updated to the 2D shape: legacy {rows} now produces legacyDesignColumn:true,
  // columns=[...RETURN_PERIODS], and rows carry __legacyValue instead of r_D_n.
  it('wraps a legacy { rows } carrier as one engineer table (id "default") with legacyDesignColumn', () => {
    const out = normalizeRainfallCarrier({ rows: [{ D_min: 5, r_D_n: 300 }, { D_min: 10, r_D_n: 220 }] });
    expect(out.tables).toHaveLength(1);
    const t = out.tables[0];
    expect(t.id).toBe('default');
    expect(t.name).toBe('Standardtabelle');
    expect(t.source).toBe('engineer');
    expect(t.legacyDesignColumn).toBe(true);
    expect(t.columns).toEqual([...RETURN_PERIODS]);
    // Legacy value carried under __legacyValue; r is an empty map until grid is filled
    expect(t.rows[0].D_min).toBe(5);
    expect(t.rows[0].__legacyValue).toBe(300);
    expect(t.rows[1].D_min).toBe(10);
    expect(t.rows[1].__legacyValue).toBe(220);
  });

  // Updated: Piece-2 {tables:[{rows:[{D_min,r_D_n}]}]} now produces legacyDesignColumn:true
  // and 2D grid rows with __legacyValue. Other metadata (id, source, gridCell) unchanged.
  it('passes a new { tables } carrier through (normalized to 2D legacy shape)', () => {
    const out = normalizeRainfallCarrier({
      tables: [{ id: 'k1', name: 'KOSTRA Krefeld', source: 'KOSTRA-DWD-2020', gridCell: '137089', rows: [{ D_min: 10, r_D_n: 220 }] }],
    });
    expect(out.tables).toHaveLength(1);
    expect(out.tables[0].id).toBe('k1');
    expect(out.tables[0].source).toBe('KOSTRA-DWD-2020');
    expect(out.tables[0].gridCell).toBe('137089');
    expect(out.tables[0].legacyDesignColumn).toBe(true);
    // 2D shape: __legacyValue holds the coerced r_D_n value; r:{} is the empty 2D map
    expect(out.tables[0].rows[0].D_min).toBe(10);
    expect(out.tables[0].rows[0].__legacyValue).toBe(220);
  });

  // Updated: coercion still works but result is in the new 2D row shape (r:{}, __legacyValue).
  it('coerces non-finite/absent cell values to null and keeps row shape', () => {
    const out = normalizeRainfallCarrier({ rows: [{ D_min: 5, r_D_n: 'x' }, { D_min: null, r_D_n: 7 }] });
    expect(out.tables[0].rows[0].D_min).toBe(5);
    expect(out.tables[0].rows[0].__legacyValue).toBe(null); // 'x' → null
    expect(out.tables[0].rows[1].D_min).toBe(null);
    expect(out.tables[0].rows[1].__legacyValue).toBe(7);
  });

  it('returns { tables: [] } on malformed input', () => {
    expect(normalizeRainfallCarrier(null)).toEqual({ tables: [] });
    expect(normalizeRainfallCarrier({})).toEqual({ tables: [] });
    expect(normalizeRainfallCarrier({ tables: 'x' })).toEqual({ tables: [] });
  });
});
