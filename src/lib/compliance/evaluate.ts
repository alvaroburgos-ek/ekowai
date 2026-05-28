/**
 * Compliance condition evaluator.
 *
 * Handles the common machine-evaluable patterns in
 * `compliance_requirements.condition`:
 *   - comparisons:           k_f >= 1e-6, eta_hyd <= 100
 *   - existence:             symbol IS NOT NULL, symbol IS NOT EMPTY
 *   - membership:            x IN {a, b, c}
 *   - boolean equality:      flag == true, x == True
 *   - logical:               cond AND cond, cond OR cond, (cond)
 *   - guarded:               IF cond THEN cond (vacuously pass when guard is false)
 *
 * Anything that doesn't parse (natural-language prose like "Engineer attestation")
 * is reported as `manual` — neither pass nor fail.
 *
 * A condition that references a symbol with no value reported as `pending`.
 */

export type EvalResult =
  | { kind: 'pass' }
  | { kind: 'fail'; reason?: string }
  | { kind: 'pending'; missingSymbols: string[] }
  | { kind: 'manual' };

type Value = number | string | boolean | null;

type Token =
  | { type: 'ident'; value: string }
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'op'; value: '>=' | '<=' | '==' | '!=' | '<' | '>' }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'lbrace' }
  | { type: 'rbrace' }
  | { type: 'comma' }
  | { type: 'kw'; value: KeywordToken };

type KeywordToken =
  | 'IF' | 'THEN' | 'AND' | 'OR' | 'NOT' | 'IS' | 'NULL' | 'EMPTY' | 'IN'
  | 'TRUE' | 'FALSE';

const KEYWORDS: Record<string, KeywordToken> = {
  if: 'IF', then: 'THEN', and: 'AND', or: 'OR', not: 'NOT',
  is: 'IS', null: 'NULL', empty: 'EMPTY', in: 'IN',
  true: 'TRUE', false: 'FALSE',
};

function tokenize(src: string): Token[] | null {
  const toks: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '(') { toks.push({ type: 'lparen' }); i++; continue; }
    if (c === ')') { toks.push({ type: 'rparen' }); i++; continue; }
    if (c === '{') { toks.push({ type: 'lbrace' }); i++; continue; }
    if (c === '}') { toks.push({ type: 'rbrace' }); i++; continue; }
    if (c === ',') { toks.push({ type: 'comma' }); i++; continue; }
    if (c === '>' || c === '<' || c === '=' || c === '!') {
      const next = src[i + 1];
      if (c === '>' && next === '=') { toks.push({ type: 'op', value: '>=' }); i += 2; continue; }
      if (c === '<' && next === '=') { toks.push({ type: 'op', value: '<=' }); i += 2; continue; }
      if (c === '=' && next === '=') { toks.push({ type: 'op', value: '==' }); i += 2; continue; }
      if (c === '!' && next === '=') { toks.push({ type: 'op', value: '!=' }); i += 2; continue; }
      if (c === '<' && next === '>') { toks.push({ type: 'op', value: '!=' }); i += 2; continue; }
      if (c === '=') { toks.push({ type: 'op', value: '==' }); i++; continue; }
      if (c === '<') { toks.push({ type: 'op', value: '<' }); i++; continue; }
      if (c === '>') { toks.push({ type: 'op', value: '>' }); i++; continue; }
      return null;
    }
    if (c === "'" || c === '"') {
      const quote = c;
      let j = i + 1;
      while (j < src.length && src[j] !== quote) j++;
      if (j >= src.length) return null;
      toks.push({ type: 'string', value: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    // Number (incl. exponent, leading minus when at start of an operand)
    const numMatch = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(src.slice(i));
    if (numMatch && (c >= '0' && c <= '9' || (c === '-' && /\d/.test(src[i + 1] ?? '')))) {
      const lastTok = toks[toks.length - 1];
      const canBeNegative = !lastTok
        || lastTok.type === 'op' || lastTok.type === 'lparen'
        || lastTok.type === 'comma' || lastTok.type === 'kw';
      if (c === '-' && !canBeNegative) {
        // a bare minus we don't handle as binary subtraction — bail out
        return null;
      }
      toks.push({ type: 'number', value: Number(numMatch[0]) });
      i += numMatch[0].length;
      continue;
    }
    // Identifier or keyword
    const idMatch = /^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_]*/.exec(src.slice(i));
    if (idMatch) {
      const word = idMatch[0];
      const kw = KEYWORDS[word.toLowerCase()];
      if (kw) toks.push({ type: 'kw', value: kw });
      else toks.push({ type: 'ident', value: word });
      i += word.length;
      continue;
    }
    return null;
  }
  return toks;
}

class Parser {
  private pos = 0;
  constructor(private toks: Token[]) {}
  private peek(): Token | undefined { return this.toks[this.pos]; }
  private next(): Token | undefined { return this.toks[this.pos++]; }
  private eatKw(kw: KeywordToken): boolean {
    const t = this.peek();
    if (t?.type === 'kw' && t.value === kw) { this.pos++; return true; }
    return false;
  }

  parse(): Node | null {
    const node = this.parseOr();
    if (node === null) return null;
    if (this.pos !== this.toks.length) return null;
    return node;
  }

  // OR has lower precedence than AND
  private parseOr(): Node | null {
    let left = this.parseAnd();
    if (left === null) return null;
    while (this.eatKw('OR')) {
      const right = this.parseAnd();
      if (right === null) return null;
      left = { kind: 'or', left, right };
    }
    return left;
  }
  private parseAnd(): Node | null {
    let left = this.parseAtom();
    if (left === null) return null;
    while (this.eatKw('AND')) {
      const right = this.parseAtom();
      if (right === null) return null;
      left = { kind: 'and', left, right };
    }
    return left;
  }

  private parseAtom(): Node | null {
    // IF ... THEN ...
    if (this.eatKw('IF')) {
      const guard = this.parseOr();
      if (guard === null) return null;
      if (!this.eatKw('THEN')) return null;
      const body = this.parseOr();
      if (body === null) return null;
      return { kind: 'guard', guard, body };
    }
    // ( expr )
    const t = this.peek();
    if (t?.type === 'lparen') {
      this.next();
      const expr = this.parseOr();
      if (expr === null) return null;
      if (this.peek()?.type !== 'rparen') return null;
      this.next();
      return expr;
    }
    // NOT atom
    if (this.eatKw('NOT')) {
      const inner = this.parseAtom();
      if (inner === null) return null;
      return { kind: 'not', inner };
    }
    return this.parseComparison();
  }

  // Comparison forms:
  //   ident OP literal       -> compare
  //   ident IS [NOT] NULL    -> existence
  //   ident IS [NOT] EMPTY   -> existence
  //   ident IN { lit, ... }  -> membership
  //   ident                  -> truthy test (boolean field == true)
  private parseComparison(): Node | null {
    const t = this.next();
    if (!t) return null;
    if (t.type === 'kw' && t.value === 'TRUE') return { kind: 'lit', value: true };
    if (t.type === 'kw' && t.value === 'FALSE') return { kind: 'lit', value: false };
    if (t.type !== 'ident') return null;
    const sym = t.value;
    const next = this.peek();
    if (!next) return { kind: 'truthy', symbol: sym };

    if (next.type === 'op') {
      this.next();
      const lit = this.parseLiteral();
      if (lit === null) return null;
      return { kind: 'compare', symbol: sym, op: next.value, rhs: lit };
    }
    if (next.type === 'kw' && next.value === 'IS') {
      this.next();
      const negate = this.eatKw('NOT');
      const which = this.next();
      if (which?.type !== 'kw' || (which.value !== 'NULL' && which.value !== 'EMPTY')) return null;
      return { kind: 'exists', symbol: sym, negate };
    }
    if (next.type === 'kw' && next.value === 'IN') {
      this.next();
      if (this.peek()?.type !== 'lbrace') return null;
      this.next();
      const members: Literal[] = [];
      while (this.peek()?.type !== 'rbrace') {
        const lit = this.parseLiteral();
        if (lit === null) return null;
        members.push(lit);
        if (this.peek()?.type === 'comma') this.next();
        else if (this.peek()?.type !== 'rbrace') return null;
      }
      this.next();
      return { kind: 'in', symbol: sym, members };
    }
    return { kind: 'truthy', symbol: sym };
  }

  private parseLiteral(): Literal | null {
    const t = this.next();
    if (!t) return null;
    if (t.type === 'number') return { kind: 'lit', value: t.value };
    if (t.type === 'string') return { kind: 'lit', value: t.value };
    if (t.type === 'kw' && t.value === 'TRUE') return { kind: 'lit', value: true };
    if (t.type === 'kw' && t.value === 'FALSE') return { kind: 'lit', value: false };
    if (t.type === 'kw' && t.value === 'NULL') return { kind: 'lit', value: null };
    // Allow bare identifier as a string literal on the RHS — engineers write
    // things like `investment_type IN {ersatz, erneuerung}`.
    if (t.type === 'ident') return { kind: 'lit', value: t.value };
    return null;
  }
}

type Literal = { kind: 'lit'; value: number | string | boolean | null };
type Node =
  | Literal
  | { kind: 'truthy'; symbol: string }
  | { kind: 'compare'; symbol: string; op: '>=' | '<=' | '==' | '!=' | '<' | '>'; rhs: Literal }
  | { kind: 'exists'; symbol: string; negate: boolean }
  | { kind: 'in'; symbol: string; members: Literal[] }
  | { kind: 'and'; left: Node; right: Node }
  | { kind: 'or'; left: Node; right: Node }
  | { kind: 'not'; inner: Node }
  | { kind: 'guard'; guard: Node; body: Node };

type EvalState = { missing: Set<string> };

type TernaryResult = 'true' | 'false' | 'missing';

function evalNode(n: Node, lookup: (sym: string) => Value | undefined, st: EvalState): TernaryResult {
  switch (n.kind) {
    case 'lit':
      if (typeof n.value === 'boolean') return n.value ? 'true' : 'false';
      return 'missing'; // a bare literal as a condition isn't meaningful
    case 'truthy': {
      const v = lookup(n.symbol);
      if (v === undefined || v === null || v === '') { st.missing.add(n.symbol); return 'missing'; }
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      return 'true';
    }
    case 'exists': {
      const v = lookup(n.symbol);
      const exists = v !== undefined && v !== null && v !== '';
      const result = n.negate ? exists : !exists;
      return result ? 'true' : 'false';
    }
    case 'compare': {
      const v = lookup(n.symbol);
      if (v === undefined || v === null || v === '') { st.missing.add(n.symbol); return 'missing'; }
      const r = n.rhs.value;
      return compare(v, n.op, r) ? 'true' : 'false';
    }
    case 'in': {
      const v = lookup(n.symbol);
      if (v === undefined || v === null || v === '') { st.missing.add(n.symbol); return 'missing'; }
      const matched = n.members.some((m) => equals(v, m.value));
      return matched ? 'true' : 'false';
    }
    case 'and': {
      const l = evalNode(n.left, lookup, st);
      const r = evalNode(n.right, lookup, st);
      if (l === 'false' || r === 'false') return 'false';
      if (l === 'missing' || r === 'missing') return 'missing';
      return 'true';
    }
    case 'or': {
      const l = evalNode(n.left, lookup, st);
      const r = evalNode(n.right, lookup, st);
      if (l === 'true' || r === 'true') return 'true';
      if (l === 'missing' || r === 'missing') return 'missing';
      return 'false';
    }
    case 'not': {
      const v = evalNode(n.inner, lookup, st);
      if (v === 'missing') return 'missing';
      return v === 'true' ? 'false' : 'true';
    }
    case 'guard': {
      // IF guard THEN body — vacuously pass when guard is false;
      // pending when guard is missing.
      const g = evalNode(n.guard, lookup, { missing: new Set() });
      if (g === 'missing') {
        // Treat guard symbols as pending only for the guard sub-tree.
        const tmp: EvalState = { missing: new Set() };
        evalNode(n.guard, lookup, tmp);
        for (const m of tmp.missing) st.missing.add(m);
        return 'missing';
      }
      if (g === 'false') return 'true';
      return evalNode(n.body, lookup, st);
    }
  }
}

function compare(v: Value, op: string, r: Value): boolean {
  // Numeric comparison if both sides parse to finite numbers.
  const ln = toNumber(v);
  const rn = toNumber(r);
  if (ln !== null && rn !== null) {
    switch (op) {
      case '>=': return ln >= rn;
      case '<=': return ln <= rn;
      case '==': return ln === rn;
      case '!=': return ln !== rn;
      case '<': return ln < rn;
      case '>': return ln > rn;
    }
  }
  // Equality across heterogeneous types — coerce to string.
  if (op === '==') return equals(v, r);
  if (op === '!=') return !equals(v, r);
  return false;
}

function equals(a: Value, b: Value): boolean {
  if (a === null || b === null) return a === b;
  if (typeof a === typeof b) return a === b;
  // boolean ↔ string ('true'/'false')
  if (typeof a === 'boolean' && typeof b === 'string') return String(a).toLowerCase() === b.toLowerCase();
  if (typeof a === 'string' && typeof b === 'boolean') return a.toLowerCase() === String(b).toLowerCase();
  // number ↔ string
  if (typeof a === 'number' && typeof b === 'string') return a === Number(b);
  if (typeof a === 'string' && typeof b === 'number') return Number(a) === b;
  return false;
}

function toNumber(v: Value): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Evaluate a compliance condition against the current symbol→value map.
 *
 * Unparseable conditions return `manual`. Conditions whose referenced
 * symbols have no value return `pending` with the missing list.
 */
export function evaluateCondition(
  condition: string,
  valuesBySymbol: (sym: string) => Value | undefined,
): EvalResult {
  if (!condition || !condition.trim()) return { kind: 'manual' };
  const toks = tokenize(condition);
  if (!toks || toks.length === 0) return { kind: 'manual' };
  const ast = new Parser(toks).parse();
  if (!ast) return { kind: 'manual' };
  const st: EvalState = { missing: new Set() };
  const result = evalNode(ast, valuesBySymbol, st);
  if (result === 'missing') return { kind: 'pending', missingSymbols: [...st.missing] };
  return result === 'true' ? { kind: 'pass' } : { kind: 'fail' };
}
