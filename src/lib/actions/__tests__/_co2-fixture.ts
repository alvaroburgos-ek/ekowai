/**
 * CO₂ integration test fixture.
 *
 * Inserts a throwaway org, profile, project, VSME standard link,
 * worksheet_instance (for VSME-C03.000), and TWO co2_activity_lines.
 * Returns all inserted IDs plus a cleanup function.
 *
 * Uses the postgres role (bypasses RLS) — fine for test fixtures.
 * Uses raw SQL for tables whose schema.ts definition is ahead of the local DB
 * migration state (e.g. orgs.slug not yet applied locally).
 */
import '../../db/__tests__/_setup-env';
import { db } from '@/lib/db';
import { co2ActivityLines } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

// Known constants from the seeded VSME standard (VSME-C03.000)
const VSME_STANDARD_ID = '71c0abc3-dfb3-4e40-842a-2378d12ec287';
const VSME_C03_TEMPLATE_ID = 'b90a509c-c196-4088-87fa-fd7bbb60efd6';

// Scope 1 factor: Stationäre Verbrennung (LPG / Flüssiggas)
// uba_id=01_10_01_001_04, kgCo2e≈30.23 per unit (seeded v2.1 UBA factors)
const SCOPE1_UBA_ID = '01_10_01_001_04';
const SCOPE1_SOURCE_VERSION = 'v2.1';
const SCOPE1_AMOUNT = 1000;

// Scope 2 factor: Deutscher Strommix (Strom)
const SCOPE2_UBA_ID = '05_20_01_001_01';
const SCOPE2_SOURCE_VERSION = 'v2.1';
const SCOPE2_AMOUNT = 10000; // kWh

export interface Co2FixtureCtx {
  userId: string;
  orgId: string;
  projectId: string;
  worksheetInstanceId: string;
  lineIds: string[];
  cleanup: () => Promise<void>;
}

/** Convenience no-op export so tests can import it without breaking.
 * Actual cleanup is done via the `cleanup` fn returned from seedCo2Fixture. */
export async function cleanupCo2Fixture(): Promise<void> {
  // no-op: call ctx.cleanup() from beforeAll/afterAll instead
}

export async function seedCo2Fixture(
  _db: typeof db,
): Promise<Co2FixtureCtx> {
  const ts = Date.now();
  const suffix = ts.toString(36);

  // 1. Auth user + profile
  // project_parameters.entered_by and worksheet_instances reference auth.users(id).
  // The postgres role can insert directly into auth.users bypassing GoTrue.
  const userIdPadded = `a1b2c3d4-ffff-0000-0000-${String(ts).padStart(12, '0')}`.slice(0, 36);
  const fixedUserId = userIdPadded;
  const fixtureEmail = `co2-fixture-${suffix}@test.local`;
  await db.execute(
    sql`INSERT INTO auth.users (id, email, aud, role, is_sso_user, is_anonymous)
        VALUES (${fixedUserId}, ${fixtureEmail}, 'authenticated', 'authenticated', false, false)
        ON CONFLICT (id) DO NOTHING`,
  );
  await db.execute(
    sql`INSERT INTO profiles (id, email) VALUES (${fixedUserId}, ${fixtureEmail}) ON CONFLICT (id) DO NOTHING`,
  );

  // 2. Org — raw SQL to avoid schema columns not yet in local DB (e.g. slug)
  const orgRows = await db.execute(
    sql`INSERT INTO orgs (name) VALUES (${'CO2 Fixture Org ' + suffix}) RETURNING id`,
  ) as Array<{ id: string }>;
  const orgId = orgRows[0].id;

  // 3. Org member
  await db.execute(
    sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${orgId}, ${fixedUserId}, 'owner')`,
  );

  // 4. Project
  const projRows = await db.execute(
    sql`INSERT INTO projects (org_id, name, created_by) VALUES (${orgId}, ${'CO2 Test Project ' + suffix}, ${fixedUserId}) RETURNING id`,
  ) as Array<{ id: string }>;
  const projectId = projRows[0].id;

  // 5. VSME standard link (added_by references auth.users — omit for fixture)
  await db.execute(
    sql`INSERT INTO project_standards (project_id, standard_id, status) VALUES (${projectId}, ${VSME_STANDARD_ID}, 'active')`,
  );

  // 6. Worksheet instance for VSME-C03.000
  const instRows = await db.execute(
    sql`INSERT INTO worksheet_instances (project_id, worksheet_template_id, status) VALUES (${projectId}, ${VSME_C03_TEMPLATE_ID}, 'draft') RETURNING id`,
  ) as Array<{ id: string }>;
  const worksheetInstanceId = instRows[0].id;

  // 7. Two activity lines
  const [line1] = await db
    .insert(co2ActivityLines)
    .values({
      projectId,
      worksheetInstanceId,
      scope: 'Scope 1',
      category: 'Stationäre Verbrennung',
      amount: String(SCOPE1_AMOUNT),
      unit: 'kg',
      factorUbaId: SCOPE1_UBA_ID,
      factorSourceVersion: SCOPE1_SOURCE_VERSION,
      createdBy: fixedUserId,
    })
    .returning({ id: co2ActivityLines.id });

  const [line2] = await db
    .insert(co2ActivityLines)
    .values({
      projectId,
      worksheetInstanceId,
      scope: 'Scope 2',
      category: 'Strom',
      amount: String(SCOPE2_AMOUNT),
      unit: 'kWh',
      factorUbaId: SCOPE2_UBA_ID,
      factorSourceVersion: SCOPE2_SOURCE_VERSION,
      createdBy: fixedUserId,
    })
    .returning({ id: co2ActivityLines.id });

  const lineIds = [line1.id, line2.id];

  const cleanup = async () => {
    // Delete in reverse FK order
    for (const lid of lineIds) {
      await db.execute(sql`DELETE FROM co2_activity_lines WHERE id = ${lid}`);
    }
    await db.execute(sql`DELETE FROM project_parameters WHERE project_id = ${projectId}`);
    await db.execute(sql`DELETE FROM worksheet_instances WHERE id = ${worksheetInstanceId}`);
    await db.execute(sql`DELETE FROM project_standards WHERE project_id = ${projectId}`);
    await db.execute(sql`DELETE FROM projects WHERE id = ${projectId}`);
    await db.execute(sql`DELETE FROM org_members WHERE org_id = ${orgId}`);
    await db.execute(sql`DELETE FROM orgs WHERE id = ${orgId}`);
    await db.execute(sql`DELETE FROM profiles WHERE id = ${fixedUserId}`);
    await db.execute(sql`DELETE FROM auth.users WHERE id = ${fixedUserId}`);
  };

  return {
    userId: fixedUserId,
    orgId,
    projectId,
    worksheetInstanceId,
    lineIds,
    cleanup,
  };
}
