/**
 * `visible_when` — conditional visibility of fields and sections (Plan 2a, Task 10).
 *
 * Pure: no React, no DB. The same helper runs in the worksheet form (grid +
 * engine + compliance block) and on every server consumer of the compliance
 * gates (approval gate, report compliance, snapshot payload, PDF assembler),
 * so "hidden" means the same thing everywhere:
 *
 *   - a field is hidden iff its effective `visible_when` evaluates to `fail`
 *     OR its section is hidden;
 *   - a section is hidden iff its own `visible_when` evaluates to `fail`
 *     OR its parent section is hidden;
 *   - `pass | pending | manual | not_applicable` keep the field/section
 *     VISIBLE (fail-safe: a missing driver or an unparseable rule never
 *     hides anything).
 *
 * Downstream contract (spec §6): a hidden field leaves the grid, its symbol
 * resolves to `null` in the formula engine, and every compliance/suggestion
 * condition that references it reports `not_applicable`
 * (`evaluateCondition(cond, lookup, { hiddenSymbols })`).
 *
 * Evaluation is SINGLE-PASS over the CURRENT values. A `visible_when` that
 * references another hidden symbol sees that symbol's stored value, not
 * `null` — visibility does not cascade through hidden drivers in one render.
 * Accepted for this first pass (sign-off note).
 *
 * Known blind spot (carried from the Task 2 review): for a compare node
 * whose right-hand side is a bare identifier (`x + 1 == y` with a valued
 * `y`), `extractSymbols` does not collect `y` — the legacy parser turns an
 * equality-RHS identifier into a string literal. A hidden `y` in that
 * position is therefore invisible to the `not_applicable` check. Documented,
 * not fixed here.
 */
import { evaluateCondition } from './evaluate';
import type { Value } from '@/lib/expr';

/**
 * The two DWA-A-138-1 A138-12 rules that used to be hardcoded early returns in
 * DynamicField (`soil_bodenart_tab13` only when method = 'soil_estimate',
 * `a_s_m_provenance` only when method = 'manual'). Used while
 * `fields.visible_when IS NULL`; retired once migration
 * `scripts/migrations/20260916120000_a138_12_visible_when.sql` is applied
 * (it writes the same rules as data). The `IS NOT NULL` guard reproduces the
 * null-method case exactly: method unset ⇒ both hidden.
 */
export const LEGACY_VISIBLE_WHEN: Readonly<Record<string, string>> = {
  soil_bodenart_tab13:
    "a_s_m_determination_method IS NOT NULL AND a_s_m_determination_method == 'soil_estimate'",
  a_s_m_provenance:
    "a_s_m_determination_method IS NOT NULL AND a_s_m_determination_method == 'manual'",
};

export type VisibilityField = {
  id: string;
  symbol: string;
  sectionId: string | null;
  visibleWhen?: string | null;
};

export type VisibilitySection = {
  id: string;
  parentSectionId: string | null;
  visibleWhen?: string | null;
};

export type Visibility = {
  hiddenFieldIds: Set<string>;
  hiddenSectionIds: Set<string>;
  hiddenSymbols: Set<string>;
};

/** DB rule wins; the legacy hardcoded rule fills in while the column is NULL. */
export function effectiveVisibleWhen(f: { symbol: string; visibleWhen?: string | null }): string | null {
  const own = f.visibleWhen?.trim() ? f.visibleWhen : null; // '' ⇒ null (fix round 1)
  return own ?? LEGACY_VISIBLE_WHEN[f.symbol] ?? null;
}

export function computeVisibility(
  fields: readonly VisibilityField[],
  sections: readonly VisibilitySection[],
  lookup: (sym: string) => Value | undefined,
): Visibility {
  const hides = (cond: string | null): boolean =>
    cond != null && cond.trim() !== '' && evaluateCondition(cond, lookup).kind === 'fail';

  const parent = new Map<string, string | null>(sections.map((s) => [s.id, s.parentSectionId]));
  const own = new Map<string, boolean>(sections.map((s) => [s.id, hides(s.visibleWhen ?? null)]));
  const hiddenSectionIds = new Set<string>();

  // A section is hidden by its own rule or by any hidden ancestor. `seen`
  // guards against a parent cycle in bad data (treated as not hidden by the
  // cycle); unknown ids (a field whose section is not in `sections`) are
  // never hidden by section.
  const isHidden = (id: string | null, seen: Set<string> = new Set()): boolean => {
    if (!id || seen.has(id) || !own.has(id)) return false;
    seen.add(id);
    if (hiddenSectionIds.has(id)) return true;
    const h = own.get(id) === true || isHidden(parent.get(id) ?? null, seen);
    if (h) hiddenSectionIds.add(id);
    return h;
  };
  for (const s of sections) isHidden(s.id);

  const hiddenFieldIds = new Set<string>();
  const hiddenSymbols = new Set<string>();
  for (const f of fields) {
    if (isHidden(f.sectionId) || hides(effectiveVisibleWhen(f))) {
      hiddenFieldIds.add(f.id);
      hiddenSymbols.add(f.symbol);
    }
  }
  return { hiddenFieldIds, hiddenSectionIds, hiddenSymbols };
}

/**
 * Wrap a value/json/carrier accessor so a hidden key resolves to `undefined`
 * ("no value") — THE one place the "hidden ⇒ null for the engine" rule is
 * implemented (fix round 1). Keys may be symbols (`hiddenSymbols`) or field
 * ids (a set derived from them) depending on what the wrapped accessor takes;
 * every equation path (client hook, report evaluator, snapshot, PDF
 * assembler, save-path materialiser) routes its reads through this instead
 * of re-implementing the check.
 */
export function withHidden<K extends string, T>(
  lookup: (key: K) => T | undefined,
  hidden: ReadonlySet<string> | undefined,
): (key: K) => T | undefined {
  if (!hidden || hidden.size === 0) return lookup;
  return (key) => (hidden.has(key) ? undefined : lookup(key));
}

/** Field ids of the fields whose symbol is hidden (for accessors keyed by field id). */
export function hiddenFieldIdsOf(
  fields: ReadonlyArray<{ id: string; symbol: string }>,
  hiddenSymbols: ReadonlySet<string> | undefined,
): Set<string> {
  const out = new Set<string>();
  if (!hiddenSymbols || hiddenSymbols.size === 0) return out;
  for (const f of fields) if (hiddenSymbols.has(f.symbol)) out.add(f.id);
  return out;
}
