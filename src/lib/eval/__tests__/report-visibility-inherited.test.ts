/**
 * Plan 3 final wave B (defect 1) — the PDF/report loader is the second server consumer of
 * `computeVisibility` that resolved symbols from the template's own fields only
 * (`src/lib/pdf/load-data.ts` → `reportVisibility(tmplFields, …, tmplParameters)`), so a
 * rule whose driver is inherited never hid anything in the report or the PDF either.
 * Same defect, same fix: the HIDEABLE set stays own, the LOOKUP covers own + inherited.
 */
import { describe, it, expect } from 'vitest';
import { reportVisibility } from '../evaluate-for-report';

const OWN_FIELDS = [
  { id: 'f-vpl', symbol: 'V_Pruef_leist', unit: 'l', dataType: 'number', sectionId: null, visibleWhen: 'DN <= 200' },
];
const OWN_PARAMS = [
  { fieldId: 'f-vpl', valueNumber: 450, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
];
const INHERITED_FIELDS = [
  { id: 'f-dn', symbol: 'DN', unit: 'mm', dataType: 'number' },
];
const INHERITED_PARAMS = [
  { fieldId: 'f-dn', valueNumber: 300, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
];

describe('reportVisibility — inherited drivers (wave B defect 1)', () => {
  it('without the inherited field the driver is unknown ⇒ pending ⇒ nothing hides', () => {
    const { hiddenSymbols } = reportVisibility(OWN_FIELDS, [], OWN_PARAMS);
    expect([...hiddenSymbols]).toEqual([]);
  });

  it('with the inherited field in the lookup, DN = 300 fails `DN <= 200` ⇒ the own field hides', () => {
    const { hiddenSymbols, hiddenFieldIds } = reportVisibility(OWN_FIELDS, [], OWN_PARAMS, {
      fields: INHERITED_FIELDS,
      parameters: INHERITED_PARAMS,
    });
    expect([...hiddenSymbols]).toEqual(['V_Pruef_leist']);
    expect([...hiddenFieldIds]).toEqual(['f-vpl']);
  });

  it('the inherited field itself is never hidden — it is governed by its origin worksheet', () => {
    const { hiddenSymbols } = reportVisibility(
      OWN_FIELDS,
      [],
      OWN_PARAMS,
      { fields: [{ ...INHERITED_FIELDS[0], visibleWhen: 'DN <= 200' }], parameters: INHERITED_PARAMS },
    );
    expect([...hiddenSymbols]).not.toContain('DN');
  });
});
