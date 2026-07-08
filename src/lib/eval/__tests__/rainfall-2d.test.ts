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

// ─────────────────────────────────────────────────────────────────────────────
// Task 6 bug fix: normalizeTable respects explicit legacyDesignColumn +
// treats empty rows as native (fresh/converted tables render the 2D matrix)
// ─────────────────────────────────────────────────────────────────────────────

describe('normalizeTable — empty-rows / explicit-flag logic (bug fix)', () => {
  it('empty fresh table (rows:[]) → legacyDesignColumn is falsy (native, NOT legacy)', () => {
    // Root-cause repro: detectNative2D([]) === false used to force legacyDesignColumn=true
    // on ANY empty table (editor's "Tabelle hinzufügen" + freshly-converted tables).
    const out = normalizeRainfallCarrier({
      tables: [{ id: 't', name: 'T', source: 'KOSTRA-DWD-2020', columns: [1,2,3,5,10,20,30,50,100], rows: [] }],
    });
    expect(out.tables[0].legacyDesignColumn).toBeFalsy();
  });

  it('converted-style table (rows with r:{}, no legacyDesignColumn) → native, r values preserved', () => {
    const out = normalizeRainfallCarrier({
      tables: [{ id: 'default', columns: [1,2,3,5,10,20,30,50,100], rows: [{ D_min: 30, r: { '5': 130 } }], legacyDesignColumn: undefined }],
    });
    expect(out.tables[0].legacyDesignColumn).toBeFalsy();
    expect(out.tables[0].rows[0].r['5']).toBe(130);
  });

  it('explicit legacyDesignColumn:true on empty rows → stays legacy (flag respected)', () => {
    const out = normalizeRainfallCarrier({
      tables: [{ id: 'x', rows: [], legacyDesignColumn: true }],
    });
    expect(out.tables[0].legacyDesignColumn).toBe(true);
  });

  it('Piece-2 1D (r_D_n rows, no flag, non-empty) → still legacy, __legacyValue carried', () => {
    // Back-compat must be preserved for existing stored data.
    const out = normalizeRainfallCarrier({
      tables: [{ id: 'p2', rows: [{ D_min: 30, r_D_n: 130 }] }],
    });
    expect(out.tables[0].legacyDesignColumn).toBe(true);
    const row = out.tables[0].rows[0] as { __legacyValue?: number | null };
    expect(row.__legacyValue).toBe(130);
  });
});
