// src/lib/eval/__tests__/formula-registers.test.ts
// Plan 2a Task 6: `evaluateFormula` accepts prepared registers; the six A138-07
// producers are formula strings evaluated through sum_rows()/if().
import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { REGISTER_CONFIGS_FALLBACK, registerFlagKeys } from '../register-configs';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { A138_07_REGISTER_FORMULAS } from '../rewrites';

const table = makeTableLookup('DWA-A-138-1');
const cfg = REGISTER_CONFIGS_FALLBACK.surface_inventory;
const prep = (rows: unknown[]) =>
  prepareRegisterRows(
    { rows },
    cfg.columns,
    { table, tableRows: makeTableRows('DWA-A-138-1') },
    {
      legacyMap: cfg.legacy_map,
      flagKeys: registerFlagKeys('surface_inventory', cfg),
      overrideFlagKey: cfg.override?.flag_key,
      overrideAppliesTo: cfg.override?.applies_to,
    },
  );
const registers = {
  surface_inventory: prep([
    { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
    { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
  ]),
};
const req = (equationId: string, formula: string) => ({
  equationId,
  formula,
  inputSymbols: ['surface_inventory'],
  outputSymbol: '',
  inputs: [],
  registers,
  tableLookup: table,
});
const A_C_ID = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';

describe('evaluateFormula with registers — A138-07 parity with the retired aggregators', () => {
  const expected: Record<string, number> = { A_C: 4826.43, C_m: 0.9, A_E_ba: 5362.7, A_E_nba: 0, A_C_sealed: 4826.43, A_C_unsealed: 0 };
  for (const [id, { outputSymbol, formula }] of Object.entries(A138_07_REGISTER_FORMULAS)) {
    it(`${outputSymbol} via its formula string`, () => {
      const s = evaluateFormula(req(id, formula));
      expect(s.kind).toBe('computed');
      if (s.kind === 'computed') expect(s.value).toBeCloseTo(expected[outputSymbol], 2);
    });
  }
  it('paved/unpaved split: 100 m² asphalt @0.9 + 200 m² park @0.3 ⇒ sealed 90, unsealed 60', () => {
    const split = {
      surface_inventory: prep([
        { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', label: 'Rasen', tab9_value: 'park_flach', area_m2: 200, c_i: 0.3, c_s: 0.5, coeff_override: true },
      ]),
    };
    const sealed = evaluateFormula({ ...req('a1380702-0000-4000-8000-000000000005', A138_07_REGISTER_FORMULAS['a1380702-0000-4000-8000-000000000005'].formula), registers: split });
    const unsealed = evaluateFormula({ ...req('a1380702-0000-4000-8000-000000000006', A138_07_REGISTER_FORMULAS['a1380702-0000-4000-8000-000000000006'].formula), registers: split });
    expect(sealed).toMatchObject({ kind: 'computed' });
    expect((sealed as { value: number }).value).toBeCloseTo(90, 6);
    expect((unsealed as { value: number }).value).toBeCloseTo(60, 6);
  });
  it('empty register ⇒ manual_required with the row message (never 0)', () => {
    const s = evaluateFormula({ ...req(A_C_ID, A138_07_REGISTER_FORMULAS[A_C_ID].formula), registers: { surface_inventory: prep([]) } });
    expect(s.kind).toBe('manual_required');
    if (s.kind === 'manual_required') expect(s.reason).toMatch(/Keine vollständigen Zeilen/);
  });
  it('register symbol absent from the request ⇒ manual_required naming the missing input', () => {
    const s = evaluateFormula({ ...req(A_C_ID, A138_07_REGISTER_FORMULAS[A_C_ID].formula), registers: {} });
    expect(s.kind).toBe('manual_required');
    if (s.kind === 'manual_required') expect(s.missing).toEqual(['surface_inventory']);
  });
  it('the rewrite bridge applies only while the DB formula differs from the target', () => {
    const bridged = evaluateFormula(req(A_C_ID, 'A_C_preliminary = Σ_i (A_E,i · C_i)'));
    expect(bridged.kind).toBe('computed');
    if (bridged.kind === 'computed') {
      expect(bridged.rewrite).toBeDefined();
      // the badge shows the captured prod text, not a generic label
      expect(bridged.rewrite?.from).toBe('A_C_preliminary = Σ_i (A_E,i · C_i)');
    }
    const migrated = evaluateFormula(req(A_C_ID, A138_07_REGISTER_FORMULAS[A_C_ID].formula));
    expect(migrated.kind).toBe('computed');
    if (migrated.kind === 'computed') expect(migrated.rewrite).toBeUndefined();
    // whitespace differences do not re-arm the bridge
    const spaced = evaluateFormula(req(A_C_ID, A138_07_REGISTER_FORMULAS[A_C_ID].formula.replace(/, /g, ',  ')));
    expect(spaced.kind).toBe('computed');
    if (spaced.kind === 'computed') expect(spaced.rewrite).toBeUndefined();
  });
  it('a formula with if(a > b, …) is NOT misclassified as a criterion', () => {
    const s = evaluateFormula({ equationId: 'y', formula: 'y = if(a > b, a, b)', inputSymbols: ['a', 'b'], outputSymbol: 'y', inputs: [{ symbol: 'a', value: 2, unit: null }, { symbol: 'b', value: 1, unit: null }] });
    expect(s).toMatchObject({ kind: 'computed', value: 2 });
  });
  it('a bare comparison with a call inside is still a criterion (manual_required, not error)', () => {
    // `round(` is in the call set, so the classification goes through parseExpression + isConditionNode.
    const s = evaluateFormula({ equationId: 'c', formula: 'crit = round(a) > b', inputSymbols: ['a', 'b'], outputSymbol: 'crit', inputs: [{ symbol: 'a', value: 4, unit: null }, { symbol: 'b', value: 1, unit: null }] });
    expect(s.kind).toBe('manual_required');
    if (s.kind === 'manual_required') expect(s.reason).toMatch(/Kriteriumsformel/);
  });
  it('a scalar equation without registers is untouched', () => {
    const s = evaluateFormula({ equationId: 'z', formula: 'z = a * 2', inputSymbols: ['a'], outputSymbol: 'z', inputs: [{ symbol: 'a', value: 3, unit: null }] });
    expect(s).toMatchObject({ kind: 'computed', value: 6, formulaEvaluated: 'a * 2' });
  });
});
