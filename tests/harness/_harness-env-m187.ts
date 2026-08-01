/**
 * DWA-M 187 harness bootstrap — MUST be the first import in the M-187 verify
 * test. Mirrors _harness-env-m732.ts: top-level-await starts the embedded
 * Postgres and seeds the M-187 fixture, and — critically — sets DATABASE_URL +
 * BYPASS_AUTH BEFORE `@/lib/db` (pulled in by the dynamically-imported
 * saveWorksheet / checkApprovalGate) is ever evaluated, so the real save path
 * connects to the disposable harness DB, not a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedM187, type M187Fixture } from './seed-m187';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000187';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: M187Fixture = await seedM187(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiM187Harness__: { harness: Harness; fixture: M187Fixture } | undefined;
}

globalThis.__ekowaiM187Harness__ = { harness, fixture };

export function getM187Harness(): { harness: Harness; fixture: M187Fixture } {
  if (!globalThis.__ekowaiM187Harness__) throw new Error('M-187 harness not initialised');
  return globalThis.__ekowaiM187Harness__;
}
