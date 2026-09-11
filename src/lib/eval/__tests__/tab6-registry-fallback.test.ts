import { describe, it, expect, beforeEach } from 'vitest';
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
