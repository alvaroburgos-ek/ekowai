// Load .env.local AND set BYPASS_AUTH before any other imports execute, so
// that @/env (loaded eagerly by @/lib/db, @/lib/supabase/server, etc.) sees
// the bypass flags. Mutating process.env after @/env has been imported is
// too late — env values are frozen at parse time.
//
// The user_id is sourced from the live DB so it matches a real org_members
// row. Tests will fail with a clear message if seed data is missing.
import { config } from 'dotenv';
config({ path: '.env.local' });

import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set in .env.local');

const sql = postgres(url, { prepare: false });
const rows = await sql<{ user_id: string }[]>`
  SELECT user_id FROM org_members LIMIT 1
`;
await sql.end();

if (rows.length === 0) {
  throw new Error(
    'no org_members rows found — run `pnpm tsx scripts/seed-demo.ts` first',
  );
}

process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = rows[0].user_id;
