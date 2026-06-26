import { describe, it, expect } from 'vitest';
import { surfaceSourceState, surfaceWithholdFieldIds, SURFACE_DERIVED_SYMBOLS } from '../surface-source-state';

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
  // Inherited fields carry `inheritedFromWorksheet` (set by mergeInheritedFields),
  // independent of how the value was seeded (param path vs same-symbol path).
  const fields = [
    { id: 'f-ac', symbol: 'A_C', inheritedFromWorksheet: 'A138-07' },
    { id: 'f-cm', symbol: 'C_m', inheritedFromWorksheet: 'A138-07' },
    { id: 'f-other', symbol: 'gw_clearance', inheritedFromWorksheet: 'A138-07' }, // atomic input inherited from owner
    { id: 'f-local', symbol: 'A_VA' },                                            // local, not inherited
  ];

  it('withholds the surface-DERIVED inherited symbols when state != ok (regardless of seeding path)', () => {
    const ids = surfaceWithholdFieldIds(fields, 'A138-07', 'incomplete');
    expect(ids.sort()).toEqual(['f-ac', 'f-cm']); // NOT f-other (atomic input), NOT f-local
  });
  it('withholds on missing too', () => {
    expect(surfaceWithholdFieldIds(fields, 'A138-07', 'missing').sort()).toEqual(['f-ac', 'f-cm']);
  });
  it('withholds nothing when state is ok', () => {
    expect(surfaceWithholdFieldIds(fields, 'A138-07', 'ok')).toEqual([]);
  });
  it('withholds nothing when ownerCode is null', () => {
    expect(surfaceWithholdFieldIds(fields, null, 'incomplete')).toEqual([]);
  });
  it('only withholds derived fields inherited FROM the owner', () => {
    // a derived field inherited from a different worksheet → not withheld
    const other = [
      { id: 'f-ac', symbol: 'A_C', inheritedFromWorksheet: 'A138-07' },
      { id: 'f-cm', symbol: 'C_m', inheritedFromWorksheet: 'A138-99' },
    ];
    expect(surfaceWithholdFieldIds(other, 'A138-07', 'incomplete')).toEqual(['f-ac']);
  });
});

describe('SURFACE_DERIVED_SYMBOLS', () => {
  it('includes the reduced-area split', () => {
    expect(SURFACE_DERIVED_SYMBOLS).toContain('A_C_sealed');
    expect(SURFACE_DERIVED_SYMBOLS).toContain('A_C_unsealed');
  });
});
