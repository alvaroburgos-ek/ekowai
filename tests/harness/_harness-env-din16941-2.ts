/**
 * DIN-EN-16941-2 harness bootstrap — MUST be the first import in the verify test.
 * Mirrors _harness-env-din276.ts: top-level-await starts the embedded Postgres and seeds
 * the DIN-EN-16941-2 fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE
 * `@/lib/db` (pulled in by the dynamically-imported saveWorksheet / checkApprovalGate) is
 * ever evaluated, so the real save path connects to the disposable harness DB, not a frozen
 * prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedDIN16941_2, type DIN16941_2Fixture } from './seed-din16941-2';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000016941';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: DIN16941_2Fixture = await seedDIN16941_2(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiDIN16941_2Harness__: { harness: Harness; fixture: DIN16941_2Fixture } | undefined;
}

globalThis.__ekowaiDIN16941_2Harness__ = { harness, fixture };

export function getDIN16941_2Harness(): { harness: Harness; fixture: DIN16941_2Fixture } {
  if (!globalThis.__ekowaiDIN16941_2Harness__) throw new Error('DIN-EN-16941-2 harness not initialised');
  return globalThis.__ekowaiDIN16941_2Harness__;
}
