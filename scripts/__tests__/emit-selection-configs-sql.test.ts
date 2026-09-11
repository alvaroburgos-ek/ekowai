import { describe, it, expect } from 'vitest';
import { emitSelectionConfigSql, emitSelectionRollbackSql } from '../regulation-tables/emit-selection-configs-sql';

describe('emitSelectionConfigSql', () => {
  it('one UPDATE per (standard, symbol) scoped to that standard, enum_values only for select_many', () => {
    const m = emitSelectionConfigSql([{ standard: 'DWA-M-820-1', symbol: 'applicable_legal_bases' }, { standard: 'DWA-M-820-1', symbol: 'stakeholder_list' }]);
    const sql = m.get('DWA-M-820-1')!;
    expect(sql).toContain("SET widget = 'select_many'");
    expect(sql).toContain("SET widget = 'register'");
    expect(sql).toContain("WHERE f.symbol = 'applicable_legal_bases' AND s.code = 'DWA-M-820-1'");
    expect((sql.match(/UPDATE fields/g) ?? []).length).toBe(2);
  });
  it('D-1: keepProdEnum leaves enum_values untouched', () => {
    const m = emitSelectionConfigSql([{ standard: 'DWA-A-138-1', symbol: 'a138_anlagentyp_kandidaten', keepProdEnum: [{ value: 'x', label_de: 'X', order_index: 0 }] }]);
    expect(m.get('DWA-A-138-1')).not.toContain('enum_values =');
  });
  it('returns one map key per distinct standard for a multi-standard entry list', () => {
    const m = emitSelectionConfigSql([
      { standard: 'DWA-M-820-1', symbol: 'applicable_legal_bases' },
      { standard: 'DWA-M-820-2', symbol: 'included_hoai_phases' },
    ]);
    expect([...m.keys()].sort()).toEqual(['DWA-M-820-1', 'DWA-M-820-2']);
    expect((m.get('DWA-M-820-1')!.match(/UPDATE fields/g) ?? []).length).toBe(1);
    expect((m.get('DWA-M-820-2')!.match(/UPDATE fields/g) ?? []).length).toBe(1);
  });
  it('throws for a symbol with no SELECTION_CONFIGS entry', () => {
    expect(() => emitSelectionConfigSql([{ standard: 'DWA-M-820-1', symbol: 'not_a_real_symbol' }])).toThrow(
      'no SELECTION_CONFIGS entry for not_a_real_symbol'
    );
  });
  it('dedupes duplicate (standard, symbol) entries into one UPDATE', () => {
    const m = emitSelectionConfigSql([
      { standard: 'DWA-M-1200-3', symbol: 'bewaesserungstagebuch' },
      { standard: 'DWA-M-1200-3', symbol: 'bewaesserungstagebuch' },
    ]);
    expect((m.get('DWA-M-1200-3')!.match(/UPDATE fields/g) ?? []).length).toBe(1);
  });
});

describe('emitSelectionRollbackSql', () => {
  it('nulls enum_values for a select_many entry without keepProdEnum', () => {
    const sql = emitSelectionRollbackSql([{ standard: 'DWA-M-820-1', symbol: 'applicable_legal_bases' }]);
    expect(sql).toContain('enum_values = NULL');
  });
  it('does not null enum_values for a register entry', () => {
    const sql = emitSelectionRollbackSql([{ standard: 'DWA-M-820-1', symbol: 'stakeholder_list' }]);
    expect(sql).not.toContain('enum_values = NULL');
  });
  it('D-1: does not null enum_values for the keepProdEnum entry', () => {
    const sql = emitSelectionRollbackSql([{ standard: 'DWA-A-138-1', symbol: 'a138_anlagentyp_kandidaten', keepProdEnum: [{ value: 'x', label_de: 'X', order_index: 0 }] }]);
    expect(sql).not.toContain('enum_values = NULL');
  });
  it('dedupes duplicate (standard, symbol) entries into one UPDATE', () => {
    const sql = emitSelectionRollbackSql([
      { standard: 'DWA-M-277E', symbol: 'source_set' },
      { standard: 'DWA-M-277E', symbol: 'source_set' },
    ]);
    expect((sql.match(/UPDATE fields/g) ?? []).length).toBe(1);
  });
});
