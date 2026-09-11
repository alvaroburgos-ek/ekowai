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
    ], override: { flag_key: 'coeff_override', applies_to: ['c_i'], policy: 'anhaltswert' } };
    const cfg = parseFieldConfig({ widget: 'register', uiConfig: ui, lookup: null, visibleWhen: null });
    expect(cfg.widget).toBe('register');
    const columns = (cfg.ui as { columns: Array<{ discriminator?: boolean; visible_when?: string }> }).columns;
    expect(columns).toHaveLength(5);
    expect(columns[0].discriminator).toBe(true);
    expect(columns[0].visible_when).toBe('kind == "custom"');
  });
  it('rejects unknown widget and a lookup_value column without lookup', () => {
    expect(() => parseFieldConfig({ widget: 'dropdown', uiConfig: null, lookup: null, visibleWhen: null })).toThrow(/widget/);
    expect(() => parseFieldConfig({ widget: 'register', uiConfig: { title: 't', columns: [{ key: 'x', type: 'lookup_value', label: 'x' }] }, lookup: null, visibleWhen: null })).toThrow(/columns\.0\.lookup/);
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
