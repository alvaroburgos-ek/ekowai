import { describe, expect, it } from 'vitest';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import { evalExpression } from '@/lib/eval/arithmetic';

// FLL-GAR-2023 Anhang 2 (printed p. 133): g' ≥ (Δu · γA − (γ'F · dF + γ'Di · dDi)) / cos β, β in degrees.
// Printed structure (re-rendered 2026-10-05): the fraction bar runs under Δu · γA only. Hand value: 1,5 · 1,0 / cos 33,69° (0,83205)
// = 1,8028; minus (10 · 0,05 + 0 · 0) = 1,3028 kN/m².
describe('trigonometry in the expression language (GAR D9)', () => {
  it('cos / sin / tan take radians; rad() converts a printed angle in degrees', () => {
    expect(evalExpression('cos(rad(60))', {})).toBeCloseTo(0.5, 12);
    expect(evalExpression('sin(rad(30))', {})).toBeCloseTo(0.5, 12);
    expect(evalExpression('tan(rad(45))', {})).toBeCloseTo(1, 12);
    expect(evalExpression('deg(rad(33.69))', {})).toBeCloseTo(33.69, 12);
    expect(evalExpression('COS(0)', {})).toBe(1); // math names are case-insensitive like ln / sqrt
  });
  it('Anhang 2 uplift check as a gate condition, both ways', () => {
    const cond = "g_prime >= (Delta_u * gamma_A) / cos(rad(beta)) - (gamma_F_prime * d_F + gamma_Di_prime * d_Di)";
    const base = { Delta_u: 1.5, gamma_A: 1.0, gamma_F_prime: 10, d_F: 0.05, gamma_Di_prime: 0, d_Di: 0, beta: 33.69 };
    const lookup = (vals: Record<string, number>) => (sym: string) => (sym in vals ? vals[sym] : undefined);
    expect(evaluateCondition(cond, lookup({ ...base, g_prime: 2.0 })).kind).toBe('pass');
    expect(evaluateCondition(cond, lookup({ ...base, g_prime: 1.2 })).kind).toBe('fail');
    expect(evalExpression('(Delta_u * gamma_A) / cos(rad(beta)) - (gamma_F_prime * d_F + gamma_Di_prime * d_Di)', base)).toBeCloseTo(1.3028, 3);
    expect(evaluateCondition(cond, lookup({ ...base })).kind).toBe('pending');
  });
});
