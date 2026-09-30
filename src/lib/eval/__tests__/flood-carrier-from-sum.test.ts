import { describe, it, expect } from 'vitest';
import { floodCarrierFromSum } from '../aggregators';

/** Readiness run 2026-09-30, case A10: Gl. 10 reads the A138-26-D1 sum as its single source. */
describe('floodCarrierFromSum', () => {
  it('wraps the paved-area sum as one C_S = 1 row that reproduces Σ(A_E,b,a·C_S) exactly', () => {
    const c = floodCarrierFromSum(6400);
    expect(c).not.toBeNull();
    expect(c!.rows).toHaveLength(1);
    expect(c!.rows[0].area_m2! * c!.rows[0].c_S!).toBe(6400);
    expect(c!.rows[0].kind).toBe('paved');
    expect(c!.rows[0].label).toContain('A138-26-D1');
  });
  it('is null when the sum is absent or not finite', () => {
    expect(floodCarrierFromSum(null)).toBeNull();
    expect(floodCarrierFromSum(undefined)).toBeNull();
    expect(floodCarrierFromSum(Number.NaN)).toBeNull();
  });
});
