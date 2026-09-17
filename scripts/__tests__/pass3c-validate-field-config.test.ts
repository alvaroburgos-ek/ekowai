import { describe, it, expect } from 'vitest';
import { validateFieldConfigColumns } from '../_pass3c-validate';

describe('pass3c validate — widget/ui_config/lookup', () => {
  it('accepts NULL widget and a valid register config', () => {
    expect(validateFieldConfigColumns({ symbol: 'x', widget: null, ui_config: null, lookup: null, visible_when: null })).toEqual([]);
    expect(validateFieldConfigColumns({ symbol: 'x', widget: 'register', ui_config: { title: 't', columns: [{ key: 'a', type: 'text', label: 'A' }] }, lookup: null, visible_when: null })).toEqual([]);
  });
  it('reports the symbol and the path on failure', () => {
    const errs = validateFieldConfigColumns({ symbol: 'e', widget: 'lookup_fill', ui_config: null, lookup: null, visible_when: null });
    expect(errs[0]).toMatch(/field e: .*lookup/);
  });
});

describe('pass3c validate — lookup_fill keys vs the table key_columns (Plan 2b Task 7; I-2 unregistered table is an ERROR)', () => {
  it('validateLookupKeysOrder: keys must name the table key_columns in order; an unregistered table is an error, never silent', async () => {
    const { validateLookupKeysOrder } = await import('../_pass3c-validate');
    const { resolveRegulationTable } = await import('../../src/lib/eval/regulation-tables-fallback');
    const tab6 = resolveRegulationTable('DWA-A-138-1', 'TAB6');
    const ok = { table_code: 'TAB6', role: 'limit' as const, keys: [{ column: 'tier', from_symbol: 'tab6_tier' }, { column: 'bbz_band', from_symbol: 'bbz_band' }], value: 'max' };
    expect(validateLookupKeysOrder(ok, tab6)).toEqual([]);
    expect(validateLookupKeysOrder({ ...ok, keys: [ok.keys[1], ok.keys[0]] }, tab6)[0]).toMatch(/key_columns.*tier, bbz_band.*bbz_band, tier/);
    expect(validateLookupKeysOrder({ ...ok, keys: [ok.keys[0]] }, tab6)).toHaveLength(1);
    expect(validateLookupKeysOrder({ ...ok, value: 'nope' }, tab6)[0]).toMatch(/value column "nope"/);
    // I-2 (final review): the importer never loaded DB tables and this returned [] — a Plan-3 workbook binding a
    // typo'd or unseeded table code passed validation and only failed at render time.
    expect(validateLookupKeysOrder(ok, undefined, 'lim')).toEqual(['lookup_fill lim: table TAB6 not registered (seed it first or check table_code)']);
    expect(validateLookupKeysOrder(ok, undefined)[0]).toMatch(/^lookup_fill: table TAB6 not registered/);
  });
  it('a Fields row with widget lookup_fill and mis-ordered keys is rejected by validateFieldConfigColumns; an unknown standard / unregistered table is rejected too', () => {
    const bad = { table_code: 'TAB6', role: 'limit', keys: [{ column: 'bbz_band', from_symbol: 'bbz_band' }, { column: 'tier', from_symbol: 'tab6_tier' }], value: 'max' };
    expect(validateFieldConfigColumns({ symbol: 'lim', widget: 'lookup_fill', ui_config: null, lookup: bad, visible_when: null }, 'DWA-A-138-1')[0]).toMatch(/field lim: .*key_columns/);
    // Unknown standard ⇒ the table is not registered for it ⇒ error (I-2), not a silent pass.
    expect(validateFieldConfigColumns({ symbol: 'lim', widget: 'lookup_fill', ui_config: null, lookup: bad, visible_when: null }, 'NOPE-1')).toEqual([
      'field lim: lookup_fill lim: table TAB6 not registered (seed it first or check table_code)',
    ]);
    // No standard given ⇒ standard-less resolution resolves a UNIQUE code only. TAB6 is seeded by DWA-A-138-1 AND
    // DWA-M-1200-3 (Plan 3 Task 6 — the printed table numbers are per standard), so it is NOT resolved without a
    // standard (never a guess) — an error, not a silent pass; a unique multi-key code (TAB789, DWA-M-1200-3 only) still checks the shape.
    expect(validateFieldConfigColumns({ symbol: 'lim', widget: 'lookup_fill', ui_config: null, lookup: bad, visible_when: null })[0]).toMatch(/table TAB6 not registered/);
    const badUnique = { table_code: 'TAB789', role: 'limit', keys: [{ column: 'spritzschutz', from_symbol: 's' }, { column: 'tabelle', from_symbol: 't' }, { column: 'klasse_group', from_symbol: 'k' }], value: 'faktor' };
    expect(validateFieldConfigColumns({ symbol: 'lim', widget: 'lookup_fill', ui_config: null, lookup: badUnique, visible_when: null })[0]).toMatch(/field lim: .*key_columns/);
    expect(validateFieldConfigColumns({ symbol: 'lim', widget: 'lookup_fill', ui_config: null, lookup: { ...bad, table_code: 'TABX' }, visible_when: null })[0]).toMatch(/table TABX not registered/);
  });
});

describe('pass3c validate — lookup_fill data_type (I-1)', () => {
  const lookup = { table_code: 'TAB9', role: 'value', keys: [{ column: 'surface_type', from_symbol: 'surface_type' }], value: 'cm' };
  it('accepts number / text / enum', () => {
    for (const data_type of ['number', 'text', 'enum']) {
      expect(validateFieldConfigColumns({ symbol: 'x', data_type, widget: 'lookup_fill', ui_config: null, lookup, visible_when: null }, 'DWA-A-138-1')).toEqual([]);
    }
  });
  it('rejects boolean / date / json — the widget can only fill a scalar of those three types', () => {
    for (const data_type of ['boolean', 'date', 'json']) {
      const errs = validateFieldConfigColumns({ symbol: 'x', data_type, widget: 'lookup_fill', ui_config: null, lookup, visible_when: null }, 'DWA-A-138-1');
      expect(errs).toHaveLength(1);
      expect(errs[0]).toMatch(/field x: lookup_fill data_type must be number\|text\|enum, got/);
      expect(errs[0]).toContain(data_type);
    }
  });
});
