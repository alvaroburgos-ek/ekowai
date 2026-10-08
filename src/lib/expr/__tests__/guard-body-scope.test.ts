/**
 * FLL readiness run 2026-10-05, Naturteich defect D5 (FLLNT-11 REQ-36): how far does the body of an
 * `IF … THEN …` guard extend? The gate authors wrote `(IF type == III THEN hours > 12 AND downtime <= 1)`
 * meaning the whole conjunction; a Type IV pool must then pass this guard vacuously even when the
 * Type-III inputs are empty.
 */
import { describe, it, expect } from 'vitest';
import { evalCondition } from '../evaluate';
import type { Scope } from '../scope';

const sc = (vals: Record<string, number | string | boolean | null>): Scope => ({ symbol: (s) => (s in vals ? vals[s] : undefined) });

describe('guard body scope', () => {
  it('a false guard makes the whole THEN conjunction vacuous (no pending from the body inputs)', () => {
    expect(evalCondition('IF t == 3 THEN a > 12 AND b <= 1', sc({ t: 4 }))).toEqual({ kind: 'pass', guardSkipped: true });
    expect(evalCondition('(IF t == 3 THEN a > 12 AND b <= 1) AND (IF t == 4 THEN c > 80)', sc({ t: 4, c: 90 }))).toEqual({ kind: 'pass' });
    expect(evalCondition('(IF t == 3 THEN a > 12 AND b <= 1) AND (IF t == 4 THEN c > 80)', sc({ t: 4, c: 70 }))).toEqual({ kind: 'fail' });
  });
  it('a true guard evaluates the whole conjunction', () => {
    expect(evalCondition('IF t == 3 THEN a > 12 AND b <= 1', sc({ t: 3, a: 13, b: 1 }))).toEqual({ kind: 'pass' });
    expect(evalCondition('IF t == 3 THEN a > 12 AND b <= 1', sc({ t: 3, a: 13, b: 2 }))).toEqual({ kind: 'fail' });
    expect(evalCondition('IF t == 3 THEN a > 12 AND b <= 1', sc({ t: 3, a: 13 }))).toEqual({ kind: 'pending', missingSymbols: ['b'] });
  });
});
