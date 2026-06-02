import { describe, it, expect } from 'vitest';
import { formulaToLatex } from '../formula-to-latex';

describe('formulaToLatex', () => {
  it('wraps single-letter subscripts in braces', () => {
    expect(formulaToLatex('A_C')).toBe('A_{C}');
    expect(formulaToLatex('b_R + h_R')).toBe('b_{R} + h_{R}');
  });

  it('flattens multi-segment subscripts with commas (KaTeX rejects nested `_`)', () => {
    // The Pass3c DB stores aggregator inputs as e.g. `A_E_b_a_i` (befestigt,
    // area-class i). KaTeX would throw `Double subscript` on a brace group
    // that itself contains `_`, so the inner underscores are flattened to
    // commas for *display only* — the engine still sees the raw symbol.
    expect(formulaToLatex('A_E_b_a_i')).toBe('A_{E,b,a,i}');
  });

  it('preserves comma-separated subscript indices', () => {
    expect(formulaToLatex('A_S,m')).toBe('A_{S,m}');
  });

  it('leaves function-style parentheses outside the subscript', () => {
    // `r_D(n)` reads as r-sub-D evaluated at n; the (n) must stay outside.
    expect(formulaToLatex('r_D(n)')).toBe('r_{D}(n)');
  });

  it('converts numeric exponents (incl. negative)', () => {
    expect(formulaToLatex('10^7')).toBe('10^{7}');
    expect(formulaToLatex('d^2')).toBe('d^{2}');
    // A138-13 Gl. 8 uses `* 10^-3` for the unit factor; the minus must be
    // braced together with the digit or KaTeX prints a stray minus.
    expect(formulaToLatex('10^-3')).toBe('10^{-3}');
  });

  it('rewrites pi as a whole-word token only', () => {
    expect(formulaToLatex('pi')).toBe('\\pi');
    // `pivot` shouldn't be touched
    expect(formulaToLatex('pivot')).toBe('pivot');
  });

  it('rewrites multiplication operators', () => {
    expect(formulaToLatex('a * b')).toBe('a \\cdot b');
    expect(formulaToLatex('a·b')).toBe('a \\cdot b');
  });

  it('leaves `/` literal — no auto-fraction conversion', () => {
    // Conservative: KaTeX renders the slash fine. Detecting numerator/
    // denominator boundaries for nested expressions is a parser concern.
    expect(formulaToLatex('a/b')).toBe('a/b');
  });

  it('rewrites comparison operators that slip into formulas', () => {
    expect(formulaToLatex('x >= 0')).toBe('x \\geq 0');
    expect(formulaToLatex('x <= 1')).toBe('x \\leq 1');
  });

  // ---- Required reference cases from the task spec --------------------------

  it('A138-10-style: A_C / (k_i * 10^7 / r_D(n) - 1)', () => {
    expect(formulaToLatex('A_C / (k_i * 10^7 / r_D(n) - 1)')).toBe(
      'A_{C} / (k_{i} \\cdot 10^{7} / r_{D}(n) - 1)',
    );
  });

  it('A138-18-style: (b_R + h_R) * L_R + b_R * h_R', () => {
    expect(formulaToLatex('(b_R + h_R) * L_R + b_R * h_R')).toBe(
      '(b_{R} + h_{R}) \\cdot L_{R} + b_{R} \\cdot h_{R}',
    );
  });

  it('Greek + exponent combo: pi/4 * d^2', () => {
    expect(formulaToLatex('pi/4 * d^2')).toBe('\\pi/4 \\cdot d^{2}');
  });

  it('passes empty input through', () => {
    expect(formulaToLatex('')).toBe('');
  });

  it('preserves LHS `OUT = ...` form (rendered as an equation, not just RHS)', () => {
    expect(formulaToLatex('A_C = SUM(A_E_b_a_i * C_i)')).toBe(
      'A_{C} = SUM(A_{E,b,a,i} \\cdot C_{i})',
    );
  });
});
