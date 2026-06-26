// Seeds an EMPTY VSME project on the LOCAL Supabase stack so the dev-login
// user can navigate the six VSME tabs and INPUT their own data.
//
// Creates ONLY structure — no datapoint values are written. Humans fill the
// numbers in the app.
//
//   - auth user = DEV_AUTOLOGIN_EMAIL (so dev-login signs in as them)
//   - org "EKOWAI" + owner membership for that user
//   - project linked to the VSME standard (project_standards)
//   - worksheet_instances for every VSME worksheet_template
//
// Idempotent — re-running is safe.
//
// Run from the worktree:
//   pnpm tsx scripts/seed-vsme-local.ts
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

loadEnv({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_URL = process.env.DATABASE_URL;
const EMAIL = process.env.DEV_AUTOLOGIN_EMAIL ?? 'leadership@ekowai.com';

if (!SUPABASE_URL || !SERVICE_KEY || !DB_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL in .env.local');
}

// Guard: never run this against a non-local stack.
if (!/127\.0\.0\.1|localhost/.test(SUPABASE_URL) || !/127\.0\.0\.1|localhost/.test(DB_URL)) {
  throw new Error(`Refusing to seed: env does not point at local stack (url=${SUPABASE_URL}).`);
}

const ORG_NAME = 'EKOWAI';
const ORG_SLUG = 'ekowai';
const PROJECT_NAME = 'VSME Nachhaltigkeitsbericht 2025';
const PROJECT_CODE = 'VSME-2025-01';

async function main() {
  const admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Ensure auth user for the dev-login email
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listErr) throw listErr;
  let userId = list.users.find((u) => u.email === EMAIL)?.id ?? null;
  if (userId) {
    console.log(`✓ User ${EMAIL} exists: ${userId}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, email_confirm: true });
    if (error || !data.user) throw error ?? new Error('createUser returned no user');
    userId = data.user.id;
    console.log(`✓ Created user ${EMAIL}: ${userId}`);
  }

  const sql = postgres(DB_URL!, { prepare: false });
  try {
    // profiles is auto-created by the on-auth-user trigger; wait for it.
    let hasProfile = false;
    for (let i = 0; i < 10; i++) {
      const rows = await sql`SELECT 1 FROM profiles WHERE id = ${userId}`;
      if (rows.length > 0) { hasProfile = true; break; }
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!hasProfile) {
      // Fallback: create the profile row directly if the trigger is absent locally.
      await sql`INSERT INTO profiles (id, email) VALUES (${userId}, ${EMAIL}) ON CONFLICT (id) DO NOTHING`;
      console.log('• profile created via fallback');
    }

    // 2. Org + owner membership (prod-mirror orgs has no slug; dedupe by name.
    //    org_members has its own id PK — check-then-insert on (org_id,user_id).)
    let orgId: string;
    const [existingOrg] = await sql`SELECT id FROM orgs WHERE name = ${ORG_NAME} LIMIT 1`;
    if (existingOrg) {
      orgId = existingOrg.id;
      console.log(`✓ Org ${ORG_NAME} exists: ${orgId}`);
    } else {
      const [org] = await sql`INSERT INTO orgs (name) VALUES (${ORG_NAME}) RETURNING id`;
      orgId = org.id;
      console.log(`✓ Org ${ORG_NAME} created: ${orgId}`);
    }
    const [existingMember] = await sql`
      SELECT 1 FROM org_members WHERE org_id = ${orgId} AND user_id = ${userId} LIMIT 1
    `;
    if (existingMember) {
      await sql`UPDATE org_members SET role = 'owner' WHERE org_id = ${orgId} AND user_id = ${userId}`;
    } else {
      await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${orgId}, ${userId}, 'owner')`;
    }
    console.log(`✓ Membership: ${EMAIL} -> ${ORG_NAME} (owner)`);

    // 3. VSME standard must already be imported on local
    const [std] = await sql`SELECT id FROM standards WHERE code = 'VSME' LIMIT 1`;
    if (!std) throw new Error('VSME standard not found on local — run the Pass3c/VSME import first');

    // 4. Project (idempotent on org_id + project_code)
    const [existing] = await sql`
      SELECT id FROM projects WHERE org_id = ${orgId} AND project_code = ${PROJECT_CODE} LIMIT 1
    `;
    let projectId: string;
    if (existing) {
      projectId = existing.id;
      console.log(`✓ Project exists: ${projectId}`);
    } else {
      const [proj] = await sql`
        INSERT INTO projects (org_id, name, project_code, created_by)
        VALUES (${orgId}, ${PROJECT_NAME}, ${PROJECT_CODE}, ${userId})
        RETURNING id
      `;
      projectId = proj.id;
      console.log(`✓ Project created: ${projectId}`);
    }

    // 5. Attach VSME standard
    await sql`
      INSERT INTO project_standards (project_id, standard_id, status, added_by)
      VALUES (${projectId}, ${std.id}, 'active', ${userId})
      ON CONFLICT (project_id, standard_id) DO UPDATE
        SET status = 'active', removed_at = NULL, removed_by = NULL, removal_reason = NULL
    `;

    // 6. Worksheet instances for every VSME template
    const templates = await sql<{ id: string }[]>`
      SELECT id FROM worksheet_templates WHERE standard_id = ${std.id}
    `;
    for (const t of templates) {
      await sql`
        INSERT INTO worksheet_instances (project_id, worksheet_template_id)
        VALUES (${projectId}, ${t.id})
        ON CONFLICT (project_id, worksheet_template_id) DO NOTHING
      `;
    }
    console.log(`✓ ${templates.length} VSME worksheet_instances ensured`);

    console.log('\n──────────────────────────────────────────────');
    console.log(`Project ID : ${projectId}`);
    console.log(`Log in     : http://localhost:3000/de/login  (dev-login as ${EMAIL})`);
    console.log(`Open       : http://localhost:3000/de/projects/${projectId}`);
    console.log('No datapoint values were written — all fields are empty for manual input.');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
