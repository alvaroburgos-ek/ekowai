/**
 * U-1 (DWA-M 820 UX pass, 2026-10-08; controller ruling R-12) — `project_parameters.is_stale`.
 *
 * Meaning: "this value was last saved while its field was hidden by `visible_when`, or has not been
 * re-saved since; it is not a conscious answer under the current selection". Observed live on
 * 820-2-22: `abnahme_per_bild4` kept „Nein" from the first fill while hidden by
 * `phase_inbetriebnahme_erreicht = false`; switching the phase to Ja made the question reappear
 * pre-answered „Nein".
 *
 * The save path (`saveWorksheet`) decides per save, over the saved template's OWN fields:
 *   - setStale   — the field is hidden under the post-save values AND its row holds a value
 *                  (and is not already flagged);
 *   - clearStale — the field is visible AND was written in this save (and is flagged today).
 * A visible field that was NOT written keeps its flag: only a save while it is visible (a
 * conscious answer) clears it. Rows the server writes (`source_type` 'derived' / 'computed') are
 * never flagged — the materialisers already null hidden outputs. No value is deleted or nulled.
 *
 * Pure: no DB.
 */
import { paramHasValue, type ParameterValueColumns } from '@/lib/projects/required-fields';
import { extractConditionSymbols } from '@/lib/compliance/evaluate';
import { computeVisibility, effectiveVisibleWhen } from '@/lib/compliance/visibility';
import { makeSymbolLookup } from '@/lib/compliance/symbol-lookup';
import { parametersToFieldValues } from '@/lib/eval/materialize-derived';
import { gateHiddenFieldIdsByTemplate, hiddenAtSourceFieldIds, type RequiredFieldCountArgs } from '@/lib/projects/required-field-counts';

export type StaleFlagField = { id: string; symbol: string; dataType: string };

export type StaleFlagRow = ParameterValueColumns & {
  fieldId: string;
  sourceType: string;
  isStale: boolean;
};

/** Source types written by a server engine, never an engineer answer — excluded from the flag. */
const SERVER_SOURCE_TYPES: ReadonlySet<string> = new Set(['derived', 'computed']);

export function staleFlagSets(
  ownFields: ReadonlyArray<StaleFlagField>,
  hiddenSymbols: ReadonlySet<string>,
  writtenFieldIds: ReadonlySet<string>,
  paramRows: ReadonlyArray<StaleFlagRow>,
): { setStale: string[]; clearStale: string[] } {
  const fieldById = new Map(ownFields.map((f) => [f.id, f]));
  const setStale: string[] = [];
  const clearStale: string[] = [];
  for (const row of paramRows) {
    const f = fieldById.get(row.fieldId);
    if (!f) continue; // not an own field of the saved template
    if (SERVER_SOURCE_TYPES.has(row.sourceType)) continue;
    // L-5 (review 25d4bd1): JSON carriers (registers, checklists) render through widgets that show no stale badge and
    // offer no „Bestätigen" — a flag there would read "open" with no way to see why or to confirm. Never flagged.
    if (f.dataType === 'json') continue;
    if (hiddenSymbols.has(f.symbol)) {
      if (!row.isStale && paramHasValue(f.dataType, row)) setStale.push(row.fieldId);
    } else if (row.isStale && writtenFieldIds.has(row.fieldId)) {
      clearStale.push(row.fieldId);
    }
  }
  return { setStale, clearStale };
}

/**
 * M-1 (ruling R-13, 2026-10-08) — cross-sheet drivers: the OTHER templates of the standard whose fields' or sections'
 * `visible_when` read one of the symbols written in this save. Symbols come from the condition parser
 * (`extractConditionSymbols`: identifiers the evaluator looks up — keywords, literals and enum tokens excluded); a field
 * rule is its EFFECTIVE rule (DB rule, else the legacy A138-12 rule). An unparseable rule never hides anything
 * (`manual` ⇒ visible), so it cannot make a consumer.
 */
export function consumerTemplatesReferencing(
  writtenSymbols: ReadonlySet<string>,
  ruleFields: ReadonlyArray<{ templateId: string; symbol: string; visibleWhen?: string | null }>,
  ruleSections: ReadonlyArray<{ templateId: string; visibleWhen?: string | null }>,
  savedTemplateId: string,
): Set<string> {
  const out = new Set<string>();
  if (writtenSymbols.size === 0) return out;
  const reads = (rule: string | null | undefined): boolean => {
    if (!rule || !rule.trim()) return false;
    const syms = extractConditionSymbols(rule);
    if (!syms) return false;
    for (const s of syms) if (writtenSymbols.has(s)) return true;
    return false;
  };
  for (const f of ruleFields) {
    if (f.templateId === savedTemplateId || out.has(f.templateId)) continue;
    if (reads(effectiveVisibleWhen(f))) out.add(f.templateId);
  }
  for (const s of ruleSections) {
    if (s.templateId === savedTemplateId || out.has(s.templateId)) continue;
    if (reads(s.visibleWhen)) out.add(s.templateId);
  }
  return out;
}

/** True when the template has any visibility rule at all (field — effective rule incl. legacy — or section). */
export function templateHasVisibilityRules(
  templateId: string,
  ruleFields: ReadonlyArray<{ templateId: string; symbol: string; visibleWhen?: string | null }>,
  ruleSections: ReadonlyArray<{ templateId: string; visibleWhen?: string | null }>,
): boolean {
  return ruleFields.some((f) => f.templateId === templateId && effectiveVisibleWhen(f) != null)
    || ruleSections.some((s) => s.templateId === templateId && !!s.visibleWhen?.trim());
}

/**
 * The whole save-path decision (U-1 R-12 + M-1 R-13 + R-14) on rows already loaded, so it is unit-testable; the save
 * path only loads the rows and runs the two UPDATEs.
 *   OWN sheet — the form's lookup pair: own fields hideable; own + inherited symbols readable, inherited fields hidden
 *     at their source dropped (R-14 — the set the page drops, so a „Bestätigen" re-save of a field the page shows as
 *     visible can never re-flag it). setStale on hidden valued rows, clearStale on visible rows written in this save.
 *   CONSUMER sheets (R-13) — the counts' (gate) lookup over the occurrences minus hidden-at-source; setStale ONLY
 *     (a flag on another sheet is cleared only when that sheet itself is saved with the field visible).
 */
export function planStaleFlags(args: {
  visArgs: RequiredFieldCountArgs;
  ownTemplateId: string;
  inheritedFields: ReadonlyArray<{ id: string; symbol: string; dataType: string }>;
  writtenFieldIds: ReadonlySet<string>;
  consumerTemplateIds: ReadonlySet<string>;
  /** M-4 (branch review 2026-10-08): consumer templates whose instance in this project is not editable
   * (`engineer_approved`, `final`, `deactivated`) — never flagged behind the engineer's back; a locked sheet is re-opened
   * explicitly. The own sheet is not affected (a locked sheet cannot be saved: saveWorksheet refuses it first). */
  lockedTemplateIds?: ReadonlySet<string>;
}): { setStale: string[]; clearStale: string[] } {
  const { visArgs, ownTemplateId } = args;
  const hiddenAtSource = hiddenAtSourceFieldIds(visArgs);
  const rowsOf = (ids: ReadonlyArray<string>): StaleFlagRow[] => ids.flatMap((id) => {
    const p = visArgs.paramByFieldId.get(id);
    return p ? [{ ...p, fieldId: id, sourceType: p.sourceType ?? 'entered', isStale: !!p.isStale }] : [];
  });

  const ownFields = visArgs.fields.filter((f) => f.templateId === ownTemplateId);
  const ownSections = visArgs.sections.filter((s) => s.templateId === ownTemplateId);
  const ownSyms = new Set(ownFields.map((f) => f.symbol));
  const readable = [
    ...ownFields.map((f) => ({ id: f.id, symbol: f.symbol, dataType: f.dataType })),
    ...args.inheritedFields.filter((f) => !ownSyms.has(f.symbol) && !hiddenAtSource.has(f.id)),
  ];
  const readableRows = rowsOf(readable.map((f) => f.id)).map((r) => ({ ...r, valueNumber: r.valueNumber as string | number | null }));
  const { hiddenSymbols } = computeVisibility(ownFields, ownSections, makeSymbolLookup(readable, parametersToFieldValues(readableRows, readable)));
  const own = staleFlagSets(ownFields, hiddenSymbols, args.writtenFieldIds, rowsOf(ownFields.map((f) => f.id)));
  const setStale = [...own.setStale];

  const consumers = [...args.consumerTemplateIds].filter((t) => t !== ownTemplateId && !args.lockedTemplateIds?.has(t));
  if (consumers.length > 0) {
    for (const [templateId, hiddenIds] of gateHiddenFieldIdsByTemplate({ ...visArgs, templateIds: consumers }, hiddenAtSource)) {
      const cFields = visArgs.fields.filter((f) => f.templateId === templateId);
      const cHidden = new Set(cFields.filter((f) => hiddenIds.has(f.id)).map((f) => f.symbol));
      setStale.push(...staleFlagSets(cFields, cHidden, new Set(), rowsOf(cFields.map((f) => f.id))).setStale);
    }
  }
  return { setStale, clearStale: own.clearStale };
}
