#!/usr/bin/env node
// READ-ONLY: export several standards' field sets in one go.
// Usage: node scripts/verification/export-many.mjs <outDir> CODE1 CODE2 …
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [outDir, ...codes] = process.argv.slice(2);
for (const code of codes) {
  const r = spawnSync(process.execPath, [path.join(here, 'export-fields.mjs'), code, path.join(outDir, `fields-${code}.json`)], { encoding: 'utf8' });
  console.log((r.stdout || r.stderr || '').trim());
}
