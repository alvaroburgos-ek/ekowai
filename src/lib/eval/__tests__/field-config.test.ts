import { describe, it, expect } from 'vitest';
import { parseFieldConfig, inferWidget, WIDGETS } from '../field-config';

describe('field-config', () => {
  it('closed widget list matches the DB CHECK', () => {
    expect([...WIDGETS]).toEqual(['select_one','select_many','lookup_fill','register','grid','reference','derived','attestation','scalar']);
  });
  it('NULL widget ⇒ legacy inference from data_type', () => {
    expect(parseFieldConfig({ widget: null, uiConfig: null, lookup: null, visibleWhen: null }).widget).toBeNull();
    expect(inferWidget('number', false)).toBe('scalar');
    expect(inferWidget('enum', true)).toBe('select_one');
    expect(inferWidget('boolean', false)).toBe('attestation');
    expect(inferWidget('json', true)).toBe('select_many');
    expect(inferWidget('json', false)).toBe('register');
  });
  it('register ui_config validates columns incl. lookup_key/lookup_value/derived and discriminator', () => {
    const ui = { title: 'Flächenverzeichnis', add_label: '+ Fläche', placement: 'bottom', columns: [
      { key: 'label', type: 'text', label: 'Bezeichnung', required: true, discriminator: true, visible_when: 'kind == "custom"' },
      { key: 'tab9_value', type: 'lookup_key', label: 'Oberflächentyp', required: true, lookup: { table_code: 'TAB9', group_by: 'group_label' } },
      { key: 'area_m2', type: 'number', label: 'A', unit: 'm²', required: true, min: 0 },
      { key: 'c_i', type: 'lookup_value', label: 'C_i', required: true, lookup: { table_code: 'TAB9', key_column: 'tab9_value', value: 'cm' } },
      { key: 'kind', type: 'derived', label: 'befestigt', expr: "lookup('TAB9', tab9_value, 'kind')" },
      { key: 'coeff_override', type: 'boolean', label: 'abweichend' },
    ], override: { flag_key: 'coeff_override', applies_to: ['c_i'], policy: 'anhaltswert' } };
    const cfg = parseFieldConfig({ widget: 'register', uiConfig: ui, lookup: null, visibleWhen: null });
    expect(cfg.widget).toBe('register');
    const columns = (cfg.ui as { columns: Array<{ discriminator?: boolean; visible_when?: string }> }).columns;
    expect(columns).toHaveLength(6);
    expect(columns[0].discriminator).toBe(true);
    expect(columns[0].visible_when).toBe('kind == "custom"');
  });
  it('register column accepts max, grid type and ui-level flags (Plan 2a additive)', () => {
    const cfg = parseFieldConfig({ widget: 'register', uiConfig: { title: 't', flags: [{ key: 'not_applicable', label: 'n/a' }, { key: 'estimated' }], columns: [
      { key: 'pct', type: 'number', label: '%', min: 0, max: 100 },
      { key: 'cells', type: 'grid', label: 'Raster', required: true },
    ] }, lookup: null, visibleWhen: null });
    const ui = cfg.ui as { flags?: Array<{ key: string; label?: string }>; columns: Array<{ type: string; max?: number }> };
    expect(ui.flags).toEqual([{ key: 'not_applicable', label: 'n/a' }, { key: 'estimated' }]);
    expect(ui.columns[0].max).toBe(100);
    expect(ui.columns[1].type).toBe('grid');
    expect(() => parseFieldConfig({ widget: 'register', uiConfig: { title: 't', flags: [{ key: '' }], columns: [{ key: 'x', type: 'text', label: 'x' }] }, lookup: null, visibleWhen: null })).toThrow(/flags\.0\.key/);
  });
  it('rejects unknown widget and a lookup_value column without lookup', () => {
    expect(() => parseFieldConfig({ widget: 'dropdown', uiConfig: null, lookup: null, visibleWhen: null })).toThrow(/widget/);
    expect(() => parseFieldConfig({ widget: 'register', uiConfig: { title: 't', columns: [{ key: 'x', type: 'lookup_value', label: 'x' }] }, lookup: null, visibleWhen: null })).toThrow(/columns\.0\.lookup/);
  });
  it('override.flag_key must name a boolean column (Plan 2b Task 5 controller amendment)', () => {
    // The editor's toggle writes `row[flag_key]`; the stored-cells projection keeps only declared
    // columns, so a flag_key that is not a boolean column would be written by the toggle and dropped on save.
    const cols = [
      { key: 'v', type: 'lookup_value', label: 'v', lookup: { table_code: 'TAB9', key_column: 'k', value: 'cm' } },
      { key: 'k', type: 'lookup_key', label: 'k', lookup: { table_code: 'TAB9' } },
    ];
    const withFlag = (col: Record<string, unknown> | null) => ({
      title: 't', columns: col ? [...cols, col] : cols,
      override: { flag_key: 'flag', applies_to: ['v'], policy: 'anhaltswert' },
    });
    expect(() => parseFieldConfig({ widget: 'register', uiConfig: withFlag(null), lookup: null, visibleWhen: null })).toThrow(/override\.flag_key.*"flag".*boolean column/);
    expect(() => parseFieldConfig({ widget: 'register', uiConfig: withFlag({ key: 'flag', type: 'text', label: 'f' }), lookup: null, visibleWhen: null })).toThrow(/override\.flag_key.*boolean column/);
    const ok = parseFieldConfig({ widget: 'register', uiConfig: withFlag({ key: 'flag', type: 'boolean', label: 'f' }), lookup: null, visibleWhen: null });
    expect((ok.ui as { override?: { flag_key: string } }).override?.flag_key).toBe('flag');
    // No override block ⇒ nothing to check.
    expect(() => parseFieldConfig({ widget: 'register', uiConfig: { title: 't', columns: cols }, lookup: null, visibleWhen: null })).not.toThrow();
  });
  it('rejects a derived column without expr', () => {
    expect(() => parseFieldConfig({ widget: 'register', uiConfig: { title: 't', columns: [{ key: 'x', type: 'derived', label: 'x' }] }, lookup: null, visibleWhen: null })).toThrow(/columns\.\d+\.expr/);
  });
  it('rejects a lookup_key column without lookup', () => {
    expect(() => parseFieldConfig({ widget: 'register', uiConfig: { title: 't', columns: [{ key: 'x', type: 'lookup_key', label: 'x' }] }, lookup: null, visibleWhen: null })).toThrow(/columns\.\d+\.lookup/);
  });
  it('lookup_fill requires a lookup binding with role/keys/value', () => {
    const ok = parseFieldConfig({ widget: 'lookup_fill', uiConfig: null, lookup: { table_code: 'TAB3', role: 'value', keys: [{ column: 'auffangflaechen_art', from_symbol: 'auffangflaechen_art' }], value: 'e' }, visibleWhen: null });
    expect(ok.lookup?.role).toBe('value');
    expect(() => parseFieldConfig({ widget: 'lookup_fill', uiConfig: null, lookup: null, visibleWhen: null })).toThrow(/lookup/);
  });
  it('rejects a non-null lookup binding on a widget other than lookup_fill', () => {
    expect(() =>
      parseFieldConfig({
        widget: 'register',
        uiConfig: { title: 't', columns: [{ key: 'x', type: 'text', label: 'x' }] },
        lookup: { table_code: 'TAB3', role: 'value', keys: [{ column: 'a', from_symbol: 'a' }], value: 'e' },
        visibleWhen: null,
      }),
    ).toThrow('lookup binding only valid for lookup_fill');
  });
  it('select_many requires a non-null ui_config with a title (rejects null ui_config)', () => {
    expect(() => parseFieldConfig({ widget: 'select_many', uiConfig: null, lookup: null, visibleWhen: null })).toThrow(/ui_config invalid for select_many/);
    const ok = parseFieldConfig({ widget: 'select_many', uiConfig: { title: 'Checkliste' }, lookup: null, visibleWhen: null });
    expect(ok.ui).toMatchObject({ title: 'Checkliste' });
  });
});

describe('Plan 2b additive keys', () => {
  it('register ui_config accepts flags (note/disables_rows), footer, option_labels/sort_by_label, display/value_labels, aria_label and a grid column with spec', () => {
    const ui = {
      title: 'Schadstoffregister',
      flags: [{ key: 'not_applicable', label: 'Keine berichtspflichtigen Schadstoffemissionen', note: 'Null-Meldung', disables_rows: true }],
      footer: ['AmountOfEmissionToAir'],
      columns: [
        { key: 'medium', type: 'enum', label: 'Medium', options: ['air', 'water', 'soil'], option_labels: { air: 'Luft', water: 'Wasser', soil: 'Boden' }, sort_by_label: true, aria_label: 'Medium' },
        { key: 'kind', type: 'derived', label: 'befestigt/unbefestigt', expr: "lookup('TAB9', k, 'kind')", display: 'badge', value_labels: { paved: 'befestigt', unpaved: 'unbefestigt' } },
        { key: 'ratings', type: 'grid', label: 'Bewertung (0–10)', grid: { rows: [{ key: 'bauherr', label: 'Bauherr' }], cols: [{ key: 'probability', label: 'Eintretenswahrsch.', min: 0, max: 10, step: 1 }] } },
      ],
    };
    const cfg = parseFieldConfig({ widget: 'register', uiConfig: ui, lookup: null, visibleWhen: null });
    const out = cfg.ui as {
      flags: Array<{ key: string; note?: string; disables_rows?: boolean }>; footer?: string[];
      columns: Array<{ option_labels?: Record<string, string>; sort_by_label?: boolean; aria_label?: string; display?: string; value_labels?: Record<string, string>; grid?: { rows: unknown[]; cols: Array<{ step?: number }> } }>;
    };
    expect(out.flags).toHaveLength(1);
    expect(out.flags[0].disables_rows).toBe(true);
    expect(out.flags[0].note).toBe('Null-Meldung');
    expect(out.footer).toEqual(['AmountOfEmissionToAir']);
    expect(out.columns[0].option_labels).toEqual({ air: 'Luft', water: 'Wasser', soil: 'Boden' });
    expect(out.columns[0].sort_by_label).toBe(true);
    expect(out.columns[0].aria_label).toBe('Medium');
    expect(out.columns[1].display).toBe('badge');
    expect(out.columns[1].value_labels).toEqual({ paved: 'befestigt', unpaved: 'unbefestigt' });
    expect(out.columns[2].grid?.cols[0].step).toBe(1);
  });
  it('a malformed grid spec (empty rows/cols) is rejected at columns.N.grid; a bad display value is rejected', () => {
    expect(() => parseFieldConfig({ widget: 'register', uiConfig: { title: 't', columns: [{ key: 'g', type: 'grid', label: 'g', grid: { rows: [], cols: [] } }] }, lookup: null, visibleWhen: null })).toThrow(/columns\.0\.grid/);
    expect(() => parseFieldConfig({ widget: 'register', uiConfig: { title: 't', columns: [{ key: 'd', type: 'text', label: 'd', display: 'huge' }] }, lookup: null, visibleWhen: null })).toThrow(/columns\.0\.display/);
  });
  it('register catalog (Task 9) validates group_column/item_column/groups', () => {
    const ok = parseFieldConfig({ widget: 'register', uiConfig: { title: 't', columns: [{ key: 'g', type: 'text', label: 'g' }, { key: 'i', type: 'text', label: 'i' }],
      catalog: { group_column: 'g', item_column: 'i', groups: [{ label: 'A', items: ['a1'] }], add_custom_label: '+ eigener' } }, lookup: null, visibleWhen: null });
    expect((ok.ui as { catalog: { groups: unknown[] } }).catalog.groups).toHaveLength(1);
    expect(() => parseFieldConfig({ widget: 'register', uiConfig: { title: 't', columns: [{ key: 'g', type: 'text', label: 'g' }], catalog: { group_column: 'g', item_column: 'i', groups: [] } }, lookup: null, visibleWhen: null })).toThrow(/catalog\.groups/);
  });
  it('reference requires carrier_symbol/rows_path/id_key/label_key; lookup_fill ui may be null or a typed object', () => {
    const ok = parseFieldConfig({ widget: 'reference', uiConfig: { carrier_symbol: 'r_D_n_table', rows_path: 'tables', id_key: 'id', label_key: 'name', badge_key: 'kind', badge_labels: { a: 'A' }, empty_label: '—' }, lookup: null, visibleWhen: null });
    expect((ok.ui as { carrier_symbol: string }).carrier_symbol).toBe('r_D_n_table');
    expect(() => parseFieldConfig({ widget: 'reference', uiConfig: null, lookup: null, visibleWhen: null })).toThrow(/carrier_symbol|ui_config invalid for reference/);
    expect(() => parseFieldConfig({ widget: 'reference', uiConfig: { title: 'x' }, lookup: null, visibleWhen: null })).toThrow(/carrier_symbol/);
    const binding = { table_code: 'TAB6', role: 'limit', keys: [{ column: 'tier', from_symbol: 'tab6_tier' }], value: 'max' };
    const lf = parseFieldConfig({ widget: 'lookup_fill', uiConfig: null, lookup: binding, visibleWhen: null });
    expect(lf.ui).toBeNull();
    const lf2 = parseFieldConfig({ widget: 'lookup_fill', uiConfig: { source_label: 'Tab. 6', reason_min_length: 10 }, lookup: binding, visibleWhen: null });
    expect((lf2.ui as { reason_min_length: number }).reason_min_length).toBe(10);
    expect(() => parseFieldConfig({ widget: 'lookup_fill', uiConfig: { reason_min_length: 0 }, lookup: binding, visibleWhen: null })).toThrow(/reason_min_length/);
  });
});
