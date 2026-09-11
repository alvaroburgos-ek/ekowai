import { describe, it, expect } from 'vitest';
import { emitSelectionConfigSql } from '../regulation-tables/emit-selection-configs-sql';

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
});
