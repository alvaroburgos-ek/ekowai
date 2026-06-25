/**
 * Safety-guarded local migration helper.
 * Reads DATABASE_URL from .env.local and REFUSES to run against any non-local URL.
 * Usage: pnpm tsx scripts/co2/_apply-local-migration.ts supabase/migrations/<file>.sql
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

const url = process.env.DATABASE_URL!;
if (!url) {
  console.error('SAFETY: DATABASE_URL not set — check .env.local');
  process.exit(1);
}
if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error('SAFETY: DATABASE_URL is not local (127.0.0.1 / localhost) — refusing to apply migration to non-local DB');
  console.error('  URL:', url.replace(/:\/\/[^@]+@/, '://***@'));
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: pnpm tsx scripts/co2/_apply-local-migration.ts <path-to-migration.sql>');
  process.exit(1);
}

async function main() {
  const sql = postgres(url, { prepare: false });
  await sql.unsafe(readFileSync(file, 'utf8'));
  console.log('applied locally:', file);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
