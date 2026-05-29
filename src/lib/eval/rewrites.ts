/**
 * Equation rewrite rules.
 *
 * Some DB formulas use array-over-sub-areas notation (e.g.
 * `SUM(A_E_b_a_i * C_i)`) that mathjs cannot evaluate without array inputs the
 * wizard does not yet collect. Where the wizard already stores totals + means
 * that are mathematically equivalent under area-weighted aggregation, a
 * rewrite maps the source-form formula to a totals-form expression and the
 * evaluator records both forms so the engineer can see the substitution.
 *
 * Rewrites must be:
 *   - Explicit: one entry per equation id, NEVER pattern-derived.
 *   - Audited: each entry cites the standard's clause and explains the
 *     equivalence assumption (typically: the wizard's mean C is the area-
 *     weighted mean across all sub-areas).
 *   - Reviewable: the badge surfaces both `from` and `to` so the engineer
 *     can reject the substitution if the equivalence doesn't hold for the
 *     project.
 *
 * If a rewrite's equivalence assumption doesn't hold (e.g. engineer used a
 * per-category mean instead of an overall mean), the engineer must reject
 * the computed value and treat the equation as `manual_required`.
 */
import type { Rewrite } from './formula';

/**
 * Rewrite registry — empty by default.
 *
 * Iteration-1 (2026-05-29) entry for A138-10 Gl. 2 (`SUM(...) + SUM(...)`
 * collapsed to `A_E_b_a_total · C_m + A_E_nb_a_total · C_m`) is RETIRED.
 * Gl. 2 is now evaluated directly per sub-area in the engine — see the
 * `aggregator` path in `formula.ts`, gated on equation id, no rewrite
 * required. The mechanism stays in place for future cases where a
 * formula genuinely needs a string-level substitution.
 */
export const rewriteRules: Record<string, Rewrite> = {};
