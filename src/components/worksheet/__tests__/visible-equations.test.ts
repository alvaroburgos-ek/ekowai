/** U-5 (UX pass 820, 2026-10-08): equations the engineer cannot feed or see leave the equations list. */
import { describe, it, expect } from 'vitest';
import { visibleEquations } from '../visible-equations';

const eq = (id: string, inputSymbols: string[] | null, outputSymbol: string | null) => ({ id, inputSymbols, outputSymbol });
const EQS = [eq('all-hidden', ['a', 'b'], 'z'), eq('some-hidden', ['a', 'c'], 'z'), eq('out-hidden', ['c'], 'h'), eq('no-inputs', null, null), eq('empty', [], 'z')];

describe('visibleEquations', () => {
  it('drops an equation whose inputs are ALL hidden, or whose output field is hidden; keeps the rest', () => {
    expect(visibleEquations(EQS, new Set(['a', 'b', 'h'])).map((e) => e.id)).toEqual(['some-hidden', 'no-inputs', 'empty']);
  });
  it('separate hidden-field set for the output rule', () => {
    expect(visibleEquations(EQS, new Set(['a', 'b']), new Set(['h'])).map((e) => e.id)).toEqual(['some-hidden', 'no-inputs', 'empty']);
    expect(visibleEquations(EQS, new Set(['a', 'b']), new Set()).map((e) => e.id)).toEqual(['some-hidden', 'out-hidden', 'no-inputs', 'empty']);
  });
  it('nothing hidden / undefined ⇒ all equations', () => {
    expect(visibleEquations(EQS, undefined)).toHaveLength(5);
    expect(visibleEquations(EQS, new Set())).toHaveLength(5);
  });
  it('every equation filtered ⇒ []', () => {
    expect(visibleEquations([eq('x', ['a'], 'z')], new Set(['a']))).toEqual([]);
  });
});
