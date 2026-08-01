import { describe, it, expect } from 'vitest';
import { evalExpression } from '../arithmetic';

// Reproduction check for the DWA-M-363 Gl.13 symbol/case fixes
// (migration 20260801420000). Broken-before: uppercase tokens G_e/k/t etc. are
// unknown symbols → throw. Fixed-after: RHS references the declared lowercase
// fields → computes through the REAL evaluator (e = Math.E is a built-in constant).
describe('DWA-M-363 §5.7 Gl.13 fixes — reproduction (real evalExpression)', () => {
  const scope = {
    g_e: 100, k_abbau: 0.1, t_jahr: 5,
    c_ab: 22.5, f_1_aerob: 1, f_2_ausbeute: 1, f_3: 0.35, m_n_abfallmasse: 1000,
    ddoc_ma_t_minus_1: 50,
  };

  it('BROKEN-BEFORE: uppercase G_e throws (unknown symbol)', () => {
    expect(() => evalExpression('G_e * (1 - e^(-k*t))', scope)).toThrow();
  });

  it('g_t (Gl.4a) computes', () => {
    expect(evalExpression('g_e * (1 - e^(-k_abbau*t_jahr))', scope))
      .toBeCloseTo(100 * (1 - Math.exp(-0.5)), 6);
  });
  it('g_td (Gl.4b) computes', () => {
    expect(evalExpression('g_e * k_abbau * e^(-k_abbau*t_jahr)', scope))
      .toBeCloseTo(100 * 0.1 * Math.exp(-0.5), 6);
  });
  it('g_td (Gl.5) computes', () => {
    expect(evalExpression('1.868 * c_ab * f_1_aerob * f_2_ausbeute * f_3 * m_n_abfallmasse * k_abbau * e^(-k_abbau*t_jahr)', scope))
      .toBeCloseTo(1.868 * 22.5 * 1 * 1 * 0.35 * 1000 * 0.1 * Math.exp(-0.5), 4);
  });
  it('ddoc_m_decomp_t (Gl.7, minus kept per print) computes', () => {
    expect(evalExpression('ddoc_ma_t_minus_1 - (1 - e^(-k_abbau))', scope))
      .toBeCloseTo(50 - (1 - Math.exp(-0.1)), 6);
  });
});
