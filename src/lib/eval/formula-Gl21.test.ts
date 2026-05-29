/**
 * A138-18 Gl. 21 — Rigole storage coefficient s_R.
 *
 *   s_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi/4) * ((d_i^2/s_F) - d_a^2))
 *
 * Acceptance gates:
 *   - π auto-injects into the eval scope (via the equation profile).
 *   - Concrete-inputs hand calc matches s_R ≈ 0.317 166 (see
 *     audit-reports/DWA-A-138-1/_eval-reference-Gl21.md).
 *   - Equation-profile expected units beat caller-supplied units, so a
 *     drift between a field's stored unit and §6.4.2's required `m`
 *     surfaces as a unit_conflict, never a silent 10⁶× wrong number.
 */
import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from './formula';

const GL21_ID = '069c2b02-8883-48a4-82ce-b21c9ef1fff8';
const GL21_FORMULA =
  's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi/4) * ((d_i^2/s_F) - d_a^2))';
const GL21_INPUT_SYMBOLS = ['s_F', 'b_R', 'h_R', 'az', 'd_i', 'd_a'];

function req(
  overrides: { inputs?: EvalRequest['inputs']; expectedUnits?: Record<string, string | null> } = {},
): EvalRequest {
  return {
    equationId: GL21_ID,
    formula: GL21_FORMULA,
    inputSymbols: GL21_INPUT_SYMBOLS,
    outputSymbol: 's_R',
    expectedUnits: overrides.expectedUnits,
    inputs:
      overrides.inputs ?? [
        { symbol: 's_F', value: 0.3, unit: null },
        { symbol: 'b_R', value: 1.0, unit: 'm' },
        { symbol: 'h_R', value: 1.0, unit: 'm' },
        { symbol: 'az', value: 1, unit: null },
        { symbol: 'd_i', value: 0.184, unit: 'm' },
        { symbol: 'd_a', value: 0.2, unit: 'm' },
      ],
  };
}

describe('A138-18 Gl. 21 — Rigole s_R', () => {
  it('reproduces the hand-calc reference s_R ≈ 0.317 166', () => {
    const r = evaluateFormula(req());
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    // exact: 0.30 * (1 + π/4 * ((0.184² / 0.3) - 0.04))
    const expected = 0.3 * (1 + (Math.PI / 4) * ((0.184 * 0.184) / 0.3 - 0.04));
    expect(r.value).toBeCloseTo(expected, 12);
    expect(r.value).toBeCloseTo(0.317166, 5);
  });

  it('writes the field inputs (not `pi`) into the substituted map — constants stay opaque', () => {
    const r = evaluateFormula(req());
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(Object.keys(r.substituted).sort()).toEqual(
      ['az', 'b_R', 'd_a', 'd_i', 'h_R', 's_F'].sort(),
    );
    expect(r.substituted).not.toHaveProperty('pi');
  });

  it('handles nested fractions, squared terms, and (pi/4) — the in-tree evaluator is enough', () => {
    // Doubling d_i should not blow the formula up — exercises both d_i^2 and the
    // (1/s_F) propagation through the bracket.
    const r = evaluateFormula(
      req({
        inputs: [
          { symbol: 's_F', value: 0.3, unit: null },
          { symbol: 'b_R', value: 1.0, unit: 'm' },
          { symbol: 'h_R', value: 1.0, unit: 'm' },
          { symbol: 'az', value: 2, unit: null },
          { symbol: 'd_i', value: 0.2, unit: 'm' },
          { symbol: 'd_a', value: 0.22, unit: 'm' },
        ],
      }),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    // exact: 0.3 * (1 + 2 * π/4 * (0.04/0.3 - 0.0484))
    const expected = 0.3 * (1 + 2 * (Math.PI / 4) * (0.04 / 0.3 - 0.0484));
    expect(r.value).toBeCloseTo(expected, 12);
  });

  it('THE 1000× unit-error guard: d_i with unit "mm" → manual_required, NO number', () => {
    const r = evaluateFormula(
      req({
        inputs: [
          { symbol: 's_F', value: 0.3, unit: null },
          { symbol: 'b_R', value: 1.0, unit: 'm' },
          { symbol: 'h_R', value: 1.0, unit: 'm' },
          { symbol: 'az', value: 1, unit: null },
          { symbol: 'd_i', value: 184, unit: 'mm' }, // wrong unit, would 10^6× wrong
          { symbol: 'd_a', value: 0.2, unit: 'm' },
        ],
      }),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts).toEqual([
      { symbol: 'd_i', expected: 'm', actual: 'mm' },
    ]);
    expect((r as { value?: number }).value).toBeUndefined();
  });

  it('also flags d_a unit drift (both d_a and d_i protected by the §6.4.2 override)', () => {
    const r = evaluateFormula(
      req({
        inputs: [
          { symbol: 's_F', value: 0.3, unit: null },
          { symbol: 'b_R', value: 1.0, unit: 'm' },
          { symbol: 'h_R', value: 1.0, unit: 'm' },
          { symbol: 'az', value: 1, unit: null },
          { symbol: 'd_i', value: 0.184, unit: 'm' },
          { symbol: 'd_a', value: 200, unit: 'mm' },
        ],
      }),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts).toEqual([
      { symbol: 'd_a', expected: 'm', actual: 'mm' },
    ]);
  });

  it('flags both d_i AND d_a if both drift', () => {
    const r = evaluateFormula(
      req({
        inputs: [
          { symbol: 's_F', value: 0.3, unit: null },
          { symbol: 'b_R', value: 1.0, unit: 'm' },
          { symbol: 'h_R', value: 1.0, unit: 'm' },
          { symbol: 'az', value: 1, unit: null },
          { symbol: 'd_i', value: 184, unit: 'mm' },
          { symbol: 'd_a', value: 200, unit: 'mm' },
        ],
      }),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts).toHaveLength(2);
    expect(r.unitConflicts?.map((u) => u.symbol).sort()).toEqual(['d_a', 'd_i']);
  });

  it('manual_required when a required input is null', () => {
    const r = evaluateFormula(
      req({
        inputs: [
          { symbol: 's_F', value: 0.3, unit: null },
          { symbol: 'b_R', value: null, unit: 'm' },
          { symbol: 'h_R', value: 1.0, unit: 'm' },
          { symbol: 'az', value: 1, unit: null },
          { symbol: 'd_i', value: 0.184, unit: 'm' },
          { symbol: 'd_a', value: 0.2, unit: 'm' },
        ],
      }),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.missing).toEqual(['b_R']);
  });

  it('a field reporting unit=null (dimensionless) for s_F is OK — profile says null too', () => {
    // s_F is dimensionless; some upstream code may report unit '' or null.
    const r = evaluateFormula(
      req({
        inputs: [
          { symbol: 's_F', value: 0.3, unit: '' }, // empty string vs null
          { symbol: 'b_R', value: 1.0, unit: 'm' },
          { symbol: 'h_R', value: 1.0, unit: 'm' },
          { symbol: 'az', value: 1, unit: null },
          { symbol: 'd_i', value: 0.184, unit: 'm' },
          { symbol: 'd_a', value: 0.2, unit: 'm' },
        ],
      }),
    );
    expect(r.kind).toBe('computed');
  });
});
