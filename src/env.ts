import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    DATABASE_URL: z.string().url(),
    DEV_AUTOLOGIN_EMAIL: z.string().email().optional(),
    BYPASS_AUTH: z.enum(['1', 'true']).optional(),
    BYPASS_AUTH_USER_ID: z.string().uuid().optional(),
    GROQ_API_KEY: z.string().min(1).optional(),
    DEEPSEEK_API_KEY: z.string().min(1).optional(),
    KIMI_API_KEY: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    DEV_AUTOLOGIN_EMAIL: process.env.DEV_AUTOLOGIN_EMAIL,
    BYPASS_AUTH: process.env.BYPASS_AUTH,
    BYPASS_AUTH_USER_ID: process.env.BYPASS_AUTH_USER_ID,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    KIMI_API_KEY: process.env.KIMI_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});

// Hard guard: BYPASS_AUTH stubs out auth and would let any request act as
// the configured user. Fail the build/boot if it ever reaches Vercel
// production. typeof window check keeps the throw server-only.
if (
  typeof window === 'undefined' &&
  env.BYPASS_AUTH &&
  process.env.VERCEL_ENV === 'production'
) {
  throw new Error(
    'BYPASS_AUTH is set in Vercel production. Remove BYPASS_AUTH and ' +
      'BYPASS_AUTH_USER_ID from the production environment — this flag is ' +
      'for preview/test deployments only.',
  );
}
