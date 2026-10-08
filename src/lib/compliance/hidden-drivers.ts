/**
 * U-5 (UX pass 820, 2026-10-08): a worksheet whose own questions are ALL hidden by `visible_when` must say so and
 * name the selections that hide them. Pure helpers — the form formats labels/values (worksheet-form.tsx).
 */
import { extractConditionSymbols } from './evaluate';
import { effectiveVisibleWhen, type Visibility, type VisibilityField, type VisibilitySection } from './visibility';

/** True when the sheet has at least one active own field and EVERY active own field is hidden. */
export function allOwnFieldsHidden(
  ownFields: ReadonlyArray<{ id: string; active: boolean }>,
  hiddenFieldIds: ReadonlySet<string>,
): boolean {
  const active = ownFields.filter((f) => f.active);
  return active.length > 0 && active.every((f) => hiddenFieldIds.has(f.id));
}

/**
 * The driver symbols behind the hidden own fields, in first-reference order, distinct, capped at `max` (default 5):
 * every symbol referenced by a hidden field's effective `visible_when` (DB rule, legacy fallback) and by the
 * `visible_when` of each HIDDEN section on that field's ancestor chain — the same symbol extraction the evaluator
 * uses (`extractConditionSymbols`: keywords, literals, enum tokens excluded; an unparseable rule contributes nothing).
 * A driver that is itself one of this sheet's hidden fields is skipped — the engineer cannot see it, so it does not
 * explain anything; its own driver (one level further up) is listed when it hides a field of this sheet.
 */
export function hiddenSheetDrivers(
  ownFields: ReadonlyArray<VisibilityField & { active: boolean }>,
  sections: readonly VisibilitySection[],
  visibility: Pick<Visibility, 'hiddenFieldIds' | 'hiddenSectionIds' | 'hiddenSymbols'>,
  max = 5,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (cond: string | null | undefined) => {
    if (!cond || !cond.trim()) return;
    const syms = extractConditionSymbols(cond);
    if (!syms) return;
    for (const s of syms) {
      if (seen.has(s) || visibility.hiddenSymbols.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  };
  const byId = new Map(sections.map((s) => [s.id, s]));
  for (const f of ownFields) {
    if (!f.active || !visibility.hiddenFieldIds.has(f.id)) continue;
    add(effectiveVisibleWhen(f));
    const chain = new Set<string>();
    let sid = f.sectionId;
    while (sid && !chain.has(sid)) {
      chain.add(sid);
      const s = byId.get(sid);
      if (!s) break;
      if (visibility.hiddenSectionIds.has(s.id)) add(s.visibleWhen ?? null);
      sid = s.parentSectionId;
    }
  }
  return out.slice(0, max);
}
