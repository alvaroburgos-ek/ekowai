/**
 * HOAI-2021 harness bootstrap — MUST be the first import in the verify test.
 * Mirrors _harness-env-vdi3814-2-1.ts: top-level-await starts the embedded Postgres and seeds
 * the HOAI-2021 fixture, and — critically — sets DATABASE_URL + BYPASS_AUTH BEFORE `@/lib/db`
 * (pulled in by the dynamically-imported saveWorksheet / checkApprovalGate) is ever evaluated,
 * so the real save path connects to the disposable harness DB, not a frozen prod URL.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedHOAI2021, type HOAIFixture } from './seed-hoai2021';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000021021';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: HOAIFixture = await seedHOAI2021(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiHOAI2021Harness__: { harness: Harness; fixture: HOAIFixture } | undefined;
}

globalThis.__ekowaiHOAI2021Harness__ = { harness, fixture };

export function getHOAI2021Harness(): { harness: Harness; fixture: HOAIFixture } {
  if (!globalThis.__ekowaiHOAI2021Harness__) throw new Error('HOAI-2021 harness not initialised');
  return globalThis.__ekowaiHOAI2021Harness__;
}
