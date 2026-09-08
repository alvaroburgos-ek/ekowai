#!/usr/bin/env node
// Extracts layout-preserving text from every source PDF of the standards that have NO markdown
// transcript, so the PDF pass can verify against a byte-exact, greppable source and reuse
// spotcheck-pack.mjs unchanged.
//
// Why this is VA-grade and the markdown pass was not: these files are the text layer of the rendered
// PDF itself (SR-3 puts the PDF above any transcript). The markdown pass verified against mathpix/OCR
// conversions, which is why it was labelled VC.
//
// Usage: node scripts/verification/extract-pdftext.mjs <srcDir> <outDir>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [srcDir, outDir] = process.argv.slice(2);
if (!srcDir || !outDir) { console.error('usage: extract-pdftext.mjs <srcDir> <outDir>'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

const pdfs = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.toLowerCase().endsWith('.pdf')) pdfs.push(p);
  }
};
walk(srcDir);

const rows = [];
for (const p of pdfs) {
  const out = path.join(outDir, path.basename(p).replace(/\.pdf$/i, '.txt'));
  // -enc UTF-8 is NOT optional. Without it pdftotext emits the PDF's native encoding, and every accented
  // character lands as U+FFFD: 973 of them in ISO-5667-1 alone. A quote containing one would then never
  // be a byte-exact substring of the source, and the whole verification premise collapses silently.
  const r = spawnSync('pdftotext', ['-layout', '-enc', 'UTF-8', p, out], { encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(out)) { rows.push([0, path.basename(p), 'FAILED']); continue; }
  const text = fs.readFileSync(out, 'utf8');
  // A PDF with no text layer yields a near-empty file: that is a scan and needs OCR, not this path.
  const pages = (text.match(/\f/g) ?? []).length + 1;
  const bad = (text.match(/�/g) ?? []).length;
  const notes = [`${pages} pages`];
  if (text.length < 2000) notes.push('<-- NO TEXT LAYER (scan?)');
  if (bad) notes.push(`<-- ${bad} UNDECODABLE CHARS, do not quote from this`);
  rows.push([text.length, path.basename(p), notes.join('  ')]);
}
rows.sort((a, b) => b[0] - a[0]);
for (const [n, name, note] of rows) console.log(`${String(n).padStart(9)}  ${name}  ${note}`);
console.log(`\n${rows.length} PDFs -> ${outDir}`);
