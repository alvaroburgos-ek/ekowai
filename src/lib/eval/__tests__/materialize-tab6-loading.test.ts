/**
 * TDD tests for materializeLoadingCheck (DWA-A 138-1 Tab.5 / Tab.6).
 *
 * Numbers from PLT-HS-01: A_C=4836.43 m², A_S_m=45 m², bbz_thickness=0.30 m.
 * Expected ratio = 4836.43 / 45 ≈ 107.476…
 */
import { describe, it, expect } from 'vitest';
import { materializeLoadingCheck } from '../materialize-tab6-loading';

// ---------------------------------------------------------------------------
// PLT-HS-01 — realistic high-load scenario (ratio ≈ 107.48)
// ---------------------------------------------------------------------------
describe('materializeLoadingCheck — PLT-HS-01 (A_C=4836.43, A_S_m=45, bbz=0.30)', () => {
  const base = { A_C: 4836.43, A_S_m: 45, bbz_thickness: 0.30 } as const;

  it('V2 (tier2, thick band) → ratio≈107.48, limit=50, check=false (FAIL)', () => {
    const r = materializeLoadingCheck({ ...base, flaechengruppe: 'V2' });
    expect(r.ac_as_ratio).toBeCloseTo(107.476, 2);
    expect(r.ac_as_ratio_limit).toBe(50);
    expect(r.ac_as_ratio_check).toBe(false);
  });

  it('BL (tier3, thick band) → ratio≈107.48, limit=30, check=false (FAIL)', () => {
    const r = materializeLoadingCheck({ ...base, flaechengruppe: 'BL' });
    expect(r.ac_as_ratio).toBeCloseTo(107.476, 2);
    expect(r.ac_as_ratio_limit).toBe(30);
    expect(r.ac_as_ratio_check).toBe(false);
  });

  it('VW1 (tier1_none) → ratio≈107.48, limit=null, check=null (N/A keine Anforderung)', () => {
    const r = materializeLoadingCheck({ ...base, flaechengruppe: 'VW1' });
    expect(r.ac_as_ratio).toBeCloseTo(107.476, 2);
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBeNull();
  });

  it('D (authority) → ratio≈107.48, limit=null, check=null (N/A behördlich)', () => {
    const r = materializeLoadingCheck({ ...base, flaechengruppe: 'D' });
    expect(r.ac_as_ratio).toBeCloseTo(107.476, 2);
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBeNull();
  });

  it('flaechengruppe=null → ratio≈107.48, limit=null, check=null (indeterminate — Flächengruppe unset)', () => {
    const r = materializeLoadingCheck({ ...base, flaechengruppe: null });
    // ratio is computable (A_C and A_S_m are present) even when tier is indeterminate
    expect(r.ac_as_ratio).toBeCloseTo(107.476, 2);
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PASS case: A_C=20, A_S_m=1, BL, bbz=0.30 → ratio=20 ≤ 30 → PASS
// ---------------------------------------------------------------------------
it('PASS case: A_C=20, A_S_m=1, BL @0.30 → limit=30, check=true', () => {
  const r = materializeLoadingCheck({ A_C: 20, A_S_m: 1, flaechengruppe: 'BL', bbz_thickness: 0.30 });
  expect(r.ac_as_ratio).toBeCloseTo(20, 5);
  expect(r.ac_as_ratio_limit).toBe(30);
  expect(r.ac_as_ratio_check).toBe(true);
});

// ---------------------------------------------------------------------------
// Missing inputs
// ---------------------------------------------------------------------------
describe('materializeLoadingCheck — missing inputs', () => {
  it('A_C=null → ac_as_ratio=null, limit=null, check=null', () => {
    const r = materializeLoadingCheck({ A_C: null, A_S_m: 45, flaechengruppe: 'V2', bbz_thickness: 0.30 });
    expect(r.ac_as_ratio).toBeNull();
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBeNull();
  });

  it('A_S_m=null → ac_as_ratio=null, limit=null, check=null', () => {
    const r = materializeLoadingCheck({ A_C: 4836.43, A_S_m: null, flaechengruppe: 'V2', bbz_thickness: 0.30 });
    expect(r.ac_as_ratio).toBeNull();
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBeNull();
  });

  it('bbz_thickness=null (tier2) → ac_as_ratio computed, limit=null (indeterminate band)', () => {
    const r = materializeLoadingCheck({ A_C: 4836.43, A_S_m: 45, flaechengruppe: 'V2', bbz_thickness: null });
    expect(r.ac_as_ratio).toBeCloseTo(107.476, 2);
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBeNull();
  });
});
