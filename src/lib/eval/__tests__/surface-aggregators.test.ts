// src/lib/eval/__tests__/surface-aggregators.test.ts
// Plan 2a: the six UUID aggregators are retired; the same fixtures now pin the formula strings.
import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { REGISTER_CONFIGS_FALLBACK, registerFlagKeys } from '../register-configs';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { A138_07_REGISTER_FORMULAS } from '../rewrites';

const GL2F = 'a1380702-0000-4000-8000-000000000005';
const GL2G = 'a1380702-0000-4000-8000-000000000006';
const A_C_ID = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';
const C_M_ID = 'a1380702-0000-4000-8000-000000000002';
const BA_ID = 'a1380702-0000-4000-8000-000000000003';
const NBA_ID = 'a1380702-0000-4000-8000-000000000004';

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

/** Evaluate one of the six A138-07 producers through its formula string with the given rows. */
const run = (equationId: string, rows: unknown[]) =>
  evaluateFormula({
    equationId,
    formula: A138_07_REGISTER_FORMULAS[equationId].formula,
    inputSymbols: ['surface_inventory'],
    outputSymbol: A138_07_REGISTER_FORMULAS[equationId].outputSymbol,
    expectedUnits: {},
    inputs: [],
    registers: { surface_inventory: prep(rows) },
    tableLookup: table,
  });

// Two complete rows: one paved (befestigt) C_i=0.9, one unpaved C_i=0.3.
const splitRows = [
  { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
  { id: '2', label: 'Rasen', tab9_value: 'park_flach', area_m2: 200, c_i: 0.3, c_s: 0.5, coeff_override: false },
];

describe('A138-07 reduced-area split producers (Gl. 2f/2g)', () => {
  it('A_C_sealed = Σ(A_E·C_i) over befestigt rows', () => {
    const r = run(GL2F, splitRows);
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(90, 6); // 100*0.9
  });
  it('A_C_unsealed = Σ(A_E·C_i) over unbefestigt rows', () => {
    const r = run(GL2G, splitRows);
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(60, 6); // 200*0.3
  });
  it('both return manual_required when no row is complete', () => {
    expect(run(GL2F, []).kind).toBe('manual_required');
    expect(run(GL2G, []).kind).toBe('manual_required');
  });
});

const uniformRows = [
  { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
  { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
];

describe('surface producers (A138-07) via formula strings', () => {
  it('A_C computes 4826.43; the sealed/unsealed split is carried by Gl. 2f/2g', () => {
    const s = run(A_C_ID, uniformRows);
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') expect(s.value).toBeCloseTo(4826.43, 2);
    const sealed = run(GL2F, uniformRows);
    if (sealed.kind === 'computed') expect(sealed.value).toBeCloseTo(4826.43, 2);
    expect(sealed.kind).toBe('computed');
    const unsealed = run(GL2G, uniformRows);
    expect(unsealed.kind).toBe('computed');
    if (unsealed.kind === 'computed') expect(unsealed.value).toBe(0);
  });
  it('C_m computes 0.9', () => {
    const s = run(C_M_ID, uniformRows);
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') expect(s.value).toBeCloseTo(0.9, 6);
  });
  it('A_E_ba / A_E_nba compute the paved/unpaved area totals', () => {
    const ba = run(BA_ID, uniformRows);
    const nba = run(NBA_ID, uniformRows);
    expect(ba.kind).toBe('computed'); if (ba.kind === 'computed') expect(ba.value).toBeCloseTo(5362.7, 4);
    expect(nba.kind).toBe('computed'); if (nba.kind === 'computed') expect(nba.value).toBe(0);
  });
  it('returns manual_required (not a bare 0) when no complete rows', () => {
    const s = run(A_C_ID, []);
    expect(s.kind).toBe('manual_required');
  });
});
