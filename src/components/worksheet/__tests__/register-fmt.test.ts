/**
 * Task 10b (din18130_1-I-2, [CODE]-class UI fix) — pins `fmt()`'s de-DE number
 * formatting, including the fix: a non-zero |v| < 0.01 must not collapse to
 * "0" (the DIN-18130-1 register cells / footer `k_T_mean` / `k_10_calc`
 * regression, k = 3,48·10⁻¹⁰ m/s). Convention chosen (matches the equation
 * card's `toPrecision`/scientific branch in equation-engine-card.tsx
 * `formatNumber`, but locale-adapted): scientific notation with a German
 * decimal comma and up to 4 significant digits, e.g. `3,48e-10` — NOT the
 * `3,48·10⁻¹⁰` middle-dot/superscript form, so the string stays trivially
 * comparable/greppable and consistent with `toExponential`. The card's
 * `|v| >= 1000` branch is NOT ported here (out of scope for this fix; large
 * numbers keep today's `de-DE` grouping unchanged).
 */
import { describe, it, expect } from 'vitest';
import { fmt } from '../register-editor';

describe('fmt() — de-DE number formatting (register cells + footers)', () => {
  it('a tiny non-zero magnitude (|v| < 0.01) renders in scientific form with a German decimal comma (din18130_1-I-2 fix)', () => {
    expect(fmt(3.48e-10)).toBe('3,48e-10');
  });
  it('a negative tiny magnitude keeps its sign', () => {
    expect(fmt(-3.48e-10)).toBe('-3,48e-10');
  });
  it('a value at/above the 0.01 threshold is unaffected (stays plain de-DE decimal)', () => {
    expect(fmt(0.0123)).toBe('0,0123');
  });
  it('exact zero stays "0", never scientific', () => {
    expect(fmt(0)).toBe('0');
  });
  it('large numbers keep today\'s de-DE grouping (unchanged; the card\'s >= 1000 rule is not ported here)', () => {
    expect(fmt(1234.5)).toBe('1.234,5');
  });
  it('null renders as the em dash placeholder', () => {
    expect(fmt(null)).toBe('—');
  });
  it('a non-numeric scalar renders verbatim', () => {
    expect(fmt('text')).toBe('text');
  });
});
