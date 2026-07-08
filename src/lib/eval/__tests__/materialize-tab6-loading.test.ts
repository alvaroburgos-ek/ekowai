/**
 * TDD tests for materializeLoadingCheck (DWA-A 138-1 Tab.5 / Tab.6).
 *
 * Numbers from PLT-HS-01: A_C=4836.43 m², A_S_m=45 m², bbz_thickness=0.30 m.
 * Expected ratio = 4836.43 / 45 ≈ 107.476…
 *
 * PART A update: ac_as_ratio_check is now a 4-state status string
 * ('pass'|'fail'|'not_applicable'|'indeterminate') and ac_as_ratio_check_reason
 * carries the reason text when check is not_applicable or indeterminate.
 */
import { describe, it, expect } from 'vitest';
import { materializeLoadingCheck } from '../materialize-tab6-loading';

// ---------------------------------------------------------------------------
// PLT-HS-01 — realistic high-load scenario (ratio ≈ 107.48)
// ---------------------------------------------------------------------------
describe('materializeLoadingCheck — PLT-HS-01 (A_C=4836.43, A_S_m=45, bbz=0.30)', () => {
  const base = { A_C: 4836.43, A_S_m: 45, bbz_thickness: 0.30 } as const;

  it('V2 (tier2, thick band) → ratio≈107.48, limit=50, check="fail", reason=null', () => {
    const r = materializeLoadingCheck({ ...base, flaechengruppe: 'V2' });
    expect(r.ac_as_ratio).toBeCloseTo(107.476, 2);
    expect(r.ac_as_ratio_limit).toBe(50);
    expect(r.ac_as_ratio_check).toBe('fail');
    expect(r.ac_as_ratio_check_reason).toBeNull();
  });

  it('BL (tier3, thick band) → ratio≈107.48, limit=30, check="fail", reason=null', () => {
    const r = materializeLoadingCheck({ ...base, flaechengruppe: 'BL' });
    expect(r.ac_as_ratio).toBeCloseTo(107.476, 2);
    expect(r.ac_as_ratio_limit).toBe(30);
    expect(r.ac_as_ratio_check).toBe('fail');
    expect(r.ac_as_ratio_check_reason).toBeNull();
  });

  it('VW1 (tier1_none) → ratio≈107.48, limit=null, check="not_applicable", reason contains "keine Anforderung"', () => {
    const r = materializeLoadingCheck({ ...base, flaechengruppe: 'VW1' });
    expect(r.ac_as_ratio).toBeCloseTo(107.476, 2);
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBe('not_applicable');
    expect(r.ac_as_ratio_check_reason).toContain('keine Anforderung');
  });

  it('D (authority) → ratio≈107.48, limit=null, check="not_applicable", reason contains "behördlich"', () => {
    const r = materializeLoadingCheck({ ...base, flaechengruppe: 'D' });
    expect(r.ac_as_ratio).toBeCloseTo(107.476, 2);
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBe('not_applicable');
    expect(r.ac_as_ratio_check_reason).toContain('behördlich');
  });

  it('flaechengruppe=null → ratio≈107.48, limit=null, check="indeterminate" (Flächengruppe unset)', () => {
    const r = materializeLoadingCheck({ ...base, flaechengruppe: null });
    // ratio is computable (A_C and A_S_m are present) even when tier is indeterminate
    expect(r.ac_as_ratio).toBeCloseTo(107.476, 2);
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBe('indeterminate');
    expect(r.ac_as_ratio_check_reason).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PASS case: A_C=20, A_S_m=1, BL, bbz=0.30 → ratio=20 ≤ 30 → PASS
// ---------------------------------------------------------------------------
it('PASS case: A_C=20, A_S_m=1, BL @0.30 → limit=30, check="pass", reason=null', () => {
  const r = materializeLoadingCheck({ A_C: 20, A_S_m: 1, flaechengruppe: 'BL', bbz_thickness: 0.30 });
  expect(r.ac_as_ratio).toBeCloseTo(20, 5);
  expect(r.ac_as_ratio_limit).toBe(30);
  expect(r.ac_as_ratio_check).toBe('pass');
  expect(r.ac_as_ratio_check_reason).toBeNull();
});

// ---------------------------------------------------------------------------
// reason is DISTINCT between tier1_none and authority
// ---------------------------------------------------------------------------
it('VW1 reason !== D reason (tier1_none vs authority have different reason texts)', () => {
  const base = { A_C: 100, A_S_m: 10, bbz_thickness: 0.30 } as const;
  const tier1 = materializeLoadingCheck({ ...base, flaechengruppe: 'VW1' });
  const auth  = materializeLoadingCheck({ ...base, flaechengruppe: 'D' });
  expect(tier1.ac_as_ratio_check).toBe('not_applicable');
  expect(auth.ac_as_ratio_check).toBe('not_applicable');
  expect(tier1.ac_as_ratio_check_reason).not.toBe(auth.ac_as_ratio_check_reason);
});

// ---------------------------------------------------------------------------
// Missing inputs
// ---------------------------------------------------------------------------
describe('materializeLoadingCheck — missing inputs', () => {
  it('A_C=null (tier2) → ac_as_ratio=null, limit=null, check="indeterminate"', () => {
    const r = materializeLoadingCheck({ A_C: null, A_S_m: 45, flaechengruppe: 'V2', bbz_thickness: 0.30 });
    expect(r.ac_as_ratio).toBeNull();
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBe('indeterminate');
    expect(r.ac_as_ratio_check_reason).not.toBeNull();
  });

  it('A_S_m=null (tier2) → ac_as_ratio=null, limit=null, check="indeterminate"', () => {
    const r = materializeLoadingCheck({ A_C: 4836.43, A_S_m: null, flaechengruppe: 'V2', bbz_thickness: 0.30 });
    expect(r.ac_as_ratio).toBeNull();
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBe('indeterminate');
    expect(r.ac_as_ratio_check_reason).not.toBeNull();
  });

  it('bbz_thickness=null (tier2) → ratio computed, limit=null, check="indeterminate" (indeterminate band)', () => {
    const r = materializeLoadingCheck({ A_C: 4836.43, A_S_m: 45, flaechengruppe: 'V2', bbz_thickness: null });
    expect(r.ac_as_ratio).toBeCloseTo(107.476, 2);
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBe('indeterminate');
    expect(r.ac_as_ratio_check_reason).not.toBeNull();
  });

  it('A_C=null + tier1_none (VW1) → ratio=null, check="not_applicable" (tier1 overrides missing area)', () => {
    const r = materializeLoadingCheck({ A_C: null, A_S_m: 10, flaechengruppe: 'VW1', bbz_thickness: 0.30 });
    expect(r.ac_as_ratio).toBeNull();
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBe('not_applicable');
  });
});
