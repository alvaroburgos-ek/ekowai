/**
 * DWA-A 138-1 Tab.5 / Tab.6 — materialize wrapper for the hydraulic
 * surface-loading check (A_C / A_S,m).
 *
 * Pure / DB-free. Resolves the Tab.6 tier from the Flächengruppe Kurzzeichen
 * (Tab.5), then evaluates the loading check and returns the three scalar
 * outputs persisted to project_parameters:
 *
 *   ac_as_ratio        — computed A_C / A_S,m (null when inputs missing)
 *   ac_as_ratio_limit  — applicable Tab.6 limit (null when no numeric limit)
 *   ac_as_ratio_check  — pass/fail boolean (null when no numeric limit or
 *                        inputs missing)
 *
 * Shape mirrors materialize-basin-governing.ts (pure-wrapper style).
 */

import { flaechengruppeToTier, tab6LoadingCheck } from './tab6-loading';

export type LoadingCheckInput = {
  /** Drainage-contributing area [m²]. */
  A_C: number | null;
  /** Filter / absorption area of the BBZ [m²]. */
  A_S_m: number | null;
  /** Tab.5 Kurzzeichen (Flächengruppe short-code), e.g. 'V2', 'BL', 'D'. */
  flaechengruppe: string | null;
  /** BBZ thickness [metres] — determines thin (<0.30) vs. thick (≥0.30) band. */
  bbz_thickness: number | null;
};

export type LoadingCheckOutput = {
  /** Computed A_C / A_S,m ratio (null when either area is missing/zero). */
  ac_as_ratio: number | null;
  /** Tab.6 numeric limit for the resolved tier × BBZ-band (null when no numeric limit applies). */
  ac_as_ratio_limit: number | null;
  /** true = pass (ratio ≤ limit); false = fail; null = no numeric limit or indeterminate. */
  ac_as_ratio_check: boolean | null;
};

/**
 * Materialize the Tab.6 loading check from raw project-parameter inputs.
 *
 * Decision path:
 *   1. Resolve Tab.6 tier via flaechengruppeToTier(flaechengruppe).
 *   2. Run tab6LoadingCheck with the resolved tier + BBZ thickness.
 *   3. Map the discriminated-union result to the three flat scalar outputs.
 *
 * Output interpretation:
 *   - `evaluated`    → ratio, limit, and pass are all present.
 *   - `na`           → ratio computed (when inputs available), limit+check null.
 *   - `indeterminate`→ ratio carried (when computable), limit+check null.
 */
export function materializeLoadingCheck(input: LoadingCheckInput): LoadingCheckOutput {
  const tier = flaechengruppeToTier(input.flaechengruppe);
  const r = tab6LoadingCheck({
    A_C: input.A_C,
    A_S_m: input.A_S_m,
    tier,
    bbzThicknessM: input.bbz_thickness,
  });

  const ac_as_ratio = r.ratio ?? null;
  const ac_as_ratio_limit = r.kind === 'evaluated' ? r.limit : null;
  const ac_as_ratio_check = r.kind === 'evaluated' ? r.pass : null;

  return { ac_as_ratio, ac_as_ratio_limit, ac_as_ratio_check };
}
