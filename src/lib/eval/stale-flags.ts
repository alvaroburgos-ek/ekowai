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
    if (hiddenSymbols.has(f.symbol)) {
      if (!row.isStale && paramHasValue(f.dataType, row)) setStale.push(row.fieldId);
    } else if (row.isStale && writtenFieldIds.has(row.fieldId)) {
      clearStale.push(row.fieldId);
    }
  }
  return { setStale, clearStale };
}
