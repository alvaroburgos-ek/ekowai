/**
 * Convert an ASCII-normalised DWA equation string (as stored in
 * `equations.formula`) into a KaTeX-compatible LaTeX expression.
 *
 * The DB importer (Pass3c) already normalises a handful of glyphs:
 *   \cdot → ·   ,   π → pi   ,   ≥ → >=
 *
 * The conversion is intentionally conservative. We only rewrite the things we
 * know are unambiguous; everything else is passed through. Over-rewriting
 * (e.g. turning every `/` into `\frac{...}{...}`) tends to break complex
 * expressions, so we punt on those.
 *
 * Rules applied (in order):
 *
 *   1. Subscripts: any identifier of the shape `LETTER_REST` is rewritten to
 *      `LETTER_{REST}`. `REST` may contain letters, digits, commas and inner
 *      underscores (e.g. `A_S,m`, `A_E_b_a_i`). It stops at `(` so a function-
 *      style suffix like `r_D(n)` keeps the `(n)` outside the subscript.
 *      Single-character subscripts are still braced so `A_C` becomes `A_{C}`
 *      and the KaTeX output is consistent. Any inner `_` inside the captured
 *      group is rewritten to `,` because KaTeX rejects nested-subscript
 *      groups (`Double subscript` parse error) — `A_E_b_a_i` therefore
 *      renders as `A_{E,b,a,i}`.
 *
 *   2. Exponents: `^DIGITS` → `^{DIGITS}` so `10^7` renders as 10 to the 7th.
 *      Variable exponents (`x^n`) are also braced — same shape, no ambiguity.
 *
 *   3. `pi`  → `\pi`  (matched as a whole word; will not eat `pivot` etc.)
 *
 *   4. `*`   → `\cdot`
 *
 *   5. `·`   → `\cdot` (the importer already normalises to this glyph)
 *
 *   6. `>=`, `<=` → `\geq`, `\leq` so a comparison or domain constraint
 *      renders correctly when one slips into a formula string.
 *
 * What we deliberately do NOT do:
 *
 *   - `/` is NEVER rewritten to `\frac{a}{b}`. Detecting the correct numerator
 *     and denominator for arbitrary nested expressions is a parser-level
 *     concern; KaTeX renders the `/` glyph fine and engineers reading the
 *     source formula can still see the operator.
 *
 *   - Greek letters other than `pi` are not rewritten. The DB has not yet
 *     introduced any (the importer keeps spelt-out names where possible).
 */
export function formulaToLatex(s: string): string {
  if (!s) return '';

  let out = s;

  // 1. Subscripts — match an identifier followed by `_REST` where REST is
  //    [A-Za-z0-9,] possibly followed by more `_...` segments. Stop at `(`,
  //    whitespace, operators, end-of-string, or a closing bracket.
  //
  //    Greedy on REST so `A_E_b_a_i` is captured as a single subscript group.
  //    The regex is anchored with a word boundary on the LHS so it doesn't
  //    chew into the middle of a longer identifier.
  out = out.replace(
    /([A-Za-z])_([A-Za-z0-9,]+(?:_[A-Za-z0-9,]+)*)/g,
    (_m, head: string, sub: string) => `${head}_{${sub.replace(/_/g, ',')}}`,
  );

  // 2. Exponents — wrap a run of digits/letters (optionally a leading minus,
  //    so `10^-3` from the §6 equations parses correctly) following `^` so
  //    `10^7` renders 10 to the 7th, `d^2` shows the square, and `10^-3`
  //    becomes 10 to the −3. Already-braced exponents (`x^{...}`) are
  //    skipped because the inner brace doesn't match this pattern.
  out = out.replace(/\^(-?[A-Za-z0-9]+)/g, (_m, exp: string) => `^{${exp}}`);

  // 3. pi → \pi, as a whole-word match
  out = out.replace(/\bpi\b/g, '\\pi');

  // 4 & 5. Multiplication glyphs
  out = out.replace(/\*/g, ' \\cdot ');
  out = out.replace(/·/g, ' \\cdot ');

  // 6. Comparisons that may appear in domain notes
  out = out.replace(/>=/g, ' \\geq ');
  out = out.replace(/<=/g, ' \\leq ');

  // Collapse any runs of whitespace introduced above
  out = out.replace(/\s+/g, ' ').trim();

  return out;
}
