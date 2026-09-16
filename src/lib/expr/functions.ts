/**
 * Function registry for the unified expression language.
 *
 * Math functions reproduce `src/lib/eval/arithmetic.ts` (`ONE_ARG_FUNCTIONS`,
 * `TWO_ARG_FUNCTIONS`, `FN_ALIASES`): case-insensitive, `lg` → `log10`, bare
 * `log` stays UNSUPPORTED (ambiguous ln vs lg — fail loud, rewrite per
 * equation). `round` / `ceil` / `floor` are Plan 3 additions (Task 4b, gap
 * G-11) with the same case-insensitive matching. Row and logic functions are
 * new and matched by exact lowercase name; the parser already lowers the
 * `IF(` keyword form to `'if'`.
 */

export const MATH_FUNCTIONS_1: Record<string, (x: number) => number> = {
  ln: Math.log,
  log10: Math.log10,
  sqrt: Math.sqrt,
  exp: Math.exp,
  abs: Math.abs,
  round: Math.round,
  ceil: Math.ceil,
  floor: Math.floor,
};

export const MATH_FUNCTIONS_2: Record<string, (a: number, b: number) => number> = {
  min: Math.min,
  max: Math.max,
};

const MATH_ALIASES: Record<string, string> = { lg: 'log10' }; // bare `log` stays UNSUPPORTED (ambiguous ln vs lg)

export const ROW_FUNCTIONS = [
  'sum_rows', 'count_rows', 'max_rows', 'min_rows', 'mean_rows', 'stdev_rows', 'median_rows', 'percentile_rows', 'last_rows',
] as const;
export const LOGIC_FUNCTIONS = ['if', 'lookup', 'contains', 'cell', 'flag'] as const;

export const MATH_FUNCTION_NAMES: ReadonlySet<string> = new Set([
  ...Object.keys(MATH_FUNCTIONS_1),
  ...Object.keys(MATH_FUNCTIONS_2),
]);

/** Every canonical function name the evaluator understands. */
export const EXPR_FUNCTION_NAMES: ReadonlySet<string> = new Set([
  ...MATH_FUNCTION_NAMES,
  ...ROW_FUNCTIONS,
  ...LOGIC_FUNCTIONS,
]);

/**
 * Resolve a call name as written to its canonical name, or `null` when the
 * evaluator does not support it. Math: case-insensitive + aliases. `if`:
 * case-insensitive (keyword form). Other row/logic:
 * exact lowercase spelling (symbols stay case-sensitive; only call syntax is
 * relaxed, and only for the math set plus `if`).
 */
export function canonicalFunctionName(name: string): string | null {
  const lower = name.toLowerCase();
  const math = MATH_ALIASES[lower] ?? lower;
  if (MATH_FUNCTION_NAMES.has(math)) return math;
  if (lower === 'if') return 'if'; // the parser lowers `IF(` → 'if'; the eligibility gate asks by the written name
  if ((ROW_FUNCTIONS as readonly string[]).includes(name) || (LOGIC_FUNCTIONS as readonly string[]).includes(name)) return name;
  return null;
}
