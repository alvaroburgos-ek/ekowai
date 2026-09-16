import { describe, it, expect } from 'vitest';
import { evalNumber, evalCondition, evalValue, extractSymbols } from '../evaluate';
import { parseNumeric, parseCondition } from '../parser';
import type { Scope } from '../scope';

const sc = (vals: Record<string, number | string | boolean | null>): Scope => ({ symbol: (s) => (s in vals ? vals[s] : undefined) });

describe('evalNumber — strict mode reproduces arithmetic.ts', () => {
  it('computes with precedence, power and the 7 math functions (case-insensitive, lg alias)', () => {
    expect(evalNumber('2 + 3 * 4 ^ 2', sc({}))).toBe(50);
    expect(evalNumber('SQRT(16) + Lg(100) + min(3, 2) + max(1, abs(-5))', sc({}))).toBe(4 + 2 + 2 + 5);
    expect(evalNumber('e^(-k*t)', { symbol: (s) => ({ e: Math.E, k: 1, t: 0 } as Record<string, number>)[s] })).toBeCloseTo(1, 12);
  });
  it('throws the exact arithmetic.ts messages', () => {
    expect(() => evalNumber('a / 0', sc({ a: 1 }))).toThrow('Division durch Null.');
    expect(() => evalNumber('x + 1', sc({}))).toThrow('Unbekanntes Symbol "x" im Ausdruck.');
    expect(() => evalNumber('SUM(a)', sc({ a: 1 }))).toThrow('Funktionsaufruf "SUM(...)" wird nicht unterstützt — Rewrite-Regel erforderlich.');
    expect(() => evalNumber('ln(0)', sc({}))).toThrow(/Nicht-endliches Ergebnis/);
    expect(() => evalNumber('a # 1', sc({ a: 1 }))).toThrow('Unerwartetes Zeichen "#" an Position 2.');
  });
  it('if() short-circuits and accepts a condition or a truthy value as its test', () => {
    expect(evalNumber("if(kind == 'paved', 1, 1/0)", sc({ kind: 'paved' }))).toBe(1);
    expect(evalNumber('if(flag, 10, 20)', sc({ flag: false }))).toBe(20);
    expect(evalNumber('if(n > 2 AND m IS NOT NULL, 1, 0)', sc({ n: 3, m: 'x' }))).toBe(1);
    expect(() => evalNumber("if(kind == 'paved', 1, 0)", sc({}))).toThrow('Fehlende Eingabe für if(): kind');
  });
  it('a top-level string result is not a number', () => {
    expect(() => evalNumber("lookup('TAB9', k, 'kind')", { ...sc({ k: 'a' }), table: () => ({ kind: 'paved' }) })).toThrow('Nicht-endliches Ergebnis: paved');
  });
});

describe('evalValue — strict, string results allowed', () => {
  it('lookup() resolves through Scope.table with the key values in order', () => {
    const calls: unknown[] = [];
    const scope: Scope = { ...sc({ tier: 'tier2', band: 'thick' }), table: (code, keys) => { calls.push([code, keys]); return { max: 50 }; } };
    const node = parseNumeric("lookup('TAB6', tier, band, 'max')");
    expect(node.ok && evalValue(node.node, scope)).toBe(50);
    expect(calls).toEqual([['TAB6', ['tier2', 'thick']]]);
  });
  it('lookup() with no matching row throws a recoverable error', () => {
    const node = parseNumeric("lookup('TAB9', k, 'cm')");
    expect(() => node.ok && evalValue(node.node, { ...sc({ k: 'nope' }), table: () => undefined })).toThrow("lookup(): keine Zeile in TAB9 für Schlüssel [nope]");
  });
  it('row values shadow scope symbols', () => {
    const node = parseNumeric('area_m2 * c_i');
    expect(node.ok && evalValue(node.node, sc({ area_m2: 1, c_i: 1 }), { area_m2: 100, c_i: 0.9 })).toBeCloseTo(90);
  });
});

describe('evalCondition — lenient mode reproduces compliance/evaluate.ts', () => {
  it('pass / fail / pending / manual', () => {
    expect(evalCondition('k_f >= 1e-6', sc({ k_f: 1e-5 }))).toEqual({ kind: 'pass' });
    expect(evalCondition('k_f >= 1e-6', sc({ k_f: 1e-7 }))).toEqual({ kind: 'fail' });
    expect(evalCondition('k_f >= 1e-6', sc({}))).toEqual({ kind: 'pending', missingSymbols: ['k_f'] });
    expect(evalCondition('Engineer attestation', sc({}))).toEqual({ kind: 'manual' });
    expect(evalCondition('V_Rueck >= Q * 25', sc({ V_Rueck: 100, Q: 0 }))).toEqual({ kind: 'pass' });
    expect(evalCondition('a / b > 1', sc({ a: 1, b: 0 }))).toEqual({ kind: 'pending', missingSymbols: [] });
  });
  it('a call with an unknown function name is manual, not fail', () => {
    expect(evalCondition('SUM(a) > 1', sc({ a: 1 }))).toEqual({ kind: 'manual' });
  });
  it('a hidden symbol makes the gate not_applicable before evaluation', () => {
    expect(evalCondition('x >= 1 AND y == 2', sc({ x: 5, y: 2 }), { hiddenSymbols: new Set(['y']) }))
      .toEqual({ kind: 'not_applicable', hiddenSymbols: ['y'] });
    expect(evalCondition('x >= 1', sc({ x: 5 }), { hiddenSymbols: new Set(['y']) })).toEqual({ kind: 'pass' });
  });
  it('count_rows() in a condition reads a register from the scope', () => {
    const reg = { rows: [{ id: '1', values: { v: 3 }, complete: true }, { id: '2', values: { v: 9 }, complete: true }, { id: '3', values: { v: 1 }, complete: false }], flags: {} };
    const scope: Scope = { ...sc({ limit: 5 }), register: () => reg };
    expect(evalCondition('count_rows(samples, v <= limit) >= 1', scope)).toEqual({ kind: 'pass' });
    expect(evalCondition('count_rows(samples) == 2', scope)).toEqual({ kind: 'pass' });
  });
  it('count_rows(): an undecidable row makes the whole count undecidable (condition and truthy paths alike)', () => {
    const reg = { rows: [{ id: '1', values: { v: 3 }, complete: true }, { id: '2', values: { v: 9 }, complete: true }], flags: {} };
    const noLimit: Scope = { ...sc({}), register: () => reg };
    expect(evalCondition('count_rows(samples, v <= limit) >= 1', noLimit)).toEqual({ kind: 'pending', missingSymbols: ['limit'] });
    expect(evalCondition('count_rows(samples, v * limit) >= 1', noLimit)).toEqual({ kind: 'pending', missingSymbols: ['limit'] });
    const withLimit: Scope = { ...sc({ limit: 5 }), register: () => reg };
    expect(evalCondition('count_rows(samples, v <= limit) >= 1', withLimit)).toEqual({ kind: 'pass' });
    expect(evalCondition('count_rows(samples, v * limit) >= 1', withLimit)).toEqual({ kind: 'pass' });
    const nullCell = { rows: [{ id: '1', values: { flagcol: 1 }, complete: true }, { id: '2', values: { flagcol: null }, complete: true }], flags: {} };
    const s: Scope = { ...sc({}), register: () => nullCell };
    expect(() => evalNumber('count_rows(reg, flagcol == 1)', s)).toThrow('Fehlende Eingabe für count_rows(): flagcol');
    expect(() => evalNumber('count_rows(reg, flagcol)', s)).toThrow('Fehlende Eingabe für count_rows(): flagcol');
  });
});

describe('strict-mode parity rulings', () => {
  it('finiteness is checked on the FINAL result only (arithmetic.ts:268); division by zero still throws at the operation', () => {
    expect(evalNumber('1 / exp(1000)', sc({}))).toBe(0);
    expect(() => evalNumber('ln(0)', sc({}))).toThrow('Nicht-endliches Ergebnis: -Infinity');
    expect(() => evalNumber('exp(1000)', sc({}))).toThrow('Nicht-endliches Ergebnis: Infinity');
    expect(() => evalNumber('1 / (2 - 2)', sc({}))).toThrow('Division durch Null.');
  });
  it('a null operand throws the recoverable "Operand ist keine Zahl: null"', () => {
    expect(() => evalNumber('a + NULL', sc({ a: 1 }))).toThrow('Operand ist keine Zahl: null');
    const p = parseNumeric("lookup('T', k, 'cm') * 2");
    expect(() => p.ok && evalValue(p.node, { ...sc({ k: 1 }), table: () => ({ cm: null }) })).toThrow('Operand ist keine Zahl: null');
  });
  it('lookup() without Scope.table is a non-recoverable error in strict mode and null in lenient mode', () => {
    expect(() => evalNumber("lookup('T', k, 'cm')", sc({ k: 1 }))).toThrow('lookup(): kein Tabellenzugriff im Scope.');
    expect(evalCondition("lookup('T', k, 'cm') > 1", sc({ k: 1 }))).toEqual({ kind: 'pending', missingSymbols: [] });
  });
});

describe('extractSymbols', () => {
  it('collects refs incl. call args, never string literals or enum-literal RHS', () => {
    const n = parseCondition("lookup('TAB9', k, 'kind') == paved AND x IN {a, b}");
    expect(n).not.toBeNull();
    expect([...extractSymbols(n as NonNullable<typeof n>)].sort()).toEqual(['k', 'x']);
  });
  it('collects register symbols but never identifiers inside row-scoped expressions', () => {
    const n = parseCondition("count_rows(samples, v <= limit) >= 1 AND sum_rows(last_rows(reg, 3), area_m2 * c_i) > 0");
    expect(n).not.toBeNull();
    expect([...extractSymbols(n as NonNullable<typeof n>)].sort()).toEqual(['reg', 'samples']);
  });
});
