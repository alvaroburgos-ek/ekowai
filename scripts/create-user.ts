import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

loadEnv({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SERVICE_KEY || !DATABASE_URL) {
  console.error(
    'Missing env vars (need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL)',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const email = args.find((a) => a.startsWith('--email='))?.slice('--email='.length);
const password = args.find((a) => a.startsWith('--password='))?.slice('--password='.length);
const fullName = args.find((a) => a.startsWith('--name='))?.slice('--name='.length);
const orgSlug = args.find((a) => a.startsWith('--org='))?.slice('--org='.length);
const role = (
  args.find((a) => a.startsWith('--role='))?.slice('--role='.length) ?? 'engineer'
) as 'owner' | 'admin' | 'engineer' | 'reviewer';

if (!email || !password) {
  console.error(
    'Usage: pnpm tsx scripts/create-user.ts --email=foo@bar.tld --password=YourPassword [--name="Vorname Nachname"] [--org=<slug>] [--role=engineer|owner|admin|reviewer]',
  );
  console.error('');
  console.error('Notes:');
  console.error(
    '- --org: if omitted, user is created without org membership (use verify page to create one)',
  );
  console.error('- --role: defaults to engineer');
  console.error(
    '- --name: written to profiles.full_name; if omitted, user is sent to profile-setup on first login',
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

async function main() {
  const admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Creating user ${email}...`);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    if (error.message.includes('already')) {
      console.error(`User ${email} already exists in auth.users — abort.`);
      process.exit(1);
    }
    throw error;
  }
  const userId = data.user.id;
  console.log(`✓ User created: ${userId}`);

  // Insert profile row
  const sql = postgres(DATABASE_URL!, { prepare: false });
  try {
    if (fullName) {
      await sql`
        INSERT INTO profiles (id, full_name)
        VALUES (${userId}, ${fullName})
        ON CONFLICT (id) DO UPDATE SET full_name = ${fullName}
      `;
      console.log(`✓ Profile name set: ${fullName}`);
    }

    if (orgSlug) {
      const [org] = await sql`SELECT id FROM orgs WHERE slug = ${orgSlug} LIMIT 1`;
      if (!org) {
        console.error(
          `✗ Org with slug "${orgSlug}" not found — user has no membership.`,
        );
        console.error(
          `  Either create the org first or omit --org and let the user create one via the verify page.`,
        );
      } else {
        await sql`
          INSERT INTO org_members (org_id, user_id, role)
          VALUES (${org.id}, ${userId}, ${role})
          ON CONFLICT (org_id, user_id) DO UPDATE SET role = ${role}
        `;
        console.log(`✓ Added to org ${orgSlug} as ${role}`);
      }
    } else {
      console.log(
        `ℹ No --org specified — user will see the create-first-org form on first login.`,
      );
    }
  } finally {
    await sql.end();
  }

  console.log('');
  console.log(`Done. User can log in at /de/login with email + password.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
