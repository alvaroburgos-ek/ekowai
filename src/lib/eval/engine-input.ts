/**
 * Plan 3 Task 1b (a138-I-1) — ONE rule for turning a stored field value into
 * an engine input, shared by every `evaluateFormula` caller (client hook,
 * server materialiser, report evaluator, snapshot payload, PDF assembler):
 *
 *   - `number`        → the finite number, else MISSING (null)
 *   - `enum` / `text` → the non-empty string VERBATIM (never coerced to a
 *                       number), `''`/null → MISSING (null)
 *   - anything else   → MISSING (null) — json carriers travel through
 *                       `registers` / `carriers`, dates/booleans are not
 *                       formula inputs (unchanged from before Task 1b)
 *
 * A string input is a legitimate operand of `lookup()`, `if()` and the
 * equality comparisons; when it reaches an arithmetic operator the unified
 * evaluator throws `Operand ist keine Zahl: …` and `evaluateFormula`
 * classifies that as `manual_required` — never `computed: NaN`.
 */

export type EngineInputSource = { type: string; value: unknown } | null | undefined;

export function engineInputValue(v: EngineInputSource): number | string | null {
  if (!v) return null;
  switch (v.type) {
    case 'number':
      return typeof v.value === 'number' && Number.isFinite(v.value) ? v.value : null;
    case 'text':
    case 'enum':
      return typeof v.value === 'string' && v.value !== '' ? v.value : null;
    default:
      return null;
  }
}

/**
 * Engineer-facing rendering of a string input in the "Eingaben" /
 * "Eingesetzte Formel" lines: quoted, verbatim (`schutzkategorie = 'gering'`).
 * Uses the language's own literal syntax so the substituted formula stays a
 * valid expression; a value containing `'` is wrapped in `"` instead.
 */
export function quoteStringInput(s: string): string {
  return s.includes("'") ? `"${s}"` : `'${s}'`;
}
