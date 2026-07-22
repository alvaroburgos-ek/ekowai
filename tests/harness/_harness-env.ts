/**
 * Harness environment bootstrap — MUST be the first import in any harness test.
 *
 * Top-level-await module (mirrors src/lib/actions/__tests__/_setup-env.ts): it
 * runs to completion before the test file's other imports are evaluated, so the
 * env vars are in place before @/env (loaded eagerly by @/lib/db and
 * @/lib/supabase/server) freezes them at parse time.
 *
 * Responsibilities:
 *   1. Start a disposable embedded Postgres (real PG binary, NO prod/Docker).
 *   2. Point DATABASE_URL at it and enable BYPASS_AUTH (so saveWorksheet's
 *      auth check resolves to our seeded user without GoTrue). Supabase env
 *      vars get harmless dummy values — bypass mode never contacts Supabase.
 *   3. Apply the app schema and seed the PLT-HS-01-shaped fixture.
 *   4. Expose the harness handle + seeded ids on `globalThis.__ekowaiHarness__`.
 *
 * NO prod credentials, NO prod DB, NO impersonation. Everything is local +
 * disposable and torn down in the test's afterAll.
 */
import { startHarness, type Harness } from './embedded-pg';
import { seedPltHs01, type SeededFixture } from './seed-plt-hs01';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000001';

// 1 + 2: bring up PG, set env BEFORE @/env / @/lib/db are imported anywhere.
const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
// Dummy Supabase env — required by @/env's zod schema; never used under bypass.
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

// 3 + 4: seed + expose.
const fixture: SeededFixture = await seedPltHs01(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiHarness__: { harness: Harness; fixture: SeededFixture } | undefined;
}

globalThis.__ekowaiHarness__ = { harness, fixture };

export function getHarness(): { harness: Harness; fixture: SeededFixture } {
  if (!globalThis.__ekowaiHarness__) throw new Error('harness not initialised');
  return globalThis.__ekowaiHarness__;
}
