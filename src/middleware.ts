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
  const isPublicRoute = pathname === '/' || isAuthRoute;

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    const localeMatch = pathname.match(/^\/(de|en)/);
    const locale = localeMatch?.[1] ?? defaultLocale;
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
