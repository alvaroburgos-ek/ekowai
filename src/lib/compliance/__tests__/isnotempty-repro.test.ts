import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../evaluate';

// Reproduction for the corpus `!= ''` → `IS NOT EMPTY` grammar repair.
// Broken-before: `field != ''` — an EMPTIED text field ('') is missing → pending, never a
// definite fail → the block gate never enforces. Fixed-after: `IS NOT EMPTY` reaches fail on
// an emptied value ('' / null).
// A1 (2026-09-30): a symbol that was NEVER entered (undefined) is `pending`, like a comparison
// on a missing symbol — the old `lk({}) ⇒ 'fail'` assertions encoded the A1 defect (✗ before
// anything was typed) and were updated to `pending`; the '' cases pin the enforcement.
const lk = (vals: Record<string, string | number | boolean | null>) =>
  (sym: string) => (sym in vals ? vals[sym] : undefined);

describe('!= \'\' vs IS NOT EMPTY — enforcement reproduction', () => {
  it('BROKEN: `x != \'\'` with x emptied does NOT fail (pending)', () => {
    expect(evaluateCondition("x != ''", lk({ x: '' })).kind).not.toBe('fail');
    expect(evaluateCondition("x != ''", lk({})).kind).not.toBe('fail');
  });
  it('FIXED: `x IS NOT EMPTY` with x emptied FAILS (blocks); never entered is pending (A1)', () => {
    expect(evaluateCondition('x IS NOT EMPTY', lk({ x: '' })).kind).toBe('fail');
    expect(evaluateCondition('x IS NOT EMPTY', lk({ x: null })).kind).toBe('fail');
    expect(evaluateCondition('x IS NOT EMPTY', lk({}))).toEqual({ kind: 'pending', missingSymbols: ['x'] });
  });
  it('FIXED: `x IS NOT EMPTY` with x present passes', () => {
    expect(evaluateCondition('x IS NOT EMPTY', lk({ x: 'value' })).kind).toBe('pass');
  });
  it('FIXED: compound `x IS NOT EMPTY AND y > 0` — emptied x blocks, never-entered x is pending, both-set passes', () => {
    expect(evaluateCondition('x IS NOT EMPTY AND y > 0', lk({ x: '', y: 5 })).kind).toBe('fail');
    expect(evaluateCondition('x IS NOT EMPTY AND y > 0', lk({ y: 5 }))).toEqual({ kind: 'pending', missingSymbols: ['x'] });
    expect(evaluateCondition('x IS NOT EMPTY AND y > 0', lk({ x: 'v', y: 5 })).kind).toBe('pass');
  });
});
