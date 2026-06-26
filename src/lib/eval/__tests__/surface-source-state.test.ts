import { describe, it, expect } from 'vitest';
import { surfaceSourceState, surfaceWithholdFieldIds } from '../surface-source-state';

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

describe('surfaceWithholdFieldIds — gate the value, not just the banner', () => {
  const fields = [
    { id: 'f-ac', symbol: 'A_C' },
    { id: 'f-cm', symbol: 'C_m' },
    { id: 'f-other', symbol: 'gw_clearance' }, // atomic input also inherited from owner
    { id: 'f-local', symbol: 'A_VA' },         // local, not inherited
  ];
  const inheritedFromBySymbol = { A_C: 'A138-07', C_m: 'A138-07', gw_clearance: 'A138-07' };

  it('withholds the surface-DERIVED inherited symbols when state != ok', () => {
    const ids = surfaceWithholdFieldIds(fields, inheritedFromBySymbol, 'A138-07', 'incomplete');
    expect(ids.sort()).toEqual(['f-ac', 'f-cm']); // NOT f-other (atomic input), NOT f-local
  });
  it('withholds on missing too', () => {
    expect(surfaceWithholdFieldIds(fields, inheritedFromBySymbol, 'A138-07', 'missing').sort()).toEqual(['f-ac', 'f-cm']);
  });
  it('withholds nothing when state is ok', () => {
    expect(surfaceWithholdFieldIds(fields, inheritedFromBySymbol, 'A138-07', 'ok')).toEqual([]);
  });
  it('withholds nothing when ownerCode is null', () => {
    expect(surfaceWithholdFieldIds(fields, inheritedFromBySymbol, null, 'incomplete')).toEqual([]);
  });
  it('only withholds symbols actually inherited FROM the owner', () => {
    // C_m inherited from a different worksheet → not withheld
    const ids = surfaceWithholdFieldIds(fields, { A_C: 'A138-07', C_m: 'A138-99' }, 'A138-07', 'incomplete');
    expect(ids).toEqual(['f-ac']);
  });
});
