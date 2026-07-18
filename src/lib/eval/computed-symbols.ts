/**
 * Pure seam: compute the set of symbols a worksheet renders as "computed"
 * (isComputed=true → read-only engine-output treatment in DynamicField).
 *
 * A symbol is a LOCAL computed output only when a local equation produces it
 * AND its single active-field home is THIS worksheet. If the symbol's home is a
 * DIFFERENT worksheet (i.e. `inheritedFromBySymbol[symbol]` is set), the value
 * is INHERITED — it must render the inherited value, not a blank client-engine
 * card. This is the render-layer half of the single-source home-boundary rule
 * (defect Finding E, standard-agnostic sibling to symbolHomeSuppressedSymbols).
 *
 * Example (A138-17 Mulde): Gl.16 outputs A_S_m locally, but A_S_m's home is
 * A138-12. The Mulde Gl.16 sweep is SERVER-ONLY → the client engine can't
 * compute it → without this exclusion the A_S_m field renders a blank engine
 * card and downstream consumers (Gl.14/15) read blank → V_M blocked. Excluding
 * home-elsewhere symbols keeps the inherited A138-12 value visible and usable.
 *
 * On A_S_m's home (A138-12) `inheritedFromBySymbol` has NO A_S_m → A_S_m STAYS
 * computed (correct). On worksheets where A_S_m is a pure inherited consumer
 * (never a local output) it was never in the set anyway → unaffected.
 *
 * DB-free / pure; unit-tested in computed-symbols.test.ts.
 */

type EquationLike = {
  outputSymbol: string | null;
};

/**
 * @param equations         local equations (each may declare an outputSymbol)
 * @param inheritedFromBySymbol  symbol → home worksheet code for every symbol
 *   whose value was inherited (home is a DIFFERENT worksheet). Presence of a
 *   key means the symbol is NOT owned locally.
 * @param options.hasField  gate: only symbols with a visible field on this
 *   worksheet are added (mirrors `fieldBySymbol.has(out)` in worksheet-form).
 *   Defaults to always-true for pure-seam unit tests that don't model fields.
 * @param options.extraSymbols  additional read-only symbols the caller folds in
 *   (e.g. materialized derived outputs like BASIN_GOVERNING/LOADING_CHECK) that
 *   are NOT equation outputs but share the same read-only treatment. These are
 *   ALSO subject to the same home-exclusion rule for consistency.
 * @returns set of local output symbols MINUS any symbol whose home is elsewhere.
 */
export function computeComputedSymbols(
  equations: ReadonlyArray<EquationLike>,
  inheritedFromBySymbol: Readonly<Record<string, string>>,
  options?: {
    hasField?: (symbol: string) => boolean;
    extraSymbols?: Iterable<string>;
  },
): Set<string> {
  const hasField = options?.hasField ?? (() => true);
  const set = new Set<string>();

  const consider = (out: string | null | undefined) => {
    if (!out) return;
    if (!hasField(out)) return;
    // HOME-EXCLUSION: a symbol whose value is inherited from a different
    // worksheet is not a local computed output here — render the inherited
    // value, do not mask it with a (blank) local engine card.
    if (inheritedFromBySymbol[out]) return;
    set.add(out);
  };

  for (const e of equations) consider(e.outputSymbol);
  if (options?.extraSymbols) {
    for (const sym of options.extraSymbols) consider(sym);
  }

  return set;
}
