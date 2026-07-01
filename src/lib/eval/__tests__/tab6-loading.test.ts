/**
 * TDD tests for Tab.6 hydraulic-loading helper (DWA-A 138-1 §5.2.3.2 + Tab.6).
 * Written BEFORE implementation — must fail on first run (RED).
 */
import { describe, it, expect } from 'vitest';
import { tab6Limit, tab6LoadingCheck } from '../tab6-loading';

// ---------------------------------------------------------------------------
// tab6Limit — tier × BBZ-band → limit descriptor
// ---------------------------------------------------------------------------
describe('tab6Limit', () => {
  it('tier1_none → {kind:"none"} regardless of thickness', () => {
    const r = tab6Limit('tier1_none', 0.25);
    expect(r.kind).toBe('none');
  });

  it('tier1_none with null thickness → {kind:"none"} (no numeric limit)', () => {
    const r = tab6Limit('tier1_none', null);
    expect(r.kind).toBe('none');
  });

  // tier2 -------------------------------------------------------------------
  it('tier2 @ 0.20 m → max 30 (thin band)', () => {
    const r = tab6Limit('tier2', 0.20);
    expect(r.kind).toBe('limit');
    if (r.kind === 'limit') expect(r.max).toBe(30);
  });

  it('tier2 @ 0.29 m → max 30 (still thin band, just below threshold)', () => {
    const r = tab6Limit('tier2', 0.29);
    expect(r.kind).toBe('limit');
    if (r.kind === 'limit') expect(r.max).toBe(30);
  });

  it('tier2 @ 0.30 m → max 50 (thick band, boundary inclusive)', () => {
    const r = tab6Limit('tier2', 0.30);
    expect(r.kind).toBe('limit');
    if (r.kind === 'limit') expect(r.max).toBe(50);
  });

  it('tier2 @ 0.45 m → max 50 (thick band)', () => {
    const r = tab6Limit('tier2', 0.45);
    expect(r.kind).toBe('limit');
    if (r.kind === 'limit') expect(r.max).toBe(50);
  });

  // tier3 -------------------------------------------------------------------
  it('tier3 @ 0.20 m → max 15 (thin band)', () => {
    const r = tab6Limit('tier3', 0.20);
    expect(r.kind).toBe('limit');
    if (r.kind === 'limit') expect(r.max).toBe(15);
  });

  it('tier3 @ 0.30 m → max 30 (thick band, boundary inclusive)', () => {
    const r = tab6Limit('tier3', 0.30);
    expect(r.kind).toBe('limit');
    if (r.kind === 'limit') expect(r.max).toBe(30);
  });

  // indeterminate -----------------------------------------------------------
  it('tier null → {kind:"indeterminate"}', () => {
    const r = tab6Limit(null, 0.30);
    expect(r.kind).toBe('indeterminate');
  });

  it('tier2 with thickness null → {kind:"indeterminate"}', () => {
    const r = tab6Limit('tier2', null);
    expect(r.kind).toBe('indeterminate');
  });

  it('unknown tier string (cast) → {kind:"indeterminate"}', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = tab6Limit('tier4_unknown' as any, 0.30);
    expect(r.kind).toBe('indeterminate');
  });
});

// ---------------------------------------------------------------------------
// tab6LoadingCheck — full check including ratio computation
// ---------------------------------------------------------------------------
describe('tab6LoadingCheck', () => {
  // PLT-HS-01: high-load surface (A_C=4836.43, A_S_m=45, BBZ=0.30)
  describe('PLT-HS-01 — realistic high-load scenario', () => {
    it('tier2 @0.30 → ratio≈107.48, limit=50, FAIL', () => {
      const r = tab6LoadingCheck({ A_C: 4836.43, A_S_m: 45, tier: 'tier2', bbzThicknessM: 0.30 });
      expect(r.kind).toBe('evaluated');
      if (r.kind === 'evaluated') {
        expect(r.ratio).toBeCloseTo(107.476, 2);
        expect(r.limit).toBe(50);
        expect(r.pass).toBe(false);
      }
    });

    it('tier3 @0.30 → ratio≈107.48, limit=30, FAIL', () => {
      const r = tab6LoadingCheck({ A_C: 4836.43, A_S_m: 45, tier: 'tier3', bbzThicknessM: 0.30 });
      expect(r.kind).toBe('evaluated');
      if (r.kind === 'evaluated') {
        expect(r.ratio).toBeCloseTo(107.476, 2);
        expect(r.limit).toBe(30);
        expect(r.pass).toBe(false);
      }
    });
  });

  // PASS / FAIL boundary for tier3 @0.30 (limit=30)
  it('PASS: A_C=20, A_S_m=1, tier3 @0.30 → ratio=20, limit=30, pass=true', () => {
    const r = tab6LoadingCheck({ A_C: 20, A_S_m: 1, tier: 'tier3', bbzThicknessM: 0.30 });
    expect(r.kind).toBe('evaluated');
    if (r.kind === 'evaluated') {
      expect(r.ratio).toBeCloseTo(20, 5);
      expect(r.limit).toBe(30);
      expect(r.pass).toBe(true);
    }
  });

  it('FAIL: A_C=40, A_S_m=1, tier3 @0.30 → ratio=40, limit=30, pass=false', () => {
    const r = tab6LoadingCheck({ A_C: 40, A_S_m: 1, tier: 'tier3', bbzThicknessM: 0.30 });
    expect(r.kind).toBe('evaluated');
    if (r.kind === 'evaluated') {
      expect(r.ratio).toBeCloseTo(40, 5);
      expect(r.limit).toBe(30);
      expect(r.pass).toBe(false);
    }
  });

  // Tier 1 — no numeric limit, kind must be 'na'
  it('tier1_none → {kind:"na"}, no pass/fail', () => {
    const r = tab6LoadingCheck({ A_C: 500, A_S_m: 10, tier: 'tier1_none', bbzThicknessM: 0.25 });
    expect(r.kind).toBe('na');
  });

  it('tier1_none with A_C null → {kind:"na"} (ratio null, still no fail)', () => {
    const r = tab6LoadingCheck({ A_C: null, A_S_m: 10, tier: 'tier1_none', bbzThicknessM: 0.25 });
    expect(r.kind).toBe('na');
    if (r.kind === 'na') expect(r.ratio).toBeNull();
  });

  // Missing/zero inputs → indeterminate (for tier2/3)
  it('A_S_m = 0 → ratio null → {kind:"indeterminate"} for tier2', () => {
    const r = tab6LoadingCheck({ A_C: 100, A_S_m: 0, tier: 'tier2', bbzThicknessM: 0.30 });
    expect(r.kind).toBe('indeterminate');
    if (r.kind === 'indeterminate') expect(r.ratio).toBeNull();
  });

  it('A_C null → ratio null → {kind:"indeterminate"} for tier3', () => {
    const r = tab6LoadingCheck({ A_C: null, A_S_m: 10, tier: 'tier3', bbzThicknessM: 0.30 });
    expect(r.kind).toBe('indeterminate');
    if (r.kind === 'indeterminate') expect(r.ratio).toBeNull();
  });

  it('tier1_none + A_S_m=0 → {kind:"na"} (no limit, ratio null — tier1 overrides)', () => {
    const r = tab6LoadingCheck({ A_C: 100, A_S_m: 0, tier: 'tier1_none', bbzThicknessM: 0.25 });
    expect(r.kind).toBe('na');
  });

  // Unset tier
  it('tier null → {kind:"indeterminate"} regardless of ratio', () => {
    const r = tab6LoadingCheck({ A_C: 100, A_S_m: 10, tier: null, bbzThicknessM: 0.30 });
    expect(r.kind).toBe('indeterminate');
    if (r.kind === 'indeterminate') {
      // ratio IS computed even when tier is unset — carry it through
      expect(r.ratio).toBeCloseTo(10, 5);
    }
  });

  // Boundary ratio exactly equals limit → PASS (≤ is inclusive)
  it('ratio exactly equals limit (30) → pass=true', () => {
    const r = tab6LoadingCheck({ A_C: 30, A_S_m: 1, tier: 'tier2', bbzThicknessM: 0.20 });
    expect(r.kind).toBe('evaluated');
    if (r.kind === 'evaluated') {
      expect(r.ratio).toBeCloseTo(30, 5);
      expect(r.limit).toBe(30);
      expect(r.pass).toBe(true);
    }
  });
});
