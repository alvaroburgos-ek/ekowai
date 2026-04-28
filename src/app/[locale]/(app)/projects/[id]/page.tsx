import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { archiveProject } from '@/lib/actions/project';
import { CalculationsList } from '@/components/calculator/calculations-list';

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
      <header className="border-b border-hairline pb-8">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-subtext">
              Projekt · {project.id.slice(0, 8)}
            </div>
            <h1
              className="font-display text-4xl lg:text-5xl text-ink leading-tight"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40' }}
            >
              {project.name}
            </h1>
          </div>
          <div className="flex gap-2 shrink-0 mt-2">
            <Link href={`/${localeTyped}/projects/${id}/edit`}>
              <Button variant="ghost" size="sm">
                Bearbeiten
              </Button>
            </Link>
            <form action={archiveAction}>
              <Button type="submit" variant="ghost" size="sm">
                Archivieren
              </Button>
            </form>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
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

      {/* Calculations section */}
      <section className="space-y-5">
        <div className="flex items-end justify-between border-b border-hairline pb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-subtext mb-1">
              Sektion 02
            </div>
            <h2 className="font-display text-2xl text-ink">{t('calculations')}</h2>
          </div>
          <Link href={`/${localeTyped}/projects/${id}/calc/new`}>
            <Button size="sm">+ {t('newCalc')}</Button>
          </Link>
        </div>
        <CalculationsList projectId={id} locale={localeTyped} />
      </section>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtext mb-1">
        {label}
      </dt>
      <dd className="font-display text-lg text-ink">{value}</dd>
    </div>
  );
}
