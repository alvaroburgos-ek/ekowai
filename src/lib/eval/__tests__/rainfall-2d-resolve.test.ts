import { describe, it, expect } from 'vitest';
import { normalizeRainfallCarrier, resolveColumn } from '../rainfall-tables';

const grid = normalizeRainfallCarrier({ tables: [{ id: 'g', name: 'G', source: 'KOSTRA-DWD-2020', columns: [5, 30], rows: [
  { D_min: 15, r: { '5': 195, '30': 260 } }, { D_min: 30, r: { '5': 130, '30': 180 } } ] }] }).tables[0];

describe('resolveColumn', () => {
  it('slices the requested T_n column to 1D rows', () => {
    expect(resolveColumn(grid, 5).map(r => [r.D_min, r.r_D_n])).toEqual([[15,195],[30,130]]);
    expect(resolveColumn(grid, 30).map(r => r.r_D_n)).toEqual([260,180]);
  });
  it('missing column → null r_D_n cells', () => {
    expect(resolveColumn(grid, 100).every(r => r.r_D_n === null)).toBe(true);
  });
  it('legacy design column serves any T_n', () => {
    const legacy = normalizeRainfallCarrier({ rows: [{ D_min: 30, r_D_n: 130 }] }).tables[0];
    expect(resolveColumn(legacy, 5)[0].r_D_n).toBe(130);
    expect(resolveColumn(legacy, 30)[0].r_D_n).toBe(130);
  });
});
