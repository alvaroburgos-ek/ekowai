import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function Footer({ locale }: { locale: 'de' | 'en' }) {
  const t = await getTranslations('footer');
  return (
    <footer className="border-t border-slate-200 bg-white mt-12">
      <div className="max-w-5xl mx-auto p-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
        <p>© {new Date().getFullYear()} EKOWAI · MVP-1</p>
        <nav className="flex gap-4">
          <Link href={`/${locale}/legal/impressum`} className="hover:text-slate-900">
            {t('impressum')}
          </Link>
          <Link href={`/${locale}/legal/datenschutz`} className="hover:text-slate-900">
            {t('datenschutz')}
          </Link>
          <Link href={`/${locale}/legal/agb`} className="hover:text-slate-900">
            {t('agb')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
