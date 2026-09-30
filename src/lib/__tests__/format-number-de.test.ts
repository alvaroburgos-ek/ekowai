import { describe, it, expect } from 'vitest';
import { formatNumberDe } from '../format-number-de';

describe('formatNumberDe — engineer-facing raw doubles (readiness run 2026-09-30)', () => {
  it('cleans float artefacts', () => {
    expect(formatNumberDe(162.20000000000002)).toBe('162,2');
    expect(formatNumberDe(0.16499999999999998)).toBe('0,165');
    expect(formatNumberDe(10.172626387176322)).toBe('10,1726');
    expect(formatNumberDe(16.983250560000005)).toBe('16,9833');
  });
  it('prints small permeabilities as mantissa · 10^exp instead of "0"', () => {
    expect(formatNumberDe(0.0000006599999999999999)).toBe('6,6·10⁻⁷');
    expect(formatNumberDe(1.1e-5)).toBe('1,1·10⁻⁵');
    expect(formatNumberDe(5e-11)).toBe('5·10⁻¹¹');
  });
  it('keeps small-but-not-tiny values readable', () => {
    expect(formatNumberDe(0.0016)).toBe('0,0016');
    expect(formatNumberDe(0.3451063829787234)).toBe('0,3451');
    expect(formatNumberDe(0.06)).toBe('0,06');
  });
  it('passes through non-numbers honestly', () => {
    expect(formatNumberDe(null)).toBe('—');
    expect(formatNumberDe(undefined)).toBe('—');
    expect(formatNumberDe(NaN)).toBe('—');
    expect(formatNumberDe('mulde')).toBe('mulde');
    expect(formatNumberDe(true)).toBe('Ja');
    expect(formatNumberDe(0)).toBe('0');
  });
});
