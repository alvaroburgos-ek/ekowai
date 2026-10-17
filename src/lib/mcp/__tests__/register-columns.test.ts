import { describe, expect, it } from 'vitest';
import { registerColumnsForField } from '../tools/worksheets';

/**
 * F7: a fill agent reading `get_worksheet` must learn the exact column keys,
 * types, required flags and enum options of a json/register field WITHOUT
 * opening a migration file. `registerColumnsForField` is the pure seam that
 * builds the `columns` array get_worksheet attaches per field — it is the
 * SAME `resolveRegisterConfig` the save-path validator (registerRowWarnings,
 * src/lib/actions/worksheet.ts) reads, so the two cannot drift apart.
 */
describe('registerColumnsForField (F7)', () => {
  it('a DB-defined register field (widget=register) returns its columns with required + enum options', () => {
    const field = {
      symbol: 'korrespondenz',
      dataType: 'json',
      widget: 'register',
      uiConfig: {
        title: 'Korrespondenz', add_label: '+ Eintrag',
        columns: [
          { key: 'datum', label: 'Datum', type: 'date', required: true },
          { key: 'richtung', label: 'Richtung', type: 'enum', required: true, options: ['gesendet', 'empfangen'] },
          { key: 'betreff', label: 'Betreff', type: 'text', required: true },
          { key: 'erledigt', label: 'erledigt', type: 'boolean' },
        ],
      },
    };
    const columns = registerColumnsForField(field);
    expect(columns).toEqual([
      { key: 'datum', label: 'Datum', type: 'date', required: true },
      { key: 'richtung', label: 'Richtung', type: 'enum', required: true, options: ['gesendet', 'empfangen'] },
      { key: 'betreff', label: 'Betreff', type: 'text', required: true },
      { key: 'erledigt', label: 'erledigt', type: 'boolean', required: false },
    ]);
  });

  it('a TS-fallback register field (widget NULL, known symbol) resolves columns the same way', () => {
    const columns = registerColumnsForField({ symbol: 'surface_inventory', dataType: 'json', widget: null, uiConfig: null });
    expect(columns).toBeDefined();
    expect(columns!.map((c) => c.key)).toEqual(['label', 'tab9_value', 'area_m2', 'c_i', 'c_s', 'coeff_override', 'kind', 'a_c_i']);
    const areaCol = columns!.find((c) => c.key === 'area_m2');
    expect(areaCol).toEqual({ key: 'area_m2', label: 'A', type: 'number', required: true });
  });

  it('a non-register json field (raw carrier, e.g. a checklist) has no columns', () => {
    expect(registerColumnsForField({ symbol: 'some_checklist', dataType: 'json', widget: 'select_many', uiConfig: { title: 'x', groups: [] } })).toBeUndefined();
  });

  it('a non-json field never gets a columns key, register or not', () => {
    expect(registerColumnsForField({ symbol: 'A_E', dataType: 'number', widget: null, uiConfig: null })).toBeUndefined();
  });
});
