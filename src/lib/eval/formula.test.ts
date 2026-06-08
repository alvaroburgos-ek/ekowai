import { describe, it, expect } from 'vitest';
import { evaluateFormula } from './formula';

// Pile-14 (corrected): A138-10's A_C (eq 1a48af79) recomputes from the
// inherited `surface_inventory` carrier — the SAME carrier + helper
// A138-07's A_C_preliminary uses — NOT a flat passthrough of the
// A_C_preliminary scalar (that scalar is never materialised in
// project_parameters, so a passthrough resolved to null). The aggregator
// behaviour is covered in __tests__/formula-A138-10-inventory.test.ts; the
// retired local sub_areas_A138_10 recompute (`a138_10_gl2`) stays retired.

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
