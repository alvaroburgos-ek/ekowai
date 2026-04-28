'use server';

import { createClient } from '@/lib/supabase/server';
import { env } from '@/env';
import { z } from 'zod';

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
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/${parsed.data.locale}/verify`,
    },
  });

  if (error) {
    return { ok: false, error: 'send_failed' as const };
  }
  return { ok: true } as const;
}
