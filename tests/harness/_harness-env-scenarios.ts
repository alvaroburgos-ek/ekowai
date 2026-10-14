/** MUST be the first import of scenarios.integration.test.ts (sets DATABASE_URL + BYPASS_AUTH before @/lib/db loads). */
import { startHarness, type Harness } from './embedded-pg';
import { seedScenarios, type ScenarioHarnessFixture } from './seed-scenarios';

const HARNESS_USER_ID = '00000000-0000-4000-8000-00000000c4c4';
const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
const fixture: ScenarioHarnessFixture = await seedScenarios(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiScenarioHarness__: { harness: Harness; fixture: ScenarioHarnessFixture } | undefined;
}
globalThis.__ekowaiScenarioHarness__ = { harness, fixture };
export function getScenarioHarness() {
  if (!globalThis.__ekowaiScenarioHarness__) throw new Error('scenario harness not initialised');
  return globalThis.__ekowaiScenarioHarness__;
}
