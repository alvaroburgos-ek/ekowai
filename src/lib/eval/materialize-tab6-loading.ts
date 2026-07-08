/**
 * DWA-A 138-1 Tab.5 / Tab.6 — materialize wrapper for the hydraulic
 * surface-loading check (A_C / A_S,m).
 *
 * Pure / DB-free. Resolves the Tab.6 tier from the Flächengruppe Kurzzeichen
 * (Tab.5), then evaluates the loading check and returns the four scalar
 * outputs persisted to project_parameters:
 *
 *   ac_as_ratio             — computed A_C / A_S,m (null when inputs missing)
 *   ac_as_ratio_limit       — applicable Tab.6 limit (null when no numeric limit)
 *   ac_as_ratio_check       — 4-state status: 'pass'|'fail'|'not_applicable'|'indeterminate'
 *   ac_as_ratio_check_reason— human-readable reason when check is not_applicable or
 *                             indeterminate; null when evaluated (pass/fail)
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
  /**
   * 4-state persistence status:
   *   'pass'            — ratio ≤ limit (evaluated, tier2/tier3, both areas present)
   *   'fail'            — ratio > limit (evaluated, tier2/tier3, both areas present)
   *   'not_applicable'  — Tier 1 (keine Anforderung) or authority (*): no numeric limit
   *   'indeterminate'   — Flächengruppe unset, BBZ thickness missing, or ratio not computable
   */
  ac_as_ratio_check: 'pass' | 'fail' | 'not_applicable' | 'indeterminate';
  /**
   * Human-readable reason explaining a not_applicable or indeterminate status.
   * null when the check is evaluated (pass or fail) — no explanation needed.
   */
  ac_as_ratio_check_reason: string | null;
};

/**
 * Materialize the Tab.6 loading check from raw project-parameter inputs.
 *
 * Decision path:
 *   1. Resolve Tab.6 tier via flaechengruppeToTier(flaechengruppe).
 *   2. Run tab6LoadingCheck with the resolved tier + BBZ thickness.
 *   3. Map the discriminated-union result to the four flat scalar outputs.
 *
 * Output interpretation:
 *   - `evaluated`    → ratio, limit present; check='pass'/'fail'; reason=null.
 *   - `na`           → ratio computed (when inputs available); limit=null;
 *                      check='not_applicable'; reason carries keine-Anforderung
 *                      or behördlich text.
 *   - `indeterminate`→ ratio carried (when computable); limit=null;
 *                      check='indeterminate'; reason carries the missing-input text.
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

  if (r.kind === 'evaluated') {
    return {
      ac_as_ratio,
      ac_as_ratio_limit: r.limit,
      ac_as_ratio_check: r.pass ? 'pass' : 'fail',
      ac_as_ratio_check_reason: null,
    };
  }

  if (r.kind === 'na') {
    return {
      ac_as_ratio,
      ac_as_ratio_limit: null,
      ac_as_ratio_check: 'not_applicable',
      ac_as_ratio_check_reason: r.reason,
    };
  }

  // kind === 'indeterminate'
  return {
    ac_as_ratio,
    ac_as_ratio_limit: null,
    ac_as_ratio_check: 'indeterminate',
    ac_as_ratio_check_reason: r.reason,
  };
}
