/**
 * DIN-18130-1 harness bootstrap — MUST be the first import in the DIN-18130
 * verify test. Mirrors _harness-env-fll-gar.ts but seeds the minimal
 * DIN-18130-1 pilot fixture (calc worksheet -04 + summary -05) via seedDin18130.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedDin18130, type Din18130Fixture } from './seed-din18130-1';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000d1';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: Din18130Fixture = await seedDin18130(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiDin18130Harness__: { harness: Harness; fixture: Din18130Fixture } | undefined;
}

globalThis.__ekowaiDin18130Harness__ = { harness, fixture };

export function getDin18130Harness(): { harness: Harness; fixture: Din18130Fixture } {
  if (!globalThis.__ekowaiDin18130Harness__) throw new Error('DIN-18130 harness not initialised');
  return globalThis.__ekowaiDin18130Harness__;
}
