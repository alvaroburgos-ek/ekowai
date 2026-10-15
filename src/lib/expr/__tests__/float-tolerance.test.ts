/**
 * F-A8 — numeric comparisons in the gate DSL carry a relative+absolute
 * tolerance (|a−b| ≤ max(1e-9·max(|a|,|b|), 1e-12) ⇒ equal).
 *
 * DWA-A 138-1 Gl. (9) prints "q_S,AC … ≥ 2 l/(s·ha)". A design sized exactly
 * to the limit computes, in IEEE-754, q_S,AC = 1.9999999999999998 and the
 * untolerant `>=` read it as a FAIL of REQ-15.
 */
import { describe, it, expect } from 'vitest';
import { evalCondition, evalNumber } from '../evaluate';
import { compareNumbers, numbersEqual } from '../numeric-compare';
import type { Scope } from '../scope';

const sc = (vals: Record<string, number | string | boolean | null>): Scope => ({ symbol: (s) => (s in vals ? vals[s] : undefined) });
const cond = (src: string, vals: Record<string, number | string | boolean | null>) => evalCondition(src, sc(vals)).kind;

// Gl. 9: q_S,AC = (k_i · A_S,m · 1000 + Q_Dr) / A_C · 10^4 — K6 sized exactly by Gl. 9.
const GL9 = '(k_i * A_S_m * 1000 + Q_Dr) / A_C * 10^4';
const K6_GL9 = { k_i: 1e-6, A_S_m: 105.2421, A_C: 526.2105, Q_Dr: 0 };

describe('F-A8 — Gl. 9 exact-boundary design (q_S,AC = 2 by hand)', () => {
  it('the real Gl. 9 arithmetic lands on 1.9999999999999998 (precondition of the defect)', () => {
    const q = evalNumber(GL9, sc(K6_GL9));
    expect(q).toBe(1.9999999999999998);
    expect(q < 2).toBe(true);
  });
  it('REQ-15 `q_S_AC >= 2` passes at the exact boundary', () => {
    const q = evalNumber(GL9, sc(K6_GL9));
    expect(cond('q_S_AC >= 2', { q_S_AC: q })).toBe('pass');
  });
  it('the same boundary passes with Gl. 9 inline on the LHS (arithmetic compare path)', () => {
    expect(cond(`${GL9} >= 2`, K6_GL9)).toBe('pass');
  });
  it('a value clearly below the limit still fails (1.999)', () => {
    expect(cond('q_S_AC >= 2', { q_S_AC: 1.999 })).toBe('fail');
    expect(cond('q_S_AC >= 2', { q_S_AC: 1.9999999 })).toBe('fail');
  });
  it('the a138 condition shape `q_S_AC >= 2 AND (q_S_AC > 5 OR f_Z == 1.2)` passes at the boundary', () => {
    const q = evalNumber(GL9, sc(K6_GL9));
    expect(cond('q_S_AC >= 2 AND (q_S_AC > 5 OR f_Z == 1.2)', { q_S_AC: q, f_Z: 1.2 })).toBe('pass');
  });
});

describe('F-A8 — ==, !=, <, >, <=, >= under tolerance', () => {
  it('0.1 + 0.2 == 0.3 and != is false', () => {
    expect(cond('a + b == 0.3', { a: 0.1, b: 0.2 })).toBe('pass');
    expect(cond('a + b != 0.3', { a: 0.1, b: 0.2 })).toBe('fail');
    expect(cond('x == 0.3', { x: 0.1 + 0.2 })).toBe('pass');
    expect(cond('x != 0.3', { x: 0.1 + 0.2 })).toBe('fail');
  });
  it('strict > and < are false at (tolerant) equality', () => {
    expect(cond('x > 2', { x: 2.0000000000000004 })).toBe('fail');
    expect(cond('x > 2', { x: 2 })).toBe('fail');
    expect(cond('x < 2', { x: 1.9999999999999998 })).toBe('fail');
    expect(cond('x < 2', { x: 2 })).toBe('fail');
    expect(cond('x <= 2', { x: 2.0000000000000004 })).toBe('pass');
  });
  it('clear differences keep their verdict', () => {
    expect(cond('x > 2', { x: 2.001 })).toBe('pass');
    expect(cond('x < 2', { x: 1.999 })).toBe('pass');
    expect(cond('x <= 2', { x: 2.001 })).toBe('fail');
    expect(cond('x == 2', { x: 2.001 })).toBe('fail');
    expect(cond('x != 2', { x: 2.001 })).toBe('pass');
  });
  it('numeric IN members match under the same tolerance', () => {
    expect(cond('x IN {0.3, 0.5}', { x: 0.1 + 0.2 })).toBe('pass');
    expect(cond('x IN {0.4, 0.5}', { x: 0.1 + 0.2 })).toBe('fail');
  });
  it('the absolute floor handles comparisons against 0', () => {
    expect(cond('x == 0', { x: 1e-13 })).toBe('pass');
    expect(cond('x == 0', { x: 1e-9 })).toBe('fail');
    expect(cond('x > 0', { x: 1e-9 })).toBe('pass');
  });
  it('non-numeric comparisons are unchanged', () => {
    expect(cond("kind == 'mulde'", { kind: 'mulde' })).toBe('pass');
    expect(cond("kind != 'mulde'", { kind: 'rigole' })).toBe('pass');
    expect(cond('flag == true', { flag: true })).toBe('pass');
    expect(cond("kind IN {'mulde', 'rigole'}", { kind: 'schacht' })).toBe('fail');
  });
});

describe('F-A8 — shared helper', () => {
  it('numbersEqual: relative + absolute tolerance', () => {
    expect(numbersEqual(1.9999999999999998, 2)).toBe(true);
    expect(numbersEqual(0.1 + 0.2, 0.3)).toBe(true);
    expect(numbersEqual(1e12, 1e12 + 1e-3)).toBe(true);
    expect(numbersEqual(1e12, 1e12 + 1e4)).toBe(false);
    expect(numbersEqual(1.999, 2)).toBe(false);
  });
  it('compareNumbers covers all six operators', () => {
    const q = 1.9999999999999998;
    expect(compareNumbers(q, '>=', 2)).toBe(true);
    expect(compareNumbers(q, '<=', 2)).toBe(true);
    expect(compareNumbers(q, '==', 2)).toBe(true);
    expect(compareNumbers(q, '!=', 2)).toBe(false);
    expect(compareNumbers(q, '<', 2)).toBe(false);
    expect(compareNumbers(q, '>', 2)).toBe(false);
  });
});
