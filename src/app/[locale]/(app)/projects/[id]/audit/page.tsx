import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { loadProjectAuditTimeline } from '@/lib/db/queries/audit';
import { AuditTimeline } from '@/components/worksheet/audit-timeline';
import { BackLink } from '@/components/ui/back-link';

export default async function ProjectAuditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id, locale } = await params;
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();

  const entries = await loadProjectAuditTimeline(id, 200);

  return (
    <article className="space-y-6 sm:space-y-8 max-w-4xl">
      <BackLink href={`/${locale}/projects/${id}`} label="Zurück zur Projektübersicht" />
      <header className="border-b border-hairline pb-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-subtext mb-2">
          Projekt {project.id.slice(0, 8)}
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight break-words">
          Auditprotokoll · {project.name}
        </h1>
        <div className="mt-2 text-xs text-subtext">
          {entries.length} Einträge · neueste zuerst · max. 200 angezeigt
        </div>
      </header>
      <AuditTimeline entries={entries} />
    </article>
  );
}
