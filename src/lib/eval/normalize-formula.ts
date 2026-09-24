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
import { EXPR_FUNCTION_NAMES, KEYWORD_NAMES, canonicalFunctionName } from '@/lib/expr';

// Rewrite `ident(singletoken)` → `ident_singletoken` (the r_D(n) accessor class),
// but NOT when `ident` is a real expr function. Plan 2a: the exclusion set is the
// engine's own function set (`EXPR_FUNCTION_NAMES` — math ln/log10/sqrt/exp/abs/
// min/max, row sum_rows/count_rows/…, logic if/lookup/contains/cell/flag) so
// `count_rows(reg)` reaches the evaluator as a CALL, not as the phantom symbol
// `count_rows_reg`. `log`/`lg` are added by hand: `lg` is the log10 alias, bare
// `log` is deliberately unsupported (ambiguous ln vs lg) but must still stay a
// visible unsupported call rather than degrade to an unknown `log_x` symbol.
// The `i` flag mirrors canonicalFunctionName's case-insensitive math names
// (`SQRT(x)` is excluded like `sqrt(x)`). Without the exclusion, `ln(eta_ges)`
// → `ln_eta_ges`, an unknown symbol, and the equation silently degrades to
// manual_required — DWA-A-102-2 Bild-4 regression class. The `(?<![A-Za-z0-9_])`
// lookbehind anchors the match to the START of an identifier so the excluded
// `ln(` cannot be re-matched via its `n(` substring.
// Plan 3 final wave C (item 1): the language's KEYWORDS join the exclusion set.
// `a > 1 AND (b)` is a connective in front of a single-token parenthesised group,
// not a stringified symbol — without this it normalised to the phantom `a > 1 AND_b`,
// the silent sibling of the CALL-regex refusal fixed in engine-eligibility.ts.
const EXCLUDED = [...EXPR_FUNCTION_NAMES, 'log', 'lg', ...KEYWORD_NAMES].join('|');
const FN_LIKE = new RegExp(
  `(?<![A-Za-z0-9_])(?!(?:${EXCLUDED})\\s*\\()([A-Za-z_][A-Za-z0-9_]*)\\s*\\(\\s*([A-Za-z0-9_]+)\\s*\\)`,
  'gi',
);

/**
 * Belt-and-braces guard: names the engine supports as REAL function calls must
 * NOT be rewritten to `name_arg` — they are calls, not stringified symbols.
 */
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
