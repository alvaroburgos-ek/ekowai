/**
 * Integration test: A138-07 Gl. 2f/2g (A_C_sealed / A_C_unsealed) engine wiring.
 *
 * Mirrors engine-wiring-a138-07.test.tsx exactly — same harness, same
 * useEquationEngine hook, same worksheet store — but focuses on the two
 * reduced-area-split producers added in the feat/a138-area-singlesource
 * consolidation:
 *
 *   Gl. 2f  A_C_sealed   = Σ(A_E,b,a,i · C_i)  (befestigt)
 *   Gl. 2g  A_C_unsealed = Σ(A_E,nb,a,i · C_i) (unbefestigt)
 *
 * Fixture: 2-row carrier
 *   Row 1 — paved   (schwarzdecke_asphalt): area 100 m², c_i 0.9  → A_C_sealed   = 90
 *   Row 2 — unpaved (park_flach, override):  area 200 m², c_i 0.3  → A_C_unsealed = 60
 *
 * Asserts that REAL engine write-back persists 90 / 60 to the output field
 * slots — no mocking of the engine or the store.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

// ---- A138-07 Gl. 2f/2g equation ids (verbatim from Global Constraints) ------
const A_C_SEALED_EQ_ID = 'a1380702-0000-4000-8000-000000000005';
const A_C_UNSEALED_EQ_ID = 'a1380702-0000-4000-8000-000000000006';

// ---- Field fixture ids -------------------------------------------------------
const FIELD_IDS = {
  surface_inventory: 'fixture-surface-inventory-split',
  A_C_sealed: 'fixture-A_C_sealed',
  A_C_unsealed: 'fixture-A_C_unsealed',
};

const FIELDS = [
  { id: FIELD_IDS.surface_inventory, symbol: 'surface_inventory', unit: null },
  { id: FIELD_IDS.A_C_sealed,   symbol: 'A_C_sealed',   unit: 'm²' },
  { id: FIELD_IDS.A_C_unsealed, symbol: 'A_C_unsealed', unit: 'm²' },
];

const EQUATIONS = [
  {
    id: A_C_SEALED_EQ_ID,
    equationNumber: '2f',
    formula: 'A_C_sealed = SUM(A_E_ba_i * C_i)',
    inputSymbols: ['surface_inventory'],
    outputSymbol: 'A_C_sealed',
  },
  {
    id: A_C_UNSEALED_EQ_ID,
    equationNumber: '2g',
    formula: 'A_C_unsealed = SUM(A_E_nba_i * C_i)',
    inputSymbols: ['surface_inventory'],
    outputSymbol: 'A_C_unsealed',
  },
];


/**
 * 2-row carrier:
 *   Row 1 — paved  (schwarzdecke_asphalt, c_i=0.9, c_s=1.0), area 100 m²
 *            → contribution to A_C_sealed   = 100 × 0.9 = 90
 *   Row 2 — unpaved (park_flach, c_i=0.3 override, c_s=0.2), area 200 m²
 *            → contribution to A_C_unsealed = 200 × 0.3 = 60
 *
 * park_flach is group 3 (unpaved) in Tab. 9; its canonical c_i = 0.1.
 * coeff_override: true lets the engineer set c_i=0.3 without disrupting
 * the kind-lookup (rowKind still returns 'unpaved' via lookupTab9).
 */
const SURFACE_CARRIER = {
  rows: [
    {
      id: 'row-paved',
      label: 'Dach',
      tab9_value: 'schwarzdecke_asphalt',
      area_m2: 100,
      c_i: 0.9,
      c_s: 1.0,
      coeff_override: false,
    },
    {
      id: 'row-unpaved',
      label: 'Grünfläche',
      tab9_value: 'park_flach',
      area_m2: 200,
      c_i: 0.3,
      c_s: 0.2,
      coeff_override: true,
    },
  ],
};

// ---- Minimal host component -------------------------------------------------
function Harness() {
  useEquationEngine({
    worksheetCode: 'A138-07',
    fields: FIELDS,
    equations: EQUATIONS,
  });
  return null;
}

// ---- Helpers ----------------------------------------------------------------
function initStore() {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance-a138-07-sealed', {}, {}, {});
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

describe('A138-07 Gl. 2f/2g (A_C_sealed/A_C_unsealed) — engine-wiring integration', () => {
  beforeEach(() => initStore());

  it('writes A_C_sealed=90 and A_C_unsealed=60 after surface_inventory is set', () => {
    render(<Harness />);
    setCarrier();

    // The hook's write-back useEffect fires synchronously in the happy-dom
    // environment after the state update triggers a re-render.
    expect(getStoredNumber(FIELD_IDS.A_C_sealed)).toBeCloseTo(90, 6);
    expect(getStoredNumber(FIELD_IDS.A_C_unsealed)).toBeCloseTo(60, 6);
  });

  it('clears A_C_sealed and A_C_unsealed when surface_inventory has no complete rows', () => {
    render(<Harness />);
    setCarrier();
    // Confirm they were written first
    expect(getStoredNumber(FIELD_IDS.A_C_sealed)).not.toBeNull();
    expect(getStoredNumber(FIELD_IDS.A_C_unsealed)).not.toBeNull();

    // Replace carrier with empty rows → engine goes manual_required → hook clears outputs
    act(() => {
      useWorksheetStore.getState().setField(FIELD_IDS.surface_inventory, {
        type: 'json',
        value: { rows: [] },
      });
    });

    expect(getStoredNumber(FIELD_IDS.A_C_sealed)).toBeNull();
    expect(getStoredNumber(FIELD_IDS.A_C_unsealed)).toBeNull();
  });

  it('computes only A_C_sealed when all rows are paved (A_C_unsealed=0 would be manual_required when no unpaved rows)', () => {
    render(<Harness />);
    // All-paved carrier: 2 paved rows, no unpaved → A_C_sealed=270, A_C_unsealed from summary=0
    act(() => {
      useWorksheetStore.getState().setField(FIELD_IDS.surface_inventory, {
        type: 'json',
        value: {
          rows: [
            { id: 'p1', label: 'Dach 1', tab9_value: 'schwarzdecke_asphalt', area_m2: 200, c_i: 0.9, c_s: 1.0, coeff_override: false },
            { id: 'p2', label: 'Dach 2', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
          ],
        },
      });
    });

    // summarizeSurfaces: A_C_sealed = (200+100)*0.9 = 270; A_C_unsealed = 0
    // The aggregator returns 0 for A_C_unsealed (0 is finite) → computed
    expect(getStoredNumber(FIELD_IDS.A_C_sealed)).toBeCloseTo(270, 6);
    expect(getStoredNumber(FIELD_IDS.A_C_unsealed)).toBeCloseTo(0, 6);
  });
});
