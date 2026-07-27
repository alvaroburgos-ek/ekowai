#!/usr/bin/env node
/**
 * Apply a .sql file to prod through the Supabase Management API.
 *
 * The repo's other appliers (apply-migration.mjs, _apply-supabase-sql.ts) both need
 * DATABASE_URL, and the DB password is not in the repo. The documented fallback in
 * CLAUDE.md is the Management API — but it existed only as prose, so every use was
 * hand-rolled. This makes it a script, which is the point: an applied migration must
 * be re-executable by command (R-1), not reconstructed from a chat transcript.
 *
 * The file is streamed file -> API. It is never echoed, and the PAT is read from the
 * environment and never printed (not even truncated).
 *
 * Usage:
 *   node scripts/apply-sql-mgmt-api.mjs <file.sql> [--ref <project-ref>] [--dry-run]
 */
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--'));
const flag = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : d;
};
const ref = flag('--ref', 'vadsmshzebefjreqcicl');
const dryRun = argv.includes('--dry-run');

if (!file) {
  console.error('usage: apply-sql-mgmt-api.mjs <file.sql> [--ref <ref>] [--dry-run]');
  process.exit(2);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN not set — cannot reach the Management API.');
  process.exit(2);
}

const query = readFileSync(file, 'utf8');
console.log(`file    : ${file}`);
console.log(`bytes   : ${query.length}`);
console.log(`project : ${ref}`);

if (dryRun) {
  console.log('DRY RUN — not sent.');
  process.exit(0);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
});

const body = await res.text();
if (!res.ok) {
  // Print the server's error, which is about the SQL — it contains no credentials.
  console.error(`HTTP ${res.status}`);
  console.error(body.slice(0, 2000));
  process.exit(1);
}
console.log(`HTTP ${res.status} OK`);
console.log(body.slice(0, 1000));
