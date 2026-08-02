/**
 * DWA-A-226 harness bootstrap — MUST be the first import in the A-226 verify test.
 * Mirrors _harness-env-m820-2.ts: top-level-await starts the embedded Postgres and
 * seeds the A-226 fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE
 * `@/lib/db` (pulled in by the dynamically-imported saveWorksheet / checkApprovalGate)
 * is ever evaluated, so the real save path connects to the disposable harness DB, not
 * a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedA226, type A226Fixture } from './seed-a226';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000226';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: A226Fixture = await seedA226(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiA226Harness__: { harness: Harness; fixture: A226Fixture } | undefined;
}

globalThis.__ekowaiA226Harness__ = { harness, fixture };

export function getA226Harness(): { harness: Harness; fixture: A226Fixture } {
  if (!globalThis.__ekowaiA226Harness__) throw new Error('A-226 harness not initialised');
  return globalThis.__ekowaiA226Harness__;
}
