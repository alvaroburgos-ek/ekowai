/**
 * A138-10 · Gl. (3) · §5.3.3.5 — Q_zu = r_D(n) · (A_C + A_VA) · 10⁻⁴
 *
 * Regression for the legacy-summier bug: before this equation was moved onto
 * the formula engine it fell through to the naive sum-evaluator in
 * worksheet-form.tsx, which ignored the formula and SUMMED whatever input
 * symbols happened to be present in the store. With only A_C populated
 * (4826.43 m², computed for display) and both r_D(n) and A_VA blank, the
 * legacy path returned Q_zu = A_C = 4826.43 — an m² area mislabelled as an
 * l/s flow.
 *
 * The three-state contract this proves:
 *   - all three inputs present → computed = r_D_n·(A_C+A_VA)·1e-4
 *   - A_VA missing             → manual_required (NOT a partial number)
 *   - r_D(n) missing (the exact production bug) → manual_required, and
 *     explicitly NOT 4826.43
 */
import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from '../formula';

const GL3_ID = 'b39dda00-9a90-46cc-a045-543047ec6498';
const FORMULA = 'Q_zu = r_D(n) * (A_C + A_VA) * 10^-4';
// raw DB input_symbols (pre-normalisation): { r_D(n), A_C, A_VA }
const INPUT_SYMBOLS = ['r_D(n)', 'A_C', 'A_VA'];

function req(inputs: EvalRequest['inputs']): EvalRequest {
  return {
    equationId: GL3_ID,
    formula: FORMULA,
    inputSymbols: INPUT_SYMBOLS,
    outputSymbol: 'Q_zu',
    inputs,
  };
}

describe('Gl. 3 — Q_zu = r_D(n) · (A_C + A_VA) · 10⁻⁴', () => {
  it('hand calc: r_D_n=100, A_C=4826.43, A_VA=0 → Q_zu = 48.2643 l/s', () => {
    const r = evaluateFormula(
      req([
        { symbol: 'r_D_n', value: 100, unit: 'l/(s·ha)' },
        { symbol: 'A_C', value: 4826.43, unit: 'm²' },
        { symbol: 'A_VA', value: 0, unit: 'm²' },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(100 * (4826.43 + 0) * 1e-4, 9);
    expect(r.value).toBeCloseTo(48.2643, 9);
  });

  it('hand calc with A_VA > 0: r_D_n=120, A_C=1000, A_VA=500 → 18 l/s', () => {
    const r = evaluateFormula(
      req([
        { symbol: 'r_D_n', value: 120, unit: 'l/(s·ha)' },
        { symbol: 'A_C', value: 1000, unit: 'm²' },
        { symbol: 'A_VA', value: 500, unit: 'm²' },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(18, 9);
  });

  it('A_VA missing → manual_required, NOT a partial number', () => {
    const r = evaluateFormula(
      req([
        { symbol: 'r_D_n', value: 100, unit: 'l/(s·ha)' },
        { symbol: 'A_C', value: 4826.43, unit: 'm²' },
      ]),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.missing).toContain('A_VA');
    expect((r as { value?: number }).value).toBeUndefined();
  });

  it('r_D(n) missing — the exact production bug (only A_C present) → manual_required, NOT 4826.43', () => {
    const r = evaluateFormula(
      req([
        // A_C is the computed display value that the legacy summer wrongly
        // returned as Q_zu. r_D(n) and A_VA are blank.
        { symbol: 'A_C', value: 4826.43, unit: 'm²' },
      ]),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    // both r_D_n and A_VA are missing
    expect(r.missing).toContain('r_D_n');
    expect(r.missing).toContain('A_VA');
    // crucial: the engine must NOT have produced the A_C value (4826.43)
    expect((r as { value?: number }).value).toBeUndefined();
    expect((r as { value?: number }).value).not.toBe(4826.43);
  });

  it('source-formatted r_D(n) normalises and evaluates (no "function-call" error)', () => {
    const r = evaluateFormula(
      req([
        { symbol: 'r_D_n', value: 100, unit: 'l/(s·ha)' },
        { symbol: 'A_C', value: 1000, unit: 'm²' },
        { symbol: 'A_VA', value: 0, unit: 'm²' },
      ]),
    );
    expect(r.kind).toBe('computed');
  });
});
