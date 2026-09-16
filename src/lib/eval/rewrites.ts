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
 *
 * Iteration-1 (2026-05-29) entry for A138-10 Gl. 2 (`SUM(...) + SUM(...)`
 * collapsed to `A_E_b_a_total · C_m + A_E_nb_a_total · C_m`) is RETIRED —
 * Gl. 2 is evaluated per sub-area by its aggregator (`aggregators.ts`).
 */
import type { Rewrite } from './formula';

/**
 * Plan 2a: the six DWA-A-138-1 A138-07 producers as row-function formula
 * strings over the `surface_inventory` register (Σ over COMPLETE
 * Flächenverzeichnis rows; `kind` is the register's derived Tab. 9 column).
 * Byte-identical to scripts/migrations/20260916100000_a138_07_register_equations.sql.
 */
export const A138_07_REGISTER_FORMULAS: Readonly<Record<string, { outputSymbol: string; formula: string }>> = {
  'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0': { outputSymbol: 'A_C',          formula: 'A_C = sum_rows(surface_inventory, area_m2 * c_i)' },
  'a1380702-0000-4000-8000-000000000002': { outputSymbol: 'C_m',          formula: 'C_m = sum_rows(surface_inventory, area_m2 * c_i) / sum_rows(surface_inventory, area_m2)' },
  'a1380702-0000-4000-8000-000000000003': { outputSymbol: 'A_E_ba',       formula: "A_E_ba = sum_rows(surface_inventory, if(kind == 'paved', area_m2, 0))" },
  'a1380702-0000-4000-8000-000000000004': { outputSymbol: 'A_E_nba',      formula: "A_E_nba = sum_rows(surface_inventory, if(kind == 'unpaved', area_m2, 0))" },
  'a1380702-0000-4000-8000-000000000005': { outputSymbol: 'A_C_sealed',   formula: "A_C_sealed = sum_rows(surface_inventory, if(kind == 'paved', area_m2 * c_i, 0))" },
  'a1380702-0000-4000-8000-000000000006': { outputSymbol: 'A_C_unsealed', formula: "A_C_unsealed = sum_rows(surface_inventory, if(kind == 'unpaved', area_m2 * c_i, 0))" },
};

/**
 * The formula text the DB rows carried BEFORE the migration — captured
 * read-only from prod (vadsmshzebefjreqcicl) on 2026-09-16T23:23:45Z, see
 * scripts/rollback-20260916100000-a138-07-register-equations.sql. Shown as
 * the bridge's `from` so the engine card names the real stored text.
 */
const A138_07_PRIOR_FORMULAS: Readonly<Record<string, string>> = {
  'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0': 'A_C_preliminary = Σ_i (A_E,i · C_i)',
  'a1380702-0000-4000-8000-000000000002': 'C_m = A_C / A_E',
  'a1380702-0000-4000-8000-000000000003': 'A_E_ba = Σ A_E,i (befestigt)',
  'a1380702-0000-4000-8000-000000000004': 'A_E_nba = Σ A_E,i (unbefestigt)',
  'a1380702-0000-4000-8000-000000000005': 'A_C_sealed = Σ_i (A_E,b,a,i · C_i)',
  'a1380702-0000-4000-8000-000000000006': 'A_C_unsealed = Σ_i (A_E,nb,a,i · C_i)',
};

// Plan 2a deploy-safety bridge: until scripts/migrations/20260916100000_a138_07_register_equations.sql is applied
// the DB still stores the Σ-notation; the bridge substitutes the formula string. formula.ts skips a bridge whose
// `to` already equals the stored formula, so after the migration the engine card shows no rewrite. DELETE these
// six entries once the migration is applied in prod (owner step, ledger).
export const rewriteRules: Record<string, Rewrite> = Object.fromEntries(
  Object.entries(A138_07_REGISTER_FORMULAS).map(([id, r]) => [
    id,
    {
      from: A138_07_PRIOR_FORMULAS[id],
      to: r.formula,
      remap: { surface_inventory: 'surface_inventory' },
      reason: 'Σ über Flächenverzeichnis-Zeilen als Zeilenfunktion sum_rows() (Plan 2a); identische Summe über vollständige Zeilen.',
    },
  ]),
);
