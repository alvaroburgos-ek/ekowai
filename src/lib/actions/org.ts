'use server';

import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/env';
import { db } from '@/lib/db';
import { orgMembers, profiles } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/client';
import { inviteTemplate } from '@/lib/email/templates';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'engineer', 'viewer']),
  locale: z.enum(['de', 'en']),
  orgId: z.string().uuid(),
});

export async function inviteMember(formData: FormData): Promise<void> {
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
    locale: formData.get('locale'),
    orgId: formData.get('orgId'),
  });
  if (!parsed.success) redirect('/');

  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  // Verify caller is owner/admin of the SPECIFIC org named in the form.
  // Previously this picked an arbitrary first membership, which on a
  // multi-org user could let an admin in org A invite someone into org B
  // where the caller is only a viewer.
  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(
      and(eq(orgMembers.userId, user.id), eq(orgMembers.orgId, parsed.data.orgId)),
    )
    .limit(1);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    redirect(`/${parsed.data.locale}/org`);
  }

  // Generate invite link via admin client — does NOT send email, returns action_link
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'invite',
    email: parsed.data.email,
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/${parsed.data.locale}/verify`,
    },
  });
  if (error || !data.user) redirect(`/${parsed.data.locale}/org`);

  // Upsert membership row — handles re-invite of an already-invited user gracefully
  await db
    .insert(orgMembers)
    .values({ orgId: membership.orgId, userId: data.user.id, role: parsed.data.role })
    .onConflictDoUpdate({
      target: [orgMembers.orgId, orgMembers.userId],
      set: { role: parsed.data.role },
    });

  // Send branded invite email via Resend (graceful no-op if RESEND_API_KEY not set)
  // Must await before redirect() — redirect() throws and aborts execution immediately
  await sendEmail({
    to: parsed.data.email,
    ...inviteTemplate({ inviteUrl: data.properties.action_link, locale: parsed.data.locale }),
  });

  revalidatePath(`/${parsed.data.locale}/org`);
  redirect(`/${parsed.data.locale}/org`);
}

export async function listOrgMembers(orgId: string) {
  // Verify the caller is a member of the org before returning member PII.
  // `db` bypasses RLS so this guard is the real access control.
  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [callerMembership] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, user.id)))
    .limit(1);
  if (!callerMembership) return [];

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
