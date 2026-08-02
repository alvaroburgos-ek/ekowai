/**
 * VDI-3814-Blatt-2-1 harness bootstrap — MUST be the first import in the verify test.
 * Mirrors _harness-env-vdi3477.ts: top-level-await starts the embedded Postgres and seeds the
 * VDI-3814-Blatt-2-1 fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE `@/lib/db`
 * (pulled in by the dynamically-imported saveWorksheet / checkApprovalGate) is ever evaluated,
 * so the real save path connects to the disposable harness DB, not a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedVDI3814_2_1, type VDI3814Fixture } from './seed-vdi3814-2-1';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000038141';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: VDI3814Fixture = await seedVDI3814_2_1(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiVDI3814Harness__: { harness: Harness; fixture: VDI3814Fixture } | undefined;
}

globalThis.__ekowaiVDI3814Harness__ = { harness, fixture };

export function getVDI3814Harness(): { harness: Harness; fixture: VDI3814Fixture } {
  if (!globalThis.__ekowaiVDI3814Harness__) throw new Error('VDI-3814-Blatt-2-1 harness not initialised');
  return globalThis.__ekowaiVDI3814Harness__;
}
