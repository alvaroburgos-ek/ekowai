#!/usr/bin/env node
// Apply a .sql file to a Supabase project via the Management API
// (POST /v1/projects/<ref>/database/query). Target ref is EXPLICIT (argv) so
// there is no ambiguity with .env.local's DATABASE_URL (which may point at a
// local dev DB). Token comes from $SUPABASE_ACCESS_TOKEN — never printed.
//
// Usage: node scripts/phase4/_mgmt-apply.mjs <projectRef> <path/to/file.sql>
import { readFileSync } from 'node:fs';

const [, , ref, file] = process.argv;
if (!ref || !file) {
  console.error('Usage: node _mgmt-apply.mjs <projectRef> <file.sql>');
  process.exit(2);
}
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(2); }

const query = readFileSync(file, 'utf8');
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
});
const text = await res.text();
console.log(`HTTP ${res.status}`);
console.log(text.slice(0, 4000));
process.exit(res.ok ? 0 : 1);
