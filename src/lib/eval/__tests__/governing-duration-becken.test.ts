/**
 * Piece 1 / Task 6 — A138-22 Beckenversickerung governing-duration profile.
 *
 * Gl. 41:  V_VA = ((A_C + A_VA)·1e-7·r_D(n) − A_S_m·k_i − Q_Dr·1e-3)·D·60·f_Z·f_A
 *
 * This is the one storage facility whose sizing is a CLEAN function of
 * (D, r_D, given scalars) — A_S_m is the engineer-supplied basin infiltration
 * area, not a D-coupled solve. The profile therefore plugs straight into the
 * shared iteration engine. (The geometry-coupled facilities — Mulde/Rigole/
 * MRE/Schacht/MRS — are intentionally NOT built here; their formulation needs
 * source confirmation. See 2026-06-28 field-inventory doc.)
 *
 * Hand calc (drain A_S_m·k_i = 50·1e-4 = 5e-3 m³/s, Q_Dr=0, f_Z=1.2, f_A=1):
 *   V(D) = ((1050)·1e-7·r_D − 5e-3)·D·60·1.2
 *   D=5,r=300  → (0.0315 −0.005)·360  =  9.540
 *   D=15,r=195 → (0.020475−0.005)·1080 = 16.713
 *   D=30,r=130 → (0.01365 −0.005)·2160 = 18.684   ← governing
 *   D=60,r=80  → (0.0084  −0.005)·4320 = 14.688
 *   D=120,r=50 → (0.00525 −0.005)·8640 =  2.160
 */
import { describe, it, expect } from 'vitest';
import { iterateGoverningDuration, GOVERNING_PROFILES } from '../governing-duration';

const becken = GOVERNING_PROFILES.find((p) => p.facility === 'A138-22');

describe('A138-22 Becken governing-duration profile (Gl. 41)', () => {
  it('is registered with the Gl.41 V_VA sizing and the r_D_n_B target', () => {
    expect(becken).toBeDefined();
    expect(becken!.maximizes).toBe('V_VA');
    expect(becken!.equationId).toBe('433f7700-90cb-410d-8103-7b72f53db8fa');
    expect(becken!.derived.rDSymbol).toBe('r_D_n_B');
  });

  it('iterates to the governing duration (D=30 → V_VA = 18.684 m³)', () => {
    const scalars = { A_C: 1000, A_VA: 50, A_S_m: 50, k_i: 1e-4, Q_Dr: 0, f_Z: 1.2, f_A: 1.0 };
    const rows = [
      { D_min: 5, r_D_n: 300 },
      { D_min: 15, r_D_n: 195 },
      { D_min: 30, r_D_n: 130 },
      { D_min: 60, r_D_n: 80 },
      { D_min: 120, r_D_n: 50 },
    ];
    const res = iterateGoverningDuration(rows, (D, r_D) => becken!.sizing(D, r_D, scalars));
    expect(res.governingD).toBe(30);
    expect(res.r_D_at_governing).toBe(130);
    expect(res.governingValue).toBeCloseTo(18.684, 3);
  });

  it('f_A < 1 scales V_VA but does not change the governing duration', () => {
    const scalars = { A_C: 1000, A_VA: 50, A_S_m: 50, k_i: 1e-4, Q_Dr: 0, f_Z: 1.2, f_A: 0.5 };
    const rows = [
      { D_min: 15, r_D_n: 195 },
      { D_min: 30, r_D_n: 130 },
      { D_min: 60, r_D_n: 80 },
    ];
    const res = iterateGoverningDuration(rows, (D, r_D) => becken!.sizing(D, r_D, scalars));
    expect(res.governingD).toBe(30);
    expect(res.governingValue).toBeCloseTo(18.684 * 0.5, 3);
  });
});
