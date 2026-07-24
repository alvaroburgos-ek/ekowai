/**
 * DWA-A-102-2 harness bootstrap — MUST be the first import in the A-102-2
 * verify test. Mirrors _harness-env-din18130.ts but seeds the minimal A-102-2
 * pilot fixture (single calc worksheet with the harnessed equations + CRs).
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedA1022, type A1022Fixture } from './seed-a1022';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000d2';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: A1022Fixture = await seedA1022(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiA1022Harness__: { harness: Harness; fixture: A1022Fixture } | undefined;
}

globalThis.__ekowaiA1022Harness__ = { harness, fixture };

export function getA1022Harness(): { harness: Harness; fixture: A1022Fixture } {
  if (!globalThis.__ekowaiA1022Harness__) throw new Error('A-102-2 harness not initialised');
  return globalThis.__ekowaiA1022Harness__;
}
