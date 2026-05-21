import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

const args = process.argv.slice(2);
if (!args.includes('--yes')) {
  console.error('Refusing to wipe without --yes flag.');
  console.error('Usage: pnpm tsx scripts/wipe-all-data.ts --yes');
  process.exit(1);
}

async function main() {
  const sql = postgres(url!, { prepare: false });
  try {
    console.log('Wiping project + library data (auth.users, orgs, org_members untouched)...');
    await sql`DELETE FROM audit_log`;
    await sql`DELETE FROM approval_events`;
    await sql`DELETE FROM report_archives`;
    await sql`DELETE FROM project_documents`;
    await sql`DELETE FROM project_parameters`;
    await sql`DELETE FROM worksheet_instances`;
    await sql`DELETE FROM project_standards`;
    await sql`DELETE FROM projects`;
    await sql`DELETE FROM compliance_requirements`;
    await sql`DELETE FROM equations`;
    await sql`DELETE FROM fields`;
    await sql`DELETE FROM worksheet_sections`;
    await sql`DELETE FROM worksheet_templates`;
    await sql`DELETE FROM standards`;
    console.log('Done.');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
