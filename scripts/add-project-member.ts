import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

loadEnv({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SERVICE_KEY || !DATABASE_URL) {
  console.error('Missing env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL)');
  process.exit(1);
}

const args = process.argv.slice(2);
const get = (k: string) => args.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1);
const email = get('--email');
const password = get('--password');
const projectId = get('--project');
const role = (get('--role') ?? 'client') as 'client' | 'designer';
const invitedBy = get('--invited-by'); // optional profiles.id of the inviting engineer

if (!email || !projectId || (role !== 'client' && role !== 'designer')) {
  console.error(
    'Usage: pnpm tsx scripts/add-project-member.ts --email=foo@bar.tld --project=<projectId> --role=client|designer [--password=Secret123] [--invited-by=<profileId>]',
  );
  process.exit(1);
}

async function main() {
  const admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Find or create the auth user.
  const { data: list } = await admin.auth.admin.listUsers();
  let userId = list.users.find((u) => u.email === email)?.id;
  if (!userId) {
    if (!password) {
      console.error('User does not exist — pass --password to create them.');
      process.exit(1);
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: email!,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error('createUser failed');
    userId = data.user.id;
    console.log(`✓ User created: ${userId}`);
  } else {
    console.log(`ℹ User exists: ${userId}`);
  }

  const uid: string = userId!; // guaranteed set by the resolution above
  const mail: string = email!; // guaranteed by the top-level arg guard
  const pid: string = projectId!; // guaranteed by the top-level arg guard

  const sql = postgres(DATABASE_URL!, { prepare: false });
  try {
    // Ensure a profile row exists (the auth trigger usually creates it).
    await sql`INSERT INTO profiles (id, email) VALUES (${uid}, ${mail})
              ON CONFLICT (id) DO NOTHING`;

    const inviter = invitedBy ?? uid; // fall back to self when not given
    await sql`
      INSERT INTO project_members (project_id, user_id, role, invited_by)
      VALUES (${pid}, ${uid}, ${role}, ${inviter})
      ON CONFLICT (project_id, user_id) DO UPDATE SET role = ${role}
    `;
    console.log(`✓ ${mail} added to project ${pid} as ${role}`);
  } finally {
    await sql.end();
  }
  console.log('Done. They can log in at /de/login and will land on /de/portal.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
