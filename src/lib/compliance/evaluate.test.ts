import { describe, it, expect } from 'vitest';
import { evaluateCondition, jsonConditionValue } from './evaluate';

function lookup(map: Record<string, unknown>) {
  return (sym: string) => map[sym] as number | string | boolean | null | undefined;
}

describe('jsonConditionValue — carrier presence for the condition DSL', () => {
  it("returns 'present' for a carrier with rows", () => {
    expect(jsonConditionValue({ rows: [{ id: '1' }] })).toBe('present');
  });
  it('returns null for an empty carrier / empty object / empty array / null', () => {
    expect(jsonConditionValue({ rows: [] })).toBeNull();
    expect(jsonConditionValue({})).toBeNull();
    expect(jsonConditionValue([])).toBeNull();
    expect(jsonConditionValue(null)).toBeNull();
  });
  it("returns 'present' for a non-empty array/object", () => {
    expect(jsonConditionValue([1])).toBe('present');
    expect(jsonConditionValue({ a: 1 })).toBe('present');
  });
});

describe('json carrier IS NOT NULL (regression: REQ-06 surface_inventory)', () => {
  const gate = (carrier: unknown) =>
    evaluateCondition('surface_inventory IS NOT NULL', (s) =>
      s === 'surface_inventory' ? (jsonConditionValue(carrier) ?? undefined) : undefined,
    ).kind;
  it('passes when the carrier has rows', () => {
    expect(gate({ rows: [{ id: '1' }, { id: '2' }, { id: '3' }] })).toBe('pass');
  });
  it('fails when the carrier is empty or absent', () => {
    expect(gate({ rows: [] })).toBe('fail');
    expect(gate(null)).toBe('fail');
  });
});

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
});
