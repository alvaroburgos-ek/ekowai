/**
 * Numeric adapter over the unified expression engine (`src/lib/expr`).
 *
 * `evalExpression(expression, scope, extras)` evaluates a formula RHS in
 * STRICT numeric mode: it builds an expr `Scope` from the number map (with
 * `e`/`pi` as fallback constants — a field of that name always wins), the
 * prepared registers, the regulation-table lookup and the raw carriers, then
 * delegates to `evalNumber`. The grammar itself — precedence climbing over
 * `+ - * / ^`, unary minus, parenthesised groups, and calls from the shared
 * function registry (math `ln/log10/lg/sqrt/exp/abs/min/max`, rounding, logic
 * `if/lookup/contains/cell/flag`, row functions `sum_rows/count_rows/…`) —
 * lives in `src/lib/expr/{tokens,parser,functions,evaluate}.ts`; this file
 * only re-exports `SUPPORTED_FUNCTIONS` / `canonicalFunctionName` for the
 * formula normaliser. A missing symbol, an unsupported call, a wrong arity,
 * division by zero or a non-finite result THROWS (ExprError / parse Error) so
 * the engine fails loud; `formula.ts` classifies those messages into
 * `manual_required` vs `error`.
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
