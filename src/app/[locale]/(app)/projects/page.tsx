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
      <header className="flex items-end justify-between gap-6 border-b border-hairline pb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-subtext mb-2">
            Sektion 01 · Übersicht
          </div>
          <h1 className="text-4xl lg:text-5xl font-semibold text-ink tracking-tight">
            {t('title')}
          </h1>
          <p className="mt-3 font-mono text-[11px] text-subtext tabular-nums">
            {String(items.length).padStart(2, '0')} {items.length === 1 ? 'Eintrag' : 'Einträge'}
          </p>
        </div>
        <Link href={`/${locale}/projects/new`}>
          <Button>+ {t('newProject')}</Button>
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="border border-dashed border-hairline-strong p-12 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtext mb-3">
            ⌬ Leeres Verzeichnis
          </p>
          <p className="font-display text-xl text-ink-2">{t('noProjects')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-hairline border-y border-hairline">
          {items.map((p, i) => (
            <li key={p.id} className="group">
              <Link
                href={`/${locale}/projects/${p.id}`}
                className="grid grid-cols-12 gap-4 px-2 py-5 items-baseline hover:bg-paper-2/50 transition-colors"
              >
                <span className="col-span-1 font-mono text-[11px] tabular-nums text-subtext">
                  {String(i + 1).padStart(3, '0')}
                </span>
                <span className="col-span-7 font-display text-lg text-ink group-hover:text-accent-2 transition-colors">
                  {p.name}
                </span>
                <span className="col-span-3 text-sm text-ink-2 truncate">{p.clientName ?? '—'}</span>
                <span className="col-span-1 font-mono text-[10px] text-subtext text-right uppercase tracking-[0.15em]">
                  {p.location ? p.location.slice(0, 8) : '—'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
