#!/usr/bin/env node
// READ-ONLY prod query runner for audits.
// Usage: node scripts/verification/prod-query.mjs <file.sql>   (or: --sql "select …")
// Auth: DATABASE_URL_PROD from .env.local, read at runtime, NEVER printed.
// Safety: every statement runs inside a READ ONLY transaction on a session with
//         default_transaction_read_only=on — any write is rejected by Postgres itself.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const envText = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
const m = envText.match(/^DATABASE_URL_PROD=(.+)$/m);
if (!m) {
  console.error('DATABASE_URL_PROD not found in .env.local');
  process.exit(1);
}
const url = m[1].trim().replace(/^"|"$/g, '');

const args = process.argv.slice(2);
let sqlText;
if (args[0] === '--sql') sqlText = args.slice(1).join(' ');
else if (args[0]) sqlText = fs.readFileSync(args[0], 'utf8');
else {
  console.error('usage: prod-query.mjs <file.sql> | --sql "<query>"');
  process.exit(1);
}

const sql = postgres(url, {
  prepare: false,
  max: 1,
  ssl: 'require',
  connection: { default_transaction_read_only: 'on', statement_timeout: '60000' },
});
const cell = (v) =>
  v == null ? null : typeof v === 'object' ? JSON.stringify(v).slice(0, 120) : String(v).slice(0, 120);
try {
  const stmts = sqlText
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.replace(/^\s*--[^\n]*\n/gm, '').trim())
    .filter(Boolean);
  for (const stmt of stmts) {
    const label = stmt.split('\n')[0].slice(0, 100);
    let rows;
    try {
      rows = await sql.begin('read only', async (tx) => tx.unsafe(stmt));
    } catch (e) {
      console.log(`\n=== ${label} -> ERROR: ${(e.message || String(e)).split('\n')[0]}`);
      continue;
    }
    console.log(`\n=== ${label} (${rows.length} rows) ===`);
    if (rows.length)
      console.table(rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, cell(v)]))));
  }
} finally {
  await sql.end();
}
