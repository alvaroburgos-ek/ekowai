/**
 * Reproduction (no DB): run materializeBasinGoverning with the EXACT persisted inputs of the prod test project
 * TEST-A138-BESS-Mulde (read through the MCP API on 2026-09-30) to find why A138-13's r_D_n / D_min stay null
 * while the client card computes D = 540 min, r_D = 14,6, V_VA = 16,9833 m³.
 * Run: pnpm exec tsx scripts/verification/repro-basin-governing-bess.ts
 */
import { materializeBasinGoverning } from '@/lib/eval/materialize-basin-governing';
import { facilityReturnPeriod, normalizeRainfallCarrier, resolveSelectedTable, resolveColumn } from '@/lib/eval/rainfall-tables';

const R: [number, number, number, number][] = [
  [5, 200, 313.3, 366.7], [10, 133.3, 208.3, 243.3], [15, 103.3, 160, 187.8], [20, 85, 132.5, 155], [30, 64.4, 100, 117.2],
  [45, 48.5, 75.2, 88.1], [60, 39.4, 61.4, 71.9], [90, 29.4, 45.9, 53.7], [120, 23.9, 37.2, 43.6], [180, 17.8, 27.7, 32.5],
  [240, 14.4, 22.5, 26.3], [360, 10.7, 16.7, 19.6], [540, 8, 12.4, 14.6], [720, 6.5, 10, 11.8], [1080, 4.8, 7.5, 8.8],
  [1440, 3.9, 6, 7.1], [2880, 2.3, 3.6, 4.3], [4320, 1.7, 2.7, 3.2], [5760, 1.4, 2.2, 2.6], [7200, 1.2, 1.8, 2.2],
  [8640, 1, 1.6, 1.9], [10080, 0.9, 1.4, 1.7],
];
const carrierRaw = {
  tables: [{
    id: '4e080a11-527e-4a51-ac40-683c57643818', name: 'KOSTRA-DWD-2020 Zelle 123107', source: 'KOSTRA-DWD-2020',
    columns: [1, 2, 3, 5, 10, 20, 30, 50, 100],
    rows: R.map(([D_min, r1, r5, r10]) => ({ D_min, r: { '1': r1, '5': r5, '10': r10 } })),
  }],
};
const rainfallTableRef = '4e080a11-527e-4a51-ac40-683c57643818';
const persisted: Record<string, number | null> = { n: 0.1, T_n: null, A_C: 162.20000000000002, A_VA: 250, Q_S: 0.16499999999999998, Q_Dr: null, f_Z: 1.2, f_A: 1 };
const pick = (s: string) => persisted[s] ?? null;
const T_n = facilityReturnPeriod('A138-13', pick);
console.log('T_n resolved:', T_n);
const carrier = normalizeRainfallCarrier(carrierRaw);
console.log('carrier tables:', carrier.tables.length, 'rows in first:', carrier.tables[0]?.rows?.length);
const table = resolveSelectedTable(carrier, rainfallTableRef);
console.log('selected table:', table ? table.id : null);
if (table) { const col = resolveColumn(table, T_n); console.log('column resolution:', col.status, 'rows:', (col as { rows?: unknown[] }).rows?.length, JSON.stringify((col as { rows?: unknown[] }).rows?.slice(0, 2))); }
const scalars = { A_C: persisted.A_C as number, A_VA: persisted.A_VA as number, Q_S: persisted.Q_S as number, Q_Dr: persisted.Q_Dr ?? 0, f_Z: persisted.f_Z as number, f_A: persisted.f_A as number };
const out = materializeBasinGoverning({ carrierRaw, rainfallTableRef, T_n, scalars });
console.log('materializeBasinGoverning →', out, '(expected r_D_n 14.6, D_min 540)');
