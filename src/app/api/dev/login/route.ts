import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { defaultLocale } from '@/lib/i18n/config';
import { env } from '@/env';

// Dev-only: signs in a user without sending email.
// Uses admin API to mint a magic-link token, then verifies it server-side
// so session cookies are set directly. No round-trip through Supabase's
// verify endpoint, no rate limit.
// Hard-gated; refuses to run in production.
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled in production' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') ?? process.env.DEV_AUTOLOGIN_EMAIL;
  const locale = searchParams.get('locale') ?? defaultLocale;
  const next = searchParams.get('next');

  if (!email) {
    return NextResponse.json(
      {
        error: 'missing email',
        usage: '/api/dev/login?email=you@example.com&locale=de[&next=/de/projects]',
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/${locale}/verify`,
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
  return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}${target}`);
}
