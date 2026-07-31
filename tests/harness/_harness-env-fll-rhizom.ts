/**
 * FLL-TP-RHIZOM harness environment bootstrap — MUST be the first import in the
 * rhizom verify test. Mirrors _harness-env-fll.ts but seeds the WHOLE
 * FLL-TP-RHIZOM-2023 standard (all 21 worksheets) via seedFllRhizom so a verify
 * agent can drive ANY worksheet's chain / gate through the REAL saveWorksheet +
 * checkApprovalGate path against a disposable embedded Postgres.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedFllRhizom, type SeededRhizomFixture } from './seed-fll-rhizom';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f3';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: SeededRhizomFixture = await seedFllRhizom(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiFllRhizomHarness__: { harness: Harness; fixture: SeededRhizomFixture } | undefined;
}

globalThis.__ekowaiFllRhizomHarness__ = { harness, fixture };

export function getFllRhizomHarness(): { harness: Harness; fixture: SeededRhizomFixture } {
  if (!globalThis.__ekowaiFllRhizomHarness__) throw new Error('FLL Rhizom harness not initialised');
  return globalThis.__ekowaiFllRhizomHarness__;
}
