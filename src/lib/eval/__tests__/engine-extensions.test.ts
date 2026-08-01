import { describe, it, expect } from 'vitest';
import { evalExpression } from '../arithmetic';
import { evaluateFormula } from '../formula';

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe('arithmetic engine — 1-arg functions + constants (regression/growth support)', () => {
  it('ln / log / log10 / exp / sqrt / abs', () => {
    expect(near(evalExpression('ln(x)', { x: Math.E }), 1)).toBe(true);
    expect(near(evalExpression('log(x)', { x: Math.E }), 1)).toBe(true); // natural log
    expect(near(evalExpression('log10(x)', { x: 1000 }), 3)).toBe(true);
    expect(near(evalExpression('exp(x)', { x: 0 }), 1)).toBe(true);
    expect(near(evalExpression('sqrt(x)', { x: 9 }), 3)).toBe(true);
    expect(near(evalExpression('abs(x)', { x: -4 }), 4)).toBe(true);
  });
  it('e and pi resolve as constants when not provided as fields', () => {
    expect(near(evalExpression('e^(-k)', { k: 0 }), 1)).toBe(true);
    expect(near(evalExpression('e^(1)', {}), Math.E)).toBe(true);
    expect(near(evalExpression('pi', {}), Math.PI)).toBe(true);
  });
  it('a real field named e/pi WINS over the constant', () => {
    expect(evalExpression('e', { e: 42 })).toBe(42);
  });
  it('a DWA-M-102-4-style regression term computes', () => {
    // a_F = 0.05912*ln(P) - 0.02749*f_Fu + 4.97687/(4.7975 + k_f)
    const v = evalExpression('0.05912*ln(P) - 0.02749*f_Fu + 4.97687/(4.7975 + k_f)', { P: 700, f_Fu: 1, k_f: 5 });
    expect(Number.isFinite(v)).toBe(true);
  });
});

const REQ = (formula: string, inputs: Record<string, number>) => ({
  equationId: 'test', formula, inputSymbols: Object.keys(inputs), outputSymbol: 'out',
  inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
});

describe('evaluateFormula — comparison/criterion formulas are manual, not error', () => {
  it('two-sided range (AND) → manual_required, not error', () => {
    const r = evaluateFormula(REQ('uv_dosis >= 300 AND uv_dosis <= 450', { uv_dosis: 350 }));
    expect(r.kind).toBe('manual_required');
  });
  it('double comparison → manual', () => {
    expect(evaluateFormula(REQ('Q_M >= a >= b', { Q_M: 1, a: 2, b: 3 })).kind).toBe('manual_required');
  });
  it('a genuine computable equation still COMPUTES (not swept into manual)', () => {
    const r = evaluateFormula(REQ('Q_bem = EZ / 192 + q * A', { EZ: 1000, q: 0.05, A: 10 }));
    expect(r.kind).toBe('computed');
  });
  it('a threshold equation with a bare-symbol LHS still computes its RHS bound', () => {
    // rhs() strips `A_NB >=`, leaving the computable bound — must NOT be swept to manual
    const r = evaluateFormula(REQ('A_NB = Q_bem * (1 + RV) / 2.2', { Q_bem: 5, RV: 1 }));
    expect(r.kind).toBe('computed');
  });
  it('now-supported exp/ln equation computes end-to-end', () => {
    const r = evaluateFormula(REQ('kLa20 = kLaT * 1.024 ^ (20 - T_W)', { kLaT: 5, T_W: 15 }));
    expect(r.kind).toBe('computed');
  });
});
