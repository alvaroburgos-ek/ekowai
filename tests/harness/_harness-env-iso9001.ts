/**
 * ISO-9001 harness bootstrap — MUST be the first import in the ISO-9001 verify test.
 * Mirrors _harness-env-iso14067.ts: top-level-await starts the embedded Postgres and seeds the
 * ISO-9001 fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE `@/lib/db`
 * (pulled in by the dynamically-imported saveWorksheet / checkApprovalGate) is ever evaluated,
 * so the real save path connects to the disposable harness DB, not a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedISO9001, type ISO9001Fixture } from './seed-iso9001';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000090010';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: ISO9001Fixture = await seedISO9001(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiISO9001Harness__: { harness: Harness; fixture: ISO9001Fixture } | undefined;
}

globalThis.__ekowaiISO9001Harness__ = { harness, fixture };

export function getISO9001Harness(): { harness: Harness; fixture: ISO9001Fixture } {
  if (!globalThis.__ekowaiISO9001Harness__) throw new Error('ISO-9001 harness not initialised');
  return globalThis.__ekowaiISO9001Harness__;
}
