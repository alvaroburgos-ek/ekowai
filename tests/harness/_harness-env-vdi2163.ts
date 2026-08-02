/**
 * VDI-2163 harness bootstrap — MUST be the first import in the VDI-2163 verify test.
 * Mirrors _harness-env-iso9001.ts: top-level-await starts the embedded Postgres and seeds the
 * VDI-2163 fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE `@/lib/db`
 * (pulled in by the dynamically-imported saveWorksheet / checkApprovalGate) is ever evaluated,
 * so the real save path connects to the disposable harness DB, not a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedVDI2163, type VDI2163Fixture } from './seed-vdi2163';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000090011';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: VDI2163Fixture = await seedVDI2163(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiVDI2163Harness__: { harness: Harness; fixture: VDI2163Fixture } | undefined;
}

globalThis.__ekowaiVDI2163Harness__ = { harness, fixture };

export function getVDI2163Harness(): { harness: Harness; fixture: VDI2163Fixture } {
  if (!globalThis.__ekowaiVDI2163Harness__) throw new Error('VDI-2163 harness not initialised');
  return globalThis.__ekowaiVDI2163Harness__;
}
