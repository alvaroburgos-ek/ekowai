import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { orgMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createFirstOrg } from './actions';

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { locale } = await params;
  const { token_hash, type } = await searchParams;
  const t = await getTranslations('auth');

  const supabase = await createClient();

  // Step A: if token_hash present, verify it (first-time clicking magic link)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'email',
      token_hash,
    });
    if (error) {
      return (
        <Card className="p-8">
          <p className="text-red-700">{t('linkExpired')}</p>
        </Card>
      );
    }
    // Strip query params and re-render to fall through to org check
    redirect(`/${locale}/verify`);
  }

  // Step B: confirm session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Step C: check if user has an org. If yes → projects. If no → org-create form.
  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, user.id));

  if (memberships.length > 0) {
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
