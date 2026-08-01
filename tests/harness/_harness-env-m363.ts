/**
 * DWA-M-363 harness bootstrap — MUST be the first import in the M-363 verify
 * test. Mirrors _harness-env-m732.ts: top-level-await starts the embedded
 * Postgres and seeds the M-363 fixture, and — critically — sets DATABASE_URL +
 * BYPASS_AUTH BEFORE `@/lib/db` (pulled in by the dynamically-imported
 * saveWorksheet / checkApprovalGate) is ever evaluated, so the real save path
 * connects to the disposable harness DB, not a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedM363, type M363Fixture } from './seed-m363';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000363';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: M363Fixture = await seedM363(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiM363Harness__: { harness: Harness; fixture: M363Fixture } | undefined;
}

globalThis.__ekowaiM363Harness__ = { harness, fixture };

export function getM363Harness(): { harness: Harness; fixture: M363Fixture } {
  if (!globalThis.__ekowaiM363Harness__) throw new Error('M-363 harness not initialised');
  return globalThis.__ekowaiM363Harness__;
}
