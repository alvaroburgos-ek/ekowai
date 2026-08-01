/**
 * Compliance condition evaluator.
 *
 * Handles the common machine-evaluable patterns in
 * `compliance_requirements.condition`:
 *   - comparisons:           k_f >= 1e-6, eta_hyd <= 100
 *   - arithmetic operands:   V_Rueck >= Q * 25, total == a + b, R_energy - E_energy > 0
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
 *
 * Arithmetic note: arithmetic engages ONLY when +, -, *, / (or ·, ×) appear.
 * A simple `ident OP literal` / `ident OP ident` comparison keeps its original
 * semantics (bare-ident RHS = string literal) so existing gates are unchanged.
 * Arithmetic operands that reference a missing symbol, or compute a non-finite
 * result (e.g. division by zero), resolve to `pending` — never a false `fail`.
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
  | { type: 'aop'; value: '+' | '-' | '*' | '/' }
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
    // Arithmetic operators. Middle-dot (·) and × are accepted as multiplication.
    if (c === '+' || c === '*' || c === '/') { toks.push({ type: 'aop', value: c }); i++; continue; }
    if (c === '·' || c === '×') { toks.push({ type: 'aop', value: '*' }); i++; continue; }
    if (c === '-') {
      // Negative-number literal (when a value may begin here) vs binary subtraction.
      const lastTok = toks[toks.length - 1];
      const canBeNegative = !lastTok
        || lastTok.type === 'op' || lastTok.type === 'aop' || lastTok.type === 'lparen'
        || lastTok.type === 'comma' || lastTok.type === 'kw';
      const numM = /^-\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      if (canBeNegative && numM) { toks.push({ type: 'number', value: Number(numM[0]) }); i += numM[0].length; continue; }
      toks.push({ type: 'aop', value: '-' }); i++; continue;
    }
    if (c >= '0' && c <= '9') {
      const numMatch = /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      if (!numMatch) return null;
      toks.push({ type: 'number', value: Number(numMatch[0]) });
      i += numMatch[0].length;
      continue;
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
    // ( expr ) — could be a logical grouping OR a leading parenthesised arithmetic
    // operand. Try logical grouping first; if the paren turns out to be followed by a
    // comparison/arithmetic operator (i.e. it was an arithmetic operand), backtrack
    // and let parseComparison handle the whole arithmetic expression.
    const t = this.peek();
    if (t?.type === 'lparen') {
      const save = this.pos;
      this.next();
      const expr = this.parseOr();
      if (expr !== null && this.peek()?.type === 'rparen') {
        this.next();
        const after = this.peek();
        if (!(after && (after.type === 'op' || after.type === 'aop'))) return expr;
      }
      this.pos = save;
      return this.parseComparison();
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
  //   expr OP expr           -> compare (simple) or acompare (arithmetic)
  //   ident IS [NOT] NULL    -> existence
  //   ident IS [NOT] EMPTY   -> existence
  //   ident IN { lit, ... }  -> membership
  //   ident                  -> truthy test (boolean field == true)
  private parseComparison(): Node | null {
    const left = this.parseArithExpr();
    if (left === null) return null;
    const next = this.peek();

    // existence / membership require a single bare symbol on the left
    if (next?.type === 'kw' && next.value === 'IS') {
      if (left.kind !== 'aref') return null;
      this.next();
      const negate = this.eatKw('NOT');
      const which = this.next();
      if (which?.type !== 'kw' || (which.value !== 'NULL' && which.value !== 'EMPTY')) return null;
      return { kind: 'exists', symbol: left.symbol, negate };
    }
    if (next?.type === 'kw' && next.value === 'IN') {
      if (left.kind !== 'aref') return null;
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
      return { kind: 'in', symbol: left.symbol, members };
    }

    if (next?.type === 'op') {
      this.next();
      const right = this.parseArithExpr();
      if (right === null) return null;
      // Backward-compatible simple comparison: a bare symbol on the left compared to a
      // single literal/bare-ident on the right keeps the original string-literal RHS
      // semantics — EXCEPT for relational operators, where a bare-ident RHS is a value
      // reference, not an enum literal (`V_s >= V_S_min` must resolve V_S_min). Enum
      // equality (`status == some_value`) stays on the legacy literal path.
      const relational = next.value === '>=' || next.value === '<=' || next.value === '>' || next.value === '<';
      if (left.kind === 'aref' && isSimpleOperand(right) && !(relational && right.kind === 'aref')) {
        return { kind: 'compare', symbol: left.symbol, op: next.value, rhs: operandToLiteral(right) };
      }
      return { kind: 'acompare', left, op: next.value, right };
    }

    // No operator follows.
    if (left.kind === 'aref') return { kind: 'truthy', symbol: left.symbol };
    if (left.kind === 'abool') return { kind: 'lit', value: left.value };
    return null; // a bare arithmetic expression is not a meaningful condition
  }

  // arithExpr := term (('+'|'-') term)*
  private parseArithExpr(): ArithNode | null {
    let left = this.parseTerm();
    if (left === null) return null;
    for (;;) {
      const t = this.peek();
      if (t?.type === 'aop' && (t.value === '+' || t.value === '-')) {
        this.next();
        const right = this.parseTerm();
        if (right === null) return null;
        left = { kind: 'abin', op: t.value, left, right };
      } else break;
    }
    return left;
  }

  // term := factor (('*'|'/') factor)*
  private parseTerm(): ArithNode | null {
    let left = this.parseFactor();
    if (left === null) return null;
    for (;;) {
      const t = this.peek();
      if (t?.type === 'aop' && (t.value === '*' || t.value === '/')) {
        this.next();
        const right = this.parseFactor();
        if (right === null) return null;
        left = { kind: 'abin', op: t.value, left, right };
      } else break;
    }
    return left;
  }

  // factor := '-' factor | '(' arithExpr ')' | number | string | TRUE | FALSE | NULL | ident
  private parseFactor(): ArithNode | null {
    const t = this.peek();
    if (!t) return null;
    if (t.type === 'aop' && t.value === '-') {
      this.next();
      const f = this.parseFactor();
      if (f === null) return null;
      return { kind: 'aneg', inner: f };
    }
    if (t.type === 'lparen') {
      this.next();
      const e = this.parseArithExpr();
      if (e === null) return null;
      if (this.peek()?.type !== 'rparen') return null;
      this.next();
      return e;
    }
    if (t.type === 'number') { this.next(); return { kind: 'anum', value: t.value }; }
    if (t.type === 'string') { this.next(); return { kind: 'astr', value: t.value }; }
    if (t.type === 'kw' && t.value === 'TRUE') { this.next(); return { kind: 'abool', value: true }; }
    if (t.type === 'kw' && t.value === 'FALSE') { this.next(); return { kind: 'abool', value: false }; }
    if (t.type === 'kw' && t.value === 'NULL') { this.next(); return { kind: 'anull' }; }
    if (t.type === 'ident') { this.next(); return { kind: 'aref', symbol: t.value }; }
    return null;
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

type ArithNode =
  | { kind: 'anum'; value: number }
  | { kind: 'astr'; value: string }
  | { kind: 'abool'; value: boolean }
  | { kind: 'anull' }
  | { kind: 'aref'; symbol: string }
  | { kind: 'abin'; op: '+' | '-' | '*' | '/'; left: ArithNode; right: ArithNode }
  | { kind: 'aneg'; inner: ArithNode };

type Node =
  | Literal
  | { kind: 'truthy'; symbol: string }
  | { kind: 'compare'; symbol: string; op: '>=' | '<=' | '==' | '!=' | '<' | '>'; rhs: Literal }
  | { kind: 'acompare'; left: ArithNode; op: '>=' | '<=' | '==' | '!=' | '<' | '>'; right: ArithNode }
  | { kind: 'exists'; symbol: string; negate: boolean }
  | { kind: 'in'; symbol: string; members: Literal[] }
  | { kind: 'and'; left: Node; right: Node }
  | { kind: 'or'; left: Node; right: Node }
  | { kind: 'not'; inner: Node }
  | { kind: 'guard'; guard: Node; body: Node };

/** A simple (non-arithmetic) terminal operand suitable for the legacy compare path. */
function isSimpleOperand(n: ArithNode): boolean {
  return n.kind === 'anum' || n.kind === 'astr' || n.kind === 'abool'
    || n.kind === 'anull' || n.kind === 'aref';
}
function operandToLiteral(n: ArithNode): Literal {
  switch (n.kind) {
    case 'anum': return { kind: 'lit', value: n.value };
    case 'astr': return { kind: 'lit', value: n.value };
    case 'abool': return { kind: 'lit', value: n.value };
    case 'anull': return { kind: 'lit', value: null };
    case 'aref': return { kind: 'lit', value: n.symbol }; // bare ident → string literal (legacy)
    default: return { kind: 'lit', value: null };
  }
}

type EvalState = { missing: Set<string> };

type TernaryResult = 'true' | 'false' | 'missing';

/** Evaluate an arithmetic operand to a finite number, or null when it cannot be computed. */
function evalArith(n: ArithNode, lookup: (sym: string) => Value | undefined, st: EvalState): number | null {
  switch (n.kind) {
    case 'anum': return n.value;
    case 'astr': { const x = Number(n.value); return Number.isFinite(x) ? x : null; }
    case 'abool': return null;
    case 'anull': return null;
    case 'aref': {
      const v = lookup(n.symbol);
      if (v === undefined || v === null || v === '') { st.missing.add(n.symbol); return null; }
      return toNumber(v);
    }
    case 'aneg': { const x = evalArith(n.inner, lookup, st); return x === null ? null : -x; }
    case 'abin': {
      const a = evalArith(n.left, lookup, st);
      const b = evalArith(n.right, lookup, st);
      if (a === null || b === null) return null;
      let res: number;
      switch (n.op) {
        case '+': res = a + b; break;
        case '-': res = a - b; break;
        case '*': res = a * b; break;
        case '/': res = b === 0 ? NaN : a / b; break;
      }
      return Number.isFinite(res) ? res : null;
    }
  }
}

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
    case 'acompare': {
      const l = evalArith(n.left, lookup, st);
      const r = evalArith(n.right, lookup, st);
      if (l === null || r === null) return 'missing';
      return compare(l, n.op, r) ? 'true' : 'false';
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

/**
 * Resolve a JSON carrier field's value FOR THE CONDITION DSL. The DSL only does
 * existence checks on carriers (`symbol IS NOT NULL` / `IS NOT EMPTY`), never
 * arithmetic — so map a carrier to a presence marker: a non-empty string when
 * it has content, else `null`. `{rows: []}` / `{}` / `[]` / null ⇒ null
 * (absent), so an empty inventory correctly fails `IS NOT NULL`/`IS NOT EMPTY`.
 * Without this, json fields are skipped from the lookup → such gates always fail
 * even when the carrier is populated.
 */
export function jsonConditionValue(json: unknown): string | null {
  if (json == null) return null;
  if (Array.isArray(json)) return json.length > 0 ? 'present' : null;
  if (typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if (Array.isArray((o as { rows?: unknown }).rows)) {
      return (o.rows as unknown[]).length > 0 ? 'present' : null;
    }
    return Object.keys(o).length > 0 ? 'present' : null;
  }
  return 'present'; // primitive non-null (unusual for a carrier) ⇒ present
}
