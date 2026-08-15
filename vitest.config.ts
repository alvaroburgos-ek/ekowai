import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    // `server-only` ships only inside next/dist/compiled at runtime; in
    // tests it can't be resolved, so map it to an empty stub. Scoped to
    // test.alias (not top-level resolve.alias) so the shim cannot leak
    // into a production build that happens to read this config.
    alias: {
      'server-only': resolve(__dirname, './src/test-shims/server-only.ts'),
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.test.{ts,tsx}'],
          // DB-backed integration tests live under `integration` project — they need
          // a real Postgres and would fail with ECONNREFUSED in the unit CI job.
          exclude: [
            'src/lib/actions/__tests__/worksheet.test.ts',
            'src/lib/actions/__tests__/worksheet-tab6-loading.integration.test.ts',
            'src/lib/actions/__tests__/worksheet-phase4-summary.integration.test.ts',
            'src/lib/actions/__tests__/documents.test.ts',
            'src/lib/actions/__tests__/overrides.test.ts',
            'src/lib/actions/__tests__/co2.integration.test.ts',
            'src/lib/actions/__tests__/co2-lines.integration.test.ts',
            'src/lib/actions/__tests__/vsme-owner.integration.test.ts',
            'src/lib/db/__tests__/documents-schema.test.ts',
            'src/lib/db/__tests__/calculation-snapshots-schema.test.ts',
            'src/lib/db/__tests__/fields-vsme-columns-schema.test.ts',
            'src/lib/db/__tests__/emission-factors-schema.test.ts',
            'src/lib/db/__tests__/is-vsme-report.test.ts',
            'src/lib/db/__tests__/co2-activity-lines-schema.test.ts',
            'src/lib/db/__tests__/project-collaborators-schema.test.ts',
            'src/lib/auth/__tests__/project-access.integration.test.ts',
            'src/lib/db/queries/__tests__/vsme-worklist.integration.test.ts',
            'src/lib/db/queries/__tests__/vsme-summary.integration.test.ts',
            'src/lib/db/queries/__tests__/asm-invariant.integration.test.ts',
            'scripts/vsme/__tests__/seed-vsme.integration.test.ts',
            'src/lib/co2/__tests__/emission-factors.integration.test.ts',
            'src/lib/export/__tests__/vsme-export-data.integration.test.ts',
            'src/app/api/projects/[id]/vsme/__tests__/export-route.integration.test.ts',
          ],
          environment: 'happy-dom',
          setupFiles: ['./src/test-setup.ts'],
          globals: true,
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: [
            // Finding-H real-save-path harness — self-provided embedded Postgres
            // (no external DB required; stands up its own PG binary).
            'tests/harness/*.integration.test.ts',
            'src/lib/actions/__tests__/worksheet.test.ts',
            'src/lib/actions/__tests__/worksheet-tab6-loading.integration.test.ts',
            'src/lib/actions/__tests__/worksheet-phase4-summary.integration.test.ts',
            'src/lib/actions/__tests__/documents.test.ts',
            'src/lib/actions/__tests__/overrides.test.ts',
            'src/lib/actions/__tests__/co2.integration.test.ts',
            'src/lib/actions/__tests__/co2-lines.integration.test.ts',
            'src/lib/actions/__tests__/vsme-owner.integration.test.ts',
            'src/lib/db/__tests__/documents-schema.test.ts',
            'src/lib/db/__tests__/calculation-snapshots-schema.test.ts',
            'src/lib/db/__tests__/fields-vsme-columns-schema.test.ts',
            'src/lib/db/__tests__/emission-factors-schema.test.ts',
            'src/lib/db/__tests__/is-vsme-report.test.ts',
            'src/lib/db/__tests__/co2-activity-lines-schema.test.ts',
            'src/lib/db/__tests__/project-collaborators-schema.test.ts',
            'src/lib/auth/__tests__/project-access.integration.test.ts',
            'src/lib/db/queries/__tests__/vsme-worklist.integration.test.ts',
            'src/lib/db/queries/__tests__/vsme-summary.integration.test.ts',
            'src/lib/db/queries/__tests__/asm-invariant.integration.test.ts',
            'scripts/vsme/__tests__/seed-vsme.integration.test.ts',
            'src/lib/co2/__tests__/emission-factors.integration.test.ts',
            'src/lib/export/__tests__/vsme-export-data.integration.test.ts',
            'src/app/api/projects/[id]/vsme/__tests__/export-route.integration.test.ts',
          ],
          environment: 'node',
          globals: true,
        },
      },
      {
        extends: true,
        test: {
          name: 'rls',
          include: ['tests/rls/**/*.test.ts'],
          environment: 'node',
          globals: true,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/*.config.*', '**/migrations/**', '**/.next/**'],
    },
  },
});
