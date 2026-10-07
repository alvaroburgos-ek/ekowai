/**
 * Cross-standard carry-over allow-list — M820 flow block 3 item 2 (X10, owner ruling 2026-10-06).
 *
 * The own-value rule (A4, `scopeForInheritance` in required-fields.ts): a value saved in ANOTHER standard of the project counts for
 * an own field of the same symbol only when that field is `text` or `date` (identity / metadata). Number, boolean, enum and json
 * fields need their own value in each standard, because the same symbol can mean something else in another guideline.
 *
 * This list is the explicit, documented exception: a value that one standard tells the user to take from another (json carriers,
 * and since 2026-10-07 the DWA-M 820 project-size enum copies — see the entries).
 *   DWA-M 820-2 § 4.8.2 (PDF p. 37): "Fundierte Risikoanalysen (Hinweise gibt Merkblatt DWA-M 820-1:2020 in Anhang A) für die
 *   verschiedenen Risikogruppen werden durchgeführt." → the 820-1 Tab. A.1 risk register (M820-06) and Tab. A.2 measure plan
 *   (M820-07) carry into 820-2 sheet 820-2-10 (same symbols, same bespoke editors → identical stored shape, json, optional there).
 * An entry is directional (from → to) and symbol-exact. It is used by:
 *   - the required-field check (A4): `scopeForInheritance(…, { ownStandardCode })` lets a `from` occurrence count for a `to` field;
 *   - the worksheet page prefill: `selectPrefillUpstreams` keeps only own-standard and `from` occurrences for a listed symbol, and
 *     the editor shows `crossStandardCarryNote` while the carried value is untouched (it can be overwritten; the first edit saves an
 *     own 820-2 value).
 * NOT used by the gate fallback (`buildStandardScopedFallback` stays own-standard): no 820-2 gate reads either symbol (checked
 * 2026-10-06), and a structured carrier is never merged across worksheets for a gate.
 * Not listed (shapes differ, audit X11 / X12): 820-1 `stakeholder_list` vs 820-2 `stakeholders_list` (different symbols; columns
 * beteiligter / kategorie / rolle / verantwortung / kommunikation vs without kategorie), 820-2 `included_hoai_phases` vs 820-3
 * `applicable_lph` (different symbols; tokens "LPH 0 – Bedarfsplanung" … vs "lph_0" …).
 */

export type CrossStandardCarry = {
  /** The symbol, identical in both standards. */
  symbol: string;
  /** Standard code the value is carried FROM. */
  from: string;
  /** Standard code the value is carried TO. */
  to: string;
  /** Sheets of `from` that hold the value (for the note). */
  fromSheets: readonly string[];
};

export const CROSS_STANDARD_CARRY: readonly CrossStandardCarry[] = [
  { symbol: 'risk_register', from: 'DWA-M-820-1', to: 'DWA-M-820-2', fromSheets: ['M820-06'] },
  { symbol: 'risk_mitigation_plan', from: 'DWA-M-820-1', to: 'DWA-M-820-2', fromSheets: ['M820-07'] },
  // Vault 51_ / 50_ PS-2 (controller decision 2026-10-07): the required 820-2-01 project size carries into the optional copies on
  // M820-01 and M8203-01 (block 20261007100000). An enum, but symbol, tokens (klein / mittel / gross) and labels are identical, so the
  // own-value rule's reason does not apply; the copy's own token check (coerceSameSymbolValue) still runs and passes.
  { symbol: 'project_size', from: 'DWA-M-820-2', to: 'DWA-M-820-1', fromSheets: ['820-2-01'] },
  { symbol: 'project_size', from: 'DWA-M-820-2', to: 'DWA-M-820-3', fromSheets: ['820-2-01'] },
];

/** True when `symbol` saved in `fromStandardCode` may count for / prefill the same symbol in `toStandardCode`. */
export function isCrossStandardCarry(symbol: string, fromStandardCode: string | null | undefined, toStandardCode: string | null | undefined): boolean {
  if (!fromStandardCode || !toStandardCode) return false;
  return CROSS_STANDARD_CARRY.some((c) => c.symbol === symbol && c.from === fromStandardCode && c.to === toStandardCode);
}

const human = (code: string) => code.replace(/^DWA-([AM])-(\d+)-(\d+)$/, 'DWA-$1 $2-$3');

/**
 * The note the editor shows under a carried value, or null when the pair is not listed. All listed carriers of the same source
 * standard are named together (the 820-1 risk analysis is one piece of work on M820-06 / M820-07).
 */
export function crossStandardCarryNote(symbol: string, fromStandardCode: string | null | undefined, toStandardCode: string | null | undefined): string | null {
  if (!isCrossStandardCarry(symbol, fromStandardCode, toStandardCode)) return null;
  const sheets = [...new Set(CROSS_STANDARD_CARRY.filter((c) => c.from === fromStandardCode && c.to === toStandardCode).flatMap((c) => c.fromSheets))];
  const src = `${human(fromStandardCode!)} (${sheets.join(' / ')})`;
  return `Übernommen aus ${src} — hier überschreibbar. [EN] taken from ${src} — can be overwritten here.`;
}

/**
 * Page prefill (worksheet page, step 2): for a listed symbol whose `to` is the page's standard, only own-standard occurrences and
 * occurrences of the listed `from` standard are candidates — a same-named value of an unrelated standard can neither replace the
 * source nor make the prefill ambiguous. Every other symbol: the list is returned unchanged (the existing same-symbol prefill).
 */
export function selectPrefillUpstreams<T extends { sourceStandardCode?: string | null; isFromCurrentStandard: boolean }>(
  symbol: string,
  ownStandardCode: string,
  upstreams: ReadonlyArray<T>,
): T[] {
  const sources = CROSS_STANDARD_CARRY.filter((c) => c.symbol === symbol && c.to === ownStandardCode).map((c) => c.from);
  if (sources.length === 0) return [...upstreams];
  return upstreams.filter((u) => u.isFromCurrentStandard || (u.sourceStandardCode != null && sources.includes(u.sourceStandardCode)));
}
