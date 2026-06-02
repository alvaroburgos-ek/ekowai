'use server';

import { createClient } from '@/lib/supabase/server';
import { env } from '@/env';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

/** Build the OAuth callback origin from the actual request, with the static
 * NEXT_PUBLIC_APP_URL as fallback. The request-derived origin is essential on
 * Vercel preview deploys where every push produces a new preview URL — using
 * the static env var would send Supabase back to a stale URL. */
async function callbackOrigin(): Promise<string> {
  const h = await headers();
  const forwardedProto = h.get('x-forwarded-proto');
  const forwardedHost = h.get('x-forwarded-host');
  const host = forwardedHost ?? h.get('host');
  if (host) {
    const proto = forwardedProto ?? (host.startsWith('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  return env.NEXT_PUBLIC_APP_URL;
}

const passwordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  locale: z.enum(['de', 'en']),
});

export async function signInWithPassword(formData: FormData): Promise<
  | { ok: true }
  | { ok: false; error: 'invalid_credentials' | 'invalid_input' | 'send_failed'; message?: string }
> {
  const parsed = passwordSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) return { ok: false, error: 'invalid_input' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    if (error.status === 400 || error.message.toLowerCase().includes('invalid')) {
      return { ok: false, error: 'invalid_credentials' };
    }
    return { ok: false, error: 'send_failed', message: error.message };
  }

  return { ok: true };
}

const googleSchema = z.object({ locale: z.enum(['de', 'en']) });

export async function signInWithGoogle(formData: FormData): Promise<never> {
  const { locale } = googleSchema.parse({ locale: formData.get('locale') ?? 'de' });
  const supabase = await createClient();
  const origin = await callbackOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=/${locale}/verify`,
    },
  });
  if (error || !data.url) redirect(`/${locale}/login?error=auth_callback`);
  redirect(data.url);
}
