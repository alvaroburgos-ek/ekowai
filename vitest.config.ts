import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
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
