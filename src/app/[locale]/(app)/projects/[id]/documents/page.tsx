import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { listProjectDocuments } from '@/lib/db/queries/documents';
import { UploadDialog } from '@/components/documents/upload-dialog';
import { DocumentList } from '@/components/documents/document-list';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations('documents');

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!project) notFound();

  const docs = await listProjectDocuments(id);

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
          <h2 className="text-2xl">{t('title')}</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtext tabular-nums">
            {String(docs.length).padStart(2, '0')}
          </span>
        </div>
        <UploadDialog projectId={id} />
        <DocumentList docs={docs} />
      </section>
    </article>
  );
}
