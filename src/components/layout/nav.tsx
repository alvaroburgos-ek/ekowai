import Link from 'next/link';
import Image from 'next/image';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { calculations, orgMembers } from '@/lib/db/schema';
import { LocaleSwitcher } from './locale-switcher';

async function pendingReviewCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const memberships = await db.select().from(orgMembers).where(eq(orgMembers.userId, user.id));
  if (memberships.length === 0) return 0;
  const items = await db
    .select({ id: calculations.id })
    .from(calculations)
    .where(eq(calculations.status, 'submitted'));
  // RLS already scopes to orgs the user belongs to.
  return items.length;
}

export async function Nav({ locale }: { locale: 'de' | 'en' }) {
  const t = await getTranslations('nav');
  const pending = await pendingReviewCount();

  return (
    <header className="border-b border-hairline bg-paper/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <Link
          href={`/${locale}/projects`}
          className="group flex items-center gap-3 text-ink"
        >
          <Image
            src="/images/brand/icon-ekowai.svg"
            alt="EKOWAI"
            width={36}
            height={36}
            priority
            unoptimized
            className="object-contain"
          />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-semibold tracking-tight">EKOWAI</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-subtext mt-0.5">
              Wizard · MVP-1
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-7 text-sm font-body text-ink-2">
          <Link
            href={`/${locale}/projects`}
            className="hover:text-ink underline-offset-[6px] decoration-hairline-strong hover:decoration-accent decoration-1 hover:underline transition-colors"
          >
            {t('projects')}
          </Link>
          <Link
            href={`/${locale}/inbox`}
            className="relative hover:text-ink underline-offset-[6px] decoration-hairline-strong hover:decoration-accent decoration-1 hover:underline transition-colors"
          >
            {t('inbox')}
            {pending > 0 && (
              <span
                aria-label={`${pending} pending`}
                className="absolute -top-2 -right-4 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-accent-2 text-paper font-mono text-[10px] tabular-nums rounded-full"
              >
                {pending}
              </span>
            )}
          </Link>
          <Link
            href={`/${locale}/org`}
            className="hover:text-ink underline-offset-[6px] decoration-hairline-strong hover:decoration-accent decoration-1 hover:underline transition-colors"
          >
            {t('org')}
          </Link>
          <span className="h-4 w-px bg-hairline" aria-hidden />
          <LocaleSwitcher current={locale} />
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="text-subtext hover:text-ink text-xs uppercase tracking-[0.15em] transition-colors"
            >
              {t('logout')}
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
