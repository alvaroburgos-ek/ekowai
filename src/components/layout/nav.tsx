import Link from 'next/link';
import Image from 'next/image';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { calculations, orgMembers } from '@/lib/db/schema';
import { LocaleSwitcher } from './locale-switcher';
import { NavLinks } from './nav-links';

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
    <header className="border-b border-hairline bg-paper/95 backdrop-blur-md sticky top-0 z-30 shadow-[0_1px_12px_0_rgba(26,42,30,0.06)]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <Link href={`/${locale}/projects`} className="group flex items-center">
          <Image
            src="/images/brand/logo-ekowai.svg"
            alt="EKOWAI"
            width={110}
            height={32}
            priority
            unoptimized
            className="object-contain"
          />
        </Link>
        <nav className="flex items-center gap-7 font-body">
          <NavLinks
            locale={locale}
            links={[
              { href: `/${locale}/projects`, label: t('projects') },
              { href: `/${locale}/inbox`, label: t('inbox'), badge: pending },
              { href: `/${locale}/org`, label: t('org') },
            ]}
          />
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
