import Link from 'next/link';
import {
  BookMarked,
  Plus,
  ArrowRight,
  ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listProjectStandardsWithWorksheets } from '@/lib/db/queries/standards';
import { ProjectStandardsLayers } from '@/components/worksheet/project-standards-layers';
import { isVsmeReport } from '@/lib/db/queries/is-vsme-report';
import { loadVsmeSummary } from '@/lib/db/queries/vsme-summary';
import { ReportOverview } from '@/components/vsme/report-overview';

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const localeTyped = (locale === 'en' ? 'en' : 'de') as 'de' | 'en';

  if (await isVsmeReport(id)) {
    const summary = await loadVsmeSummary(id);
    return <ReportOverview projectId={id} locale={localeTyped} summary={summary} />;
  }

  const standardsWithWs = await listProjectStandardsWithWorksheets(id);

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="inline-flex items-center gap-2 min-w-0">
            <BookMarked className="size-5 text-accent-2 shrink-0" aria-hidden />
            <h2 className="text-xl font-semibold text-ink break-words">
              Regelwerke + Arbeitsblätter
            </h2>
          </div>
          <Link
            href={`/${localeTyped}/projects/${id}/standards`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-subtext hover:text-accent-2 transition-colors shrink-0"
          >
            Regelwerke verwalten
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        <ProjectStandardsLayers
          projectId={id}
          locale={localeTyped}
          standards={standardsWithWs}
        />
        {standardsWithWs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-hairline-strong bg-paper-2/40 p-10 text-center space-y-4">
            <div
              className="mx-auto inline-flex items-center justify-center size-12 rounded-full"
              style={{ background: 'var(--eko-gradient-soft)' }}
            >
              <BookMarked className="size-6 text-accent-2" aria-hidden />
            </div>
            <p className="text-sm text-subtext">Noch keine Regelwerke aktiviert.</p>
            <Link href={`/${localeTyped}/projects/${id}/standards`}>
              <Button size="sm">
                <Plus aria-hidden />
                Erstes Regelwerk hinzufügen
              </Button>
            </Link>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="inline-flex items-center gap-2">
          <ScrollText className="size-5 text-accent-2" aria-hidden />
          <h2 className="text-xl font-semibold text-ink">Auditprotokoll</h2>
        </div>
        <Link href={`/${localeTyped}/projects/${id}/audit`}>
          <Button variant="ghost" size="sm">
            Auditprotokoll ansehen
            <ArrowRight aria-hidden />
          </Button>
        </Link>
      </section>
    </div>
  );
}
