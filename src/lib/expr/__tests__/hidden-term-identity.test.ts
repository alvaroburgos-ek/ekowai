/**
 * FLL readiness run 2026-10-05, defect D-4 (FLLTP-RHZ-05 REQ-06): a term over a symbol hidden by
 * `visible_when` is the IDENTITY of its connective, not a switch that turns the whole gate off.
 * Before: `h >= 250 AND (abutment == false OR (t >= 9 AND t <= 11))` with the abutment thickness
 * hidden was `not_applicable` as a whole, so a 240 mm vessel was approved.
 */
import { describe, it, expect } from 'vitest';
import { evalCondition } from '../evaluate';
import type { Scope } from '../scope';

const sc = (vals: Record<string, number | string | boolean | null>): Scope => ({ symbol: (s) => (s in vals ? vals[s] : undefined) });
const REQ06 = 'h >= 250 AND (abutment == false OR (t >= 9 AND t <= 11))';

describe('hidden term = identity of its connective', () => {
  it('hard term still blocks when the conditional term is hidden', () => {
    const hidden = new Set(['t']);
    expect(evalCondition(REQ06, sc({ h: 240, abutment: false }), { hiddenSymbols: hidden })).toEqual({ kind: 'fail' });
    expect(evalCondition(REQ06, sc({ h: 260, abutment: false }), { hiddenSymbols: hidden })).toEqual({ kind: 'pass' });
  });
  it('the conditional term decides again once visible', () => {
    expect(evalCondition(REQ06, sc({ h: 260, abutment: true, t: 10 }))).toEqual({ kind: 'pass' });
    expect(evalCondition(REQ06, sc({ h: 260, abutment: true, t: 15 }))).toEqual({ kind: 'fail' });
  });
  it('a fully hidden condition is still not_applicable', () => {
    expect(evalCondition('t >= 9 AND t <= 11', sc({ t: 15 }), { hiddenSymbols: new Set(['t']) }))
      .toEqual({ kind: 'not_applicable', hiddenSymbols: ['t'] });
    expect(evalCondition('a >= 1', sc({ a: 0 }), { hiddenSymbols: new Set(['a']) })).toEqual({ kind: 'not_applicable', hiddenSymbols: ['a'] });
  });
  it('OR with a hidden term: the visible side decides; NOT propagates', () => {
    const hidden = new Set(['b']);
    expect(evalCondition('a == true OR b == true', sc({ a: false, b: true }), { hiddenSymbols: hidden })).toEqual({ kind: 'fail' });
    expect(evalCondition('a == true OR b == true', sc({ a: true }), { hiddenSymbols: hidden })).toEqual({ kind: 'pass' });
    expect(evalCondition('NOT (b == true)', sc({ b: true }), { hiddenSymbols: hidden })).toEqual({ kind: 'not_applicable', hiddenSymbols: ['b'] });
  });
  it('a guard over a hidden symbol does not apply; a hidden body does not apply', () => {
    expect(evalCondition('IF x == true THEN y >= 1', sc({ x: true, y: 0 }), { hiddenSymbols: new Set(['x']) }))
      .toEqual({ kind: 'not_applicable', hiddenSymbols: ['x'] });
    expect(evalCondition('IF x == true THEN y >= 1', sc({ x: true, y: 0 }), { hiddenSymbols: new Set(['y']) }))
      .toEqual({ kind: 'not_applicable', hiddenSymbols: ['y'] });
    // a guard whose hidden term is ANDed with a visible one: the visible one decides
    expect(evalCondition('(IF x == true THEN y >= 1) AND z >= 1', sc({ x: true, y: 0, z: 0 }), { hiddenSymbols: new Set(['y']) }))
      .toEqual({ kind: 'fail' });
  });
  it('a missing (not hidden) visible term stays pending', () => {
    expect(evalCondition(REQ06, sc({ abutment: false }), { hiddenSymbols: new Set(['t']) })).toEqual({ kind: 'pending', missingSymbols: ['h'] });
  });
});
