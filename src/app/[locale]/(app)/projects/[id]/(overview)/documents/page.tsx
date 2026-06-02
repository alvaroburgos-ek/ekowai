import { getTranslations } from 'next-intl/server';
import { FileText } from 'lucide-react';
import { listProjectDocuments } from '@/lib/db/queries/documents';
import { UploadDialog } from '@/components/documents/upload-dialog';
import { DocumentList } from '@/components/documents/document-list';

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('documents');

  const docs = await listProjectDocuments(id);

  return (
    <section className="space-y-6 max-w-3xl">
      <div className="flex items-end justify-between gap-4">
        <div className="inline-flex items-center gap-2">
          <FileText className="size-5 text-accent-2" aria-hidden />
          <h2 className="text-xl font-semibold text-ink">{t('title')}</h2>
        </div>
        <span className="text-xs text-subtext tabular-nums">
          {docs.length} {docs.length === 1 ? 'Dokument' : 'Dokumente'}
        </span>
      </div>
      <UploadDialog projectId={id} />
      <DocumentList docs={docs} />
    </section>
  );
}
