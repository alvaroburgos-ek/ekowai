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
import { fmt, FMT_EPSILON } from '../register-editor';

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

/**
 * Plan 3 final wave B (defect 4) — the epsilon guard the Task-10b fix left open
 * (Plan-2c backlog item 13): float noise around 1e-13 rendered in SCIENTIFIC form
 * ("1e-13") instead of "0". A difference that is exactly zero in the guideline's
 * arithmetic and only non-zero because of IEEE-754 cancellation must read as zero;
 * a magnitude a standard actually prints (k_f down to ~1e-10 m/s, DIN 18130-1)
 * must keep the scientific form. `FMT_EPSILON` is the documented boundary.
 */
describe('fmt() — epsilon guard for float noise (wave B defect 4)', () => {
  it('cancellation noise below the epsilon reads as "0", not as a tiny value', () => {
    expect(fmt(0.3 - 0.1 - 0.2)).toBe('0');            // ≈ -2.78e-17
    expect(fmt(1e-13)).toBe('0');
    expect(fmt(-1e-13)).toBe('0');
  });
  it('the epsilon boundary itself is noise; the first decade above it is a value', () => {
    expect(fmt(FMT_EPSILON)).toBe('0');
    expect(fmt(FMT_EPSILON * 10)).toBe('1e-11');
  });
  it('every printed magnitude of the corpus is far above the epsilon and keeps scientific form', () => {
    expect(FMT_EPSILON).toBeLessThan(3.48e-10 / 100);  // DIN-18130-1 k_f, the smallest printed value
    expect(fmt(3.48e-10)).toBe('3,48e-10');
    expect(fmt(2e-6)).toBe('2e-6');                    // A138 k_f site values
  });
});
