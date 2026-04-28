const errors: string[] = [];
const env = process.env;

if (env.VERCEL_ENV === 'production') {
  if (env.DEV_AUTOLOGIN_EMAIL) {
    errors.push(
      'DEV_AUTOLOGIN_EMAIL is set in production — auto-login backdoor would be live.',
    );
  }
  if (env.BYPASS_AUTH) {
    errors.push('BYPASS_AUTH is set in production.');
  }
  if (!env.SENTRY_DSN && !env.NEXT_PUBLIC_SENTRY_DSN) {
    console.warn('[prelaunch] WARN: no Sentry DSN configured.');
  }
  if (!env.LEGAL_REVIEWED) {
    console.warn('[prelaunch] WARN: legal pages still display the draft banner.');
  }
}

if (errors.length > 0) {
  console.error('Production readiness check failed:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

console.log('✓ prod readiness OK');
