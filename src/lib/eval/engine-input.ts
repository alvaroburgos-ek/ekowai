/**
 * Plan 3 Task 1b (a138-I-1) — ONE rule for turning a stored field value into
 * an engine input, shared by every `evaluateFormula` caller (client hook,
 * server materialiser, report evaluator, snapshot payload, PDF assembler):
 *
 *   - `number`        → the finite number, else MISSING (null)
 *   - `enum` / `text` → the non-empty string VERBATIM (never coerced to a
 *                       number), `''`/null → MISSING (null)
 *   - `boolean`       → the boolean VERBATIM (Plan 3 final wave A, defect 1;
 *                       `false` is a VALUE, not a missing input)
 *   - anything else   → MISSING (null) — json carriers travel through
 *                       `registers` / `carriers`, dates are not formula inputs
 *
 * A string input is a legitimate operand of `lookup()`, `if()` and the
 * equality comparisons; when it reaches an arithmetic operator the unified
 * evaluator throws `Operand ist keine Zahl: …` and `evaluateFormula`
 * classifies that as `manual_required` — never `computed: NaN`.
 *
 * Plan 3 final wave A (defect 1, found by DWA-M-820-1 `m820_1-I-1`): a boolean
 * used to map to MISSING, so `if(flag == true, …)` was `manual_required`
 * forever and every standard had to invent an enum yes/no twin beside the
 * prod boolean (FLL-GAR `fll_gar-I-1`). The expression language's `Value`
 * union has always carried `boolean`, and `compare()` / `truthy()` already
 * handle it — only this mapping refused to hand it over. A boolean is NOT a
 * number: on an arithmetic operator it is the same fail-safe
 * `Operand ist keine Zahl: true` → `manual_required` a string gets.
 */

export type EngineInputSource = { type: string; value: unknown } | null | undefined;

export function engineInputValue(v: EngineInputSource): number | string | boolean | null {
  if (!v) return null;
  switch (v.type) {
    case 'number':
      return typeof v.value === 'number' && Number.isFinite(v.value) ? v.value : null;
    case 'text':
    case 'enum':
      return typeof v.value === 'string' && v.value !== '' ? v.value : null;
    case 'boolean':
      return typeof v.value === 'boolean' ? v.value : null;
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
