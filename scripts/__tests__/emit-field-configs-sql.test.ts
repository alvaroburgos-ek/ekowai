/**
 * Plan 3 Task 0 — the field-config emitter (generalises the Plan 2b widget
 * emitter): per-entry UPDATEs scoped standard + worksheet + symbol, always
 * writing widget/ui_config/lookup/visible_when; enum_values only into a null
 * prior (D-1); refusal of visible_when on a consumed producer; section
 * visibility UPDATEs; additive `create` INSERTs; rollback restores the prior.
 */
import { describe, it, expect } from 'vitest';
import { emitFieldConfigSql } from '../regulation-tables/emit-field-configs-sql';

const reg = { title: 'T', columns: [{ key: 'a', label: 'A', type: 'text' }] };
describe('emitFieldConfigSql', () => {
  it('one UPDATE per entry scoped to standard + worksheet + symbol; widget/ui_config/lookup/visible_when always written', () => {
    const { up } = emitFieldConfigSql('x', [
      { standard: 'S', worksheet: 'S-01', symbol: 'reg', widget: 'register', ui_config: reg, verification_quote: 'q (L1)' },
      { standard: 'S', worksheet: 'S-02', symbol: 'n', widget: 'scalar', visible_when: "mode == 'a'", verification_quote: 'q (L2)' },
    ], [], {});
    expect(up).toContain("SET widget = 'register', ui_config = ");
    expect(up).toContain("WHERE f.worksheet_template_id = w.id AND f.symbol = 'reg' AND w.code = 'S-01' AND s.code = 'S'");
    expect(up).toContain("visible_when = 'mode == ''a'''");
    expect((up.match(/UPDATE fields/g) ?? []).length).toBe(2);
  });
  it('D-1: enum_values is written only when prior is null; a list against a non-null prior throws', () => {
    const ev = [{ value: 'a', label_de: 'A', order_index: 0 }];
    const okPrior = { 'S-01 k': { enum_values: null, widget: null, ui_config: null, lookup: null, visible_when: null, consumer_worksheets: null } };
    expect(emitFieldConfigSql('x', [{ standard: 'S', worksheet: 'S-01', symbol: 'k', widget: 'select_one', enum_values: ev, verification_quote: 'q' }], [], okPrior).up).toContain('enum_values = ');
    const badPrior = { 'S-01 k': { ...okPrior['S-01 k'], enum_values: [{ value: 'z' }] } };
    expect(() => emitFieldConfigSql('x', [{ standard: 'S', worksheet: 'S-01', symbol: 'k', widget: 'select_one', enum_values: ev, verification_quote: 'q' }], [], badPrior)).toThrow(/D-1/);
    expect(emitFieldConfigSql('x', [{ standard: 'S', worksheet: 'S-01', symbol: 'k', widget: 'select_one', enum_values: 'keep_prod', verification_quote: 'q' }], [], badPrior).up).not.toContain('enum_values = ');
  });
  it('refuses visible_when on a produced symbol and an unparseable condition', () => {
    const prior = { 'S-01 A_C': { enum_values: null, widget: null, ui_config: null, lookup: null, visible_when: null, consumer_worksheets: ['S-02'] } };
    expect(() => emitFieldConfigSql('x', [{ standard: 'S', worksheet: 'S-01', symbol: 'A_C', widget: 'scalar', visible_when: 'y == 1', verification_quote: 'q' }], [], prior)).toThrow(/consumed by S-02/);
    expect(() => emitFieldConfigSql('x', [{ standard: 'S', worksheet: 'S-01', symbol: 'z', widget: 'scalar', visible_when: 'y ==', verification_quote: 'q' }], [], {})).toThrow(/visible_when/);
  });
  it('sections: UPDATE worksheet_sections keyed by worksheet code + section code; rollback restores prior', () => {
    const { up, down } = emitFieldConfigSql('x', [], [{ standard: 'S', worksheet: 'S-03', section_code: 'S-03.2', visible_when: "typ == 'b'", verification_quote: 'q' }], { sections: { 'S-03 S-03.2': { visible_when: null } } });
    expect(up).toContain("UPDATE worksheet_sections ws SET visible_when = 'typ == ''b'''");
    expect(up).toContain("ws.code = 'S-03.2'");
    expect(down).toContain('SET visible_when = NULL');
  });
  it('create: INSERT … WHERE NOT EXISTS with the Plan 3 description; rollback deletes only that row', () => {
    const { up, down } = emitFieldConfigSql('x', [{ standard: 'S', worksheet: 'S-05', symbol: 'sites', widget: 'register', ui_config: reg, verification_quote: 'q (L9)',
      create: { section_code: 'S-05.1', label_de: 'Versuchsstandorte', data_type: 'json', unit: null, clause_reference: '§5.3.3.6', description: 'Plan 3: k_f-Versuchsstandorte als Zeilen' } }], [], {});
    expect(up).toContain("INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, widget, ui_config, lookup, visible_when, enum_values, order_index, active)");
    expect(up).toContain("WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'sites')");
    expect(up).toContain("(SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id)");
    expect(down).toContain("DELETE FROM fields f USING worksheet_templates w, standards s WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'S' AND w.code = 'S-05' AND f.symbol = 'sites' AND f.description LIKE 'Plan 3:%'");
  });
  it('rollback restores each touched field to its prior four columns and prior enum_values', () => {
    const prior = { 'S-01 k': { enum_values: null, widget: null, ui_config: null, lookup: null, visible_when: null, consumer_worksheets: null } };
    const { down } = emitFieldConfigSql('x', [{ standard: 'S', worksheet: 'S-01', symbol: 'k', widget: 'select_one', enum_values: [{ value: 'a', label_de: 'A', order_index: 0 }], verification_quote: 'q' }], [], prior);
    expect(down).toContain('widget = NULL, ui_config = NULL, lookup = NULL, enum_values = NULL'); // sign-off C-1 closure: no rule ⇒ visible_when is not restored
  });
});
