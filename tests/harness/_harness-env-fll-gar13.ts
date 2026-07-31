/**
 * Harness env bootstrap for FLL-GAR-13 verification (copy of _harness-env.ts,
 * swapping seedPltHs01 -> seedFllGar). MUST be the first import in the test.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000001';

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
  var __ekowaiHarnessFllGar13__: { harness: Harness; fixture: SeededFllGarFixture } | undefined;
}

globalThis.__ekowaiHarnessFllGar13__ = { harness, fixture };

export function getHarness(): { harness: Harness; fixture: SeededFllGarFixture } {
  if (!globalThis.__ekowaiHarnessFllGar13__) throw new Error('harness not initialised');
  return globalThis.__ekowaiHarnessFllGar13__;
}
