/**
 * Plan 3 final wave A · defects 1 + 2 through the CLIENT HOOK.
 *
 * Renders the real `useEquationEngine` + the real zustand store (no mocks) —
 * the same harness pattern as engine-enum-inputs.test.tsx — so the two fixes
 * are proven on the path the engineer actually uses:
 *
 *   - defect 2: a json `select_many` checklist reaches `contains()` as a
 *     CARRIER (before: `Unbekanntes Symbol "…" im Ausdruck.` forever);
 *   - defect 1: a `{type:'boolean'}` store value reaches a scalar equation
 *     (before: `Fehlende oder leere Eingaben: …` forever).
 *
 * …and that the write-back contract is unchanged: a computed verdict is
 * written to the output field, anything else CLEARS it (never a stale number).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import type { EvalState } from '@/lib/eval/formula';

const EQ_CHECKLIST = 'test-eq-carrier-checklist-0001';
const EQ_BOOLEAN = 'test-eq-carrier-boolean-0002';

const SIX = ['systems_thinking', 'value_creation', 'value_sharing', 'resource_stewardship', 'resource_traceability', 'ecosystem_resilience'];

const FIELDS = [
  { id: 'f-p', symbol: 'principles', unit: null, dataType: 'json', widget: 'select_many', uiConfig: { options: SIX } },
  { id: 'f-code', symbol: 'all_principles_considered_code', unit: null, dataType: 'number' },
  { id: 'f-flag', symbol: 'verifiable_without_confidential', unit: null, dataType: 'boolean' },
  { id: 'f-vcode', symbol: 'verifiable_code', unit: null, dataType: 'number' },
];

const EQUATIONS = [
  {
    id: EQ_CHECKLIST,
    equationNumber: 'ISO-59004-04-D1',
    // the verbatim withheld iso59004-F-1 shape
    formula:
      "all_principles_considered_code = if(contains(principles, 'systems_thinking') AND contains(principles, 'value_creation') AND " +
      "contains(principles, 'value_sharing') AND contains(principles, 'resource_stewardship') AND " +
      "contains(principles, 'resource_traceability') AND contains(principles, 'ecosystem_resilience'), 1, 0)",
    inputSymbols: ['principles'],
    outputSymbol: 'all_principles_considered_code',
  },
  {
    id: EQ_BOOLEAN,
    equationNumber: 'DIN-14021-04-D0',
    formula: 'verifiable_code = if(verifiable_without_confidential == true, 1, 0)',
    inputSymbols: ['verifiable_without_confidential'],
    outputSymbol: 'verifiable_code',
  },
];

let captured: Record<string, EvalState> = {};

function Harness() {
  const { engineStates } = useEquationEngine({
    worksheetCode: 'ISO-59004-04',
    standardCode: 'ISO-59004',
    fields: FIELDS,
    equations: EQUATIONS,
  });
  // eslint-disable-next-line react-hooks/globals -- test harness capture (same pattern as engine-enum-inputs)
  captured = engineStates;
  return null;
}

const stored = (id: string) => {
  const v = useWorksheetStore.getState().values[id];
  return v?.type === 'number' ? v.value : null;
};
const set = (id: string, v: Parameters<ReturnType<typeof useWorksheetStore.getState>['setField']>[1]) =>
  act(() => useWorksheetStore.getState().setField(id, v));

describe('useEquationEngine — json carriers and booleans reach formulas (wave A)', () => {
  beforeEach(() => {
    act(() => useWorksheetStore.getState().init('fixture-wave-a-carriers', {}, {}, {}));
    captured = {};
  });

  it('defect 2: a select_many checklist reaches contains() — unfilled ⇒ manual_required, all six ⇒ 1, one removed ⇒ 0', () => {
    render(<Harness />);
    // unfilled: the fail-safe state, output clear — never a phantom "nothing ticked" 0
    expect(captured[EQ_CHECKLIST]?.kind).toBe('manual_required');
    expect(stored('f-code')).toBeNull();

    set('f-p', { type: 'json', value: SIX });
    expect(captured[EQ_CHECKLIST]).toMatchObject({ kind: 'computed', value: 1 });
    expect(stored('f-code')).toBe(1);

    set('f-p', { type: 'json', value: SIX.slice(0, 5) });
    expect(captured[EQ_CHECKLIST]).toMatchObject({ kind: 'computed', value: 0 });
    expect(stored('f-code')).toBe(0);

    // clearing the checklist clears the output again
    set('f-p', { type: 'json', value: null });
    expect(captured[EQ_CHECKLIST]?.kind).toBe('manual_required');
    expect(stored('f-code')).toBeNull();
  });

  it('defect 1: a boolean reaches a scalar equation — true ⇒ 1, false ⇒ 0, unanswered ⇒ manual_required', () => {
    render(<Harness />);
    expect(captured[EQ_BOOLEAN]?.kind).toBe('manual_required');
    if (captured[EQ_BOOLEAN]?.kind === 'manual_required') {
      expect(captured[EQ_BOOLEAN].missing).toEqual(['verifiable_without_confidential']);
    }
    expect(stored('f-vcode')).toBeNull();

    set('f-flag', { type: 'boolean', value: true });
    expect(captured[EQ_BOOLEAN]).toMatchObject({ kind: 'computed', value: 1, substituted: { verifiable_without_confidential: true } });
    expect(stored('f-vcode')).toBe(1);

    // FALSE is a value, not a missing input
    set('f-flag', { type: 'boolean', value: false });
    expect(captured[EQ_BOOLEAN]).toMatchObject({ kind: 'computed', value: 0, substituted: { verifiable_without_confidential: false } });
    expect(stored('f-vcode')).toBe(0);

    set('f-flag', { type: 'boolean', value: null });
    expect(captured[EQ_BOOLEAN]?.kind).toBe('manual_required');
    expect(stored('f-vcode')).toBeNull();
  });
});
