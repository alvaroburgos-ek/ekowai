import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { listProjectStandards, listStandards } from '@/lib/db/queries/standards';
import { StandardsPicker } from '@/components/worksheet/standards-picker';

export default async function ProjectStandardsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id, locale } = await params;
  const localeTyped = locale === 'en' ? 'en' : 'de';
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();

  const [available, active] = await Promise.all([
    listStandards(),
    listProjectStandards(id),
  ]);

  return (
    <article className="space-y-8 max-w-3xl">
      <header className="border-b border-hairline pb-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-subtext mb-2">
          Projekt {project.id.slice(0, 8)}
        </div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">
          Regelwerke · {project.name}
        </h1>
      </header>
      <StandardsPicker
        projectId={id}
        locale={localeTyped}
        available={available.map((s) => ({
          id: s.id, code: s.code, titleDe: s.titleDe, titleEn: s.titleEn, version: s.version,
        }))}
        active={active.map((a) => ({
          projectStandardId: a.projectStandardId,
          standard: {
            id: a.standard.id,
            code: a.standard.code,
            titleDe: a.standard.titleDe,
            titleEn: a.standard.titleEn,
            version: a.standard.version,
          },
        }))}
      />
    </article>
  );
}
