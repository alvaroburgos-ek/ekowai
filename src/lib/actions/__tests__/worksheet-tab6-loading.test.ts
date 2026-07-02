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
 *   - Detection signal: loadingPresence fires only when ac_as_ratio field is in the
 *     save batch AND belongs to the saved template (mirrors surfacePresence pattern).
 *   - Does NOT fire on a non-A138-12 template save (no over-firing).
 *   - Does NOT fire when ac_as_ratio is absent from the save batch.
 *   - materializeLoadingCheck 4-state output: pass / fail / not_applicable / indeterminate.
 *   - Reason text: non-null for not_applicable and indeterminate; null for evaluated.
 *   - VW1 (tier1_none) and D (authority) produce DISTINCT not_applicable reasons.
 *   - Output shape has exactly 4 keys.
 */

// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { materializeLoadingCheck } from '@/lib/eval/materialize-tab6-loading';

// ---------------------------------------------------------------------------
// Detection signal (logical equivalent of the saveWorksheet loadingPresence check)
// ---------------------------------------------------------------------------
describe('Tab.6 loading-check detection — unit (no DB)', () => {
  it('fires for A138-12 save: ac_as_ratio field IS in the save batch for that template', () => {
    const ws12_id = 'ws12-uuid';
    const ac_as_ratio_field_id = 'field-ac-ratio';
    const fieldMetas = [
      { id: ac_as_ratio_field_id, symbol: 'ac_as_ratio', worksheetTemplateId: ws12_id },
    ];
    const fieldIds = [ac_as_ratio_field_id];
    const presence = fieldMetas.find(
      (f) => fieldIds.includes(f.id) && f.symbol === 'ac_as_ratio' && f.worksheetTemplateId === ws12_id,
    );
    expect(presence).toBeDefined();
  });

  it('does NOT fire for a non-A138-12 template: different template, different symbol', () => {
    const ws07_id = 'ws07-uuid';
    const ac_field_id = 'field-a-c'; // A_C on A138-07, not ac_as_ratio
    const fieldMetas = [
      { id: ac_field_id, symbol: 'A_C', worksheetTemplateId: ws07_id },
    ];
    const fieldIds = [ac_field_id];
    const presence = fieldMetas.find(
      (f) => fieldIds.includes(f.id) && f.symbol === 'ac_as_ratio' && f.worksheetTemplateId === ws07_id,
    );
    expect(presence).toBeUndefined();
  });

  it('does NOT fire for an A138-12 save batch that does NOT include ac_as_ratio', () => {
    const ws12_id = 'ws12-uuid';
    const a_s_m_field_id = 'field-a-s-m';
    const fieldMetas = [
      { id: a_s_m_field_id, symbol: 'A_S_m', worksheetTemplateId: ws12_id },
    ];
    const fieldIds = [a_s_m_field_id];
    const presence = fieldMetas.find(
      (f) => fieldIds.includes(f.id) && f.symbol === 'ac_as_ratio' && f.worksheetTemplateId === ws12_id,
    );
    expect(presence).toBeUndefined();
  });

  it('does NOT fire when ac_as_ratio field belongs to a different template (cross-template spoofing)', () => {
    const ws12_id = 'ws12-uuid';
    const ws07_id = 'ws07-uuid';
    const imposter_id = 'field-imposter'; // symbol=ac_as_ratio but on ws07
    const fieldMetas = [
      { id: imposter_id, symbol: 'ac_as_ratio', worksheetTemplateId: ws07_id },
    ];
    const fieldIds = [imposter_id];
    // The save checks against instance.worksheetTemplateId = ws12, not ws07
    const presence = fieldMetas.find(
      (f) => fieldIds.includes(f.id) && f.symbol === 'ac_as_ratio' && f.worksheetTemplateId === ws12_id,
    );
    expect(presence).toBeUndefined();
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
