/**
 * ISO-14046 harness bootstrap — MUST be the first import in the ISO-14046 verify test.
 * Mirrors _harness-env-din14044.ts: top-level-await starts the embedded Postgres and
 * seeds the ISO-14046 fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE
 * `@/lib/db` (pulled in by the dynamically-imported saveWorksheet / checkApprovalGate) is
 * ever evaluated, so the real save path connects to the disposable harness DB, not a
 * frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedISO14046, type ISO14046Fixture } from './seed-iso14046';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000014046';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: ISO14046Fixture = await seedISO14046(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiISO14046Harness__: { harness: Harness; fixture: ISO14046Fixture } | undefined;
}

globalThis.__ekowaiISO14046Harness__ = { harness, fixture };

export function getISO14046Harness(): { harness: Harness; fixture: ISO14046Fixture } {
  if (!globalThis.__ekowaiISO14046Harness__) throw new Error('ISO-14046 harness not initialised');
  return globalThis.__ekowaiISO14046Harness__;
}
