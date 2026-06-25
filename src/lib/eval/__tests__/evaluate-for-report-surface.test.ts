import { describe, it, expect } from 'vitest';
import { evaluateWorksheetEquations } from '../evaluate-for-report';
import type { ReportField, ReportParameter, ReportEquation } from '../evaluate-for-report';

// Minimal A138-07 inputs: the surface_inventory json param + the A_C equation.
const fields: ReportField[] = [
  { id: 'f-si', symbol: 'surface_inventory', unit: null, dataType: 'json' },
  { id: 'f-ac', symbol: 'A_C', unit: 'm²', dataType: 'number' },
];

const parameters: ReportParameter[] = [
  {
    fieldId: 'f-si',
    valueNumber: null,
    valueText: null,
    valueEnum: null,
    valueBoolean: null,
    valueDate: null,
    valueJson: {
      rows: [
        { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
      ],
    },
  },
];

const equations: ReportEquation[] = [
  {
    id: 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0',
    equationNumber: '2',
    formula: 'A_C = Σ(A_i · c_i)',
    inputSymbols: ['surface_inventory'],
    outputSymbol: 'A_C',
    outputUnit: 'm²',
  },
];

describe('evaluate-for-report — A138-07 surface producer', () => {
  it('computes A_C from the surface_inventory carrier (report path)', () => {
    const res = evaluateWorksheetEquations('A138-07', equations, fields, parameters);
    const ac = res.find((r) => r.equationId === 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0');
    expect(ac?.state.kind).toBe('computed');
    if (ac?.state.kind === 'computed') expect(ac.state.value).toBeCloseTo(4826.43, 2);
  });
});
