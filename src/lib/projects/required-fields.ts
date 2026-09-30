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
