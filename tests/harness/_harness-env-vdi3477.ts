/**
 * VDI-3477 harness bootstrap — MUST be the first import in the VDI-3477 verify test.
 * Mirrors _harness-env-vdi2163.ts: top-level-await starts the embedded Postgres and seeds the
 * VDI-3477 fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE `@/lib/db`
 * (pulled in by the dynamically-imported saveWorksheet / checkApprovalGate) is ever evaluated,
 * so the real save path connects to the disposable harness DB, not a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedVDI3477, type VDI3477Fixture } from './seed-vdi3477';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000034771';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: VDI3477Fixture = await seedVDI3477(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiVDI3477Harness__: { harness: Harness; fixture: VDI3477Fixture } | undefined;
}

globalThis.__ekowaiVDI3477Harness__ = { harness, fixture };

export function getVDI3477Harness(): { harness: Harness; fixture: VDI3477Fixture } {
  if (!globalThis.__ekowaiVDI3477Harness__) throw new Error('VDI-3477 harness not initialised');
  return globalThis.__ekowaiVDI3477Harness__;
}
