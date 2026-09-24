/**
 * Plan 3 final wave B (defect 1) — the save-path materialiser must resolve INHERITED
 * fields, not only the template's own.
 *
 * Found by DIN-1989-2 (`din1989_2-I-2`, Task 17 review) and recorded again on
 * DWA-M-820-1 (`m820_1-I-2`): `saveWorksheet` ran `materializeDerivedOutputs` with
 * `templateFields` only, so a register-fed equation that names a scalar produced by
 * ANOTHER worksheet of the same standard (`consumer_worksheets`) resolved that scalar
 * to MISSING and persisted `null` — while the form, the report and the snapshot (which
 * all see own + inherited fields) computed a value.
 *
 * The two shapes pinned here are the real ones:
 *   - M820-09 D11 / D14 / D15: register `lose` on the own worksheet, scalar
 *     `estimated_engineering_fee` inherited from M820-01;
 *   - A138-26 D1: the CARRIER itself (`surface_inventory`) inherited from A138-07.
 *
 * Plus the guard that makes the widening safe: an inherited field is an INPUT source
 * only — a derived value is never written onto another worksheet's field.
 */
import { describe, it, expect } from 'vitest';
import { materializeDerivedOutputs, type FieldValue } from '../materialize-derived';

const OWN_M820_09 = [
  { id: 'f-lose', symbol: 'lose', dataType: 'json', unit: null, widget: 'register', uiConfig: {
    title: 'Lose', columns: [
      { key: 'netto_wert_eur', label: 'Netto', type: 'number' },
      { key: 'ausnahme', label: 'Ausnahme', type: 'boolean' },
    ],
  } },
  { id: 'f-anteil', symbol: 'lose_ausnahme_anteil_pct', dataType: 'number', unit: '%' },
];
/** M820-01 produces the fee and declares M820-09 as a consumer. */
const INHERITED_M820_01 = [{ id: 'f-fee', symbol: 'estimated_engineering_fee', dataType: 'number', unit: 'EUR' }];

const EQ_D11 = {
  id: 'M820-09-D11',
  equationNumber: 'M820-09-D11',
  formula: 'lose_ausnahme_anteil_pct = sum_rows(lose, if(ausnahme == true, netto_wert_eur, 0)) * 100 / estimated_engineering_fee',
  inputSymbols: ['lose', 'estimated_engineering_fee'],
  outputSymbol: 'lose_ausnahme_anteil_pct',
};

const VALUES_M820: Record<string, FieldValue> = {
  'f-lose': { type: 'json', value: { rows: [
    { id: '1', netto_wert_eur: 50000, ausnahme: true },
    { id: '2', netto_wert_eur: 950000, ausnahme: false },
  ] } },
  'f-fee': { type: 'number', value: 1000000 },
};

describe('materializeDerivedOutputs — inherited fields (Plan 3 wave B, defect 1)', () => {
  it('resolves a register-fed equation whose SCALAR input is inherited (M820-09-D11 over M820-01 estimated_engineering_fee)', () => {
    const without = materializeDerivedOutputs({
      standardCode: 'DWA-M-820-1', worksheetCode: 'M820-09',
      equations: [EQ_D11], fields: OWN_M820_09, valuesByFieldId: VALUES_M820,
    });
    // The old behaviour, kept as the explicit contrast: no inherited fields ⇒ the fee is
    // MISSING ⇒ manual_required ⇒ a null write over whatever the form showed.
    expect(without.writes).toHaveLength(1);
    expect(without.writes[0].value).toBeNull();
    expect(without.writes[0].state.kind).toBe('manual_required');

    const withInherited = materializeDerivedOutputs({
      standardCode: 'DWA-M-820-1', worksheetCode: 'M820-09',
      equations: [EQ_D11], fields: OWN_M820_09, inheritedFields: INHERITED_M820_01,
      valuesByFieldId: VALUES_M820,
    });
    expect(withInherited.writes).toHaveLength(1);
    expect(withInherited.writes[0].symbol).toBe('lose_ausnahme_anteil_pct');
    expect(withInherited.writes[0].fieldId).toBe('f-anteil');
    expect(withInherited.writes[0].value).toBeCloseTo(5, 9);
  });

  it('materialises an equation whose REGISTER CARRIER is inherited (A138-26-D1 over the A138-07 surface_inventory)', () => {
    const own = [{ id: 'f-flood', symbol: 'A_C_s_flood', dataType: 'number', unit: 'm²' }];
    const inherited = [{ id: 'f-si', symbol: 'surface_inventory', dataType: 'json', unit: null }];
    const values: Record<string, FieldValue> = {
      'f-si': { type: 'json', value: { rows: [
        { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', tab9_value: 'schwarzdecke_asphalt', area_m2: 200, c_i: 0.9, c_s: 1.0, coeff_override: false },
      ] } },
    };
    const eq = {
      id: 'A138-26-D1', equationNumber: 'A138-26-D1',
      formula: 'A_C_s_flood = sum_rows(surface_inventory, area_m2 * c_s)',
      inputSymbols: ['surface_inventory'], outputSymbol: 'A_C_s_flood',
    };
    const without = materializeDerivedOutputs({
      standardCode: 'DWA-A-138-1', worksheetCode: 'A138-26', equations: [eq], fields: own, valuesByFieldId: values,
    });
    // Old behaviour: the carrier is not a field of this template ⇒ not register-fed ⇒ skipped entirely.
    expect(without.writes).toEqual([]);

    const withInherited = materializeDerivedOutputs({
      standardCode: 'DWA-A-138-1', worksheetCode: 'A138-26', equations: [eq], fields: own,
      inheritedFields: inherited, valuesByFieldId: values,
    });
    expect(withInherited.writes).toHaveLength(1);
    expect(withInherited.writes[0].fieldId).toBe('f-flood');
    expect(withInherited.writes[0].value).toBeCloseTo(300, 6);
  });

  it('NEVER writes onto an inherited field — an output symbol that only an inherited field carries is skipped', () => {
    const own = [{ id: 'f-lose', symbol: 'lose', dataType: 'json', unit: null, widget: 'register', uiConfig: {
      title: 'Lose', columns: [{ key: 'netto_wert_eur', label: 'Netto', type: 'number' }],
    } }];
    const inherited = [{ id: 'f-foreign', symbol: 'lose_gesamt_eur', dataType: 'number', unit: 'EUR' }];
    const eq = {
      id: 'X-1', equationNumber: 'X-1', formula: 'lose_gesamt_eur = sum_rows(lose, netto_wert_eur)',
      inputSymbols: ['lose'], outputSymbol: 'lose_gesamt_eur',
    };
    const values: Record<string, FieldValue> = { 'f-lose': { type: 'json', value: { rows: [{ id: '1', netto_wert_eur: 7 }] } } };
    const out = materializeDerivedOutputs({
      standardCode: 'DWA-M-820-1', worksheetCode: 'M820-09', equations: [eq], fields: own,
      inheritedFields: inherited, valuesByFieldId: values,
    });
    expect(out.writes).toEqual([]);
  });

  it('the own field wins when an inherited field carries the same symbol (single-owner rule)', () => {
    const own = [
      ...OWN_M820_09,
      { id: 'f-own-fee', symbol: 'estimated_engineering_fee', dataType: 'number', unit: 'EUR' },
    ];
    const values: Record<string, FieldValue> = { ...VALUES_M820, 'f-own-fee': { type: 'number', value: 500000 } };
    const out = materializeDerivedOutputs({
      standardCode: 'DWA-M-820-1', worksheetCode: 'M820-09', equations: [EQ_D11], fields: own,
      inheritedFields: INHERITED_M820_01, valuesByFieldId: values,
    });
    // 50 000 / 500 000 = 10 % — the OWN field's 500 000, not the inherited 1 000 000.
    expect(out.writes[0].value).toBeCloseTo(10, 9);
  });
});

/**
 * Wave B fix round 1, item 2 (IMPORTANT) — the guard against a future regression.
 *
 * An OWN register that is absent still yields `rows: []`, so its equations resolve to
 * `manual_required` and the output is WRITTEN as null — that is the deliberate "clear the
 * stale value" rule of Plan 2a. An INHERITED carrier is different: this save is not the one
 * that owns it, so an ABSENT inherited carrier must produce NO write at all — writing null
 * would clobber a value the producing worksheet's own save legitimately materialised.
 *
 * The shape is unreachable today only because `saveWorksheet` (`src/lib/actions/worksheet.ts`,
 * the `batchRegisterIds.length > 0` gate) runs the block only when the batch carries an OWN
 * register. This pin is what fails if someone widens that gate.
 */
describe('materializeDerivedOutputs — an ABSENT inherited carrier writes nothing (wave B fix round 1, item 2)', () => {
  const own = [{ id: 'f-flood', symbol: 'A_C_s_flood', dataType: 'number', unit: 'm²' }];
  const inheritedRegister = [{ id: 'f-si', symbol: 'surface_inventory', dataType: 'json', unit: null }];
  const eq = {
    id: 'A138-26-D1', equationNumber: 'A138-26-D1',
    formula: 'A_C_s_flood = sum_rows(surface_inventory, area_m2 * c_s)',
    inputSymbols: ['surface_inventory'], outputSymbol: 'A_C_s_flood',
  };

  it('no value at all for the inherited register ⇒ no write (not even a null)', () => {
    const out = materializeDerivedOutputs({
      standardCode: 'DWA-A-138-1', worksheetCode: 'A138-26', equations: [eq], fields: own,
      inheritedFields: inheritedRegister, valuesByFieldId: {},
    });
    expect(out.writes).toEqual([]);
  });

  it('an explicit null json for the inherited register ⇒ still no write', () => {
    const out = materializeDerivedOutputs({
      standardCode: 'DWA-A-138-1', worksheetCode: 'A138-26', equations: [eq], fields: own,
      inheritedFields: inheritedRegister,
      valuesByFieldId: { 'f-si': { type: 'json', value: null } },
    });
    expect(out.writes).toEqual([]);
  });

  it('the same for an inherited CHECKLIST carrier read through contains()', () => {
    const out = materializeDerivedOutputs({
      standardCode: 'DWA-M-820-1', worksheetCode: 'M820-09',
      equations: [{ id: 'X-2', equationNumber: 'X-2', formula: "flag_code = if(contains(pruefliste, 'a'), 1, 0)", inputSymbols: ['pruefliste'], outputSymbol: 'flag_code' }],
      fields: [{ id: 'f-code', symbol: 'flag_code', dataType: 'number', unit: null }],
      inheritedFields: [{ id: 'f-chk', symbol: 'pruefliste', dataType: 'json', unit: null }],
      valuesByFieldId: {},
    });
    expect(out.writes).toEqual([]);
  });

  it('an OWN absent register still writes null — the clear-stale rule is untouched', () => {
    const out = materializeDerivedOutputs({
      standardCode: 'DWA-A-138-1', worksheetCode: 'A138-26', equations: [eq],
      fields: [...own, { id: 'f-si-own', symbol: 'surface_inventory', dataType: 'json', unit: null }],
      valuesByFieldId: {},
    });
    expect(out.writes).toHaveLength(1);
    expect(out.writes[0].value).toBeNull();
  });
});
