/**
 * Task 3 — 2D KOSTRA grid integration test for A138-13 Gl. 8 (basin).
 *
 * CORRECTED CONTRACT:
 * (a) native 2D grid, project n=0.2 (→ T_n=5) + T_n=5 column = Heinsberg curve
 *     → card computes V_VA = 18,684 m³, governing D = 30 min.
 * (b) native 2D grid with ONLY T_n=10 column, facility wants T_n=5
 *     → card is manual_required, reason names T_n=5; no number; store cleared.
 * (c) legacy {rows} carrier WITH NO n FIELD AT ALL (facilityReturnPeriod → null)
 *     → still computes V_VA = 18,684 m³ (legacy serves any T_n, never withheld).
 *     This directly proves existing projects are not broken by the correction.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import { useMemo } from 'react';
import { EquationEngineCard } from '../equation-engine-card';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const A138_13_GL8_ID = '69f31e6e-a755-4246-af10-ae46668b5c86';
const GL8_FORMULA = 'V_VA = (Q_zu - Q_S - Q_Dr) * D * 60 * f_Z * f_A * 10^-3';

const FIELD_IDS = {
  V_VA: 'fixture-2d-V_VA',
  A_C: 'fixture-2d-A_C',
  A_VA: 'fixture-2d-A_VA',
  Q_S: 'fixture-2d-Q_S',
  Q_Dr: 'fixture-2d-Q_Dr',
  f_Z: 'fixture-2d-f_Z',
  f_A: 'fixture-2d-f_A',
  r_D_n_table: 'fixture-2d-r_D_n_table',
  rainfall_table_ref: 'fixture-2d-rainfall_table_ref',
  n: 'fixture-2d-n',
};

type FieldMeta = { id: string; symbol: string; unit: string | null };

const baseFields: FieldMeta[] = [
  { id: FIELD_IDS.V_VA, symbol: 'V_VA', unit: 'm³' },
  { id: FIELD_IDS.A_C, symbol: 'A_C', unit: 'm²' },
  { id: FIELD_IDS.A_VA, symbol: 'A_VA', unit: 'm²' },
  { id: FIELD_IDS.Q_S, symbol: 'Q_S', unit: 'l/s' },
  { id: FIELD_IDS.Q_Dr, symbol: 'Q_Dr', unit: 'l/s' },
  { id: FIELD_IDS.f_Z, symbol: 'f_Z', unit: null },
  { id: FIELD_IDS.f_A, symbol: 'f_A', unit: null },
  { id: FIELD_IDS.r_D_n_table, symbol: 'r_D_n_table', unit: 'l/(s·ha)' },
  { id: FIELD_IDS.rainfall_table_ref, symbol: 'rainfall_table_ref', unit: null },
  { id: FIELD_IDS.n, symbol: 'n', unit: '1/a' },
];

/**
 * Fields WITHOUT the n field — used for case (c) to prove legacy serves T_n=null.
 * facilityReturnPeriod will return null because there is no n, no T_n field.
 */
const fieldsWithoutN: FieldMeta[] = baseFields.filter((f) => f.symbol !== 'n');

const EQUATIONS = [
  {
    id: A138_13_GL8_ID,
    equationNumber: '8',
    formula: GL8_FORMULA,
    inputSymbols: ['Q_zu', 'Q_S', 'Q_Dr', 'D', 'f_Z', 'f_A'],
    outputSymbol: 'V_VA',
  },
];

// 2D carrier: Heinsberg curve in T_n=5 column.
const CARRIER_2D_TN5 = {
  tables: [
    {
      id: 'g1',
      name: 'KOSTRA Heinsberg 2D',
      source: 'KOSTRA-DWD-2020',
      columns: [5, 10, 30],
      rows: [
        { D_min: 5,   r: { '5': 300, '10': 380, '30': 510 } },
        { D_min: 10,  r: { '5': 230, '10': 290, '30': 390 } },
        { D_min: 15,  r: { '5': 195, '10': 245, '30': 330 } },
        { D_min: 30,  r: { '5': 130, '10': 165, '30': 220 } },
        { D_min: 60,  r: { '5': 80,  '10': 102, '30': 137 } },
        { D_min: 120, r: { '5': 50,  '10': 63,  '30': 85  } },
      ],
    },
  ],
};

// 2D carrier with only T_n=10 column (no T_n=5).
const CARRIER_2D_TN10_ONLY = {
  tables: [
    {
      id: 'g2',
      name: 'KOSTRA grid T10 only',
      source: 'KOSTRA-DWD-2020',
      columns: [10],
      rows: [
        { D_min: 5,   r: { '10': 380 } },
        { D_min: 10,  r: { '10': 290 } },
        { D_min: 15,  r: { '10': 245 } },
        { D_min: 30,  r: { '10': 165 } },
        { D_min: 60,  r: { '10': 102 } },
        { D_min: 120, r: { '10': 63  } },
      ],
    },
  ],
};

// Legacy {rows} carrier — single design column (the Heinsberg curve).
const CARRIER_LEGACY = {
  rows: [
    { D_min: 5,   r_D_n: 300 },
    { D_min: 10,  r_D_n: 230 },
    { D_min: 15,  r_D_n: 195 },
    { D_min: 30,  r_D_n: 130 },
    { D_min: 60,  r_D_n: 80  },
    { D_min: 120, r_D_n: 50  },
  ],
};

function Harness({ fields }: { fields: FieldMeta[] }) {
  const memoFields = useMemo(() => fields, [fields]);
  const { engineStates } = useEquationEngine({
    worksheetCode: 'A138-13',
    fields: memoFields,
    equations: EQUATIONS,
    engineWhitelist: new Set<string>(['A138-13:8']),
  });
  const state = engineStates[A138_13_GL8_ID];
  if (!state) return null;
  return (
    <EquationEngineCard
      equationNumber="8"
      sourceFormula={GL8_FORMULA}
      state={state}
      outputSymbol="V_VA"
      outputUnit="m³"
    />
  );
}

function setNumber(fieldId: string, value: number | null) {
  act(() => {
    useWorksheetStore.getState().setField(fieldId, { type: 'number', value });
  });
}
function setJson(fieldId: string, value: unknown) {
  act(() => {
    useWorksheetStore.getState().setField(fieldId, { type: 'json', value });
  });
}
function initStore() {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance-A138-13-2d', {}, {}, {});
  });
}
function loadScalars() {
  setNumber(FIELD_IDS.A_C, 1000);
  setNumber(FIELD_IDS.A_VA, 50);
  setNumber(FIELD_IDS.Q_S, 5);
  setNumber(FIELD_IDS.Q_Dr, 0);
  setNumber(FIELD_IDS.f_Z, 1.2);
  setNumber(FIELD_IDS.f_A, 1.0);
}
function getStoredVVA(): number | null {
  const v = useWorksheetStore.getState().values[FIELD_IDS.V_VA];
  if (v?.type !== 'number') return null;
  return v.value;
}

describe('A138-13 Gl. 8 — 2D grid column resolution (corrected contract)', () => {
  beforeEach(() => initStore());

  it('(a) project n=0.2 + 2D grid T_n=5 column = Heinsberg → V_VA = 18,684 m³ @ D=30', () => {
    render(<Harness fields={baseFields} />);
    loadScalars();
    // project n = 0.2 → T_n = 1/0.2 = 5
    setNumber(FIELD_IDS.n, 0.2);
    setJson(FIELD_IDS.r_D_n_table, CARRIER_2D_TN5);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/V_VA = 18,684 m³/)).toBeInTheDocument();
    expect(within(card).getByText(/Maßgebende Dauerstufe D \(min\) = 30/)).toBeInTheDocument();
    expect(getStoredVVA()).toBeCloseTo(18.684, 3);
  });

  it('(b) native 2D grid ONLY T_n=10 column, facility wants T_n=5 → manual_required, reason names T_n, no number, store cleared', () => {
    const { rerender } = render(<Harness fields={baseFields} />);
    loadScalars();
    // First compute with full grid to ensure store is populated
    setNumber(FIELD_IDS.n, 0.2);
    setJson(FIELD_IDS.r_D_n_table, CARRIER_2D_TN5);
    expect(getStoredVVA()).not.toBeNull();

    // Now switch to grid with only T_n=10
    setJson(FIELD_IDS.r_D_n_table, CARRIER_2D_TN10_ONLY);
    rerender(<Harness fields={baseFields} />);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');
    // Reason must name the missing T_n
    expect(within(card).getByText(/T_n = 5/)).toBeInTheDocument();
    // NO V_VA number
    expect(within(card).queryByText(/V_VA\s*=\s*\d/)).not.toBeInTheDocument();
    // Store cleared
    expect(getStoredVVA()).toBeNull();
  });

  it('(c) legacy {rows} carrier WITH NO n FIELD (facilityReturnPeriod → null) → still computes V_VA = 18,684 m³', () => {
    // This is the critical regression guard: legacy tables must NEVER be
    // withheld, even when facilityReturnPeriod returns null (no n field on
    // the form). Under the WRONG contract this would emit missing → manual_required.
    // Under the CORRECT contract legacyDesignColumn=true serves any T_n → 'legacy'.
    render(<Harness fields={fieldsWithoutN} />);
    loadScalars();
    // NO n field set — facilityReturnPeriod() returns null
    setJson(FIELD_IDS.r_D_n_table, CARRIER_LEGACY);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/V_VA = 18,684 m³/)).toBeInTheDocument();
    expect(getStoredVVA()).toBeCloseTo(18.684, 3);
  });
});
