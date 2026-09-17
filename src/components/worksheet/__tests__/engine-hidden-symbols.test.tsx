/**
 * Plan 2a Task 10 (fix round 1) — engine `hiddenSymbols` contract.
 *
 * A field consumed by an equation is hidden via `visible_when` (computed by
 * the REAL computeVisibility over the REAL store values) → the equation's
 * state is `manual_required` with `missing` naming the symbol → the output
 * field's store value is CLEARED (the write-back effect writes null, never a
 * number computed from a value the engineer cannot see). Un-hiding recomputes.
 *
 * Renders the real useEquationEngine hook + real zustand store (no mocks) —
 * the same harness pattern as engine-routing-generalized.test.tsx.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useMemo } from 'react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { computeVisibility } from '@/lib/compliance/visibility';
import { makeSymbolLookup } from '@/lib/compliance/symbol-lookup';
import type { EvalState } from '@/lib/eval/formula';

const EQ_ID = 'test-eq-hidden-0001';
const FIELDS = [
  { id: 'f-sys', symbol: 'sewer_system_type', unit: null, sectionId: null, visibleWhen: null },
  { id: 'f-x', symbol: 'x', unit: 'm', sectionId: null, visibleWhen: "sewer_system_type == 'misch'" },
  { id: 'f-y', symbol: 'y', unit: 'm', sectionId: null, visibleWhen: null },
];
const EQUATIONS = [
  { id: EQ_ID, equationNumber: 'T-1', formula: 'y = x * 2', inputSymbols: ['x'], outputSymbol: 'y' },
];

let captured: Record<string, EvalState> = {};

/** Mirrors WorksheetForm's wiring: lookup → visibility → hiddenSymbols → hook. */
function Harness() {
  const values = useWorksheetStore((s) => s.values);
  const lookup = useMemo(() => makeSymbolLookup(FIELDS, values), [values]);
  const visibility = useMemo(() => computeVisibility(FIELDS, [], lookup), [lookup]);
  const { engineStates } = useEquationEngine({
    worksheetCode: 'TEST-01',
    fields: FIELDS,
    equations: EQUATIONS,
    hiddenSymbols: visibility.hiddenSymbols,
  });
  // eslint-disable-next-line react-hooks/globals -- test harness capture (same pattern as engine-routing-generalized)
  captured = engineStates;
  return null;
}

const storedY = () => {
  const v = useWorksheetStore.getState().values['f-y'];
  return v?.type === 'number' ? v.value : null;
};

describe('useEquationEngine — hiddenSymbols contract', () => {
  beforeEach(() => {
    act(() => useWorksheetStore.getState().init('fixture-hidden', {}, {}, {}));
    captured = {};
  });

  it('hidden input ⇒ manual_required naming the symbol ⇒ output cleared; un-hiding recomputes', () => {
    render(<Harness />);
    act(() => {
      useWorksheetStore.getState().setField('f-sys', { type: 'enum', value: 'misch' });
      useWorksheetStore.getState().setField('f-x', { type: 'number', value: 5 });
    });
    expect(captured[EQ_ID]?.kind).toBe('computed');
    expect(storedY()).toBeCloseTo(10, 9);

    // Switch to 'trenn': x's visible_when fails ⇒ x hidden ⇒ its stored 5 must NOT feed y.
    act(() => {
      useWorksheetStore.getState().setField('f-sys', { type: 'enum', value: 'trenn' });
    });
    const state = captured[EQ_ID];
    expect(state?.kind).toBe('manual_required');
    if (state?.kind === 'manual_required') expect(state.missing).toContain('x');
    expect(storedY()).toBeNull();
    // the hidden field's own stored value survives (only the ENGINE sees null)
    const x = useWorksheetStore.getState().values['f-x'];
    expect(x?.type === 'number' ? x.value : null).toBe(5);

    // Back to 'misch': visible again ⇒ recomputed from the surviving 5.
    act(() => {
      useWorksheetStore.getState().setField('f-sys', { type: 'enum', value: 'misch' });
    });
    expect(captured[EQ_ID]?.kind).toBe('computed');
    expect(storedY()).toBeCloseTo(10, 9);
  });
});
