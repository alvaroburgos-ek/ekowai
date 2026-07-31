/**
 * FLL-GAR-07 harness environment bootstrap — MUST be the first import in the
 * FLL-GAR-07 verify test. Mirrors _harness-env-fll.ts but seeds the GENERIC
 * full-project FLL-GAR-2023 fixture (seedFllGar → all 29 worksheets) instead of
 * the single GAR-27 fixture, so the verify agent can drive GAR-07 through the
 * real saveWorksheet path.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f7';

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
  var __ekowaiFllGar07Harness__: { harness: Harness; fixture: SeededFllGarFixture } | undefined;
}

globalThis.__ekowaiFllGar07Harness__ = { harness, fixture };

export function getFllGar07Harness(): { harness: Harness; fixture: SeededFllGarFixture } {
  if (!globalThis.__ekowaiFllGar07Harness__) throw new Error('FLL-GAR-07 harness not initialised');
  return globalThis.__ekowaiFllGar07Harness__;
}
