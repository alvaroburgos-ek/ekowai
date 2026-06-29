/**
 * Integration test for A138-13 Gl. 8 wiring — V_VA over the KOSTRA table.
 *
 * Renders EquationEngineCard driven by the real useEquationEngine hook +
 * real zustand store, exactly like the Gl. 2 and Gl. 21 tests. No mocks
 * of the engine or the store.
 *
 * Acceptance gates (mirror of the hand calc):
 *   - Heinsberg-like KOSTRA inputs → card shows "V_VA = 18,684 m³" green/
 *     computed AND surfaces the governing duration D = 30 min.
 *   - Incomplete table row → card flips to manual_required with no
 *     numeric V_VA, store cleared.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import { useMemo } from 'react';
import { EquationEngineCard } from '../equation-engine-card';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import type { KostraCarrier } from '@/lib/eval/aggregators';

const A138_13_GL8_ID = '69f31e6e-a755-4246-af10-ae46668b5c86';
const GL8_FORMULA = 'V_VA = (Q_zu - Q_S - Q_Dr) * D * 60 * f_Z * f_A * 10^-3';

// Field fixture mimics what A138-13 sees once cross-worksheet propagation
// surfaces A_C, A_VA, Q_S, Q_Dr, f_Z, f_A onto it alongside the KOSTRA
// carrier (r_D_n_table) and the V_VA output field.
const FIELD_IDS = {
  V_VA: 'fixture-V_VA',
  A_C: 'fixture-A_C',
  A_VA: 'fixture-A_VA',
  Q_S: 'fixture-Q_S',
  Q_Dr: 'fixture-Q_Dr',
  f_Z: 'fixture-f_Z',
  f_A: 'fixture-f_A',
  r_D_n_table: 'fixture-r_D_n_table',
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

const HEINSBERG_KOSTRA: KostraCarrier = {
  rows: [
    { id: '5', D_min: 5, r_D_n: 300 },
    { id: '10', D_min: 10, r_D_n: 230 },
    { id: '15', D_min: 15, r_D_n: 195 },
    { id: '30', D_min: 30, r_D_n: 130 },
    { id: '60', D_min: 60, r_D_n: 80 },
    { id: '120', D_min: 120, r_D_n: 50 },
  ],
};

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
  // Task 3: n=0.2 → T_n=5 = the design T_n for back-compat legacy fixtures.
  // The HEINSBERG_KOSTRA fixture is passed as-is (KostraCarrier rows shape) which
  // normalizes to a legacyDesignColumn table — served only when T_n == design T_n.
  setNumber(FIELD_IDS.n, 0.2);
}

function getStoredVVA(): number | null {
  const v = useWorksheetStore.getState().values[FIELD_IDS.V_VA];
  if (v?.type !== 'number') return null;
  return v.value;
}

describe('A138-13 Gl. 8 — rendered integration', () => {
  beforeEach(() => initStore());

  it('Heinsberg-like KOSTRA + scalars → card shows V_VA = 18,684 m³ (D = 30 min)', () => {
    render(<Harness fields={baseFields} />);
    loadScalars();
    setJson(FIELD_IDS.r_D_n_table, HEINSBERG_KOSTRA);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/rechnerisch bestätigt/i)).toBeInTheDocument();

    // Headline result includes both the max V_VA and the governing D.
    // The rendered text is "V_VA = 18,684 m³" (de-DE, 4 fraction digits)
    expect(within(card).getByText(/V_VA = 18,684 m³/)).toBeInTheDocument();
    // Governing D surfaced through the substituted-inputs map
    expect(
      within(card).getByText(/Maßgebende Dauerstufe D \(min\) = 30/),
    ).toBeInTheDocument();
    // MAX V_VA brutto + V_VA netto both explicit (post-Pile-8 cistern path
    // emits brutto/netto rows; netto == brutto when no cistern credited).
    expect(within(card).getByText(/MAX V_VA brutto \(m³\) = 18,684/)).toBeInTheDocument();
    expect(within(card).getByText(/V_VA netto \(m³\) = 18,684/)).toBeInTheDocument();

    // The store carries the max V_VA value too — production wiring works.
    expect(getStoredVVA()).toBeCloseTo(18.684, 3);
  });

  it('incomplete row in the KOSTRA table → manual_required, no number, store cleared', () => {
    const { rerender } = render(<Harness fields={baseFields} />);
    loadScalars();
    setJson(FIELD_IDS.r_D_n_table, HEINSBERG_KOSTRA);
    // Compute first so we know the store will have to be cleared
    expect(getStoredVVA()).not.toBeNull();

    // Replace the table with one row missing r_D
    setJson(FIELD_IDS.r_D_n_table, {
      rows: [
        { id: 'a', D_min: 15, r_D_n: 195 },
        { id: 'b', D_min: 30, r_D_n: null },
      ],
    });
    rerender(<Harness fields={baseFields} />);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');
    expect(
      within(card).getByText(/rechnerisch nicht bestätigt — manuell prüfen/i),
    ).toBeInTheDocument();
    // Reason names the offending row by its D label
    expect(within(card).getByText(/D = 30 min/)).toBeInTheDocument();
    // NO V_VA number rendered (neither 18,684 nor anything else)
    expect(within(card).queryByText(/V_VA\s*=\s*\d/)).not.toBeInTheDocument();
    // Store cleared
    expect(getStoredVVA()).toBeNull();
  });

  it('missing scalar → manual_required names the symbol, no number', () => {
    const { rerender } = render(<Harness fields={baseFields} />);
    setJson(FIELD_IDS.r_D_n_table, HEINSBERG_KOSTRA);
    loadScalars();
    // Wipe f_Z
    setNumber(FIELD_IDS.f_Z, null);
    rerender(<Harness fields={baseFields} />);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');
    // f_Z appears in both the reason paragraph and the missing-symbols list
    // — assert it shows up at least once instead of requiring uniqueness.
    expect(within(card).getAllByText(/f_Z/).length).toBeGreaterThan(0);
    // No V_VA number rendered
    expect(within(card).queryByText(/V_VA\s*=\s*\d/)).not.toBeInTheDocument();
    expect(getStoredVVA()).toBeNull();
  });
});
