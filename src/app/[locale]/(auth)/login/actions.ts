'use server';

import { createClient } from '@/lib/supabase/server';
import { env } from '@/env';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const schema = z.object({
  email: z.string().email(),
  locale: z.enum(['de', 'en']),
});

export async function requestMagicLink(formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'invalid_email' as const };
  }

  const supabase = await createClient();
  const redirectTo = `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/${parsed.data.locale}/verify`;
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    console.error('[requestMagicLink] supabase error', {
      message: error.message,
      status: error.status,
      code: (error as { code?: string }).code,
      redirectTo,
    });
    return {
      ok: false,
      error: 'send_failed' as const,
      message: error.message,
    };
  }
  return { ok: true } as const;
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
