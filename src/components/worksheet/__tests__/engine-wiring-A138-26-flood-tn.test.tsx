/**
 * F-A7 — live form (useEquationEngine): A138-26 Gl. (10) iterates the KOSTRA
 * column of T_n_Ue (§ 5.3.4.1: T_n = 100 a → r_D(100)), default 30 a when
 * empty, manual_required when the chosen column is missing from the grid.
 * Hellenthal values: T 100 → 55.3057 m³ @ D = 10080; T 30 → 31.6401 m³.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEffect, useMemo } from 'react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import type { EvalState } from '@/lib/eval/formula';

const GL10_ID = '8e3c7e22-e3c7-449a-b267-928332c89306';
const GL10_FORMULA =
  'V_Rueck = ((r_D(T_n_Ue) * (SUM(A_E_b_a * C_S) + A_VA) / 10000) - (Q_S + Q_Dr)) * D * 60 / 1000 - V_VA';

const SYMS = ['A_C_s_flood', 'A_VA', 'Q_S', 'Q_Dr', 'V_VA', 'T_n_Ue', 'r_D_n_table', 'r_D_30', 'D_min', 'V_Rueck'] as const;
const id = (s: string) => `fx-a138-26-${s}`;
const UNITS: Record<string, string | null> = {
  A_C_s_flood: 'm²', A_VA: 'm²', Q_S: 'l/s', Q_Dr: 'l/s', V_VA: 'm³', T_n_Ue: 'a',
  r_D_n_table: 'l/(s·ha)', r_D_30: 'l/(s·ha)', D_min: 'min', V_Rueck: 'm³',
};
const FIELDS = SYMS.map((s) => ({ id: id(s), symbol: s, unit: UNITS[s] }));
const EQUATIONS = [{
  id: GL10_ID, equationNumber: '10', formula: GL10_FORMULA,
  inputSymbols: ['r_D(T_n_Ue)', 'A_E_b_a', 'C_S', 'A_VA', 'Q_S', 'Q_Dr', 'D', 'V_VA'],
  outputSymbol: 'V_Rueck',
}];

const D = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 540, 720, 1080, 1440, 2880, 4320, 5760, 7200, 8640, 10080];
const T100 = [630, 413.3, 317.8, 261.7, 198.9, 150.4, 123.1, 92.6, 75.6, 56.7, 46.3, 34.7, 26, 21.2, 15.8, 12.9, 7.9, 5.9, 4.8, 4.1, 3.6, 3.2];
const T30 = [500, 328.3, 252.2, 208.3, 158.3, 119.6, 97.8, 73.7, 60.1, 45.1, 36.8, 27.5, 20.6, 16.8, 12.6, 10.3, 6.3, 4.7, 3.8, 3.3, 2.9, 2.6];
// 50 = SYNTHETIC probe column (reuses the T 100 values; not a KOSTRA T 50 curve).
const grid = (cols: Array<30 | 50 | 100>) => ({
  tables: [{
    id: 'k151093', name: 'KOSTRA-DWD-2020 Zelle 151093', source: 'KOSTRA-DWD-2020', columns: cols,
    rows: D.map((d, i) => ({
      D_min: d,
      r: Object.fromEntries(cols.map((c) => [String(c), c === 30 ? T30[i] : T100[i]])),
    })),
  }],
});

const V_VA = 70.00375052159998;

let latest: EvalState | undefined;
const capture = (s: EvalState | undefined) => { latest = s; };
function Harness({ onState }: { onState: (s: EvalState | undefined) => void }) {
  const fields = useMemo(() => FIELDS, []);
  const { engineStates } = useEquationEngine({ worksheetCode: 'A138-26', fields, equations: EQUATIONS });
  const state = engineStates[GL10_ID];
  useEffect(() => { onState(state); }, [onState, state]);
  return null;
}

function setNum(sym: string, value: number | null) {
  act(() => { useWorksheetStore.getState().setField(id(sym), { type: 'number', value }); });
}
function setJson(sym: string, value: unknown) {
  act(() => { useWorksheetStore.getState().setField(id(sym), { type: 'json', value }); });
}
function load(T_n_Ue: number | null, cols: Array<30 | 50 | 100> | 'legacy') {
  render(<Harness onState={capture} />);
  setNum('A_C_s_flood', 602.161);
  setNum('A_VA', 50);
  setNum('Q_S', 0.0015);
  setNum('Q_Dr', 0);
  setNum('V_VA', V_VA);
  setNum('T_n_Ue', T_n_Ue);
  setJson('r_D_n_table', cols === 'legacy' ? { rows: D.map((d, i) => ({ D_min: d, r_D_n: T30[i] })) } : grid(cols));
}
const stored = (sym: string) => {
  const v = useWorksheetStore.getState().values[id(sym)];
  return v?.type === 'number' ? v.value : null;
};

describe('A138-26 Gl. 10 live form — flood column follows T_n_Ue', () => {
  beforeEach(() => {
    latest = undefined;
    act(() => { useWorksheetStore.getState().init('fx-a138-26', {}, {}, {}); });
  });

  it('T_n_Ue = 100 → 55.3057 m³ @ D = 10080, written back to V_Rueck', () => {
    load(100, [30, 100]);
    expect(latest?.kind).toBe('computed');
    if (latest?.kind === 'computed') {
      expect(latest.value).toBeCloseTo(55.3056807744, 9);
      expect(latest.substituted?.['Maßgebende Dauerstufe D (min)']).toBe(10080);
      expect(latest.substituted?.['r_D(100) @ maßgebende Dauerstufe (l/(s·ha))']).toBe(3.2);
    }
    expect(stored('V_Rueck')).toBeCloseTo(55.3056807744, 9);
  });

  it('T_n_Ue = 30 → 31.6401 m³ (unchanged)', () => {
    load(30, [30, 100]);
    expect(latest?.kind).toBe('computed');
    if (latest?.kind === 'computed') expect(latest.value).toBeCloseTo(31.6400624064, 9);
  });

  it('T_n_Ue empty → default T 30 (31.6401 m³)', () => {
    load(null, [30, 100]);
    expect(latest?.kind).toBe('computed');
    if (latest?.kind === 'computed') expect(latest.value).toBeCloseTo(31.6400624064, 9);
  });

  it('T_n_Ue = 100 with grid lacking the 100 column → manual_required naming T_n = 100 a', () => {
    load(100, [30]);
    expect(latest?.kind).toBe('manual_required');
    if (latest?.kind === 'manual_required') expect(latest.reason).toMatch(/T_n = 100 a/);
  });
});

describe('A138-26 Gl. 10 live form — review round L-1 / L-2', () => {
  beforeEach(() => {
    latest = undefined;
    act(() => { useWorksheetStore.getState().init('fx-a138-26-l', {}, {}, {}); });
  });

  it('T_n_Ue = 50, column present → 55.3056807744 m³ (probe column used)', () => {
    load(50, [30, 50]);
    expect(latest?.kind).toBe('computed');
    if (latest?.kind === 'computed') expect(latest.value).toBeCloseTo(55.3056807744, 9);
  });
  it('T_n_Ue = 50, column absent → manual_required naming T_n = 50 a', () => {
    load(50, [30, 100]);
    expect(latest?.kind).toBe('manual_required');
    if (latest?.kind === 'manual_required') expect(latest.reason).toMatch(/T_n = 50 a/);
  });
  for (const t of [100, 0]) {
    it(`legacy 1D table, T_n_Ue = ${t} → unchanged typed-scalar result (r_D_30 3.2 @ D 10080)`, () => {
      load(t, 'legacy');
      setNum('r_D_30', 3.2);
      setNum('D_min', 10080);
      expect(latest?.kind).toBe('computed');
      if (latest?.kind === 'computed') expect(latest.value).toBeCloseTo(55.3056807744, 9);
    });
  }
});
