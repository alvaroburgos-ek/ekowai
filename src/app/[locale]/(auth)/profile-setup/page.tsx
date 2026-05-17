import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveProfile } from './actions';

export default async function ProfileSetupPage({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('auth');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // If profile already has a name, skip this step
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (profile?.fullName) redirect(`/${locale}/projects`);

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center">
      <Card className="w-full max-w-md p-8 space-y-6 relative">
        {/* Corner ticks */}
        <span aria-hidden className="absolute -top-px -left-px w-4 h-px bg-ink" />
        <span aria-hidden className="absolute -top-px -left-px h-4 w-px bg-ink" />
        <span aria-hidden className="absolute -top-px -right-px w-4 h-px bg-ink" />
        <span aria-hidden className="absolute -top-px -right-px h-4 w-px bg-ink" />
        <span aria-hidden className="absolute -bottom-px -left-px w-4 h-px bg-ink" />
        <span aria-hidden className="absolute -bottom-px -left-px h-4 w-px bg-ink" />
        <span aria-hidden className="absolute -bottom-px -right-px w-4 h-px bg-ink" />
        <span aria-hidden className="absolute -bottom-px -right-px h-4 w-px bg-ink" />

        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-subtext mb-2">
            {t('profileSetupStep')}
          </div>
          <h1 className="font-display text-2xl text-ink">{t('profileSetupTitle')}</h1>
          <p className="mt-2 text-sm text-ink-2">{t('profileSetupLede')}</p>
        </div>

        <form action={saveProfile} className="space-y-6">
          <input type="hidden" name="locale" value={locale} />
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.25em] text-subtext">
              {t('fullName')}
            </span>
            <Input
              name="fullName"
              type="text"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              placeholder={t('fullNamePlaceholder')}
              className="mt-2"
              autoFocus
            />
          </label>
          <Button type="submit" className="w-full">
            {t('profileSave')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
