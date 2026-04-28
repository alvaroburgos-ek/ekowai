import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isAuthRoute =
    pathname.includes('/login') || pathname.includes('/verify');
  const isPublicRoute = pathname === '/' || isAuthRoute;

  // Block access to (app) routes when not logged in
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/de/login'; // default locale, locale handling refined in Task 12
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
