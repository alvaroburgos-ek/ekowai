import { describe, it, expect } from 'vitest';
import { evalExpression } from './arithmetic';

describe('evalExpression', () => {
  it('basic arithmetic with precedence', () => {
    expect(evalExpression('1 + 2 * 3', {})).toBe(7);
    expect(evalExpression('(1 + 2) * 3', {})).toBe(9);
    expect(evalExpression('10 - 2 - 3', {})).toBe(5);
    expect(evalExpression('100 / 4 / 5', {})).toBe(5);
  });

  it('substitutes identifiers from scope', () => {
    expect(evalExpression('a * b + c', { a: 2, b: 3, c: 4 })).toBe(10);
  });

  it('handles unary minus', () => {
    expect(evalExpression('-5 + 3', {})).toBe(-2);
    expect(evalExpression('a * -b', { a: 4, b: 3 })).toBe(-12);
  });

  it('power is right-associative', () => {
    expect(evalExpression('2 ^ 3', {})).toBe(8);
    expect(evalExpression('2 ^ 3 ^ 2', {})).toBe(512); // 2^(3^2) = 2^9
  });

  it('handles scientific notation', () => {
    expect(evalExpression('1e-3', {})).toBe(0.001);
    expect(evalExpression('1.5e2', {})).toBe(150);
    expect(evalExpression('10 ^ -3', {})).toBeCloseTo(0.001);
  });

  it('reproduces the Gl. 2 acceptance answer', () => {
    const result = evalExpression(
      'A_E_b_a_total * C_m + A_E_nb_a_total * C_m',
      { A_E_b_a_total: 700, A_E_nb_a_total: 100, C_m: 0.7875 },
    );
    expect(result).toBe(630);
  });

  it('throws on unknown symbol — engine must NOT silently treat as 0', () => {
    expect(() => evalExpression('a + b', { a: 1 })).toThrow(/Unbekanntes Symbol "b"/);
  });

  it('throws on function call — engine must require rewrite', () => {
    expect(() => evalExpression('SUM(a, b)', { a: 1, b: 2 })).toThrow(/Funktionsaufruf/);
  });

  it('throws on division by zero', () => {
    expect(() => evalExpression('5 / 0', {})).toThrow(/Division durch Null/);
  });

  it('throws on malformed input', () => {
    expect(() => evalExpression('1 +* 2', {})).toThrow();
    expect(() => evalExpression('(1 + 2', {})).toThrow(/schließende Klammer/);
  });
});

describe('evalExpression — 1-arg math functions (ln/log10/sqrt/exp/abs)', () => {
  it('ln is the natural logarithm', () => {
    expect(evalExpression('ln(x)', { x: Math.E })).toBeCloseTo(1);
    expect(evalExpression('ln(1)', {})).toBe(0);
  });

  it('log10, sqrt, exp, abs', () => {
    expect(evalExpression('log10(100)', {})).toBe(2);
    expect(evalExpression('sqrt(9)', {})).toBe(3);
    expect(evalExpression('exp(0)', {})).toBe(1);
    expect(evalExpression('abs(0 - 5)', {})).toBe(5);
  });

  it('composes with arithmetic — DIN-18130-1 Gl.9 falling-head shape', () => {
    // k = (a*L/(A*t)) * ln(h1/h2)
    const v = evalExpression('(a * L / (A * t)) * ln(h1 / h2)', {
      a: 0.5, L: 10, A: 20, t: 100, h1: 100, h2: 50,
    });
    expect(v).toBeCloseTo((0.5 * 10 / (20 * 100)) * Math.log(2));
  });

  it('domain errors fail loud (non-finite)', () => {
    expect(() => evalExpression('ln(0)', {})).toThrow(/Nicht-endliches/);
    expect(() => evalExpression('ln(0 - 1)', {})).toThrow(/Nicht-endliches/);
    expect(() => evalExpression('sqrt(0 - 4)', {})).toThrow(/Nicht-endliches/);
  });

  it('unknown function calls still throw (fail loud)', () => {
    expect(() => evalExpression('foo(3)', {})).toThrow(/nicht unterstützt/);
    expect(() => evalExpression('SUM(3)', {})).toThrow(/nicht unterstützt/);
  });

  it('min/max 2-arg regression', () => {
    expect(evalExpression('min(2, 3)', {})).toBe(2);
    expect(evalExpression('max(2, 3)', {})).toBe(3);
  });

  it('1-arg call with wrong arity fails loud', () => {
    expect(() => evalExpression('ln(1, 2)', {})).toThrow();
    expect(() => evalExpression('min(1)', {})).toThrow();
  });
});
