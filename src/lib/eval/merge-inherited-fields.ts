/**
 * Pure helper: merge a worksheet's own fields with inherited fields from
 * upstream worksheets that declared this worksheet as a consumer.
 *
 * Semantics:
 *   - Own fields ALWAYS win — if an own field has the same symbol as an
 *     inherited one, the inherited one is dropped (the worksheet has
 *     authoritative local data).
 *   - Inherited fields are annotated with `inheritedFromWorksheet` so the
 *     UI can render an attribution badge.
 *   - Field ordering preserves own-fields-first, then inherited (sorted
 *     by origin worksheet code for stability).
 *
 * Project_parameters is keyed by (project_id, field_id) so an inherited
 * field's value is read directly from the origin field's row — saving on
 * the origin worksheet propagates immediately, with no extra plumbing.
 */

type FieldShape = {
  id: string;
  symbol: string;
  [k: string]: unknown;
};

export type InheritedFieldShape<F extends FieldShape> = F & {
  originWorksheetCode: string;
};

export type MergedField<F extends FieldShape> = F & {
  /** Set when the field was inherited from another worksheet. */
  inheritedFromWorksheet?: string;
};

export function mergeInheritedFields<F extends FieldShape>(
  ownFields: F[],
  inheritedFields: InheritedFieldShape<F>[],
): MergedField<F>[] {
  const ownSymbols = new Set(ownFields.map((f) => f.symbol));
  const filtered = inheritedFields
    .filter((inh) => !ownSymbols.has(inh.symbol))
    .sort((a, b) =>
      a.originWorksheetCode === b.originWorksheetCode
        ? a.symbol.localeCompare(b.symbol)
        : a.originWorksheetCode.localeCompare(b.originWorksheetCode),
    );

  const merged: MergedField<F>[] = ownFields.map((f) => ({ ...f }));
  for (const inh of filtered) {
    const { originWorksheetCode, ...rest } = inh;
    merged.push({
      ...(rest as unknown as F),
      inheritedFromWorksheet: originWorksheetCode,
    });
  }
  return merged;
}
