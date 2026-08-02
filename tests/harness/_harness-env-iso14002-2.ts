/**
 * ISO 14002-2 harness bootstrap — MUST be the first import in the ISO-14002-2
 * verify test. Mirrors _harness-env-iso59020.ts: top-level-await starts a
 * disposable embedded Postgres and seeds the ISO-14002-2 fixture, and —
 * critically — sets DATABASE_URL + BYPASS_AUTH BEFORE `@/lib/db` (pulled in by
 * the dynamically-imported saveWorksheet / checkApprovalGate) is ever evaluated,
 * so the real save path connects to the disposable harness DB, not a frozen prod
 * URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedISO14002_2, type ISO14002_2Fixture } from './seed-iso14002-2';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000014002002';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: ISO14002_2Fixture = await seedISO14002_2(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiISO14002_2Harness__: { harness: Harness; fixture: ISO14002_2Fixture } | undefined;
}

globalThis.__ekowaiISO14002_2Harness__ = { harness, fixture };

export function getISO14002_2Harness(): { harness: Harness; fixture: ISO14002_2Fixture } {
  if (!globalThis.__ekowaiISO14002_2Harness__) throw new Error('ISO-14002-2 harness not initialised');
  return globalThis.__ekowaiISO14002_2Harness__;
}
