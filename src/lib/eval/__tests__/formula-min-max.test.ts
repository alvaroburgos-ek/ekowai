/**
 * Tests for min() / max() support in evaluateFormula (Task 1 of feat/a138-10-auto-qzu).
 *
 * DWA-A 138-1 Gl.6:  f_K = f_Ort · f_Methode ≤ 1
 * The product can exceed 1, so the engine must faithfully cap it:
 *   f_K = min(f_Ort * f_Methode, 1)
 *
 * Contract:
 *   - min(a, b) and max(a, b) evaluate via Math.min / Math.max
 *   - Nested arithmetic inside the args is fully supported
 *   - Unsupported function names (SUM, foo, …) still throw / yield
 *     manual_required or error — the rejection is NOT relaxed
 *   - Plain arithmetic without any function call is unchanged (sanity)
 */

import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from '../formula';

// Stable placeholder equation ID (no profile / aggregator registered for it).
const EQ_ID = '00000000-0000-0000-0000-000000000001';

function req(
  formula: string,
  inputSymbols: string[],
  inputs: EvalRequest['inputs'],
): EvalRequest {
  return {
    equationId: EQ_ID,
    formula,
    inputSymbols,
    outputSymbol: 'x',
    inputs,
  };
}

// ---------------------------------------------------------------------------
// min()
// ---------------------------------------------------------------------------

describe('min(expr, expr)', () => {
  it('cap not binding: min(a * b, 1) with a=0.3, b=0.1 → 0.03', () => {
    const r = evaluateFormula(
      req('x = min(a * b, 1)', ['a', 'b'], [
        { symbol: 'a', value: 0.3, unit: null },
        { symbol: 'b', value: 0.1, unit: null },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(0.03, 10);
  });

  it('cap binding: min(a * b, 1) with a=2, b=1 → 1 (clamps)', () => {
    const r = evaluateFormula(
      req('x = min(a * b, 1)', ['a', 'b'], [
        { symbol: 'a', value: 2, unit: null },
        { symbol: 'b', value: 1, unit: null },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBe(1);
  });

  it('whitespace variants: min( a * b , 1 ) still evaluates', () => {
    const r = evaluateFormula(
      req('x = min( a * b , 1 )', ['a', 'b'], [
        { symbol: 'a', value: 0.5, unit: null },
        { symbol: 'b', value: 0.5, unit: null },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(0.25, 10);
  });

  it('literal as first arg: min(1, a) with a=0.7 → 0.7', () => {
    const r = evaluateFormula(
      req('x = min(1, a)', ['a'], [
        { symbol: 'a', value: 0.7, unit: null },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(0.7, 10);
  });
});

// ---------------------------------------------------------------------------
// max()
// ---------------------------------------------------------------------------

describe('max(expr, expr)', () => {
  it('max(a, b) with a=0.3, b=0.7 → 0.7', () => {
    const r = evaluateFormula(
      req('x = max(a, b)', ['a', 'b'], [
        { symbol: 'a', value: 0.3, unit: null },
        { symbol: 'b', value: 0.7, unit: null },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(0.7, 10);
  });

  it('max(a * 2, b) with a=1, b=0.5 → 2', () => {
    const r = evaluateFormula(
      req('x = max(a * 2, b)', ['a', 'b'], [
        { symbol: 'a', value: 1, unit: null },
        { symbol: 'b', value: 0.5, unit: null },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Unsupported functions still throw / yield non-computed state
// ---------------------------------------------------------------------------

describe('unsupported function calls are still rejected', () => {
  it('SUM(a, b) yields manual_required or error (NOT computed)', () => {
    const r = evaluateFormula(
      req('x = SUM(a, b)', ['a', 'b'], [
        { symbol: 'a', value: 1, unit: null },
        { symbol: 'b', value: 2, unit: null },
      ]),
    );
    expect(r.kind).not.toBe('computed');
    // The engine maps "Funktionsaufruf" errors to manual_required
    expect(['manual_required', 'error']).toContain(r.kind);
  });

  it('foo(a) yields manual_required or error (NOT computed)', () => {
    const r = evaluateFormula(
      req('x = foo(a)', ['a'], [
        { symbol: 'a', value: 42, unit: null },
      ]),
    );
    expect(r.kind).not.toBe('computed');
    expect(['manual_required', 'error']).toContain(r.kind);
  });

  it('SQRT(a) yields manual_required or error (NOT computed)', () => {
    const r = evaluateFormula(
      req('x = SQRT(a)', ['a'], [
        { symbol: 'a', value: 4, unit: null },
      ]),
    );
    expect(r.kind).not.toBe('computed');
    expect(['manual_required', 'error']).toContain(r.kind);
  });
});

// ---------------------------------------------------------------------------
// Sanity: plain arithmetic without any function call is unchanged
// ---------------------------------------------------------------------------

describe('plain arithmetic (no function) is unaffected', () => {
  it('x = a * b + c evaluates as before', () => {
    const r = evaluateFormula(
      req('x = a * b + c', ['a', 'b', 'c'], [
        { symbol: 'a', value: 2, unit: null },
        { symbol: 'b', value: 3, unit: null },
        { symbol: 'c', value: 1, unit: null },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBe(7);
  });

  it('x = a ^ 2 evaluates power correctly', () => {
    const r = evaluateFormula(
      req('x = a ^ 2', ['a'], [
        { symbol: 'a', value: 5, unit: null },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBe(25);
  });

  it('missing input still yields manual_required (no function involved)', () => {
    const r = evaluateFormula(
      req('x = a * b', ['a', 'b'], [
        { symbol: 'a', value: 1, unit: null },
        // b intentionally missing
      ]),
    );
    expect(r.kind).toBe('manual_required');
  });
});
