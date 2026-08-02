/**
 * ISO 59004 harness bootstrap — MUST be the first import in the ISO-59004 verify
 * test. Mirrors _harness-env-iso5667-16.ts: top-level-await starts the embedded
 * Postgres and seeds the ISO-59004 fixture, and — critically — sets DATABASE_URL
 * + BYPASS_AUTH BEFORE `@/lib/db` (pulled in by the dynamically-imported
 * saveWorksheet / checkApprovalGate) is ever evaluated, so the real save path
 * connects to the disposable harness DB, not a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedISO59004, type ISO59004Fixture } from './seed-iso59004';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000059004';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: ISO59004Fixture = await seedISO59004(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiISO59004Harness__: { harness: Harness; fixture: ISO59004Fixture } | undefined;
}

globalThis.__ekowaiISO59004Harness__ = { harness, fixture };

export function getISO59004Harness(): { harness: Harness; fixture: ISO59004Fixture } {
  if (!globalThis.__ekowaiISO59004Harness__) throw new Error('ISO-59004 harness not initialised');
  return globalThis.__ekowaiISO59004Harness__;
}
