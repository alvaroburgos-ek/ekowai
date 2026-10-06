/**
 * Required-field satisfaction — the ONE rule the approval gate, the finalize
 * gate and the per-standard progress counts share (A4, 2026-09-30).
 *
 * Observed on the deployed app: "Nächster Schritt: FLL-GAR-01 — 1 Pflichtfeld
 * offen" where the one open required field was `project_name`, which the sheet
 * itself offered as an inherited project-wide value ("aus FLLNT-01 … oder
 * überschreiben"). A required field is SATISFIED when
 *   (a) the field's own `project_parameters` row carries a value of its type, or
 *   (b) a conflict-free project-wide value resolves for its symbol — the same
 *       same-symbol inheritance the worksheet page seeds into the form (every
 *       saved occurrence of the symbol on OTHER worksheets of the project
 *       agrees; a conflict resolves nothing, exactly like the page's
 *       "ambiguous" rule and the gate's `buildFallbackValues`).
 * The value the engineer sees is the value the gate counts; re-typing an
 * inherited value can never be the difference between "offen" and "complete".
 *
 * Pure: no DB, no React. Callers load the rows and build the inherited map.
 */

/** The value columns of a `project_parameters` row (any driver's row shape). */
export type ParameterValueColumns = {
  valueNumber: unknown;
  valueText: string | null;
  valueEnum: string | null;
  valueBoolean: boolean | null;
  valueDate: string | null;
  valueJson: unknown;
};

/** Presence check per data type — the single definition (was duplicated in both gates). */
export function paramHasValue(dataType: string, p: ParameterValueColumns): boolean {
  switch (dataType) {
    case 'number': return p.valueNumber != null;
    case 'text': return p.valueText != null && p.valueText !== '';
    case 'enum': return p.valueEnum != null && p.valueEnum !== '';
    case 'boolean': return p.valueBoolean != null;
    case 'date': return p.valueDate != null;
    case 'json': return p.valueJson != null;
    default: return false;
  }
}

export type RequiredFieldRow = {
  id: string;
  symbol: string;
  labelDe: string;
  dataType: string;
  isRequired: boolean | null;
};

export type RequiredFieldOptions = {
  /** Symbols for which a conflict-free PROJECT-WIDE value resolves (from other worksheets). */
  inheritedSymbols?: ReadonlySet<string>;
  /** Field ids hidden by `visible_when` under the saved values — never "missing" (cannot be filled). */
  hiddenFieldIds?: ReadonlySet<string>;
};

/** Own value present, or an inherited project-wide value resolves for the symbol. */
export function requiredFieldSatisfied(
  field: Pick<RequiredFieldRow, 'symbol' | 'dataType'>,
  param: ParameterValueColumns | undefined,
  inheritedSymbols?: ReadonlySet<string>,
): boolean {
  if (param && paramHasValue(field.dataType, param)) return true;
  return inheritedSymbols?.has(field.symbol) ?? false;
}

/** The open required fields of a worksheet — the gate's `missingRequiredFields` and the progress panel's count. */
export function missingRequiredFields(
  rows: ReadonlyArray<RequiredFieldRow>,
  paramByFieldId: ReadonlyMap<string, ParameterValueColumns>,
  opts: RequiredFieldOptions = {},
): Array<{ symbol: string; labelDe: string }> {
  const out: Array<{ symbol: string; labelDe: string }> = [];
  for (const f of rows) {
    if (!f.isRequired) continue;
    if (opts.hiddenFieldIds?.has(f.id)) continue;
    if (requiredFieldSatisfied(f, paramByFieldId.get(f.id), opts.inheritedSymbols)) continue;
    out.push({ symbol: f.symbol, labelDe: f.labelDe });
  }
  return out;
}

/**
 * Progress-panel counts for ONE worksheet template from the same rule:
 * `totalRequired` = active required fields, `filledRequired` = those satisfied
 * (own value or inherited). Feed the result to `summarizeStandardProgress`.
 */
export function countRequiredFields(
  rows: ReadonlyArray<RequiredFieldRow>,
  paramByFieldId: ReadonlyMap<string, ParameterValueColumns>,
  opts: RequiredFieldOptions = {},
): { totalRequired: number; filledRequired: number } {
  const required = rows.filter((f) => f.isRequired);
  const missing = missingRequiredFields(required, paramByFieldId, opts).length;
  return { totalRequired: required.length, filledRequired: required.length - missing };
}

/**
 * Build the set of symbols with a conflict-free project-wide value from the
 * saved occurrences on OTHER worksheets: every occurrence must agree (number 4
 * and text "4" agree, as in the gate's `buildFallbackValues`); a symbol whose
 * occurrences disagree resolves nothing. `''` / null never count as a value.
 */
export function inheritedSymbolSet(
  entries: ReadonlyArray<{ symbol: string; value: number | string | boolean | null | undefined }>,
): Set<string> {
  const seen = new Map<string, number | string | boolean>();
  const conflict = new Set<string>();
  for (const e of entries) {
    if (e.value === undefined || e.value === null || e.value === '') continue;
    if (conflict.has(e.symbol)) continue;
    const prev = seen.get(e.symbol);
    if (prev === undefined) { seen.set(e.symbol, e.value); continue; }
    if (prev === e.value || String(prev) === String(e.value)) continue;
    conflict.add(e.symbol);
    seen.delete(e.symbol);
  }
  return new Set(seen.keys());
}

/**
 * DWA-M 820-3 structure block, review fix round 1 (I-e): own-standard-first scoping of the project-wide occurrences that feed
 * `inheritedSymbolSet` (A4) and the gate fallback. A symbol that is an active field of the worksheet's OWN standard
 * (`ownStandardSymbols`) keeps only the occurrences saved on that standard's worksheets (`ownTemplateIds`) — a same-named
 * field of another standard (e.g. DWA-M 820-1 `project_type` = `projekt` beside DWA-M 820-3 `project_type`) never fills it
 * and never blanks it out as a conflict. Every other symbol keeps all its occurrences (the cross-standard sharing as before).
 */
export function scopeToOwnStandard<T extends { symbol: string; templateId: string }>(
  entries: ReadonlyArray<T>,
  ownTemplateIds: ReadonlySet<string>,
  ownStandardSymbols: ReadonlySet<string>,
): T[] {
  return entries.filter((e) => !ownStandardSymbols.has(e.symbol) || ownTemplateIds.has(e.templateId));
}

/**
 * DWA-M 820-3 review fix I-e, fix round 2 (controller ruling) — the A4 (required-field inheritance) form of the own-standard
 * scoping. A4 exists so that an identity / metadata value the worksheet page OFFERS from another worksheet (same symbol, any
 * standard — e.g. FLL-GAR-01 `project_name` "aus FLLNT-01 … oder überschreiben") counts as filled. It may count only that class:
 *   - a symbol that is NOT a field of the own standard: every occurrence counts, as before;
 *   - an occurrence on the own standard's worksheets: counts;
 *   - an occurrence of an OWN symbol on ANOTHER standard's worksheet counts only when (a) the own standard holds no occurrence of
 *     it AND (b) every own field carrying the symbol is of data type `text` or `date` (project_name, project_number,
 *     project_location …). Number, boolean, json and enum fields always need an own value — the same token or number can mean
 *     something else in another standard (DWA-M 820-1 `project_type` = `konzept` beside DWA-M 820-3 `project_type`), and
 *     the own-standard gate fallback (`scopeToOwnStandard`) refuses the foreign value too, so the sheet can never say
 *     "0 Pflichtfelder offen" while a gate waits for the same input.
 * `ownTypes`: per own symbol the data types of the own fields carrying it.
 */
export const A4_FOREIGN_TYPES: ReadonlySet<string> = new Set(['text', 'date']);
export function scopeForInheritance<T extends { symbol: string; templateId: string }>(
  entries: ReadonlyArray<T>,
  ownTemplateIds: ReadonlySet<string>,
  ownTypes: ReadonlyMap<string, ReadonlySet<string>>,
): T[] {
  const ownHas = new Set(entries.filter((e) => ownTypes.has(e.symbol) && ownTemplateIds.has(e.templateId)).map((e) => e.symbol));
  return entries.filter((e) => {
    if (!ownTypes.has(e.symbol) || ownTemplateIds.has(e.templateId)) return true;
    if (ownHas.has(e.symbol)) return false;
    const types = ownTypes.get(e.symbol)!;
    return types.size > 0 && [...types].every((t) => A4_FOREIGN_TYPES.has(t));
  });
}
