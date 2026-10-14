/**
 * O-5 (UX follow-up 2026-10-14): the "Bereits in …" hint groups its source sheets by DISPLAYED value, so an identical
 * value carried by several sheets is shown once („Bereits in M8203-01, M820-01: PLT-HS-01"), while different values
 * stay listed, each with the sheets that hold it („Bereits in A: 1; B: 2"). Groups keep first-seen order.
 */
/** C-2: `applicable: false` = shown for information only (a twin source value without a mapping) — no „Übernehmen"; `note` explains the choice. */
export type SameSymbolHint = { worksheetCode: string; value: unknown; viaSymbol?: string; applicable?: false; note?: string };
export type SameSymbolHintGroup = { sheets: string[]; value: string };

export function groupSameSymbolHints(
  hints: readonly SameSymbolHint[],
  format: (v: unknown) => string,
  locale: 'de' | 'en',
): SameSymbolHintGroup[] {
  const alias = locale === 'en' ? 'as' : 'als';
  const groups: SameSymbolHintGroup[] = [];
  const byValue = new Map<string, SameSymbolHintGroup>();
  for (const h of hints) {
    const value = format(h.value);
    const sheet = h.viaSymbol ? `${h.worksheetCode} (${alias} ${h.viaSymbol})` : h.worksheetCode;
    let g = byValue.get(value);
    if (!g) {
      g = { sheets: [], value };
      byValue.set(value, g);
      groups.push(g);
    }
    g.sheets.push(sheet);
  }
  return groups;
}

/** C-2 fix L-3: the „Alle Vorbefüllungen übernehmen" bar is offered only when prefills exist AND the sheet is editable. */
export function offerAcceptAllPrefills(prefillCount: number, locked: boolean): boolean {
  return prefillCount > 0 && !locked;
}
