/**
 * U-6 (UX pass 820, 2026-10-08): a PASS that comes from an `IF <antecedent> THEN …` whose antecedent is definitely
 * false carries the display marker `guardSkipped: true`. The verdict (`kind`) never changes.
 */
import { describe, it, expect } from 'vitest';
import { evalCondition } from '../evaluate';
import type { Scope } from '../scope';

const sc = (vals: Record<string, number | string | boolean | null>): Scope => ({ symbol: (s) => (s in vals ? vals[s] : undefined) });
const COND = "IF procurement_procedure != 'direktvergabe' THEN tender_published == true";

describe('evalCondition — guardSkipped marker', () => {
  it('false antecedent ⇒ pass with guardSkipped: true (M820-14 REQ-15 on a direct award)', () => {
    expect(evalCondition(COND, sc({ procurement_procedure: 'direktvergabe' }))).toEqual({ kind: 'pass', guardSkipped: true });
  });

  it('true antecedent + satisfied body ⇒ plain pass, marker absent', () => {
    const r = evalCondition(COND, sc({ procurement_procedure: 'offenes_verfahren', tender_published: true }));
    expect(r).toEqual({ kind: 'pass' });
    expect('guardSkipped' in r).toBe(false);
  });

  it('true antecedent + violated body ⇒ fail (unchanged); missing antecedent ⇒ pending (unchanged)', () => {
    expect(evalCondition(COND, sc({ procurement_procedure: 'offenes_verfahren', tender_published: false }))).toEqual({ kind: 'fail' });
    expect(evalCondition(COND, sc({})).kind).toBe('pending');
  });

  it('a plain condition never carries the marker', () => {
    expect(evalCondition('x >= 1', sc({ x: 5 }))).toEqual({ kind: 'pass' });
  });

  it('nested IFs: a skipped inner guard on the THEN path sets it; both guards true ⇒ absent', () => {
    expect(evalCondition('IF a == 1 THEN IF b == 2 THEN c > 0', sc({ a: 1, b: 3 }))).toEqual({ kind: 'pass', guardSkipped: true });
    expect(evalCondition('IF a == 1 THEN IF b == 2 THEN c > 0', sc({ a: 1, b: 2, c: 1 }))).toEqual({ kind: 'pass' });
  });

  it('a guard inside an AND does not mark the pass (the other term was checked)', () => {
    expect(evalCondition('(IF t == 3 THEN a > 12) AND (c > 80)', sc({ t: 4, c: 90 }))).toEqual({ kind: 'pass' });
  });

  it('a guard over a hidden symbol stays not_applicable (unchanged)', () => {
    expect(evalCondition(COND, sc({ procurement_procedure: 'direktvergabe' }), { hiddenSymbols: new Set(['procurement_procedure']) }).kind).toBe('not_applicable');
  });
});
