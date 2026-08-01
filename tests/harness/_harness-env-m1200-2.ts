/**
 * DWA-M-1200-2 harness bootstrap — MUST be the first import in the M-1200-2 verify
 * test. Mirrors _harness-env-m363.ts: top-level-await starts the embedded Postgres
 * and seeds the M-1200-2 fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH
 * BEFORE `@/lib/db` (pulled in by the dynamically-imported saveWorksheet /
 * checkApprovalGate) is ever evaluated, so the real save path connects to the
 * disposable harness DB, not a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedM12002, type M12002Fixture } from './seed-m1200-2';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000012002';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: M12002Fixture = await seedM12002(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiM12002Harness__: { harness: Harness; fixture: M12002Fixture } | undefined;
}

globalThis.__ekowaiM12002Harness__ = { harness, fixture };

export function getM12002Harness(): { harness: Harness; fixture: M12002Fixture } {
  if (!globalThis.__ekowaiM12002Harness__) throw new Error('M-1200-2 harness not initialised');
  return globalThis.__ekowaiM12002Harness__;
}
