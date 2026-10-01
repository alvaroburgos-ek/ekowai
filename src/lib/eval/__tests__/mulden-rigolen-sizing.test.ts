/**
 * Guideline-settled rules of the Mulden-Rigolen facilities (2026-10-01), pinned against hand
 * calculations from the verbatim DWA-A 138-1 text (transcript lines in the function docs):
 *   - §5.3.3.6 L1395  k_i,BBZ of the vegetated soil zone (f_Methode neglected for the printed range)
 *   - §6.5.2 L1909/L1925  the swale of a composite uses k_i,BBZ, the trench the subsoil k_i
 *   - §6.3.2 Gl.14  required swale volume, governing over D (the available Gl.15 volume must cover it)
 *   - §6.5.2 Gl.30/31  swale overflow: smallest D with V_MÜ > 0 → r_MÜ → Q_MÜ
 *   - §6.6.2 Gl.32  MRS trench length with the throttle Q_Dr (Q_Dr = 0 reproduces Gl.29)
 * Case: TEST-A138-MRE (readiness run 2026-09-30): A_C 162.2 m², A_VA = A_S,m = 50 m², k_i 6.6·10⁻⁷,
 * f_Z 1.2, swale V_M 5.5 m³ (h_M 0.11 chosen), trench 1 × 1 m, s_R 0.35, KOSTRA 123107 T = 10 a.
 */
import { describe, it, expect } from 'vitest';
import {
  computeKiBBZ, swaleDesignInfiltrationRate, computeMuldeRequiredVolumeSweep,
  computeMuldenUeberlauf, computeMrsTrenchLengthSweep, facilityGoverningVolume, facilityVolumeMaterialize,
} from '../materialize-asm';
import { KOSTRA_123107_T10 } from './fixtures/kostra-123107';

const MRE = { A_C: 162.2, A_VA: 50, A_S_m: 50, k_i: 6.6e-7, f_Z: 1.2, V_M: 5.5, b_R: 1, h_R: 1, s_R: 0.35 };

describe('computeKiBBZ — §5.3.3.6 L1395', () => {
  it('printed Bild-1 range: f_Methode is neglected → k_i,BBZ = k_f,BBZ · f_Ort', () => {
    expect(computeKiBBZ({ k_f_BBZ: 1e-5, quelle: 'bild1_bereich', f_ort: 0.6, f_K: 0.06 })).toBeCloseTo(6e-6, 12);
  });
  it('measured k_f,BBZ: the full f_K = f_Ort · f_Methode applies (Gl. 5/6)', () => {
    expect(computeKiBBZ({ k_f_BBZ: 2e-5, quelle: 'gemessen', f_ort: 0.6, f_K: 0.54 })).toBeCloseTo(1.08e-5, 12);
  });
  it('missing k_f or factor → null (never a silent default)', () => {
    expect(computeKiBBZ({ k_f_BBZ: null, quelle: 'gemessen', f_ort: 0.6, f_K: 0.54 })).toBeNull();
    expect(computeKiBBZ({ k_f_BBZ: 1e-5, quelle: 'bild1_bereich', f_ort: null, f_K: 0.54 })).toBeNull();
  });
});

describe('swaleDesignInfiltrationRate — §6.5.2 L1909/L1925', () => {
  it('composite facility with a known k_i,BBZ → the swale uses k_i,BBZ', () => {
    expect(swaleDesignInfiltrationRate('mre', 6.6e-7, 6e-6)).toBe(6e-6);
    expect(swaleDesignInfiltrationRate('mrs', 6.6e-7, 6e-6)).toBe(6e-6);
  });
  it('plain swale (or composite without k_i,BBZ) → the project k_i of the governing layer', () => {
    expect(swaleDesignInfiltrationRate('mulde', 6.6e-7, 6e-6)).toBe(6.6e-7);
    expect(swaleDesignInfiltrationRate('mre', 6.6e-7, null)).toBe(6.6e-7);
    expect(swaleDesignInfiltrationRate(null, null, null)).toBeNull();
  });
});

describe('computeMuldeRequiredVolumeSweep — §6.3.2 Gl.14 governing over D', () => {
  it('BESS swale 250 m² (A_VA = A_S,m, T = 10 a): 17.0 m³ at D = 540 min (report EKO-2026-001 R0)', () => {
    const r = computeMuldeRequiredVolumeSweep(KOSTRA_123107_T10, { A_C: 162.2, A_VA: 250, A_S_m: 250, k_i: 6.6e-7, f_Z: 1.2 });
    expect(r.V_M_erf).toBeCloseTo(17.0, 1);
    expect(r.governingD).toBe(540);
  });
  it('no usable rows → null, not 0', () => {
    expect(computeMuldeRequiredVolumeSweep([], { A_C: 162.2, A_VA: 250, A_S_m: 250, k_i: 6.6e-7, f_Z: 1.2 }).V_M_erf).toBeNull();
  });
});

describe('computeMuldenUeberlauf — §6.5.2 Gl.30/31', () => {
  it('MRE case on the n_R column: the swale (5.5 m³) first overflows at D = 45 min → r_MÜ 88.1, V_MÜ 0.45 m³, Q_MÜ 1.40 l/s', () => {
    const o = computeMuldenUeberlauf(KOSTRA_123107_T10, MRE);
    expect(o.overflow).toBe(true);
    expect(o.D).toBe(45);
    expect(o.r_MUE).toBe(88.1);
    // hand: ((212.2·88.1·10⁻⁷ − 50·6.6·10⁻⁷)·45·60·1.2) − 5.5 = 0.4502 m³
    expect(o.V_MUE).toBeCloseTo(0.4502, 3);
    // hand: 162.2·10⁻⁴·88.1 − 50·6.6·10⁻⁷·1000 = 1.4290 − 0.0330 = 1.3960 l/s
    expect(o.Q_MUE).toBeCloseTo(1.396, 3);
  });
  it('a swale large enough never overflows → overflow false, Q_MÜ = r_MÜ = 0, V_MÜ = the largest (negative) margin', () => {
    const o = computeMuldenUeberlauf(KOSTRA_123107_T10, { ...MRE, V_M: 30 });
    expect(o.overflow).toBe(false);
    expect(o.Q_MUE).toBe(0);
    expect(o.r_MUE).toBe(0);
    expect(o.V_MUE).not.toBeNull();
    expect(o.V_MUE!).toBeLessThan(0);
  });
});

describe('computeMrsTrenchLengthSweep — §6.6.2 Gl.32', () => {
  it('Q_Dr = 0 reproduces Gl.29: 21.3 m at D = 2880 min for the MRE case (V_M 5.5)', () => {
    const r = computeMrsTrenchLengthSweep(KOSTRA_123107_T10, { ...MRE, Q_Dr: 0 });
    expect(r.L_R).toBeCloseTo(21.30, 2);
    expect(r.governingD).toBe(2880);
    expect(r.r_D_at_governing).toBe(4.3);
  });
  it('with a 0.02 l/s throttle the governing duration moves to 1440 min and L_R,erf drops to 16.4 m', () => {
    const r = computeMrsTrenchLengthSweep(KOSTRA_123107_T10, { ...MRE, Q_Dr: 0.02 });
    expect(r.L_R).toBeCloseTo(16.39, 2);
    expect(r.governingD).toBe(1440);
    expect(r.r_D_at_governing).toBe(7.1);
  });
});

describe('MRS governing storage volume — §6.6.2 L2023 "analog … 6.5.2" → Gl.26', () => {
  it('V_MR = V_M + V_R, persisted on the V_MR symbol (no longer the overflow V_MÜ)', () => {
    expect(facilityGoverningVolume('mrs', { A_S_m: null, h_M: null, V_M: 5.5, V_R: 7.49 })).toBeCloseTo(12.99, 9);
    const w = facilityVolumeMaterialize('mrs', { A_S_m: null, h_M: null, V_M: 5.5, V_R: 7.49 });
    expect(w).toEqual({ volumeSymbol: 'V_MR', value: 12.99 });
  });
});
