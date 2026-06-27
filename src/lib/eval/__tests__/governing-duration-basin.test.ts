import { describe, it, expect } from 'vitest';
import { iterateGoverningDuration, GOVERNING_PROFILES } from '../governing-duration';

const basin = GOVERNING_PROFILES.find((p) => p.facility === 'A138-13')!;

// Same fixture as formula-Gl8.test.ts — the basin's known-correct acceptance case.
const SCALARS = { A_C: 1000, A_VA: 50, Q_S: 5, Q_Dr: 0, f_Z: 1.2, f_A: 1.0 };
const ROWS = [
  { D_min: 5, r_D_n: 300 },
  { D_min: 10, r_D_n: 230 },
  { D_min: 15, r_D_n: 195 },
  { D_min: 30, r_D_n: 130 },
  { D_min: 60, r_D_n: 80 },
  { D_min: 120, r_D_n: 50 },
];

describe('basin V_VA profile via the shared engine', () => {
  it('reproduces the known acceptance: max V_VA = 18.684 @ governing D = 30 (r_D=130)', () => {
    const r = iterateGoverningDuration(ROWS, (D, r_D) => basin.sizing(D, r_D, SCALARS));
    expect(r.governingD).toBe(30);
    expect(r.governingValue).toBeCloseTo(18.684, 3);
    expect(r.r_D_at_governing).toBe(130);
  });
});
