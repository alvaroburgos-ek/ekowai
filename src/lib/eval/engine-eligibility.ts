/**
 * E1-A · Faithfulness gate — class (i): parse + symbol-resolution validation.
 *
 * The route-all engine trusts every non-deny-set equation. This gate is the
 * BLOCKING precondition (D1): no formula routes to the generic evaluator unless
 * it passes parse + symbol-resolution against the standard's real field set.
 * Failures are "not engine-verified" → excluded from route-all and flagged
 * visibly, preserving today's honesty for exactly the risky formulas.
 *
 * SCOPE — two-class split (see E1 scope doc §3a):
 *   class (i)  machine-detectable  → THIS gate. A formula that fails to parse,
 *              or references a symbol resolving to no active field (exact case,
 *              after fn(x)->fn_x normalization), or lists such a symbol in
 *              input_symbols. This is §10e gap-class 3.
 *   class (ii) valid-but-unfaithful → NOT here. A formula that parses, resolves
 *              and computes a finite number but disagrees with the source
 *              (dropped scale factor, flipped operator — e.g. A138-18:18 missing
 *              x10^3). Undetectable by parse/resolution → source-verification
 *              discipline + the static deny-set (equation-manual-denylist.ts).
 *
 * Pure / DB-free. The caller supplies the standard's active field-symbol set.
 */
import { canonicalFunctionName, KEYWORD_NAMES } from '@/lib/expr';
import { normalizeFormula, normalizeSymbol } from './normalize-formula';

/** Math constants the arithmetic evaluator resolves without a backing field. */
const RESERVED_CONSTANTS: ReadonlySet<string> = new Set(['pi', 'e']);

/**
 * Any identifier immediately followed by `(` that SURVIVED normalization. The
 * normaliser rewrites only `fn(singleToken)` (e.g. `r_D(n)`); what is left is a
 * CALL. Plan 2a: a call is fine when its name is in the expr function set
 * (`canonicalFunctionName(name) !== null` — math incl. upper-case and `lg`,
 * row `sum_rows`/`count_rows`/…, logic `if`/`lookup`/…); anything else —
 * SUM(...), Σ-style aggregates, bare `log`, unknown helpers — is a construct
 * the evaluator cannot faithfully compute, so the equation is not
 * engine-eligible via route-all.
 *
 * Plan 3 final wave C (item 1): a LANGUAGE KEYWORD followed by `(` is a boolean
 * connective (or a literal) in front of a PARENTHESISED GROUP, never a call —
 * `if(a > 1 AND (b < 2 OR c > 3), x, y)` is a legal Plan-2a formula, but `AND (`
 * matched this regex and `canonicalFunctionName('AND')` is null, so the equation
 * was refused as "nicht unterstützte Funktion/Aggregat … (AND)" (found by
 * ISO-59020; the corpus worked around it by leaving formula-level compound
 * conditions unparenthesised). `KEYWORD_NAMES` (the tokenizer's own table) is
 * the discriminator; `if` is both a keyword and a real function, so its call
 * form is unaffected either way.
 */
const CALL = /([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
const isConnective = (name: string): boolean => KEYWORD_NAMES.has(name.toLowerCase());

export type EligibilityResult =
  | { verified: true }
  | { verified: false; reason: string; unresolved: string[] };

/**
 * @param formula            the raw stored formula string.
 * @param inputSymbols       the equation's declared input_symbols (raw).
 * @param knownFieldSymbols  active field symbols in the equation's STANDARD.
 */
export function validateEngineEligibility(
  formula: string,
  inputSymbols: readonly string[],
  knownFieldSymbols: ReadonlySet<string>,
): EligibilityResult {
  // (1) Parse validation — no unsupported function/aggregate may remain after
  //     normalization. (`r_D(n)` becomes `r_D_n` and disappears from this test;
  //     `sum_rows(...)` / `sqrt(...)` are supported calls and pass.)
  const normalizedFormula = normalizeFormula(formula);
  const unsupported = [...normalizedFormula.matchAll(CALL)]
    .map((m) => m[1])
    .filter((name) => !isConnective(name) && canonicalFunctionName(name) === null);
  if (unsupported.length > 0) {
    return {
      verified: false,
      reason: `nicht engine-verifiziert: nicht unterstützte Funktion/Aggregat im Formeltext (${unsupported.join(', ')})`,
      unresolved: [],
    };
  }

  // (2) Symbol resolution — every declared input symbol must resolve to an
  //     active field in the standard (exact case, after normalization), unless
  //     it is a numeric literal or a known math constant.
  const unresolved = inputSymbols
    .map(normalizeSymbol)
    .filter(
      (s) =>
        !knownFieldSymbols.has(s) &&
        !RESERVED_CONSTANTS.has(s) &&
        !/^[0-9.]+$/.test(s),
    );

  if (unresolved.length > 0) {
    return {
      verified: false,
      reason: `nicht engine-verifiziert: Symbol(e) ohne aktives Feld im Standard: ${unresolved.join(', ')}`,
      unresolved,
    };
  }

  return { verified: true };
}
