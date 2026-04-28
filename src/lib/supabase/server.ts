import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { env } from '@/env';

export async function createClient() {
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

  // BYPASS_AUTH: stub auth.getUser so server components/actions pass auth
  // checks without a real Supabase session. user.id must reference a real
  // org_members row — Drizzle reads via DATABASE_URL bypass RLS but still
  // filter by user.id. Test deployments only.
  if (env.BYPASS_AUTH && env.BYPASS_AUTH_USER_ID) {
    const stub: User = {
      id: env.BYPASS_AUTH_USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'bypass@dev.local',
      app_metadata: { provider: 'bypass' },
      user_metadata: {},
      created_at: new Date(0).toISOString(),
    } as User;
    client.auth.getUser = async () => ({ data: { user: stub }, error: null });
  }

  return client;
}
