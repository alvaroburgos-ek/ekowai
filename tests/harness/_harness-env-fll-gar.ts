/**
 * FLL-GAR full-project harness bootstrap — MUST be the first import in a GAR
 * verify test. Mirrors _harness-env-fll.ts but seeds the GENERIC full-project
 * FLL-GAR-2023 fixture (all 29 worksheets) via seedFllGar, so any worksheet's
 * fields can be driven through the real saveWorksheet path.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f5';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: SeededFllGarFixture = await seedFllGar(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiFllGarHarness__: { harness: Harness; fixture: SeededFllGarFixture } | undefined;
}

globalThis.__ekowaiFllGarHarness__ = { harness, fixture };

export function getFllGarHarness(): { harness: Harness; fixture: SeededFllGarFixture } {
  if (!globalThis.__ekowaiFllGarHarness__) throw new Error('FLL-GAR harness not initialised');
  return globalThis.__ekowaiFllGarHarness__;
}
