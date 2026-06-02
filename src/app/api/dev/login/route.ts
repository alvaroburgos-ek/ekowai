import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { defaultLocale, locales } from '@/lib/i18n/config';
import { env } from '@/env';

// Local-path allowlist for the `next` param. Must start with /de/ or /en/
// and the next char must not be / or \ (blocks `//attacker.tld`).
const SAFE_NEXT_RE = /^\/(de|en)\/[^/\\]/;

// Dev-only: signs in a user without sending email.
// Uses admin API to mint a magic-link token, then verifies it server-side
// so session cookies are set directly. No round-trip through Supabase's
// verify endpoint, no rate limit.
//
// Gated on DEV_AUTOLOGIN_EMAIL being set AND VERCEL_ENV != production. Real
// production deployments must NOT set this var; the env.ts boot guard +
// this runtime guard form defense in depth.
export async function GET(request: NextRequest) {
  if (!env.DEV_AUTOLOGIN_EMAIL || process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ error: 'dev login disabled' }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const searchParams = requestUrl.searchParams;
  // Always use the env-configured email. Ignoring any ?email= query param
  // prevents arbitrary impersonation of org owners or platform engineers
  // by anyone who can reach a preview URL.
  const email = env.DEV_AUTOLOGIN_EMAIL;
  const rawLocale = searchParams.get('locale') ?? defaultLocale;
  const locale = (locales as readonly string[]).includes(rawLocale)
    ? rawLocale
    : defaultLocale;
  const next = searchParams.get('next');

  if (!email) {
    return NextResponse.json(
      { error: 'missing DEV_AUTOLOGIN_EMAIL env var' },
      { status: 500 },
    );
  }

  const admin = createAdminClient();
  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${origin}/${locale}/verify`,
    },
  });

  if (linkError || !data.properties?.hashed_token) {
    return NextResponse.json(
      { error: linkError?.message ?? 'no hashed_token returned' },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: data.properties.hashed_token,
  });

  if (verifyError) {
    return NextResponse.json(
      { error: verifyError.message, hint: 'token_hash verification failed' },
      { status: 500 },
    );
  }

  const target = next && SAFE_NEXT_RE.test(next) ? next : `/${locale}/verify`;
  return NextResponse.redirect(`${origin}${target}`);
}
