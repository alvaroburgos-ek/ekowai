import Link from 'next/link';
import { Archive, Plus, FolderKanban, MapPin, Building2 } from 'lucide-react';
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
    <section className="space-y-8">
      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs text-subtext">
            <FolderKanban className="size-4" aria-hidden />
            <span>{items.length} {items.length === 1 ? 'Projekt' : 'Projekte'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-ink tracking-tight">
            {t('title')}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link href={`/${locale}/projects/archive`}>
            <Button variant="ghost" size="sm" aria-label={t('archiveLink')}>
              <Archive aria-hidden />
              <span className="hidden sm:inline">{t('archiveLink')}</span>
            </Button>
          </Link>
          <Link href={`/${locale}/projects/new`}>
            <Button aria-label={t('newProject')}>
              <Plus aria-hidden />
              <span className="hidden sm:inline">{t('newProject')}</span>
            </Button>
          </Link>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline-strong bg-paper-2/40 py-16 px-6 text-center space-y-5">
          <div
            className="mx-auto inline-flex items-center justify-center size-14 rounded-full"
            style={{ background: 'var(--eko-gradient-soft)' }}
          >
            <FolderKanban className="size-7 text-accent-2" aria-hidden />
          </div>
          <div className="space-y-3">
            <p className="text-sm text-ink-2">{t('noProjects')}</p>
            <Link href={`/${locale}/projects/new`}>
              <Button size="sm">
                <Plus aria-hidden />
                {t('newProject')}
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p, i) => (
            <Link
              key={p.id}
              href={`/${locale}/projects/${p.id}`}
              className="fade-up-item group relative flex flex-col gap-3 p-5 rounded-2xl border border-hairline bg-paper shadow-soft shadow-soft-hover hover:-translate-y-0.5 transition-all"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="inline-flex items-center justify-center size-10 rounded-xl shrink-0"
                  style={{ background: 'var(--eko-gradient-soft)' }}
                >
                  <FolderKanban className="size-5 text-accent-2" aria-hidden />
                </div>
                <span className="text-[10px] tabular-nums text-subtext mt-1">
                  #{String(i + 1).padStart(3, '0')}
                </span>
              </div>
              <div className="text-base font-semibold text-ink group-hover:text-accent-2 transition-colors leading-snug flex-1 break-words min-w-0">
                {p.name}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtext">
                {p.clientName && (
                  <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                    <Building2 className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{p.clientName}</span>
                  </span>
                )}
                {p.location && (
                  <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{p.location}</span>
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
