import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../formula';

const req = (formula: string, inputs: Record<string, number>) => ({
  equationId: 'test-criterion-' + formula.length,
  formula,
  inputSymbols: Object.keys(inputs),
  outputSymbol: 'out',
  inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
});

describe('evaluateFormula — criterion formulas are manual_required, not error', () => {
  it('two-sided range `a <= x <= b` → manual_required', () => {
    const r = evaluateFormula(req('check = 6.0 <= ph <= 9.0', { ph: 7 }));
    expect(r.kind).toBe('manual_required');
    if (r.kind === 'manual_required') expect(r.reason).toMatch(/Kriteriumsformel/);
  });

  it('boolean conjunction → manual_required', () => {
    const r = evaluateFormula(req('ok = a AND b', { a: 1, b: 1 }));
    expect(r.kind).toBe('manual_required');
  });

  it('a plain arithmetic RHS still computes', () => {
    const r = evaluateFormula(req('V = A * h', { A: 2, h: 3 }));
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBe(6);
  });

  it('an `x >= rhs` equation is evaluated as the RHS value (unchanged behaviour)', () => {
    const r = evaluateFormula(req('S >= 150 * A', { A: 2 }));
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBe(300);
  });
});
