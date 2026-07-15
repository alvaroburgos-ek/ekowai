/**
 * §10c — standard-agnostic symbol scoping.
 *
 * A server-side by-symbol field lookup (materialize / producer reads in
 * saveWorksheet) must resolve to the CURRENT standard's field — never
 * "first active field with this symbol across the whole project." A project can
 * carry multiple standards; a project-wide first-wins resolver silently grabs a
 * DIFFERENT guideline's field the moment a second standard (FLL, DIN, ISO, EN…)
 * reuses a symbol name (A_C, V_VA, D, Q_S). That is a latent violation of the
 * strict-separation invariant, invisible only while every symbol happens to be
 * unique across the encoded set.
 *
 * This is the single, tested chokepoint every by-symbol resolver routes through
 * so the scoping cannot be forgotten at a call site.
 */

/** Field candidates carry the standard they belong to (join fields → worksheet
 *  template → standard). */
export type StandardScopedField = { standardId: string | null };

/**
 * Keep only the candidates that belong to the current standard. Applied to the
 * result of a by-symbol query BEFORE any first-non-null-wins reduction, so the
 * reduction can never see a foreign standard's field.
 */
export function scopeFieldsToStandard<T extends StandardScopedField>(
  candidates: readonly T[],
  currentStandardId: string,
): T[] {
  return candidates.filter((f) => f.standardId === currentStandardId);
}
