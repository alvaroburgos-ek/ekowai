/**
 * FLL harness environment bootstrap — MUST be the first import in the FLL
 * integration test. Mirrors _harness-env.ts (top-level-await) but seeds the
 * FLL-GAR-27 fixture instead of PLT-HS-01, so the FLL test needs no 138 rows.
 *
 * It brings up a disposable embedded Postgres, points DATABASE_URL at it, enables
 * BYPASS_AUTH, applies the app schema, seeds FLL-GAR-27, and exposes the handle on
 * a dedicated global so it cannot collide with the 138 harness global.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar27, type SeededGar27Fixture } from './seed-fll-gar27';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f1';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: SeededGar27Fixture = await seedFllGar27(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiFllHarness__: { harness: Harness; fixture: SeededGar27Fixture } | undefined;
}

globalThis.__ekowaiFllHarness__ = { harness, fixture };

export function getFllHarness(): { harness: Harness; fixture: SeededGar27Fixture } {
  if (!globalThis.__ekowaiFllHarness__) throw new Error('FLL harness not initialised');
  return globalThis.__ekowaiFllHarness__;
}
