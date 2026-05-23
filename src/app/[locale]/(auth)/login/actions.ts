'use server';

import { createClient } from '@/lib/supabase/server';
import { env } from '@/env';
import { z } from 'zod';
import { redirect } from 'next/navigation';

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
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/${locale}/verify`,
    },
  });
  if (error || !data.url) redirect(`/${locale}/login?error=auth_callback`);
  redirect(data.url);
}
