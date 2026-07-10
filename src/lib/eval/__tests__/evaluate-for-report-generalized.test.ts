/**
 * Engine-generalization (Layer 0) — server report path.
 *
 * Proves evaluateWorksheetEquations (the function the PDF/report loader calls)
 * now evaluates an ARBITRARY non-138 arithmetic equation server-side, where the
 * old 138-only whitelist would have dropped it — and still skips a deny-listed
 * equation.
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateWorksheetEquations,
  type ReportField,
  type ReportEquation,
  type ReportParameter,
} from '../evaluate-for-report';

const FIELDS: ReportField[] = [
  { id: 'f-A', symbol: 'A_grund', unit: 'm²', dataType: 'number' },
  { id: 'f-h', symbol: 'h_nutz', unit: 'm', dataType: 'number' },
  { id: 'f-V', symbol: 'V_speicher', unit: 'm³', dataType: 'number' },
];
const PARAMS: ReportParameter[] = [
  { fieldId: 'f-A', valueNumber: 2, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-h', valueNumber: 3, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
];

describe('evaluate-for-report — generalized routing (Layer 0)', () => {
  it('evaluates an arbitrary non-138 arithmetic equation server-side', () => {
    const eqs: ReportEquation[] = [
      {
        id: 'din-test-volume',
        equationNumber: 'KG1-01',
        formula: 'V_speicher = A_grund * h_nutz',
        inputSymbols: ['A_grund', 'h_nutz'],
        outputSymbol: 'V_speicher',
        outputUnit: 'm³',
      },
    ];
    const out = evaluateWorksheetEquations('DIN-276-09', eqs, FIELDS, PARAMS);
    expect(out).toHaveLength(1);
    expect(out[0].state.kind).toBe('computed');
    if (out[0].state.kind === 'computed') {
      expect(out[0].state.value).toBeCloseTo(6, 9);
    }
  });

  it('skips a deny-listed equation (A138-18:18) — no result emitted', () => {
    const eqs: ReportEquation[] = [
      {
        id: 'deny-a138-18-18',
        equationNumber: '18',
        formula: 'Q_S = k_i * A_S_m',
        inputSymbols: ['k_i', 'A_S_m'],
        outputSymbol: 'Q_S',
        outputUnit: 'l/s',
      },
    ];
    const out = evaluateWorksheetEquations('A138-18', eqs, FIELDS, PARAMS);
    expect(out).toHaveLength(0);
  });
});
