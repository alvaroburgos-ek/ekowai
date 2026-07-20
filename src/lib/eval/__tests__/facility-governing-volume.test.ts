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
import { facilityGoverningVolume, facilityVolumeMaterialize } from '../materialize-asm';

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

  it('non-mulde facilities are a NAMED, un-fabricated boundary → returns null (no formula invented)', () => {
    // The other facilities' storage-volume formulas are wired at fan-out with a
    // per-facility source-verify; they must NOT be fabricated here. Until then the
    // helper returns null (no volume persisted) rather than a made-up value.
    for (const t of ['flaeche', 'rigole', 'mre', 'mrs', 'schacht', 'becken'] as const) {
      expect(facilityGoverningVolume(t, { A_S_m: 100, h_M: 0.3 })).toBeNull();
    }
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

  it('other facilities: volume symbol known but rule deferred → no fabricated persist row', () => {
    for (const t of ['rigole', 'mre', 'mrs', 'schacht', 'becken'] as const) {
      expect(facilityVolumeMaterialize(t, { A_S_m: 100, h_M: 0.3 })).toBeNull();
    }
  });
});
