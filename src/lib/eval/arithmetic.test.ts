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
