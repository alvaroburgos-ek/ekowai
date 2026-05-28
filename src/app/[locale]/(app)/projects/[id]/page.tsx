import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { archiveProject } from '@/lib/actions/project';
import { listProjectStandardsWithWorksheets } from '@/lib/db/queries/standards';
import type { WorksheetStatus } from '@/lib/state-machine';

const STATUS_DOT: Record<WorksheetStatus, string> = {
  draft: 'bg-ink/20',
  submitted_for_review: 'bg-accent-2',
  engineer_approved: 'bg-success',
  final: 'bg-accent',
  deactivated: 'bg-ink/10',
};

const STATUS_LABEL: Record<WorksheetStatus, string> = {
  draft: 'Entwurf',
  submitted_for_review: 'In Prüfung',
  engineer_approved: 'Genehmigt',
  final: 'Final',
  deactivated: 'Deaktiviert',
};

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
    <article className="space-y-12">
      {/* Editorial header */}
      <header className="border-b border-hairline pb-10 mb-2">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-subtext mb-3">
              Projekt · {project.id.slice(0, 8)}
            </div>
            <h1 className="text-3xl lg:text-4xl font-semibold text-ink tracking-tight">
              {project.name}
            </h1>
          </div>
          <div className="flex gap-2 shrink-0 mt-2">
            <Link href={`/${localeTyped}/projects/${id}/edit`}>
              <Button variant="ghost" size="sm">Bearbeiten</Button>
            </Link>
            <form action={archiveAction}>
              <Button type="submit" variant="ghost" size="sm">Archivieren</Button>
            </form>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-hairline pt-6">
          <Meta label={t('client')} value={project.clientName ?? '—'} />
          <Meta label={t('location')} value={project.location ?? '—'} />
          <Meta
            label="Erstellt"
            value={project.createdAt.toLocaleDateString(localeTyped, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          />
        </dl>
      </header>

      <nav className="flex gap-6 border-b border-hairline -mt-6 pb-3">
        <span className="text-[10px] uppercase tracking-[0.2em] py-1 border-b-2 border-ink -mb-[14px]">
          Übersicht
        </span>
        <Link
          href={`/${localeTyped}/projects/${id}/documents`}
          className="text-[10px] uppercase tracking-[0.2em] py-1 text-subtext hover:text-ink"
        >
          Dokumente
        </Link>
        <Link
          href={`/${localeTyped}/projects/${id}/reports`}
          className="text-[10px] uppercase tracking-[0.2em] py-1 text-subtext hover:text-ink"
        >
          Berichtsverlauf
        </Link>
      </nav>

      <section className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
            Regelwerke + Arbeitsblätter
          </h2>
          <Link
            href={`/${localeTyped}/projects/${id}/standards`}
            className="text-xs text-subtext hover:text-ink"
          >
            Regelwerke verwalten →
          </Link>
        </div>

        {standardsWithWs.length === 0 ? (
          <div className="border border-hairline rounded-md p-8 text-center space-y-4">
            <p className="text-sm text-subtext">Noch keine Regelwerke aktiviert.</p>
            <Link href={`/${localeTyped}/projects/${id}/standards`}>
              <Button>Erstes Regelwerk hinzufügen</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {standardsWithWs.map((s) => {
              const total = s.worksheets.length;
              const done = s.worksheets.filter(
                (w) => w.status === 'engineer_approved' || w.status === 'final',
              ).length;
              return (
                <div key={s.standard.id} className="space-y-3">
                  <div className="flex items-baseline justify-between border-b border-hairline pb-2">
                    <div>
                      <h3 className="text-sm font-medium text-ink">{s.standard.code}</h3>
                      <p className="text-xs text-subtext">
                        {s.standard.titleDe} · {s.standard.version}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-subtext tabular-nums">
                      {done} / {total} fertig
                    </span>
                  </div>
                  <ul className="space-y-0.5">
                    {s.worksheets.map((w) => {
                      const status: WorksheetStatus = w.status ?? 'draft';
                      return (
                        <li key={w.templateId}>
                          <Link
                            href={`/${localeTyped}/projects/${id}/standards/${s.standard.code}/worksheets/${w.code}`}
                            className="grid grid-cols-[12px_28px_88px_1fr_auto] items-center gap-3 px-2 py-1.5 text-sm rounded hover:bg-paper-2/50"
                          >
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[status]}`}
                              aria-label={`Status: ${STATUS_LABEL[status]}`}
                            />
                            <span className="text-[10px] text-subtext tabular-nums">
                              {w.phase != null ? `P${w.phase}` : '—'}
                            </span>
                            <span className="text-xs text-subtext tracking-wide">{w.code}</span>
                            <span className="text-ink truncate">{w.titleDe}</span>
                            <span className="text-[10px] text-subtext">
                              {STATUS_LABEL[status]}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
          Auditprotokoll
        </h2>
        <Link href={`/${localeTyped}/projects/${id}/audit`}>
          <Button variant="ghost">Auditprotokoll ansehen →</Button>
        </Link>
      </section>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.2em] text-subtext mb-1">
        {label}
      </dt>
      <dd className="font-display text-lg text-ink">{value}</dd>
    </div>
  );
}
