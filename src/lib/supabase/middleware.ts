import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { env } from '@/env';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // BYPASS_AUTH: skip Supabase entirely, hand back a stub user so the
  // root middleware's auth-redirect treats the request as authenticated.
  // Test deployments only — never set in real production.
  if (env.BYPASS_AUTH && env.BYPASS_AUTH_USER_ID) {
    return { response, user: makeStubUser(env.BYPASS_AUTH_USER_ID) };
  }

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mutate cookies in place on the single response instance. The
          // previous version rebuilt `response` on every setAll call, which
          // dropped cookies set by an earlier call when @supabase/ssr writes
          // chunked session cookies (.0/.1) across multiple setAll batches.
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Refresh session if expired — IMPORTANT
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

function makeStubUser(id: string): User {
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'bypass@dev.local',
    app_metadata: { provider: 'bypass' },
    user_metadata: {},
    created_at: new Date(0).toISOString(),
  } as User;
}
