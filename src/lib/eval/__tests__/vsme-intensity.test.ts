/**
 * Tests for the 4 hand-authored VSME-B03.300 GHG-intensity equations
 * (VSME para 31, Task 5 of feat/vsme-gate-repair).
 *
 * Source (rendered PDF, printed p.9, verbatim): "31. The undertaking shall
 * disclose its GHG intensity calculated by dividing 'gross greenhouse gas
 * (GHG) emissions' disclosed under paragraph 30 by 'turnover (in Euro)'
 * disclosed under paragraph 24(e)(iv)." — unit-guarded division: each
 * dividend (a B03.200 GHG total, tCO2eq) ÷ Turnover (B01.000, EUR) →
 * output unit tCO2eq/EUR.
 *
 * The equation ids used here ('VSME-EQ-11'..'VSME-EQ-14') are the SAME
 * placeholder keys registered in equation-profiles.ts (see that file's
 * VSME header note) — this test exercises the real evaluateFormula +
 * equationProfiles lookup path, not a synthetic stand-in.
 *
 * Contract:
 *   - X / Turnover evaluates to the correct division result when both
 *     inputs are present and unit-consistent.
 *   - Turnover = 0 → manual_required, reason matches /Division durch Null/.
 *   - Declared-vs-field unit mismatch (profile expects Turnover: 'EUR',
 *     the field carries 'kEUR') → manual_required with unitConflicts
 *     populated (profile expectedUnits wins over any caller-supplied unit).
 */

import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from '../formula';
import { equationProfiles } from '../equation-profiles';

const INTENSITY_EQUATIONS = [
  {
    id: 'VSME-EQ-11',
    output: 'Scope1AndScope2GreenhouseGasEmissionsIntensityValueLocationBased',
    dividend: 'TotalGrossLocationBasedScope1AndScope2GHGEmissions',
  },
  {
    id: 'VSME-EQ-12',
    output: 'Scope1AndScope2GreenhouseGasEmissionsIntensityValueMarketBased',
    dividend: 'TotalGrossMarketBasedScope1AndScope2GHGEmissions',
  },
  {
    id: 'VSME-EQ-13',
    output: 'TotalLocationBasedGreenhouseGasEmissionsIntensityValue',
    dividend: 'TotalGrossLocationBasedGHGEmissions',
  },
  {
    id: 'VSME-EQ-14',
    output: 'TotalMarketBasedGreenhouseGasEmissionsIntensityValue',
    dividend: 'TotalGrossMarketBasedGHGEmissions',
  },
] as const;

function req(
  eqId: string,
  formula: string,
  outputSymbol: string,
  dividendSymbol: string,
  dividendValue: { value: number; unit: string | null },
  turnoverValue: { value: number; unit: string | null },
): EvalRequest {
  return {
    equationId: eqId,
    formula,
    inputSymbols: [dividendSymbol, 'Turnover'],
    outputSymbol,
    inputs: [
      { symbol: dividendSymbol, value: dividendValue.value, unit: dividendValue.unit },
      { symbol: 'Turnover', value: turnoverValue.value, unit: turnoverValue.unit },
    ],
  };
}

describe('equation-profiles: VSME-EQ-11..14 are registered with the correct expectedUnits', () => {
  for (const { id, dividend } of INTENSITY_EQUATIONS) {
    it(`${id} declares ${dividend}: tCO2eq and Turnover: EUR`, () => {
      const profile = equationProfiles[id];
      expect(profile).toBeDefined();
      expect(profile!.expectedUnits[dividend]).toBe('tCO2eq');
      expect(profile!.expectedUnits.Turnover).toBe('EUR');
    });
  }
});

describe('B03.300 GHG-intensity division — correct result', () => {
  for (const { id, output, dividend } of INTENSITY_EQUATIONS) {
    it(`${output} = ${dividend} / Turnover computes correctly`, () => {
      const formula = `${output} = ${dividend} / Turnover`;
      const r = evaluateFormula(
        req(id, formula, output, dividend, { value: 250, unit: 'tCO2eq' }, { value: 2_500_000, unit: 'EUR' }),
      );
      expect(r.kind).toBe('computed');
      if (r.kind !== 'computed') return;
      expect(r.value).toBeCloseTo(0.0001, 10); // 250 / 2,500,000
    });
  }
});

describe('B03.300 GHG-intensity division — Turnover = 0 → manual_required', () => {
  it('division by zero yields manual_required with a "Division durch Null" reason', () => {
    const { id, output, dividend } = INTENSITY_EQUATIONS[0];
    const formula = `${output} = ${dividend} / Turnover`;
    const r = evaluateFormula(
      req(id, formula, output, dividend, { value: 250, unit: 'tCO2eq' }, { value: 0, unit: 'EUR' }),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.reason).toMatch(/Division durch Null/);
  });
});

describe('B03.300 GHG-intensity division — declared-vs-field unit mismatch', () => {
  it('Turnover carried as kEUR (profile expects EUR) → manual_required with unitConflicts', () => {
    const { id, output, dividend } = INTENSITY_EQUATIONS[0];
    const formula = `${output} = ${dividend} / Turnover`;
    const r = evaluateFormula(
      req(id, formula, output, dividend, { value: 250, unit: 'tCO2eq' }, { value: 2500, unit: 'kEUR' }),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts).toBeDefined();
    expect(r.unitConflicts).toContainEqual({ symbol: 'Turnover', expected: 'EUR', actual: 'kEUR' });
  });

  it('dividend carried with a mismatched unit (profile expects tCO2eq) → manual_required with unitConflicts', () => {
    const { id, output, dividend } = INTENSITY_EQUATIONS[0];
    const formula = `${output} = ${dividend} / Turnover`;
    const r = evaluateFormula(
      req(id, formula, output, dividend, { value: 250, unit: 'kgCO2eq' }, { value: 2_500_000, unit: 'EUR' }),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts).toContainEqual({ symbol: dividend, expected: 'tCO2eq', actual: 'kgCO2eq' });
  });
});
