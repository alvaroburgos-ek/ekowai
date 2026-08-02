/**
 * VSME harness bootstrap — MUST be the first import in the VSME verify test.
 * Mirrors _harness-env-m179-1.ts: top-level-await starts a disposable embedded
 * Postgres and seeds the VSME fixture, and — critically — sets DATABASE_URL +
 * BYPASS_AUTH BEFORE `@/lib/db` (pulled in by the dynamically-imported
 * saveWorksheet / checkApprovalGate) is ever evaluated, so the real save path
 * connects to the disposable harness DB, not a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedVSME, type VSMEFixture } from './seed-vsme';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000005731';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: VSMEFixture = await seedVSME(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiVSMEHarness__: { harness: Harness; fixture: VSMEFixture } | undefined;
}

globalThis.__ekowaiVSMEHarness__ = { harness, fixture };

export function getVSMEHarness(): { harness: Harness; fixture: VSMEFixture } {
  if (!globalThis.__ekowaiVSMEHarness__) throw new Error('VSME harness not initialised');
  return globalThis.__ekowaiVSMEHarness__;
}
