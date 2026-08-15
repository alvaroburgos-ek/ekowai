/**
 * Source-formatting normaliser for DB-stored formulas.
 *
 * Some DWA-A 138-1 equations stringify symbols as `r_D(n)` (i.e. an
 * identifier followed by parenthesised parameter name), which the in-tree
 * arithmetic evaluator can't parse — it treats `<ident>(...)` as an
 * (unsupported) function call.
 *
 * Rather than edit the DB formula strings (forbidden by every slice in
 * this PR series), we normalise them at engine-entry time:
 *
 *   r_D(n)   →  r_D_n
 *   r_5(n)   →  r_5_n
 *   r_D(30)  →  r_D_30
 *   T(n)     →  T_n
 *
 * The same rule applies to `input_symbols` so the hook's symbol lookups
 * match the normalised names. This is a pure string transform — it does
 * NOT modify the equations row, and the unrewritten formula is still what
 * the UI's "source formula" line shows so the engineer sees the original.
 *
 * Pattern matched: `[A-Za-z_][A-Za-z0-9_]*` then optional whitespace then
 * `(` then `[A-Za-z0-9_]+` then optional whitespace then `)`. Anything more
 * complex (nested calls, multiple args, expressions inside the parens) is
 * NOT rewritten — those formulas need a rewrite rule or aggregator.
 */

const FN_LIKE = /([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*([A-Za-z0-9_]+)\s*\)/g;

/**
 * Names the arithmetic engine supports as REAL function calls (ln, sqrt, min, …)
 * must NOT be rewritten to `name_arg` — they are calls, not stringified symbols.
 */
import { canonicalFunctionName } from './arithmetic';

function rewrite(match: string, name: string, arg: string): string {
  return canonicalFunctionName(name) !== null ? match : `${name}_${arg}`;
}

export function normalizeFormula(s: string): string {
  return s.replace(FN_LIKE, rewrite);
}

export function normalizeSymbol(s: string): string {
  return s.replace(FN_LIKE, rewrite);
}

export function normalizeSymbols(arr: readonly string[]): string[] {
  return arr.map(normalizeSymbol);
}
