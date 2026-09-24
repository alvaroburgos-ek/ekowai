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

/**
 * Wave B fix round 1, item 1 (IMPORTANT) — `evaluateWorksheetEquations` resolved its INPUTS
 * from own rows only (`buildValueMap(fields, parameters)`), so after the owner applies Plan 3
 * the save path would persist the 20 carrier-fed values while the generated PDF re-computed
 * them as `manual_required`: the screen says 5, the PDF says "manuell zu ermitteln".
 *
 * The reviewer's worked example is M820-09-D11 — own register `lose`, inherited scalar
 * `estimated_engineering_fee` from M820-01 — which the save path persists as 5 %.
 */
import { evaluateWorksheetEquations } from '../evaluate-for-report';

const M820_09_FIELDS = [
  { id: 'f-lose', symbol: 'lose', unit: null, dataType: 'json', widget: 'register', uiConfig: {
    title: 'Lose', columns: [
      { key: 'netto_wert_eur', label: 'Netto', type: 'number' },
      { key: 'ausnahme', label: 'Ausnahme', type: 'boolean' },
    ],
  } },
  { id: 'f-anteil', symbol: 'lose_ausnahme_anteil_pct', unit: '%', dataType: 'number' },
];
const M820_01_INHERITED = [{ id: 'f-fee', symbol: 'estimated_engineering_fee', unit: 'EUR', dataType: 'number' }];
const M820_09_PARAMS = [
  { fieldId: 'f-lose', valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null,
    valueJson: { rows: [{ id: '1', netto_wert_eur: 50000, ausnahme: true }, { id: '2', netto_wert_eur: 950000, ausnahme: false }] } },
];
const FEE_PARAMS = [
  { fieldId: 'f-fee', valueNumber: 1000000, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
];
const D11 = [{
  id: 'M820-09-D11', equationNumber: 'M820-09-D11',
  formula: 'lose_ausnahme_anteil_pct = sum_rows(lose, if(ausnahme == true, netto_wert_eur, 0)) * 100 / estimated_engineering_fee',
  inputSymbols: ['lose', 'estimated_engineering_fee'], outputSymbol: 'lose_ausnahme_anteil_pct', outputUnit: '%',
}];

describe('evaluateWorksheetEquations — inherited inputs (wave B fix round 1, item 1)', () => {
  it('without the inherited pair the report contradicts the save path: manual_required', () => {
    const [r] = evaluateWorksheetEquations('M820-09', D11, M820_09_FIELDS, M820_09_PARAMS, { standardCode: 'DWA-M-820-1' });
    expect(r.state.kind).toBe('manual_required');
  });

  it('with the inherited pair the PDF/report agrees with what the save path persists (5 %)', () => {
    const [r] = evaluateWorksheetEquations('M820-09', D11, M820_09_FIELDS, M820_09_PARAMS, {
      standardCode: 'DWA-M-820-1',
      inherited: { fields: M820_01_INHERITED, parameters: FEE_PARAMS },
    });
    expect(r.state.kind).toBe('computed');
    expect(r.state.kind === 'computed' && r.state.value).toBeCloseTo(5, 9);
  });

  it('an OWN field wins over an inherited field carrying the same symbol', () => {
    const own = [...M820_09_FIELDS, { id: 'f-own-fee', symbol: 'estimated_engineering_fee', unit: 'EUR', dataType: 'number' }];
    const ownParams = [...M820_09_PARAMS, { fieldId: 'f-own-fee', valueNumber: 500000, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null }];
    const [r] = evaluateWorksheetEquations('M820-09', D11, own, ownParams, {
      standardCode: 'DWA-M-820-1',
      inherited: { fields: M820_01_INHERITED, parameters: FEE_PARAMS },
    });
    expect(r.state.kind === 'computed' && r.state.value).toBeCloseTo(10, 9);
  });
});
