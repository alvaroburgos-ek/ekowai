#!/usr/bin/env node
// OCRs a scanned PDF into a page-delimited text file, for the standards whose PDF has no
// text layer at all (pdftotext returns ~40 bytes for a 38-page document).
//
// WHY THIS IS A LOWER-GRADE SOURCE, AND MUST BE LABELLED AS ONE. Everything else in this
// campaign verified against a text layer the publisher embedded. OCR output is a *reading*
// of an image, so a quote taken from it is evidence that the OCR read those words, not that
// the page prints them. Two consequences, both non-negotiable:
//   1. Rows verified from OCR must say so in their note, and must not claim the same grade
//      as a text-layer or PDF read.
//   2. Any load-bearing value — a limit, a unit, a formula — must be confirmed against the
//      rendered page image before it is quoted. OCR reliably mangles exactly those:
//      digits, sub/superscripts, ± and ≤, and table alignment.
//
// Usage: node scripts/verification/ocr-pdf.mjs <in.pdf> <out.txt> [lang] [dpi]
//   lang: tesseract language, default 'eng'. 'spa' for Spanish, 'deu' for German,
//         'eng+spa' to combine. A wrong language silently degrades accuracy.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [pdf, out, lang = 'eng', dpiArg = '300'] = process.argv.slice(2);
if (!pdf || !out) {
  console.error('usage: ocr-pdf.mjs <in.pdf> <out.txt> [lang] [dpi]');
  process.exit(1);
}
if (!fs.existsSync(pdf)) { console.error(`no such pdf: ${pdf}`); process.exit(1); }

const dpi = String(parseInt(dpiArg, 10) || 300);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-'));

try {
  // 1. rasterise. -gray keeps the files small and helps tesseract on scanned text.
  const rast = spawnSync('pdftoppm', ['-r', dpi, '-gray', '-png', pdf, path.join(tmp, 'p')], {
    encoding: 'utf8',
  });
  if (rast.status !== 0) {
    console.error('pdftoppm failed:', (rast.stderr || '').split('\n')[0]);
    process.exit(2);
  }
  const pages = fs.readdirSync(tmp).filter((f) => f.endsWith('.png')).sort();
  if (!pages.length) { console.error('no pages rasterised'); process.exit(2); }

  // 2. OCR each page separately so page boundaries survive as form feeds — the page
  //    convention every pack header states depends on them.
  const chunks = [];
  for (const [i, p] of pages.entries()) {
    const base = path.join(tmp, `t${i}`);
    const r = spawnSync('tesseract', [path.join(tmp, p), base, '-l', lang, '--psm', '1'], {
      encoding: 'utf8',
    });
    if (r.status !== 0) {
      console.error(`tesseract failed on page ${i + 1}:`, (r.stderr || '').split('\n')[0]);
      process.exit(2);
    }
    chunks.push(fs.readFileSync(`${base}.txt`, 'utf8').replace(/\s+$/, ''));
    process.stderr.write(`\rOCR ${i + 1}/${pages.length}`);
  }
  process.stderr.write('\n');

  const text = chunks.join('\n\f\n');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text, 'utf8');

  // 3. Report enough for the operator to judge the read before trusting it.
  const words = (text.match(/[A-Za-zÀ-ÿ]{2,}/g) ?? []).length;
  const digits = (text.match(/\d/g) ?? []).length;
  const bad = (text.match(/�/g) ?? []).length;
  console.log(`${pages.length} pages -> ${out}`);
  console.log(`  ${text.length} chars, ~${words} words, ${digits} digits, ${bad} undecodable`);
  console.log(`  lang=${lang} dpi=${dpi}`);
  if (words < pages.length * 40) {
    console.log('  WARNING: very low word count per page — check the language and that the scan is legible.');
  }
  console.log('  REMINDER: OCR text is a reading of an image. Confirm every limit, unit and');
  console.log('  formula against the rendered page before quoting it, and label rows accordingly.');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
