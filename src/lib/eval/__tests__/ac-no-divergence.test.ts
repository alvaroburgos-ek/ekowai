import { describe, it, expect } from 'vitest';
import { aggregators } from '../aggregators';
import { summarizeSurfaceInventory } from '../surface-types';

const A138_07_GL2 = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';
const rows = [
  { id: '1', label: 'Dach',  surface_type: 'dach' as const,  area_m2: 1000, c_i: 0.9, c_s: 1.0 },
  { id: '2', label: 'Rasen', surface_type: 'rasen' as const, area_m2: 1000, c_i: 0.1, c_s: 0.3 },
];
const req = { inputs: [], aggregator: { surfaceInventory: { rows } } } as never;

describe('A138-07 A_C_preliminary == helper.ac (no divergence at source)', () => {
  it('aggregator total equals summarizeSurfaceInventory().ac', () => {
    const state = aggregators[A138_07_GL2].run(req);
    expect(state.kind).toBe('computed');
    if (state.kind === 'computed') {
      expect(state.value).toBeCloseTo(summarizeSurfaceInventory(rows).ac);
      expect(state.value).toBeCloseTo(1000);
    }
  });
});
