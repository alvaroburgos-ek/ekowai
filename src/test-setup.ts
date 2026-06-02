import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Stub the env vars that src/env.ts validates so transitive imports of
// modules like `@/lib/db` or `@/components/pdf/letterhead-header` (which
// reach `env`) don't crash the suite during module-eval. Real values come
// from .env in dev/prod — these stubs are inert URLs the test code never
// hits.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';
process.env.DATABASE_URL ??= 'postgresql://test@localhost:5432/test';

// `@/lib/db` instantiates a postgres connection at module-eval time AND
// reads `env.DATABASE_URL`, which t3-env treats as server-only and rejects
// in the happy-dom test environment. Replace the module with a thin stub
// so client-component render tests can transitively import server actions
// without triggering the env guard. Real DB access is covered by the
// `integration` vitest project which runs under node env.
vi.mock('@/lib/db', () => ({
  db: new Proxy(
    {},
    {
      get() {
        throw new Error(
          '`db` is not available in unit tests — move this test to the integration project or stub the call site.',
        );
      },
    },
  ),
}));
