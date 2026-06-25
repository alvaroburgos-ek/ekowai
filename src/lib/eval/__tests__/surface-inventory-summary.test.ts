// src/lib/eval/__tests__/surface-inventory-summary.test.ts
import { describe, it, expect } from 'vitest';
import { summarizeSurfaces, normalizeSurfaceCarrier } from '../surface-inventory';

describe('summarizeSurfaces', () => {
  it('sums A_C/C_m and paved/unpaved splits over complete rows only', () => {
    const c = normalizeSurfaceCarrier({
      rows: [
        { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
      ],
    });
    const s = summarizeSurfaces(c);
    expect(s.A_C).toBeCloseTo(4826.43, 2);
    expect(s.A_C_sealed).toBeCloseTo(4826.43, 2);
    expect(s.A_C_unsealed).toBe(0);
    expect(s.A_E_ba).toBeCloseTo(5362.7, 4);
    expect(s.A_E_nba).toBe(0);
    expect(s.C_m).toBeCloseTo(0.9, 6);
    expect(s).toMatchObject({ complete: 2, total: 2 });
  });

  it('counts an unpaved complete row in the unsealed split and A_E_nba', () => {
    const c = normalizeSurfaceCarrier({
      rows: [{ id: 't', label: 'Rasen', tab9_value: 'park_flach', area_m2: 100, c_i: 0.1, c_s: 0.2, coeff_override: false }],
    });
    const s = summarizeSurfaces(c);
    expect(s.A_C).toBeCloseTo(10, 6);
    expect(s.A_C_unsealed).toBeCloseTo(10, 6);
    expect(s.A_C_sealed).toBe(0);
    expect(s.A_E_nba).toBe(100);
    expect(s.A_E_ba).toBe(0);
    expect(s.C_m).toBeCloseTo(0.1, 6);
  });

  it('excludes incomplete rows from every sum and counts them in total only', () => {
    const c = normalizeSurfaceCarrier({
      rows: [
        { id: 'ok', label: 'Dach', tab9_value: 'beton', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: 'bad', label: 'Unbestimmt', tab9_value: null, area_m2: 200, c_i: 0.9, c_s: 1.0, coeff_override: false },
      ],
    });
    const s = summarizeSurfaces(c);
    expect(s.A_C).toBeCloseTo(90, 6);     // 200-row excluded (tab9_value null ⇒ incomplete)
    expect(s.A_E_ba).toBe(100);
    expect(s).toMatchObject({ complete: 1, total: 2 });
  });

  it('returns nulls when there are no complete rows (ΣA=0 ⇒ C_m null, not divide-by-zero)', () => {
    const s = summarizeSurfaces({ rows: [] });
    expect(s).toMatchObject({ A_C: null, A_C_sealed: null, A_C_unsealed: null, A_E_ba: null, A_E_nba: null, C_m: null, complete: 0, total: 0 });
  });

  it('invariant: A_C === A_C_sealed + A_C_unsealed when computed', () => {
    const c = normalizeSurfaceCarrier({
      rows: [
        { id: 'p', label: 'P', tab9_value: 'beton', area_m2: 50, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: 'u', label: 'U', tab9_value: 'park_flach', area_m2: 30, c_i: 0.1, c_s: 0.2, coeff_override: false },
      ],
    });
    const s = summarizeSurfaces(c);
    expect(s.A_C!).toBeCloseTo(s.A_C_sealed! + s.A_C_unsealed!, 6);
  });
});
