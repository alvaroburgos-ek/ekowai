/**
 * DWA-A-201 harness bootstrap — MUST be the first import in the A-201 verify
 * test. Mirrors _harness-env-a178.ts: top-level-await starts the embedded
 * Postgres and seeds the A-201 fixture, and — critically — sets DATABASE_URL +
 * BYPASS_AUTH BEFORE `@/lib/db` (pulled in by the dynamically-imported
 * saveWorksheet / checkApprovalGate) is ever evaluated, so the real save path
 * connects to the disposable harness DB, not a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedA201, type A201Fixture } from './seed-a201';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000002a1';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: A201Fixture = await seedA201(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiA201Harness__: { harness: Harness; fixture: A201Fixture } | undefined;
}

globalThis.__ekowaiA201Harness__ = { harness, fixture };

export function getA201Harness(): { harness: Harness; fixture: A201Fixture } {
  if (!globalThis.__ekowaiA201Harness__) throw new Error('A-201 harness not initialised');
  return globalThis.__ekowaiA201Harness__;
}
