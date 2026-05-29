import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from './formula';

const a138_10_gl2_id = '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3';

function gl2Req(overrides: Partial<EvalRequest> = {}): EvalRequest {
  return {
    equationId: a138_10_gl2_id,
    formula: 'A_C = SUM(A_E_b_a_i * C_i) + SUM(A_E_nb_a_i * C_i)',
    inputSymbols: ['A_E_b_a_i', 'A_E_nb_a_i', 'C_i'],
    outputSymbol: 'A_C',
    expectedUnits: {
      A_E_b_a_total: 'm²',
      A_E_nb_a_total: 'm²',
      C_m: null,
    },
    inputs: [
      { symbol: 'A_E_b_a_total', value: 700, unit: 'm²' },
      { symbol: 'A_E_nb_a_total', value: 100, unit: 'm²' },
      { symbol: 'C_m', value: 0.7875, unit: null },
    ],
    ...overrides,
  };
}

describe('evaluateFormula — A138-10 Gl. 2 (acceptance)', () => {
  it('computes A_C = 630 m² from the hand-calc reference inputs', () => {
    const r = evaluateFormula(gl2Req());
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(630, 6);
    expect(r.substituted).toEqual({
      A_E_b_a_total: 700,
      A_E_nb_a_total: 100,
      C_m: 0.7875,
    });
    expect(r.formulaEvaluated).toBe('A_E_b_a_total * C_m + A_E_nb_a_total * C_m');
    expect(r.rewrite?.from).toContain('SUM(');
    expect(r.rewrite?.to).toBe('A_E_b_a_total * C_m + A_E_nb_a_total * C_m');
  });

  it('returns manual_required with missing when an input is null', () => {
    const r = evaluateFormula(
      gl2Req({
        inputs: [
          { symbol: 'A_E_b_a_total', value: 700, unit: 'm²' },
          { symbol: 'A_E_nb_a_total', value: 100, unit: 'm²' },
          { symbol: 'C_m', value: null, unit: null },
        ],
      }),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.missing).toEqual(['C_m']);
  });

  it('returns manual_required on a unit conflict, NEVER a number', () => {
    const r = evaluateFormula(
      gl2Req({
        inputs: [
          // wrong unit on A_E_b_a_total → expected m² but resolved as 'ha'
          { symbol: 'A_E_b_a_total', value: 0.07, unit: 'ha' },
          { symbol: 'A_E_nb_a_total', value: 100, unit: 'm²' },
          { symbol: 'C_m', value: 0.7875, unit: null },
        ],
      }),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts).toEqual([
      { symbol: 'A_E_b_a_total', expected: 'm²', actual: 'ha' },
    ]);
    // critical: must NOT carry a computed value field
    expect((r as { value?: number }).value).toBeUndefined();
  });

  it('returns manual_required with missing for an unmapped equation when input is absent', () => {
    const r = evaluateFormula({
      equationId: 'no-rewrite-registered',
      formula: 'X = a + b',
      inputSymbols: ['a', 'b'],
      outputSymbol: 'X',
      inputs: [{ symbol: 'a', value: 2, unit: null }],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.missing).toEqual(['b']);
  });

  it('computes a plain formula via mathjs when no rewrite is registered', () => {
    const r = evaluateFormula({
      equationId: 'no-rewrite-registered',
      formula: 'X = a * b + 5',
      inputSymbols: ['a', 'b'],
      outputSymbol: 'X',
      inputs: [
        { symbol: 'a', value: 3, unit: null },
        { symbol: 'b', value: 4, unit: null },
      ],
    });
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBe(17);
  });

  it('returns error on a malformed formula', () => {
    const r = evaluateFormula({
      equationId: 'no-rewrite-registered',
      formula: 'X = a +* b',
      inputSymbols: ['a', 'b'],
      outputSymbol: 'X',
      inputs: [
        { symbol: 'a', value: 1, unit: null },
        { symbol: 'b', value: 2, unit: null },
      ],
    });
    expect(r.kind).toBe('error');
  });
});
