import { describe, it, expect } from 'vitest';
import { summarizeSurfaceInventory } from '../surface-types';

const rows = [
  { id: '1', label: 'Dach', surface_type: 'dach' as const,  area_m2: 1000, c_i: 0.9, c_s: 1.0 }, // paved → 900
  { id: '2', label: 'Rasen', surface_type: 'rasen' as const, area_m2: 1000, c_i: 0.1, c_s: 0.3 }, // unpaved → 100
];

describe('summarizeSurfaceInventory', () => {
  it('splits paved/unpaved reduced area and totals area + ac', () => {
    const s = summarizeSurfaceInventory(rows);
    expect(s.sealed).toBeCloseTo(900);
    expect(s.unsealed).toBeCloseTo(100);
    expect(s.area).toBeCloseTo(2000);
    expect(s.ac).toBeCloseTo(1000);
    expect(s.ac).toBeCloseTo(s.sealed + s.unsealed);
  });
  it('paved flag comes from SURFACE_TYPE_PROFILES (kies/rasen unpaved)', () => {
    const s = summarizeSurfaceInventory([{ id: '3', label: 'Kies', surface_type: 'kies', area_m2: 500, c_i: 0.3, c_s: 0.5 }]);
    expect(s.unsealed).toBeCloseTo(150);
    expect(s.sealed).toBe(0);
  });
});
