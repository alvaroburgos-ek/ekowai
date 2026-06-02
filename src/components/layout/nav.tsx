import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { LogOut } from 'lucide-react';
import { LocaleSwitcher } from './locale-switcher';
import { NavLinks } from './nav-links';
import { db } from '@/lib/db';
import { worksheetInstances, projects, orgMembers } from '@/lib/db/schema';
import { eq, and, inArray, count } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { isPlatformEngineer } from '@/lib/auth/platform-engineer';

async function getPendingReviewCount(): Promise<number> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 0;

  const memberships = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, auth.user.id));
  if (memberships.length === 0) return 0;

  const [row] = await db
    .select({ n: count() })
    .from(worksheetInstances)
    .innerJoin(projects, eq(projects.id, worksheetInstances.projectId))
    .where(and(
      inArray(projects.orgId, memberships.map(m => m.orgId)),
      eq(worksheetInstances.status, 'submitted_for_review'),
    ));
  return Number(row?.n ?? 0);
}

export async function Nav({ locale }: { locale: 'de' | 'en' }) {
  const t = await getTranslations('nav');
  const pending = await getPendingReviewCount();

  // Platform-engineer link — only shown to users on PLATFORM_ENGINEER_EMAILS.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const showLibrary = isPlatformEngineer(user);

  const links = [
    { href: `/${locale}/projects`, label: t('projects'), iconKey: 'projects' },
    { href: `/${locale}/inbox`, label: t('inbox'), badge: pending, iconKey: 'inbox' },
    ...(showLibrary ? [{ href: `/${locale}/standards`, label: 'Bibliothek', iconKey: 'standards' }] : []),
    { href: `/${locale}/org`, label: t('org'), iconKey: 'org' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-paper/80 backdrop-blur-md">
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
        <nav className="flex items-center gap-2 font-body">
          <NavLinks locale={locale} links={links} />
          <span className="mx-2 h-5 w-px bg-hairline" aria-hidden />
          <LocaleSwitcher current={locale} />
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              title={t('logout')}
              aria-label={t('logout')}
              className="inline-flex items-center justify-center rounded-full p-2 text-subtext hover:bg-paper-2 hover:text-ink transition-colors"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
