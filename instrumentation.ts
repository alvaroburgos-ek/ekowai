import * as Sentry from '@sentry/nextjs';

export function register() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? 'development',
  });
}

export const onRequestError = Sentry.captureRequestError;
