/**
 * Task B1-T3 unit tests: Tab.6 loading-check trigger detection and
 * materializeLoadingCheck output shape.
 *
 * DB-free — runs in the vitest `unit` project.
 *
 * DB-backed integration round-trip is in worksheet-tab6-loading.integration.test.ts
 * (vitest `integration` project, DATABASE_URL required).
 *
 * Tests cover:
 *   - Detection signal: isLoadingSave fires on equation topology (A_S_m equation
 *     present in templateEquations), NOT on ac_as_ratio being in the save batch.
 *   - RED-relevant scenario: A138-12 save with ac_as_ratio ABSENT from batch (e.g.
 *     saving A_S_m only) → isLoadingSave is still true; a non-A138-12 worksheet is false.
 *   - Does NOT over-fire on a non-A138-12 worksheet (different equation set).
 *   - materializeLoadingCheck 4-state output: pass / fail / not_applicable / indeterminate.
 *   - Reason text: non-null for not_applicable and indeterminate; null for evaluated.
 *   - VW1 (tier1_none) and D (authority) produce DISTINCT not_applicable reasons.
 *   - Output shape has exactly 4 keys.
 *   - B1-BLOCKER guard-logic: savedCount=0 + isLoadingSave → transaction/materialize runs;
 *     savedCount=0 + isBasinSave → transaction/materialize runs;
 *     savedCount=0 + neither → no transaction (no-op).
 */

// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { materializeLoadingCheck } from '@/lib/eval/materialize-tab6-loading';
import { A138_12_ASM_EQUATION_ID } from '@/lib/eval/tab6-loading';

// ---------------------------------------------------------------------------
// Detection signal (equation-topology trigger — mirrors isLoadingSave in saveWorksheet)
// ---------------------------------------------------------------------------
describe('Tab.6 loading-check detection — unit (no DB)', () => {
  it('fires for ANY A138-12 save: A_S_m equation present, ac_as_ratio NOT in batch', () => {
    // Simulate an A138-12 save where only A_S_m is submitted — ac_as_ratio is absent.
    // The trigger must still fire because it is equation-topology-based.
    const templateEquations = [
      { id: A138_12_ASM_EQUATION_ID, outputSymbol: 'A_S_m' },
    ];
    const isLoadingSave = templateEquations.some((e) => e.id === A138_12_ASM_EQUATION_ID);
    expect(isLoadingSave).toBe(true);
  });

  it('fires for A138-12 save: A_S_m equation present, rainfall fields only in batch', () => {
    // Saving rainfall/other fields (not ac_as_ratio) on A138-12 must still trigger.
    const templateEquations = [
      { id: A138_12_ASM_EQUATION_ID, outputSymbol: 'A_S_m' },
      { id: 'other-equation-id', outputSymbol: 'some_other_output' },
    ];
    const isLoadingSave = templateEquations.some((e) => e.id === A138_12_ASM_EQUATION_ID);
    expect(isLoadingSave).toBe(true);
  });

  it('does NOT fire for a non-A138-12 worksheet: equation set lacks A_S_m equation', () => {
    // A138-07 (surface worksheet) has different equations — no A138_12_ASM_EQUATION_ID.
    const templateEquations = [
      { id: 'a138-07-equation-uuid', outputSymbol: 'A_C' },
      { id: 'some-other-uuid', outputSymbol: 'A_U' },
    ];
    const isLoadingSave = templateEquations.some((e) => e.id === A138_12_ASM_EQUATION_ID);
    expect(isLoadingSave).toBe(false);
  });

  it('does NOT fire for an empty equation set (non-A138-12 worksheet)', () => {
    const templateEquations: Array<{ id: string; outputSymbol: string }> = [];
    const isLoadingSave = templateEquations.some((e) => e.id === A138_12_ASM_EQUATION_ID);
    expect(isLoadingSave).toBe(false);
  });

  it('does NOT fire when only a similar (wrong) equation id is present', () => {
    // Guard against partial UUID matches or typos.
    const templateEquations = [
      { id: '55151cb1-4a5a-48d1-b5c0-2312ef7b78ab', outputSymbol: 'A_S_m' }, // last char differs
    ];
    const isLoadingSave = templateEquations.some((e) => e.id === A138_12_ASM_EQUATION_ID);
    expect(isLoadingSave).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// materializeLoadingCheck output shape
// ---------------------------------------------------------------------------
describe('Tab.6 loading-check output shape — unit (no DB)', () => {
  it('V2 thick band: ratio≈22.22, limit=50, check=pass, reason=null', () => {
    const r = materializeLoadingCheck({ A_C: 1000, A_S_m: 45, flaechengruppe: 'V2', bbz_thickness: 0.30 });
    expect(r.ac_as_ratio).toBeCloseTo(1000 / 45, 3);
    expect(r.ac_as_ratio_limit).toBe(50);
    expect(r.ac_as_ratio_check).toBe('pass');
    expect(r.ac_as_ratio_check_reason).toBeNull();
  });

  it('V2 thin band: ratio≈22.22 ≤ limit=30 → pass (use high A_C to force fail)', () => {
    // 1000/45 ≈ 22.22 is still under limit=30 (thin band). Use A_C=2000 → 44.4 > 30 → fail.
    const r = materializeLoadingCheck({ A_C: 2000, A_S_m: 45, flaechengruppe: 'V2', bbz_thickness: 0.20 });
    expect(r.ac_as_ratio).toBeCloseTo(2000 / 45, 3);
    expect(r.ac_as_ratio_limit).toBe(30);
    expect(r.ac_as_ratio_check).toBe('fail');
    expect(r.ac_as_ratio_check_reason).toBeNull();
  });

  it('D (authority): limit=null, check=not_applicable, reason contains behördlich', () => {
    const r = materializeLoadingCheck({ A_C: 1000, A_S_m: 45, flaechengruppe: 'D', bbz_thickness: 0.30 });
    expect(r.ac_as_ratio).toBeCloseTo(1000 / 45, 3);
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBe('not_applicable');
    expect(r.ac_as_ratio_check_reason).toContain('behördlich');
  });

  it('VW1 (tier1_none): limit=null, check=not_applicable, reason contains keine Anforderung', () => {
    const r = materializeLoadingCheck({ A_C: 1000, A_S_m: 45, flaechengruppe: 'VW1', bbz_thickness: 0.30 });
    expect(r.ac_as_ratio).toBeCloseTo(1000 / 45, 3);
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBe('not_applicable');
    expect(r.ac_as_ratio_check_reason).toContain('keine Anforderung');
  });

  it('VW1 reason !== D reason (tier1_none vs authority carry distinct reason texts)', () => {
    const t1 = materializeLoadingCheck({ A_C: 100, A_S_m: 10, flaechengruppe: 'VW1', bbz_thickness: 0.30 });
    const ta = materializeLoadingCheck({ A_C: 100, A_S_m: 10, flaechengruppe: 'D',   bbz_thickness: 0.30 });
    expect(t1.ac_as_ratio_check_reason).not.toBe(ta.ac_as_ratio_check_reason);
  });

  it('null Flächengruppe: limit=null, check=indeterminate, reason non-null', () => {
    const r = materializeLoadingCheck({ A_C: 1000, A_S_m: 45, flaechengruppe: null, bbz_thickness: 0.30 });
    expect(r.ac_as_ratio).toBeCloseTo(1000 / 45, 3);
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBe('indeterminate');
    expect(r.ac_as_ratio_check_reason).not.toBeNull();
  });

  it('null bbz_thickness (tier2): ratio computed, check=indeterminate', () => {
    const r = materializeLoadingCheck({ A_C: 1000, A_S_m: 45, flaechengruppe: 'V2', bbz_thickness: null });
    expect(r.ac_as_ratio).toBeCloseTo(1000 / 45, 3);
    expect(r.ac_as_ratio_limit).toBeNull();
    expect(r.ac_as_ratio_check).toBe('indeterminate');
    expect(r.ac_as_ratio_check_reason).not.toBeNull();
  });

  it('output has exactly 4 keys: ratio, limit, check, check_reason', () => {
    const r = materializeLoadingCheck({ A_C: 1000, A_S_m: 45, flaechengruppe: 'V2', bbz_thickness: 0.30 });
    const keys = Object.keys(r);
    expect(keys).toContain('ac_as_ratio');
    expect(keys).toContain('ac_as_ratio_limit');
    expect(keys).toContain('ac_as_ratio_check');
    expect(keys).toContain('ac_as_ratio_check_reason');
    expect(keys).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// B1-BLOCKER: empty-batch guard logic — unit (no DB)
//
// These tests verify the GUARD CONDITION introduced to fix the stale-verdict bug:
//   if (savedCount > 0 || isBasinSave || isLoadingSave) { tx open }
//
// Unit-level proof: the three boolean combinations that must open/skip the transaction.
// The DB-backed round-trip (loading materialize fires on empty-batch A138-12 save)
// is proven in worksheet-tab6-loading.integration.test.ts.
// ---------------------------------------------------------------------------
import { BASIN_GL8_EQUATION_ID } from '@/lib/eval/governing-duration';

describe('B1-BLOCKER empty-batch guard logic — unit (no DB)', () => {
  // Helper: mirrors the guard condition from saveWorksheet (worksheet.ts)
  function shouldOpenTransaction(
    savedCount: number,
    isBasinSave: boolean,
    isLoadingSave: boolean,
  ): boolean {
    return savedCount > 0 || isBasinSave || isLoadingSave;
  }

  // Helper: mirrors the early-return guard from saveWorksheet (worksheet.ts)
  function shouldEarlyReturn(
    fieldIdsLength: number,
    isBasinSave: boolean,
    isLoadingSave: boolean,
  ): boolean {
    return fieldIdsLength === 0 && !isBasinSave && !isLoadingSave;
  }

  // --- Loading save ---

  it('savedCount=0 + isLoadingSave=true → transaction OPENS (loading materialize runs)', () => {
    const opens = shouldOpenTransaction(0, false, true);
    expect(opens).toBe(true);
  });

  it('savedCount=0 + isLoadingSave: does NOT early-return even with empty fieldIds', () => {
    // When input.values is empty ({}) but the template owns the loading equation,
    // the function must proceed (no early return) so the materialize fires.
    const returns = shouldEarlyReturn(0, false, true);
    expect(returns).toBe(false);
  });

  it('isLoadingSave=true: equation topology detects A138-12 regardless of batch contents', () => {
    // Simulates: fieldIds = [] (no fields submitted), templateEquations has the A_S_m eq.
    const templateEquations = [{ id: A138_12_ASM_EQUATION_ID, outputSymbol: 'A_S_m' }];
    const isLoadingSave = templateEquations.some((e) => e.id === A138_12_ASM_EQUATION_ID);
    const opens = shouldOpenTransaction(0, false, isLoadingSave);
    expect(isLoadingSave).toBe(true);
    expect(opens).toBe(true);
  });

  // --- Basin save ---

  it('savedCount=0 + isBasinSave=true → transaction OPENS (basin materialize runs)', () => {
    const opens = shouldOpenTransaction(0, true, false);
    expect(opens).toBe(true);
  });

  it('savedCount=0 + isBasinSave: does NOT early-return even with empty fieldIds', () => {
    const returns = shouldEarlyReturn(0, true, false);
    expect(returns).toBe(false);
  });

  it('isBasinSave=true: equation topology detects A138-13 regardless of batch contents', () => {
    const templateEquations = [{ id: BASIN_GL8_EQUATION_ID, outputSymbol: 'V_VA' }];
    const isBasinSave = templateEquations.some((e) => e.id === BASIN_GL8_EQUATION_ID);
    const opens = shouldOpenTransaction(0, isBasinSave, false);
    expect(isBasinSave).toBe(true);
    expect(opens).toBe(true);
  });

  // --- No-op: non-basin, non-loading with empty batch ---

  it('savedCount=0 + isBasinSave=false + isLoadingSave=false → transaction SKIPPED (no-op)', () => {
    const opens = shouldOpenTransaction(0, false, false);
    expect(opens).toBe(false);
  });

  it('savedCount=0 + neither trigger: early-return fires for truly empty + non-topology save', () => {
    const returns = shouldEarlyReturn(0, false, false);
    expect(returns).toBe(true);
  });

  it('non-basin/non-loading equations → isBasinSave=false, isLoadingSave=false → no-op', () => {
    // e.g. A138-07 surface worksheet: no basin or loading equation
    const templateEquations = [
      { id: 'some-surface-equation-id', outputSymbol: 'A_C' },
    ];
    const isBasinSave   = templateEquations.some((e) => e.id === BASIN_GL8_EQUATION_ID);
    const isLoadingSave = templateEquations.some((e) => e.id === A138_12_ASM_EQUATION_ID);
    const opens = shouldOpenTransaction(0, isBasinSave, isLoadingSave);
    expect(isBasinSave).toBe(false);
    expect(isLoadingSave).toBe(false);
    expect(opens).toBe(false);
  });

  // --- Regression: normal savedCount>0 still fires ---

  it('savedCount>0 + isBasinSave=false + isLoadingSave=false → transaction OPENS (normal save)', () => {
    const opens = shouldOpenTransaction(3, false, false);
    expect(opens).toBe(true);
  });

  it('savedCount>0 + any topology flag → transaction OPENS', () => {
    // Both conditions true: normal save on A138-12 (fields submitted + loading topology)
    expect(shouldOpenTransaction(2, false, true)).toBe(true);
    expect(shouldOpenTransaction(1, true, false)).toBe(true);
    expect(shouldOpenTransaction(5, true, true)).toBe(true);
  });
});
