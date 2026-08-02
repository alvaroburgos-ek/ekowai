/**
 * DIN-276 harness bootstrap — MUST be the first import in the DIN-276 verify test.
 * Mirrors _harness-env-a226.ts: top-level-await starts the embedded Postgres and seeds
 * the DIN-276 fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE
 * `@/lib/db` (pulled in by the dynamically-imported saveWorksheet / checkApprovalGate)
 * is ever evaluated, so the real save path connects to the disposable harness DB, not a
 * frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedDIN276, type DIN276Fixture } from './seed-din276';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000276';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: DIN276Fixture = await seedDIN276(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiDIN276Harness__: { harness: Harness; fixture: DIN276Fixture } | undefined;
}

globalThis.__ekowaiDIN276Harness__ = { harness, fixture };

export function getDIN276Harness(): { harness: Harness; fixture: DIN276Fixture } {
  if (!globalThis.__ekowaiDIN276Harness__) throw new Error('DIN-276 harness not initialised');
  return globalThis.__ekowaiDIN276Harness__;
}
