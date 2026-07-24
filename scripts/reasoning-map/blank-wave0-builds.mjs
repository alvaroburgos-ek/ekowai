#!/usr/bin/env node
/**
 * blank-wave0-builds.mjs — Wave-0 flywheel fix #1.
 *
 * Wave-0 PDF-VA nodes should carry `provenance_build: ""` (the 2b check exempts
 * empty; VA is justified by source_page). Some carry non-commit placeholder
 * strings (`read-only-wave0`, `read-only-generated`, `pdftotext …`, etc.), which
 * the 2b.va-build-resolves check flags as non-resolvable builds.
 *
 * This pass blanks every `provenance_build` value that is NOT a resolvable git
 * commit short-hash, on the Wave-0 maps ONLY. The 6 pre-Wave-0 maps carry REAL
 * git-commit builds and are skipped entirely.
 *
 * Usage: node scripts/reasoning-map/blank-wave0-builds.mjs [--dry-run] [--maps <dir>]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const mapsDir =
  (argv.indexOf('--maps') >= 0 ? argv[argv.indexOf('--maps') + 1] : undefined) ||
  'C:/Users/Ekowai/Obsidian/SecondBrain/01-Projects/ekowai-wizard/reasoning-maps';

// The 6 pre-Wave-0 maps carry real git-commit builds — never touch them.
const PRE_WAVE0 = new Set([
  'DWA-A-138-1',
  'FLL-GAR-2023',
  'FLL-Naturteich-2017',
  'FLL-TP-RHIZOM-2023',
  'DIN-18130-1',
  'DWA-A-102-2',
]);

// Resolvable git commits (short + full-truncated) — the un-poisonable anchor.
const KNOWN = new Set();
try {
  const out = execFileSync('git', ['-C', repoRoot, 'log', '--all', '--format=%h %H'], {
    encoding: 'utf8',
  });
  for (const line of out.split(/\r?\n/)) {
    const [short, full] = line.trim().split(/\s+/);
    if (short) KNOWN.add(short);
    if (full) KNOWN.add(full.slice(0, 7));
  }
} catch (e) {
  console.error('git log failed — aborting so we do not blank real builds blind.');
  process.exit(2);
}

let filesChanged = 0;
let valuesBlanked = 0;
const sample = [];

for (const std of readdirSync(mapsDir, { withFileTypes: true })) {
  if (!std.isDirectory()) continue;
  if (std.name.startsWith('.') || std.name.startsWith('_')) continue;
  if (PRE_WAVE0.has(std.name)) continue; // pre-Wave-0: real builds, skip

  const dir = join(mapsDir, std.name);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const path = join(dir, f);
    const text = readFileSync(path, 'utf8');
    // Only touch the frontmatter provenance_build line.
    const m = text.match(/^(provenance_build:)([ \t]*)(.*)$/m);
    if (!m) continue;
    const rawVal = m[3].trim().replace(/^["']|["']$/g, '');
    if (!rawVal) continue; // already blank
    if (KNOWN.has(rawVal.slice(0, 7)) && /^[0-9a-f]{7,40}$/.test(rawVal)) continue; // real commit
    // non-commit placeholder → blank to empty
    const replaced = text.replace(/^(provenance_build:)[ \t]*.*$/m, '$1 ""');
    if (replaced !== text) {
      valuesBlanked++;
      if (!dryRun) writeFileSync(path, replaced);
      if (sample.length < 12) sample.push(`${std.name}/${f}: [${rawVal}] -> ""`);
    }
    filesChanged++;
  }
}

console.log(`${dryRun ? '[DRY-RUN] ' : ''}blanked ${valuesBlanked} non-commit provenance_build values across ${filesChanged} files (Wave-0 maps only).`);
for (const s of sample) console.log('  ' + s);
