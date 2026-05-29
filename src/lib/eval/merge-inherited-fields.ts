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

export type MergeResult<F extends FieldShape> = {
  fields: MergedField<F>[];
  /**
   * Symbol → list of producing worksheet codes whose inherited fields all
   * claim the symbol. Non-empty entries indicate ambiguity: the engine
   * cannot silently pick one producer; any equation consuming that symbol
   * must return manual_required.
   *
   * Own fields ALWAYS resolve ambiguity (they're the worksheet's
   * authoritative override). Only inherited-vs-inherited collisions count
   * as ambiguous.
   */
  ambiguousSymbols: Map<string, string[]>;
};

export function mergeInheritedFields<F extends FieldShape>(
  ownFields: F[],
  inheritedFields: InheritedFieldShape<F>[],
): MergeResult<F> {
  const ownSymbols = new Set(ownFields.map((f) => f.symbol));

  // Group inherited rows by symbol so we can spot ambiguity (>1 producer
  // for the same consumed symbol). Own fields override and are skipped.
  const inheritedBySymbol = new Map<string, InheritedFieldShape<F>[]>();
  for (const inh of inheritedFields) {
    if (ownSymbols.has(inh.symbol)) continue;
    const arr = inheritedBySymbol.get(inh.symbol) ?? [];
    arr.push(inh);
    inheritedBySymbol.set(inh.symbol, arr);
  }

  const ambiguousSymbols = new Map<string, string[]>();
  const accepted: InheritedFieldShape<F>[] = [];
  for (const [symbol, group] of inheritedBySymbol) {
    if (group.length > 1) {
      // Record ambiguity but DROP both rows from the merged field list
      // entirely — adding either would silently pick a winner whose
      // project_parameters row the form would read. Keeping neither is
      // the only fail-loud option: the engine receives no value and must
      // emit manual_required (via the ambiguity check downstream).
      ambiguousSymbols.set(
        symbol,
        // de-duplicate origins (theoretically a symbol could re-appear
        // from the same worksheet via two distinct active rows)
        [...new Set(group.map((g) => g.originWorksheetCode))].sort(),
      );
      continue;
    }
    accepted.push(group[0]);
  }

  // Stable ordering: by origin worksheet code, then by symbol.
  accepted.sort((a, b) =>
    a.originWorksheetCode === b.originWorksheetCode
      ? a.symbol.localeCompare(b.symbol)
      : a.originWorksheetCode.localeCompare(b.originWorksheetCode),
  );

  const fields: MergedField<F>[] = ownFields.map((f) => ({ ...f }));
  for (const inh of accepted) {
    const { originWorksheetCode, ...rest } = inh;
    fields.push({
      ...(rest as unknown as F),
      inheritedFromWorksheet: originWorksheetCode,
    });
  }
  return { fields, ambiguousSymbols };
}
