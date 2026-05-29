import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from './formula';
import type { SubArea } from './aggregators';

const a138_10_gl2_id = '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3';

function gl2Req(rows: SubArea[]): EvalRequest {
  return {
    equationId: a138_10_gl2_id,
    formula: 'A_C = SUM(A_E_b_a_i * C_i) + SUM(A_E_nb_a_i * C_i)',
    inputSymbols: ['A_E_b_a_i', 'A_E_nb_a_i', 'C_i'],
    outputSymbol: 'A_C',
    inputs: [],
    aggregator: { subAreas: { rows } },
  };
}

describe('evaluateFormula — A138-10 Gl. 2 (iteration 2: per-sub-area)', () => {
  it('uniform C — reproduces hand calc 510 m²', () => {
    const r = evaluateFormula(
      gl2Req([
        { id: '1', label: 'Carpark A', kind: 'paved', area_m2: 300, c: 0.85 },
        { id: '2', label: 'Carpark B', kind: 'paved', area_m2: 200, c: 0.85 },
        { id: '3', label: 'Verge', kind: 'unpaved', area_m2: 100, c: 0.85 },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(510, 6);
    expect(r.substituted['Σ befestigt']).toBeCloseTo(425, 6);
    expect(r.substituted['Σ unbefestigt']).toBeCloseTo(85, 6);
  });

  it('mixed C — reproduces hand calc 690 m² (the acceptance gate)', () => {
    const r = evaluateFormula(
      gl2Req([
        { id: '1', label: 'Steildach', kind: 'paved', area_m2: 400, c: 0.9 },
        { id: '2', label: 'Pflaster Hof', kind: 'paved', area_m2: 300, c: 0.8 },
        { id: '3', label: 'Kies 5-10 %', kind: 'paved', area_m2: 100, c: 0.5 },
        { id: '4', label: 'Rasen', kind: 'unpaved', area_m2: 200, c: 0.2 },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(690, 6);
    expect(r.substituted['Σ befestigt']).toBeCloseTo(650, 6);
    expect(r.substituted['Σ unbefestigt']).toBeCloseTo(40, 6);
    // The four per-row contributions must each appear in the substituted map.
    const contribKeys = Object.keys(r.substituted).filter((k) => k.includes('·'));
    expect(contribKeys).toHaveLength(4);
  });

  it('mixed C — differs from naive total · 0.733 ≈ 733', () => {
    const r = evaluateFormula(
      gl2Req([
        { id: '1', label: 'Steildach', kind: 'paved', area_m2: 400, c: 0.9 },
        { id: '2', label: 'Pflaster', kind: 'paved', area_m2: 300, c: 0.8 },
        { id: '3', label: 'Kies', kind: 'paved', area_m2: 100, c: 0.5 },
        { id: '4', label: 'Rasen', kind: 'unpaved', area_m2: 200, c: 0.2 },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    const totalsTimesArithmeticMean = 1000 * ((0.9 + 0.8 + 0.5) / 3);
    expect(Math.abs(r.value - totalsTimesArithmeticMean)).toBeGreaterThan(40);
    expect(r.value).toBeLessThan(totalsTimesArithmeticMean); // 690 < 733
  });

  it('manual_required when a row is missing its coefficient — NEVER a partial sum', () => {
    const r = evaluateFormula(
      gl2Req([
        { id: '1', label: 'Steildach', kind: 'paved', area_m2: 400, c: 0.9 },
        { id: '2', label: 'Pflaster', kind: 'paved', area_m2: 300, c: null },
        { id: '3', label: 'Rasen', kind: 'unpaved', area_m2: 200, c: 0.2 },
      ]),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.reason).toMatch(/Pflaster/);
    // Critical: must NOT carry a `value` field
    expect((r as { value?: number }).value).toBeUndefined();
  });

  it('manual_required when carrier is empty', () => {
    const r = evaluateFormula(gl2Req([]));
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.reason).toMatch(/mindestens eine Zeile/);
  });

  it('manual_required when no carrier is supplied at all', () => {
    const r = evaluateFormula({
      equationId: a138_10_gl2_id,
      formula: 'A_C = SUM(A_E_b_a_i * C_i) + SUM(A_E_nb_a_i * C_i)',
      inputSymbols: ['A_E_b_a_i', 'A_E_nb_a_i', 'C_i'],
      outputSymbol: 'A_C',
      inputs: [],
    });
    expect(r.kind).toBe('manual_required');
  });
});

describe('evaluateFormula — non-aggregator, non-rewrite paths still work', () => {
  it('computes a plain numeric formula via the arithmetic evaluator', () => {
    const r = evaluateFormula({
      equationId: 'no-aggregator',
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

  it('returns manual_required when an arithmetic input is missing', () => {
    const r = evaluateFormula({
      equationId: 'no-aggregator',
      formula: 'X = a + b',
      inputSymbols: ['a', 'b'],
      outputSymbol: 'X',
      inputs: [{ symbol: 'a', value: 2, unit: null }],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.missing).toEqual(['b']);
  });

  it('returns manual_required on a unit conflict — never a number', () => {
    const r = evaluateFormula({
      equationId: 'no-aggregator',
      formula: 'X = a + b',
      inputSymbols: ['a', 'b'],
      outputSymbol: 'X',
      expectedUnits: { a: 'm²', b: 'm²' },
      inputs: [
        { symbol: 'a', value: 1, unit: 'ha' },
        { symbol: 'b', value: 2, unit: 'm²' },
      ],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts).toEqual([{ symbol: 'a', expected: 'm²', actual: 'ha' }]);
    expect((r as { value?: number }).value).toBeUndefined();
  });

  it('returns error on a malformed formula', () => {
    const r = evaluateFormula({
      equationId: 'no-aggregator',
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
