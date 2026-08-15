/**
 * Finding F (summary fix wave) — pure governing-volume rule.
 *
 * The facility geometry sweep runs SERVER-side and computes A_S_m at the governing
 * duration. The governing STORAGE VOLUME (A138-17 V_M for mulde) is derived from
 * that footprint but was NEVER persisted (engine-output-materialization gap) → the
 * A138-23 summary read null → volume=null, complete=false.
 *
 * §6.3.2 source-verified (design doc 2026-07-20): for mulde the geometric
 * Speichervolumen is Gl.15 `V_M = A_S,m · h_M`, which at the dimensioned point equals
 * the Gl.14 erforderliches Speichervolumen. So the persisted governing volume is
 * exactly A_S_m·h_M.
 *
 * This is the DB-FREE logic RED (approved test approach): prove the pure computation
 * fails on current code (the helper does not exist / does not return the value) BEFORE
 * the fix. The faithful DB round-trip is the pilot re-run on prod.
 */
import { describe, it, expect } from 'vitest';
import {
  facilityGoverningVolume,
  facilityVolumeMaterialize,
  computeRigoleStorageCoefficient,
  computeSchachtHeadSweep,
} from '../materialize-asm';

describe('computeRigoleStorageCoefficient — §6.4.2 Gl.21/Gl.22 (server s_R)', () => {
  it('no embedded pipes (az=0) → s_R = s_F', () => {
    expect(computeRigoleStorageCoefficient({ s_F: 0.35, b_R: 0.5, h_R: 1, az: 0, d_i: null, d_a: null })).toBeCloseTo(0.35, 9);
  });

  it('Gl.21 exact with pipes: matches (s_F/(b·h))·[b·h + az·(π/4)·((1/s_F)·d_i² − d_a²)]', () => {
    const s_F = 0.35, b_R = 0.5, h_R = 1, az = 1, d_i = 0.1, d_a = 0.11;
    const expected = (s_F / (b_R * h_R)) * (b_R * h_R + az * (Math.PI / 4) * ((1 / s_F) * d_i * d_i - d_a * d_a));
    expect(computeRigoleStorageCoefficient({ s_F, b_R, h_R, az, d_i, d_a })).toBeCloseTo(expected, 12);
  });

  it('Gl.22 thin-wall (d≈d_i): matches (s_F/(b·h))·[b·h + az·(π·d²/4)·(1/s_F − 1)]', () => {
    const s_F = 0.35, b_R = 0.5, h_R = 1, az = 1, d_i = 0.1;
    const expected = (s_F / (b_R * h_R)) * (b_R * h_R + az * ((Math.PI * d_i * d_i) / 4) * (1 / s_F - 1));
    expect(computeRigoleStorageCoefficient({ s_F, b_R, h_R, az, d_i, d_a: null, thinWall: true })).toBeCloseTo(expected, 12);
  });

  it('null when a required input is missing', () => {
    expect(computeRigoleStorageCoefficient({ s_F: null, b_R: 0.5, h_R: 1, az: 0, d_i: null, d_a: null })).toBeNull();
    expect(computeRigoleStorageCoefficient({ s_F: 0.35, b_R: 0.5, h_R: 1, az: 1, d_i: null, d_a: 0.11 })).toBeNull();
  });
});

describe('computeSchachtHeadSweep — §6.7.2 Gl.37 (server governing h_S)', () => {
  it('takes the governing (max required) h_S across duration rows', () => {
    const rows = [
      { D_min: 10, r_D_n: 200 },
      { D_min: 60, r_D_n: 80 },
      { D_min: 1440, r_D_n: 6 },
    ];
    const scalars = { A_C: 500, d_a: 1.1, d_i: 1.0, k_i: 1e-5, f_Z: 1.2 };
    const gov = computeSchachtHeadSweep(rows, scalars);
    // Recompute the per-row Gl.37 to confirm the max is selected.
    const hOf = (D: number, r_D: number) => {
      const num = scalars.A_C * 1e-7 * r_D - (Math.PI * scalars.d_a ** 2) / 4 * scalars.k_i;
      const den = (Math.PI * scalars.d_i ** 2) / (4 * D * 60 * scalars.f_Z) + (scalars.d_a * Math.PI * scalars.k_i) / 2;
      return num / den;
    };
    const expected = Math.max(...rows.map((r) => hOf(r.D_min, r.r_D_n)));
    expect(gov.h_S).toBeCloseTo(expected, 9);
    expect(gov.governingD).not.toBeNull();
  });

  it('empty rows → null', () => {
    expect(computeSchachtHeadSweep([], { A_C: 500, d_a: 1.1, d_i: 1.0, k_i: 1e-5, f_Z: 1.2 }).h_S).toBeNull();
  });
});

describe('facilityGoverningVolume — Finding F pure rule', () => {
  it('mulde: V_M = A_S_m · h_M (Gl.15, §6.3.2-verified Speichervolumen)', () => {
    // Prod PLT-HS-01 baseline: A_S_m=943.4338711204341, h_M=0.30 → V_M=283.0302…
    const v = facilityGoverningVolume('mulde', { A_S_m: 943.4338711204341, h_M: 0.3 });
    expect(v).toBeCloseTo(283.0301613361302, 6);
  });

  it('mulde: returns null when a required input is missing', () => {
    expect(facilityGoverningVolume('mulde', { A_S_m: null, h_M: 0.3 })).toBeNull();
    expect(facilityGoverningVolume('mulde', { A_S_m: 943.43, h_M: null })).toBeNull();
  });

  it('mulde: returns null on a non-finite input (defensive)', () => {
    expect(facilityGoverningVolume('mulde', { A_S_m: NaN, h_M: 0.3 })).toBeNull();
    expect(facilityGoverningVolume('mulde', { A_S_m: 943.43, h_M: Infinity })).toBeNull();
  });

  it('rigole: V_R = b_R·h_R·L_R·s_R (§6.4.2 Gl.20)', () => {
    // 0.5·1.0·20·0.35 = 3.5 m³.
    const v = facilityGoverningVolume('rigole', {
      A_S_m: null, h_M: null, b_R: 0.5, h_R: 1.0, L_R: 20, s_R: 0.35,
    });
    expect(v).toBeCloseTo(3.5, 9);
  });

  it('mre: V_MR = V_M + V_R (§6.5.2 Gl.26 cross-ws sum)', () => {
    const v = facilityGoverningVolume('mre', { A_S_m: null, h_M: null, V_M: 12.5, V_R: 3.5 });
    expect(v).toBeCloseTo(16.0, 9);
  });

  it('schacht: V_S = π·d_i²/4·h_S (§6.7.2 Gl.36)', () => {
    // π·1²/4·2 = 1.5708 m³.
    const v = facilityGoverningVolume('schacht', { A_S_m: null, h_M: null, d_i: 1.0, h_S: 2.0 });
    expect(v).toBeCloseTo((Math.PI * 1 * 1) / 4 * 2, 9);
  });

  it('becken: V_B = the server Gl.41 governing sweep (§6.8.2 Gl.41)', () => {
    const v = facilityGoverningVolume('becken', { A_S_m: null, h_M: null, V_B_governing: 128.4 });
    expect(v).toBeCloseTo(128.4, 9);
  });

  it('flaeche + mrs: no storage volume → null (area device / ratification-excluded)', () => {
    expect(facilityGoverningVolume('flaeche', { A_S_m: 100, h_M: 0.3 })).toBeNull();
    // MRS is excluded (V_MR vs V_MUE ratification block) — never fabricated.
    expect(facilityGoverningVolume('mrs', { A_S_m: 100, h_M: 0.3, V_M: 5, V_R: 3 })).toBeNull();
  });

  it('each wired facility returns null when a required input is missing', () => {
    expect(facilityGoverningVolume('rigole', { A_S_m: null, h_M: null, b_R: 0.5, h_R: 1, L_R: 20 })).toBeNull();
    expect(facilityGoverningVolume('mre', { A_S_m: null, h_M: null, V_M: 12.5 })).toBeNull();
    expect(facilityGoverningVolume('schacht', { A_S_m: null, h_M: null, d_i: 1.0 })).toBeNull();
    expect(facilityGoverningVolume('becken', { A_S_m: null, h_M: null })).toBeNull();
  });
});

describe('facilityVolumeMaterialize — Finding F persist-set assembly', () => {
  it('mulde: the governing-volume field V_M IS in the persist set (RED before F)', () => {
    const w = facilityVolumeMaterialize('mulde', { A_S_m: 943.4338711204341, h_M: 0.3 });
    expect(w).not.toBeNull();
    expect(w!.volumeSymbol).toBe('V_M');
    expect(w!.value).toBeCloseTo(283.0301613361302, 6);
  });

  it('mulde with missing inputs: nothing to persist (null, not a stale V_M row)', () => {
    expect(facilityVolumeMaterialize('mulde', { A_S_m: null, h_M: 0.3 })).toBeNull();
  });

  it('flaeche: no storage-volume symbol → no persist row', () => {
    expect(facilityVolumeMaterialize('flaeche', { A_S_m: 200, h_M: null })).toBeNull();
  });

  it('mrs: excluded (ratification block) → no persist row even with inputs', () => {
    expect(facilityVolumeMaterialize('mrs', { A_S_m: 100, h_M: 0.3, V_M: 5, V_R: 3 })).toBeNull();
  });

  it('rigole/mre/schacht/becken: the governing-volume field IS in the persist set with correct symbol', () => {
    const r = facilityVolumeMaterialize('rigole', { A_S_m: null, h_M: null, b_R: 0.5, h_R: 1, L_R: 20, s_R: 0.35 });
    expect(r).toEqual({ volumeSymbol: 'V_R', value: 3.5 });

    const m = facilityVolumeMaterialize('mre', { A_S_m: null, h_M: null, V_M: 12.5, V_R: 3.5 });
    expect(m).toEqual({ volumeSymbol: 'V_MR', value: 16 });

    const s = facilityVolumeMaterialize('schacht', { A_S_m: null, h_M: null, d_i: 1.0, h_S: 2.0 });
    expect(s!.volumeSymbol).toBe('V_S');
    expect(s!.value).toBeCloseTo((Math.PI) / 4 * 2, 9);

    const b = facilityVolumeMaterialize('becken', { A_S_m: null, h_M: null, V_B_governing: 128.4 });
    expect(b).toEqual({ volumeSymbol: 'V_B', value: 128.4 });
  });

  it('wired facilities with missing inputs: nothing to persist (no fabricated row)', () => {
    expect(facilityVolumeMaterialize('rigole', { A_S_m: null, h_M: null, b_R: 0.5 })).toBeNull();
    expect(facilityVolumeMaterialize('mre', { A_S_m: null, h_M: null, V_M: 5 })).toBeNull();
    expect(facilityVolumeMaterialize('schacht', { A_S_m: null, h_M: null, d_i: 1.0 })).toBeNull();
    expect(facilityVolumeMaterialize('becken', { A_S_m: null, h_M: null })).toBeNull();
  });
});
