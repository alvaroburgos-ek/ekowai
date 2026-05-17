import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';

export default async function Landing({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
}) {
  const { locale } = await params;

  // If signed in, hop into the app (preserves dev autologin convenience).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(`/${locale}/projects`);

  const t = await getTranslations('landing');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Slim public masthead */}
      <header className="border-b border-hairline bg-paper/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <Link href={`/${locale}`} className="flex items-center">
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
          <nav className="flex items-center gap-7 text-sm text-ink-2">
            <Link
              href={`/${locale}/legal/impressum`}
              className="hover:text-ink text-xs uppercase tracking-[0.15em] text-subtext transition-colors"
            >
              {t('nav.about')}
            </Link>
            <Link href={`/${locale}/login`}>
              <Button size="sm">{t('nav.signIn')}</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-24 lg:pt-24 lg:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-8 relative z-10">
            <div className="text-[11px] uppercase tracking-[0.25em] text-subtext">
              {t('hero.tag')}
            </div>
            <h1 className="text-5xl lg:text-7xl font-semibold leading-[0.95] text-ink tracking-tight">
              {t('hero.title.line1')}
              <br />
              {t('hero.title.line2')}
              <br />
              <span className="italic font-medium text-accent-2">{t('hero.title.emphasis')}</span>
            </h1>
            <p className="text-lg text-ink-2 leading-relaxed max-w-lg">{t('hero.lede')}</p>
            <div className="flex flex-wrap gap-3 items-center">
              <Link href={`/${locale}/login`}>
                <Button>{t('hero.cta')}</Button>
              </Link>
              <span className="text-[11px] uppercase tracking-[0.2em] text-subtext">
                {t('hero.ctaMeta')}
              </span>
            </div>
          </div>
          <div className="lg:col-span-6 relative">
            <div className="relative aspect-[4/5] border border-hairline bg-paper-2/40 overflow-hidden">
              <Image
                src="/images/marketing/industrial-park-01.webp"
                alt="Industriepark mit Anlage"
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              {/* Engineering corner ticks */}
              <span aria-hidden className="absolute -top-px -left-px w-4 h-px bg-ink" />
              <span aria-hidden className="absolute -top-px -left-px h-4 w-px bg-ink" />
              <span aria-hidden className="absolute -top-px -right-px w-4 h-px bg-ink" />
              <span aria-hidden className="absolute -top-px -right-px h-4 w-px bg-ink" />
              <span aria-hidden className="absolute -bottom-px -left-px w-4 h-px bg-ink" />
              <span aria-hidden className="absolute -bottom-px -left-px h-4 w-px bg-ink" />
              <span aria-hidden className="absolute -bottom-px -right-px w-4 h-px bg-ink" />
              <span aria-hidden className="absolute -bottom-px -right-px h-4 w-px bg-ink" />
              {/* Caption strip */}
              <div className="absolute bottom-0 inset-x-0 bg-ink/85 backdrop-blur-sm text-paper px-4 py-3 flex items-baseline justify-between text-[10px] uppercase tracking-[0.2em]">
                <span>Fig. 01</span>
                <span className="opacity-70">{t('hero.caption')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Value props — three columns */}
        <section className="border-y border-hairline bg-paper-2/30">
          <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
            <div className="text-[11px] uppercase tracking-[0.25em] text-subtext mb-10">
              {t('values.tag')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
              <ValueProp
                num="01"
                title={t('values.deterministic.title')}
                body={t('values.deterministic.body')}
              />
              <ValueProp
                num="02"
                title={t('values.citations.title')}
                body={t('values.citations.body')}
              />
              <ValueProp
                num="03"
                title={t('values.workflow.title')}
                body={t('values.workflow.body')}
              />
            </div>
          </div>
        </section>

        {/* Imagery grid */}
        <section className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end mb-12">
            <div className="lg:col-span-7 space-y-4">
              <div className="text-[11px] uppercase tracking-[0.25em] text-subtext">
                {t('domain.tag')}
              </div>
              <h2 className="text-3xl lg:text-5xl font-semibold tracking-tight text-ink leading-[1.05]">
                {t('domain.title')}
              </h2>
            </div>
            <div className="lg:col-span-5">
              <p className="text-base text-ink-2 leading-relaxed">{t('domain.body')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile src="/images/marketing/wetlands-floating-01.webp" caption="Wetlands" num="02" />
            <Tile src="/images/marketing/urban-waterfront-01.webp" caption="Urban Waterfront" num="03" />
            <Tile src="/images/marketing/park-pond-01.webp" caption="Park Pond" num="04" />
            <Tile src="/images/marketing/urban-rooftop-01.webp" caption="Urban Rooftop" num="05" />
          </div>
        </section>

        {/* Coverage table */}
        <section className="border-t border-hairline">
          <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-10">
              <div className="lg:col-span-4 space-y-2">
                <div className="text-[11px] uppercase tracking-[0.25em] text-subtext">
                  {t('coverage.tag')}
                </div>
                <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-ink">
                  {t('coverage.title')}
                </h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base text-ink-2 leading-relaxed">{t('coverage.body')}</p>
              </div>
            </div>
            <ul className="divide-y divide-hairline border-y border-hairline">
              <CoverageRow
                code="DWA-A-201"
                version="v3.2"
                worksheet="A201-08"
                title={t('coverage.rows.a201_08')}
                status="live"
                statusLabel={t('coverage.status.live')}
              />
              <CoverageRow
                code="DWA-A-201"
                version="v3.2"
                worksheet="weitere"
                title={t('coverage.rows.a201_more')}
                status="planned"
                statusLabel={t('coverage.status.planned')}
              />
              <CoverageRow
                code="DWA-A-131"
                version="—"
                worksheet="—"
                title={t('coverage.rows.a131')}
                status="planned"
                statusLabel={t('coverage.status.planned')}
              />
              <CoverageRow
                code="DWA-A-202"
                version="—"
                worksheet="—"
                title={t('coverage.rows.a202')}
                status="planned"
                statusLabel={t('coverage.status.planned')}
              />
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-hairline bg-paper-2/40">
          <div className="max-w-4xl mx-auto px-6 py-20 lg:py-28 text-center space-y-8">
            <div className="text-[11px] uppercase tracking-[0.25em] text-subtext">
              {t('cta.tag')}
            </div>
            <h2 className="text-4xl lg:text-6xl font-semibold tracking-tight text-ink leading-[1.05]">
              {t('cta.title')}
            </h2>
            <p className="text-lg text-ink-2 leading-relaxed max-w-2xl mx-auto">{t('cta.body')}</p>
            <div className="flex flex-wrap gap-3 items-center justify-center">
              <Link href={`/${locale}/login`}>
                <Button>{t('cta.button')}</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}

function ValueProp({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="space-y-3">
      <div className="text-xs tabular-nums text-subtext border-b border-hairline pb-2">
        {num}
      </div>
      <h3 className="text-xl font-semibold text-ink tracking-tight">{title}</h3>
      <p className="text-sm text-ink-2 leading-relaxed">{body}</p>
    </div>
  );
}

function Tile({ src, caption, num }: { src: string; caption: string; num: string }) {
  return (
    <div className="relative aspect-[3/4] border border-hairline bg-paper-2/40 overflow-hidden group">
      <Image
        src={src}
        alt={caption}
        fill
        sizes="(min-width: 1024px) 25vw, 50vw"
        className="object-cover group-hover:scale-105 transition-transform duration-700"
      />
      <div className="absolute bottom-0 inset-x-0 bg-ink/80 text-paper px-3 py-2 flex items-baseline justify-between text-[9px] uppercase tracking-[0.2em]">
        <span>Fig. {num}</span>
        <span className="opacity-70">{caption}</span>
      </div>
    </div>
  );
}

function CoverageRow({
  code,
  version,
  worksheet,
  title,
  status,
  statusLabel,
}: {
  code: string;
  version: string;
  worksheet: string;
  title: string;
  status: 'live' | 'planned';
  statusLabel: string;
}) {
  return (
    <li className="grid grid-cols-12 gap-4 px-2 py-4 items-baseline">
      <span className="col-span-2 text-[11px] uppercase tracking-[0.18em] text-subtext">
        {code}
      </span>
      <span className="col-span-1 text-[11px] tabular-nums text-subtext">
        {version}
      </span>
      <span className="col-span-2 text-[11px] text-subtext">{worksheet}</span>
      <span className="col-span-5 text-base text-ink">{title}</span>
      <span
        className={`col-span-2 text-[10px] uppercase tracking-[0.2em] text-right ${
          status === 'live' ? 'text-success' : 'text-subtext'
        }`}
      >
        ● {statusLabel}
      </span>
    </li>
  );
}
