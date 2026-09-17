// Plan 2a Task 8: the generic register materialiser (replaces materialize-surfaces.test.ts —
// its three assertions live in the first three cases below).
import { describe, it, expect } from 'vitest';
import { materializeDerivedOutputs, registerFieldIds, parametersToFieldValues } from '../materialize-derived';
import { A138_07_REGISTER_FORMULAS, A138_07_PRIOR_FORMULAS } from '../rewrites';

const fields = [
  { id: 'f-si', symbol: 'surface_inventory', dataType: 'json', unit: null },
  ...Object.values(A138_07_REGISTER_FORMULAS).map((r, i) => ({ id: `f-${i}`, symbol: r.outputSymbol, dataType: 'number', unit: null })),
];
const equations = Object.entries(A138_07_REGISTER_FORMULAS).map(([id, r]) => ({ id, equationNumber: r.outputSymbol, formula: r.formula, inputSymbols: ['surface_inventory'], outputSymbol: r.outputSymbol }));
const carrier = (rows: unknown[]) => ({ 'f-si': { type: 'json' as const, value: { rows } } });

describe('materializeDerivedOutputs', () => {
  it('maps a complete carrier to the six derived scalars (was materializeSurfaceOutputs)', () => {
    const { writes: out } = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations, fields, valuesByFieldId: carrier([
      { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: '2', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
    ]) });
    const by = (s: string) => out.find((w) => w.symbol === s)!;
    expect(by('A_C').value).toBeCloseTo(4826.43, 2);
    expect(by('C_m').value).toBeCloseTo(0.9, 6);
    expect(by('A_E_ba').value).toBeCloseTo(5362.7, 4);
    expect(by('A_E_nba').value).toBe(0);
    expect(by('A_C').fieldId).toBe('f-0');
  });
  it('materializes A_C_sealed and A_C_unsealed (100 @0.9 paved + 200 @0.3 unpaved ⇒ 90 / 60)', () => {
    const { writes: out } = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations, fields, valuesByFieldId: carrier([
      { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: '2', tab9_value: 'park_flach', area_m2: 200, c_i: 0.3, c_s: 0.5, coeff_override: true },
    ]) });
    expect(out.find((w) => w.symbol === 'A_C_sealed')!.value).toBeCloseTo(90, 6);
    expect(out.find((w) => w.symbol === 'A_C_unsealed')!.value).toBeCloseTo(60, 6);
  });
  it('returns nulls (not 0) when nothing is complete — clears stale downstream values', () => {
    const { writes: out } = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations, fields, valuesByFieldId: carrier([]) });
    expect(out).toHaveLength(6);
    expect(out.every((w) => w.value === null && w.state.kind === 'manual_required')).toBe(true);
    const { writes: none } = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations, fields, valuesByFieldId: {} });
    expect(none).toHaveLength(6);
    expect(none.every((w) => w.value === null)).toBe(true);
  });
  it('VSME-B04.100 sums come from the fallback equations; not_applicable ⇒ 0, empty ⇒ null', () => {
    const f = [{ id: 'p', symbol: 'pollutant_register', dataType: 'json', unit: null }, { id: 'a', symbol: 'AmountOfEmissionToAir', dataType: 'number', unit: 't' }, { id: 'w', symbol: 'AmountOfEmissionToWater', dataType: 'number', unit: 't' }, { id: 's', symbol: 'AmountOfEmissionToSoil', dataType: 'number', unit: 't' }];
    const na = materializeDerivedOutputs({ standardCode: 'VSME', worksheetCode: 'VSME-B04.100', equations: [], fields: f, valuesByFieldId: { p: { type: 'json', value: { not_applicable: true, rows: [] } } } });
    expect(na.writes.map((w) => w.value)).toEqual([0, 0, 0]);
    const empty = materializeDerivedOutputs({ standardCode: 'VSME', worksheetCode: 'VSME-B04.100', equations: [], fields: f, valuesByFieldId: { p: { type: 'json', value: { not_applicable: false, rows: [] } } } });
    expect(empty.writes.map((w) => w.value)).toEqual([null, null, null]);
    // per-medium sums over COMPLETE rows only (was summarizePollutants): row 4 lacks its pollutant → ignored.
    const sums = materializeDerivedOutputs({ standardCode: 'VSME', worksheetCode: 'VSME-B04.100', equations: [], fields: f, valuesByFieldId: { p: { type: 'json', value: { not_applicable: false, rows: [
      { id: '1', label: 'Kessel', pollutant: 'NitrogenOxidesNOxNO2Member', medium: 'air', amount_t: 1.5 },
      { id: '2', label: 'Kessel', pollutant: 'SulphurOxidesSOxSO2Member', medium: 'air', amount_t: 0.5 },
      { id: '3', label: 'Abwasser', pollutant: 'LeadAndCompoundsPbMember', medium: 'water', amount_t: 0.25 },
      { id: '4', label: 'unvollständig', pollutant: null, medium: 'soil', amount_t: 9 },
    ] } } } });
    expect(sums.writes.map((w) => [w.symbol, w.value])).toEqual([['AmountOfEmissionToAir', 2], ['AmountOfEmissionToWater', 0.25], ['AmountOfEmissionToSoil', 0]]);
    expect(sums.writes.map((w) => w.fieldId)).toEqual(['a', 'w', 's']);
  });
  it('dedupes writes by output field — FIRST equation wins (DB order; a DB row beats a later fallback row)', () => {
    const [first] = equations; // A_C = sum_rows(surface_inventory, area_m2 * c_i)
    const second = { id: 'alt-a-c', equationNumber: 'A_C-alt', formula: 'A_C = sum_rows(surface_inventory, area_m2)', inputSymbols: ['surface_inventory'], outputSymbol: 'A_C' };
    const { writes } = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations: [first, second], fields, valuesByFieldId: carrier([
      { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
    ]) });
    expect(writes).toHaveLength(1);
    expect(writes[0].fieldId).toBe('f-0');
    expect(writes[0].equationId).toBe(first.id);
    expect(writes[0].value).toBeCloseTo(90, 6);
    // reversed order → the alternative wins (order, not id, decides)
    const rev = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations: [second, first], fields, valuesByFieldId: carrier([
      { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
    ]) });
    expect(rev.writes.map((w) => [w.equationId, w.value])).toEqual([['alt-a-c', 100]]);
  });
  it('pre-migration prod state: the six PRIOR Σ formulas (inputSymbols null, prod UUIDs) compute via the rewrite bridge', () => {
    const prior = Object.entries(A138_07_PRIOR_FORMULAS).map(([id, formula]) => ({ id, equationNumber: id, formula, inputSymbols: null, outputSymbol: A138_07_REGISTER_FORMULAS[id].outputSymbol }));
    const { writes } = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations: prior, fields, valuesByFieldId: carrier([
      { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: '2', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
    ]) });
    expect(writes).toHaveLength(6);
    expect(writes.every((w) => w.state.kind === 'computed' && w.state.rewrite !== undefined)).toBe(true);
    const by = (s: string) => writes.find((w) => w.symbol === s)!.value!;
    expect(by('A_C')).toBeCloseTo(4826.43, 2);
    expect(by('C_m')).toBeCloseTo(0.9, 6);
    expect(by('A_E_ba')).toBeCloseTo(5362.7, 4);
    expect(by('A_E_nba')).toBe(0);
    expect(by('A_C_sealed')).toBeCloseTo(4826.43, 2);
    expect(by('A_C_unsealed')).toBe(0);
  });
  it('ignores scalar equations and equations whose output has no field on this template', () => {
    const { writes: out } = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations: [{ id: 'q', equationNumber: 'q', formula: 'q = a * 2', inputSymbols: ['a'], outputSymbol: 'q' }, equations[0]], fields: [fields[0]], valuesByFieldId: carrier([]) });
    expect(out).toEqual([]);
  });
  it('returns deduplicated register diagnostics (misconfigured derived column) for the save warnings', () => {
    const badFields = [
      { id: 'r', symbol: 'reg', dataType: 'json', unit: null, widget: 'register', uiConfig: { title: 'R', columns: [
        { key: 'a', type: 'number', label: 'a', required: true },
        { key: 't', type: 'lookup_key', label: 't', required: true, lookup: { table_code: 'TAB9' } },
        // column typo against a real table = the NON-recoverable class (register-rows.ts diagnostics)
        { key: 'd', type: 'derived', label: 'd', expr: "lookup('TAB9', t, 'nope')" },
      ] } },
      { id: 'o', symbol: 'S', dataType: 'number', unit: null },
    ];
    const rows = [{ id: '1', a: 1, t: 'schwarzdecke_asphalt' }, { id: '2', a: 2, t: 'schwarzdecke_asphalt' }];
    const res = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'X-01', equations: [{ id: 'e', equationNumber: 'e', formula: 'S = sum_rows(reg, a)', inputSymbols: ['reg'], outputSymbol: 'S' }], fields: badFields, valuesByFieldId: { r: { type: 'json', value: { rows } } } });
    expect(res.writes).toEqual([expect.objectContaining({ symbol: 'S', fieldId: 'o', value: 3 })]);
    // two rows hit the same misconfiguration → ONE diagnostic after dedupe
    expect(res.diagnostics).toEqual(['d: lookup(): Spalte nope nicht in TAB9']);
  });
});

describe('registerFieldIds', () => {
  it('lists the fields that resolve to a register config AND hold a json value', () => {
    const vals = { 'f-si': { type: 'json' as const, value: { rows: [] } }, 'f-0': { type: 'number' as const, value: 1 } };
    expect(registerFieldIds(fields, vals)).toEqual(['f-si']);
    expect(registerFieldIds(fields, {})).toEqual([]);
    expect(registerFieldIds([{ id: 'x', symbol: 'other_json', dataType: 'json' }], { x: { type: 'json', value: {} } })).toEqual([]);
  });
});

describe('parametersToFieldValues', () => {
  it('maps persisted rows to FieldValue by data type (numeric strings → numbers)', () => {
    const fs = [
      { id: 'n', dataType: 'number' }, { id: 't', dataType: 'text' }, { id: 'e', dataType: 'enum' },
      { id: 'd', dataType: 'date' }, { id: 'b', dataType: 'boolean' }, { id: 'j', dataType: 'json' }, { id: 'n2', dataType: 'number' },
    ];
    const blank = { valueNumber: null, valueText: null, valueEnum: null, valueDate: null, valueBoolean: null, valueJson: null };
    const out = parametersToFieldValues([
      { fieldId: 'n', ...blank, valueNumber: '4826.43' },
      { fieldId: 't', ...blank, valueText: 'x' },
      { fieldId: 'e', ...blank, valueEnum: 'V2' },
      { fieldId: 'd', ...blank, valueDate: '2026-09-17' },
      { fieldId: 'b', ...blank, valueBoolean: true },
      { fieldId: 'j', ...blank, valueJson: { rows: [] } },
      { fieldId: 'n2', ...blank },
      { fieldId: 'unknown', ...blank, valueText: 'ignored' },
    ], fs);
    expect(out).toEqual({
      n: { type: 'number', value: 4826.43 }, t: { type: 'text', value: 'x' }, e: { type: 'enum', value: 'V2' },
      d: { type: 'date', value: '2026-09-17' }, b: { type: 'boolean', value: true }, j: { type: 'json', value: { rows: [] } },
      n2: { type: 'number', value: null },
    });
  });
});
