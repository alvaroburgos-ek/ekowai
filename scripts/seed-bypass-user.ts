// Seeds a bypass test user + org + membership so BYPASS_AUTH has something
// to act as. Idempotent — re-running is safe. Prints the UUID to drop into
// BYPASS_AUTH_USER_ID.
//
// Run:
//   DATABASE_URL=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   pnpm tsx scripts/seed-bypass-user.ts
//
// Env-driven knobs (defaults sensible for one bypass account):
//   BYPASS_SEED_EMAIL    default: bypass@ekowai.com
//   BYPASS_SEED_ORG_NAME default: Bypass Test Org
//   BYPASS_SEED_ORG_SLUG default: bypass-test
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
if (!SUPABASE_URL || !SERVICE_KEY || !DATABASE_URL) {
  throw new Error(
    'Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL',
  );
}

const EMAIL = process.env.BYPASS_SEED_EMAIL ?? 'bypass@ekowai.com';
const ORG_NAME = process.env.BYPASS_SEED_ORG_NAME ?? 'Bypass Test Org';
const ORG_SLUG = process.env.BYPASS_SEED_ORG_SLUG ?? 'bypass-test';

async function main() {
  const admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // listUsers paginates; one page of 200 covers test envs
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    perPage: 200,
  });
  if (listErr) throw listErr;
  let userId: string | null = list.users.find((u) => u.email === EMAIL)?.id ?? null;
  if (userId) {
    console.log(`User ${EMAIL} already exists: ${userId}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error('createUser returned no user');
    userId = data.user.id;
    console.log(`Created user ${EMAIL}: ${userId}`);
  }

  const sql = postgres(DATABASE_URL!, { prepare: false });
  try {
    // profiles is auto-created by the on-auth-user trigger; wait briefly in
    // case the trigger has not committed yet on a freshly-created user.
    for (let i = 0; i < 5; i++) {
      const rows = await sql`SELECT 1 FROM profiles WHERE id = ${userId}`;
      if (rows.length > 0) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    const [org] = await sql`
      INSERT INTO orgs (name, slug)
      VALUES (${ORG_NAME}, ${ORG_SLUG})
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    console.log(`Org ${ORG_SLUG}: ${org.id}`);

    await sql`
      INSERT INTO org_members (org_id, user_id, role)
      VALUES (${org.id}, ${userId}, 'owner')
      ON CONFLICT (org_id, user_id) DO NOTHING
    `;
    console.log(`Membership ensured: ${userId} -> ${org.id} (owner)`);

    console.log('');
    console.log('Set in Vercel preview environment:');
    console.log(`  BYPASS_AUTH=1`);
    console.log(`  BYPASS_AUTH_USER_ID=${userId}`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
