/**
 * ISO 5667-13 harness bootstrap — MUST be the first import in the ISO-5667-13
 * verify test. Mirrors _harness-env-iso5667-10.ts: top-level-await starts the
 * embedded Postgres and seeds the ISO-5667-13 fixture, and — critically — sets
 * DATABASE_URL + BYPASS_AUTH BEFORE `@/lib/db` (pulled in by the
 * dynamically-imported saveWorksheet / checkApprovalGate) is ever evaluated, so
 * the real save path connects to the disposable harness DB, not a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedISO5667_13, type ISO5667_13Fixture } from './seed-iso5667-13';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000005613';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: ISO5667_13Fixture = await seedISO5667_13(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiISO5667_13Harness__: { harness: Harness; fixture: ISO5667_13Fixture } | undefined;
}

globalThis.__ekowaiISO5667_13Harness__ = { harness, fixture };

export function getISO5667_13Harness(): { harness: Harness; fixture: ISO5667_13Fixture } {
  if (!globalThis.__ekowaiISO5667_13Harness__) throw new Error('ISO-5667-13 harness not initialised');
  return globalThis.__ekowaiISO5667_13Harness__;
}
