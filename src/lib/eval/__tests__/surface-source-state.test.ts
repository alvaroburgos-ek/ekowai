import { describe, it, expect } from 'vitest';
import { surfaceSourceState } from '../surface-source-state';

const full = { rows: [{ id: '1', tab9_value: 'beton', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }] };
const partial = { rows: [
  { id: '1', tab9_value: 'beton', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
  { id: '2', tab9_value: null, area_m2: 50, c_i: null, c_s: null, coeff_override: false },
] };

describe('surfaceSourceState', () => {
  it('missing when no carrier / zero rows', () => {
    expect(surfaceSourceState(null, 'final').state).toBe('missing');
    expect(surfaceSourceState({ rows: [] }, 'final').state).toBe('missing');
    expect(surfaceSourceState(null, 'final').message).toMatch(/nicht erfasst/);
  });
  it('incomplete when rows not all complete (even if final)', () => {
    const r = surfaceSourceState(partial, 'final');
    expect(r.state).toBe('incomplete');
    expect(r.message).toContain('1/2');
    expect(r.message).toMatch(/nicht final/);
  });
  it('incomplete when complete rows but source still draft', () => {
    expect(surfaceSourceState(full, 'draft').state).toBe('incomplete');
  });
  it('ok when all rows complete AND status engineer_approved/final', () => {
    expect(surfaceSourceState(full, 'engineer_approved').state).toBe('ok');
    expect(surfaceSourceState(full, 'final').state).toBe('ok');
    expect(surfaceSourceState(full, 'final').message).toBeNull();
  });
});
