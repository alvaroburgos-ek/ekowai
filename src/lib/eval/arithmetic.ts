/**
 * Tiny arithmetic expression evaluator.
 *
 * Built rather than reaching for mathjs/expr-eval because:
 *   - The DWA-A 138-1 / DIN-276 / DWA-A 102-2 formulas are all numeric
 *     arithmetic — no symbolic, no matrix, no complex, no units.
 *   - Smaller than any third-party dep and trivially auditable.
 *   - Works in Turbopack's client bundle without external resolution friction.
 *
 * Grammar (precedence-climbing):
 *
 *   expr     ::= term  (('+'|'-') term)*
 *   term     ::= unary (('*'|'/') unary)*
 *   unary    ::= ('+'|'-')? power
 *   power    ::= primary ('^' unary)?      // right-associative
 *   primary  ::= NUMBER | IDENT | '(' expr ')'
 *
 * NUMBER supports scientific notation: 10, 0.5, 1e-6, 1.23e+4.
 * IDENT  is a letter-or-underscore followed by alphanumerics/underscores.
 *        Identifiers MUST be present in the substitution map — referencing
 *        a missing identifier throws, so the engine fails loud.
 * Supported function calls: 1-arg `ln`, `log10`, `sqrt`, `exp`, `abs` and
 * 2-arg `min`, `max`. Any other call — notably `SUM(...)` (needs aggregation
 * semantics) — throws, which is the correct behaviour: such formulas need a
 * rewrite rule before they can be evaluated.
 */

/** 1-arg numeric functions the engine natively supports. */
const ONE_ARG_FUNCTIONS: Record<string, (x: number) => number> = {
  ln: Math.log,
  log10: Math.log10,
  sqrt: Math.sqrt,
  exp: Math.exp,
  abs: Math.abs,
};

/** 2-arg numeric functions the engine natively supports. */
const TWO_ARG_FUNCTIONS: Record<string, (a: number, b: number) => number> = {
  min: Math.min,
  max: Math.max,
};

/** Every natively supported function name (consumed by the formula normaliser too). */
export const SUPPORTED_FUNCTIONS = new Set<string>([
  ...Object.keys(ONE_ARG_FUNCTIONS),
  ...Object.keys(TWO_ARG_FUNCTIONS),
]);

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'ident'; name: string }
  | { kind: 'fn'; name: string }
  | { kind: 'op'; op: '+' | '-' | '*' | '/' | '^' | '(' | ')' | ',' };

function tokenize(src: string): Token[] {
  const toks: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }
    if (
      c === '(' ||
      c === ')' ||
      c === '+' ||
      c === '-' ||
      c === '*' ||
      c === '/' ||
      c === '^' ||
      c === ','
    ) {
      toks.push({ kind: 'op', op: c as '+' | '-' | '*' | '/' | '^' | '(' | ')' | ',' });
      i++;
      continue;
    }
    if ((c >= '0' && c <= '9') || c === '.') {
      const m = /^(?:\d+\.\d+|\d+|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      if (!m) throw new Error(`Ungültige Zahl an Position ${i}: "${src.slice(i, i + 6)}"`);
      toks.push({ kind: 'num', value: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '_') {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
      if (!m) throw new Error(`Ungültiger Bezeichner an Position ${i}`);
      // Check for identifier-followed-by-'(' (function call).
      let j = i + m[0].length;
      while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++;
      if (src[j] === '(') {
        // Only the natively supported numeric functions (ONE_ARG_FUNCTIONS /
        // TWO_ARG_FUNCTIONS) are accepted. All other calls throw so unsupported
        // formulas fail loud.
        if (SUPPORTED_FUNCTIONS.has(m[0])) {
          toks.push({ kind: 'fn', name: m[0] });
          i += m[0].length;
          continue;
        }
        throw new Error(
          `Funktionsaufruf "${m[0]}(...)" wird nicht unterstützt — Rewrite-Regel erforderlich.`,
        );
      }
      toks.push({ kind: 'ident', name: m[0] });
      i += m[0].length;
      continue;
    }
    throw new Error(`Unerwartetes Zeichen "${c}" an Position ${i}.`);
  }
  return toks;
}

class Parser {
  private pos = 0;
  constructor(private toks: Token[]) {}

  parse(): number {
    const v = this.parseExpr();
    if (this.pos !== this.toks.length) {
      throw new Error('Unerwartetes Token am Ende des Ausdrucks.');
    }
    return v;
  }

  private peek(): Token | undefined {
    return this.toks[this.pos];
  }

  // expr ::= term (('+'|'-') term)*
  private parseExpr(): number {
    let left = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t?.kind === 'op' && (t.op === '+' || t.op === '-')) {
        this.pos++;
        const right = this.parseTerm();
        left = t.op === '+' ? left + right : left - right;
      } else break;
    }
    return left;
  }

  // term ::= unary (('*'|'/') unary)*
  private parseTerm(): number {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (t?.kind === 'op' && (t.op === '*' || t.op === '/')) {
        this.pos++;
        const right = this.parseUnary();
        if (t.op === '*') left = left * right;
        else {
          if (right === 0) throw new Error('Division durch Null.');
          left = left / right;
        }
      } else break;
    }
    return left;
  }

  // unary ::= ('+'|'-')? power
  private parseUnary(): number {
    const t = this.peek();
    if (t?.kind === 'op' && (t.op === '+' || t.op === '-')) {
      this.pos++;
      const v = this.parsePower();
      return t.op === '-' ? -v : v;
    }
    return this.parsePower();
  }

  // power ::= primary ('^' unary)?   right-associative
  private parsePower(): number {
    const left = this.parsePrimary();
    const t = this.peek();
    if (t?.kind === 'op' && t.op === '^') {
      this.pos++;
      const right = this.parseUnary();
      return Math.pow(left, right);
    }
    return left;
  }

  // primary ::= NUMBER | IDENT | '(' expr ')' | min '(' expr ',' expr ')' | max '(' expr ',' expr ')'
  private parsePrimary(): number {
    const t = this.toks[this.pos++];
    if (!t) throw new Error('Ausdruck endet vorzeitig.');
    if (t.kind === 'num') return t.value;
    if (t.kind === 'ident') {
      const v = this.values?.get(t.name);
      if (v === undefined) {
        throw new Error(`Unbekanntes Symbol "${t.name}" im Ausdruck.`);
      }
      return v;
    }
    if (t.kind === 'fn') {
      // Consume '('
      const open = this.toks[this.pos++];
      if (open?.kind !== 'op' || open.op !== '(') {
        throw new Error(`Erwarte '(' nach "${t.name}".`);
      }
      const a = this.parseExpr();
      const oneArg = ONE_ARG_FUNCTIONS[t.name];
      if (oneArg) {
        // Consume ')'
        const close = this.toks[this.pos++];
        if (close?.kind !== 'op' || close.op !== ')') {
          throw new Error(`Fehlende schließende Klammer im ${t.name}(...)-Aufruf.`);
        }
        return oneArg(a);
      }
      // Consume ','
      const comma = this.toks[this.pos++];
      if (comma?.kind !== 'op' || comma.op !== ',') {
        throw new Error(`Erwarte ',' im ${t.name}(...)-Aufruf.`);
      }
      const b = this.parseExpr();
      // Consume ')'
      const close = this.toks[this.pos++];
      if (close?.kind !== 'op' || close.op !== ')') {
        throw new Error(`Fehlende schließende Klammer im ${t.name}(...)-Aufruf.`);
      }
      const twoArg = TWO_ARG_FUNCTIONS[t.name];
      if (!twoArg) {
        throw new Error(`Funktionsaufruf "${t.name}(...)" wird nicht unterstützt — Rewrite-Regel erforderlich.`);
      }
      return twoArg(a, b);
    }
    if (t.kind === 'op' && t.op === '(') {
      const v = this.parseExpr();
      const close = this.toks[this.pos++];
      if (close?.kind !== 'op' || close.op !== ')') {
        throw new Error('Fehlende schließende Klammer.');
      }
      return v;
    }
    throw new Error('Ausdruck erwartet.');
  }

  // injected at evaluate() time
  values?: Map<string, number>;
}

export function evalExpression(expression: string, scope: Record<string, number>): number {
  const toks = tokenize(expression);
  const parser = new Parser(toks);
  parser.values = new Map(Object.entries(scope));
  const result = parser.parse();
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error(`Nicht-endliches Ergebnis: ${String(result)}`);
  }
  return result;
}
