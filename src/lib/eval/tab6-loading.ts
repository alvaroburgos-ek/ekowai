/**
 * DWA-A 138-1 §5.2.3.2 + Tab.6 — Hydraulic surface-loading check for the
 * bewachsene Bodenzone (BBZ).
 *
 * Tab.6 caps A_C / A_S,m ≤ limit. The limit depends on two axes:
 *   1. The treatment-requirement tier (resolved from Tab.5 soil/drainage group).
 *   2. The BBZ-thickness band: thin (<0.30 m) vs. relaxed (≥0.30 m).
 *
 * This helper is source-agnostic: it does NOT resolve the tier from soil data —
 * callers supply the already-resolved `Tab6Tier` (that is a later task). This
 * module only maps tier × band → limit and evaluates the arithmetic check.
 *
 * Pure / DB-free. No side-effects.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Tab.6 treatment-requirement tier (resolved from Tab.5 soil/drainage group). */
export type Tab6Tier = 'tier1_none' | 'tier2' | 'tier3';

/**
 * Tab.6 max A_C/A_S,m for a (tier, BBZ-band). Discriminated union so callers
 * must handle the "keine Anforderung" / authority case explicitly — never a
 * magic null or 0.
 */
export type Tab6Limit =
  | { kind: 'none'; reason: string }           // tier1 — keine Anforderung / behördlich (no numeric limit)
  | { kind: 'limit'; max: number }             // tier2/tier3 — numeric max for the band
  | { kind: 'indeterminate'; reason: string }; // tier or BBZ thickness not resolvable

/** Result of the A_C/A_S,m loading check. */
export type Tab6Check =
  | { kind: 'na'; ratio: number | null; reason: string }            // no numeric limit (tier1) — nothing to fail
  | { kind: 'evaluated'; ratio: number; limit: number; pass: boolean }
  | { kind: 'indeterminate'; ratio: number | null; reason: string }; // ratio or limit not computable

// ---------------------------------------------------------------------------
// Internal constants (source: Tab.6, §5.2.3.2)
// ---------------------------------------------------------------------------

/** BBZ-Mächtigkeit threshold in metres — at ≥ this value the relaxed (thick-band) limits apply. */
const THICK_BAND_M = 0.30;

// ---------------------------------------------------------------------------
// tab6Limit
// ---------------------------------------------------------------------------

/**
 * Return the Tab.6 maximum A_C/A_S,m for the given tier and BBZ thickness.
 *
 * - tier1_none (groups D, VW1, V1, BG1 and (*) authority groups): no numeric
 *   limit exists — returns `{kind:'none'}`.
 * - tier2 (groups VW2, V2, BF, BG2): ≤30 thin / ≤50 thick.
 * - tier3 (groups BL, V3, BG3): ≤15 thin / ≤30 thick.
 * - Null / unknown tier or null / non-finite thickness: `{kind:'indeterminate'}`.
 */
export function tab6Limit(tier: Tab6Tier | null, bbzThicknessM: number | null): Tab6Limit {
  if (tier === 'tier1_none') {
    return { kind: 'none', reason: 'Tab.6 Tier 1: keine Anforderung an A_C/A_S,m.' };
  }
  if (tier !== 'tier2' && tier !== 'tier3') {
    return { kind: 'indeterminate', reason: 'Behandlungs-Anforderungsklasse (Tab.6) nicht gesetzt.' };
  }
  if (typeof bbzThicknessM !== 'number' || !Number.isFinite(bbzThicknessM)) {
    return { kind: 'indeterminate', reason: 'BBZ-Mächtigkeit fehlt — Tab.6-Band nicht bestimmbar.' };
  }

  const relaxed = bbzThicknessM >= THICK_BAND_M;
  if (tier === 'tier2') {
    return { kind: 'limit', max: relaxed ? 50 : 30 };
  }
  // tier3
  return { kind: 'limit', max: relaxed ? 30 : 15 };
}

// ---------------------------------------------------------------------------
// tab6LoadingCheck
// ---------------------------------------------------------------------------

/**
 * Evaluate the Tab.6 A_C/A_S,m loading check for a bewachsene Bodenzone.
 *
 * Ratio: `A_C / A_S,m` (dimensionless, [m²/m²]). Only finite when both
 * operands are finite and `A_S,m > 0`.
 *
 * Decision path (in order):
 *   1. Compute `ratio` from A_C / A_S_m (null when missing or A_S_m ≤ 0).
 *   2. Resolve `lim = tab6Limit(tier, bbzThicknessM)`.
 *   3. If `lim.kind === 'none'` → `{kind:'na', ratio, reason}` — Tier 1, no fail possible.
 *   4. If `ratio === null` → `{kind:'indeterminate', ratio:null, reason}`.
 *   5. If `lim.kind === 'indeterminate'` → `{kind:'indeterminate', ratio, reason}`.
 *   6. Otherwise → `{kind:'evaluated', ratio, limit:lim.max, pass: ratio ≤ lim.max}`.
 */
export function tab6LoadingCheck(input: {
  A_C: number | null;
  A_S_m: number | null;
  tier: Tab6Tier | null;
  bbzThicknessM: number | null;
}): Tab6Check {
  const { A_C, A_S_m, tier, bbzThicknessM } = input;

  // Step 1 — ratio
  const ratio: number | null =
    typeof A_C === 'number' && Number.isFinite(A_C) &&
    typeof A_S_m === 'number' && Number.isFinite(A_S_m) && A_S_m > 0
      ? A_C / A_S_m
      : null;

  // Step 2 — limit
  const lim = tab6Limit(tier, bbzThicknessM);

  // Step 3 — Tier 1: no numeric limit
  if (lim.kind === 'none') {
    return { kind: 'na', ratio, reason: lim.reason };
  }

  // Step 4 — ratio not computable
  if (ratio === null) {
    return { kind: 'indeterminate', ratio: null, reason: 'A_C bzw. A_S,m fehlt oder A_S,m ≤ 0.' };
  }

  // Step 5 — limit not resolvable
  if (lim.kind === 'indeterminate') {
    return { kind: 'indeterminate', ratio, reason: lim.reason };
  }

  // Step 6 — evaluated
  return { kind: 'evaluated', ratio, limit: lim.max, pass: ratio <= lim.max };
}
