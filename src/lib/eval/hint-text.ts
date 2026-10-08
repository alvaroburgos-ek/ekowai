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

/** U-7 (UX pass 820): texts up to this length are shown whole on the form — no „mehr" toggle. */
export const HINT_SHORT_MAX = 180;
/** U-7: a sentence boundary counts only once the head has at least this many characters. */
export const HINT_MIN_HEAD = 40;

// Tokens (the word directly before a period, compared case-sensitively without that period) that are abbreviations,
// never a sentence end: German „z. B." / „u. a." / „d. h." are caught by the single-letter rule below.
const NON_TERMINAL_TOKENS = new Set([
  'Nr', 'bzw', 'ca', 'Abs', 'vgl', 'ggf', 'evtl', 'Gl', 'Tab', 'Abb', 'Kap', 'Ziff', 'inkl', 'gem', 'sog', 'Bd', 'Anh',
  'e.g', 'i.e', 'cf', 'approx', 'Eq', 'Fig', 'No', 'para',
]);
// A period after a token preceded by one of these is part of a reference („S. 44.", „§ 5. Satz", „Nr. 3."), not an end.
const REFERENCE_PREFIXES = new Set(['§', 'S.', 'Nr.', 'Abs.', 'p.', 'pp.', 'No.']);
const CLOSING_QUOTES = new Set(['“', '”', '"', '»', '«', '’']);

/**
 * U-7: split a hint into the first sentence and the rest, for the form's collapsed hint. Pure.
 *   - text ≤ HINT_SHORT_MAX characters ⇒ `{ head: text, rest: null }` (shown whole);
 *   - else the first boundary `. ` / `.“ ` / `.” ` / `.\n` (closing quote kept in the head) at which the head has at
 *     least HINT_MIN_HEAD characters and the period does not close an abbreviation (`z. B.`, `u. a.`, `S. 44`, `§ 5.`,
 *     `Nr.`, `bzw.`, `ca.`, `Abs.` …) ⇒ `{ head, rest }`;
 *   - no such boundary ⇒ `{ head: text, rest: null }`.
 * The full text is always `head + ' ' + rest` up to whitespace; PDFs / MCP read `description` directly and never call this.
 */
export function firstSentence(text: string): { head: string; rest: string | null } {
  const t = text.trim();
  if (t.length <= HINT_SHORT_MAX) return { head: t, rest: null };
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== '.') continue;
    let end = i + 1; // exclusive end of the head
    if (end < t.length && CLOSING_QUOTES.has(t[end])) end++;
    if (end >= t.length) break; // the text's own final period — nothing left to fold
    if (t[end] !== ' ' && t[end] !== '\n') continue;
    if (end < HINT_MIN_HEAD) continue;
    // the token directly before the period
    let s = i;
    while (s > 0 && !/\s/.test(t[s - 1])) s--;
    const token = t.slice(s, i).replace(/^[(„“"'»«]+/, '');
    if (/^\p{L}$/u.test(token)) continue; // single letter: z. B. / u. a. / d. h. / S.
    if (NON_TERMINAL_TOKENS.has(token)) continue;
    // the token before that one (reference prefix: „§ 5.", „S. 44.", „Nr. 3.")
    let p = s - 1;
    while (p >= 0 && /\s/.test(t[p])) p--;
    let q = p;
    while (q > 0 && !/\s/.test(t[q - 1])) q--;
    const prev = p >= 0 ? t.slice(q, p + 1) : '';
    if (REFERENCE_PREFIXES.has(prev)) continue;
    const head = t.slice(0, end).trim();
    const rest = t.slice(end).trim();
    if (!rest) break;
    return { head, rest };
  }
  return { head: t, rest: null };
}
