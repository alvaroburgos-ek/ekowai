import Link from 'next/link';
import {
  BookMarked,
  Plus,
  ArrowRight,
  ScrollText,
  Leaf,
  Clock,
  Calculator,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listProjectStandardsWithWorksheets } from '@/lib/db/queries/standards';
import { ProjectStandardsLayers } from '@/components/worksheet/project-standards-layers';
import { isVsmeReport } from '@/lib/db/queries/is-vsme-report';
import { loadVsmeSummary } from '@/lib/db/queries/vsme-summary';
import { ReportOverview } from '@/components/vsme/report-overview';
import { VsmeExportButton } from '@/components/vsme/vsme-export-button';
import { projectOverviewSections } from '@/components/projects/project-overview-sections';
import { EffortLog } from '@/components/projects/effort-log';
import { listEffortEntries } from '@/lib/actions/effort';
import { OfferPanel } from '@/components/projects/offer-panel';
import { listOffers } from '@/lib/actions/offers';
import { CostEstimatePanel } from '@/components/projects/cost-estimate-panel';
import { listEstimates } from '@/lib/actions/costs';

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const localeTyped = (locale === 'en' ? 'en' : 'de') as 'de' | 'en';

  // VSME is ONE section among many — never an exclusive view. The
  // standards/guidelines list is always rendered; VSME (when the project links
  // it) is surfaced as an ADDITIONAL section here and via its own tabs. A
  // project with both VSME and a DWA guideline shows BOTH, each enterable.
  // (Regression fix: the old `if (isVsmeReport) return <VSME/>` hid the
  // guidelines for any project that also had VSME.)
  const isVsme = await isVsmeReport(id);
  const sections = projectOverviewSections({ isVsme });
  const standardsWithWs = await listProjectStandardsWithWorksheets(id);
  const vsmeSummary = isVsme ? await loadVsmeSummary(id) : null;
  const effort = sections.includes('effort') ? await listEffortEntries(id) : null;
  const offerData = sections.includes('offers') ? await listOffers(id) : null;
  const estimateData = sections.includes('cost-estimates')
    ? await listEstimates(id)
    : null;

  return (
    <div className="space-y-8 sm:space-y-10">
      {sections.includes('standards') && (
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
      )}

      {sections.includes('vsme-report') && vsmeSummary && (
        <section className="space-y-4" data-testid="vsme-report-section">
          <div className="inline-flex items-center gap-2">
            <Leaf className="size-5 text-accent-2" aria-hidden />
            <h2 className="text-xl font-semibold text-ink">
              Nachhaltigkeitsbericht (VSME)
            </h2>
          </div>
          <ReportOverview projectId={id} locale={localeTyped} summary={vsmeSummary} />
          <VsmeExportButton projectId={id} locale={localeTyped} />
        </section>
      )}

      {sections.includes('effort') && effort && (
        <section className="space-y-4" data-testid="effort-section">
          <div className="inline-flex items-center gap-2">
            <Clock className="size-5 text-accent-2" aria-hidden />
            <h2 className="text-xl font-semibold text-ink">Aufwandserfassung</h2>
          </div>
          <EffortLog
            projectId={id}
            entries={effort.entries}
            totalHours={effort.totalHours}
          />
        </section>
      )}

      {sections.includes('offers') && offerData && (
        <section className="space-y-4" data-testid="offers-section">
          <div className="inline-flex items-center gap-2">
            <Calculator className="size-5 text-accent-2" aria-hidden />
            <h2 className="text-xl font-semibold text-ink">Angebote (intern)</h2>
          </div>
          <OfferPanel projectId={id} locale={localeTyped} data={offerData} />
        </section>
      )}

      {sections.includes('cost-estimates') && estimateData && (
        <section className="space-y-4" data-testid="cost-estimates-section">
          <div className="inline-flex items-center gap-2">
            <Coins className="size-5 text-accent-2" aria-hidden />
            <h2 className="text-xl font-semibold text-ink">Kostenschätzung</h2>
          </div>
          <CostEstimatePanel projectId={id} locale={localeTyped} data={estimateData} />
        </section>
      )}

      {sections.includes('audit') && (
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
      )}
    </div>
  );
}
