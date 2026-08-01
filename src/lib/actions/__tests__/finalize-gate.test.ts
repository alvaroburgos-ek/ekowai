/**
 * Finalize-gate unit tests (Stage 1 — verification blocking rule, SR-1).
 *
 * Covers the pure decision core `decideFinalizeGate` + the error prose.
 * The DB-bound loader (`checkFinalizeGate`) mirrors the approval-gate
 * loader and is exercised through the transition path.
 */
import { describe, it, expect } from 'vitest';
import {
  decideFinalizeGate,
  formatFinalizeGateError,
  VERIFIED_OK,
} from '../finalize-gate';

const row = (over: Partial<{
  symbol: string; labelDe: string; isRequired: boolean;
  verificationStatus: string; hasValue: boolean;
}> = {}) => ({
  symbol: 'k_f',
  labelDe: 'Durchlässigkeitsbeiwert',
  isRequired: false,
  verificationStatus: 'imported_unverified',
  hasValue: false,
  ...over,
});

describe('decideFinalizeGate', () => {
  it('passes when every used field is verified', () => {
    const r = decideFinalizeGate([
      row({ verificationStatus: 'engineer_verified', hasValue: true }),
      row({ symbol: 'A_s', verificationStatus: 'verified_against_standard', isRequired: true }),
    ]);
    expect(r.ok).toBe(true);
    expect(r.unverifiedFields).toHaveLength(0);
  });

  it('blocks on an unverified field WITH a saved value, and lists it', () => {
    const r = decideFinalizeGate([row({ hasValue: true })]);
    expect(r.ok).toBe(false);
    expect(r.unverifiedFields).toEqual([
      { symbol: 'k_f', labelDe: 'Durchlässigkeitsbeiwert', verificationStatus: 'imported_unverified' },
    ]);
  });

  it('blocks on an unverified REQUIRED field even without a value', () => {
    const r = decideFinalizeGate([row({ isRequired: true })]);
    expect(r.ok).toBe(false);
  });

  it('ignores unverified fields that are unused (no value, not required)', () => {
    const r = decideFinalizeGate([row()]);
    expect(r.ok).toBe(true);
  });

  it('counts corrected as verified, disputed as NOT verified', () => {
    expect(decideFinalizeGate([row({ verificationStatus: 'corrected', hasValue: true })]).ok).toBe(true);
    expect(decideFinalizeGate([row({ verificationStatus: 'disputed', hasValue: true })]).ok).toBe(false);
  });

  it('VERIFIED_OK is exactly the three verified-equivalent states', () => {
    expect([...VERIFIED_OK].sort()).toEqual(
      ['corrected', 'engineer_verified', 'verified_against_standard'],
    );
  });
});

describe('formatFinalizeGateError', () => {
  it('names the rule and lists every field', () => {
    const r = decideFinalizeGate([
      row({ hasValue: true }),
      row({ symbol: 'A_s', labelDe: 'Sickerfläche', hasValue: true }),
    ]);
    const msg = formatFinalizeGateError(r);
    expect(msg).toMatch(/Finalisierung abgelehnt/);
    expect(msg).toMatch(/unverifizierte Felder/i);
    expect(msg).toContain('k_f');
    expect(msg).toContain('Sickerfläche');
  });
});
