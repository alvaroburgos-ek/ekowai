import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const nextConfig: NextConfig = {
  // Production build type-checks against a build-only tsconfig that excludes
  // non-shipped test/harness files. Root tsconfig.json (and `pnpm typecheck`)
  // still cover everything; this only prevents pre-existing test-file type
  // errors from blocking deploys. App code is fully type-checked in the build.
  typescript: {
    tsconfigPath: 'tsconfig.build.json',
  },
};

export default withNextIntl(nextConfig);
