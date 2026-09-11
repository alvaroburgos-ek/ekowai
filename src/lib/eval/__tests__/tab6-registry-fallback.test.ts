import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearTables, registerTables } from '../regulation-tables';
import { tab6Limit, flaechengruppeToTier } from '../tab6-loading';
import { tab5AsTable, tab6AsTable } from '../regulation-tables-seed-a138';

describe('tab6-loading over the registry', () => {
  beforeEach(() => clearTables());
  it('fallback equals constants', () => {
    expect(tab6Limit('tier2', 0.3)).toEqual({ kind: 'limit', max: 50 });
    expect(flaechengruppeToTier('BL')).toBe('tier3');
  });
  it('registry wins when present', () => {
    const t6 = tab6AsTable(); t6.rows.find((r) => r.row_key === 'tier2|thick')!.values.max = 55;
    const t5 = tab5AsTable(); t5.rows.find((r) => r.row_key === 'BL')!.values.tier = 'tier2';
    registerTables([t5, t6]);
    expect(tab6Limit('tier2', 0.3)).toEqual({ kind: 'limit', max: 55 });
    expect(flaechengruppeToTier('BL')).toBe('tier2');
  });
});

/**
 * I-4 (guideline-to-tool final review): flaechengruppeToTier() reads a
 * registered TAB5 row's `tier` value without validating it against the four
 * allowed Tab6Tier literals ('tier1_none' | 'tier2' | 'tier3' | 'authority').
 * A malformed/foreign registry value would propagate downstream into
 * tab6Limit()/tab6LoadingCheck() as opaque data instead of being caught at
 * the source — this pins the fix: an invalid registered tier is skipped
 * (with a console.warn), falling through to the TS-constant switch exactly
 * like a code with no registry override at all.
 */
describe('flaechengruppeToTier over the registry — invalid tier fallback (I-4)', () => {
  beforeEach(() => clearTables());

  it('with TAB5 registered and a VALID overridden tier, reads the registry value', () => {
    const t = tab5AsTable();
    t.rows.find((r) => r.row_key === 'VW2')!.values.tier = 'tier3'; // prove the registry is read
    registerTables([t]);
    expect(flaechengruppeToTier('VW2')).toBe('tier3');
  });

  it('with TAB5 registered and an INVALID tier value, warns and falls back to the TS-constant switch', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const t = tab5AsTable();
    t.rows.find((r) => r.row_key === 'VW2')!.values.tier = 'bogus_tier'; // malformed jsonb row
    registerTables([t]);
    expect(flaechengruppeToTier('VW2')).toBe('tier2'); // TS-constant fallback for VW2
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[tab6-loading]'),
      'VW2',
      'bogus_tier',
    );
    warn.mockRestore();
  });

  it('an invalid registered tier does not affect an unrelated code still reading a valid registry value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const t = tab5AsTable();
    t.rows.find((r) => r.row_key === 'VW2')!.values.tier = 'bogus_tier';
    t.rows.find((r) => r.row_key === 'BL')!.values.tier = 'tier1_none'; // valid override, proves registry still read for others
    registerTables([t]);
    expect(flaechengruppeToTier('VW2')).toBe('tier2'); // fallback
    expect(flaechengruppeToTier('BL')).toBe('tier1_none'); // registry override honored
    warn.mockRestore();
  });

  it('with an empty registry, unaffected — reads straight from the TS-constant switch', () => {
    expect(flaechengruppeToTier('BG3')).toBe('tier3');
  });
});
