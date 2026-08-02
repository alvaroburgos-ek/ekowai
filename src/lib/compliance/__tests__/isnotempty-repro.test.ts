import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../evaluate';

// Reproduction for the corpus `!= ''` → `IS NOT EMPTY` grammar repair.
// Broken-before: `field != ''` — an unfilled text field is missing → pending, never a
// definite fail → the block gate never enforces. Fixed-after: `IS NOT EMPTY` reaches fail.
const lk = (vals: Record<string, string | number | boolean | null>) =>
  (sym: string) => (sym in vals ? vals[sym] : undefined);

describe('!= \'\' vs IS NOT EMPTY — enforcement reproduction', () => {
  it('BROKEN: `x != \'\'` with x absent does NOT fail (pending)', () => {
    expect(evaluateCondition("x != ''", lk({})).kind).not.toBe('fail');
  });
  it('FIXED: `x IS NOT EMPTY` with x absent FAILS (blocks)', () => {
    expect(evaluateCondition('x IS NOT EMPTY', lk({})).kind).toBe('fail');
  });
  it('FIXED: `x IS NOT EMPTY` with x present passes', () => {
    expect(evaluateCondition('x IS NOT EMPTY', lk({ x: 'value' })).kind).toBe('pass');
  });
  it('FIXED: compound `x IS NOT EMPTY AND y > 0` — missing x blocks, both-set passes', () => {
    expect(evaluateCondition('x IS NOT EMPTY AND y > 0', lk({ y: 5 })).kind).toBe('fail');
    expect(evaluateCondition('x IS NOT EMPTY AND y > 0', lk({ x: 'v', y: 5 })).kind).toBe('pass');
  });
});
