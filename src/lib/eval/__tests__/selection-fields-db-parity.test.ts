import { describe, it, expect } from 'vitest';
import { SELECTION_CONFIGS, toDbShape, fromDbField } from '../selection-fields';

describe('SELECTION_CONFIGS ⇄ DB shape parity (phase-2 pin)', () => {
  const symbols = Object.keys(SELECTION_CONFIGS);
  // Ruling (Task 7, source-verified in-session): the plan/brief assumed 38
  // SELECTION_CONFIGS entries (§8 Phase 2), but the live registry in
  // selection-fields.ts currently holds 36 (24 register + 14 checklist minus
  // the 2 type-definition lines the plan's count conflated with real entries;
  // confirmed by `Object.keys(SELECTION_CONFIGS).length` in-session and by a
  // manual key enumeration). Task 7 only appends adapters — it does not add
  // configs — so the pin locks the real, current count rather than a stale
  // planning figure. The D-1/null-case tests and the full round-trip loop are
  // otherwise verbatim from the brief.
  it('covers all 36 configs', () => expect(symbols).toHaveLength(36));
  for (const symbol of symbols) {
    it(`${symbol}: fromDbField(toDbShape(config)) deep-equals config`, () => {
      const config = SELECTION_CONFIGS[symbol];
      const db = toDbShape(symbol, config);
      const back = fromDbField({ symbol, dataType: 'json', enumValues: db.enum_values, widget: db.widget, uiConfig: db.ui_config, lookup: null, visibleWhen: null });
      expect(back).toEqual(config);
    });
  }
  it('D-1: a138_anlagentyp_kandidaten keeps the prod enum values, options rebuilt from them', () => {
    const prod = [{ value: 'versickerungsflaeche', label_de: 'Flächenversickerung', order_index: 0 }, { value: 'mulde', label_de: 'Muldenversickerung', order_index: 1 }];
    const db = toDbShape('a138_anlagentyp_kandidaten', SELECTION_CONFIGS.a138_anlagentyp_kandidaten, { keepProdEnum: prod });
    expect(db.enum_values).toEqual(prod);
    const back = fromDbField({ symbol: 'a138_anlagentyp_kandidaten', dataType: 'json', enumValues: prod, widget: db.widget, uiConfig: db.ui_config, lookup: null, visibleWhen: null });
    expect(back && back.kind === 'checklist' ? back.options : null).toEqual(['versickerungsflaeche', 'mulde']);
  });
  it('returns null for non-selection widgets', () => {
    expect(fromDbField({ symbol: 'x', dataType: 'number', enumValues: null, widget: null, uiConfig: null, lookup: null, visibleWhen: null })).toBeNull();
  });
});
