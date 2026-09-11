import { describe, it, expect, beforeEach } from 'vitest';
import { clearTables, registerTables } from '../regulation-tables';
import { getTab9Entries, lookupTab9 } from '../tab9';
import { tab9AsTable } from '../regulation-tables-seed-a138';

describe('tab9 accessor over the registry', () => {
  beforeEach(() => clearTables());
  it('with an empty registry, returns the TS constants (30 entries)', () => {
    expect(getTab9Entries()).toHaveLength(30);
    expect(lookupTab9('park_flach')?.cm).toBe(0.1);
  });
  it('with TAB9 registered, entries come from the registry and equal the constants (pin)', () => {
    const t = tab9AsTable();
    t.rows.find((r) => r.row_key === 'park_flach')!.values.cm = 0.15; // prove the registry is read
    registerTables([t]);
    expect(lookupTab9('park_flach')?.cm).toBe(0.15);
    clearTables(); registerTables([tab9AsTable()]);
    expect(getTab9Entries().map((e) => [e.value, e.cm, e.cs, e.kind, e.group])).toEqual(tab9AsTable().rows.map((r) => [r.row_key, r.values.cm, r.values.cs, r.values.kind, r.values.group]));
  });
  it('a registered TAB9 with zero rows is treated as NOT registered — falls back to the TS constants', () => {
    const t = tab9AsTable();
    t.rows = [];
    registerTables([t]);
    expect(getTab9Entries()).toHaveLength(30);
    expect(lookupTab9('park_flach')?.cm).toBe(0.1);
  });
  it('minor fix: registry-backed entries carry the REGISTERED table\'s own standard_code/edition, not a hardcoded literal', () => {
    const t = tab9AsTable();
    t.standard_code = 'DWA-A-138-1';
    t.edition = '2099-01'; // a hypothetical future edition, distinct from the TS-fallback literal
    registerTables([t]);
    const entry = lookupTab9('park_flach');
    expect(entry?.standard).toBe('DWA-A-138-1');
    expect(entry?.edition).toBe('2099-01');
  });
  it('a registered row that fails validation is skipped — the rest still come from the registry', () => {
    const t = tab9AsTable();
    t.rows.find((r) => r.row_key === 'park_flach')!.values.cm = 'x'; // malformed jsonb row
    // park_steil's TS constant is cm=0.2 — set the registered value to something
    // different (0.21) so a passing assertion proves the value came from the
    // registry, not a false-positive on TS-constant/registry agreement.
    t.rows.find((r) => r.row_key === 'park_steil')!.values.cm = 0.21;
    registerTables([t]);
    const entries = getTab9Entries();
    expect(entries).toHaveLength(29);
    expect(lookupTab9('park_flach')).toBeUndefined();
    expect(lookupTab9('park_steil')?.cm).toBe(0.21); // an unaffected row still reads from the registry
  });
});
