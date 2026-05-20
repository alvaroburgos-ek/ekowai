import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { archiveProject } from '@/lib/actions/project';

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
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] py-1 border-b-2 border-ink -mb-[14px]">
          Übersicht
        </span>
        <Link
          href={`/${localeTyped}/projects/${id}/documents`}
          className="font-mono text-[10px] uppercase tracking-[0.2em] py-1 text-subtext hover:text-ink"
        >
          Dokumente
        </Link>
        <Link
          href={`/${localeTyped}/projects/${id}/reports`}
          className="font-mono text-[10px] uppercase tracking-[0.2em] py-1 text-subtext hover:text-ink"
        >
          Berichtsverlauf
        </Link>
      </nav>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
          Regelwerke + Arbeitsblätter
        </h2>
        <Link href={`/${localeTyped}/projects/${id}/standards`}>
          <Button variant="ghost">Regelwerke verwalten →</Button>
        </Link>
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
