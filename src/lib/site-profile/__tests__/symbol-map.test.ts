import { describe, expect, it } from 'vitest';
import {
  SITE_PROFILE_ENTRIES,
  SITE_PROFILE_BY_SYMBOL,
  resolveFromSiteProfile,
} from '../symbol-map';

describe('SITE_PROFILE_ENTRIES', () => {
  it('has unique keys and symbols (no double-mapping)', () => {
    const keys = new Set<string>();
    const symbols = new Set<string>();
    for (const e of SITE_PROFILE_ENTRIES) {
      expect(keys.has(e.key), `duplicate key: ${e.key}`).toBe(false);
      expect(symbols.has(e.symbol), `duplicate symbol: ${e.symbol}`).toBe(false);
      keys.add(e.key);
      symbols.add(e.symbol);
    }
  });

  it('byKey/bySymbol indexes match the entries list', () => {
    expect(SITE_PROFILE_BY_SYMBOL.size).toBe(SITE_PROFILE_ENTRIES.length);
    for (const e of SITE_PROFILE_ENTRIES) {
      expect(SITE_PROFILE_BY_SYMBOL.get(e.symbol)).toBe(e);
    }
  });

  it('every entry has a German label and a defined type', () => {
    for (const e of SITE_PROFILE_ENTRIES) {
      expect(e.labelDe.length, e.symbol).toBeGreaterThan(0);
      expect(['text', 'number', 'enum', 'boolean']).toContain(e.type);
    }
  });
});

describe('resolveFromSiteProfile', () => {
  const profile = {
    site_lat: 52.52,
    site_lon: '13.405',
    site_bundesland: 'Berlin',
    k_f: 1e-4,
    not_in_map: 'ignored',
    empty_string: '',
  };

  it('returns null for unknown symbol', () => {
    expect(resolveFromSiteProfile(profile, 'no_such_symbol')).toBeNull();
  });

  it('returns null for null/empty profile', () => {
    expect(resolveFromSiteProfile(null, 'site_lat')).toBeNull();
    expect(resolveFromSiteProfile({}, 'site_lat')).toBeNull();
  });

  it('coerces number values cleanly', () => {
    expect(resolveFromSiteProfile(profile, 'site_lat')).toEqual({ type: 'number', value: 52.52 });
    expect(resolveFromSiteProfile(profile, 'site_lon')).toEqual({ type: 'number', value: 13.405 });
    expect(resolveFromSiteProfile(profile, 'k_f')).toEqual({ type: 'number', value: 1e-4 });
  });

  it('returns text values verbatim', () => {
    expect(resolveFromSiteProfile(profile, 'site_bundesland')).toEqual({ type: 'text', value: 'Berlin' });
  });

  it('returns null when the key is absent', () => {
    expect(resolveFromSiteProfile(profile, 'site_address')).toBeNull();
  });

  it('returns null when a number coerces to NaN', () => {
    expect(resolveFromSiteProfile({ site_lat: 'not-a-number' }, 'site_lat')).toBeNull();
  });
});
