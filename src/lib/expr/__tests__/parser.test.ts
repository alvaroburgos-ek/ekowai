import { describe, it, expect } from 'vitest';
import { tokenize } from '../tokens';
import { parseCondition, parseNumeric, parseExpression } from '../parser';
import { isConditionNode } from '../ast';

describe('tokenize — union of the compliance and arithmetic tokenizers', () => {
  it('keeps every compliance token and adds ^', () => {
    const r = tokenize("x >= 1e-6 AND y IN {a, 'b'} OR z^2");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tokens.map((t) => t.type)).toEqual([
      'ident','op','number','kw','ident','kw','lbrace','ident','comma','string','rbrace','kw','ident','aop','number',
    ]);
  });
  it('accepts .5 and scientific notation like arithmetic.ts', () => {
    const r = tokenize('.5 * 1.23e+4');
    expect(r.ok && r.tokens[0]).toEqual({ type: 'number', value: 0.5 });
  });
  it('folds a negative literal after an operator but not after an operand (10^-4, 2 - 3)', () => {
    const a = tokenize('10^-4'); const b = tokenize('2 - 3');
    expect(a.ok && a.tokens.map((t) => t.type)).toEqual(['number','aop','number']);
    expect(b.ok && b.tokens.map((t) => t.type)).toEqual(['number','aop','number']);
    expect(b.ok && b.tokens[1]).toEqual({ type: 'aop', value: '-' });
  });
  it('reports the arithmetic.ts unknown-character message', () => {
    const r = tokenize('a # b');
    expect(r).toEqual({ ok: false, message: 'Unerwartetes Zeichen "#" an Position 2.' });
  });
  it('reports an unterminated string', () => {
    expect(tokenize("x == 'abc")).toEqual({ ok: false, message: 'Nicht abgeschlossene Zeichenkette an Position 5.' });
  });
});

describe('parseNumeric — the arithmetic grammar', () => {
  it('parses -x^2 as -(x^2) and 2^3^2 right-associatively', () => {
    const a = parseNumeric('-x^2');
    expect(a.ok && a.node).toEqual({ kind: 'aneg', inner: { kind: 'abin', op: '^', left: { kind: 'aref', symbol: 'x' }, right: { kind: 'anum', value: 2 } } });
    const b = parseNumeric('2^3^2');
    expect(b.ok && b.node).toEqual({ kind: 'abin', op: '^', left: { kind: 'anum', value: 2 }, right: { kind: 'abin', op: '^', left: { kind: 'anum', value: 3 }, right: { kind: 'anum', value: 2 } } });
  });
  it('parses function calls with arithmetic and condition arguments', () => {
    const r = parseNumeric("sum_rows(surface_inventory, if(kind == 'paved', area_m2 * c_i, 0))");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.node.kind).toBe('call');
    if (r.node.kind !== 'call') return;
    expect(r.node.name).toBe('sum_rows');
    expect(r.node.args[0]).toEqual({ kind: 'aref', symbol: 'surface_inventory' });
    const inner = r.node.args[1];
    expect(inner.kind).toBe('call');
    if (inner.kind !== 'call') return;
    expect(inner.name).toBe('if');
    expect(isConditionNode(inner.args[0])).toBe(true);
    expect(inner.args[0]).toEqual({ kind: 'compare', symbol: 'kind', op: '==', rhs: { kind: 'lit', value: 'paved' } });
    expect(isConditionNode(inner.args[1])).toBe(false);
  });
  it("parses lookup('TAB9', tab9_value, 'kind') with string-literal args", () => {
    const r = parseNumeric("lookup('TAB9', tab9_value, 'kind')");
    expect(r.ok && r.node).toEqual({ kind: 'call', name: 'lookup', args: [
      { kind: 'astr', value: 'TAB9' }, { kind: 'aref', symbol: 'tab9_value' }, { kind: 'astr', value: 'kind' },
    ] });
  });
  it('treats a leading unary + as identity, like arithmetic.ts (+5, 10^+3, x + +y)', () => {
    expect(parseNumeric('+5')).toEqual({ ok: true, node: { kind: 'anum', value: 5 } });
    const p = parseNumeric('10^+3');
    expect(p.ok && p.node).toEqual({ kind: 'abin', op: '^', left: { kind: 'anum', value: 10 }, right: { kind: 'anum', value: 3 } });
    const q = parseNumeric('x + +y');
    expect(q.ok && q.node).toEqual({ kind: 'abin', op: '+', left: { kind: 'aref', symbol: 'x' }, right: { kind: 'aref', symbol: 'y' } });
    const r = parseNumeric('+-x');
    expect(r.ok && r.node).toEqual({ kind: 'aneg', inner: { kind: 'aref', symbol: 'x' } });
  });
  it('rejects trailing tokens and a bare condition with the arithmetic.ts messages', () => {
    expect(parseNumeric('a b')).toEqual({ ok: false, message: 'Unerwartetes Token am Ende des Ausdrucks.' });
    expect(parseNumeric('(a + b')).toEqual({ ok: false, message: 'Fehlende schließende Klammer.' });
    expect(parseNumeric('')).toEqual({ ok: false, message: 'Ausdruck endet vorzeitig.' });
    expect(parseNumeric('a >= b').ok).toBe(false);
  });
});

describe('parseCondition — legacy semantics preserved', () => {
  it('bare-ident RHS of == stays a string literal; relational RHS is a symbol ref', () => {
    expect(parseCondition('status == approved')).toEqual({ kind: 'compare', symbol: 'status', op: '==', rhs: { kind: 'lit', value: 'approved' } });
    expect(parseCondition('V_s >= V_S_min')).toEqual({ kind: 'acompare', left: { kind: 'aref', symbol: 'V_s' }, op: '>=', right: { kind: 'aref', symbol: 'V_S_min' } });
  });
  it('IF … THEN … stays a guard; if(…) inside a comparison is a call', () => {
    const g = parseCondition('IF (a AND b) THEN c >= 1');
    expect(g?.kind).toBe('guard');
    const c = parseCondition("if(flag, 1, 0) >= 1");
    expect(c?.kind).toBe('acompare');
    if (c?.kind === 'acompare') expect(c.left.kind).toBe('call');
  });
  it('parses NOT, IS NOT NULL, IN {…} and parenthesised logical grouping', () => {
    expect(parseCondition('NOT x')).toEqual({ kind: 'not', inner: { kind: 'truthy', symbol: 'x' } });
    expect(parseCondition('x IS NOT NULL')).toEqual({ kind: 'exists', symbol: 'x', negate: true });
    expect(parseCondition("x IN {a, 'b'}")).toEqual({ kind: 'in', symbol: 'x', members: [
      { kind: 'lit', value: 'a' }, { kind: 'lit', value: 'b' },
    ] });
    expect(parseCondition('(a >= 1 OR b >= 1) AND c >= 1')).toEqual({ kind: 'and',
      left: { kind: 'or',
        left: { kind: 'compare', symbol: 'a', op: '>=', rhs: { kind: 'lit', value: 1 } },
        right: { kind: 'compare', symbol: 'b', op: '>=', rhs: { kind: 'lit', value: 1 } } },
      right: { kind: 'compare', symbol: 'c', op: '>=', rhs: { kind: 'lit', value: 1 } },
    });
  });
  it('an unknown character or unbalanced brace still yields null (manual)', () => {
    expect(parseCondition('x # 1')).toBeNull();
    expect(parseCondition('x IN {a, b')).toBeNull();
  });
});

describe('parseExpression', () => {
  it('classifies a top-level condition vs arithmetic', () => {
    expect(isConditionNode(parseExpression('a >= b')!)).toBe(true);
    expect(isConditionNode(parseExpression('a * b')!)).toBe(false);
  });
});
