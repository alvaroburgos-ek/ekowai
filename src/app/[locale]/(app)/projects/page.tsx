import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listProjectsForUser } from '@/lib/actions/project';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('projects');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = user ? await listProjectsForUser(user.id) : [];

  return (
    <section className="space-y-10">
      {/* Editorial header */}
      <header className="border-b border-hairline pb-8 mb-2">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-subtext mb-3">
              Sektion 01 · Übersicht
            </div>
            <h1 className="text-3xl lg:text-4xl font-semibold text-ink tracking-tight">
              {t('title')}
            </h1>
            <p className="mt-4 text-[11px] text-subtext tabular-nums">
              {String(items.length).padStart(2, '0')} {items.length === 1 ? 'Eintrag' : 'Einträge'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/${locale}/projects/archive`}>
              <Button variant="ghost" size="sm">
                {t('archiveLink')}
              </Button>
            </Link>
            <Link href={`/${locale}/projects/new`}>
              <Button>+ {t('newProject')}</Button>
            </Link>
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="py-20 text-center space-y-5">
          <div className="text-5xl font-light text-hairline-strong select-none">○</div>
          <div>
            <p className="text-sm text-ink-2 mb-4">{t('noProjects')}</p>
            <Link href={`/${locale}/projects/new`}>
              <Button size="sm">+ {t('newProject')}</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p, i) => (
            <Link
              key={p.id}
              href={`/${locale}/projects/${p.id}`}
              className="list-item group relative flex flex-col gap-3 p-5 border border-hairline rounded-md bg-paper hover:border-hairline-strong hover:bg-paper-2/40 transition-all"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-md opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: 'var(--eko-gradient)' }} />
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] tabular-nums text-subtext">
                  {String(i + 1).padStart(3, '0')}
                </span>
                {p.location && (
                  <span className="text-[9px] uppercase tracking-[0.15em] text-subtext/70 truncate max-w-[80px]">
                    {p.location}
                  </span>
                )}
              </div>
              <div className="text-base font-semibold text-ink group-hover:text-accent-2 transition-colors leading-snug flex-1">
                {p.name}
              </div>
              <div className="text-xs text-subtext truncate">{p.clientName ?? '—'}</div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
