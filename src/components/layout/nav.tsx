import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from './locale-switcher';

export async function Nav({ locale }: { locale: 'de' | 'en' }) {
  const t = await getTranslations('nav');
  return (
    <header className="border-b border-hairline bg-paper/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-6">
        <Link
          href={`/${locale}/projects`}
          className="group flex items-baseline gap-3 text-ink"
        >
          <span className="font-display text-xl tracking-tight" style={{ fontVariationSettings: '"opsz" 32, "SOFT" 30' }}>
            EKOWAI
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtext border border-hairline px-1.5 py-0.5">
            Wizard · MVP-1
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
            className="hover:text-ink underline-offset-[6px] decoration-hairline-strong hover:decoration-accent decoration-1 hover:underline transition-colors"
          >
            {t('inbox')}
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
