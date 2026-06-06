import { History, FileDown } from 'lucide-react';
import { listReportArchivesForProject } from '@/lib/db/queries/report-archives';
import { ReportsHistory } from '@/components/projects/reports-history';

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;

  const archives = await listReportArchivesForProject(id);

  return (
    <section className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="inline-flex items-center gap-2">
          <History className="size-5 text-accent-2" aria-hidden />
          <h2 className="text-xl font-semibold text-ink">Berichtsverlauf</h2>
        </div>
        <a
          href={`/api/projects/${id}/report/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-2 transition-colors"
        >
          <FileDown className="size-3.5" aria-hidden />
          Aktuellen Bericht öffnen (Live-PDF)
        </a>
      </div>
      <ReportsHistory entries={archives} projectId={id} />
    </section>
  );
}
