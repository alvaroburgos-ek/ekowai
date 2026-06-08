import { describe, it, expect } from 'vitest';
import { evaluateFormula } from './formula';

// Pile-14: A138-10's A_C is now a FLAT passthrough `A_C = A_C_preliminary`
// evaluated by the arithmetic engine — the local sub_areas_A138_10 recompute
// aggregator (`a138_10_gl2`) has been retired. The single-source split lives
// in the surface_inventory-backed ΣSealed/ΣUnsealed/C_m aggregators (see
// __tests__/formula-A138-10-inventory.test.ts).
const a138_10_gl2_id = '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3';

describe('evaluateFormula — A138-10 A_C flat passthrough (Pile-14)', () => {
  it('A_C = A_C_preliminary — passes the upstream value straight through', () => {
    const r = evaluateFormula({
      equationId: a138_10_gl2_id,
      formula: 'A_C = A_C_preliminary',
      inputSymbols: ['A_C_preliminary'],
      outputSymbol: 'A_C',
      inputs: [{ symbol: 'A_C_preliminary', value: 4826.43, unit: 'm²' }],
    });
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(4826.43, 6);
  });

  it('manual_required when A_C_preliminary is missing — NOT an aggregator anymore', () => {
    const r = evaluateFormula({
      equationId: a138_10_gl2_id,
      formula: 'A_C = A_C_preliminary',
      inputSymbols: ['A_C_preliminary'],
      outputSymbol: 'A_C',
      inputs: [],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.missing).toEqual(['A_C_preliminary']);
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
