/**
 * Wipe all test data from the live Supabase project.
 *
 * Removes (cascades clean):
 *   approvals, decisions, calculation_history, calculation_metrics,
 *   calculations, projects, org_members, orgs.
 *
 * Leaves auth.users alone — your sign-in still works.
 *
 * Run with confirmation:
 *   pnpm tsx scripts/wipe-test-data.ts --yes
 */
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const args = process.argv.slice(2);
if (!args.includes('--yes')) {
  console.error(
    'Refusing to wipe without --yes flag.\n' +
      'Usage: pnpm tsx scripts/wipe-test-data.ts --yes',
  );
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set in .env.local');
  process.exit(1);
}

const sql = postgres(url, { prepare: false });

async function wipe() {
  console.log('Wiping test data ...');

  // Delete in dependency order. Triggers + cascades handle the rest.
  const tables = [
    'approvals',
    'decisions',
    'calculation_history',
    'calculation_metrics',
    'calculations',
    'projects',
    'org_members',
    'orgs',
  ];

  for (const t of tables) {
    const result = await sql.unsafe(`DELETE FROM ${t}`);
    console.log(`  ${t.padEnd(22)} → ${result.count ?? 0} rows`);
  }

  console.log('Done. auth.users untouched (sign-in still works).');
}

wipe()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => sql.end({ timeout: 5 }));
