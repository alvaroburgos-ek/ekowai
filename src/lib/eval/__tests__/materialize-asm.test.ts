// src/lib/eval/__tests__/materialize-asm.test.ts
import { describe, it, expect } from 'vitest';
import { materializeAsm, computeMuldeGeometrySweep } from '../materialize-asm';

const noGeo = { geometryValue: null as number | null };
describe('materializeAsm', () => {
  it('direct: PLT-HS-01 baseline 45/45 ⇒ A_S_m 45, determined', () => {
    const r = materializeAsm({ method: 'direct', A_S_min: 45, A_S_max: 45, A_C: null, bodenart: null, ...noGeo, manualValue: null, manualProvenance: null, facilityType: null, sourceWorksheet: 'A138-12' });
    expect(r.A_S_m).toBe(45);
    expect(r.state).toMatchObject({ status: 'determined', value: 45, method: 'direct' });
  });
  it('geometry: uses the resolved facility value (sweep/one-shot), determined', () => {
    const r = materializeAsm({ method: 'geometry', A_S_min: null, A_S_max: null, A_C: null, bodenart: null, geometryValue: 62.5, manualValue: null, manualProvenance: null, facilityType: 'mulde', sourceWorksheet: 'A138-17' });
    expect(r.A_S_m).toBe(62.5);
    expect(r.state).toMatchObject({ status: 'determined', value: 62.5, method: 'geometry', sourceWorksheet: 'A138-17' });
  });
  it('geometry: self-corrects sourceWorksheet from resolved producer when caller passes wrong default', () => {
    // Caller passes sourceWorksheet: 'A138-12' (wrong/default), but geometry/mulde resolves to A138-17
    const r = materializeAsm({ method: 'geometry', A_S_min: null, A_S_max: null, A_C: null, bodenart: null, geometryValue: 62.5, manualValue: null, manualProvenance: null, facilityType: 'mulde', sourceWorksheet: 'A138-12' });
    expect(r.A_S_m).toBe(62.5);
    // sourceWorksheet should be derived from the resolved producer, not the caller's wrong value
    expect(r.state).toMatchObject({ status: 'determined', value: 62.5, method: 'geometry', sourceWorksheet: 'A138-17' });
  });
  it('geometry unresolved (becken) ⇒ indeterminate, A_S_m null', () => {
    const r = materializeAsm({ method: 'geometry', A_S_min: null, A_S_max: null, A_C: null, bodenart: null, ...noGeo, manualValue: null, manualProvenance: null, facilityType: 'becken', sourceWorksheet: null });
    expect(r.A_S_m).toBeNull();
    expect(r.state.status).toBe('indeterminate');
  });
  it('soil_estimate: 0,20·A_C for schluffig Bodenart', () => {
    const r = materializeAsm({ method: 'soil_estimate', A_S_min: null, A_S_max: null, A_C: 1000, bodenart: 'schluffig', ...noGeo, manualValue: null, manualProvenance: null, facilityType: null, sourceWorksheet: 'A138-12' });
    expect(r.A_S_m).toBeCloseTo(200, 6);
    expect(r.state.status).toBe('determined');
  });
  it('manual: passthrough value + provenance ⇒ manual state', () => {
    const r = materializeAsm({ method: 'manual', A_S_min: null, A_S_max: null, A_C: null, bodenart: null, ...noGeo, manualValue: 88, manualProvenance: 'Datenblatt Fertigteil-Rigole XYZ', facilityType: 'rigole', sourceWorksheet: 'A138-12' });
    expect(r.A_S_m).toBe(88);
    expect(r.state).toMatchObject({ status: 'manual', value: 88, provenance: 'Datenblatt Fertigteil-Rigole XYZ' });
  });
  it('manual without provenance ⇒ indeterminate (provenance required)', () => {
    const r = materializeAsm({ method: 'manual', A_S_min: null, A_S_max: null, A_C: null, bodenart: null, ...noGeo, manualValue: 88, manualProvenance: null, facilityType: null, sourceWorksheet: 'A138-12' });
    expect(r.A_S_m).toBeNull();
    expect(r.state.status).toBe('indeterminate');
  });
});

describe('computeMuldeGeometrySweep (Gl.16 iterative, A-2)', () => {
  const scalars = { A_C: 5000, h_M: 0.30, f_Z: 1.2, k_i: 1e-5 };
  it('returns the MAX required area over the Dauerstufen sweep, not a single-D value', () => {
    const rows = [
      { D_min: 10, r_D_n: 200 },
      { D_min: 60, r_D_n: 90 },
      { D_min: 1440, r_D_n: 8 },
    ];
    const swept = computeMuldeGeometrySweep(rows, scalars);
    // Governing must equal the maximum Gl.16 value across the three rows.
    const gl16 = (D: number, r_D: number) => (scalars.A_C * 1e-7 * r_D) / (scalars.h_M / (D * 60 * scalars.f_Z) + scalars.k_i);
    const expectedMax = Math.max(...rows.map((r) => gl16(r.D_min!, r.r_D_n!)));
    expect(swept.A_S_m).toBeCloseTo(expectedMax, 6);
  });
  it('null when rows empty / all inputs missing', () => {
    expect(computeMuldeGeometrySweep([], scalars).A_S_m).toBeNull();
  });
});
