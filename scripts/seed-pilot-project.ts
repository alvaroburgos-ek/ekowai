import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

loadEnv({ path: '.env.local' });

const DB_URL = process.env.DATABASE_URL;
const ENGINEER_EMAIL = process.env.DEV_AUTOLOGIN_EMAIL ?? 'leadership@ekowai.com';

if (!DB_URL) {
  console.error('DATABASE_URL not set in .env.local');
  process.exit(1);
}

const PILOT_PROJECT_CODE = 'PLT-HS-01';
const PILOT_PROJECT_NAME = 'PLT-HS-01 — Blumen Forscheln Naturteich';
const PILOT_SITE = 'Flurstück 72/16, Kempen, 52525 Heinsberg NRW';
const PILOT_STANDARDS = ['DWA-A-138-1', 'DWA-M-820-1', 'DWA-M-820-2', 'DWA-M-820-3'];

const sql = postgres(DB_URL, { prepare: false });

async function main() {
  console.log(`Seeding pilot project for ${ENGINEER_EMAIL}...`);

  // 1. Find engineer + their org
  const [user] = await sql`SELECT id FROM auth.users WHERE email = ${ENGINEER_EMAIL} LIMIT 1`;
  if (!user) throw new Error(`User ${ENGINEER_EMAIL} not found`);

  const [member] = await sql`SELECT org_id FROM org_members WHERE user_id = ${user.id} LIMIT 1`;
  if (!member) throw new Error(`User has no org membership — create one first`);
  const orgId = member.org_id;
  console.log(`✓ User ${user.id} in org ${orgId}`);

  // 2. Upsert pilot project (check first — projects has no unique(org_id, project_code) constraint)
  const [existing] = await sql`
    SELECT id FROM projects WHERE org_id = ${orgId} AND project_code = ${PILOT_PROJECT_CODE} LIMIT 1
  `;
  let projectId: string;
  if (existing) {
    projectId = existing.id;
    console.log(`✓ Pilot project already exists: ${projectId}`);
  } else {
    const [proj] = await sql`
      INSERT INTO projects (org_id, name, project_code, site_location, created_by)
      VALUES (${orgId}, ${PILOT_PROJECT_NAME}, ${PILOT_PROJECT_CODE}, ${PILOT_SITE}, ${user.id})
      RETURNING id
    `;
    projectId = proj.id;
    console.log(`✓ Pilot project created: ${projectId}`);
  }

  // 3. Attach standards + instantiate worksheet_instances
  let totalInstances = 0;
  for (const code of PILOT_STANDARDS) {
    const [std] = await sql`SELECT id FROM standards WHERE code = ${code} LIMIT 1`;
    if (!std) {
      console.warn(`⚠ Standard ${code} not imported — skipping (run import-pass3c first)`);
      continue;
    }

    await sql`
      INSERT INTO project_standards (project_id, standard_id, status, added_by)
      VALUES (${projectId}, ${std.id}, 'active', ${user.id})
      ON CONFLICT (project_id, standard_id) DO UPDATE
        SET status = 'active', removed_at = NULL, removed_by = NULL, removal_reason = NULL
    `;

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
    totalInstances += templates.length;
    console.log(`✓ ${code}: ${templates.length} worksheet_instances`);
  }

  console.log(`\nProject ID: ${projectId}`);
  console.log(`Total worksheet_instances: ${totalInstances}`);
  console.log(`Visit: http://localhost:3000/de/projects/${projectId}/standards`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sql.end());
