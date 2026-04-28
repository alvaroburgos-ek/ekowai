'use server';

import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { db } from '@/lib/db';
import { orgMembers, profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'engineer', 'viewer']),
  locale: z.enum(['de', 'en']),
});

function adminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function inviteMember(formData: FormData): Promise<void> {
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) redirect('/');

  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  // Verify caller is owner/admin in their org
  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, user.id))
    .limit(1);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    redirect(`/${parsed.data.locale}/org`);
  }

  // Use admin client to invite via Supabase Auth (sends magic-link email)
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/${parsed.data.locale}/verify`,
  });
  if (error || !data.user) redirect(`/${parsed.data.locale}/org`);

  // Add membership row in pending state (role assigned now; activates on first sign-in)
  await db.insert(orgMembers).values({
    orgId: membership.orgId,
    userId: data.user.id,
    role: parsed.data.role,
  });

  revalidatePath(`/${parsed.data.locale}/org`);
  redirect(`/${parsed.data.locale}/org`);
}

export async function listOrgMembers(orgId: string) {
  return db
    .select({
      userId: orgMembers.userId,
      role: orgMembers.role,
      joinedAt: orgMembers.joinedAt,
      email: profiles.email,
      fullName: profiles.fullName,
    })
    .from(orgMembers)
    .innerJoin(profiles, eq(profiles.id, orgMembers.userId))
    .where(eq(orgMembers.orgId, orgId));
}
