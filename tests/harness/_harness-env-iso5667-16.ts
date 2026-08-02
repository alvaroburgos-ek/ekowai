/**
 * ISO 5667-16 harness bootstrap — MUST be the first import in the ISO-5667-16
 * verify test. Mirrors _harness-env-iso5667-13.ts: top-level-await starts the
 * embedded Postgres and seeds the ISO-5667-16 fixture, and — critically — sets
 * DATABASE_URL + BYPASS_AUTH BEFORE `@/lib/db` (pulled in by the
 * dynamically-imported saveWorksheet / checkApprovalGate) is ever evaluated, so
 * the real save path connects to the disposable harness DB, not a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedISO5667_16, type ISO5667_16Fixture } from './seed-iso5667-16';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000005616';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: ISO5667_16Fixture = await seedISO5667_16(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiISO5667_16Harness__: { harness: Harness; fixture: ISO5667_16Fixture } | undefined;
}

globalThis.__ekowaiISO5667_16Harness__ = { harness, fixture };

export function getISO5667_16Harness(): { harness: Harness; fixture: ISO5667_16Fixture } {
  if (!globalThis.__ekowaiISO5667_16Harness__) throw new Error('ISO-5667-16 harness not initialised');
  return globalThis.__ekowaiISO5667_16Harness__;
}
