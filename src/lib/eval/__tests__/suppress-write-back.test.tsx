/**
 * Unit test: suppressWriteBackSymbols param on useEquationEngine.
 *
 * Verifies that when a symbol is present in suppressWriteBackSymbols the hook
 * does NOT write the engine-computed value back into the store for that output
 * field, while other output symbols (not in the suppress set) still receive
 * their computed write-back as normal.
 *
 * This is the minimal natural test for the A_S,m manual-method fix: when the
 * engineer has chosen 'manual' the caller passes A_S_m in the suppress set,
 * preventing Gl.7 from clobbering the typed value. The test uses a simple
 * arithmetic formula to stay independent of A138-specific aggregator wiring.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useMemo } from 'react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

// ---- Fixture equation IDs (arbitrary stable UUIDs) -------------------------
const EQ_A_ID = 'suppress-test-00000000000000000000000000000001';
const EQ_B_ID = 'suppress-test-00000000000000000000000000000002';

// ---- Field IDs ---------------------------------------------------------------
const FLD = {
  x:   'suppress-field-x',
  y:   'suppress-field-y',
  out_A: 'suppress-field-out_A', // output of EQ_A — will be suppressed
  out_B: 'suppress-field-out_B', // output of EQ_B — NOT suppressed
};

// Two simple arithmetic equations:
//   Eq-A: out_A = x + y  (output suppressed in test)
//   Eq-B: out_B = x + y  (output NOT suppressed — receives write-back)
const FIELDS = [
  { id: FLD.x,     symbol: 'x',     unit: null },
  { id: FLD.y,     symbol: 'y',     unit: null },
  { id: FLD.out_A, symbol: 'out_A', unit: null },
  { id: FLD.out_B, symbol: 'out_B', unit: null },
];

const EQUATIONS = [
  {
    id: EQ_A_ID,
    equationNumber: 'S1',
    formula: 'out_A = x + y',
    inputSymbols: ['x', 'y'],
    outputSymbol: 'out_A',
  },
  {
    id: EQ_B_ID,
    equationNumber: 'S2',
    formula: 'out_B = x + y',
    inputSymbols: ['x', 'y'],
    outputSymbol: 'out_B',
  },
];

// Both equations are on the whitelist so the engine processes them.

// ---- Harness ----------------------------------------------------------------
// Renders nothing to the DOM — we only care about the write-back effect.
function Harness({ suppress }: { suppress: ReadonlySet<string> }) {
  const memoFields     = useMemo(() => FIELDS, []);
  const memoEquations  = useMemo(() => EQUATIONS, []);
  useEquationEngine({
    worksheetCode: 'TEST-WS',
    fields:        memoFields,
    equations:     memoEquations,
    suppressWriteBackSymbols: suppress,
  });
  return null;
}

// ---- Helpers ----------------------------------------------------------------
function initStore() {
  act(() => {
    useWorksheetStore.getState().init('suppress-test-instance', {}, {}, {});
  });
}

function setNumber(fieldId: string, value: number) {
  act(() => {
    useWorksheetStore.getState().setField(fieldId, { type: 'number', value });
  });
}

function getStoredNumber(fieldId: string): number | null {
  const v = useWorksheetStore.getState().values[fieldId];
  if (v?.type !== 'number') return null;
  return v.value;
}

// ---- Tests ------------------------------------------------------------------

describe('suppressWriteBackSymbols — engine write-back suppression', () => {
  beforeEach(() => initStore());

  it('without suppression: both out_A and out_B receive computed write-back', () => {
    const noSuppress: ReadonlySet<string> = new Set();
    render(<Harness suppress={noSuppress} />);
    setNumber(FLD.x, 10);
    setNumber(FLD.y, 20);

    // x=10, y=20 → both outputs should be 30
    expect(getStoredNumber(FLD.out_A)).toBe(30);
    expect(getStoredNumber(FLD.out_B)).toBe(30);
  });

  it('with out_A suppressed: engine does NOT write out_A, but DOES write out_B', () => {
    const suppress: ReadonlySet<string> = new Set(['out_A']);
    render(<Harness suppress={suppress} />);

    // Pre-seed a manual value into out_A (simulates engineer entering a value)
    setNumber(FLD.out_A, 999);

    // Now set inputs that would compute out_A = 30 (and out_B = 30)
    setNumber(FLD.x, 10);
    setNumber(FLD.y, 20);

    // out_A must retain the engineer's manual value (999) — NOT overwritten to 30
    expect(getStoredNumber(FLD.out_A)).toBe(999);
    // out_B is not suppressed — must receive the computed 30
    expect(getStoredNumber(FLD.out_B)).toBe(30);
  });

  it('switching suppress set from non-empty to empty re-enables write-back', () => {
    // Start with suppression active
    const suppress: ReadonlySet<string> = new Set(['out_A']);
    const { rerender } = render(<Harness suppress={suppress} />);

    setNumber(FLD.out_A, 999);
    setNumber(FLD.x, 10);
    setNumber(FLD.y, 20);
    expect(getStoredNumber(FLD.out_A)).toBe(999); // suppressed → manual value survives

    // Remove suppression (simulates engineer switching from manual → direct method)
    const noSuppress: ReadonlySet<string> = new Set();
    act(() => {
      rerender(<Harness suppress={noSuppress} />);
    });

    // Write-back now resumes → out_A = 30 (self-healing behaviour)
    expect(getStoredNumber(FLD.out_A)).toBe(30);
    expect(getStoredNumber(FLD.out_B)).toBe(30);
  });
});
