// src/lib/eval/__tests__/evaluate-for-report-registers.test.ts
// Plan 2a Task 7: the PDF/report evaluator builds registers generically from json fields.
import { describe, it, expect } from 'vitest';
import { evaluateWorksheetEquations } from '../evaluate-for-report';
import { A138_07_REGISTER_FORMULAS } from '../rewrites';

describe('evaluateWorksheetEquations — register-fed equations on the PDF path', () => {
  it('computes the six A138-07 outputs from the persisted surface_inventory json', () => {
    const fields = [
      { id: 'f-si', symbol: 'surface_inventory', unit: null, dataType: 'json' },
      ...Object.values(A138_07_REGISTER_FORMULAS).map((r, i) => ({ id: `f-${i}`, symbol: r.outputSymbol, unit: null, dataType: 'number' })),
    ];
    const parameters = [{ fieldId: 'f-si', valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: { rows: [
      { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
    ] } }];
    const equations = Object.entries(A138_07_REGISTER_FORMULAS).map(([id, r]) => ({ id, equationNumber: r.outputSymbol, formula: r.formula, inputSymbols: ['surface_inventory'], outputSymbol: r.outputSymbol, outputUnit: null }));
    const out = evaluateWorksheetEquations('A138-07', equations, fields, parameters, { standardCode: 'DWA-A-138-1' });
    const by = (s: string) => out.find((r) => r.outputSymbol === s)!.state as { kind: string; value?: number; rewrite?: unknown };
    expect(by('A_C').kind).toBe('computed');
    expect(by('A_C').value).toBeCloseTo(4826.43, 2);
    expect(by('A_C').rewrite).toBeUndefined(); // migrated text ⇒ no bridge badge
    expect(by('C_m').value).toBeCloseTo(0.9, 6);
    expect(by('A_E_ba').value).toBeCloseTo(5362.7, 4);
    expect(by('A_E_nba').value).toBe(0);
    expect(by('A_C_sealed').value).toBeCloseTo(4826.43, 2);
    expect(by('A_C_unsealed').value).toBe(0);
  });
  it('a DB-configured register derived column may reference a worksheet symbol through ctx.symbol (G-13)', () => {
    // widget='register' + ui_config is authoritative (no TS fallback involved); the derived column `w`
    // multiplies the row cell by the worksheet number `EZ`, which reaches the row scope via ctx.symbol.
    const fields = [
      { id: 'r', symbol: 'flaechen', unit: null, dataType: 'json', widget: 'register', uiConfig: { title: 'Flächen', columns: [
        { key: 'a', type: 'number', label: 'A', required: true },
        { key: 'w', type: 'derived', label: 'A·EZ', expr: 'a * EZ' },
      ] } },
      { id: 'ez', symbol: 'EZ', unit: null, dataType: 'number' },
      { id: 'o', symbol: 'S', unit: null, dataType: 'number' },
    ];
    const parameters = [
      { fieldId: 'r', valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: { rows: [{ id: '1', a: 10 }, { id: '2', a: 5 }] } },
      { fieldId: 'ez', valueNumber: 2, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
    ];
    const equations = [{ id: 'eq-s', equationNumber: 's', formula: 'S = sum_rows(flaechen, w)', inputSymbols: ['flaechen'], outputSymbol: 'S', outputUnit: null }];
    const out = evaluateWorksheetEquations('X-01', equations, fields, parameters, { standardCode: 'X' });
    expect(out.find((r) => r.outputSymbol === 'S')?.state).toMatchObject({ kind: 'computed', value: 30 });
    // EZ missing ⇒ the derived cell is null ⇒ the sum has no numeric operand ⇒ manual_required, never 0
    const noEz = evaluateWorksheetEquations('X-01', equations, fields, [parameters[0]], { standardCode: 'X' });
    expect(noEz[0].state.kind).toBe('manual_required');
  });
  it('VSME-B04.100 gets its fallback equations without the caller asking', () => {
    const fields = [{ id: 'p', symbol: 'pollutant_register', unit: null, dataType: 'json' }, { id: 'a', symbol: 'AmountOfEmissionToAir', unit: 't', dataType: 'number' }];
    const parameters = [{ fieldId: 'p', valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: { not_applicable: true, rows: [] } }];
    const out = evaluateWorksheetEquations('VSME-B04.100', [], fields, parameters, { standardCode: 'VSME' });
    expect(out.find((r) => r.outputSymbol === 'AmountOfEmissionToAir')?.state).toMatchObject({ kind: 'computed', value: 0 });
  });
  it('without a standardCode the A138 seed tables still resolve by table code (snapshot/test callers)', () => {
    const fields = [
      { id: 'f-si', symbol: 'surface_inventory', unit: null, dataType: 'json' },
      { id: 'f-ba', symbol: 'A_E_ba', unit: null, dataType: 'number' },
    ];
    const parameters = [{ fieldId: 'f-si', valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: { rows: [
      { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
    ] } }];
    const id = 'a1380702-0000-4000-8000-000000000003';
    const out = evaluateWorksheetEquations('A138-07', [{ id, equationNumber: '2d', formula: A138_07_REGISTER_FORMULAS[id].formula, inputSymbols: ['surface_inventory'], outputSymbol: 'A_E_ba', outputUnit: null }], fields, parameters);
    expect(out[0].state).toMatchObject({ kind: 'computed', value: 100 });
  });
});
