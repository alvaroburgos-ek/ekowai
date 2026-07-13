import { equationProfiles } from './equation-profiles';

type EquationLike = { id: string; outputSymbol: string | null };

/**
 * The set of symbols a worksheet's equations PRODUCE (derived outputs).
 *
 * A symbol is derived when it is the output of an equation that is NOT
 * `displayOnly`. `displayOnly` equations are alternative-form / sizing-aid
 * equations whose output is an engineer-entered iteration variable (e.g. Gl. 23
 * L_R) — the engine never writes those back, so they stay `entered`.
 *
 * saveWorksheet uses this to stamp `source_type='derived'` instead of
 * `'entered'` for produced values. Without it, the engine's client-side
 * write-back (use-equation-engine.ts) can enqueue a computed output as a
 * pending edit, and the auto-save persists it as an engineer input — breaking
 * the single-source invariant. A symbol produced by ANY non-displayOnly
 * equation is derived, even if another (alt-form) equation also outputs it.
 *
 * `extraDerivedSymbols` carries NON-equation derived outputs — values a
 * worksheet inherits or a materialize produces that no equation on the template
 * outputs (e.g. the governing-iteration r_D_n / D_min inherited onto A138-10).
 * They must be stamped `derived`, not `entered` (gap-class 6 inverse); without
 * this they leak as engineer inputs.
 */
export function derivedOutputSymbols(
  equations: ReadonlyArray<EquationLike>,
  extraDerivedSymbols: readonly string[] = [],
): Set<string> {
  const derived = new Set<string>(extraDerivedSymbols);
  for (const eq of equations) {
    if (!eq.outputSymbol) continue;
    if (equationProfiles[eq.id]?.displayOnly) continue;
    derived.add(eq.outputSymbol);
  }
  return derived;
}
