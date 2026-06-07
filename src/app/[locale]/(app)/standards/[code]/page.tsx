import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUserIsPlatformEngineer } from '@/lib/auth/platform-engineer';
import { loadWorksheetsProgress } from '@/lib/db/queries/library';
import { VerificationProgressBar } from '@/components/library/progress-bar';
import { BackLink } from '@/components/ui/back-link';

export const dynamic = 'force-dynamic';

export default async function StandardDetailPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  const isPlatformEngineer = await currentUserIsPlatformEngineer();
  if (!isPlatformEngineer) redirect(`/${locale}/projects`);

  const data = await loadWorksheetsProgress(code);
  if (!data) notFound();
  const { standard, worksheets } = data;

  const totals = worksheets.reduce(
    (acc, w) => ({
      fieldTotal: acc.fieldTotal + w.fieldTotal,
      fieldVerified: acc.fieldVerified + w.fieldVerified,
      equationTotal: acc.equationTotal + w.equationTotal,
      equationVerified: acc.equationVerified + w.equationVerified,
    }),
    { fieldTotal: 0, fieldVerified: 0, equationTotal: 0, equationVerified: 0 },
  );

  return (
    <div className="space-y-8">
      <BackLink href={`/${locale}/standards`} label="Zurück zur Bibliothek" />

      <header className="border-b border-hairline pb-6 space-y-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-subtext break-words">
          {standard.code} · v{standard.version}
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight break-words">{standard.titleDe}</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">Felder</span>
            <VerificationProgressBar verified={totals.fieldVerified} total={totals.fieldTotal} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">Gleichungen</span>
            <VerificationProgressBar verified={totals.equationVerified} total={totals.equationTotal} />
          </div>
        </div>
      </header>

      {worksheets.length === 0 ? (
        <p className="text-sm text-subtext">Dieser Standard hat noch keine Worksheets.</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {worksheets.map((w) => (
            <li key={w.id} className="py-3">
              <Link
                href={`/${locale}/standards/${code}/worksheets/${w.code}`}
                className="block hover:bg-paper-2/40 -mx-2 px-2 py-1 rounded transition-colors"
              >
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-mono text-xs text-subtext shrink-0">{w.code}</span>
                  <span className="font-medium text-ink flex-1 min-w-0 break-words">{w.titleDe}</span>
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
                    {w.fieldTotal > 0 && (
                      <VerificationProgressBar verified={w.fieldVerified} total={w.fieldTotal} label="F" />
                    )}
                    {w.equationTotal > 0 && (
                      <VerificationProgressBar verified={w.equationVerified} total={w.equationTotal} label="Gl" />
                    )}
                    {w.complianceTotal > 0 && (
                      <span className="text-[11px] font-mono tabular-nums text-ink-2">
                        {w.complianceTotal} <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">REQ</span>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
