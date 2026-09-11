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
});
