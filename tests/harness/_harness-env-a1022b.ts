/**
 * DWA-A-102-2 (current-prod) harness bootstrap — MUST be the first import in
 * a1022b-verify.integration.test.ts. Mirrors _harness-env-a222.ts: boots a
 * disposable embedded Postgres and seeds the current-prod A-102-2 fixture
 * BEFORE any `@/lib/db` import resolves.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedA1022b, type A1022BFixture } from './seed-a1022b';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000d3';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: A1022BFixture = await seedA1022b(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiA1022bHarness__: { harness: Harness; fixture: A1022BFixture } | undefined;
}

globalThis.__ekowaiA1022bHarness__ = { harness, fixture };

export function getA1022bHarness(): { harness: Harness; fixture: A1022BFixture } {
  if (!globalThis.__ekowaiA1022bHarness__) throw new Error('A-102-2 (b) harness not initialised');
  return globalThis.__ekowaiA1022bHarness__;
}
