/**
 * TDD tests for Tab.6 hydraulic-loading helper (DWA-A 138-1 §5.2.3.2 + Tab.6).
 * Written BEFORE implementation — must fail on first run (RED).
 */
import { describe, it, expect } from 'vitest';
import { tab6Limit, tab6LoadingCheck, flaechengruppeToTier, FLAECHENGRUPPE_CODES } from '../tab6-loading';

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

  // authority tier -----------------------------------------------------------
  it('authority → {kind:"none"} regardless of thickness', () => {
    const r = tab6Limit('authority', 0.30);
    expect(r.kind).toBe('none');
  });

  it('authority → reason is DISTINCT from tier1_none reason', () => {
    const r1 = tab6Limit('tier1_none', 0.30);
    const ra = tab6Limit('authority', 0.30);
    expect(r1.kind).toBe('none');
    expect(ra.kind).toBe('none');
    if (r1.kind === 'none' && ra.kind === 'none') {
      expect(ra.reason).not.toBe(r1.reason);
      expect(ra.reason).toContain('behördlich');
    }
  });

  it('authority with null thickness → {kind:"none"} (no numeric limit)', () => {
    const r = tab6Limit('authority', null);
    expect(r.kind).toBe('none');
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

  // authority tier in loading check → kind:'na'
  it('authority tier → {kind:"na"} (no numeric limit, ratio still computed)', () => {
    const r = tab6LoadingCheck({ A_C: 4836.43, A_S_m: 45, tier: 'authority', bbzThicknessM: 0.30 });
    expect(r.kind).toBe('na');
    if (r.kind === 'na') {
      expect(r.ratio).toBeCloseTo(107.476, 2);
      expect(r.reason).toContain('behördlich');
    }
  });
});

// ---------------------------------------------------------------------------
// flaechengruppeToTier — Tab.5 Kurzzeichen → Tab.6 tier
// ---------------------------------------------------------------------------
describe('flaechengruppeToTier', () => {
  // tier1_none (keine Anforderung) -------------------------------------------
  it('VW1 → tier1_none', () => expect(flaechengruppeToTier('VW1')).toBe('tier1_none'));
  it('V1  → tier1_none', () => expect(flaechengruppeToTier('V1')).toBe('tier1_none'));
  it('BG1 → tier1_none', () => expect(flaechengruppeToTier('BG1')).toBe('tier1_none'));

  // tier2 (30/50) ------------------------------------------------------------
  it('VW2 → tier2 (correctness case)', () => expect(flaechengruppeToTier('VW2')).toBe('tier2'));
  it('V2  → tier2', () => expect(flaechengruppeToTier('V2')).toBe('tier2'));
  it('BF  → tier2', () => expect(flaechengruppeToTier('BF')).toBe('tier2'));
  it('BG2 → tier2', () => expect(flaechengruppeToTier('BG2')).toBe('tier2'));

  // tier3 (15/30) ------------------------------------------------------------
  it('BL  → tier3 (correctness case)', () => expect(flaechengruppeToTier('BL')).toBe('tier3'));
  it('V3  → tier3', () => expect(flaechengruppeToTier('V3')).toBe('tier3'));
  it('BG3 → tier3', () => expect(flaechengruppeToTier('BG3')).toBe('tier3'));

  // authority (behördlich *) -------------------------------------------------
  it('D   → authority', () => expect(flaechengruppeToTier('D')).toBe('authority'));
  it('SD1 → authority', () => expect(flaechengruppeToTier('SD1')).toBe('authority'));
  it('SD2 → authority', () => expect(flaechengruppeToTier('SD2')).toBe('authority'));
  it('SV  → authority (distinct from SVW)', () => expect(flaechengruppeToTier('SV')).toBe('authority'));
  it('SVW → authority (distinct from SV)',  () => expect(flaechengruppeToTier('SVW')).toBe('authority'));
  it('SF  → authority', () => expect(flaechengruppeToTier('SF')).toBe('authority'));
  it('SL  → authority', () => expect(flaechengruppeToTier('SL')).toBe('authority'));
  it('SG  → authority', () => expect(flaechengruppeToTier('SG')).toBe('authority'));
  it('SA  → authority', () => expect(flaechengruppeToTier('SA')).toBe('authority'));

  // null / unknown -----------------------------------------------------------
  it('null → null (Flächengruppe unset)', () => expect(flaechengruppeToTier(null)).toBeNull());
  it('unknown string → null', () => expect(flaechengruppeToTier('XYZ')).toBeNull());
  it('empty string → null', () => expect(flaechengruppeToTier('')).toBeNull());
});

// ---------------------------------------------------------------------------
// Enum / resolver consistency guard
// Ensures the canonical FLAECHENGRUPPE_CODES list stays in sync with the
// resolver switch, preventing silent drift between the DB enum
// (scripts/migrations/20260702120000_a138_tab6_loading.sql) and the
// flaechengruppeToTier() resolver.
// ---------------------------------------------------------------------------
describe('flaechengruppeToTier — enum/resolver consistency guard', () => {
  it('FLAECHENGRUPPE_CODES contains exactly 19 entries (Tab.5 canonical set incl. BG3)', () => {
    expect(FLAECHENGRUPPE_CODES.length).toBe(19);
  });

  it('every canonical code resolves to a non-null tier (resolver knows all 19)', () => {
    const unknowns: string[] = [];
    for (const code of FLAECHENGRUPPE_CODES) {
      if (flaechengruppeToTier(code) === null) {
        unknowns.push(code);
      }
    }
    expect(unknowns).toEqual([]);
  });

  it('canonical set includes BG3 (previously missing)', () => {
    expect(FLAECHENGRUPPE_CODES).toContain('BG3');
  });
});
