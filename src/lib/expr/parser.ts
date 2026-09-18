/**
 * Recursive-descent parser for the unified expression language.
 *
 * Ported from the two hand-written parsers it generalises:
 *   - `src/lib/compliance/evaluate.ts`'s `Parser` class (condition grammar:
 *     comparisons, membership, existence, logical connectives, IF…THEN
 *     guards) — the condition-parsing methods below (`parse`, `parseOr`,
 *     `parseAnd`, `parseAtom`, `parseComparison`, `parseLiteral`) are ported
 *     near-verbatim.
 *   - `src/lib/eval/arithmetic.ts`'s `Parser` class (arithmetic grammar: `^`,
 *     function calls, precedence climbing) — the numeric-parsing methods
 *     (`parseUnary`, `parsePower`, `parsePrimary`, `parseArg`,
 *     `parseNumericAll`) fold that grammar in, replacing the old `parseFactor`.
 *
 * Two entry points:
 *   - `parseCondition` returns `Node | null` — `null` means "not
 *     machine-evaluable" (today's semantics; never throws).
 *   - `parseNumeric` returns a `ParseNumericResult` carrying the
 *     arithmetic.ts-flavoured German error messages on failure.
 *   - `parseExpression` classifies a top-level result as condition or
 *     arithmetic (used by formula.ts classification).
 *
 * `IF … THEN …` (a guard) vs `if(...)` (a function call) is disambiguated by
 * trying the guard form first in `parseAtom` and backtracking — all the way
 * to before the `IF` token — when no `THEN` follows; the fallback then
 * reaches `parsePrimary`, which parses `if(` as an ordinary call because the
 * arithmetic grammar treats the `IF` keyword as callable syntax alongside
 * plain identifiers.
 */

import { tokenize, type Token, type KeywordToken } from './tokens';
import type { CompareOp, Literal, ArithNode, Node, Expr } from './ast';

export type ParseNumericResult =
  | { ok: true; node: ArithNode }
  | { ok: false; message: string };

/** Thrown only inside the numeric parsing path (`parseNumericAll`); the
 * condition path never throws — it keeps returning `null` on failure. */
class ParseError extends Error {}

/** Maximum paren/call nesting before the parser gives up (fix-wave item 4). */
const MAX_DEPTH = 64;
const TOO_DEEP = 'Ausdruck zu tief verschachtelt.';

class Parser {
  private pos = 0;
  /** Current paren/call nesting depth — capped at MAX_DEPTH. */
  private depth = 0;
  /**
   * Memo of `parseArg` results by start position (fix-wave item 4). The
   * IF-guard and paren-grouping backtracking in `parseAtom` re-enter the
   * call-argument grammar several times per nesting level, which made a
   * malformed nested `if(` exponential (depth 14 ≈ 0.5 s, 16 ≈ 4.6 s). An
   * argument parse depends only on its start position, so it is computed once.
   */
  private argMemo = new Map<number, { node: Expr | null; end: number }>();
  constructor(private toks: Token[]) {}

  private enter(): void {
    if (++this.depth > MAX_DEPTH) throw new ParseError(TOO_DEEP);
  }
  private leave(): void { this.depth--; }

  private peek(): Token | undefined { return this.toks[this.pos]; }
  private next(): Token | undefined { return this.toks[this.pos++]; }
  private eatKw(kw: KeywordToken): boolean {
    const t = this.peek();
    if (t?.type === 'kw' && t.value === kw) { this.pos++; return true; }
    return false;
  }

  // ---- condition grammar (entry: parse()) --------------------------------

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
    // IF ... THEN ... (guard) vs if(...) (function call). Try the guard form;
    // if the guard, or the mandatory THEN, or the body fails to parse,
    // restore pos to BEFORE the IF token and fall through to
    // parseComparison(), which reaches parsePrimary() and parses `if(...)`
    // as an ordinary call — the two forms are deterministically distinguished
    // by whether a THEN follows the first sub-expression.
    const lead = this.peek();
    if (lead?.type === 'kw' && lead.value === 'IF') {
      const save = this.pos;
      this.next();
      const guard = this.parseOr();
      if (guard !== null && this.eatKw('THEN')) {
        const body = this.parseOr();
        if (body !== null) return { kind: 'guard', guard, body };
      }
      this.pos = save;
      return this.parseComparison();
    }
    // ( expr ) — could be a logical grouping OR a leading parenthesised arithmetic
    // operand. Try logical grouping first; if the paren turns out to be followed by a
    // comparison/arithmetic operator (i.e. it was an arithmetic operand), backtrack
    // and let parseComparison handle the whole arithmetic expression.
    const t = this.peek();
    if (t?.type === 'lparen') {
      const save = this.pos;
      this.next();
      this.enter();
      const expr = this.parseOr();
      this.leave();
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
      // equality (`status == some_value`) stays on the legacy literal path; a QUOTED
      // RHS (`status == 'some_value'`) is marked `quoted` and is a literal, always.
      const relational = next.value === '>=' || next.value === '<=' || next.value === '>' || next.value === '<';
      if (left.kind === 'aref' && isSimpleOperand(right) && !(relational && right.kind === 'aref')) {
        return { kind: 'compare', symbol: left.symbol, op: next.value as CompareOp, rhs: operandToLiteral(right) };
      }
      return { kind: 'acompare', left, op: next.value as CompareOp, right };
    }

    // No operator follows.
    if (left.kind === 'aref') return { kind: 'truthy', symbol: left.symbol };
    if (left.kind === 'abool') return { kind: 'lit', value: left.value };
    return null; // a bare arithmetic expression is not a meaningful condition
  }

  private parseLiteral(): Literal | null {
    const t = this.next();
    if (!t) return null;
    if (t.type === 'number') return { kind: 'lit', value: t.value };
    if (t.type === 'string') return { kind: 'lit', value: t.value, quoted: true }; // a quoted literal never resolves as a symbol (Task 13b)
    if (t.type === 'kw' && t.value === 'TRUE') return { kind: 'lit', value: true };
    if (t.type === 'kw' && t.value === 'FALSE') return { kind: 'lit', value: false };
    if (t.type === 'kw' && t.value === 'NULL') return { kind: 'lit', value: null };
    // Allow bare identifier as a string literal on the RHS — engineers write
    // things like `investment_type IN {ersatz, erneuerung}`.
    if (t.type === 'ident') return { kind: 'lit', value: t.value };
    return null;
  }

  // ---- arithmetic grammar -------------------------------------------------

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

  // term := unary (('*'|'/') unary)*
  private parseTerm(): ArithNode | null {
    let left = this.parseUnary();
    if (left === null) return null;
    for (;;) {
      const t = this.peek();
      if (t?.type === 'aop' && (t.value === '*' || t.value === '/')) {
        this.next();
        const right = this.parseUnary();
        if (right === null) return null;
        left = { kind: 'abin', op: t.value, left, right };
      } else break;
    }
    return left;
  }

  // unary := '+' unary | '-' unary | power
  // A leading '+' is identity (no AST node), mirroring arithmetic.ts's
  // `unary ::= ('+'|'-')? power` so that `+5`, `10^+3`, `x + +y` keep parsing.
  private parseUnary(): ArithNode | null {
    const t = this.peek();
    if (t?.type === 'aop' && t.value === '+') {
      this.next();
      return this.parseUnary();
    }
    if (t?.type === 'aop' && t.value === '-') {
      this.next();
      const inner = this.parseUnary();
      return inner === null ? null : { kind: 'aneg', inner };
    }
    return this.parsePower();
  }

  // power := primary ('^' unary)?   right-associative, exponent may carry a unary minus
  private parsePower(): ArithNode | null {
    const left = this.parsePrimary();
    if (left === null) return null;
    const t = this.peek();
    if (t?.type === 'aop' && t.value === '^') {
      this.next();
      const right = this.parseUnary();
      return right === null ? null : { kind: 'abin', op: '^', left, right };
    }
    return left;
  }

  // primary := number | string | TRUE | FALSE | NULL | ident | ident '(' args ')' | IF '(' args ')' | '(' arithExpr ')'
  private parsePrimary(): ArithNode | null {
    const t = this.peek();
    if (!t) return null;
    if (t.type === 'lparen') {
      this.next();
      this.enter();
      const e = this.parseArithExpr();
      this.leave();
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
    const isCallable = t.type === 'ident' || (t.type === 'kw' && t.value === 'IF');
    if (isCallable && this.toks[this.pos + 1]?.type === 'lparen') {
      const name = t.type === 'ident' ? t.value : 'if';
      this.next();
      this.next();
      const args: Expr[] = [];
      this.enter();
      try {
        if (this.peek()?.type !== 'rparen') {
          for (;;) {
            const arg = this.parseArg();
            if (arg === null) return null;
            args.push(arg);
            if (this.peek()?.type === 'comma') { this.next(); continue; }
            break;
          }
        }
      } finally {
        this.leave();
      }
      if (this.peek()?.type !== 'rparen') return null;
      this.next();
      return { kind: 'call', name, args };
    }
    if (t.type === 'ident') { this.next(); return { kind: 'aref', symbol: t.value }; }
    return null;
  }

  // arg := arithExpr (when followed by ',' or ')') | condition
  private parseArg(): Expr | null {
    const save = this.pos;
    const hit = this.argMemo.get(save);
    if (hit) { this.pos = hit.end; return hit.node; }
    const node = this.parseArgUncached();
    this.argMemo.set(save, { node, end: this.pos });
    return node;
  }
  private parseArgUncached(): Expr | null {
    const save = this.pos;
    const arith = this.parseArithExpr();
    const after = this.peek();
    if (arith !== null && (after?.type === 'comma' || after?.type === 'rparen')) return arith;
    this.pos = save;
    return this.parseOr();
  }

  // ---- numeric-only entry (throws ParseError; used by parseNumeric) ------

  parseNumericAll(): ArithNode {
    const node = this.parseArithExpr();
    if (node === null) {
      const lparens = this.toks.filter((x) => x.type === 'lparen').length;
      const rparens = this.toks.filter((x) => x.type === 'rparen').length;
      if (lparens > rparens) throw new ParseError('Fehlende schließende Klammer.');
      if (!this.peek()) throw new ParseError('Ausdruck endet vorzeitig.');
      throw new ParseError('Ausdruck erwartet.');
    }
    if (this.pos !== this.toks.length) {
      throw new ParseError('Unerwartetes Token am Ende des Ausdrucks.');
    }
    return node;
  }
}

/** A simple (non-arithmetic, non-call) terminal operand suitable for the legacy compare path. */
function isSimpleOperand(n: ArithNode): boolean {
  return n.kind === 'anum' || n.kind === 'astr' || n.kind === 'abool'
    || n.kind === 'anull' || n.kind === 'aref';
}
function operandToLiteral(n: ArithNode): Literal {
  switch (n.kind) {
    case 'anum': return { kind: 'lit', value: n.value };
    case 'astr': return { kind: 'lit', value: n.value, quoted: true }; // quoted string → literal, always (Task 13b)
    case 'abool': return { kind: 'lit', value: n.value };
    case 'anull': return { kind: 'lit', value: null };
    case 'aref': return { kind: 'lit', value: n.symbol }; // bare ident → string literal (legacy)
    default: return { kind: 'lit', value: null };
  }
}

// ---- public entry points ---------------------------------------------------

export function parseCondition(src: string): Node | null {
  if (!src || !src.trim()) return null;
  const t = tokenize(src);
  if (!t.ok || t.tokens.length === 0) return null;
  try {
    return new Parser(t.tokens).parse();
  } catch (e) {
    // Depth cap (ParseError) or a runaway recursion (RangeError) — both are
    // "not machine-evaluable", never an escape to the caller.
    if (e instanceof ParseError || e instanceof RangeError) return null;
    throw e;
  }
}

export function parseNumeric(src: string): ParseNumericResult {
  const t = tokenize(src);
  if (!t.ok) return t;
  if (t.tokens.length === 0) return { ok: false, message: 'Ausdruck endet vorzeitig.' };
  try {
    return { ok: true, node: new Parser(t.tokens).parseNumericAll() };
  } catch (e) {
    if (e instanceof ParseError) return { ok: false, message: e.message };
    if (e instanceof RangeError) return { ok: false, message: TOO_DEEP };
    throw e; // anything else is a programming error, not a parse failure
  }
}

export function parseExpression(src: string): Expr | null {
  const cond = parseCondition(src);
  if (cond !== null && cond.kind !== 'truthy') return cond; // a bare ident is arithmetic in this entry point
  const num = parseNumeric(src);
  return num.ok ? num.node : cond;
}
