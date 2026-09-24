import { describe, it, expect } from 'vitest';
import {
  normalizeFormula,
  normalizeSymbol,
  normalizeSymbols,
} from '../normalize-formula';
import { EXPR_FUNCTION_NAMES } from '@/lib/expr';

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

describe('normalizeFormula — supported engine functions are NOT rewritten', () => {
  it('leaves 1-arg function calls intact', () => {
    expect(normalizeFormula('k = c * ln(x)')).toBe('k = c * ln(x)');
    expect(normalizeFormula('sqrt(9) + abs(x)')).toBe('sqrt(9) + abs(x)');
    expect(normalizeFormula('log10(h) - exp(y)')).toBe('log10(h) - exp(y)');
  });

  it('still rewrites symbol-style calls in the same formula', () => {
    expect(normalizeFormula('ln(x) + r_D(n)')).toBe('ln(x) + r_D_n');
  });

  it('normalizeSymbol leaves function names intact too', () => {
    expect(normalizeSymbol('ln(x)')).toBe('ln(x)');
    expect(normalizeSymbol('r_D(n)')).toBe('r_D_n');
  });
});

describe('normalizeFormula — Plan 2a: expr function set', () => {
  it('Plan 2a: row/logic function calls are never rewritten to ident_arg', () => {
    expect(normalizeFormula('count_rows(reg)')).toBe('count_rows(reg)');
    expect(normalizeFormula("flag(reg, 'x') + r_D(n)")).toBe("flag(reg, 'x') + r_D_n");
  });

  it('Plan 2a Task 6: the A138-07 register formulas pass through byte-identical', () => {
    const f = "sum_rows(surface_inventory, if(kind == 'paved', area_m2 * c_i, 0))";
    expect(normalizeFormula(f)).toBe(f);
    const cm = 'sum_rows(surface_inventory, area_m2 * c_i) / sum_rows(surface_inventory, area_m2)';
    expect(normalizeFormula(cm)).toBe(cm);
  });

  it('Plan 2a: every EXPR_FUNCTION_NAMES member with a single-token arg survives, upper-case math too', () => {
    for (const fn of EXPR_FUNCTION_NAMES) {
      expect(normalizeFormula(`${fn}(x)`)).toBe(`${fn}(x)`);
    }
    expect(normalizeFormula('SQRT(x) + EXP(y) + lg(z)')).toBe('SQRT(x) + EXP(y) + lg(z)');
    expect(normalizeSymbol('count_rows(reg)')).toBe('count_rows(reg)');
  });
});

describe('Task 4 review items (folded into Task 4b)', () => {
  it('Plan 2a: upper-case row/logic call names are excluded from the ident_arg rewrite', () => {
    expect(normalizeFormula('COUNT_ROWS(x)')).toBe('COUNT_ROWS(x)');
    expect(normalizeFormula('IF(x)')).toBe('IF(x)');
  });
});

/**
 * Plan 3 final wave C · item 1 (sibling of the CALL-regex defect) — the
 * `ident(singleToken)` rewrite must not fire on a LANGUAGE KEYWORD. Without
 * the exclusion, `a > 1 AND (b)` normalised to `a > 1 AND_b`: the connective
 * and its grouped atom were welded into one phantom symbol, so the formula
 * silently changed meaning on the way to the engine instead of being refused.
 */
describe('Plan 3 final wave C — a keyword before a parenthesised group is never rewritten', () => {
  it('AND / OR / NOT (single-token group) keep their shape', () => {
    expect(normalizeFormula('if(a > 1 AND (b), x, y)')).toBe('if(a > 1 AND (b), x, y)');
    expect(normalizeFormula('if(a > 1 or (b), x, y)')).toBe('if(a > 1 or (b), x, y)');
    expect(normalizeFormula('if(NOT (b), x, y)')).toBe('if(NOT (b), x, y)');
  });

  it('the r_D(n) accessor class is still rewritten (the fix does not disable the normaliser)', () => {
    expect(normalizeFormula('r_D(n) * A_C')).toBe('r_D_n * A_C');
  });
});
