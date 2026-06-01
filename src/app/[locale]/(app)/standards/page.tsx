import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUserIsPlatformEngineer } from '@/lib/auth/platform-engineer';
import { loadStandardsProgress } from '@/lib/db/queries/library';
import { VerificationProgressBar } from '@/components/library/progress-bar';

export const dynamic = 'force-dynamic';

export default async function StandardsLibraryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isPlatformEngineer = await currentUserIsPlatformEngineer();
  if (!isPlatformEngineer) redirect(`/${locale}/projects`);

  const standards = await loadStandardsProgress();

  return (
    <div className="space-y-8">
      <header className="border-b border-hairline pb-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-subtext mb-2">
          Bibliothek
        </div>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">
            Standards-Bibliothek
          </h1>
          <Link
            href={`/${locale}/standards/upload`}
            className="text-sm text-accent hover:underline underline-offset-2"
          >
            + Workbook hochladen
          </Link>
        </div>
        <p className="text-sm text-subtext mt-2 max-w-2xl">
          Alle importierten Standards mit Verifizierungs-Fortschritt. Klick auf eine Zeile, um Worksheets dieses Standards aufzurufen und Felder/Gleichungen gegen die Quellnorm zu bestätigen.
        </p>
      </header>

      {standards.length === 0 ? (
        <p className="text-sm text-subtext">
          Noch keine Standards importiert. Lade ein Pass3c-Workbook hoch.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.18em] text-subtext border-b border-hairline">
              <th className="text-left font-normal py-2">Standard</th>
              <th className="text-left font-normal py-2">Version</th>
              <th className="text-right font-normal py-2">Worksheets</th>
              <th className="text-left font-normal py-2 pl-4">Felder</th>
              <th className="text-left font-normal py-2 pl-4">Gleichungen</th>
              <th className="text-right font-normal py-2 pl-4">Compliance</th>
            </tr>
          </thead>
          <tbody>
            {standards.map((s) => {
              const fieldPct = s.fieldTotal === 0 ? 0 : Math.round((s.fieldVerified / s.fieldTotal) * 100);
              return (
                <tr key={s.id} className="border-b border-hairline last:border-b-0 hover:bg-paper-2/40">
                  <td className="py-3">
                    <Link
                      href={`/${locale}/standards/${s.code}`}
                      className="font-medium text-ink hover:text-accent transition-colors"
                    >
                      <span className="font-mono text-xs mr-2 text-subtext">{s.code}</span>
                      {s.titleDe}
                    </Link>
                  </td>
                  <td className="py-3 text-ink-2 font-mono text-xs">{s.version}{s.issuedYear ? ` (${s.issuedYear})` : ''}</td>
                  <td className="py-3 text-right font-mono tabular-nums text-ink">{s.worksheetCount}</td>
                  <td className="py-3 pl-4">
                    <VerificationProgressBar verified={s.fieldVerified} total={s.fieldTotal} />
                    <span className="ml-2 text-[10px] font-mono tabular-nums text-subtext">{fieldPct}%</span>
                  </td>
                  <td className="py-3 pl-4">
                    <VerificationProgressBar verified={s.equationVerified} total={s.equationTotal} />
                  </td>
                  <td className="py-3 pl-4 text-right font-mono tabular-nums text-ink-2">{s.complianceTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
