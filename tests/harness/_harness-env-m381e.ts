/**
 * DWA-M-381E harness bootstrap — MUST be the first import in the M-381E verify test.
 * Mirrors _harness-env-a226.ts: top-level-await starts the embedded Postgres and seeds
 * the M-381E fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE `@/lib/db`
 * (pulled in by the dynamically-imported saveWorksheet / checkApprovalGate) is ever
 * evaluated, so the real save path connects to the disposable harness DB, not a frozen
 * prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedM381e, type M381eFixture } from './seed-m381e';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000381';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: M381eFixture = await seedM381e(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiM381eHarness__: { harness: Harness; fixture: M381eFixture } | undefined;
}

globalThis.__ekowaiM381eHarness__ = { harness, fixture };

export function getM381eHarness(): { harness: Harness; fixture: M381eFixture } {
  if (!globalThis.__ekowaiM381eHarness__) throw new Error('M-381E harness not initialised');
  return globalThis.__ekowaiM381eHarness__;
}
