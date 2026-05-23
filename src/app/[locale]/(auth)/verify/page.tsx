import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { orgMembers, profiles, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createFirstOrg } from './actions';
import { env } from '@/env';

/** Auto-join the EKOWAI org for whitelisted emails on first login.
 * Idempotent. Finds the org by the pilot project PLT-HS-01 (seeded by
 * scripts/seed-pilot-project.ts), which is reliably the real EKOWAI org —
 * unlike "oldest org by created_at" which can pick up RLS-test residue. */
async function maybeAutoJoinEkowaiOrg(
  userId: string,
  userEmail: string | null | undefined,
): Promise<void> {
  if (!userEmail) return;
  const allowlist = (env.EKOWAI_AUTO_JOIN_OWNERS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  if (!allowlist.includes(userEmail.toLowerCase())) return;

  // Robust org lookup: the pilot project PLT-HS-01 sits inside the real
  // EKOWAI org. If it doesn't exist yet (pre-seed), let the normal
  // create-org form handle it.
  const [pilot] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.projectCode, 'PLT-HS-01'))
    .limit(1);
  if (!pilot?.orgId) return;

  await db
    .insert(orgMembers)
    .values({ orgId: pilot.orgId, userId, role: 'owner' })
    .onConflictDoNothing();
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('auth');

  const supabase = await createClient();

  // Step A: confirm session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Step B: auto-join the EKOWAI org if the user's email is on the owner
  // allowlist. Idempotent — does nothing if the user is already a member.
  await maybeAutoJoinEkowaiOrg(user.id, user.email);

  // Step C: check if user has an org. If yes → projects. If no → org-create form.
  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, user.id));

  if (memberships.length > 0) {
    // Check if the user has set their name — if not, send to profile setup first
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
    if (!profile?.fullName) redirect(`/${locale}/profile-setup`);
    redirect(`/${locale}/projects`);
  }

  return (
    <Card className="p-8 space-y-6">
      <h1 className="text-xl font-semibold">{t('createOrgPrompt')}</h1>
      <form action={createFirstOrg} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <label className="block">
          <span className="text-sm">{t('orgName')}</span>
          <Input name="name" required minLength={2} maxLength={100} autoFocus />
        </label>
        <Button type="submit" className="w-full">
          {t('orgCreate')}
        </Button>
      </form>
    </Card>
  );
}
