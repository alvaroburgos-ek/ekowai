// src/lib/eval/__tests__/materialize-surfaces.test.ts
import { describe, it, expect } from 'vitest';
import { materializeSurfaceOutputs } from '../materialize-surfaces';

describe('materializeSurfaceOutputs', () => {
  it('maps a complete carrier to the four derived scalars', () => {
    const out = materializeSurfaceOutputs({
      rows: [
        { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
      ],
    });
    expect(out.A_C).toBeCloseTo(4826.43, 2);
    expect(out.C_m).toBeCloseTo(0.9, 6);
    expect(out.A_E_ba).toBeCloseTo(5362.7, 4);
    expect(out.A_E_nba).toBe(0);
  });
  it('returns nulls (not 0) when nothing is complete — clears stale downstream values', () => {
    expect(materializeSurfaceOutputs({ rows: [] })).toEqual({ A_C: null, C_m: null, A_E_ba: null, A_E_nba: null });
    expect(materializeSurfaceOutputs(null)).toEqual({ A_C: null, C_m: null, A_E_ba: null, A_E_nba: null });
  });
});
