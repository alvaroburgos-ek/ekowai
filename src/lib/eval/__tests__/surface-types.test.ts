import { describe, it, expect } from 'vitest';
import {
  SURFACE_TYPE_PROFILES,
  SURFACE_TYPE_OPTIONS,
  asSurfaceTypeId,
  isDefaultForType,
} from '../surface-types';

/**
 * Tab. 9 surface-type catalogue tests. The encoded values themselves
 * are reference defaults (engineer can override per row); these tests
 * pin the contract of the mapping — every type has a label + clauseRef,
 * paved/unpaved is set, the coercion + default-detection helpers behave
 * as their callers expect.
 */
describe('SURFACE_TYPE_PROFILES', () => {
  it('every option in the dropdown has a profile entry', () => {
    for (const opt of SURFACE_TYPE_OPTIONS) {
      expect(SURFACE_TYPE_PROFILES[opt.value]).toBeDefined();
    }
  });

  it('every profile carries a label and clauseRef Tab. 9', () => {
    for (const id of Object.keys(SURFACE_TYPE_PROFILES) as Array<
      keyof typeof SURFACE_TYPE_PROFILES
    >) {
      const p = SURFACE_TYPE_PROFILES[id];
      expect(p.labelDe.length).toBeGreaterThan(0);
      expect(p.clauseRef).toBe('Tab. 9');
      expect(typeof p.paved).toBe('boolean');
    }
  });

  it('paved roof / asphalt / pavers are marked befestigt; lawn / meadow / gravel are nicht befestigt', () => {
    expect(SURFACE_TYPE_PROFILES.dach.paved).toBe(true);
    expect(SURFACE_TYPE_PROFILES.asphalt.paved).toBe(true);
    expect(SURFACE_TYPE_PROFILES.pflaster.paved).toBe(true);
    expect(SURFACE_TYPE_PROFILES.pflaster_offen.paved).toBe(true);
    expect(SURFACE_TYPE_PROFILES.kies.paved).toBe(false);
    expect(SURFACE_TYPE_PROFILES.rasen.paved).toBe(false);
  });

  it('"sonstige" has null defaults so engineer must enter values explicitly', () => {
    expect(SURFACE_TYPE_PROFILES.sonstige.C_i_default).toBeNull();
    expect(SURFACE_TYPE_PROFILES.sonstige.C_s_default).toBeNull();
  });

  it('C_i defaults are in (0, 1] for paved + unpaved (no zero-runoff defaults)', () => {
    for (const id of [
      'dach', 'asphalt', 'pflaster', 'pflaster_offen', 'kies', 'rasen',
    ] as const) {
      const p = SURFACE_TYPE_PROFILES[id];
      expect(p.C_i_default).not.toBeNull();
      expect(p.C_i_default!).toBeGreaterThan(0);
      expect(p.C_i_default!).toBeLessThanOrEqual(1);
    }
  });
});

describe('asSurfaceTypeId', () => {
  it('passes through known ids', () => {
    expect(asSurfaceTypeId('dach')).toBe('dach');
    expect(asSurfaceTypeId('asphalt')).toBe('asphalt');
    expect(asSurfaceTypeId('pflaster_offen')).toBe('pflaster_offen');
  });

  it('falls back to "sonstige" for unknown / non-string / null', () => {
    expect(asSurfaceTypeId('foo')).toBe('sonstige');
    expect(asSurfaceTypeId(null)).toBe('sonstige');
    expect(asSurfaceTypeId(undefined)).toBe('sonstige');
    expect(asSurfaceTypeId(42)).toBe('sonstige');
  });
});

describe('isDefaultForType', () => {
  it('flags both coefficients as at-default when they match the type', () => {
    const dach = SURFACE_TYPE_PROFILES.dach;
    const m = isDefaultForType('dach', dach.C_i_default, dach.C_s_default);
    expect(m).toEqual({ c_i: true, c_s: true });
  });

  it('flags c_i as customised when the engineer overrode it', () => {
    const dach = SURFACE_TYPE_PROFILES.dach;
    const m = isDefaultForType('dach', 0.95, dach.C_s_default);
    expect(m).toEqual({ c_i: false, c_s: true });
  });

  it('handles "sonstige" — null defaults match null cells', () => {
    expect(isDefaultForType('sonstige', null, null)).toEqual({
      c_i: true,
      c_s: true,
    });
    // Any concrete value is a custom override against null defaults
    expect(isDefaultForType('sonstige', 0.5, null)).toEqual({
      c_i: false,
      c_s: true,
    });
  });
});
