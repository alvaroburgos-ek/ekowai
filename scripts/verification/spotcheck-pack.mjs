#!/usr/bin/env node
// Orchestrator spot-check: samples N evenly-spaced verification_quote values from a pack and scores how
// verbatim each is against the markdown transcript. The md carries line-break hyphenation ("behav-\niour"),
// escaped punctuation and table cells split across lines, so the check works on a dehyphenated,
// whitespace-collapsed text and scores 6-word windows (a quote passes at ≥ 0.85 of its windows found).
// Usage: node scripts/verification/spotcheck-pack.mjs <pack.sql> <transcript.md> [n=10] [--all]
import fs from 'node:fs';
const [pack, md, nArg, flag] = process.argv.slice(2);
const n = Number(nArg ?? 10);
const all = flag === '--all' || nArg === '--all';
const norm = (s) => s
  .replace(/\\/g, '')                              // md escapes (\= \- \[ …)
  .replace(/^\s*(?:[•·▪●\-*]|\d{1,3})\s*$/gm, '')  // bullet-only / page-number-only lines
  .replace(/^\s*[•·▪●]\s*/gm, '')                  // leading bullets
  .replace(/(\w)[-‐‑]\s*\n\s*(\w)/g, '$1$2')       // dehyphenate line breaks
  .replace(/\s+/g, ' ')
  .replace(/[„“”"]/g, '"').replace(/[‘’´`]/g, "'").replace(/­/g, '')
  .replace(/\s*[–—-]\s*/g, ' - ')                  // unify dashes
  .replace(/[;:,()]/g, ' ')                        // punctuation the encoder may join/split differently
  .replace(/\s+/g, ' ').toLowerCase().trim();
const text = norm(fs.readFileSync(md, 'utf8'));
const sql = fs.readFileSync(pack, 'utf8');
const quotes = [...sql.matchAll(/verification_quote='((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"));
const pick = all || quotes.length <= n ? quotes : Array.from({ length: n }, (_, i) => quotes[Math.floor((i + 0.5) * quotes.length / n)]);
const W = 6;
let pass = 0; const results = [];
for (const q of pick) {
  const body = q.replace(/ [—-] printed p\.[^|]*/gi, '');
  // Fragments = runs the encoder joined with " | " / "[...]" / " — " — windows never straddle a join.
  const frags = body.split(/\s\|\s|\[\.\.\.\]|\s—\s/).map((f) => norm(f).split(' ').filter((w) => w.length > 0)).filter((f) => f.length >= 3);
  // Prose windows decide the verdict; windows containing digits are reported separately because the
  // md splits units/superscripts across lines ("m2\n\n/m3") and that is formatting, not fabrication.
  let found = 0, total = 0, numFound = 0, numTotal = 0;
  const words = frags.flat();
  for (const fw of frags) {
    if (fw.length < W) { const win = fw.join(' '); if (/\d/.test(win)) { numTotal++; if (text.includes(win)) numFound++; } else { total++; if (text.includes(win)) found++; } continue; }
    for (let i = 0; i + W <= fw.length; i++) {
      const win = fw.slice(i, i + W).join(' ');
      if (/\d/.test(win)) { numTotal++; if (text.includes(win)) numFound++; continue; }
      total++; if (text.includes(win)) found++;
    }
  }
  const ratio = total === 0
    ? (numTotal > 0 ? numFound / numTotal : (words.length >= 3 && text.includes(words.join(' ')) ? 1 : 0))
    : found / total;
  const ok = ratio >= 0.85;
  pass += ok ? 1 : 0;
  results.push({ ok, ratio, q });
  if (!ok || !all) console.log(`${ok ? 'OK  ' : 'LOW '} ${(ratio * 100).toFixed(0).padStart(3)}% | ${q.slice(0, 100)}…`);
}
console.log(`\n${pass}/${pick.length} sampled quotes ≥85% verbatim in ${md.split(/[\\/]/).pop()} (${quotes.length} quotes in pack; mean ${(results.reduce((a, r) => a + r.ratio, 0) / results.length * 100).toFixed(0)}%)`);
process.exitCode = pass === pick.length ? 0 : 1;
