import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Pencil,
  Archive,
  Building2,
  MapPin,
  CalendarDays,
  FolderKanban,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { archiveProject } from '@/lib/actions/project';
import { ProjectTabs } from '@/components/projects/project-tabs';
import { isVsmeReport } from '@/lib/db/queries/is-vsme-report';

export default async function OverviewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const localeTyped = (locale === 'en' ? 'en' : 'de') as 'de' | 'en';
  const t = await getTranslations('projects');

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();

  const isVsme = await isVsmeReport(id);

  const archiveAction = async () => {
    'use server';
    await archiveProject(id, localeTyped);
  };

  return (
    <article className="space-y-8">
      <header className="rounded-2xl border border-hairline bg-paper shadow-soft p-5 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 sm:gap-6 flex-wrap">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <div
              className="inline-flex items-center justify-center size-10 sm:size-12 rounded-2xl shrink-0"
              style={{ background: 'var(--eko-gradient-soft)' }}
            >
              <FolderKanban className="size-6 text-accent-2" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-subtext">Projekt · {project.id.slice(0, 8)}</div>
              <h1 className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-semibold text-ink tracking-tight break-words">
                {project.name}
              </h1>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/${localeTyped}/projects/${id}/edit`}>
              <Button variant="ghost" size="sm" aria-label="Bearbeiten">
                <Pencil aria-hidden />
                <span className="hidden sm:inline">Bearbeiten</span>
              </Button>
            </Link>
            <form action={archiveAction}>
              <Button type="submit" variant="ghost" size="sm" aria-label="Archivieren">
                <Archive aria-hidden />
                <span className="hidden sm:inline">Archivieren</span>
              </Button>
            </form>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <Meta icon={<Building2 className="size-4" aria-hidden />} label={t('client')} value={project.clientName ?? '—'} />
          <Meta icon={<MapPin className="size-4" aria-hidden />} label={t('location')} value={project.location ?? '—'} />
          <Meta
            icon={<CalendarDays className="size-4" aria-hidden />}
            label="Erstellt"
            value={project.createdAt.toLocaleDateString(localeTyped, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          />
        </dl>
      </header>

      <ProjectTabs locale={localeTyped} projectId={id} isVsme={isVsme} />

      <div>{children}</div>
    </article>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-paper-2/60 px-4 py-3">
      <dt className="inline-flex items-center gap-1.5 text-xs text-subtext">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-display text-base text-ink">{value}</dd>
    </div>
  );
}
