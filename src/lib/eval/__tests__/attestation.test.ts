import { describe, it, expect } from 'vitest';
import { isAttestationCondition } from '../attestation';

describe('isAttestationCondition', () => {
  it('matches the bare "engineer-verified" placeholder', () => {
    expect(isAttestationCondition('engineer-verified')).toBe(true);
    expect(isAttestationCondition('  engineer-verified ')).toBe(true);
    expect(isAttestationCondition('Engineer-Verified')).toBe(true);
  });

  it('matches "verify Gl. X" placeholders', () => {
    expect(isAttestationCondition('verify Gl. 2')).toBe(true);
    expect(isAttestationCondition('verify Gl. 8 iterated')).toBe(true);
    expect(isAttestationCondition('VERIFY Gl. 5/6')).toBe(true);
  });

  it('does NOT match parseable conditions', () => {
    expect(isAttestationCondition('a138_applicable == TRUE')).toBe(false);
    expect(isAttestationCondition('gw_clearance >= 1.0')).toBe(false);
    expect(isAttestationCondition('k_f IS NOT NULL AND permeability_test_method IS NOT NULL')).toBe(
      false,
    );
    expect(isAttestationCondition('water_protection_zone != zone_I')).toBe(false);
  });

  it('does NOT match broken-rule conditions (paren IN syntax, malformed predicates)', () => {
    // These return `manual` from the evaluator, but they are NOT
    // attestation placeholders — they are bugs that need engineer
    // intervention to fix, not engineer attestation to sign off.
    expect(isAttestationCondition("feasibility_determination IN ('Feasible','Conditional')")).toBe(
      false,
    );
    expect(isAttestationCondition('n IN Tab8_values')).toBe(false);
    expect(
      isAttestationCondition('if flood_check_trigger == TRUE then V_Rueck present'),
    ).toBe(false);
  });

  it('the 12 known A138-1 attestation rows are recognised, the 7 broken rows are not', () => {
    const ATTESTATION_ROWS = [
      'engineer-verified', // REQ-18, 20, 24, 25, 26, 28, 29
      'verify Gl. 2', // REQ-10
      'verify Gl. 3', // REQ-11
      'verify Gl. 5/6', // REQ-12
      'verify Gl. 4', // REQ-13
      'verify Gl. 8 iterated', // REQ-14
    ];
    for (const c of ATTESTATION_ROWS) expect(isAttestationCondition(c)).toBe(true);

    const BROKEN_ROWS = [
      'n IN Tab8_values', // REQ-08 — placeholder, dead
      'if flood_check_trigger == TRUE then V_Rueck present', // REQ-22 — malformed predicate
    ];
    for (const c of BROKEN_ROWS) expect(isAttestationCondition(c)).toBe(false);
  });
});
