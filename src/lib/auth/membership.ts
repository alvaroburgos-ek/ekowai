import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  resolveMembership,
  type Membership,
  type OrgRole,
  type ExternalRole,
} from './membership-resolve';

export type { Membership, OrgRole, ExternalRole };

/** Resolve a user's membership using the service-role client (not subject to
 * RLS, so the lookup itself never leaks/limits). Staff resolved first. */
export async function getMembership(userId: string): Promise<Membership> {
  const admin = createAdminClient();
  const { data: org } = await admin
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  const { data: pm } = org
    ? { data: null }
    : await admin
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
  return resolveMembership(
    org ? { role: org.role as OrgRole } : null,
    pm ? { project_id: pm.project_id as string, role: pm.role as ExternalRole } : null,
  );
}

/** Current authenticated user + their membership, or null when unauthenticated. */
export async function getCurrentMembership(): Promise<
  { userId: string; membership: Membership } | null
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { userId: user.id, membership: await getMembership(user.id) };
}

/** For staff-only routes: redirect external members to their portal. */
export async function requireStaff(locale: string): Promise<void> {
  const ctx = await getCurrentMembership();
  if (ctx?.membership?.kind === 'external') redirect(`/${locale}/portal`);
}

/** For portal routes: redirect staff to the app, unauthenticated to login. */
export async function requireExternal(
  locale: string,
): Promise<{ projectId: string; role: ExternalRole }> {
  const ctx = await getCurrentMembership();
  if (!ctx) redirect(`/${locale}/login`);
  if (ctx.membership?.kind !== 'external') redirect(`/${locale}/projects`);
  const m = ctx.membership;
  return { projectId: m.projectId, role: m.role };
}
