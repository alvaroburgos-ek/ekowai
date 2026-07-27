#!/usr/bin/env node
/**
 * Print the text of a numbered clause from a flattened standard body, from its
 * heading up to the next heading of the same-or-shallower depth.
 *
 * Used for SR-1 quote capture: the operator reads the printed clause here and
 * lifts the normative sentence verbatim. Deliberately does NOT pick the sentence
 * itself — choosing which sentence carries the mandate is a human/audit judgement,
 * and a script that guessed would be manufacturing evidence.
 *
 * Usage:
 *   node clause-slice.mjs <body.txt> <clause> [<clause> ...] [--chars N]
 *   node clause-slice.mjs body.txt 6.2 8.13 --chars 700
 */
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const file = argv[0];
const chars = (() => {
  const i = argv.indexOf('--chars');
  return i >= 0 ? Number(argv[i + 1]) : 600;
})();
// Exclude flag VALUES — otherwise `--chars 460` is picked up as clause "460"
// and prints a spurious NOT-FOUND block.
const flagValueIdx = new Set();
argv.forEach((a, i) => {
  if (a.startsWith('--')) flagValueIdx.add(i + 1);
});
const clauses = argv
  .slice(1)
  .filter((a, i) => !flagValueIdx.has(i + 1) && /^[0-9]+[a-z]?(\.[0-9]+)*$/.test(a));

if (!file || clauses.length === 0) {
  console.error('usage: clause-slice.mjs <body.txt> <clause> [clause ...] [--chars N]');
  process.exit(2);
}

const text = readFileSync(file, 'utf8').replace(/\s+/g, ' ');

// Two heading dialects:
//   'clause' (default) — "6.3.1 Projektbezeichnung"  (VDI/DIN/DWA technical standards)
//   'para'             — "§ 34 Leistungsbild Gebäude" (German legal ordinances, e.g. HOAI)
const style = (() => {
  const i = argv.indexOf('--style');
  return i >= 0 ? argv[i + 1] : 'clause';
})();

function headingRe(clause) {
  const esc = clause.replace(/\./g, '\\.');
  return style === 'para'
    ? new RegExp('§\\s*' + esc + '\\s+[A-ZÄÖÜ]', 'g')
    : new RegExp('(?:^|\\s)' + esc + '\\s+[A-ZÄÖÜ]', 'g');
}

// In a legal text, "§ 4 …" is far more often a CROSS-REFERENCE ("§ 4 Absatz 1 Satz 3")
// than the heading of § 4. Taking the first match therefore quotes the wrong paragraph —
// and the result looks entirely plausible, which is what makes it dangerous. A reference
// is followed by a structural word; a heading is followed by the paragraph's title.
const XREF_NEXT_WORD =
  /^(Absatz|Abs|Satz|Halbsatz|Nummer|Nr|Buchstabe|bis|und|oder|sowie|in|des|der|dieser|genannten|entsprechend|gilt|bleibt|findet)\b/i;

// A heading is "<number> <Capital…>" — the flattened body has no line structure left,
// so the number+capital pair is the only reliable marker.
function headingIndex(clause) {
  const hits = [...text.matchAll(headingRe(clause))];
  const kept = hits.filter((h) => {
    if (style !== 'para') return true;
    // text immediately after "§ N "
    const after = text.slice(h.index + h[0].length - 1, h.index + h[0].length + 40);
    return !XREF_NEXT_WORD.test(after.trim());
  });
  return kept.map((h) => h.index);
}

// A number+Capital pair is NOT a heading when it is a standard designator:
// "VDI 3814 Blatt", "DIN EN 15232 zur", "ISO 16484-3 oder". Without this guard the
// slice terminates at the first cross-reference and silently truncates the quote —
// which would produce a short, real-looking, WRONG quote. Exactly the failure mode
// this backfill exists to remove, so it is guarded rather than eyeballed.
const DESIGNATOR = /(VDI|DIN|EN|ISO|IEC|VDMA|DWA|ATV|BS|NF|prEN|Blatt|Part|Teil|Abschnitt|Bild|Tabelle|Nr)\.?\s*$/i;

// Clause numbers in these documents are small; a 4-digit "number" is a standard id.
// Legal ordinances run higher (HOAI reaches § 58) and use letter suffixes (§ 2a).
const plausibleClause = (c) => {
  const n = parseInt(c.split('.')[0], 10);
  return Number.isFinite(n) && n <= (style === 'para' ? 200 : 20);
};

// Next heading at same-or-shallower depth => end of this clause.
function endIndex(clause, from) {
  const depth = clause.split('.').length;
  const re =
    style === 'para'
      ? /§\s*(\d+[a-z]?)\s+[A-ZÄÖÜ]/g
      : /(?:^|\s)(\d+(?:\.\d+)*)\s+[A-ZÄÖÜ]/g;
  re.lastIndex = from + 1;
  let m;
  while ((m = re.exec(text)) !== null) {
    const c = m[1];
    if (c === clause) continue;
    if (!plausibleClause(c)) continue;
    if (DESIGNATOR.test(text.slice(Math.max(0, m.index - 12), m.index + 1))) continue;
    // Same cross-reference guard as headingIndex — otherwise a slice ends at the first
    // "§ 34 Absatz 3" mentioned inside the paragraph and truncates the quote mid-sentence.
    if (style === 'para' && XREF_NEXT_WORD.test(text.slice(m.index + m[0].length - 1, m.index + m[0].length + 40).trim()))
      continue;
    if (c.split('.').length <= depth) return m.index;
  }
  return Math.min(text.length, from + chars * 4);
}

for (const clause of clauses) {
  const idxs = headingIndex(clause);
  console.log(`\n========== §${clause} ==========`);
  if (idxs.length === 0) {
    console.log('!! HEADING NOT FOUND — do not quote this clause from memory (R-5).');
    continue;
  }
  if (idxs.length > 1) console.log(`(note: ${idxs.length} heading matches; showing the first)`);
  const start = idxs[0];
  // Page the clause heading actually sits on, taken from the extractor's own page
  // markers — so the page in a quote's provenance is derived here, never inherited
  // from a prior session's offset claim (R-2).
  const before = text.slice(0, start);
  const pm = [...before.matchAll(/===== PDF PAGE (\d+) =====/g)];
  console.log(`[PDF page ${pm.length ? pm[pm.length - 1][1] : '?'}]`);
  const end = endIndex(clause, start);
  console.log(text.slice(start, Math.min(end, start + chars)).trim());
}
