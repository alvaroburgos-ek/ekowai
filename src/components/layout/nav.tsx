import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from './locale-switcher';

export async function Nav({ locale }: { locale: 'de' | 'en' }) {
  const t = await getTranslations('nav');
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-5xl mx-auto p-4 flex items-center justify-between">
        <Link href={`/${locale}/projects`} className="font-semibold text-slate-900">
          EKOWAI Wizard
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-700">
          <Link href={`/${locale}/projects`} className="hover:text-slate-900">
            {t('projects')}
          </Link>
          <Link href={`/${locale}/org`} className="hover:text-slate-900">
            {t('org')}
          </Link>
          <LocaleSwitcher current={locale} />
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="hover:text-slate-900">
              {t('logout')}
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
