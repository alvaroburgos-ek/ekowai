/**
 * ATV-A-704E harness bootstrap — MUST be the first import in the A-704E verify
 * test. Mirrors _harness-env-a262e.ts: top-level-await starts the embedded
 * Postgres and seeds the A-704E fixture, and — critically — sets DATABASE_URL +
 * BYPASS_AUTH BEFORE `@/lib/db` (pulled in by the dynamically-imported
 * saveWorksheet / checkApprovalGate) is ever evaluated, so the real save path
 * connects to the disposable harness DB, not a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedA704E, type A704EFixture } from './seed-a704e';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000704';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: A704EFixture = await seedA704E(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiA704EHarness__: { harness: Harness; fixture: A704EFixture } | undefined;
}

globalThis.__ekowaiA704EHarness__ = { harness, fixture };

export function getA704EHarness(): { harness: Harness; fixture: A704EFixture } {
  if (!globalThis.__ekowaiA704EHarness__) throw new Error('A-704E harness not initialised');
  return globalThis.__ekowaiA704EHarness__;
}
