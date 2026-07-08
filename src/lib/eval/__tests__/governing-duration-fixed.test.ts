import { describe, it, expect } from 'vitest';
import { fixedDurationIntensity } from '../governing-duration';

const ROWS = [
  { D_min: 5, r_D_n: 300 },
  { D_min: 10, r_D_n: 230 },
  { D_min: 15, r_D_n: 195 },
];

describe('fixedDurationIntensity (Flächenversickerung, no iteration)', () => {
  it('exact D returns that row r_D', () => {
    expect(fixedDurationIntensity(ROWS, 10)).toEqual({ D: 10, r_D: 230 });
  });
  it('range returns the in-range row with the largest r_D (conservative)', () => {
    expect(fixedDurationIntensity(ROWS, { min: 10, max: 15 })).toEqual({ D: 10, r_D: 230 });
  });
  it('returns null when no row matches', () => {
    expect(fixedDurationIntensity(ROWS, 99)).toBeNull();
    expect(fixedDurationIntensity([], 10)).toBeNull();
  });
  it('ignores incomplete rows', () => {
    expect(fixedDurationIntensity([{ D_min: 10, r_D_n: null }], 10)).toBeNull();
  });
});
