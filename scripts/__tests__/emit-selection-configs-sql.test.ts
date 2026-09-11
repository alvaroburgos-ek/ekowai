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
  it('I-1: skips an entry with non-null priorEnumValues and no keepProdEnum — no UPDATE emitted, no file key for a standard left with nothing', () => {
    const m = emitSelectionConfigSql([
      { standard: 'DWA-M-1200-1', symbol: 'indikatorchemikalien_kat1', priorEnumValues: [{ value: 'x', label_de: 'X', order_index: 0 }] },
    ]);
    expect(m.has('DWA-M-1200-1')).toBe(false);
  });
  it('I-1: does NOT skip a non-null-priorEnumValues entry that also carries keepProdEnum', () => {
    const m = emitSelectionConfigSql([
      {
        standard: 'DWA-A-138-1',
        symbol: 'a138_anlagentyp_kandidaten',
        priorEnumValues: [{ value: 'x', label_de: 'X', order_index: 0 }],
        keepProdEnum: [{ value: 'x', label_de: 'X', order_index: 0 }],
      },
    ]);
    expect(m.has('DWA-A-138-1')).toBe(true);
    expect((m.get('DWA-A-138-1')!.match(/UPDATE fields/g) ?? []).length).toBe(1);
  });
  it('I-1: a skipped entry does not suppress other kept entries for the same standard', () => {
    const m = emitSelectionConfigSql([
      { standard: 'DWA-M-820-2', symbol: 'lph_completed', priorEnumValues: [{ value: 'x', label_de: 'X', order_index: 0 }] },
      { standard: 'DWA-M-820-2', symbol: 'included_hoai_phases' },
    ]);
    expect((m.get('DWA-M-820-2')!.match(/UPDATE fields/g) ?? []).length).toBe(1);
    expect(m.get('DWA-M-820-2')).not.toContain("'lph_completed'");
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
  it('I-1: restores enum_values to NULL when priorEnumValues was null or absent (unchanged from before this fix)', () => {
    const undefinedCase = emitSelectionRollbackSql([{ standard: 'DWA-M-820-1', symbol: 'applicable_legal_bases' }]);
    expect(undefinedCase).toContain('enum_values = NULL');
  });
  it('I-1: restores enum_values to NULL when priorEnumValues was null (unchanged from before this fix)', () => {
    const sql = emitSelectionRollbackSql([{ standard: 'DWA-M-820-1', symbol: 'applicable_legal_bases', priorEnumValues: null }]);
    expect(sql).toContain('enum_values = NULL');
  });
  it('I-1: skips an entry with non-null priorEnumValues and no keepProdEnum — no UPDATE emitted at all', () => {
    const sql = emitSelectionRollbackSql([
      { standard: 'DWA-M-820-3', symbol: 'applicable_lph', priorEnumValues: [{ value: 'lph_0', label_de: 'LPH 0', order_index: 0 }] },
    ]);
    expect(sql).not.toContain('UPDATE fields');
    expect(sql).toBe('BEGIN;\nCOMMIT;\n');
  });
});
