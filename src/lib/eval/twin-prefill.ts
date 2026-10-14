import type { FieldValue } from '@/lib/state/worksheet-store';
import { coerceSameSymbolValue, type EnumOption } from './same-symbol-prefill';
import { mapTwinValue, twinHints, twinSourcesFor, type TwinHint } from './twin-symbols';

/** True when two same-symbol values agree (loose number equality, exact for the other types). Used to decide whether
 * auto-fill is unambiguous. (Moved from the worksheet page for C-2 so the twin step is testable; behaviour unchanged.) */
export function sameSymbolValueEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-9;
  }
  // Numeric strings from `numeric` columns come through as strings — compare by Number when both coerce cleanly.
  const na = typeof a === 'string' ? Number(a) : NaN;
  const nb = typeof b === 'string' ? Number(b) : NaN;
  if (Number.isFinite(na) && Number.isFinite(nb)) return Math.abs(na - nb) < 1e-9;
  return false;
}

type Upstream = { worksheetCode: string; value: unknown; sourceStandardCode?: string | null };

export type TwinPrefillResult = {
  /** Render-only prefill (null = none: no source value, ambiguous, unmapped or not coercible). */
  prefill: { value: FieldValue; worksheetCode: string; symbol: string; standardCode?: string } | null;
  /** „Bereits in … (als <src>)" hints for the field (null = no twin source holds a value). */
  hints: TwinHint[] | null;
};

/**
 * The worksheet page's step 2b (TWIN_SYMBOLS) for one empty field: the first source with an unambiguous value wins.
 * C-2 (ruling R-17): the source value passes the rule's value map first — an unmapped value (DWA-M 820-3 PZ 6.2-1 ←
 * `false`) prefills nothing, but its hint (without „Übernehmen", with the rule's note) is still returned so the engineer
 * sees the master answer and the choice. Rules without a map behave exactly as before.
 */
export function resolveTwinPrefill(
  standardCode: string,
  field: { symbol: string; dataType: string; enumValues?: ReadonlyArray<EnumOption> | null },
  sameSymbol: ReadonlyMap<string, ReadonlyArray<Upstream>>,
  locale: 'de' | 'en',
): TwinPrefillResult {
  let hints: TwinHint[] | null = null;
  for (const src of twinSourcesFor(standardCode, field.symbol)) {
    const ups = sameSymbol.get(src);
    if (!ups || ups.length === 0) continue;
    hints ??= twinHints(standardCode, field.symbol, src, ups, locale);
    const ambiguous = ups.length > 1 && !ups.every((u) => sameSymbolValueEqual(u.value, ups[0].value));
    if (ambiguous) continue;
    const mapped = mapTwinValue(standardCode, field.symbol, ups[0].value);
    if (!mapped.ok) continue;
    const coerced = coerceSameSymbolValue(field.dataType, mapped.value, field.enumValues ?? null);
    if (!coerced) continue;
    return {
      prefill: { value: coerced, worksheetCode: ups[0].worksheetCode, symbol: src, standardCode: ups[0].sourceStandardCode ?? undefined },
      hints: twinHints(standardCode, field.symbol, src, ups, locale),
    };
  }
  return { prefill: null, hints };
}
