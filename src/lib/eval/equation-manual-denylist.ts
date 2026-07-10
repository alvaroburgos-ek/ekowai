/**
 * Equation manual-evaluation deny-set.
 *
 * The formula engine routes EVERY equation to `evaluateFormula` (the gate is
 * generalized away from the old DWA-A-138-only allow-list). The evaluator's
 * fail-safe blanks anything it cannot faithfully compute (missing symbol,
 * unsupported function, division-by-zero, non-finite) — so routing-by-default
 * can never produce a wrong number FROM THOSE causes.
 *
 * It cannot, however, catch a "valid-but-unfaithful" equation: one whose stored
 * `formula` parses cleanly and computes a finite number, yet is WRONG versus the
 * source document (a dropped unit/scale factor, a flipped operator, a wrong
 * constant). The charter case is `A138-18:18` — its stored formula omits the
 * ×10³ factor that the same physical quantity Q_S carries in Gl. (4), so a
 * literal evaluation returns m³/s instead of l/s (a silent 1000× error).
 *
 * Such equations are listed here and held at `manual_required` (the engine
 * renders no auto value) until the stored formula is corrected at source. This
 * is the inverse of the retired allow-list: it records EXCEPTIONS-to-compute,
 * not permissions-to-compute. Default is "route it".
 *
 * Keys are `${worksheetCode}:${equationNumber}` — exactly the key the engine
 * builds at each gate site.
 *
 * MAINTENANCE: additions come from the per-standard faithfulness scan (see the
 * engine-generalization plan, Addition 1). Do NOT add an equation here merely
 * because it currently blanks — the fail-safe already handles those. Add ONLY
 * a formula that PARSES + COMPUTES but disagrees with its source.
 */
export const EQUATION_MANUAL_DENYLIST: ReadonlySet<string> = new Set<string>([
  // ── Confirmed (source-verified unfaithful) ────────────────────────────────
  // DWA-A-138-1 · A138-18 · Gl. (18) — Q_S Rigole. Stored formula omits the
  // ×10³ factor present in Gl. (4) for the same quantity Q_S, so literal
  // evaluation yields m³/s (1000× too small). Kept manual until the stored
  // formula is corrected.
  'A138-18:18',

  // ── Deny — suspected missing scale factor (A138-18 shape) ─────────────────
  // No local source doc → unconfirmable → NR → deny (blank, visible) rather
  // than fold silently. Clears when source arrives. Source-gather DWA-A-226,
  // DWA-M-229-1 to resolve. (Faithfulness scan, 2026-06-30.)
  'A226-07:24', // A_NB = Q_bem / q_A — Q_bem l/s ÷ q_A m/h, missing ×3.6 (l/s→m³/h) for m²
  'A226-07:25', // A_NB_theo = Q_bem / q_A — same shape as :24
  'A226-06:17', // Q_L_St = alphaOC/(alphaOC_L_h·h_E) — kg/h over g-based term, missing kg→g ×1000
  'M2291-04:23', // Q_L_N = 1000·SOTR/(3·SSOTE·h_D) — literal ×1000 + % convention must net out

  // ── Deny — lumped constant unconfirmable, likely faithful, clears on source ─
  // No local source → cannot confirm the embedded constant carries its unit
  // conversion. Likely faithful, but unconfirmable = NR = deny visibly. Source-
  // gather DWA-A-131, DWA-M-229-2 to resolve.
  'A131-04:24', // UeS_d_C — divisors 1.33 / (0.92·1.42) are unit-bearing CSB/oTS constants
  'A131-05:36', // UeS_d_P — coefficients 3 / 6.8 / 5.3 stoichiometric
  'M2292-08:B1', // Q_V = 2.79·d_i²·l·(dp_dt) — empirical 2.79 must bundle hPa & ×3600
]);

/**
 * True when the engine should attempt to evaluate this equation. The engine
 * evaluates every equation EXCEPT those in the manual deny-set.
 */
export function shouldEngineEvaluate(
  worksheetCode: string,
  equationNumber: string,
): boolean {
  return !EQUATION_MANUAL_DENYLIST.has(`${worksheetCode}:${equationNumber}`);
}
