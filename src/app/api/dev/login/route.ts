import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { defaultLocale } from '@/lib/i18n/config';

// Dev-only: signs in a user without sending email.
// Uses admin API to mint a magic-link token, then verifies it server-side
// so session cookies are set directly. No round-trip through Supabase's
// verify endpoint, no rate limit.
//
// Gated on DEV_AUTOLOGIN_EMAIL being set. Real production deployments must
// NOT set this var. Preview/test deployments that intentionally want a
// no-auth tester URL set the var to a fixed dev account email.
export async function GET(request: NextRequest) {
  if (!process.env.DEV_AUTOLOGIN_EMAIL) {
    return NextResponse.json({ error: 'dev login disabled' }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const searchParams = requestUrl.searchParams;
  // Always use the env-configured email. Ignoring any ?email= query param
  // prevents arbitrary impersonation of org owners or platform engineers
  // by anyone who can reach a preview URL.
  const email = process.env.DEV_AUTOLOGIN_EMAIL;
  const locale = searchParams.get('locale') ?? defaultLocale;
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

  const target = next && next.startsWith('/') ? next : `/${locale}/verify`;
  return NextResponse.redirect(`${origin}${target}`);
}
