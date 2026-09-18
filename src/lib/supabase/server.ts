import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient, type User } from '@supabase/supabase-js';
import { env } from '@/env';
import { getMcpAuth } from '@/lib/mcp/auth-context';

function makeBypassUser(id: string): User {
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

export async function createClient() {
  // BYPASS_AUTH: skip cookies() entirely so this works in non-request
  // contexts (vitest tests, scripts). Stubs auth.getUser to return a fake
  // user matching BYPASS_AUTH_USER_ID. Test deployments only.
  // NOTE: bypass mode returns a non-SSR client. Real auth flows
  // (signInWithOtp, exchangeCodeForSession, signOut, ...) will not write
  // session cookies under bypass — only auth checks via getUser() work.
  // env.ts hard-throws if BYPASS_AUTH is set with VERCEL_ENV=production.
  if (env.BYPASS_AUTH && env.BYPASS_AUTH_USER_ID) {
    const client = createSupabaseClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const stub = makeBypassUser(env.BYPASS_AUTH_USER_ID);
    client.auth.getUser = async () => ({ data: { user: stub }, error: null });
    return client;
  }

  // MCP: the request arrived over the MCP endpoint with a Bearer token, so
  // there is no cookie session to read. The route opened an AsyncLocalStorage
  // scope carrying the verified user (src/lib/mcp/auth-context.ts); return a
  // client bound to that identity so the existing server actions resolve the
  // same user they would in the browser. The token is forwarded on every
  // request, so PostgREST and Storage apply this user's RLS policies too.
  const mcpAuth = getMcpAuth();
  if (mcpAuth) {
    const client = createSupabaseClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${mcpAuth.accessToken}` } },
      },
    );
    // The token was already verified against GoTrue when the request came in;
    // stubbing getUser avoids a second roundtrip per action call.
    client.auth.getUser = async () => ({ data: { user: mcpAuth.user }, error: null });
    return client;
  }

  const cookieStore = await cookies();

  const client = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — safe to ignore
          }
        },
      },
    },
  );

  return client;
}
