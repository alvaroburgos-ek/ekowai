#!/usr/bin/env node
/**
 * Apply an evidence-backed `source_page` correction to reasoning-map nodes.
 *
 * NOT a bulk page-shift tool. Each node is named explicitly with its own delta, because
 * the DVS-2225-4 case showed why a blanket shift is wrong: half that document's nodes
 * verify at offset 0 and half are mis-cited by +1. A document-wide shift would have
 * broken the 17 correct nodes to fix the 17 wrong ones.
 *
 * Every correction here traces to positive evidence from verify-source-pages.mjs — the
 * node's own quote/clause token located on the corrected page — not to a derived
 * document offset.
 *
 * Usage:
 *   node apply-page-correction.mjs <map-dir> --set <file>=<newPage> [...] [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const mapDir = argv[0];
const dryRun = argv.includes('--dry-run');

const sets = [];
argv.forEach((a, i) => {
  if (a === '--set' && argv[i + 1]) {
    const [f, p] = argv[i + 1].split('=');
    sets.push({ file: f, page: p });
  }
});

if (!mapDir || sets.length === 0) {
  console.error('usage: apply-page-correction.mjs <map-dir> --set <file>=<newPage> [...] [--dry-run]');
  process.exit(2);
}

let changed = 0;
let skipped = 0;

for (const { file, page } of sets) {
  const path = join(mapDir, file);
  if (!existsSync(path)) {
    console.log(`MISSING  ${file}`);
    skipped++;
    continue;
  }
  const text = readFileSync(path, 'utf8');
  const m = text.match(/^source_page:\s*"?([^"\n]*)"?\s*$/m);
  if (!m) {
    console.log(`NO-FIELD ${file}`);
    skipped++;
    continue;
  }
  const old = m[1].trim();
  if (old === page) {
    console.log(`ALREADY  ${file}  source_page=${page}`);
    skipped++;
    continue;
  }
  const next = text.replace(/^source_page:\s*"?[^"\n]*"?\s*$/m, `source_page: "${page}"`);
  if (!dryRun) writeFileSync(path, next, 'utf8');
  console.log(`${dryRun ? 'WOULD  ' : 'UPDATED'} ${file}  ${old} -> ${page}`);
  changed++;
}

console.log(`\n${dryRun ? 'dry-run: ' : ''}${changed} corrected, ${skipped} skipped`);
