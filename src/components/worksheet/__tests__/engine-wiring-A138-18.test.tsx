/**
 * Integration test for the A138-18 Gl. 21 (Rigole s_R) engine wiring.
 *
 * Renders the production EquationEngineCard driven by the real
 * useEquationEngine hook + the real zustand store, exactly like the Gl. 2
 * integration test — no mocks of the engine, the hook, or the store.
 *
 * Two assertions on rendered DOM (this is the visual proof the manual
 * Vercel-preview check would have provided):
 *   - hand-calc inputs → card displays s_R ≈ 0.317 in the green/computed
 *     state, and the same value is written back into the store;
 *   - d_i with a wrong unit ('mm') → card flips to manual_required, the
 *     reason names d_i + the unit conflict, and NO numeric s_R is shown
 *     (no stale 0.317 carried forward, store cleared).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import { useMemo } from 'react';
import { EquationEngineCard } from '../equation-engine-card';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

// ---- A138-18 fixture: real equation id + 7 field ids/symbols from the DB --
const A138_18_GL21_EQ_ID = '069c2b02-8883-48a4-82ce-b21c9ef1fff8';
const GL21_FORMULA =
  's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi/4) * ((d_i^2/s_F) - d_a^2))';

const FIELD_IDS = {
  s_F: 'fixture-s_F',
  b_R: 'fixture-b_R',
  h_R: 'fixture-h_R',
  az: 'fixture-az',
  d_i: 'fixture-d_i',
  d_a: 'fixture-d_a',
  s_R: 'fixture-s_R',
};

type FieldMeta = { id: string; symbol: string; unit: string | null };

const baseFields: FieldMeta[] = [
  { id: FIELD_IDS.s_R, symbol: 's_R', unit: null },
  { id: FIELD_IDS.s_F, symbol: 's_F', unit: null },
  { id: FIELD_IDS.b_R, symbol: 'b_R', unit: 'm' },
  { id: FIELD_IDS.h_R, symbol: 'h_R', unit: 'm' },
  { id: FIELD_IDS.az, symbol: 'az', unit: null },
  { id: FIELD_IDS.d_i, symbol: 'd_i', unit: 'm' },
  { id: FIELD_IDS.d_a, symbol: 'd_a', unit: 'm' },
];

const EQUATIONS = [
  {
    id: A138_18_GL21_EQ_ID,
    equationNumber: '21',
    formula: GL21_FORMULA,
    inputSymbols: ['s_F', 'b_R', 'h_R', 'az', 'd_i', 'd_a'],
    outputSymbol: 's_R',
  },
];

// ---- Harness: same hook the production form uses --------------------------
function Harness({ fields }: { fields: FieldMeta[] }) {
  const memoFields = useMemo(() => fields, [fields]);
  const { engineStates } = useEquationEngine({
    worksheetCode: 'A138-18',
    fields: memoFields,
    equations: EQUATIONS,
  });
  const state = engineStates[A138_18_GL21_EQ_ID];
  if (!state) return null;
  return (
    <EquationEngineCard
      equationNumber="21"
      sourceFormula={GL21_FORMULA}
      state={state}
      outputSymbol="s_R"
      outputUnit={null}
    />
  );
}

// ---- Helpers --------------------------------------------------------------

function setNumber(fieldId: string, value: number | null) {
  act(() => {
    useWorksheetStore.getState().setField(fieldId, { type: 'number', value });
  });
}

function getStoredSR(): number | null {
  const v = useWorksheetStore.getState().values[FIELD_IDS.s_R];
  if (v?.type !== 'number') return null;
  return v.value;
}

function initStore() {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance-A138-18', {}, {}, {});
  });
}

function loadHandCalcInputs() {
  // s_F=0.30, b_R=h_R=1.0, az=1, d_a=0.20, d_i=0.184  → s_R ≈ 0.317166
  setNumber(FIELD_IDS.s_F, 0.3);
  setNumber(FIELD_IDS.b_R, 1.0);
  setNumber(FIELD_IDS.h_R, 1.0);
  setNumber(FIELD_IDS.az, 1);
  setNumber(FIELD_IDS.d_i, 0.184);
  setNumber(FIELD_IDS.d_a, 0.2);
}

// ---- Tests ----------------------------------------------------------------

describe('A138-18 Gl. 21 — rendered wiring integration', () => {
  beforeEach(() => initStore());

  it('initial render (no inputs) — manual_required, no s_R number', () => {
    render(<Harness fields={baseFields} />);
    const card = screen.getByTestId('engine-card-gl-21');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');
    expect(within(card).queryByText(/s_R\s*=\s*\d/)).not.toBeInTheDocument();
    expect(getStoredSR()).toBeNull();
  });

  it('hand-calc inputs → card shows computed s_R ≈ 0,3172 with green badge', () => {
    render(<Harness fields={baseFields} />);
    loadHandCalcInputs();

    const card = screen.getByTestId('engine-card-gl-21');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/rechnerisch bestätigt/i)).toBeInTheDocument();
    expect(
      within(card).queryByText(/rechnerisch nicht bestätigt/i),
    ).not.toBeInTheDocument();
    // de-DE format with 4 fraction digits → 0,3172
    expect(within(card).getByText(/s_R = 0,3172/)).toBeInTheDocument();

    // Store carries the precise computed value too
    const stored = getStoredSR()!;
    const exact = 0.3 * (1 + (Math.PI / 4) * ((0.184 * 0.184) / 0.3 - 0.04));
    expect(stored).toBeCloseTo(exact, 12);
    expect(stored).toBeCloseTo(0.317166, 5);
  });

  it('d_i with unit mm → manual_required + unit conflict surfaced, no number, no stale value', () => {
    // Start with valid inputs so the engine commits a number to the store first
    const { rerender } = render(<Harness fields={baseFields} />);
    loadHandCalcInputs();
    expect(getStoredSR()).not.toBeNull();

    // Flip the d_i field to carry unit='mm'. Production: this would happen
    // if an upstream system pushed mm onto the field; the engine profile for
    // Gl. 21 expects 'm' (per §6.4.2 local override) and must reject.
    const fieldsWithDriftedDI: FieldMeta[] = baseFields.map((f) =>
      f.symbol === 'd_i' ? { ...f, unit: 'mm' } : f,
    );
    // Re-set d_i to a mm-scaled value too (184 instead of 0.184) — the engine
    // must STILL refuse rather than compute a 1000×-wrong s_R.
    setNumber(FIELD_IDS.d_i, 184);
    rerender(<Harness fields={fieldsWithDriftedDI} />);

    const card = screen.getByTestId('engine-card-gl-21');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');
    expect(
      within(card).getByText(/rechnerisch nicht bestätigt — manuell prüfen/i),
    ).toBeInTheDocument();
    // EquationEngineCard renders each conflict as a <li> shaped:
    //   <li>{symbol}: erwartet <span>{expected}</span>, geliefert <span>{actual}</span></li>
    // The unit-conflict marker is the "{symbol}:" prefix on a <li>, which
    // disambiguates from the formula-display occurrences of d_i.
    const conflictLi = within(card)
      .getAllByRole('listitem')
      .find((li) => /^d_i:\s*erwartet/.test(li.textContent ?? ''));
    expect(conflictLi).toBeDefined();
    expect(conflictLi!.textContent).toMatch(/erwartet\s*m/);
    expect(conflictLi!.textContent).toMatch(/geliefert\s*mm/);
    // No numeric s_R anywhere in the card — neither 0,3172 nor a 10^6× wrong number
    expect(within(card).queryByText(/s_R\s*=\s*\d/)).not.toBeInTheDocument();
    // Store cleared — no stale value carried forward
    expect(getStoredSR()).toBeNull();
  });
});
