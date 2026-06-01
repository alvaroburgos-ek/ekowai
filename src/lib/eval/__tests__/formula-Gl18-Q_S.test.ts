/**
 * Gl. 18 (A138-18) — Q_S Rigole Versickerungsleistung (§6.4.2).
 *
 *   Q_S = [(b_R + h_R) · L_R + b_R · h_R] · k_i
 *
 * Source L1778 verbatim: "Die Versickerungsleistung Q_S (in m³/s) der Rigole
 * ergibt sich nach GL. (18) zu …" — Q_S is m³/s, NOT l/s. The DB formula
 * intentionally omits the ×10³ factor that Gl. (4) has, because Gl. (18)'s
 * output is dimensionally m³/s.
 *
 * Pile-6 SQL adds the Q_S field on A138-18 with unit m³/s. This test:
 *   1. Reproduces the hand calc → 1.05×10⁻³ m³/s.
 *   2. Proves the per-input unit guard fires (b_R as mm, k_i as mm/s).
 *   3. Proves a downstream consumer that expects Q_S in l/s catches the
 *      m³/s value via the same arithmetic unit guard — the 1000× magnitude
 *      trap from `_OPEN-ITEMS.md` item 1 is now machine-detectable.
 */
import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from '../formula';

const GL18_ID = 'ef4242d4-d9a0-43db-b65b-685bf9c92c9c';
const GL18_FORMULA = 'Q_S = ((b_R + h_R) * L_R + b_R * h_R) * k_i';
const GL18_INPUT_SYMBOLS = ['b_R', 'h_R', 'L_R', 'k_i'] as const;

function gl18Req(inputs: EvalRequest['inputs']): EvalRequest {
  return {
    equationId: GL18_ID,
    formula: GL18_FORMULA,
    inputSymbols: [...GL18_INPUT_SYMBOLS],
    outputSymbol: 'Q_S',
    inputs,
  };
}

describe('Gl. 18 — Q_S Rigole (A138-18, m³/s)', () => {
  it('hand calc: b_R=1, h_R=1, L_R=10, k_i=5e-5 → Q_S = 1.05e-3 m³/s', () => {
    const r = evaluateFormula(
      gl18Req([
        { symbol: 'b_R', value: 1.0, unit: 'm' },
        { symbol: 'h_R', value: 1.0, unit: 'm' },
        { symbol: 'L_R', value: 10, unit: 'm' },
        { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    // ((1+1)·10 + 1·1) · 5e-5 = 21 · 5e-5 = 1.05e-3 m³/s
    expect(r.value).toBeCloseTo(1.05e-3, 9);
  });

  it('output is m³/s, NOT l/s — 1000× difference vs the Gl. (4) l/s convention', () => {
    // Same inputs as the Gl. 4 hand-calc reference, but Gl. (18) omits ×10³.
    // The numeric result here in m³/s is exactly 1000× smaller than what
    // Gl. (4) would produce for the equivalent l/s rate. This is the
    // documented "1000× trap" — the engine emits the m³/s value verbatim.
    const r = evaluateFormula(
      gl18Req([
        { symbol: 'b_R', value: 1.0, unit: 'm' },
        { symbol: 'h_R', value: 1.0, unit: 'm' },
        { symbol: 'L_R', value: 10, unit: 'm' },
        { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    // If the engineer were to (wrongly) treat r.value as l/s, they'd read
    // it as ~0.001 l/s, which is 1000× smaller than the true l/s value of
    // 1.05 l/s. The Pile-6 schema fix labels the field m³/s so the engineer
    // reads it correctly.
    expect(r.value * 1000).toBeCloseTo(1.05, 6); // m³/s · 1000 = l/s
  });

  describe('per-input unit guard', () => {
    it('b_R in mm → manual_required with unit conflict', () => {
      const r = evaluateFormula(
        gl18Req([
          { symbol: 'b_R', value: 1000, unit: 'mm' }, // wrong unit
          { symbol: 'h_R', value: 1.0, unit: 'm' },
          { symbol: 'L_R', value: 10, unit: 'm' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        ]),
      );
      expect(r.kind).toBe('manual_required');
      if (r.kind !== 'manual_required') return;
      expect(r.unitConflicts?.[0]).toEqual({
        symbol: 'b_R',
        expected: 'm',
        actual: 'mm',
      });
    });

    it('k_i in mm/s → manual_required with unit conflict', () => {
      const r = evaluateFormula(
        gl18Req([
          { symbol: 'b_R', value: 1.0, unit: 'm' },
          { symbol: 'h_R', value: 1.0, unit: 'm' },
          { symbol: 'L_R', value: 10, unit: 'm' },
          { symbol: 'k_i', value: 0.05, unit: 'mm/s' }, // wrong unit
        ]),
      );
      expect(r.kind).toBe('manual_required');
      if (r.kind !== 'manual_required') return;
      expect(r.unitConflicts?.[0]).toEqual({
        symbol: 'k_i',
        expected: 'm/s',
        actual: 'mm/s',
      });
    });
  });

  describe('downstream m³/s → l/s collision (1000× trap, machine-detected)', () => {
    /**
     * Synthetic downstream consumer: any future equation that accepts Q_S as
     * an input WITH a declared expectedUnits['Q_S'] = 'l/s' will fire the
     * unit guard when the engine feeds it Q_S in m³/s. This proves the trap
     * is now detectable end-to-end (carrier label m³/s + consumer
     * expectedUnits l/s = explicit conflict, never a silent magnitude
     * error).
     *
     * The equationId here is a non-registered UUID so the arithmetic path
     * runs unmodified — the test exercises the same unit-guard code that
     * real-equation consumers use.
     */
    const SYNTH_DOWNSTREAM_ID = '00000000-0000-0000-0000-000000000018';

    it('Q_S supplied with unit m³/s where consumer expects l/s → unit conflict', () => {
      const r = evaluateFormula({
        equationId: SYNTH_DOWNSTREAM_ID,
        formula: 'X = Q_S * 2',
        inputSymbols: ['Q_S'],
        outputSymbol: 'X',
        expectedUnits: { Q_S: 'l/s' },
        inputs: [
          { symbol: 'Q_S', value: 1.05e-3, unit: 'm³/s' }, // produced by Gl. 18
        ],
      });
      expect(r.kind).toBe('manual_required');
      if (r.kind !== 'manual_required') return;
      expect(r.unitConflicts?.[0]).toEqual({
        symbol: 'Q_S',
        expected: 'l/s',
        actual: 'm³/s',
      });
    });

    it('Q_S supplied with unit l/s where consumer expects l/s → computed (no trap when units agree)', () => {
      // Sanity counter-test: matching units → no guard fire. Proves the
      // guard isn't a blanket block — it specifically catches the m³/s↔l/s
      // mismatch.
      const r = evaluateFormula({
        equationId: SYNTH_DOWNSTREAM_ID,
        formula: 'X = Q_S * 2',
        inputSymbols: ['Q_S'],
        outputSymbol: 'X',
        expectedUnits: { Q_S: 'l/s' },
        inputs: [{ symbol: 'Q_S', value: 1.05, unit: 'l/s' }],
      });
      expect(r.kind).toBe('computed');
      if (r.kind !== 'computed') return;
      expect(r.value).toBeCloseTo(2.1, 6);
    });
  });
});
