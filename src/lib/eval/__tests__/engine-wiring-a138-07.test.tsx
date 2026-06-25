/**
 * Integration test: A138-07 surface-producer engine wiring.
 *
 * Drives the REAL useEquationEngine hook (same code worksheet-form.tsx uses)
 * for worksheet 'A138-07' with a surface_inventory json value in the store.
 * Asserts that the hook's write-back effect persists A_C, C_m, A_E_ba,
 * A_E_nba into the output fields' store slots — no mocking of the engine or
 * the store.
 *
 * This test replaces the deleted engine-wiring-A138-10.test.tsx (removed when
 * A138-10 Gl. 2 was retired and the four surface producers moved to A138-07).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

// ---- A138-07 equation ids (verbatim from Global Constraints) ----------------
const A_C_EQ_ID = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';
const C_M_EQ_ID = 'a1380702-0000-4000-8000-000000000002';
const A_E_BA_EQ_ID = 'a1380702-0000-4000-8000-000000000003';
const A_E_NBA_EQ_ID = 'a1380702-0000-4000-8000-000000000004';

// ---- Field fixture ids ------------------------------------------------------
const FIELD_IDS = {
  surface_inventory: 'fixture-surface-inventory',
  A_C: 'fixture-A_C',
  C_m: 'fixture-C_m',
  A_E_ba: 'fixture-A_E_ba',
  A_E_nba: 'fixture-A_E_nba',
};

const FIELDS = [
  { id: FIELD_IDS.surface_inventory, symbol: 'surface_inventory', unit: null },
  { id: FIELD_IDS.A_C, symbol: 'A_C', unit: 'm²' },
  { id: FIELD_IDS.C_m, symbol: 'C_m', unit: null },
  { id: FIELD_IDS.A_E_ba, symbol: 'A_E_ba', unit: 'm²' },
  { id: FIELD_IDS.A_E_nba, symbol: 'A_E_nba', unit: 'm²' },
];

const EQUATIONS = [
  {
    id: A_C_EQ_ID,
    equationNumber: '2',
    formula: 'A_C = SUM(A_i * C_i)',
    inputSymbols: ['surface_inventory'],
    outputSymbol: 'A_C',
  },
  {
    id: C_M_EQ_ID,
    equationNumber: '2c',
    formula: 'C_m = SUM(A_i * C_i) / A_C',
    inputSymbols: ['surface_inventory'],
    outputSymbol: 'C_m',
  },
  {
    id: A_E_BA_EQ_ID,
    equationNumber: '2d',
    formula: 'A_E_ba = SUM(A_E_ba_i)',
    inputSymbols: ['surface_inventory'],
    outputSymbol: 'A_E_ba',
  },
  {
    id: A_E_NBA_EQ_ID,
    equationNumber: '2e',
    formula: 'A_E_nba = SUM(A_E_nba_i)',
    inputSymbols: ['surface_inventory'],
    outputSymbol: 'A_E_nba',
  },
];

/** Engine whitelist — the four A138-07 surface producers. */
const ENGINE_WHITELIST = new Set<string>(['A138-07:2', 'A138-07:2c', 'A138-07:2d', 'A138-07:2e']);

/** Two paved schwarzdecke_asphalt surfaces (c_i=0.9, c_s=1.0). */
const SURFACE_CARRIER = {
  rows: [
    { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
    { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
  ],
};

// ---- Minimal host component -------------------------------------------------
// Renders nothing to the DOM — we only care about the hook's write-back effect
// on the store.
function Harness() {
  useEquationEngine({
    worksheetCode: 'A138-07',
    fields: FIELDS,
    equations: EQUATIONS,
    engineWhitelist: ENGINE_WHITELIST,
  });
  return null;
}

// ---- Helpers ----------------------------------------------------------------
function initStore() {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance-a138-07', {}, {}, {});
  });
}

function getStoredNumber(fieldId: string): number | null {
  const v = useWorksheetStore.getState().values[fieldId];
  if (v?.type !== 'number') return null;
  return v.value;
}

function setCarrier() {
  act(() => {
    useWorksheetStore.getState().setField(FIELD_IDS.surface_inventory, {
      type: 'json',
      value: SURFACE_CARRIER,
    });
  });
}

// ---- Tests ------------------------------------------------------------------

describe('A138-07 surface producers — engine-wiring integration', () => {
  beforeEach(() => initStore());

  it('writes A_C=4826.43, C_m=0.9, A_E_ba=5362.7, A_E_nba=0 after surface_inventory is set', () => {
    render(<Harness />);
    setCarrier();

    // The hook's write-back useEffect fires synchronously in the happy-dom
    // environment after the state update triggers a re-render.
    expect(getStoredNumber(FIELD_IDS.A_C)).toBeCloseTo(4826.43, 2);
    expect(getStoredNumber(FIELD_IDS.C_m)).toBeCloseTo(0.9, 6);
    expect(getStoredNumber(FIELD_IDS.A_E_ba)).toBeCloseTo(5362.7, 4);
    expect(getStoredNumber(FIELD_IDS.A_E_nba)).toBe(0);
  });

  it('clears all four output fields when surface_inventory has no complete rows', () => {
    render(<Harness />);
    setCarrier();
    // Confirm they were written
    expect(getStoredNumber(FIELD_IDS.A_C)).not.toBeNull();

    // Replace carrier with empty rows → engine goes manual_required → hook clears outputs
    act(() => {
      useWorksheetStore.getState().setField(FIELD_IDS.surface_inventory, {
        type: 'json',
        value: { rows: [] },
      });
    });

    expect(getStoredNumber(FIELD_IDS.A_C)).toBeNull();
    expect(getStoredNumber(FIELD_IDS.C_m)).toBeNull();
    expect(getStoredNumber(FIELD_IDS.A_E_ba)).toBeNull();
    expect(getStoredNumber(FIELD_IDS.A_E_nba)).toBeNull();
  });
});
