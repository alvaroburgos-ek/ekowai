/**
 * TEST FIXTURE ONLY — anonymised A 138 chain shaped like case C4 (TEST-M820-C4-Hellenthal, ledger 2026-10-14).
 * KOSTRA-DWD-2020 cell 151093, exact DWD rN values (l/(s·ha)), columns T = 5 / 30 / 100 a.
 * Never import from app/UI code.
 */
export const KOSTRA_151093 = {
  D: [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 540, 720, 1080, 1440, 2880, 4320, 5760, 7200, 8640, 10080],
  T5: [340, 221.7, 171.1, 140.8, 107.2, 81.1, 66.1, 49.8, 40.7, 30.6, 24.9, 18.7, 14.0, 11.4, 8.5, 6.9, 4.2, 3.2, 2.6, 2.2, 1.9, 1.7],
  T30: [500, 328.3, 252.2, 208.3, 158.3, 119.6, 97.8, 73.7, 60.1, 45.1, 36.8, 27.5, 20.6, 16.8, 12.6, 10.3, 6.3, 4.7, 3.8, 3.3, 2.9, 2.6],
  T100: [630, 413.3, 317.8, 261.7, 198.9, 150.4, 123.1, 92.6, 75.6, 56.7, 46.3, 34.7, 26, 21.2, 15.8, 12.9, 7.9, 5.9, 4.8, 4.1, 3.6, 3.2],
} as const;

/** 1-D column as the iteration consumes it. */
export function rows(T: 5 | 30 | 100): Array<{ D_min: number; r_D_n: number }> {
  const col = T === 5 ? KOSTRA_151093.T5 : T === 30 ? KOSTRA_151093.T30 : KOSTRA_151093.T100;
  return KOSTRA_151093.D.map((d, i) => ({ D_min: d, r_D_n: col[i] }));
}

/** Native 2-D rainfall carrier (rainfall-tables.ts) as stored on A138-04 r_D_n_table. */
export function rainfallCarrier() {
  return {
    tables: [{
      id: 'kostra-151093', name: 'KOSTRA-DWD-2020 151093', source: 'KOSTRA-DWD-2020', gridCell: '151093',
      columns: [5, 30, 100],
      rows: KOSTRA_151093.D.map((d, i) => ({ D_min: d, r: { '5': KOSTRA_151093.T5[i], '30': KOSTRA_151093.T30[i], '100': KOSTRA_151093.T100[i] } })),
    }],
  };
}
