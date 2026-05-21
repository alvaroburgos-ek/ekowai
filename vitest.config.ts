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
          environment: 'happy-dom',
          setupFiles: ['./src/test-setup.ts'],
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
