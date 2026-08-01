/**
 * DWA-M-277E harness bootstrap — MUST be the first import in the M-277E verify test.
 * Mirrors _harness-env-m760.ts: top-level-await starts the embedded Postgres and
 * seeds the M-277E fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE
 * `@/lib/db` (pulled in by the dynamically-imported saveWorksheet / checkApprovalGate)
 * is ever evaluated, so the real save path connects to the disposable harness DB, not
 * a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedM277E, type M277EFixture } from './seed-m277e';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000277';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: M277EFixture = await seedM277E(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiM277EHarness__: { harness: Harness; fixture: M277EFixture } | undefined;
}

globalThis.__ekowaiM277EHarness__ = { harness, fixture };

export function getM277EHarness(): { harness: Harness; fixture: M277EFixture } {
  if (!globalThis.__ekowaiM277EHarness__) throw new Error('M-277E harness not initialised');
  return globalThis.__ekowaiM277EHarness__;
}
