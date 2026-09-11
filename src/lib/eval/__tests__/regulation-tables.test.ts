import { describe, it, expect, beforeEach } from 'vitest';
import { registerTables, clearTables, getTable, lookupRow, rowKeyFor, type RegulationTable } from '../regulation-tables';

const TAB6: RegulationTable = {
  standard_code: 'DWA-A-138-1', edition: '2024-10', table_code: 'TAB6', title_de: 'A_C/A_S,m Grenzwerte', clause_reference: '§5.2.3.2, Tab. 6', page_ref: null,
  key_columns: ['tier', 'bbz_band'], value_columns: [{ name: 'max', type: 'number' }], override_policy: 'locked', override_quote: null, verification_status: 'engineer_verified',
  rows: [
    { row_key: 'tier2|thin', keys: { tier: 'tier2', bbz_band: 'thin' }, group_label: null, label_de: 'BK II, < 0,30 m', order_index: 0, values: { max: 30 }, verbatim_quote: 'q' },
    { row_key: 'tier2|thick', keys: { tier: 'tier2', bbz_band: 'thick' }, group_label: null, label_de: 'BK II, ≥ 0,30 m', order_index: 1, values: { max: 50 }, verbatim_quote: 'q' },
  ],
};

describe('regulation-tables registry', () => {
  beforeEach(() => clearTables());
  it('rowKeyFor joins key values in key_columns order', () => {
    expect(rowKeyFor({ bbz_band: 'thin', tier: 'tier2' }, ['tier', 'bbz_band'])).toBe('tier2|thin');
  });
  it('registers and looks up a two-key row', () => {
    registerTables([TAB6]);
    expect(getTable('DWA-A-138-1', '2024-10', 'TAB6')?.rows).toHaveLength(2);
    expect(lookupRow('DWA-A-138-1', '2024-10', 'TAB6', { tier: 'tier2', bbz_band: 'thick' })?.values.max).toBe(50);
    expect(lookupRow('DWA-A-138-1', '2024-10', 'TAB6', { tier: 'tier3', bbz_band: 'thick' })).toBeUndefined();
  });
  it('edition undefined resolves to the latest registered edition', () => {
    registerTables([TAB6, { ...TAB6, edition: '2030-01', rows: [{ ...TAB6.rows[0], values: { max: 99 } }] }]);
    expect(lookupRow('DWA-A-138-1', undefined, 'TAB6', { tier: 'tier2', bbz_band: 'thin' })?.values.max).toBe(99);
  });
  it('re-registering the same (std, edition, code) replaces, never duplicates', () => {
    registerTables([TAB6]); registerTables([TAB6]);
    expect(getTable('DWA-A-138-1', '2024-10', 'TAB6')?.rows).toHaveLength(2);
  });
});
