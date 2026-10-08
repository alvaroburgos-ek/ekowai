/**
 * A1 (2026-09-30) — existence checks on a NEVER-ENTERED symbol.
 *
 * Observed on the deployed app: on an untouched sheet REQ-15/-16/-17
 * (`… IS NOT EMPTY` / `IS NOT NULL`) already read "✗ 3 BLOCK", while REQ-31/-32
 * (comparisons on the same empty state) read "○ pending — FEHLEND". An absent
 * value is `pending` for both shapes. `IS NULL` / `IS EMPTY` on an absent symbol
 * stays `true` (guard idiom `swk_klasse IS NULL OR …`). A carrier that EXISTS but
 * is empty (`{rows: []}` ⇒ '' marker) still definitely fails `IS NOT EMPTY`.
 * Guard antecedents, `if()` tests and row scope keep the legacy definite verdict.
 */
import { describe, it, expect } from 'vitest';
import { evaluateCondition, jsonConditionValue } from '../evaluate';
import { explainCondition } from '../explain';
import { makeSymbolLookup } from '../symbol-lookup';
import { evalNumber, type PreparedRegister } from '@/lib/expr';

const lk = (vals: Record<string, string | number | boolean | null>) =>
  (sym: string) => (sym in vals ? vals[sym] : undefined);

describe('A1 — IS NOT NULL on a never-entered symbol is pending, IS NULL on it passes', () => {
  it('IS NOT NULL / IS NOT EMPTY on undefined ⇒ pending with the symbol reported', () => {
    expect(evaluateCondition('x IS NOT NULL', lk({}))).toEqual({ kind: 'pending', missingSymbols: ['x'] });
    expect(evaluateCondition('x IS NOT EMPTY', lk({}))).toEqual({ kind: 'pending', missingSymbols: ['x'] });
    // Exactly like a comparison on the same empty state.
    expect(evaluateCondition('x >= 1', lk({}))).toEqual({ kind: 'pending', missingSymbols: ['x'] });
  });

  it('IS NULL / IS EMPTY on undefined ⇒ pass (guard idiom keeps passing)', () => {
    expect(evaluateCondition('x IS NULL', lk({}))).toEqual({ kind: 'pass' });
    expect(evaluateCondition('x IS EMPTY', lk({}))).toEqual({ kind: 'pass' });
    expect(evaluateCondition('swk_klasse IS NULL OR swk_klasse IN {a, b}', lk({}))).toEqual({ kind: 'pass' });
    expect(evaluateCondition('x IS NULL', lk({ x: 1 }))).toEqual({ kind: 'fail' });
  });

  it('a value that was entered and cleared (null / "") is a definite verdict either way', () => {
    expect(evaluateCondition('x IS NOT NULL', lk({ x: null }))).toEqual({ kind: 'fail' });
    expect(evaluateCondition('x IS NOT EMPTY', lk({ x: '' }))).toEqual({ kind: 'fail' });
    expect(evaluateCondition('x IS NULL', lk({ x: null }))).toEqual({ kind: 'pass' });
    expect(evaluateCondition('x IS NOT NULL', lk({ x: 'v' }))).toEqual({ kind: 'pass' });
    expect(evaluateCondition('x IS NOT NULL', lk({ x: 0 }))).toEqual({ kind: 'pass' });
    expect(evaluateCondition('x IS NOT NULL', lk({ x: false }))).toEqual({ kind: 'pass' });
  });

  it('composes: AND/OR/NOT propagate the missing state like comparisons do', () => {
    expect(evaluateCondition('x IS NOT NULL AND y > 0', lk({ y: 1 })).kind).toBe('pending');
    expect(evaluateCondition('x IS NOT NULL AND y > 0', lk({ y: 0 })).kind).toBe('fail');
    expect(evaluateCondition('x IS NOT NULL OR y > 0', lk({ y: 1 })).kind).toBe('pass');
    expect(evaluateCondition('NOT (x IS NOT NULL)', lk({})).kind).toBe('pending');
  });

  it('guard antecedent keeps the legacy semantics: IF x IS NOT NULL THEN … is vacuous when x is absent', () => {
    expect(evaluateCondition('IF x IS NOT NULL THEN y > 1', lk({}))).toEqual({ kind: 'pass', guardSkipped: true });
    expect(evaluateCondition('IF x IS NOT NULL THEN y > 1', lk({ x: 'v', y: 0 }))).toEqual({ kind: 'fail' });
    // …but the BODY follows the new rule.
    expect(evaluateCondition('IF a == 1 THEN x IS NOT NULL', lk({ a: 1 }))).toEqual({ kind: 'pending', missingSymbols: ['x'] });
  });

  it('an if() test inside a formula keeps the legacy semantics (absent ⇒ false branch, never "Fehlende Eingabe")', () => {
    expect(evalNumber('if(x IS NOT NULL, 1, 2)', { symbol: () => undefined })).toBe(2);
  });

  it('row scope keeps the legacy semantics: a blank cell under `col IS NOT NULL` is a non-matching row', () => {
    const register = (): PreparedRegister => ({
      rows: [
        { id: '1', values: { col: 'a' }, complete: true },
        { id: '2', values: {}, complete: true },
      ],
      flags: {},
    });
    expect(evalNumber('count_rows(reg, col IS NOT NULL)', { symbol: () => undefined, register })).toBe(1);
  });

  it('a json carrier that exists but is empty still definitely fails IS NOT EMPTY; a never-saved one is pending', () => {
    const fields = [{ id: 'f1', symbol: 'reg' }];
    const emptyCarrier = makeSymbolLookup(fields, { f1: { type: 'json', value: { rows: [] } } });
    const noCarrier = makeSymbolLookup(fields, {});
    const nullCarrier = makeSymbolLookup(fields, { f1: { type: 'json', value: null } });
    const full = makeSymbolLookup(fields, { f1: { type: 'json', value: { rows: [{ id: '1' }] } } });
    expect(evaluateCondition('reg IS NOT EMPTY', emptyCarrier)).toEqual({ kind: 'fail' });
    expect(evaluateCondition('reg IS NOT NULL', emptyCarrier)).toEqual({ kind: 'fail' });
    expect(evaluateCondition('reg IS NOT EMPTY', noCarrier)).toEqual({ kind: 'pending', missingSymbols: ['reg'] });
    expect(evaluateCondition('reg IS NOT EMPTY', nullCarrier)).toEqual({ kind: 'pending', missingSymbols: ['reg'] });
    expect(evaluateCondition('reg IS NOT EMPTY', full)).toEqual({ kind: 'pass' });
    // The gate's own marker mapping (approval-gate `extractValue`: `jsonConditionValue(v) ?? undefined`).
    expect(jsonConditionValue({ rows: [] }) ?? undefined).toBe('');
    expect(jsonConditionValue(null) ?? undefined).toBeUndefined();
  });

  it('opt-out: existsOnAbsent "definite" restores the legacy verdict (visible_when keeps hiding)', () => {
    expect(evaluateCondition('x IS NOT NULL', lk({}), { existsOnAbsent: 'definite' })).toEqual({ kind: 'fail' });
  });

  it('the explainer reports the leaf as undetermined (satisfied null) with the fill-in hint', () => {
    const r = explainCondition('x IS NOT NULL', lk({}));
    if (r.kind !== 'explained') throw new Error('expected explained');
    expect(r.leaves[0]).toMatchObject({ satisfied: null, actual: 'x fehlt', wouldPass: 'x erfassen/ausfüllen' });
  });
});
