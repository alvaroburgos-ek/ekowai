/**
 * Ruled semantics of the unified evaluator that the brief's tests do not
 * pin: the C-1 enum-RHS rule on a call LHS, the legacy condition forms
 * (guard, IN, NOT, IS NULL / IS NOT EMPTY, var-vs-var), the lenient helpers,
 * `unknownFunctionNames`, and the `recoverable` flag per message.
 */
import { describe, it, expect } from 'vitest';
import {
  evalCondition, evalNumber, evalValue, evaluateArithLenient, evaluateNodeLenient, unknownFunctionNames,
} from '../evaluate';
import { parseCondition, parseNumeric } from '../parser';
import { ExprError, type Scope } from '../scope';

const sc = (vals: Record<string, number | string | boolean | null>): Scope => ({ symbol: (s) => (s in vals ? vals[s] : undefined) });

function caught(fn: () => unknown): ExprError {
  try { fn(); } catch (e) { if (e instanceof ExprError) return e; throw e; }
  throw new Error('expected an ExprError');
}

describe('C-1: bare-ident RHS of ==/!= on a call LHS (legacy var-vs-var rule extended)', () => {
  const table: Scope['table'] = () => ({ kind: 'paved' });
  it('is an enum literal when it names no valued symbol', () => {
    const s: Scope = { ...sc({ k: 'a' }), table };
    expect(evalCondition("lookup('TAB9', k, 'kind') == paved", s)).toEqual({ kind: 'pass' });
    expect(evalCondition("lookup('TAB9', k, 'kind') != paved", s)).toEqual({ kind: 'fail' });
    expect(evalCondition("lookup('TAB9', k, 'kind') == other", s)).toEqual({ kind: 'fail' });
  });
  it('resolves as a symbol when that symbol has a value', () => {
    expect(evalCondition("lookup('TAB9', k, 'kind') == paved", { ...sc({ k: 'a', paved: 'paved' }), table })).toEqual({ kind: 'pass' });
    expect(evalCondition("lookup('TAB9', k, 'kind') == paved", { ...sc({ k: 'a', paved: 'gravel' }), table })).toEqual({ kind: 'fail' });
  });
});

describe('legacy condition forms', () => {
  it('IF a THEN b: vacuous pass when a is false, pending on a when a is missing', () => {
    expect(evalCondition('IF a THEN b', sc({ a: false }))).toEqual({ kind: 'pass' });
    expect(evalCondition('IF a THEN b', sc({ b: true }))).toEqual({ kind: 'pending', missingSymbols: ['a'] });
    expect(evalCondition('IF a THEN b', sc({ a: true, b: false }))).toEqual({ kind: 'fail' });
  });
  it("x IN {a, 'b'}", () => {
    expect(evalCondition("x IN {a, 'b'}", sc({ x: 'a' }))).toEqual({ kind: 'pass' });
    expect(evalCondition("x IN {a, 'b'}", sc({ x: 'b' }))).toEqual({ kind: 'pass' });
    expect(evalCondition("x IN {a, 'b'}", sc({ x: 'c' }))).toEqual({ kind: 'fail' });
  });
  it('NOT x', () => {
    expect(evalCondition('NOT x', sc({ x: false }))).toEqual({ kind: 'pass' });
    expect(evalCondition('NOT x', sc({ x: true }))).toEqual({ kind: 'fail' });
    expect(evalCondition('NOT x', sc({}))).toEqual({ kind: 'pending', missingSymbols: ['x'] });
  });
  it('x IS NULL / x IS NOT EMPTY', () => {
    expect(evalCondition('x IS NULL', sc({}))).toEqual({ kind: 'pass' });
    expect(evalCondition('x IS NULL', sc({ x: 0 }))).toEqual({ kind: 'fail' });
    expect(evalCondition('x IS NOT EMPTY', sc({ x: '' }))).toEqual({ kind: 'fail' });
    expect(evalCondition('x IS NOT EMPTY', sc({ x: 'v' }))).toEqual({ kind: 'pass' });
  });
  it('var-vs-var x == y with y valued', () => {
    expect(evalCondition('x == y', sc({ x: 3, y: 3 }))).toEqual({ kind: 'pass' });
    expect(evalCondition('x == y', sc({ x: 3, y: 4 }))).toEqual({ kind: 'fail' });
    expect(evalCondition('x == y', sc({ x: 'y' }))).toEqual({ kind: 'pass' }); // unvalued y → enum literal
  });
});

describe('lenient helpers on parsed nodes', () => {
  it('evaluateNodeLenient', () => {
    const n = parseCondition('a >= 1');
    expect(n).not.toBeNull();
    const node = n as NonNullable<typeof n>;
    expect(evaluateNodeLenient(node, sc({ a: 2 }))).toBe('true');
    expect(evaluateNodeLenient(node, sc({ a: 0 }))).toBe('false');
    expect(evaluateNodeLenient(node, sc({}))).toBe('missing');
  });
  it('evaluateArithLenient', () => {
    const p = parseNumeric('a * 2');
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(evaluateArithLenient(p.node, sc({ a: '2.5' }))).toBe(5);
    expect(evaluateArithLenient(p.node, sc({}))).toBeNull();
    const d = parseNumeric('a / 0');
    expect(d.ok && evaluateArithLenient(d.node, sc({ a: 1 }))).toBeNull();
  });
});

describe('unknownFunctionNames', () => {
  it('returns unsupported call names as written, deduplicated, in order', () => {
    const n = parseCondition('SUM(a) + SUM(b) > Foo(c) AND sqrt(d) > 1');
    expect(n && unknownFunctionNames(n)).toEqual(['SUM', 'Foo']);
    const p = parseNumeric('if(x > 1, ln(x), 0)');
    expect(p.ok && unknownFunctionNames(p.node)).toEqual([]);
  });
});

describe('ExprError.recoverable', () => {
  const reg = { rows: [{ id: 'c', values: { a: 1 }, complete: false }], flags: {} };
  const scope: Scope = { ...sc({ k: 'nope' }), register: () => reg, table: () => undefined };
  it('true for data conditions: empty register, if() missing input, lookup row absent', () => {
    let e = caught(() => evalNumber('sum_rows(reg, a)', scope));
    expect(e.message).toBe('Keine vollständigen Zeilen in "reg".');
    expect(e.recoverable).toBe(true);
    e = caught(() => evalNumber('if(x > 1, 1, 0)', scope));
    expect(e.message).toBe('Fehlende Eingabe für if(): x');
    expect(e.recoverable).toBe(true);
    e = caught(() => evalNumber("lookup('TAB9', k, 'cm')", scope));
    expect(e.message).toBe('lookup(): keine Zeile in TAB9 für Schlüssel [nope]');
    expect(e.recoverable).toBe(true);
  });
  it('false for malformed expressions: non-register argument, condition as number, no table access', () => {
    let e = caught(() => evalNumber('sum_rows(1 + 2, a)', scope));
    expect(e.message).toBe('Registerausdruck erwartet.');
    expect(e.recoverable).toBe(false);
    e = caught(() => evalNumber('sqrt(k > 1)', scope));
    expect(e.message).toBe('Bedingung als Zahl verwendet.');
    expect(e.recoverable).toBe(false);
    const p = parseNumeric("lookup('TAB9', k, 'cm')");
    e = caught(() => p.ok && evalValue(p.node, sc({ k: 'a' })));
    expect(e.message).toBe('lookup(): kein Tabellenzugriff im Scope.');
    expect(e.recoverable).toBe(false);
  });
});

describe('C-1 scope: an arithmetic LHS keeps the legacy symbol-ref RHS (fix-wave item 1)', () => {
  it('x + y == z with z unvalued is pending on z, not a string comparison', () => {
    expect(evalCondition('x + y == z', sc({ x: 1, y: 2 }))).toEqual({ kind: 'pending', missingSymbols: ['z'] });
    expect(evalCondition('x + y == z', sc({ x: 1, y: 2, z: 3 }))).toEqual({ kind: 'pass' });
    expect(evalCondition('x + y == z', sc({ x: 1, y: 2, z: 4 }))).toEqual({ kind: 'fail' });
    expect(evalCondition('x + y != z', sc({ x: 1, y: 2 }))).toEqual({ kind: 'pending', missingSymbols: ['z'] });
  });
  it('a hidden RHS symbol makes the gate not_applicable', () => {
    expect(evalCondition('x + y == z', sc({ x: 1, y: 2, z: 3 }), { hiddenSymbols: new Set(['z']) }))
      .toEqual({ kind: 'not_applicable', hiddenSymbols: ['z'] });
    // same for the simple compare form and the call-LHS form
    expect(evalCondition('x == z', sc({ x: 1, z: 1 }), { hiddenSymbols: new Set(['z']) }))
      .toEqual({ kind: 'not_applicable', hiddenSymbols: ['z'] });
    expect(evalCondition("lookup('TAB9', k, 'kind') == z", { ...sc({ k: 'a', z: 'paved' }), table: () => ({ kind: 'paved' }) }, { hiddenSymbols: new Set(['z']) }))
      .toEqual({ kind: 'not_applicable', hiddenSymbols: ['z'] });
    // an enum literal that merely shares a hidden symbol's name in a non-hidden gate is untouched
    expect(evalCondition('x == paved', sc({ x: 'paved' }), { hiddenSymbols: new Set(['other']) })).toEqual({ kind: 'pass' });
  });
  it('corpus gate DWA-A-102-2 REQ-04: A_b_a_I + A_b_a_II + A_b_a_III == A_b_a', () => {
    const g = 'A_b_a_I + A_b_a_II + A_b_a_III == A_b_a';
    expect(evalCondition(g, sc({ A_b_a_I: 100, A_b_a_II: 50, A_b_a_III: 25 }))).toEqual({ kind: 'pending', missingSymbols: ['A_b_a'] });
    expect(evalCondition(g, sc({ A_b_a_I: 100, A_b_a_II: 50, A_b_a_III: 25, A_b_a: 175 }))).toEqual({ kind: 'pass' });
    expect(evalCondition(g, sc({ A_b_a_I: 100, A_b_a_II: 50, A_b_a_III: 25, A_b_a: 170 }))).toEqual({ kind: 'fail' });
    expect(evalCondition(g, sc({ A_b_a_I: 100, A_b_a_II: 50, A_b_a_III: 25, A_b_a: 175 }), { hiddenSymbols: new Set(['A_b_a']) }))
      .toEqual({ kind: 'not_applicable', hiddenSymbols: ['A_b_a'] });
  });
  it('corpus gate DWA-M-102-4 REQ-18: A_E_k_b + A_E_k_nb == A_E_k', () => {
    expect(evalCondition('A_E_k_b + A_E_k_nb == A_E_k', sc({ A_E_k_b: 1, A_E_k_nb: 2 }))).toEqual({ kind: 'pending', missingSymbols: ['A_E_k'] });
  });
});
