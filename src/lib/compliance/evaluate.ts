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
//
// Since Plan 2a the tokenizer, parser and evaluator live in `src/lib/expr`;
// this file is the compliance-facing adapter (same names, same AST, same
// leaf semantics — the explainer walks the identical tree).

import {
  evalCondition,
  evaluateNodeLenient,
  evaluateArithLenient,
  extractSymbols,
  parseCondition as parseExprCondition,
} from '@/lib/expr';
import type { ArithNode, Node } from '@/lib/expr';
import type {
  ConditionOptions as ExprConditionOptions,
  EvalResult as ExprEvalResult,
  Value,
} from '@/lib/expr';

export type EvalResult = ExprEvalResult;
export type ConditionOptions = ExprConditionOptions;

/**
 * Additive export surface for the gate explainer (`explain.ts`). The explainer
 * walks the SAME AST and reuses the SAME leaf semantics — no logic fork.
 */
export type ConditionValue = Value;
export type ConditionNode = Node;
export type ConditionArithNode = ArithNode;

/**
 * Evaluate a compliance condition against the current symbol→value map.
 *
 * Unparseable conditions return `manual`. Conditions whose referenced
 * symbols have no value return `pending` with the missing list. A condition
 * referencing a symbol in `opts.hiddenSymbols` returns `not_applicable`.
 */
export function evaluateCondition(
  condition: string,
  valuesBySymbol: (sym: string) => Value | undefined,
  opts?: ConditionOptions,
): EvalResult {
  if (!condition || !condition.trim()) return { kind: 'manual' };
  return evalCondition(condition, { symbol: valuesBySymbol }, opts);
}

/**
 * Extract the free SYMBOL references a condition would look up at evaluation time
 * (D-1 task 2 residual gate-symbol check).
 *
 * Returns the set of identifiers the evaluator resolves against the value map.
 * It deliberately EXCLUDES keywords, numeric/string literals, and bare
 * identifiers in membership (`IN {a,b}`) or equality-RHS position
 * (`x == enum_val`) — the parser turns those into string LITERALS the
 * evaluator never looks up as symbols. Returns `null` for a condition that
 * does not parse — exactly the inputs `evaluateCondition` reports as `manual`.
 */
export function extractConditionSymbols(condition: string): Set<string> | null {
  const ast = parseExprCondition(condition);
  return ast ? extractSymbols(ast) : null;
}

/** Parse a condition to its AST, or null when it is not machine-evaluable. */
export function parseCondition(condition: string): Node | null {
  return parseExprCondition(condition);
}

/** Evaluate a single node to the internal ternary — reused by the explainer. */
export function evaluateNode(
  n: Node,
  lookup: (sym: string) => Value | undefined,
): 'true' | 'false' | 'missing' {
  return evaluateNodeLenient(n, { symbol: lookup });
}

/** Evaluate an arithmetic operand to a number (null = missing/non-finite). */
export function evaluateArithNode(
  n: ArithNode,
  lookup: (sym: string) => Value | undefined,
): number | null {
  return evaluateArithLenient(n, { symbol: lookup });
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
