import { describe, it, expect } from 'vitest';
import { evaluateCondition } from './evaluate';

function lookup(map: Record<string, unknown>) {
  return (sym: string) => map[sym] as number | string | boolean | null | undefined;
}

describe('evaluateCondition', () => {
  it('passes a numeric ≥ comparison when the value is above the threshold', () => {
    const r = evaluateCondition('k_f >= 1e-6', lookup({ k_f: 5e-6 }));
    expect(r).toEqual({ kind: 'pass' });
  });

  it('fails a numeric ≥ comparison when the value is below the threshold', () => {
    const r = evaluateCondition('k_f >= 1e-6', lookup({ k_f: 1e-7 }));
    expect(r).toEqual({ kind: 'fail' });
  });

  it('handles ≤ with negative results too', () => {
    expect(evaluateCondition('eta_hyd <= 100', lookup({ eta_hyd: 99 }))).toEqual({ kind: 'pass' });
    expect(evaluateCondition('eta_hyd <= 100', lookup({ eta_hyd: 101 }))).toEqual({ kind: 'fail' });
  });

  it('reports missing symbols as pending', () => {
    const r = evaluateCondition('k_f >= 1e-6', lookup({}));
    expect(r.kind).toBe('pending');
    if (r.kind === 'pending') expect(r.missingSymbols).toContain('k_f');
  });

  it('treats null and empty-string as missing', () => {
    expect(evaluateCondition('x >= 1', lookup({ x: null })).kind).toBe('pending');
    expect(evaluateCondition('x >= 1', lookup({ x: '' })).kind).toBe('pending');
  });

  it('IS NOT NULL is pass when value present', () => {
    expect(evaluateCondition('input_documents_register IS NOT NULL', lookup({ input_documents_register: 'foo' }))).toEqual({ kind: 'pass' });
    expect(evaluateCondition('input_documents_register IS NOT NULL', lookup({}))).toEqual({ kind: 'fail' });
  });

  it('IS NOT EMPTY accepts string and number', () => {
    expect(evaluateCondition('register IS NOT EMPTY', lookup({ register: 'a' }))).toEqual({ kind: 'pass' });
    expect(evaluateCondition('register IS NOT EMPTY', lookup({ register: 0 }))).toEqual({ kind: 'pass' });
    expect(evaluateCondition('register IS NOT EMPTY', lookup({ register: '' }))).toEqual({ kind: 'fail' });
  });

  it('boolean equality with True works case-insensitively', () => {
    expect(evaluateCondition('climate_suitability_documented == True', lookup({ climate_suitability_documented: true }))).toEqual({ kind: 'pass' });
    expect(evaluateCondition('climate_suitability_documented == True', lookup({ climate_suitability_documented: false }))).toEqual({ kind: 'fail' });
  });

  it('AND short-circuits to fail when one side is false', () => {
    const cond = 'a >= 1 AND b >= 1';
    expect(evaluateCondition(cond, lookup({ a: 2, b: 0 })).kind).toBe('fail');
    expect(evaluateCondition(cond, lookup({ a: 2, b: 2 })).kind).toBe('pass');
  });

  it('OR short-circuits to pass when one side is true', () => {
    const cond = 'a >= 1 OR b >= 1';
    expect(evaluateCondition(cond, lookup({ a: 0, b: 2 })).kind).toBe('pass');
    expect(evaluateCondition(cond, lookup({ a: 0, b: 0 })).kind).toBe('fail');
  });

  it('IF/THEN passes vacuously when the guard is false', () => {
    const cond = 'IF sedimentation THEN q_A_max <= 4';
    expect(evaluateCondition(cond, lookup({ sedimentation: false })).kind).toBe('pass');
    expect(evaluateCondition(cond, lookup({ sedimentation: true, q_A_max: 5 })).kind).toBe('fail');
    expect(evaluateCondition(cond, lookup({ sedimentation: true, q_A_max: 3 })).kind).toBe('pass');
  });

  it('handles lowercase if/then', () => {
    expect(
      evaluateCondition('if sedimentation then q_A_max <= 4', lookup({ sedimentation: true, q_A_max: 3 })).kind,
    ).toBe('pass');
  });

  it('IN { … } membership for enum-typed values', () => {
    const cond = 'investment_type IN {ersatz, erneuerung}';
    expect(evaluateCondition(cond, lookup({ investment_type: 'ersatz' })).kind).toBe('pass');
    expect(evaluateCondition(cond, lookup({ investment_type: 'neubau' })).kind).toBe('fail');
  });

  it('returns manual for unparseable natural-language conditions', () => {
    expect(evaluateCondition('Engineer attestation', lookup({})).kind).toBe('manual');
    expect(evaluateCondition('alle Werte gemäß §5.7', lookup({})).kind).toBe('manual');
    expect(evaluateCondition('consistent method choice', lookup({})).kind).toBe('manual');
  });

  it('returns manual for empty or whitespace-only', () => {
    expect(evaluateCondition('', lookup({})).kind).toBe('manual');
    expect(evaluateCondition('   ', lookup({})).kind).toBe('manual');
  });

  it('a bare boolean field is treated as truthy', () => {
    expect(evaluateCondition('contract_amendments_tracked', lookup({ contract_amendments_tracked: true })).kind).toBe('pass');
    expect(evaluateCondition('contract_amendments_tracked', lookup({ contract_amendments_tracked: false })).kind).toBe('fail');
  });

  it('IS NULL (without NOT)', () => {
    expect(evaluateCondition('x IS NULL', lookup({})).kind).toBe('pass');
    expect(evaluateCondition('x IS NULL', lookup({ x: 1 })).kind).toBe('fail');
  });

  it('parses parentheses and precedence', () => {
    const cond = '(a >= 1 OR b >= 1) AND c >= 1';
    expect(evaluateCondition(cond, lookup({ a: 0, b: 2, c: 2 })).kind).toBe('pass');
    expect(evaluateCondition(cond, lookup({ a: 0, b: 0, c: 2 })).kind).toBe('fail');
    expect(evaluateCondition(cond, lookup({ a: 1, b: 0, c: 0 })).kind).toBe('fail');
  });

  // The lookup builders (compliance-block.tsx + approval-gate.ts) emit the
  // sentinel '__present__' for json-carrier fields whose value is non-null.
  // The contract: presence checks pass; arithmetic / membership against
  // literals fails — never silently passes. These tests pin that contract
  // at the evaluator boundary so the lookup-builder change can't drift.
  describe('json-carrier presence sentinel', () => {
    it('IS NOT NULL passes when the sentinel is set for the symbol', () => {
      expect(
        evaluateCondition('r_D_n_table IS NOT NULL', lookup({ r_D_n_table: '__present__' })).kind,
      ).toBe('pass');
    });
    it('IS NOT NULL fails when the lookup omits the symbol', () => {
      expect(
        evaluateCondition('r_D_n_table IS NOT NULL', lookup({})).kind,
      ).toBe('fail');
    });
    it('IS NOT EMPTY also passes with the sentinel (same exists node)', () => {
      expect(
        evaluateCondition('r_D_n_table IS NOT EMPTY', lookup({ r_D_n_table: '__present__' })).kind,
      ).toBe('pass');
    });
    it('compound condition mixing sentinel + scalar resolves correctly', () => {
      const cond = 'r_D_n_table IS NOT NULL AND kostra_grid_cell IS NOT NULL';
      expect(
        evaluateCondition(cond, lookup({ r_D_n_table: '__present__', kostra_grid_cell: 137089 })).kind,
      ).toBe('pass');
      expect(
        evaluateCondition(cond, lookup({ r_D_n_table: '__present__' })).kind,
      ).toBe('fail');
      expect(
        evaluateCondition(cond, lookup({ kostra_grid_cell: 137089 })).kind,
      ).toBe('fail');
    });
    it('arithmetic comparison against the sentinel does NOT pass silently', () => {
      // `__present__` is not numeric. `toNumber` returns null. The
      // comparison branch returns false for any numeric op, so the
      // evaluator's `compare` node yields 'false' → kind 'fail'.
      expect(
        evaluateCondition('r_D_n_table >= 1', lookup({ r_D_n_table: '__present__' })).kind,
      ).toBe('fail');
      expect(
        evaluateCondition('r_D_n_table > 0', lookup({ r_D_n_table: '__present__' })).kind,
      ).toBe('fail');
    });
    it('membership IN { … } against literals does NOT match the sentinel', () => {
      // The sentinel value '__present__' is not in any plausible enum
      // literal set the engineer would write; ensure IN fails.
      expect(
        evaluateCondition(
          'r_D_n_table IN {a, b, c}',
          lookup({ r_D_n_table: '__present__' }),
        ).kind,
      ).toBe('fail');
    });
  });
});
