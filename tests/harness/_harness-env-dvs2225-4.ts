/**
 * DVS-2225-4 harness bootstrap — MUST be the first import in the DVS-2225-4 verify test.
 * Mirrors _harness-env-din276.ts: top-level-await starts the embedded Postgres and seeds
 * the DVS-2225-4 fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE
 * `@/lib/db` (pulled in by the dynamically-imported saveWorksheet / checkApprovalGate) is
 * ever evaluated, so the real save path connects to the disposable harness DB, not a frozen
 * prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedDVS2225_4, type DVS2225_4Fixture } from './seed-dvs2225-4';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000002254';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: DVS2225_4Fixture = await seedDVS2225_4(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiDVS2225_4Harness__: { harness: Harness; fixture: DVS2225_4Fixture } | undefined;
}

globalThis.__ekowaiDVS2225_4Harness__ = { harness, fixture };

export function getDVS2225_4Harness(): { harness: Harness; fixture: DVS2225_4Fixture } {
  if (!globalThis.__ekowaiDVS2225_4Harness__) throw new Error('DVS-2225-4 harness not initialised');
  return globalThis.__ekowaiDVS2225_4Harness__;
}
