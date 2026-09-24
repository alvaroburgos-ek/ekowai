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

/**
 * DEMO (D1) — the gate on REAL, currently-encoded DWA-A-138-1 formulas.
 * Field set = real active 138 field symbols (subset incl. every symbol below).
 * Shows the gate catching mis-encodings the old manual whitelist trusted, and
 * NOT over-rejecting a faithful formula.
 */
describe('E1-A DEMO — faithfulness gate on REAL DWA-A-138-1 encodings', () => {
  const f138 = new Set([
    's_F', 'b_R', 'h_R', 'az', 'd_a', 'd_i', 'r_D_n', 'A_C', 'A_VA', 'A_E_ba',
    'C_S', 'Q_S', 'Q_Dr', 'D', 'V_VA', 'k_i', 'A_S_m', 'h_M', 'f_Z',
  ]);

  it('A138-18:22 (s_R) — was human-WHITELISTED, yet references bare `d` (fields are d_a/d_i) → CAUGHT, flagged, unresolved=[d]', () => {
    const r = validateEngineEligibility(
      's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi * d^2/4) * ((1/s_F) - 1))',
      ['s_F', 'b_R', 'h_R', 'az', 'd'],
      f138,
    );
    expect(r.verified).toBe(false);
    expect(r.verified === false && r.unresolved).toContain('d');
  });

  it('A138-26:10 (V_Rueck) — SUM() aggregate + A_E_b_a (field is A_E_ba) → NOT verified (not silently computed)', () => {
    const r = validateEngineEligibility(
      'V_Rueck = ((r_D(T_n_Ue) * (SUM(A_E_b_a * C_S) + A_VA) / 10000) - (Q_S + Q_Dr)) * D * 60 / 1000 - V_VA >= 0',
      ['r_D(T_n_Ue)', 'A_E_b_a', 'C_S', 'A_VA', 'Q_S', 'Q_Dr', 'D', 'V_VA'],
      f138,
    );
    expect(r.verified).toBe(false);
  });

  it('A138-10:3 (Q_zu) — faithful encoding → verified (gate does not over-reject)', () => {
    const r = validateEngineEligibility(
      'Q_zu = r_D(n) * (A_C + A_VA) * 10^-4',
      ['r_D(n)', 'A_C', 'A_VA'],
      f138,
    );
    expect(r.verified).toBe(true);
  });
});

/**
 * Plan 2a — the gate learns the expr function set: a call to a supported
 * function (math, row, logic) is no longer "kein reiner Ausdruck"; only calls
 * to names canonicalFunctionName() rejects (SUM, Σ-style aggregates, unknown
 * helpers) fail check (1), and the reason names them.
 */
describe('validateEngineEligibility — Plan 2a: expr function set', () => {
  it('Plan 2a: supported calls pass, SUM still fails', () => {
    const f = new Set(['surface_inventory', 'A_C']);
    expect(validateEngineEligibility('A_C = sum_rows(surface_inventory, area_m2 * c_i)', ['surface_inventory'], f).verified).toBe(true);
    // SUM with the same arg shape as the sum_rows call above. NOT asserted here:
    // single-token `SUM(x)` — the normaliser's FN_LIKE rewrites it to the phantom
    // symbol `SUM_x` before the gate runs (pre-existing, identical on HEAD; see the
    // COMMA_SUBSCRIPT inventory rule in scripts/reasoning-map/validate.mjs).
    expect(validateEngineEligibility('A_C = SUM(surface_inventory, area_m2 * c_i)', ['surface_inventory'], f).verified).toBe(false);
    expect(validateEngineEligibility('x = sqrt(A_C)', ['A_C'], f).verified).toBe(true);
  });

  it('Plan 2a: the failure reason names the unsupported function(s); supported ones are not listed', () => {
    const f = new Set(['A_C', 'reg']);
    const r = validateEngineEligibility('y = SUM(A_C * 2) + foo(reg + 1) + count_rows(reg)', ['A_C', 'reg'], f);
    expect(r.verified).toBe(false);
    if (!r.verified) {
      expect(r.reason).toMatch(/nicht unterstützte Funktion/);
      expect(r.reason).toContain('SUM');
      expect(r.reason).toContain('foo');
      expect(r.reason).not.toContain('count_rows');
      expect(r.unresolved).toEqual([]);
    }
  });

  it('Plan 2a: upper-case math calls (EXP, SQRT) and lg are supported; bare log is not', () => {
    const f = new Set(['A_C']);
    expect(validateEngineEligibility('x = EXP(A_C) + SQRT(A_C) + lg(A_C)', ['A_C'], f).verified).toBe(true);
    expect(validateEngineEligibility('x = log(A_C)', ['A_C'], f).verified).toBe(false);
  });

  it('Plan 2a: check (2) still runs after a supported call passes check (1)', () => {
    const f = new Set(['A_C']);
    const r = validateEngineEligibility('x = sqrt(zzz)', ['zzz'], f);
    expect(r.verified).toBe(false);
    if (!r.verified) expect(r.unresolved).toEqual(['zzz']);
  });
});

describe('Task 4 review items (folded into Task 4b)', () => {
  it('Plan 2a: IF( keyword form is a supported call', () => {
    expect(validateEngineEligibility('x = IF(A_C > 1, 1, 0)', ['A_C'], new Set(['A_C', 'x'])).verified).toBe(true);
  });
});

/**
 * Plan 3 final wave C · item 1 — the CALL regex misread a BOOLEAN CONNECTIVE
 * followed by a parenthesised group as a function call.
 *
 * `if(a > 1 AND (b < 2 OR c > 3), x, y)` is a legal Plan-2a formula (the parser
 * groups with parentheses), but `AND (` matched `([A-Za-z_][A-Za-z0-9_]*)\s*\(`
 * and `canonicalFunctionName('AND')` is null, so the emitter REFUSED the
 * equation as "nicht unterstützte Funktion/Aggregat im Formeltext (AND)".
 * Found by ISO-59020; the corpus worked around it by leaving formula-level
 * compound conditions unparenthesised and parenthesising them only in STAGED
 * gate text. A language KEYWORD (`and` / `or` / `not` / `is` / `in` / `then` /
 * `null` / `empty` / `true` / `false`) followed by `(` is a connective, never a
 * call; `if(` stays a genuine call and keeps passing through
 * `canonicalFunctionName`.
 */
describe('Plan 3 final wave C — a boolean connective before a parenthesised group is not a CALL', () => {
  const f = new Set(['a', 'b', 'c', 'x', 'y']);
  const syms = ['a', 'b', 'c', 'x', 'y'];

  it('AND before a parenthesised group is accepted (ISO-59020 refusal)', () => {
    expect(validateEngineEligibility('if(a > 1 AND (b < 2 OR c > 3), x, y)', syms, f).verified).toBe(true);
  });

  it('OR / NOT / lower-case spellings before a parenthesised group are accepted too', () => {
    expect(validateEngineEligibility('if(a > 1 OR (b < 2), x, y)', syms, f).verified).toBe(true);
    expect(validateEngineEligibility('if(NOT (b < 2), x, y)', syms, f).verified).toBe(true);
    expect(validateEngineEligibility('if(a > 1 and (b < 2 or c > 3), x, y)', syms, f).verified).toBe(true);
  });

  it('a genuine unsupported call is still refused (the fix does not widen the gate)', () => {
    // a multi-token argument is NOT rewritten by normalizeFormula, so the CALL test is the one that decides
    const r = validateEngineEligibility('SUM(a + b)', ['a', 'b'], f);
    expect(r.verified).toBe(false);
    if (!r.verified) expect(r.reason).toContain('SUM');
    expect(validateEngineEligibility('log(a)', ['a'], f).verified).toBe(false);
  });

  it('`if(` remains a supported call (it is a keyword AND a function)', () => {
    expect(validateEngineEligibility('if(a > 1, x, y)', syms, f).verified).toBe(true);
  });
});
