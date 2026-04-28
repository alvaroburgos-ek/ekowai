import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { defaultLocale } from '@/lib/i18n/config';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? `/${defaultLocale}/verify`;

  const supabaseError = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');

  if (code && !supabaseError) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const localeMatch = next.match(/^\/(de|en)/);
  const locale = localeMatch?.[1] ?? defaultLocale;
  const url = new URL(`${origin}/${locale}/login`);
  url.searchParams.set('error', errorCode || supabaseError || 'auth_callback');
  if (errorDescription) {
    url.searchParams.set('error_description', errorDescription);
  }
  return NextResponse.redirect(url);
}
