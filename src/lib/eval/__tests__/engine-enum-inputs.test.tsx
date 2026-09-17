/**
 * Plan 3 Task 1b (a138-I-1) — enum/text field values reach formulas through
 * the CLIENT hook.
 *
 * A `lookup(TAB, enumSymbol, …)` formula (the A138-08-D1 `n_limit` shape,
 * a138 TS fallback TAB8) computes from a stored `{type:'enum'}` value and
 * from a stored `{type:'text'}` value; the computed number is written back
 * to the output field. An unset select is a visible missing input (output
 * cleared), and a text value that reaches an arithmetic operator is
 * manual_required with a German reason — never `computed: NaN`.
 *
 * Renders the real useEquationEngine hook + real zustand store (no mocks) —
 * the same harness pattern as engine-hidden-symbols.test.tsx.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import type { EvalState } from '@/lib/eval/formula';

const EQ_LOOKUP = 'test-eq-enum-lookup-0001';
const EQ_NAN = 'test-eq-enum-nan-0002';
const FIELDS = [
  { id: 'f-sk', symbol: 'schutzkategorie', unit: null, dataType: 'enum' },
  { id: 'f-ac', symbol: 'A_C', unit: 'm²', dataType: 'number' },
  { id: 'f-nl', symbol: 'n_limit', unit: '1/a', dataType: 'number' },
  { id: 'f-note', symbol: 'note', unit: null, dataType: 'text' },
  { id: 'f-y', symbol: 'y', unit: null, dataType: 'number' },
];
const EQUATIONS = [
  {
    id: EQ_LOOKUP,
    equationNumber: 'A138-08-D1',
    formula: "n_limit = lookup('TAB8', schutzkategorie, if(A_C <= 800, 'le800', 'gt800'), 'n_max')",
    inputSymbols: ['schutzkategorie', 'A_C'],
    outputSymbol: 'n_limit',
  },
  { id: EQ_NAN, equationNumber: 'T-NAN', formula: 'y = note + 1', inputSymbols: ['note'], outputSymbol: 'y' },
];

let captured: Record<string, EvalState> = {};

function Harness() {
  const { engineStates } = useEquationEngine({
    worksheetCode: 'A138-08',
    standardCode: 'DWA-A-138-1',
    fields: FIELDS,
    equations: EQUATIONS,
  });
  // eslint-disable-next-line react-hooks/globals -- test harness capture (same pattern as engine-hidden-symbols)
  captured = engineStates;
  return null;
}

const stored = (id: string) => {
  const v = useWorksheetStore.getState().values[id];
  return v?.type === 'number' ? v.value : null;
};
const set = (id: string, v: Parameters<ReturnType<typeof useWorksheetStore.getState>['setField']>[1]) =>
  act(() => useWorksheetStore.getState().setField(id, v));

describe('useEquationEngine — enum/text inputs reach formulas (Task 1b)', () => {
  beforeEach(() => {
    act(() => useWorksheetStore.getState().init('fixture-enum-inputs', {}, {}, {}));
    captured = {};
  });

  it("lookup(TAB8, enumSymbol) computes from a stored {type:'enum'} value and writes the number back", () => {
    render(<Harness />);
    set('f-ac', { type: 'number', value: 500 });
    // select unset ⇒ visible missing input, output stays clear
    expect(captured[EQ_LOOKUP]?.kind).toBe('manual_required');
    if (captured[EQ_LOOKUP]?.kind === 'manual_required') expect(captured[EQ_LOOKUP].missing).toEqual(['schutzkategorie']);
    expect(stored('f-nl')).toBeNull();

    set('f-sk', { type: 'enum', value: 'gering' });
    expect(captured[EQ_LOOKUP]).toMatchObject({ kind: 'computed', value: 0.33, substituted: { schutzkategorie: 'gering', A_C: 500 } });
    expect(stored('f-nl')).toBe(0.33);

    // the band flips with A_C; the row with the Schutzkategorie
    set('f-ac', { type: 'number', value: 900 });
    expect(stored('f-nl')).toBe(0.5);
    set('f-sk', { type: 'enum', value: 'sehr_stark' });
    expect(stored('f-nl')).toBe(0.1);

    // clearing the select clears the output again (never a stale number)
    set('f-sk', { type: 'enum', value: null });
    expect(captured[EQ_LOOKUP]?.kind).toBe('manual_required');
    expect(stored('f-nl')).toBeNull();
    set('f-sk', { type: 'enum', value: '' });
    expect(captured[EQ_LOOKUP]?.kind).toBe('manual_required');
    expect(stored('f-nl')).toBeNull();
  });

  it("a stored {type:'text'} value is passed as its string too", () => {
    render(<Harness />);
    set('f-ac', { type: 'number', value: 100 });
    set('f-sk', { type: 'text', value: 'maessig' });
    expect(captured[EQ_LOOKUP]).toMatchObject({ kind: 'computed', value: 0.2 });
    expect(stored('f-nl')).toBe(0.2);
  });

  it('a text value reaching arithmetic ⇒ manual_required with a German reason; the output is never NaN', () => {
    render(<Harness />);
    set('f-note', { type: 'text', value: 'BK_I' });
    expect(captured[EQ_NAN]).toMatchObject({ kind: 'manual_required', reason: 'Operand ist keine Zahl: BK_I' });
    expect(stored('f-y')).toBeNull();
  });
});
