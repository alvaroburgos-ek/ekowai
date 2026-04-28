import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function Footer({ locale }: { locale: 'de' | 'en' }) {
  const t = await getTranslations('footer');
  return (
    <footer className="border-t border-hairline mt-20">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-baseline justify-between gap-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-subtext">
          © {new Date().getFullYear()} · EKOWAI · Bemessung nach DWA-A-201
        </div>
        <nav className="flex flex-wrap gap-6 text-xs font-body text-subtext">
          <Link href={`/${locale}/legal/impressum`} className="hover:text-ink transition-colors">
            {t('impressum')}
          </Link>
          <Link
            href={`/${locale}/legal/datenschutz`}
            className="hover:text-ink transition-colors"
          >
            {t('datenschutz')}
          </Link>
          <Link href={`/${locale}/legal/agb`} className="hover:text-ink transition-colors">
            {t('agb')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
