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

describe('evaluateCondition — F-4: relational var-vs-var resolves the RHS identifier', () => {
  it('>= between two symbols compares their values', () => {
    expect(evaluateCondition('V_s >= V_S_min', lookup({ V_s: 20, V_S_min: 15 })).kind).toBe('pass');
    expect(evaluateCondition('V_s >= V_S_min', lookup({ V_s: 10, V_S_min: 15 })).kind).toBe('fail');
    expect(evaluateCondition('V_s >= V_S_min', lookup({ V_s: 15, V_S_min: 15 })).kind).toBe('pass');
  });

  it('<=, <, > between two symbols compare their values', () => {
    expect(evaluateCondition('e_0 <= e_max', lookup({ e_0: 1, e_max: 2 })).kind).toBe('pass');
    expect(evaluateCondition('e_0 <= e_max', lookup({ e_0: 3, e_max: 2 })).kind).toBe('fail');
    expect(evaluateCondition('eta_ges > eta_erf', lookup({ eta_ges: 0.9, eta_erf: 0.8 })).kind).toBe('pass');
    expect(evaluateCondition('m < m_min_required', lookup({ m: 2, m_min_required: 5 })).kind).toBe('pass');
  });

  it('missing RHS symbol → pending naming it (never a silent verdict)', () => {
    const r = evaluateCondition('V_s >= V_S_min', lookup({ V_s: 20 }));
    expect(r.kind).toBe('pending');
    if (r.kind === 'pending') expect(r.missingSymbols).toContain('V_S_min');
  });

  it('literal RHS keeps working through the same operators', () => {
    expect(evaluateCondition('V_s >= 15', lookup({ V_s: 20 })).kind).toBe('pass');
    expect(evaluateCondition('V_s >= 15', lookup({ V_s: 10 })).kind).toBe('fail');
  });

  it('== / != with a bare-ident RHS KEEP legacy enum string semantics', () => {
    expect(evaluateCondition('speichertyp == geschlossen', lookup({ speichertyp: 'geschlossen' })).kind).toBe('pass');
    expect(evaluateCondition('speichertyp == geschlossen', lookup({ speichertyp: 'offen' })).kind).toBe('fail');
    // even when both symbols exist as numeric values, == stays the legacy literal compare
    expect(evaluateCondition('a == b', lookup({ a: 3, b: 3 })).kind).toBe('fail');
  });
});
