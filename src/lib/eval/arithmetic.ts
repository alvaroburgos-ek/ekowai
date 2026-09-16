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
 *
 * Since Plan 2a the grammar lives in `src/lib/expr`; this file is the numeric adapter.
 */

import {
  evalNumber,
  EXPR_FUNCTION_NAMES,
  canonicalFunctionName as canon,
  type PreparedRegister,
  type Scope,
} from '@/lib/expr';

/** Every supported function name (consumed by the formula normaliser too). */
export const SUPPORTED_FUNCTIONS: ReadonlySet<string> = EXPR_FUNCTION_NAMES;

/**
 * Resolve an identifier-before-'(' to its canonical supported function name,
 * case-insensitively for the math set (standards print EXP/SQRT; symbols stay
 * case-SENSITIVE — this applies only to call syntax). Returns null when not a
 * supported call.
 */
export function canonicalFunctionName(name: string): string | null {
  return canon(name);
}

/** Bare mathematical constants, used only as a FALLBACK when the name is not a
 * provided field value (a field named `e`/`pi` always wins). Lets formulas like
 * `e^(-k*t)` resolve without a rewrite. */
const CONSTANTS: Record<string, number> = { e: Math.E, pi: Math.PI };

export type EvalExtras = {
  registers?: Record<string, PreparedRegister>;
  table?: Scope['table'];
  carriers?: Record<string, unknown>;
};

export function evalExpression(
  expression: string,
  scope: Record<string, number>,
  extra?: EvalExtras,
): number {
  const values = new Map(Object.entries(scope));
  const registers = extra?.registers;
  const carriers = extra?.carriers;
  const exprScope: Scope = {
    symbol: (sym) => (values.has(sym) ? values.get(sym) : sym in CONSTANTS ? CONSTANTS[sym] : undefined),
    register: registers ? (sym) => registers[sym] : undefined,
    table: extra?.table,
    carrier: carriers ? (sym) => carriers[sym] : undefined,
  };
  return evalNumber(expression, exprScope);
}
