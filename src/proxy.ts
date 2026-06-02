import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from '@/lib/i18n/config';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
});

// Segment-anchored so a path like /de/projects/login-form-builder does NOT
// match — `.includes('/login')` would let any private route impersonate a
// public one and bypass the auth redirect.
const AUTH_ROUTE_RE = /^\/(de|en)\/(login|verify|profile-setup)(\/|$)/;
const LEGAL_ROUTE_RE = /^\/(de|en)\/legal(\/|$)/;
const LOCALE_ROOT_RE = /^\/(de|en)\/?$/;

export async function proxy(request: NextRequest) {
  // First: locale routing (rewrites/redirects to ensure /de or /en prefix)
  const intlResponse = intlMiddleware(request);

  // Then: refresh Supabase session
  const { response: supaResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isPublicRoute =
    pathname === '/' ||
    AUTH_ROUTE_RE.test(pathname) ||
    LEGAL_ROUTE_RE.test(pathname) ||
    LOCALE_ROOT_RE.test(pathname);

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    const localeMatch = pathname.match(/^\/(de|en)/);
    const locale = localeMatch?.[1] ?? defaultLocale;

    // Dev escape hatch: if DEV_AUTOLOGIN_EMAIL is set, bounce through
    // /api/dev/login instead of /login. Hard-gated on non-production
    // VERCEL_ENV so a misconfigured prod with this var set cannot activate
    // the bypass (src/env.ts also throws at boot, but VERCEL_ENV check is
    // belt-and-suspenders for the edge runtime).
    const autoEmail = process.env.DEV_AUTOLOGIN_EMAIL;
    if (autoEmail && process.env.VERCEL_ENV !== 'production') {
      const target = new URL(`${url.origin}/api/dev/login`);
      target.searchParams.set('email', autoEmail);
      target.searchParams.set('locale', locale);
      target.searchParams.set('next', pathname + url.search);
      return NextResponse.redirect(target);
    }

    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  // Merge refreshed Supabase Set-Cookie headers onto the intl response so the
  // session cookie rotation isn't lost when next-intl returns its own
  // response. Without this the session is rebuilt every request, causing
  // extra load and occasional 401s on the token-rotation boundary.
  for (const cookie of supaResponse.cookies.getAll()) {
    intlResponse.cookies.set(cookie);
  }
  return intlResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|icons|fonts|api|auth).*)'],
};
