import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../evaluate';

// Reproduction check for the DWA-M-816 REQ-13 / REQ-14 gate fixes
// (migration 20260801460000). Broken-before: bare-ident RHS on ==/!= silently
// string-coerces + missing parens nest the 2nd guard → the gates mis-enforce.
// Fixed-after: subtraction form forces the numeric acompare path + parens un-nest.
const lk = (vals: Record<string, string | number | boolean | null>) =>
  (sym: string) => (sym in vals ? vals[sym] : undefined);

const OLD_13 = 'IF n_a >= n_b THEN n_observation_period == n_a AND IF n_b >= n_a THEN n_observation_period == n_b';
const NEW_13 = '(IF n_a - n_b >= 0 THEN n_observation_period - n_a == 0) AND (IF n_b - n_a >= 0 THEN n_observation_period - n_b == 0)';
const OLD_14 = 'IF n_a != n_b THEN partial_replication_flag == TRUE AND n_tr IS NOT NULL';
const NEW_14 = 'IF n_a - n_b != 0 THEN partial_replication_flag == TRUE AND n_tr IS NOT NULL';

describe('DWA-M-816 REQ-13 (n = max(n_a,n_b)) — reproduction', () => {
  it('UPSTREAM-FIXED (main resolves a bare-ident RHS symbol on ==): correct n_obs=max now PASSES on the OLD form', () => {
    expect(evaluateCondition(OLD_13, lk({ n_a: 10, n_b: 5, n_observation_period: 10 })).kind).toBe('pass');
  });
  it('BROKEN-BEFORE: wrong n_obs slips through (nested-guard vacuous pass)', () => {
    expect(evaluateCondition(OLD_13, lk({ n_a: 5, n_b: 10, n_observation_period: 5 })).kind).toBe('pass');
  });
  it('FIXED: correct n_obs=max PASSES (n_a>=n_b)', () => {
    expect(evaluateCondition(NEW_13, lk({ n_a: 10, n_b: 5, n_observation_period: 10 })).kind).toBe('pass');
  });
  it('FIXED: correct n_obs=max PASSES (n_b>=n_a)', () => {
    expect(evaluateCondition(NEW_13, lk({ n_a: 5, n_b: 10, n_observation_period: 10 })).kind).toBe('pass');
  });
  it('FIXED: wrong n_obs now BLOCKS', () => {
    expect(evaluateCondition(NEW_13, lk({ n_a: 5, n_b: 10, n_observation_period: 5 })).kind).toBe('fail');
  });
});

describe('DWA-M-816 REQ-14 (Teilreplikation only when n_a != n_b) — reproduction', () => {
  it('UPSTREAM-FIXED (main resolves a bare-ident RHS symbol on !=): n_a==n_b → guard vacuous, OLD form PASSES', () => {
    expect(evaluateCondition(OLD_14, lk({ n_a: 25, n_b: 25, partial_replication_flag: false, n_tr: null })).kind).toBe('pass');
  });
  it('FIXED: n_a==n_b → guard vacuously passes (no Teilreplikation required)', () => {
    expect(evaluateCondition(NEW_14, lk({ n_a: 25, n_b: 25, partial_replication_flag: false, n_tr: null })).kind).toBe('pass');
  });
  it('FIXED: n_a!=n_b with flag+n_tr set → passes', () => {
    expect(evaluateCondition(NEW_14, lk({ n_a: 30, n_b: 25, partial_replication_flag: true, n_tr: 4 })).kind).toBe('pass');
  });
  it('FIXED: n_a!=n_b without the flag → blocks', () => {
    expect(evaluateCondition(NEW_14, lk({ n_a: 30, n_b: 25, partial_replication_flag: false, n_tr: null })).kind).toBe('fail');
  });
});
