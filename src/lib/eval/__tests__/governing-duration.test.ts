import { describe, it, expect } from 'vitest';
import { iterateGoverningDuration } from '../governing-duration';

const ROWS = [
  { D_min: 5, r_D_n: 300 },
  { D_min: 10, r_D_n: 230 },
  { D_min: 30, r_D_n: 130 },
];

describe('iterateGoverningDuration', () => {
  it('takes the argmax of the sizing function (the governing duration)', () => {
    // sizing = D·r_D → 1500, 2300, 3900 → governing D=30
    const r = iterateGoverningDuration(ROWS, (D, r_D) => D * r_D);
    expect(r.governingD).toBe(30);
    expect(r.r_D_at_governing).toBe(130);
    expect(r.governingValue).toBe(3900);
    expect(r.perDuration).toEqual([
      { D: 5, r_D: 300, value: 1500 },
      { D: 10, r_D: 230, value: 2300 },
      { D: 30, r_D: 130, value: 3900 },
    ]);
  });

  it('first row wins on a tie (matches the aggregator strict >)', () => {
    const r = iterateGoverningDuration([{ D_min: 5, r_D_n: 1 }, { D_min: 9, r_D_n: 1 }], () => 100);
    expect(r.governingD).toBe(5);
  });

  it('skips incomplete rows (missing D or r_D)', () => {
    const r = iterateGoverningDuration(
      [{ D_min: 5, r_D_n: 300 }, { D_min: null, r_D_n: 7 }, { D_min: 10, r_D_n: null }],
      (D, r_D) => D * r_D,
    );
    expect(r.perDuration.map((p) => p.D)).toEqual([5]);
  });

  it('skips rows whose sizing returns null/non-finite', () => {
    const r = iterateGoverningDuration([{ D_min: 5, r_D_n: 300 }], () => null);
    expect(r.perDuration).toEqual([]);
    expect(r.governingD).toBeNull();
  });

  it('empty input → all null', () => {
    expect(iterateGoverningDuration([], () => 1)).toEqual({
      governingD: null,
      r_D_at_governing: null,
      governingValue: null,
      perDuration: [],
    });
  });
});
