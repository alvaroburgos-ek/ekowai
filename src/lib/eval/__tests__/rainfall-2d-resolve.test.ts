import { describe, it, expect } from 'vitest';
import { normalizeRainfallCarrier, resolveColumn } from '../rainfall-tables';

const grid = normalizeRainfallCarrier({ tables: [{ id: 'g', name: 'G', source: 'KOSTRA-DWD-2020', columns: [5, 30], rows: [
  { D_min: 15, r: { '5': 195, '30': 260 } }, { D_min: 30, r: { '5': 130, '30': 180 } } ] }] }).tables[0];

describe('resolveColumn (tagged, Task 3)', () => {
  it('exact T_n column present → {status:"ok", rows}', () => {
    const res5 = resolveColumn(grid, 5);
    expect(res5.status).toBe('ok');
    expect(res5.rows.map(r => [r.D_min, r.r_D_n])).toEqual([[15, 195], [30, 130]]);

    const res30 = resolveColumn(grid, 30);
    expect(res30.status).toBe('ok');
    expect(res30.rows.map(r => r.r_D_n)).toEqual([260, 180]);
  });

  it('native grid, absent column → {status:"missing", rows:[]}', () => {
    const res = resolveColumn(grid, 100);
    expect(res.status).toBe('missing');
    expect(res.rows).toEqual([]);
  });

  it('legacy table + designReturnPeriod === T_n → {status:"legacy", rows}', () => {
    const legacy = normalizeRainfallCarrier({ rows: [{ D_min: 30, r_D_n: 130 }] }).tables[0];
    const res = resolveColumn(legacy, 5, { designReturnPeriod: 5 });
    expect(res.status).toBe('legacy');
    expect(res.rows[0].r_D_n).toBe(130);
  });

  it('legacy table + different T_n (not design) → {status:"missing", rows:[]}', () => {
    const legacy = normalizeRainfallCarrier({ rows: [{ D_min: 30, r_D_n: 130 }] }).tables[0];
    // designReturnPeriod = 5, asking for T_n = 10 → missing
    const res = resolveColumn(legacy, 10, { designReturnPeriod: 5 });
    expect(res.status).toBe('missing');
    expect(res.rows).toEqual([]);
  });

  it('legacy table + no opts (no designReturnPeriod) → {status:"missing", rows:[]}', () => {
    const legacy = normalizeRainfallCarrier({ rows: [{ D_min: 30, r_D_n: 130 }] }).tables[0];
    const res = resolveColumn(legacy, 5);
    expect(res.status).toBe('missing');
    expect(res.rows).toEqual([]);
  });
});
