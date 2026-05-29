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

export const rewriteRules: Record<string, Rewrite> = {
  // DWA-A 138-1 · A138-10 · Gl. (2) · §5.3.3.5
  '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3': {
    from: 'A_C = SUM(A_E_b_a_i * C_i) + SUM(A_E_nb_a_i * C_i)',
    to: 'A_E_b_a_total * C_m + A_E_nb_a_total * C_m',
    remap: {
      A_E_b_a_i: 'A_E_b_a_total',
      A_E_nb_a_i: 'A_E_nb_a_total',
      C_i: 'C_m',
    },
    reason:
      'Wizard erfasst Summe der Teilflächen (A_E_b_a_total / A_E_nb_a_total) und mittleren Abflussbeiwert C_m statt einzelner Sub-Areale. Substitution exakt nur wenn C_m der flächengewichtete Mittelwert über ALLE Sub-Areale ist (paved + unpaved, gemäß Tab. 9-Verfahren). Engineer muss diese Annahme prüfen.',
  },
};
