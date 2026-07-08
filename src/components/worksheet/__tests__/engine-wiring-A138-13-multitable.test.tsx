/**
 * Piece 2 / Task 5 — resolution-wiring integration test.
 *
 * A project may hold MULTIPLE source-tagged rainfall tables in the single
 * A138-04 `r_D_n_table` carrier (`{ tables: [...] }`). A facility references
 * which table it uses via the atomic `rainfall_table_ref` field (table id
 * ONLY — never an r_D(n) value). This test proves the basin Gl. 8 aggregator
 * iterates the SELECTED table's rows, not the primary, and that an unset ref
 * falls back to the primary (back-compatible with the legacy single table).
 *
 * The aggregator math is UNCHANGED — only the carrier the hook feeds it is
 * resolved at the table boundary.
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
  V_VA: 'fixture-V_VA',
  A_C: 'fixture-A_C',
  A_VA: 'fixture-A_VA',
  Q_S: 'fixture-Q_S',
  Q_Dr: 'fixture-Q_Dr',
  f_Z: 'fixture-f_Z',
  f_A: 'fixture-f_A',
  r_D_n_table: 'fixture-r_D_n_table',
  rainfall_table_ref: 'fixture-rainfall_table_ref',
  n: 'fixture-n',
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

const EQUATIONS = [
  {
    id: A138_13_GL8_ID,
    equationNumber: '8',
    formula: GL8_FORMULA,
    inputSymbols: ['Q_zu', 'Q_S', 'Q_Dr', 'D', 'f_Z', 'f_A'],
    outputSymbol: 'V_VA',
  },
];

// Two source-tagged tables in ONE carrier.
//   t1 (primary): governing D = 30 min → V_VA = 18,684 m³ (the Heinsberg set)
//   t2          : governing D = 60 min → V_VA = 19,224 m³
const MULTI_CARRIER = {
  tables: [
    {
      id: 't1',
      name: 'KOSTRA Gitterzelle A',
      source: 'KOSTRA-DWD-2020',
      rows: [
        { D_min: 5, r_D_n: 300 },
        { D_min: 10, r_D_n: 230 },
        { D_min: 15, r_D_n: 195 },
        { D_min: 30, r_D_n: 130 },
        { D_min: 60, r_D_n: 80 },
        { D_min: 120, r_D_n: 50 },
      ],
    },
    {
      id: 't2',
      name: 'KOSTRA Gitterzelle B',
      source: 'KOSTRA-DWD-2020',
      rows: [
        { D_min: 15, r_D_n: 195 },
        { D_min: 30, r_D_n: 130 },
        { D_min: 60, r_D_n: 90 },
        { D_min: 120, r_D_n: 55 },
      ],
    },
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
function setText(fieldId: string, value: string | null) {
  act(() => {
    useWorksheetStore.getState().setField(fieldId, { type: 'text', value });
  });
}
function initStore() {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance-A138-13', {}, {}, {});
  });
}
function loadScalars() {
  setNumber(FIELD_IDS.A_C, 1000);
  setNumber(FIELD_IDS.A_VA, 50);
  setNumber(FIELD_IDS.Q_S, 5);
  setNumber(FIELD_IDS.Q_Dr, 0);
  setNumber(FIELD_IDS.f_Z, 1.2);
  setNumber(FIELD_IDS.f_A, 1.0);
  // Task 3: n=0.2 → T_n=5. MULTI_CARRIER uses legacy 1D rows (legacyDesignColumn:true).
  // The legacy curve is served as the design column when T_n == designReturnPeriod.
  setNumber(FIELD_IDS.n, 0.2);
}
function getStoredVVA(): number | null {
  const v = useWorksheetStore.getState().values[FIELD_IDS.V_VA];
  if (v?.type !== 'number') return null;
  return v.value;
}

describe('A138-13 Gl. 8 — multi-table resolution wiring (Piece 2 / Task 5)', () => {
  beforeEach(() => initStore());

  it('selecting table "t2" iterates t2 rows → V_VA = 19,224 m³ (D = 60 min)', () => {
    const { rerender } = render(<Harness fields={baseFields} />);
    loadScalars();
    setJson(FIELD_IDS.r_D_n_table, MULTI_CARRIER);
    setText(FIELD_IDS.rainfall_table_ref, 't2');
    rerender(<Harness fields={baseFields} />);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/V_VA = 19,224 m³/)).toBeInTheDocument();
    expect(
      within(card).getByText(/Maßgebende Dauerstufe D \(min\) = 60/),
    ).toBeInTheDocument();
    expect(getStoredVVA()).toBeCloseTo(19.224, 3);
  });

  it('unset ref falls back to the primary table "t1" → V_VA = 18,684 m³ (D = 30 min)', () => {
    const { rerender } = render(<Harness fields={baseFields} />);
    loadScalars();
    setJson(FIELD_IDS.r_D_n_table, MULTI_CARRIER);
    setText(FIELD_IDS.rainfall_table_ref, null);
    rerender(<Harness fields={baseFields} />);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/V_VA = 18,684 m³/)).toBeInTheDocument();
    expect(
      within(card).getByText(/Maßgebende Dauerstufe D \(min\) = 30/),
    ).toBeInTheDocument();
    expect(getStoredVVA()).toBeCloseTo(18.684, 3);
  });

  it('stale ref (no matching table) falls back to the primary table', () => {
    const { rerender } = render(<Harness fields={baseFields} />);
    loadScalars();
    setJson(FIELD_IDS.r_D_n_table, MULTI_CARRIER);
    setText(FIELD_IDS.rainfall_table_ref, 'deleted-table-id');
    rerender(<Harness fields={baseFields} />);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/V_VA = 18,684 m³/)).toBeInTheDocument();
  });
});
