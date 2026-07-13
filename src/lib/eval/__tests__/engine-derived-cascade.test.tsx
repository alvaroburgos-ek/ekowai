/**
 * E1-D item 3 — derived→derived cascade WITHIN one worksheet (#17).
 *
 * FLL-GAR-22 has Delta_u produced by Gl.2c and CONSUMED by Gl.2b on the same
 * worksheet. This proves the existing engine already handles that shape: the
 * write-back effect persists a produced symbol to the store, and the dependent
 * equation reads it on the next render → the cascade CONVERGES. No dependency-
 * ordering / eval-loop change is needed (which would touch dispatch).
 * (The FLL g_prime two-producer case is a SEPARATE conditional-owner class,
 * deferred with #22.)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useMemo } from 'react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const FLD = { x: 'casc-x', y: 'casc-y', out_A: 'casc-outA', out_B: 'casc-outB' };
const FIELDS = [
  { id: FLD.x, symbol: 'x', unit: null },
  { id: FLD.y, symbol: 'y', unit: null },
  { id: FLD.out_A, symbol: 'out_A', unit: null },
  { id: FLD.out_B, symbol: 'out_B', unit: null },
];
// out_A is produced by eq A and CONSUMED by eq B — both on this worksheet.
const EQUATIONS = [
  { id: 'casc-eqA', equationNumber: 'C1', formula: 'out_A = x + y', inputSymbols: ['x', 'y'], outputSymbol: 'out_A' },
  { id: 'casc-eqB', equationNumber: 'C2', formula: 'out_B = out_A * 2', inputSymbols: ['out_A'], outputSymbol: 'out_B' },
];

function Harness() {
  const memoFields = useMemo(() => FIELDS, []);
  const memoEquations = useMemo(() => EQUATIONS, []);
  useEquationEngine({ worksheetCode: 'TEST-WS', fields: memoFields, equations: memoEquations });
  return null;
}

function initStore() {
  act(() => { useWorksheetStore.getState().init('casc-instance', {}, {}, {}); });
}
function setNumber(fieldId: string, value: number) {
  act(() => { useWorksheetStore.getState().setField(fieldId, { type: 'number', value }); });
}
function getStoredNumber(fieldId: string): number | null {
  const v = useWorksheetStore.getState().values[fieldId];
  return v?.type === 'number' ? v.value : null;
}

describe('#17 derived→derived cascade on one worksheet', () => {
  beforeEach(() => initStore());

  it('out_B (consumes out_A, produced by another equation on the SAME worksheet) converges', () => {
    render(<Harness />);
    setNumber(FLD.x, 2);
    setNumber(FLD.y, 3);
    expect(getStoredNumber(FLD.out_A)).toBe(5);   // eq A produced out_A
    expect(getStoredNumber(FLD.out_B)).toBe(10);  // eq B consumed the produced out_A → 5*2
  });
});
