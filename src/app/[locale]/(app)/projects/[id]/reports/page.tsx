import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { listReportArchivesForProject } from '@/lib/db/queries/report-archives';
import { ReportsHistory } from '@/components/projects/reports-history';
import Link from 'next/link';

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!project) notFound();

  const archives = await listReportArchivesForProject(id);

  return (
    <article className="space-y-8">
      <header className="border-b border-hairline pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-subtext mb-1">
          Projekt · {project.id.slice(0, 8)}
        </div>
        <h1 className="text-3xl font-semibold text-ink tracking-tight">
          {project.name}
        </h1>
        <div className="mt-2 flex items-center gap-4">
          <Link
            href={`/${locale}/projects/${id}`}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtext hover:text-ink inline-block"
          >
            ← Zurück zum Projekt
          </Link>
          <a
            href={`/api/projects/${id}/report/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent underline"
          >
            Aktuellen Bericht öffnen (Live-PDF)
          </a>
        </div>
      </header>

      <section className="grid gap-6 max-w-3xl">
        <div className="flex items-baseline justify-between border-b border-hairline pb-2">
          <h2 className="text-2xl">Berichtsverlauf</h2>
        </div>
        <ReportsHistory entries={archives} projectId={id} />
      </section>
    </article>
  );
}
