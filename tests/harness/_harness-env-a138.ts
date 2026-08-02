/**
 * DWA-A-138-1 harness bootstrap — MUST be the first import in the 138 verify
 * test. Top-level-await starts the embedded Postgres and seeds the 138 fixture,
 * and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE `@/lib/db` (pulled in
 * by the dynamically-imported saveWorksheet / checkApprovalGate) is ever
 * evaluated, so the real save path connects to the disposable harness DB, not a
 * frozen prod URL. Mirrors _harness-env-m820-1.ts.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedA138, type A138Fixture } from './seed-a138';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000138';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: A138Fixture = await seedA138(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiA138Harness__: { harness: Harness; fixture: A138Fixture } | undefined;
}

globalThis.__ekowaiA138Harness__ = { harness, fixture };

export function getA138Harness(): { harness: Harness; fixture: A138Fixture } {
  if (!globalThis.__ekowaiA138Harness__) throw new Error('DWA-A-138-1 harness not initialised');
  return globalThis.__ekowaiA138Harness__;
}
