/**
 * M-3 usability (branch review 2026-10-08, fix round 4): the fields the „alle bestätigen" bar re-saves.
 *
 * A field qualifies when it carries the persisted `is_stale` flag (U-1, ruling R-12), is one of this sheet's own active
 * fields, is VISIBLE (not hidden by `visible_when`, own or section rule), holds a value, and has not been touched in this
 * mount (not pending now, not pending before — once re-saved the flag is cleared server-side, but the prop is not
 * refreshed after an autosave). JSON carriers are never flagged (L-5) and are skipped.
 *
 * Pure: no React, no store.
 */
export function staleConfirmCandidates(args: {
  fields: ReadonlyArray<{ id: string; dataType: string; active?: boolean; inheritedFromWorksheet?: string | null }>;
  hiddenFieldIds: ReadonlySet<string>;
  staleByFieldId?: Readonly<Record<string, boolean>>;
  values: Readonly<Record<string, unknown>>;
  pendingFieldIds: ReadonlySet<string>;
  touched: ReadonlySet<string>;
}): string[] {
  const { staleByFieldId } = args;
  if (!staleByFieldId) return [];
  return args.fields
    .filter((f) =>
      staleByFieldId[f.id] === true
      && !f.inheritedFromWorksheet
      && f.active !== false
      && f.dataType !== 'json'
      && !args.hiddenFieldIds.has(f.id)
      && args.values[f.id] != null
      && !args.pendingFieldIds.has(f.id)
      && !args.touched.has(f.id))
    .map((f) => f.id);
}
