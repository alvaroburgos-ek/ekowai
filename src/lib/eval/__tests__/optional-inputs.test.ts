import { describe, it, expect } from 'vitest';
import { defaultForAbsent, withAbsentDefault } from '../optional-inputs';
import { evaluateFormula } from '../formula';

describe('optional-zero inputs (Q_Dr)', () => {
  it('Q_Dr defaults to 0 when absent; every other symbol stays missing', () => {
    expect(defaultForAbsent('Q_Dr')).toBe(0);
    expect(defaultForAbsent('A_C')).toBeNull();
    expect(withAbsentDefault('Q_Dr', null)).toBe(0);
    expect(withAbsentDefault('Q_Dr', undefined)).toBe(0);
    expect(withAbsentDefault('Q_Dr', 0.4)).toBe(0.4); // a designed MRS throttle wins
    expect(withAbsentDefault('A_C', null)).toBeNull();
  });

  it('Gl. 9 computes q_S,AC = 10.2 for the swale case once Q_Dr is 0 instead of missing', () => {
    const formula = 'q_S_AC = (k_i * A_S_m * 1000 + Q_Dr) / A_C * 10^4';
    const mk = (qdr: number | null) => evaluateFormula({
      equationId: 'test-gl9',
      formula,
      inputSymbols: ['k_i', 'A_S_m', 'Q_Dr', 'A_C'],
      inputs: [
        { symbol: 'k_i', value: 6.6e-7, unit: 'm/s' },
        { symbol: 'A_S_m', value: 250, unit: 'm²' },
        { symbol: 'Q_Dr', value: qdr, unit: 'l/s' },
        { symbol: 'A_C', value: 162.2, unit: 'm²' },
      ],
    } as never);
    const missing = mk(null);
    expect(missing.kind).toBe('manual_required');
    const ok = mk(withAbsentDefault('Q_Dr', null));
    expect(ok.kind).toBe('computed');
    if (ok.kind === 'computed') expect(ok.value).toBeCloseTo(10.17, 2);
  });
});
