#!/usr/bin/env node
// Applies every md-verification pack listed in md-packs.order.txt (one per line, in order) to PROD —
// each pack in its own transaction — skipping packs already applied (all statements return 0 rows),
// then regenerates the form guide for every standard touched.
// Usage (from projects\ekowai-wizard):  node scripts/verification/apply-all-md-packs.mjs [--dry-run]
// Auth: DATABASE_URL_PROD from .env.local (read at runtime, never printed).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const dry = process.argv.includes('--dry-run');
const m = fs.readFileSync(path.join(root, '.env.local'), 'utf8').match(/^DATABASE_URL_PROD=(.+)$/m);
if (!m) { console.error('DATABASE_URL_PROD missing'); process.exit(1); }
const sql = postgres(m[1].trim().replace(/^"|"$/g, ''), { prepare: false, max: 1, ssl: 'require' });

const order = fs.readFileSync(path.join(here, 'md-packs.order.txt'), 'utf8')
  .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const guideDir = 'C:/Users/Ekowai/Obsidian/SecondBrain/01-Projects/ekowai-wizard/form-guides';
const touched = new Set();
const summary = [];
try {
  for (const line of order) {
    const [file, code] = line.split(/\s+/);
    const p = path.join(here, file);
    if (!fs.existsSync(p)) { summary.push(`${file}: MISSING`); continue; }
    const text = fs.readFileSync(p, 'utf8').split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    const stmts = text.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean);
    // Same guard as apply-pack.mjs: inline transaction control would defeat the batch's rollback and turn
    // a --dry-run into a real apply (this bit us once, on the DWA-A-201 pack — 171 rows written to prod).
    const bad = stmts.filter((s) => /^\s*(begin|commit|rollback|start\s+transaction|end)\b/i.test(s));
    if (bad.length) { summary.push(`${file}: REFUSED — ${bad.length} transaction-control statement(s); strip begin/commit and re-run`); console.log(summary.at(-1)); continue; }
    let rows = 0, zero = 0;
    try {
      await sql.begin(async (tx) => {
        for (const s of stmts) { const r = await tx.unsafe(s); rows += r.count ?? 0; if ((r.count ?? 0) === 0) zero++; }
        if (dry) throw new Error('__DRY__');
      });
      summary.push(`${file}: APPLIED ${rows} rows (${stmts.length} stmts, ${zero} no-ops)`);
      if (code) touched.add(code);
    } catch (e) {
      if (e.message === '__DRY__') summary.push(`${file}: DRY ${rows} rows would change (${stmts.length} stmts, ${zero} no-ops)`);
      else summary.push(`${file}: FAILED, rolled back — ${e.message.split('\n')[0]}`);
    }
    console.log(summary.at(-1));
  }
} finally { await sql.end(); }

if (!dry) for (const code of touched) {
  const out = `${guideDir}/${code}.md`;
  const r = spawnSync(process.execPath, [path.join(here, 'export-form-guide.mjs'), code, out], { encoding: 'utf8' });
  console.log((r.stdout || r.stderr || '').trim());
}
console.log('\n=== SUMMARY ===\n' + summary.join('\n'));
