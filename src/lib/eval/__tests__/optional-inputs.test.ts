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

describe('optional-zero az and conditional-zero pipe diameters (readiness run 2026-09-30, case A6)', () => {
  it('az defaults to 0 (no seepage pipe); d_i/d_a default to 0 only when az resolves to 0', () => {
    expect(defaultForAbsent('az')).toBe(0);
    // Gate absent → az is absent-zero → diameters are 0.
    expect(defaultForAbsent('d_i', () => null)).toBe(0);
    expect(defaultForAbsent('d_a', () => null)).toBe(0);
    // Gate explicitly 0 → 0.
    expect(defaultForAbsent('d_i', (s) => (s === 'az' ? 0 : null))).toBe(0);
    // Gate 1 (a pipe is declared) → the diameter is genuinely missing.
    expect(defaultForAbsent('d_i', (s) => (s === 'az' ? 1 : null))).toBeNull();
    // Without a resolver the conditional default never applies (fail-safe).
    expect(defaultForAbsent('d_i')).toBeNull();
    expect(withAbsentDefault('d_a', 0.32, () => 0)).toBe(0.32);
  });

  it('Gl. 21 evaluates s_R = s_F for a pipe-less trench once az/d_i/d_a resolve to 0', () => {
    const formula = 's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi / 4) * ((d_i^2 / s_F) - d_a^2))';
    const resolve = () => null;
    const r = evaluateFormula({
      equationId: 'test-gl21',
      formula,
      inputSymbols: ['s_F', 'b_R', 'h_R', 'az', 'd_i', 'd_a'],
      inputs: [
        { symbol: 's_F', value: 0.35, unit: null },
        { symbol: 'b_R', value: 1, unit: 'm' },
        { symbol: 'h_R', value: 1, unit: 'm' },
        { symbol: 'az', value: defaultForAbsent('az', resolve), unit: null },
        { symbol: 'd_i', value: defaultForAbsent('d_i', resolve), unit: 'm' },
        { symbol: 'd_a', value: defaultForAbsent('d_a', resolve), unit: 'm' },
      ],
      constants: { pi: Math.PI },
    } as never);
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(0.35, 12);
  });
});
