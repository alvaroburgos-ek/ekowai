import { describe, it, expect } from 'vitest';
import { resolveEnumValuesForUpsert } from '../_pass3c-db';

/**
 * C-2 (guideline-to-tool final review): a Pass3c re-import must not empty
 * out a phase-2-migrated select_many/register field's enum_values.
 * `_pass3c-db.ts` sets `enumValues = null` for every non-'enum' data_type
 * field (select_many/register fields are data_type='json'), and the upsert
 * writes `enum_values = excluded.enum_values` — so re-importing a workbook
 * after the widget migration would silently wipe the migrated checklist
 * options (`fromDbField` -> `options: []`). resolveEnumValuesForUpsert is
 * the pure decision extracted from that write path: preserve the existing
 * (migrated) enum_values whenever the existing DB row already carries a
 * widget; otherwise use the importer's own computed value, unchanged from
 * pre-fix behavior.
 */
describe('resolveEnumValuesForUpsert', () => {
  it('preserves the existing enum_values when the existing row has a widget (migrated select_many/register)', () => {
    const existingEnumValues = [{ value: 'a', label_de: 'A', order_index: 0 }];
    const result = resolveEnumValuesForUpsert('select_many', existingEnumValues, null);
    expect(result).toBe(existingEnumValues);
  });

  it('preserves existing enum_values even when the importer computed a non-null incoming value (widget wins)', () => {
    const existingEnumValues = [{ value: 'a', label_de: 'A', order_index: 0 }];
    const incoming = [{ value: 'b', label_de: 'B', order_index: 0 }];
    expect(resolveEnumValuesForUpsert('register', existingEnumValues, incoming)).toBe(existingEnumValues);
  });

  it('falls back to null when the existing row has a widget but no enum_values (register fields never carry one)', () => {
    expect(resolveEnumValuesForUpsert('register', null, null)).toBeNull();
    expect(resolveEnumValuesForUpsert('register', undefined, null)).toBeNull();
  });

  it('uses the importer-computed value when the existing row has no widget (unmigrated field — unchanged pre-fix behavior)', () => {
    const incoming = [{ value: 'x', label_de: 'X', order_index: 0 }];
    expect(resolveEnumValuesForUpsert(null, [{ value: 'stale' }], incoming)).toBe(incoming);
    expect(resolveEnumValuesForUpsert(undefined, [{ value: 'stale' }], incoming)).toBe(incoming);
  });

  it('uses the importer-computed null for a plain (non-enum, non-migrated) json/text field — unchanged pre-fix behavior', () => {
    expect(resolveEnumValuesForUpsert(null, null, null)).toBeNull();
  });

  it('uses the importer-computed value for a brand-new field (no existing row at all)', () => {
    const incoming = [{ value: 'e1', label_de: 'E1', order_index: 0 }];
    expect(resolveEnumValuesForUpsert(undefined, undefined, incoming)).toBe(incoming);
  });
});
