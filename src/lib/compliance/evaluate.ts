/**
 * Compliance condition evaluator — the compliance-facing ADAPTER over the
 * unified expression engine (`src/lib/expr`).
 *
 * Since Plan 2a the tokenizer, parser and evaluator live in `src/lib/expr`;
 * this module keeps the historical names (`evaluateCondition`,
 * `extractConditionSymbols`, `parseCondition`, `evaluateNode`,
 * `evaluateArithNode`, `jsonConditionValue`) and the same AST so the gate
 * explainer walks the identical tree. The condition grammar the engine
 * accepts for `compliance_requirements.condition`: comparisons with a
 * literal, bare-ident or arithmetic RHS (`k_f >= 1e-6`, `total == a + b`,
 * `status == ersatz`), existence (`x IS [NOT] NULL/EMPTY`), membership
 * (`x IN {a, b}`), truthy flags, `AND`/`OR`/`NOT`/parentheses, `IF cond THEN
 * cond` guards, and calls from the shared registry (`lookup(...)`,
 * `count_rows(...)`, `if(...)`). Anything that does not parse (prose such as
 * "Engineer attestation") is `manual`; a referenced symbol without a value is
 * `pending`; a symbol listed in `opts.hiddenSymbols` is `not_applicable`.
 * Semantics pinned in `src/lib/expr/__tests__/legacy-semantics.test.ts`: a
 * bare-ident equality RHS is an enum literal unless it names a valued symbol
 * (simple and call-LHS forms only — an arithmetic LHS keeps a symbol-ref RHS);
 * arithmetic with a missing operand or a non-finite result is `pending`,
 * never a false `fail`.
 */

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
