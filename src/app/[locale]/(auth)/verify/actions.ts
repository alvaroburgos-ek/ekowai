'use server';

import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { orgs, orgMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const orgSchema = z.object({
  name: z.string().min(2).max(100),
  locale: z.enum(['de', 'en']),
});

export async function createFirstOrg(formData: FormData): Promise<void> {
  const parsed = orgSchema.safeParse({
    name: formData.get('name'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) {
    redirect('/');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${parsed.data.locale}/login`);
  }

  // Check if user already belongs to an org (idempotency)
  const existing = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, user.id));
  if (existing.length > 0) {
    redirect(`/${parsed.data.locale}/projects`);
  }

  const slug =
    parsed.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 6);

  const [newOrg] = await db
    .insert(orgs)
    .values({
      name: parsed.data.name,
      slug,
    })
    .returning({ id: orgs.id });

  await db.insert(orgMembers).values({
    orgId: newOrg.id,
    userId: user.id,
    role: 'owner',
  });

  redirect(`/${parsed.data.locale}/projects`);
}
