#!/usr/bin/env node
// Applies ONE staged SQL pack to PROD inside a single transaction and prints per-statement row counts.
// Usage: node scripts/verification/apply-pack.mjs <pack.sql> [--dry-run]
// Auth: DATABASE_URL_PROD from .env.local (read at runtime, never printed).
// --dry-run executes the pack and ROLLS BACK, so you see the row counts without changing prod.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const [file, flag] = process.argv.slice(2);
if (!file) { console.error('usage: apply-pack.mjs <pack.sql> [--dry-run]'); process.exit(1); }
const dry = flag === '--dry-run';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const m = fs.readFileSync(path.join(root, '.env.local'), 'utf8').match(/^DATABASE_URL_PROD=(.+)$/m);
if (!m) { console.error('DATABASE_URL_PROD missing'); process.exit(1); }
const sql = postgres(m[1].trim().replace(/^"|"$/g, ''), { prepare: false, max: 1, ssl: 'require' });

const text = fs.readFileSync(file, 'utf8');
// statements = non-comment chunks ending in ";" (comments stripped line-wise first)
const stripped = text.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const stmts = stripped.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean);

// SAFETY (added 2026-09-07 after a real incident): a pack must NEVER carry its own transaction control.
// This runner wraps the whole file in one transaction and relies on throwing to roll back a --dry-run.
// An inline `commit;` ends that transaction early, so the remaining statements — and everything already
// executed — are committed for real and the dry run silently becomes an apply. That happened once, to
// the DWA-A-201 pack, and wrote 171 rows to prod. Refuse such a file outright, in both modes.
const offenders = stmts.filter((s) => /^\s*(begin|commit|rollback|start\s+transaction|end)\b/i.test(s));
if (offenders.length) {
  console.error(`REFUSED: ${path.basename(file)} contains ${offenders.length} transaction-control statement(s) — ` +
    `${offenders.map((s) => `"${s.split('\n')[0].slice(0, 30)}"`).join(', ')}.`);
  console.error('A pack must contain only its UPDATE/INSERT statements; this runner supplies the transaction.');
  console.error('Remove the begin/commit lines and re-run. (Inline COMMIT defeats --dry-run: see the comment above.)');
  await sql.end();
  process.exit(2);
}
console.log(`${path.basename(file)}: ${stmts.length} statements${dry ? ' (DRY RUN — will roll back)' : ''}`);

let total = 0;
try {
  await sql.begin(async (tx) => {
    for (const [i, stmt] of stmts.entries()) {
      const r = await tx.unsafe(stmt);
      const n = r.count ?? 0;
      total += n;
      const label = (stmt.match(/where id(?: in \(|=)'([0-9a-f-]{8})/i)?.[1] ?? stmt.slice(0, 40).replace(/\s+/g, ' '));
      if (n !== 1) console.log(`  [${String(i + 1).padStart(3)}] rows=${n}  ${label}${n === 0 ? '  <-- already applied or guard mismatch' : ''}`);
    }
    if (dry) throw new Error('__DRY_RUN_ROLLBACK__');
  });
  console.log(`APPLIED: ${total} rows changed across ${stmts.length} statements.`);
} catch (e) {
  if (e.message === '__DRY_RUN_ROLLBACK__') console.log(`DRY RUN complete: ${total} rows WOULD change. Nothing written.`);
  else { console.error('FAILED — transaction rolled back:', e.message.split('\n')[0]); process.exitCode = 1; }
} finally { await sql.end(); }
