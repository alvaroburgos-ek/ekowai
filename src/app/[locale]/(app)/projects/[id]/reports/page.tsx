import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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

  return (
    <article className="space-y-8">
      <header className="border-b border-hairline pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-subtext mb-1">
          Projekt · {project.id.slice(0, 8)}
        </div>
        <h1 className="text-3xl font-semibold text-ink tracking-tight">
          {project.name}
        </h1>
        <Link
          href={`/${locale}/projects/${id}`}
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtext hover:text-ink mt-1 inline-block"
        >
          ← Zurück zum Projekt
        </Link>
      </header>

      <section className="grid gap-6 max-w-3xl">
        <div className="flex items-baseline justify-between border-b border-hairline pb-2">
          <h2 className="text-2xl">Berichtsverlauf</h2>
        </div>
        <ReportsHistory projectId={id} />
      </section>
    </article>
  );
}
