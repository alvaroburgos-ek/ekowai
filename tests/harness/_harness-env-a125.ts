/**
 * DWA-A-125 harness bootstrap — MUST be the first import in the A-125 verify test.
 * Mirrors _harness-env-a226.ts: top-level-await starts the embedded Postgres and
 * seeds the A-125 fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE
 * `@/lib/db` (pulled in by the dynamically-imported saveWorksheet / checkApprovalGate)
 * is ever evaluated, so the real save path connects to the disposable harness DB, not
 * a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedA125, type A125Fixture } from './seed-a125';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000125';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: A125Fixture = await seedA125(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiA125Harness__: { harness: Harness; fixture: A125Fixture } | undefined;
}

globalThis.__ekowaiA125Harness__ = { harness, fixture };

export function getA125Harness(): { harness: Harness; fixture: A125Fixture } {
  if (!globalThis.__ekowaiA125Harness__) throw new Error('A-125 harness not initialised');
  return globalThis.__ekowaiA125Harness__;
}
