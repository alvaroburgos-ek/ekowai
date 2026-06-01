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
  FileText,
  History,
  BookMarked,
  Plus,
  ArrowRight,
  ScrollText,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { archiveProject } from '@/lib/actions/project';
import { listProjectStandardsWithWorksheets } from '@/lib/db/queries/standards';
import { ProjectStandardsLayers } from '@/components/worksheet/project-standards-layers';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const localeTyped = (locale === 'en' ? 'en' : 'de') as 'de' | 'en';
  const t = await getTranslations('projects');

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();

  const standardsWithWs = await listProjectStandardsWithWorksheets(id);

  const archiveAction = async () => {
    'use server';
    await archiveProject(id, localeTyped);
  };

  return (
    <article className="space-y-10">
      <header className="rounded-2xl border border-hairline bg-paper shadow-soft p-6 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="inline-flex items-center justify-center size-12 rounded-2xl shrink-0"
              style={{ background: 'var(--eko-gradient-soft)' }}
            >
              <FolderKanban className="size-6 text-accent-2" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-subtext">Projekt · {project.id.slice(0, 8)}</div>
              <h1 className="mt-1 text-3xl lg:text-4xl font-semibold text-ink tracking-tight">
                {project.name}
              </h1>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/${localeTyped}/projects/${id}/edit`}>
              <Button variant="ghost" size="sm">
                <Pencil aria-hidden />
                Bearbeiten
              </Button>
            </Link>
            <form action={archiveAction}>
              <Button type="submit" variant="ghost" size="sm">
                <Archive aria-hidden />
                Archivieren
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

      <nav className="flex gap-1 p-1 rounded-full bg-paper-2 border border-hairline w-fit">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium bg-paper text-ink shadow-soft">
          <FolderKanban className="size-3.5" aria-hidden />
          Übersicht
        </span>
        <Link
          href={`/${localeTyped}/projects/${id}/documents`}
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-subtext hover:text-ink hover:bg-paper/60 transition-colors"
        >
          <FileText className="size-3.5" aria-hidden />
          Dokumente
        </Link>
        <Link
          href={`/${localeTyped}/projects/${id}/reports`}
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-subtext hover:text-ink hover:bg-paper/60 transition-colors"
        >
          <History className="size-3.5" aria-hidden />
          Berichtsverlauf
        </Link>
      </nav>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="inline-flex items-center gap-2">
            <BookMarked className="size-5 text-accent-2" aria-hidden />
            <h2 className="text-xl font-semibold text-ink">
              Regelwerke + Arbeitsblätter
            </h2>
          </div>
          <Link
            href={`/${localeTyped}/projects/${id}/standards`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-subtext hover:text-accent-2 transition-colors"
          >
            Regelwerke verwalten
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        <ProjectStandardsLayers
          projectId={id}
          locale={localeTyped}
          standards={standardsWithWs}
        />
        {standardsWithWs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-hairline-strong bg-paper-2/40 p-10 text-center space-y-4">
            <div
              className="mx-auto inline-flex items-center justify-center size-12 rounded-full"
              style={{ background: 'var(--eko-gradient-soft)' }}
            >
              <BookMarked className="size-6 text-accent-2" aria-hidden />
            </div>
            <p className="text-sm text-subtext">Noch keine Regelwerke aktiviert.</p>
            <Link href={`/${localeTyped}/projects/${id}/standards`}>
              <Button size="sm">
                <Plus aria-hidden />
                Erstes Regelwerk hinzufügen
              </Button>
            </Link>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="inline-flex items-center gap-2">
          <ScrollText className="size-5 text-accent-2" aria-hidden />
          <h2 className="text-xl font-semibold text-ink">Auditprotokoll</h2>
        </div>
        <Link href={`/${localeTyped}/projects/${id}/audit`}>
          <Button variant="ghost" size="sm">
            Auditprotokoll ansehen
            <ArrowRight aria-hidden />
          </Button>
        </Link>
      </section>
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
