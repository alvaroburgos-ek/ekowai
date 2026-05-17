'use server';

import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const schema = z.object({
  fullName: z.string().min(2).max(100),
  locale: z.enum(['de', 'en']),
});

export async function saveProfile(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    fullName: formData.get('fullName'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${parsed.data.locale}/login`);

  await db
    .update(profiles)
    .set({ fullName: parsed.data.fullName.trim() })
    .where(eq(profiles.id, user.id));

  redirect(`/${parsed.data.locale}/projects`);
}
