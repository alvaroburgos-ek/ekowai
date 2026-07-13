import { describe, it, expect } from 'vitest';
import { validateEngineEligibility } from '../engine-eligibility';

/**
 * E1-A class-(i) faithfulness gate: parse + symbol-resolution validation.
 *
 * Catches machine-detectable mis-encodings (gap-class 3, §10e) — a formula that
 * fails to parse OR references a symbol resolving to no active field (exact case,
 * after fn(x)->fn_x normalization). Class (ii) valid-but-unfaithful (A138-18:18
 * missing x10^3) is NOT parse/resolution-detectable and stays in the static
 * deny-set — out of scope here by design.
 */
describe('validateEngineEligibility — class (i) parse + symbol-resolution gate', () => {
  const fields = new Set(['r_D_n', 'A_C', 'A_VA', 'A_E_ba', 'C_S', 'k_i', 'A_S', 'h_M', 'D', 'f_Z']);

  it('faithful formula (fn-style r_D(n) normalizes to a real field) → verified', () => {
    const r = validateEngineEligibility(
      'Q_zu = r_D(n) * (A_C + A_VA) * 10^-4',
      ['r_D(n)', 'A_C', 'A_VA'],
      fields,
    );
    expect(r.verified).toBe(true);
  });

  it('REAL gap-class-3: input symbol A_E_b_a resolves to no field (actual is A_E_ba) → NOT verified', () => {
    // DWA-A-138-1 A138-26:10 encodes A_E_b_a; the field is A_E_ba (extra underscore).
    const r = validateEngineEligibility(
      'x = A_E_b_a * C_S',
      ['A_E_b_a', 'C_S'],
      fields,
    );
    expect(r.verified).toBe(false);
    if (!r.verified) {
      expect(r.unresolved).toContain('A_E_b_a');
      expect(r.reason).toMatch(/nicht engine-verifiziert/i);
    }
  });

  it('mis-cased symbol (A_c vs A_C) → NOT verified (engine is case-sensitive)', () => {
    const r = validateEngineEligibility('y = A_c * k_i', ['A_c', 'k_i'], fields);
    expect(r.verified).toBe(false);
  });

  it('parse failure: unsupported aggregate/function survives normalization → NOT verified', () => {
    const r = validateEngineEligibility('z = SUM(A_E_ba * C_S)', ['A_E_ba', 'C_S'], fields);
    expect(r.verified).toBe(false);
  });

  it('numeric literals and math constants are not treated as unresolved symbols', () => {
    const r = validateEngineEligibility('w = A_S * k_i * 10^-7', ['A_S', 'k_i'], fields);
    expect(r.verified).toBe(true);
  });
});
