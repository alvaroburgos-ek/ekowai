import { describe, it, expect } from 'vitest';
import { evaluateCondition } from './evaluate';

function lookup(map: Record<string, unknown>) {
  return (sym: string) => map[sym] as number | string | boolean | null | undefined;
}

describe('evaluateCondition — arithmetic operands', () => {
  it('subtraction on the left side', () => {
    expect(evaluateCondition('R_energy - E_energy > 0', lookup({ R_energy: 10, E_energy: 3 })).kind).toBe('pass');
    expect(evaluateCondition('R_energy - E_energy > 0', lookup({ R_energy: 5, E_energy: 8 })).kind).toBe('fail');
  });

  it('multiplication on the right side', () => {
    expect(evaluateCondition('V_Rueck >= Q * 25', lookup({ V_Rueck: 300, Q: 10 })).kind).toBe('pass');
    expect(evaluateCondition('V_Rueck >= Q * 25', lookup({ V_Rueck: 200, Q: 10 })).kind).toBe('fail');
  });

  it('addition equality (sum-of-parts check)', () => {
    expect(evaluateCondition('total == a + b', lookup({ total: 5, a: 2, b: 3 })).kind).toBe('pass');
    expect(evaluateCondition('total == a + b', lookup({ total: 6, a: 2, b: 3 })).kind).toBe('fail');
  });

  it('multiplicative precedence over additive', () => {
    expect(evaluateCondition('a + b * c > d', lookup({ a: 1, b: 2, c: 3, d: 6 })).kind).toBe('pass'); // 1+6=7>6
    expect(evaluateCondition('a + b * c > d', lookup({ a: 1, b: 2, c: 3, d: 7 })).kind).toBe('fail'); // 7>7 false
  });

  it('parentheses inside arithmetic (mid-expression)', () => {
    expect(evaluateCondition('Q * (a + b) >= d', lookup({ Q: 2, a: 3, b: 2, d: 10 })).kind).toBe('pass'); // 2*5=10
    expect(evaluateCondition('Q * (a + b) >= d', lookup({ Q: 2, a: 3, b: 2, d: 11 })).kind).toBe('fail');
  });

  it('parentheses leading the expression', () => {
    expect(evaluateCondition('(a + b) * c >= d', lookup({ a: 1, b: 1, c: 5, d: 10 })).kind).toBe('pass');
    expect(evaluateCondition('(a + b) * c >= d', lookup({ a: 1, b: 1, c: 5, d: 11 })).kind).toBe('fail');
  });

  it('division', () => {
    expect(evaluateCondition('a / b <= 2', lookup({ a: 4, b: 2 })).kind).toBe('pass');
    expect(evaluateCondition('a / b <= 2', lookup({ a: 5, b: 2 })).kind).toBe('fail');
  });

  it('middle-dot and × treated as multiplication', () => {
    expect(evaluateCondition('V >= w · n', lookup({ V: 100, w: 10, n: 10 })).kind).toBe('pass');
    expect(evaluateCondition('V >= w × n', lookup({ V: 90, w: 10, n: 10 })).kind).toBe('fail');
  });

  it('missing operand in arithmetic → pending (never a false block)', () => {
    const r = evaluateCondition('V_Rueck >= Q * 25', lookup({ V_Rueck: 300 }));
    expect(r.kind).toBe('pending');
    if (r.kind === 'pending') expect(r.missingSymbols).toContain('Q');
  });

  it('non-finite (division by zero) → pending, not fail', () => {
    expect(evaluateCondition('a / b <= 2', lookup({ a: 4, b: 0 })).kind).toBe('pending');
  });

  it('arithmetic inside an IF/THEN body', () => {
    const cond = 'IF active THEN total == a + b';
    expect(evaluateCondition(cond, lookup({ active: false })).kind).toBe('pass'); // vacuous
    expect(evaluateCondition(cond, lookup({ active: true, total: 5, a: 2, b: 3 })).kind).toBe('pass');
    expect(evaluateCondition(cond, lookup({ active: true, total: 9, a: 2, b: 3 })).kind).toBe('fail');
  });

  it('still treats a bare-ident RHS without arithmetic as a string literal (backward compat)', () => {
    expect(evaluateCondition('pretreatment_selected != none', lookup({ pretreatment_selected: 'klaergrube' })).kind).toBe('pass');
    expect(evaluateCondition('pretreatment_selected != none', lookup({ pretreatment_selected: 'none' })).kind).toBe('fail');
  });

  it('still returns manual for a bare arithmetic expression with no comparison', () => {
    expect(evaluateCondition('a + b', lookup({ a: 1, b: 2 })).kind).toBe('manual');
  });
});

describe('evaluateCondition — var-vs-var ordering gates (F-4 / bare-symbol-RHS fix)', () => {
  // Regression for the corpus-wide "bare-symbol-RHS always-fail" class: `V_s >= V_S_min`
  // (two number FIELDS, ordering operator) used to stringify the RHS to "V_S_min" and
  // therefore FAIL for every input — the block gate fired but never enforced. It must now
  // compare the two field values numerically, both ways, and go pending when the RHS is unfilled.
  it('field >= field enforces both ways (was always-fail)', () => {
    expect(evaluateCondition('V_s >= V_S_min', lookup({ V_s: 100, V_S_min: 80 })).kind).toBe('pass');
    expect(evaluateCondition('V_s >= V_S_min', lookup({ V_s: 60, V_S_min: 80 })).kind).toBe('fail');
  });
  it('all four ordering operators resolve the RHS field', () => {
    expect(evaluateCondition('eta_ges >= eta_erf', lookup({ eta_ges: 0.9, eta_erf: 0.8 })).kind).toBe('pass');
    expect(evaluateCondition('m >= m_min', lookup({ m: 7, m_min: 7 })).kind).toBe('pass');
    expect(evaluateCondition('c_bsb5 <= limit_bsb5', lookup({ c_bsb5: 10, limit_bsb5: 20 })).kind).toBe('pass');
    expect(evaluateCondition('c_bsb5 <= limit_bsb5', lookup({ c_bsb5: 30, limit_bsb5: 20 })).kind).toBe('fail');
    expect(evaluateCondition('a > b', lookup({ a: 5, b: 3 })).kind).toBe('pass');
    expect(evaluateCondition('a < b', lookup({ a: 5, b: 3 })).kind).toBe('fail');
  });
  it('missing RHS field → pending, never a false block', () => {
    const r = evaluateCondition('V_s >= V_S_min', lookup({ V_s: 100 }));
    expect(r.kind).toBe('pending');
    if (r.kind === 'pending') expect(r.missingSymbols).toContain('V_S_min');
  });
  it('literal-RHS ordering still works (unaffected)', () => {
    expect(evaluateCondition('V_s >= 40', lookup({ V_s: 50 })).kind).toBe('pass');
    expect(evaluateCondition('V_s >= 40', lookup({ V_s: 30 })).kind).toBe('fail');
  });
  it('enum equality with a bare-ident RHS is PRESERVED (not routed to numeric)', () => {
    expect(evaluateCondition('abdichtungsart == bitumenbahn', lookup({ abdichtungsart: 'bitumenbahn' })).kind).toBe('pass');
    expect(evaluateCondition('abdichtungsart == bitumenbahn', lookup({ abdichtungsart: 'kunststoffbahn' })).kind).toBe('fail');
    expect(evaluateCondition('pretreatment_selected != none', lookup({ pretreatment_selected: 'klaergrube' })).kind).toBe('pass');
    expect(evaluateCondition('pretreatment_selected != none', lookup({ pretreatment_selected: 'none' })).kind).toBe('fail');
  });
});
