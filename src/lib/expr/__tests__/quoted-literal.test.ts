/**
 * Task 13b (sign-off din276-X-1, controller ruling 2026-09-18): a QUOTED
 * string literal on the right of `==` / `!=` (and inside `IN {…}`) is a
 * literal, always — it never resolves as a symbol, even when a valued symbol
 * (worksheet field or register column) of that name is in scope. A BARE
 * identifier keeps the legacy var-vs-var rule (resolve if valued, else its own
 * name as the token). Pinned on every comparison path: `compare`, `acompare`
 * (call LHS), `in`, `if()` inside `evalValue` / `evalNumber`, row-scoped
 * `count_rows`, and the static walks (`extractSymbols`, `hiddenReferences`,
 * the explainer).
 */
import { describe, it, expect } from 'vitest';
import { evalCondition, evalNumber, evalValue, extractSymbols, hiddenReferences } from '../evaluate';
import { parseCondition, parseNumeric } from '../parser';
import type { Scope } from '../scope';
import { explainCondition } from '@/lib/compliance/explain';

const sc = (vals: Record<string, number | string | boolean | null>): Scope => ({ symbol: (s) => (s in vals ? vals[s] : undefined) });

describe('(a) quoted RHS is a literal even when a valued symbol of that name exists', () => {
  it("evalCondition: status == 'rechnung' compares against the token", () => {
    expect(evalCondition("status == 'rechnung'", sc({ status: 'rechnung', rechnung: 1000 }))).toEqual({ kind: 'pass' });
    expect(evalCondition("status == 'rechnung'", sc({ status: 'auftrag', rechnung: 1000 }))).toEqual({ kind: 'fail' });
    expect(evalCondition("status != 'rechnung'", sc({ status: 'rechnung', rechnung: 1000 }))).toEqual({ kind: 'fail' });
    // even when the symbol's VALUE happens to equal the status (the legacy rule would pass by accident)
    expect(evalCondition("status == 'rechnung'", sc({ status: 'x', rechnung: 'x' }))).toEqual({ kind: 'fail' });
    // double quotes are the same token type
    expect(evalCondition('status == "rechnung"', sc({ status: 'rechnung', rechnung: 1000 }))).toEqual({ kind: 'pass' });
  });
  it("if(status == 'rechnung', rechnung, auftrag) inside evalValue / evalNumber reads the token, not the amount column", () => {
    const p = parseNumeric("if(status == 'rechnung', rechnung, auftrag)");
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    // row scope (register row): status + amount columns
    expect(evalValue(p.node, sc({}), { status: 'rechnung', rechnung: 950, auftrag: 1000 })).toBe(950);
    expect(evalValue(p.node, sc({}), { status: 'auftrag', rechnung: 300, auftrag: 320 })).toBe(320);
    // worksheet scope
    expect(evalNumber("if(status == 'rechnung', rechnung, auftrag)", sc({ status: 'auftrag', rechnung: 300, auftrag: 320 }))).toBe(320);
  });
});

describe('(b) + (c) bare-ident RHS keeps the legacy var-vs-var rule', () => {
  it('(b) status == rechnung with a valued rechnung resolves the symbol', () => {
    expect(evalCondition('status == rechnung', sc({ status: 'rechnung', rechnung: 1000 }))).toEqual({ kind: 'fail' });
    expect(evalCondition('status == rechnung', sc({ status: 1000, rechnung: 1000 }))).toEqual({ kind: 'pass' });
    expect(evalCondition('status != rechnung', sc({ status: 'rechnung', rechnung: 1000 }))).toEqual({ kind: 'pass' });
  });
  it('(c) status == rechnung with NO symbol rechnung compares the token', () => {
    expect(evalCondition('status == rechnung', sc({ status: 'rechnung' }))).toEqual({ kind: 'pass' });
    expect(evalCondition('status == rechnung', sc({ status: 'auftrag' }))).toEqual({ kind: 'fail' });
    // an unvalued (null / empty) symbol of that name is the same as no symbol
    expect(evalCondition('status == rechnung', sc({ status: 'rechnung', rechnung: null }))).toEqual({ kind: 'pass' });
    expect(evalCondition('status == rechnung', sc({ status: 'rechnung', rechnung: '' }))).toEqual({ kind: 'pass' });
  });
});

describe('(d) count_rows(reg, status == \'angebot\') on rows where angebot is a column', () => {
  const reg = {
    rows: [
      { id: 'r1', values: { status: 'angebot', angebot: 100, auftrag: null, rechnung: null }, complete: true },
      { id: 'r2', values: { status: 'auftrag', angebot: 200, auftrag: 210, rechnung: null }, complete: true },
      { id: 'r3', values: { status: 'angebot', angebot: 300, auftrag: null, rechnung: null }, complete: true },
      { id: 'r4', values: { status: 'rechnung', angebot: 400, auftrag: 410, rechnung: 405 }, complete: true },
    ],
    flags: {},
  };
  const s: Scope = { symbol: () => undefined, register: (n) => (n === 'reg' ? reg : undefined) };
  it('counts by the token', () => {
    expect(evalNumber("count_rows(reg, status == 'angebot')", s)).toBe(2);
    expect(evalNumber("count_rows(reg, status == 'rechnung')", s)).toBe(1);
    expect(evalNumber("count_rows(reg, status != 'angebot')", s)).toBe(2);
    expect(evalCondition("count_rows(reg, status == 'angebot') == 2", s)).toEqual({ kind: 'pass' });
  });
  it('bare ident inside the row scope still resolves a valued column (legacy pin)', () => {
    // `status == angebot` reads the column `angebot` (100, 200, …) — never equal to the status token
    expect(evalNumber('count_rows(reg, status == angebot)', s)).toBe(0);
  });
  it("sum_rows(reg, if(status == 'rechnung', rechnung, auftrag), status != 'angebot') reads the amounts by token", () => {
    expect(evalNumber("sum_rows(reg, if(status == 'rechnung', rechnung, auftrag), status != 'angebot')", s)).toBe(210 + 405);
  });
});

describe("(e) acompare: lookup(...) == 'tok' with a valued symbol tok compares the token", () => {
  const table: Scope['table'] = () => ({ kind: 'paved' });
  it('quoted RHS never resolves', () => {
    expect(evalCondition("lookup('TAB9', k, 'kind') == 'paved'", { ...sc({ k: 'a', paved: 'gravel' }), table })).toEqual({ kind: 'pass' });
    expect(evalCondition("lookup('TAB9', k, 'kind') != 'paved'", { ...sc({ k: 'a', paved: 'gravel' }), table })).toEqual({ kind: 'fail' });
    expect(evalCondition("lookup('TAB9', k, 'kind') == 'gravel'", { ...sc({ k: 'a', gravel: 'paved' }), table })).toEqual({ kind: 'fail' });
  });
  it('bare RHS keeps the C-1 rule (legacy pin)', () => {
    expect(evalCondition("lookup('TAB9', k, 'kind') == paved", { ...sc({ k: 'a', paved: 'gravel' }), table })).toEqual({ kind: 'fail' });
    expect(evalCondition("lookup('TAB9', k, 'kind') == paved", { ...sc({ k: 'a' }), table })).toEqual({ kind: 'pass' });
  });
});

describe("(f) x IN {'a', 'b'} — members are literals, quoted or bare", () => {
  it('a quoted member never resolves as a symbol', () => {
    expect(evalCondition("x IN {'a', 'b'}", sc({ x: 'a', a: 'zzz' }))).toEqual({ kind: 'pass' });
    expect(evalCondition("x IN {'a', 'b'}", sc({ x: 'zzz', a: 'zzz' }))).toEqual({ kind: 'fail' });
  });
  it('a bare member is ALSO a literal in IN {…} (current behaviour, pinned — IN never had the var-vs-var rule)', () => {
    expect(evalCondition('x IN {a, b}', sc({ x: 'a', a: 'zzz' }))).toEqual({ kind: 'pass' });
    expect(evalCondition('x IN {a, b}', sc({ x: 'zzz', a: 'zzz' }))).toEqual({ kind: 'fail' });
  });
});

describe('(g) static walks: a quoted literal is never a symbol reference', () => {
  it('the parser marks a quoted string literal and leaves a bare ident unmarked', () => {
    expect(parseCondition("status == 'rechnung'")).toEqual({ kind: 'compare', symbol: 'status', op: '==', rhs: { kind: 'lit', value: 'rechnung', quoted: true } });
    expect(parseCondition('status == rechnung')).toEqual({ kind: 'compare', symbol: 'status', op: '==', rhs: { kind: 'lit', value: 'rechnung' } });
    expect(parseCondition("x IN {'a', b}")).toEqual({ kind: 'in', symbol: 'x', members: [{ kind: 'lit', value: 'a', quoted: true }, { kind: 'lit', value: 'b' }] });
    // numbers / booleans / null are never "quoted"
    expect(parseCondition('x == 1')).toEqual({ kind: 'compare', symbol: 'x', op: '==', rhs: { kind: 'lit', value: 1 } });
    expect(parseCondition('x == TRUE')).toEqual({ kind: 'compare', symbol: 'x', op: '==', rhs: { kind: 'lit', value: true } });
  });
  it('extractSymbols lists neither a quoted nor a bare equality RHS', () => {
    const q = parseCondition("status == 'rechnung' AND lookup('T', k, 'c') == 'tok' AND x IN {'a', b}");
    expect(q && [...extractSymbols(q)].sort()).toEqual(['k', 'status', 'x']);
    const b = parseCondition('status == rechnung');
    expect(b && [...extractSymbols(b)]).toEqual(['status']);
  });
  it('hiddenReferences: a quoted RHS naming a hidden symbol does NOT make the gate not_applicable; a bare one still does', () => {
    const hidden = new Set(['rechnung']);
    const q = parseCondition("status == 'rechnung'");
    expect(q && hiddenReferences(q, hidden)).toEqual([]);
    expect(evalCondition("status == 'rechnung'", sc({ status: 'rechnung', rechnung: 1 }), { hiddenSymbols: hidden })).toEqual({ kind: 'pass' });
    const b = parseCondition('status == rechnung');
    expect(b && hiddenReferences(b, hidden)).toEqual(['rechnung']);
    expect(evalCondition('status == rechnung', sc({ status: 'rechnung', rechnung: 1 }), { hiddenSymbols: hidden })).toEqual({ kind: 'not_applicable', hiddenSymbols: ['rechnung'] });
    // the call-LHS form, quoted
    const t: Scope['table'] = () => ({ kind: 'paved' });
    expect(evalCondition("lookup('TAB9', k, 'kind') == 'paved'", { ...sc({ k: 'a', paved: 'x' }), table: t }, { hiddenSymbols: new Set(['paved']) })).toEqual({ kind: 'pass' });
  });
  it('the explainer judges the quoted leaf by the token and reports only the LHS symbol', () => {
    const lookup = (s: string) => ({ status: 'rechnung', rechnung: 1000 } as Record<string, number | string>)[s];
    const r = explainCondition("status == 'rechnung'", lookup);
    expect(r.kind).toBe('explained');
    if (r.kind !== 'explained') return;
    expect(r.leaves).toHaveLength(1);
    expect(r.leaves[0].satisfied).toBe(true);
    expect(r.leaves[0].actual).toBe('status = rechnung');
    expect(r.leaves[0].required).toBe('erforderlich: == rechnung');
    // the bare form keeps resolving (legacy): status 'rechnung' vs rechnung 1000 → violated
    const b = explainCondition('status == rechnung', lookup);
    expect(b.kind === 'explained' && b.leaves[0].satisfied).toBe(false);
  });
});
