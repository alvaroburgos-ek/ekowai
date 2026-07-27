#!/usr/bin/env node
/**
 * MAP WRITE-BACK — update reasoning-map nodes to mirror a fix that landed in prod.
 *
 * Implements the standing MAP WRITE-BACK RULE (CLAUDE.md): a fix without its map
 * write-back is incomplete work. The map is the single truthful mirror — a reader of a
 * node must see what the standard says, what the encoding does, what was broken, what
 * fixed it, and when, without opening any other artifact.
 *
 * Per node it:
 *   - lifts `provenance` to VA **only when the fix earned it** (a PDF page now backs the
 *     node). A grade is never lifted merely because a row was touched — see --lift.
 *   - stamps `provenance_date` and `verification_method: re-executed`
 *   - sets `source_page` from the migration's own anchor when one is supplied
 *   - appends a `fixed::` entry (date · defect class · migration/commit · what changed)
 *
 * Idempotent: a node that already carries a `fixed::` line for the same migration id is
 * left alone, so re-running after a partial sweep is safe.
 *
 * Input: JSON array on stdin or --file, entries:
 *   { "map": "VDI-3814-Blatt-2-1", "cr": "VDI-3814-2-1-CR-28", "page": 6,
 *     "defect_class": "rule-10a evidence-free stub", "ref": "225b005 / 20260727120000",
 *     "what": "source_quote backfilled PDF-verbatim", "lift": true }
 *
 * Usage: node map-write-back.mjs --file fixes.json [--root <maps dir>] [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const flag = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : d;
};
const dryRun = argv.includes('--dry-run');
const ROOT = flag(
  '--root',
  'C:/Users/Ekowai/Obsidian/SecondBrain/01-Projects/ekowai-wizard/reasoning-maps',
);
const file = flag('--file', null);
if (!file) {
  console.error('usage: map-write-back.mjs --file <fixes.json> [--root <dir>] [--dry-run]');
  process.exit(2);
}

// Strip a UTF-8 BOM: PowerShell's `>` redirect writes one, and JSON.parse rejects it.
const fixes = JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, ''));

// Index every map dir once: CR code -> node path. The code appears in the node title/H1
// (naming conventions differ per map: cr-vdi-NN, cr-hoai-NN, cr-req-NN …), so match on
// the code itself rather than on any filename pattern.
const index = new Map();
function indexMap(mapName) {
  if (index.has(mapName)) return index.get(mapName);
  const dir = join(ROOT, mapName);
  const byCode = new Map();
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
      const text = readFileSync(join(dir, f), 'utf8');
      const head = text.slice(0, 1200);
      // capture CR-ish codes appearing in frontmatter title or the first heading
      for (const m of head.matchAll(/\b([A-Z0-9][A-Za-z0-9-]*(?:CR|REQ)-[0-9]+[a-z]?)\b/g)) {
        if (!byCode.has(m[1])) byCode.set(m[1], join(dir, f));
      }
    }
  }
  index.set(mapName, byCode);
  return byCode;
}

let updated = 0, skipped = 0, missing = 0;
const notFound = [];

for (const fx of fixes) {
  const byCode = indexMap(fx.map);
  const path = byCode.get(fx.cr);
  if (!path) {
    notFound.push(`${fx.map}/${fx.cr}`);
    missing++;
    continue;
  }
  let text = readFileSync(path, 'utf8');

  // Idempotency guard. NOTE: this must match the shape actually WRITTEN below
  // (`fixed::` · date · class · `ref` — the ref is backticked and not adjacent to the
  // marker). A first version guarded on `fixed:: <ref>`, never matched, and silently
  // appended a duplicate entry on every re-run — caught only by re-running and reading
  // the node, not by any exit code.
  const alreadyStamped = text
    .split(/\r?\n/)
    .some((l) => l.includes('`fixed::`') && l.includes(`\`${fx.ref}\``));
  if (alreadyStamped) {
    skipped++;
    continue;
  }

  const fmEnd = text.indexOf('\n---', 4);
  if (fmEnd < 0) {
    notFound.push(`${fx.map}/${fx.cr} (no frontmatter)`);
    missing++;
    continue;
  }
  let fm = text.slice(0, fmEnd);
  const body = text.slice(fmEnd);

  const setKey = (block, key, val) =>
    new RegExp(`^${key}:.*$`, 'm').test(block)
      ? block.replace(new RegExp(`^${key}:.*$`, 'm'), `${key}: ${val}`)
      : `${block}\n${key}: ${val}`;

  // Provenance is lifted ONLY when the fix earned it (evidence now backs the node).
  if (fx.lift) {
    fm = setKey(fm, 'provenance', 'VA');
    fm = setKey(fm, 'provenance_date', fx.date || '2026-07-27');
  }
  fm = setKey(fm, 'verification_method', 're-executed');
  if (fx.page) fm = setKey(fm, 'source_page', `"${fx.page}"`);

  const entry =
    `\n- \`fixed::\` ${fx.date || '2026-07-27'} · **${fx.defect_class}** · \`${fx.ref}\` — ${fx.what}\n`;

  // Append the fixed:: entry under a stable heading so repeated waves accumulate.
  let newBody;
  if (body.includes('### Fix history')) {
    newBody = body.replace('### Fix history\n', `### Fix history\n${entry.trimStart()}`);
  } else {
    newBody = `${body.trimEnd()}\n\n### Fix history\n${entry.trimStart()}`;
  }

  if (!dryRun) writeFileSync(path, fm + newBody, 'utf8');
  updated++;
}

console.log(`${dryRun ? 'DRY RUN — ' : ''}updated ${updated}, already-stamped ${skipped}, no-node ${missing}`);
if (notFound.length) {
  console.log('\nNO MAP NODE (reported, never silently dropped):');
  for (const n of notFound.slice(0, 40)) console.log('  ' + n);
  if (notFound.length > 40) console.log(`  … +${notFound.length - 40} more`);
}
