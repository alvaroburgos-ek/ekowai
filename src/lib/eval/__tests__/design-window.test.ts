/**
 * Design window — pinned against the hand calculation of the first real
 * case (report EKO-2026-001 R0, A_C 162.2 m², k_i 6.6·10⁻⁷ m/s, f_Z 1.2,
 * KOSTRA cell 123107, T = 10 a): swale 250 m² → V_M 17.0 m³ at D = 540 min,
 * h 6.8 cm, t_E 28.6 h, q_S,AC 10.2; trench 1 × 1 m gravel (s_R 0.35) →
 * L_R 24.4 m at D = 1080 min; element (50 m² swale, V_M 7.5 m³) → 18.1 m at
 * D = 2880 min; surface infiltration fails Gl. 13 at D = 10 min.
 */
import { describe, it, expect } from 'vitest';
import { evaluateDesignWindow, DESIGN_WINDOWS, WINDOW_BY_WORKSHEET } from '../design-window';
import { KOSTRA_123107_T10, KOSTRA_123107_T5 } from './fixtures/kostra-123107';

const CASE = { A_C: 162.2, k_i: 6.6e-7, f_Z: 1.2, f_A: 1 };
const asRows = (a: Array<{ D_min: number; r_D_n: number }>) => a.map((r) => ({ D_min: r.D_min, r_D_n: r.r_D_n }));

function ok<T>(r: T | { error: string }): T {
  if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error);
  return r as T;
}

describe('design window — Versickerungsmulde', () => {
  it('reproduces the case at 250 m² (T = 10 a) and reports every limit as met', () => {
    const w = ok(evaluateDesignWindow('mulde', asRows(KOSTRA_123107_T10), CASE, 250));
    expect(w.current).not.toBeNull();
    const d = w.current!.derived;
    expect(d.V_M).toBeCloseTo(17.0, 1);
    expect(d.D).toBe(540);
    expect(d.h).toBeCloseTo(6.8, 1);
    expect(d.t_E).toBeCloseTo(28.6, 1);
    expect(d.q_S_AC).toBeCloseTo(10.2, 1);
    expect(w.current!.ok).toBe(true);
    expect(w.current!.checks.every((c) => c.ok && !c.near)).toBe(true);
    expect(w.current!.checks.find((c) => c.key === 't_E_max')!.severity).toBe('info'); // review F-1: information only
    expect(w.governingD).toBe(540);
    expect(w.curve?.length).toBe(22);
  });

  it('T = 5 a comparison: 13.6 m³ at 360 min', () => {
    const w = ok(evaluateDesignWindow('mulde', asRows(KOSTRA_123107_T5), CASE, 250));
    expect(w.current!.derived.V_M).toBeCloseTo(13.6, 1);
    expect(w.current!.derived.D).toBe(360);
  });

  it('finds the window edges: 50 m² is the lower edge (q_S,AC 2.03 near, t_E 103 h only informational), 40 m² fails h and q', () => {
    const w = ok(evaluateDesignWindow('mulde', asRows(KOSTRA_123107_T10), CASE, 250));
    expect(w.window.min).toBeGreaterThan(40);
    expect(w.window.min).toBeLessThanOrEqual(50);
    const at = (x: number) => ok(evaluateDesignWindow('mulde', asRows(KOSTRA_123107_T10), CASE, x)).current!;
    const r50 = at(50);
    expect(r50.ok).toBe(true); // review F-1: the 84 h row is for n = 1/a and not required in the simple method
    expect(r50.checks.find((c) => c.key === 't_E_max')!.ok).toBe(false); // still shown as exceeded, informational
    expect(r50.checks.find((c) => c.key === 'q_min')!.near).toBe(true); // 2.03 ≥ 2
    const r40 = at(40);
    expect(r40.ok).toBe(false);
    expect(r40.checks.filter((c) => !c.ok && c.severity !== 'info').map((c) => c.key).sort()).toEqual(['h_max', 'q_min']);
    expect(at(75).ok).toBe(true);
  });

  it('A_VA given explicitly is used instead of the A_VA = A_S,m approximation (review F-3a)', () => {
    const approx = ok(evaluateDesignWindow('mulde', asRows(KOSTRA_123107_T10), CASE, 250)).current!.derived.V_M!;
    const explicit = ok(evaluateDesignWindow('mulde', asRows(KOSTRA_123107_T10), { ...CASE, A_VA: 300 }, 250)).current!.derived.V_M!;
    expect(explicit).toBeGreaterThan(approx);
  });

  it('refuses without the fixed inputs and names them', () => {
    const r = evaluateDesignWindow('mulde', asRows(KOSTRA_123107_T10), { k_i: 6.6e-7 }, 250);
    expect('error' in r && r.error).toMatch(/A_C/);
  });
});

describe('design window — Rigole and Mulden-Rigolen-Element', () => {
  it('trench 1 × 1 m gravel: L_R,erf 24.4 m at D = 1080 min; 25 m chosen is ok but near', () => {
    const w = ok(evaluateDesignWindow('rigole', asRows(KOSTRA_123107_T10), { ...CASE, b_R: 1, h_R: 1, s_R: 0.35 }, 25));
    expect(w.current!.derived.L_req).toBeCloseTo(24.4, 1);
    expect(w.current!.derived.D).toBe(1080);
    expect(w.current!.derived.V_R).toBeCloseTo(8.75, 2);
    const len = w.current!.checks.find((c) => c.key === 'length')!;
    expect(len.ok).toBe(true);
    expect(len.near).toBe(true);
    expect(w.window.min).toBeLessThanOrEqual(25);
  });

  it('element: 50 m² swale (V_M 7.5 m³) over a 1 × 1 m trench needs 18.1 m at D = 2880 min', () => {
    const w = ok(evaluateDesignWindow('MRE', asRows(KOSTRA_123107_T10), { ...CASE, A_VA: 50, V_M: 7.5, b_R: 1, h_R: 1, s_R: 0.35 }, 20));
    expect(w.current!.derived.L_req).toBeCloseTo(18.1, 1);
    expect(w.current!.derived.D).toBe(2880);
    expect(w.current!.derived.V_MR).toBeCloseTo(7.5 + 7.0, 1);
    expect(w.current!.ok).toBe(true);
  });
});

describe('design window — Flächenversickerung and Becken', () => {
  it('surface infiltration fails Gl. 13 with silty sand (needs k_i > 2.43·10⁻⁵ at D = 10 min)', () => {
    const w = ok(evaluateDesignWindow('flaeche', asRows(KOSTRA_123107_T10), CASE, 250));
    expect(w.current!.derived.r_D).toBe(243.3);
    expect(w.current!.derived.k_i_req).toBeCloseTo(2.433e-5, 8);
    expect(w.current!.derived.A_S_req).toBeNull();
    expect(w.current!.checks.find((c) => c.key === 'gl13')!.ok).toBe(false);
    expect(w.window.min).toBeNull();
  });

  it('basin: for 162 m² the Tab.-14 ponding ≥ 50 cm needs a bed under 25 m² (disproportionate); 50 m² ponds 24 cm, 250 m² 7 cm', () => {
    const w50 = ok(evaluateDesignWindow('becken', asRows(KOSTRA_123107_T10), { ...CASE, A_VA: 50 }, 50));
    expect(w50.current!.derived.h).toBeCloseTo(24.4, 1);
    expect(w50.current!.checks.find((c) => c.key === 'h_min')!.ok).toBe(false);
    // the scan around 50 m² starts at 5 m²; every scanned point with h ≥ 50 cm sits below 25 m²
    const okPts = w50.steps.filter((r) => r.ok).map((r) => r.x);
    expect(okPts.every((x) => x < 25)).toBe(true);
    const w250 = ok(evaluateDesignWindow('becken', asRows(KOSTRA_123107_T10), { ...CASE, A_VA: 250 }, 250));
    expect(w250.current!.checks.find((c) => c.key === 'h_min')!.ok).toBe(false);
  });

  it('exposes the definitions the panel needs', () => {
    expect(Object.keys(DESIGN_WINDOWS).sort()).toEqual(['MRE', 'becken', 'flaeche', 'mulde', 'rigole']);
    expect(WINDOW_BY_WORKSHEET['A138-17']).toBe('mulde');
    expect('error' in evaluateDesignWindow('MRS', [], {}, 1)).toBe(true);
  });
});
