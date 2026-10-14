/**
 * C-9 (2026-10-14): which antecedent made a guard-skipped pass vacuous? `skippedGuardSymbols` returns the symbols of the
 * first definitely-false guard on the top guard chain (the same walk as U-6's `guardSkipped`), [] otherwise. Read-only:
 * the verdict comes from `evalCondition` alone.
 */
import { describe, it, expect } from 'vitest';
import { evalCondition, skippedGuardSymbols } from '../evaluate';
import type { Scope } from '../scope';

const sc = (vals: Record<string, number | string | boolean | null>): Scope => ({ symbol: (s) => (s in vals ? vals[s] : undefined) });
// DWA-M 820-2 REQ-43 / REQ-52 as encoded in block 20261008100000.
const REQ43 = "IF verantwortung_lph8 != 'entfaellt' THEN (IF phase_ausfuehrung_erreicht == true THEN (quality_supervision_active == true))";
const REQ52 = "IF verantwortung_lph9 != 'entfaellt' THEN (IF bauleistungen_vergeben == true THEN (IF phase_gewaehrleistung_erreicht == true THEN (defect_tracking_active == true)))";

describe('skippedGuardSymbols', () => {
  it('phase driver Nein ⇒ the inner guard skipped; it names the driver (verdict pass/guardSkipped unchanged)', () => {
    const s = sc({ verantwortung_lph8: 'auftragnehmer', phase_ausfuehrung_erreicht: false });
    const hidden = new Set(['quality_supervision_active']);
    expect(evalCondition(REQ43, s, { hiddenSymbols: hidden })).toEqual({ kind: 'pass', guardSkipped: true });
    expect(skippedGuardSymbols(REQ43, s, { hiddenSymbols: hidden })).toEqual(['phase_ausfuehrung_erreicht']);
  });

  it('an OUTER guard false (LPH 8 entfällt) ⇒ names that guard, not the phase driver', () => {
    const s = sc({ verantwortung_lph8: 'entfaellt', phase_ausfuehrung_erreicht: false });
    expect(skippedGuardSymbols(REQ43, s)).toEqual(['verantwortung_lph8']);
  });

  it('a middle guard false (no construction award) ⇒ names bauleistungen_vergeben, not the phase', () => {
    const s = sc({ verantwortung_lph9: 'auftragnehmer', bauleistungen_vergeben: false, phase_gewaehrleistung_erreicht: false });
    expect(skippedGuardSymbols(REQ52, s)).toEqual(['bauleistungen_vergeben']);
  });

  it('phase reached ⇒ nothing skipped (pass or fail is a real check)', () => {
    const s = sc({ verantwortung_lph8: 'auftragnehmer', phase_ausfuehrung_erreicht: true, quality_supervision_active: false });
    expect(evalCondition(REQ43, s)).toEqual({ kind: 'fail' });
    expect(skippedGuardSymbols(REQ43, s)).toEqual([]);
  });

  it('driver unanswered (pending) or hidden (n/a) ⇒ nothing skipped', () => {
    expect(skippedGuardSymbols(REQ43, sc({ verantwortung_lph8: 'auftragnehmer' }))).toEqual([]);
    expect(skippedGuardSymbols(REQ43, sc({ verantwortung_lph8: 'auftragnehmer', phase_ausfuehrung_erreicht: false }), { hiddenSymbols: new Set(['phase_ausfuehrung_erreicht']) })).toEqual([]);
  });

  it('a plain condition or an unparseable one ⇒ []', () => {
    expect(skippedGuardSymbols('x >= 1', sc({ x: 0 }))).toEqual([]);
    expect(skippedGuardSymbols('Engineer attestation', sc({}))).toEqual([]);
  });
});
