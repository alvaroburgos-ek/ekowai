import { describe, it, expect } from 'vitest';
import { stepLines } from '../step-text';
import { gl8Series, gl10Series, gl16Series } from '../iteration-series';
import { rows } from '../__fixtures__/c4-a138-chain';

const K5_T30 = gl10Series(rows(30), { AcS_paved: 602.161, A_VA: 48.58, Q_S: 0.4858, Q_Dr: 0, V_VA: 14.57 }, 30);
describe('stepLines', () => {
  it('Gl. 10 at the governing D: Q_in and V_Rück with the numbers substituted (DE)', () => {
    const i = K5_T30.perDuration.findIndex((p) => p.D === 360);
    const l = stepLines(K5_T30, i, 'de').join('\n');
    expect(l).toContain('Schritt 12 von 22: D = 360 min, r_D(T = 30 a) = 27,5 l/(s·ha)');
    expect(l).toContain('= 27,5 · (602,161 + 48,58) / 10 000 = 1,78954 l/s');
    expect(l).toContain('(1,78954 − (0,4858 + 0)) · 360 · 60 / 1000 − 14,57 = 13,5907 m³');
    expect(l).toContain('Maßgebend: D = 360 min mit 13,5907 m³');
  });
  it('Gl. 10 negative values are floored with a note (EN)', () => {
    const l = stepLines(K5_T30, 0, 'en').join('\n');
    expect(l).toMatch(/→ negative, V_Rück = 0/);
  });
  it('Gl. 8 at D 10080 flags the boundary-limited maximum', () => {
    const s = gl8Series(rows(5), { A_C: 526.2105, A_VA: 50, Q_S: 0.0015, Q_Dr: 0, f_Z: 1.2, f_A: 1 }, 5);
    const l = stepLines(s, 21, 'de').join('\n');
    expect(l).toContain('= (1,7 · (526,211 + 50) · 10⁻⁴ − 0,0015 − 0) · 10080 · 60 · 1,2 · 1 · 10⁻³ = 70,0038 m³');
    expect(l).toContain('kein eindeutiges Maximum');
  });
  it('Gl. 16 K5 at D 180', () => {
    const s = gl16Series(rows(5), { A_C: 526.2105, h_M: 0.3, f_Z: 1.2, k_i: 1e-5 }, 5);
    const l = stepLines(s, 9, 'de').join('\n');
    expect(l).toContain('= 526,211 · 10⁻⁷ · 30,6 / (0,3 / (180 · 60 · 1,2) + 1·10⁻⁵) = 48,576 m²');
  });
});
