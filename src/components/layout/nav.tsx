import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from './locale-switcher';

export async function Nav({ locale }: { locale: 'de' | 'en' }) {
  const t = await getTranslations('nav');
  return (
    <header className="border-b bg-white">
      <div className="max-w-5xl mx-auto p-4 flex items-center justify-between">
        <Link href={`/${locale}/projects`} className="font-semibold">
          EKOWAI Wizard
        </Link>
        <nav className="flex items-center gap-4">
          <Link href={`/${locale}/projects`}>{t('projects')}</Link>
          <Link href={`/${locale}/org`}>{t('org')}</Link>
          <LocaleSwitcher current={locale} />
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-sm text-slate-600">
              {t('logout')}
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
