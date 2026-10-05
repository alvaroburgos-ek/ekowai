/**
 * Bilingual hint texts in ONE column (fields.description / equations.description).
 *
 * Convention (hint wave 2026-10-05): the German hint comes first, the English hint follows on
 * its own line introduced by the marker `[EN] `. Example:
 *   "Bemessungsrelevante Infiltrationsrate … (Gl. 5).\n[EN] Design infiltration rate … (Eq. 5)."
 * A description without the marker is shown unchanged in both locales (legacy rows). Keeping both
 * languages in the existing column needs no schema change and leaves every other reader (MCP
 * get_worksheet, reports) working; those readers may pick a locale with `hintText` too.
 */
export const HINT_EN_MARKER = '[EN] ';

export function splitHint(description: string | null | undefined): { de: string | null; en: string | null } {
  if (description == null) return { de: null, en: null };
  const text = String(description);
  const idx = text.indexOf('\n' + HINT_EN_MARKER);
  if (idx < 0) {
    // marker at the very start (no German part) or absent
    if (text.startsWith(HINT_EN_MARKER)) return { de: null, en: text.slice(HINT_EN_MARKER.length).trim() || null };
    const t = text.trim();
    return { de: t || null, en: null };
  }
  const de = text.slice(0, idx).trim();
  const en = text.slice(idx + 1 + HINT_EN_MARKER.length).trim();
  return { de: de || null, en: en || null };
}

/** The hint for a locale: the locale's part when present, else the other language, else null. */
export function hintText(description: string | null | undefined, locale: 'de' | 'en'): string | null {
  const { de, en } = splitHint(description);
  return locale === 'en' ? (en ?? de) : (de ?? en);
}

/** Compose the stored form from the two languages (used by the hint migration generator). */
export function composeHint(de: string | null | undefined, en: string | null | undefined): string | null {
  const d = de?.trim() || null;
  const e = en?.trim() || null;
  if (!d && !e) return null;
  if (!e) return d;
  if (!d) return HINT_EN_MARKER + e;
  return `${d}\n${HINT_EN_MARKER}${e}`;
}
