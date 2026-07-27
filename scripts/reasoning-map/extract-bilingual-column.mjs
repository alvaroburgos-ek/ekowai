#!/usr/bin/env node
/**
 * Extract ONE language column from a two-column bilingual `pdftotext -layout` dump.
 *
 * Built for VDI 3814 Blatt 2.1 (German left / English right on every page), but the
 * column detection is geometric, not standard-specific.
 *
 * Why this exists: quote-backfill under SR-1 needs the *printed German sentence*,
 * verbatim. A naive `-layout` dump interleaves both languages on every physical line,
 * so a grep-and-paste would splice German and English into one fake "quote". That is
 * exactly the fabrication class rule 10 was written to catch — so the extractor has to
 * be deterministic and re-runnable, not hand-eyeballed.
 *
 * Method
 *  1. Split into pages on \f.
 *  2. Per page, split each line into runs separated by 3+ spaces, keeping start columns.
 *  3. Histogram the run start columns; the two dominant clusters are the two columns.
 *  4. Assign each run to the nearer cluster; emit the requested side in reading order.
 *  5. De-hyphenate: a line ending in "-" joins the next line without a space.
 *
 * Usage:
 *   node extract-bilingual-column.mjs <dump.txt> --page <n> [--side left|right]
 *   node extract-bilingual-column.mjs <dump.txt> --pages 4-34 --side left --out <file>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const file = args[0];
const val = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : d;
};
const side = val('--side', 'left');
const out = val('--out', null);

if (!file) {
  console.error('usage: extract-bilingual-column.mjs <dump.txt> --page N | --pages A-B [--side left|right] [--out f]');
  process.exit(2);
}

const pages = readFileSync(file, 'utf8').split('\f');

let range;
if (val('--page', null)) {
  const n = Number(val('--page'));
  range = [n, n];
} else {
  const [a, b] = (val('--pages', `1-${pages.length}`)).split('-').map(Number);
  range = [a, b];
}

// A run = contiguous text separated from its neighbours by >= 3 spaces.
function runsOf(line) {
  const res = [];
  const re = /\S(?:.*?\S)?(?=\s{3,}|$)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    if (m[0].trim()) res.push({ col: m.index, text: m[0].trim() });
    if (re.lastIndex === m.index) re.lastIndex++;
  }
  return res;
}

// Drop the Beuth licence watermark and running headers/footers — they are not
// clause text and would otherwise pollute a quote.
const NOISE = [
  /Externe elektronische Auslegestelle/i,
  /Normen-Download-Beuth/i, // Beuth per-licensee watermark, one line per page
  /Von der DWA lizenziert für/i, // DWA per-licensee watermark
  /^\s*\d{1,3}\s+DWA-Regelwerk\s|^\s*\w+\s+\d{4}\s+DWA-Regelwerk\s/i, // DWA running footer
  /-KdNr\.\d+-ID\./i, // same watermark, alternate rendering
  /Alle Rechte vorbehalten/i,
  /^VDI \d+ Blatt/i,
  /^\s*[–-]\s*\d+\s*[–-]\s*$/,
];
const isNoise = (t) => NOISE.some((r) => r.test(t));

function extractPage(pageText) {
  const lines = pageText.split(/\r?\n/);
  const all = lines.map(runsOf);

  // Histogram of start columns across the page (2-col tolerance bucket).
  const hist = new Map();
  for (const rs of all)
    for (const r of rs) {
      if (isNoise(r.text)) continue;
      const b = Math.round(r.col / 2) * 2;
      hist.set(b, (hist.get(b) || 0) + 1);
    }
  if (hist.size === 0) return '';

  // Two dominant clusters = the two language columns.
  const sorted = [...hist.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const c1 = sorted[0];
  const c2 = sorted.find((c) => Math.abs(c - c1) > 20);
  const cols = c2 == null ? [c1] : [Math.min(c1, c2), Math.max(c1, c2)];
  const want = side === 'left' ? cols[0] : (cols[1] ?? cols[0]);
  const other = side === 'left' ? (cols[1] ?? Infinity) : cols[0];

  const picked = [];
  for (const rs of all) {
    for (const r of rs) {
      if (isNoise(r.text)) continue;
      const dWant = Math.abs(r.col - want);
      const dOther = Math.abs(r.col - other);
      if (dWant <= dOther) picked.push(r.text);
    }
  }

  // De-hyphenate across line breaks, otherwise join with a space.
  let buf = '';
  for (const t of picked) {
    if (buf.endsWith('-') && !/[.:;]$/.test(buf)) buf = buf.slice(0, -1) + t;
    else buf = buf ? `${buf} ${t}` : t;
  }
  return buf.replace(/\s+/g, ' ').trim();
}

const chunks = [];
for (let p = range[0]; p <= range[1] && p <= pages.length; p++) {
  const text = extractPage(pages[p - 1] || '');
  chunks.push(`\n===== PDF PAGE ${p} =====\n${text}`);
}
const result = chunks.join('\n');
if (out) {
  writeFileSync(out, result, 'utf8');
  console.log(`wrote ${out} (${result.length} chars, pages ${range[0]}-${range[1]}, side=${side})`);
} else {
  console.log(result);
}
