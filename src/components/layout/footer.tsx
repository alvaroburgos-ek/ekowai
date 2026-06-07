import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { FileText, Shield, Scale } from 'lucide-react';

export async function Footer({ locale }: { locale: 'de' | 'en' }) {
  const t = await getTranslations('footer');
  return (
    <footer className="mt-12 sm:mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 sm:gap-6 text-center sm:text-left">
        <div className="text-xs text-subtext">
          © {new Date().getFullYear()} · EKOWAI · Bemessung nach DWA-A-201
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-body text-subtext">
          <Link
            href={`/${locale}/legal/impressum`}
            className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
          >
            <FileText className="size-3.5" aria-hidden />
            {t('impressum')}
          </Link>
          <Link
            href={`/${locale}/legal/datenschutz`}
            className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
          >
            <Shield className="size-3.5" aria-hidden />
            {t('datenschutz')}
          </Link>
          <Link
            href={`/${locale}/legal/agb`}
            className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
          >
            <Scale className="size-3.5" aria-hidden />
            {t('agb')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
