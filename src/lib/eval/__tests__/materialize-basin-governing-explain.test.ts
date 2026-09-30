// Readiness run 2026-09-30 (BESS case): the governing pair r_D_n / D_min stayed null on prod although the client
// card computed D = 540 min, r_D = 14,6. The pure resolver is proven here with the EXACT persisted production
// inputs (KOSTRA-DWD-2020 cell 123107, T 10 a, A_C 162,2, A_VA 250, Q_S 0,165, f_Z 1,2, f_A 1), and the new
// explain helper names the first missing prerequisite instead of a silent null.
import { describe, it, expect } from 'vitest';
import { materializeBasinGoverning, explainBasinGoverningGap } from '../materialize-basin-governing';

const R: [number, number, number, number][] = [
  [5, 200, 313.3, 366.7], [10, 133.3, 208.3, 243.3], [15, 103.3, 160, 187.8], [20, 85, 132.5, 155], [30, 64.4, 100, 117.2],
  [45, 48.5, 75.2, 88.1], [60, 39.4, 61.4, 71.9], [90, 29.4, 45.9, 53.7], [120, 23.9, 37.2, 43.6], [180, 17.8, 27.7, 32.5],
  [240, 14.4, 22.5, 26.3], [360, 10.7, 16.7, 19.6], [540, 8, 12.4, 14.6], [720, 6.5, 10, 11.8], [1080, 4.8, 7.5, 8.8],
  [1440, 3.9, 6, 7.1], [2880, 2.3, 3.6, 4.3], [4320, 1.7, 2.7, 3.2], [5760, 1.4, 2.2, 2.6], [7200, 1.2, 1.8, 2.2],
  [8640, 1, 1.6, 1.9], [10080, 0.9, 1.4, 1.7],
];
const TABLE_ID = '4e080a11-527e-4a51-ac40-683c57643818';
const carrierRaw = {
  tables: [{ id: TABLE_ID, name: 'KOSTRA-DWD-2020 Zelle 123107', source: 'KOSTRA-DWD-2020', columns: [1, 2, 3, 5, 10, 20, 30, 50, 100],
    rows: R.map(([D_min, r1, r5, r10]) => ({ D_min, r: { '1': r1, '5': r5, '10': r10 } })) }],
};
const scalars = { A_C: 162.20000000000002, A_VA: 250, Q_S: 0.16499999999999998, Q_Dr: 0, f_Z: 1.2, f_A: 1 };

describe('materializeBasinGoverning — BESS production inputs', () => {
  it('yields the governing pair the client card shows (D 540 min, r_D 14,6)', () => {
    const out = materializeBasinGoverning({ carrierRaw, rainfallTableRef: TABLE_ID, T_n: 10, scalars });
    expect(out).toEqual({ r_D_n: 14.6, D_min: 540 });
    expect(explainBasinGoverningGap({ carrierRaw, rainfallTableRef: TABLE_ID, T_n: 10, scalars })).toBeNull();
  });
  it('a stale table ref falls back to the primary table (same result)', () => {
    expect(materializeBasinGoverning({ carrierRaw, rainfallTableRef: 'stale', T_n: 10, scalars })).toEqual({ r_D_n: 14.6, D_min: 540 });
  });
});

describe('explainBasinGoverningGap — names the first missing prerequisite', () => {
  it('missing scalar', () => {
    const s = { ...scalars, A_C: null as unknown as number };
    expect(materializeBasinGoverning({ carrierRaw, rainfallTableRef: TABLE_ID, T_n: 10, scalars: s })).toBeNull();
    expect(explainBasinGoverningGap({ carrierRaw, rainfallTableRef: TABLE_ID, T_n: 10, scalars: s })).toMatch(/Eingang fehlt \(A_C\)/);
  });
  it('no carrier', () => {
    expect(explainBasinGoverningGap({ carrierRaw: null, rainfallTableRef: TABLE_ID, T_n: 10, scalars })).toMatch(/keine Regenspendentabelle/);
  });
  it('T_n not determinable on a native 2D table', () => {
    expect(explainBasinGoverningGap({ carrierRaw, rainfallTableRef: TABLE_ID, T_n: null, scalars })).toMatch(/Wiederkehrzeit T_n/);
  });
  it('return-period column absent from the table', () => {
    expect(explainBasinGoverningGap({ carrierRaw, rainfallTableRef: TABLE_ID, T_n: 50, scalars })).toMatch(/Spalte T = 50 a fehlt/);
  });
});
