import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from '@/lib/i18n/config';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
});

export async function middleware(request: NextRequest) {
  // First: locale routing (rewrites/redirects to ensure /de or /en prefix)
  const intlResponse = intlMiddleware(request);

  // Then: refresh Supabase session
  const { user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isAuthRoute =
    pathname.includes('/login') || pathname.includes('/verify');
  const isLegalRoute = pathname.includes('/legal/');
  const isPublicRoute = pathname === '/' || isAuthRoute || isLegalRoute;

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    const localeMatch = pathname.match(/^\/(de|en)/);
    const locale = localeMatch?.[1] ?? defaultLocale;

    // Dev escape hatch: if DEV_AUTOLOGIN_EMAIL is set, bounce through
    // /api/dev/login instead of /login. Lets engineers + reviewers open any
    // deep link without facing the magic-link flow. Set on preview/test
    // deployments only; real production must NOT set this var.
    const autoEmail = process.env.DEV_AUTOLOGIN_EMAIL;
    if (autoEmail) {
      const target = new URL(`${url.origin}/api/dev/login`);
      target.searchParams.set('email', autoEmail);
      target.searchParams.set('locale', locale);
      target.searchParams.set('next', pathname + url.search);
      return NextResponse.redirect(target);
    }

    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|auth).*)'],
};
