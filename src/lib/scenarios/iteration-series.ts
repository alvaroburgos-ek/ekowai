/**
 * Per-duration iteration series for the case chart and step-through (spec §3 step 5, §4.3/4.4).
 * The sizing functions are the REGISTERED ones (GOVERNING_PROFILES / computeMuldeGeometrySweep) — no second formula.
 */
import { GOVERNING_PROFILES, iterateGoverningDuration } from '@/lib/eval/governing-duration';
import { computeMuldeGeometrySweep } from '@/lib/eval/materialize-asm';
import type { IterationSeries } from './types';

export type RainRow = { D_min: number | null; r_D_n: number | null };

const profile = (facility: string) => {
  const p = GOVERNING_PROFILES.find((x) => x.facility === facility);
  if (!p) throw new Error(`governing profile ${facility} missing`);
  return p;
};

export function gl8Series(
  rows: readonly RainRow[],
  s: { A_C: number; A_VA: number; Q_S: number; Q_Dr: number; f_Z: number; f_A: number },
  T_n: number | null,
): IterationSeries {
  const p = profile('A138-13');
  const g = iterateGoverningDuration(rows, (D, r) => p.sizing(D, r, s));
  return {
    key: 'A138-13:Gl8', kind: 'gl8', worksheetCode: 'A138-13', equationLabel: 'Gl. 8', outputSymbol: 'V_VA', unit: 'm³',
    returnPeriod: T_n, scalars: { ...s }, perDuration: g.perDuration, governingD: g.governingD,
    r_D_at_governing: g.r_D_at_governing, governingValue: g.governingValue, boundaryLimited: g.boundaryLimited, floorAtZero: false,
  };
}

export function gl10Series(
  rows: readonly RainRow[],
  s: { AcS_paved: number; A_VA: number; Q_S: number; Q_Dr: number; V_VA: number },
  T: 30 | 100,
): IterationSeries {
  const p = profile('A138-26');
  const g = iterateGoverningDuration(rows, (D, r) => p.sizing(D, r, s));
  return {
    key: `A138-26:Gl10:T${T}`, kind: 'gl10', worksheetCode: 'A138-26', equationLabel: 'Gl. 10', outputSymbol: 'V_Rueck', unit: 'm³',
    returnPeriod: T, scalars: { ...s }, perDuration: g.perDuration, governingD: g.governingD,
    r_D_at_governing: g.r_D_at_governing, governingValue: g.governingValue, boundaryLimited: g.boundaryLimited, floorAtZero: true,
  };
}

export function gl16Series(
  rows: readonly RainRow[],
  s: { A_C: number; h_M: number; f_Z: number; k_i: number },
  T_n: number | null,
): IterationSeries {
  const g = computeMuldeGeometrySweep(rows, s);
  return {
    key: 'A138-17:Gl16', kind: 'gl16', worksheetCode: 'A138-17', equationLabel: 'Gl. 16', outputSymbol: 'A_S_m', unit: 'm²',
    returnPeriod: T_n, scalars: { ...s }, perDuration: g.perDuration, governingD: g.governingD,
    r_D_at_governing: g.r_D_at_governing, governingValue: g.A_S_m, boundaryLimited: g.boundaryLimited, floorAtZero: false,
  };
}

export function displayValue(series: Pick<IterationSeries, 'floorAtZero'>, v: number): number {
  return series.floorAtZero ? Math.max(0, v) : v;
}
