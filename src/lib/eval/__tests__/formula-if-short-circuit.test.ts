/**
 * FLL readiness run 2026-10-05, GAR D1: `r_klasse_code = if(neurissbildung == 'ausgeschlossen', 0, …)` was manual_required
 * whenever the crack inputs of the untaken branch were empty, although the evaluator short-circuits.
 */
import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../formula';

const req = (inputs: Array<{ symbol: string; value: number | string | null }>) => ({
  equationId: 'eq-if', formula: "r_klasse_code = if(neurissbildung == 'ausgeschlossen', 0, if(rissbreite_erwartet_mm <= 0.2, 1, 2))",
  inputSymbols: ['neurissbildung', 'rissbreite_erwartet_mm'], outputSymbol: 'r_klasse_code', expectedUnits: {},
  inputs: inputs.map((i) => ({ ...i, unit: null })),
});

describe('if() formulas evaluate with the inputs of the taken branch only', () => {
  it('computes 0 for "ausgeschlossen" although the crack width is empty', () => {
    const s = evaluateFormula(req([{ symbol: 'neurissbildung', value: 'ausgeschlossen' }, { symbol: 'rissbreite_erwartet_mm', value: null }]));
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') expect(s.value).toBe(0);
  });
  it('still reports the missing input when the taken branch needs it', () => {
    const s = evaluateFormula(req([{ symbol: 'neurissbildung', value: 'erwartet' }, { symbol: 'rissbreite_erwartet_mm', value: null }]));
    expect(s.kind).toBe('manual_required');
  });
  it('a formula without if() keeps the declared-input check', () => {
    const s = evaluateFormula({ equationId: 'eq-plain', formula: 'y = a + b', inputSymbols: ['a', 'b'], outputSymbol: 'y', expectedUnits: {}, inputs: [{ symbol: 'a', value: 1, unit: null }, { symbol: 'b', value: null, unit: null }] });
    expect(s.kind).toBe('manual_required');
  });
});
