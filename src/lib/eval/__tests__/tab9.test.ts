import { describe, it, expect } from 'vitest';
import { getTab9Entries, lookupTab9, type Tab9Entry } from '../tab9';

describe('tab9 accessor', () => {
  it('exposes exactly 30 entries, each tagged with standard + edition', () => {
    const all = getTab9Entries();
    expect(all).toHaveLength(30);
    for (const e of all) {
      expect(e.standard).toBe('DWA-A 138-1');
      expect(e.edition).toBe('2024-10');
      expect(e.cm).toBeGreaterThanOrEqual(0);
      expect(e.cm).toBeLessThanOrEqual(1);
      expect(e.cs).toBeGreaterThanOrEqual(0);
      expect(e.cs).toBeLessThanOrEqual(1);
    }
  });

  it('derives kind from group: groups 1 & 2 are paved, group 3 is unpaved', () => {
    for (const e of getTab9Entries()) {
      const expected = e.group === 3 ? 'unpaved' : 'paved';
      expect(e.kind).toBe(expected);
    }
  });

  it('has unique values (keys)', () => {
    const values = getTab9Entries().map((e) => e.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it('lookupTab9 returns the matching entry and undefined for unknown keys', () => {
    const asphalt = lookupTab9('schwarzdecke_asphalt');
    expect(asphalt).toMatchObject({ cm: 0.9, cs: 1.0, kind: 'paved', group: 1 });
    const park = lookupTab9('park_flach');
    expect(park).toMatchObject({ cm: 0.1, cs: 0.2, kind: 'unpaved', group: 3 });
    expect(lookupTab9('does_not_exist')).toBeUndefined();
  });

  it('contains the migration anchor keys used by the normalizer', () => {
    expect(lookupTab9('schwarzdecke_asphalt')).toBeDefined();
    expect(lookupTab9('park_flach')).toBeDefined();
  });
});
