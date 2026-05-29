import { describe, it, expect } from 'vitest';
import {
  normalizeFormula,
  normalizeSymbol,
  normalizeSymbols,
} from '../normalize-formula';

describe('normalizeFormula', () => {
  it('rewrites the r_D(n) function-call notation to r_D_n', () => {
    expect(normalizeFormula('A_S = A_C / (k_i * 10^7 / r_D(n) - 1)')).toBe(
      'A_S = A_C / (k_i * 10^7 / r_D_n - 1)',
    );
  });

  it('rewrites r_D(30) → r_D_30 (numeric arg)', () => {
    expect(normalizeFormula('x = r_D(30) + 1')).toBe('x = r_D_30 + 1');
  });

  it('handles multiple occurrences in one formula', () => {
    expect(normalizeFormula('r_D(n) + r_5(n) + r_D(30)')).toBe(
      'r_D_n + r_5_n + r_D_30',
    );
  });

  it('leaves real grouping parens alone', () => {
    expect(normalizeFormula('A_S = (A_C + 1) / (k_i + 2)')).toBe(
      'A_S = (A_C + 1) / (k_i + 2)',
    );
  });

  it('does NOT rewrite expressions inside parens (those need a rewrite rule)', () => {
    expect(normalizeFormula('x = f(a + b)')).toBe('x = f(a + b)');
  });

  it('normalizes a single symbol the same way', () => {
    expect(normalizeSymbol('r_D(n)')).toBe('r_D_n');
    expect(normalizeSymbol('A_C')).toBe('A_C');
  });

  it('normalizes a list of symbols', () => {
    expect(normalizeSymbols(['A_C', 'r_D(n)', 'k_i', 'r_5(n)'])).toEqual([
      'A_C',
      'r_D_n',
      'k_i',
      'r_5_n',
    ]);
  });
});
