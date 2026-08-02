/**
 * DIN-14071-1 harness bootstrap — MUST be the first import in the DIN-14071-1 verify test.
 * Mirrors _harness-env-din14021.ts: top-level-await starts the embedded Postgres and seeds
 * the DIN-14071-1 fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE
 * `@/lib/db` (pulled in by the dynamically-imported saveWorksheet / checkApprovalGate) is
 * ever evaluated, so the real save path connects to the disposable harness DB, not a
 * frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedDIN14071, type DIN14071Fixture } from './seed-din14071-1';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000014071001';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: DIN14071Fixture = await seedDIN14071(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiDIN14071Harness__: { harness: Harness; fixture: DIN14071Fixture } | undefined;
}

globalThis.__ekowaiDIN14071Harness__ = { harness, fixture };

export function getDIN14071Harness(): { harness: Harness; fixture: DIN14071Fixture } {
  if (!globalThis.__ekowaiDIN14071Harness__) throw new Error('DIN-14071-1 harness not initialised');
  return globalThis.__ekowaiDIN14071Harness__;
}
