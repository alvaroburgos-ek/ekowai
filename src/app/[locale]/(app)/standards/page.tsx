import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Library, Upload, BookOpen } from 'lucide-react';
import { currentUserIsPlatformEngineer } from '@/lib/auth/platform-engineer';
import { loadStandardsProgress } from '@/lib/db/queries/library';
import { VerificationProgressBar } from '@/components/library/progress-bar';
import { Button } from '@/components/ui/button';

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
      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs text-subtext">
            <Library className="size-4" aria-hidden />
            <span>Bibliothek</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-semibold text-ink tracking-tight">
            Standards-Bibliothek
          </h1>
          <p className="text-sm text-subtext">
            Alle importierten Standards mit Verifizierungs-Fortschritt. Klick auf eine Zeile, um Worksheets aufzurufen und Felder/Gleichungen gegen die Quellnorm zu bestätigen.
          </p>
        </div>
        <Link href={`/${locale}/standards/upload`}>
          <Button>
            <Upload aria-hidden />
            Workbook hochladen
          </Button>
        </Link>
      </header>

      {standards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline-strong bg-paper-2/40 p-12 text-center space-y-4">
          <div
            className="mx-auto inline-flex items-center justify-center size-14 rounded-full"
            style={{ background: 'var(--eko-gradient-soft)' }}
          >
            <Library className="size-7 text-accent-2" aria-hidden />
          </div>
          <p className="text-sm text-subtext">
            Noch keine Standards importiert. Lade ein Pass3c-Workbook hoch.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-hairline bg-paper shadow-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-subtext bg-paper-2/60">
                <th className="text-left font-medium py-3 px-4">Standard</th>
                <th className="text-left font-medium py-3 px-2">Version</th>
                <th className="text-right font-medium py-3 px-2">Worksheets</th>
                <th className="text-left font-medium py-3 px-4">Felder</th>
                <th className="text-left font-medium py-3 px-4">Gleichungen</th>
                <th className="text-right font-medium py-3 px-4">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {standards.map((s) => {
                const fieldPct = s.fieldTotal === 0 ? 0 : Math.round((s.fieldVerified / s.fieldTotal) * 100);
                return (
                  <tr key={s.id} className="hover:bg-paper-2/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/${locale}/standards/${s.code}`}
                        className="group inline-flex items-center gap-2.5 text-ink hover:text-accent-2 transition-colors"
                      >
                        <span
                          className="inline-flex items-center justify-center size-8 rounded-lg shrink-0"
                          style={{ background: 'var(--eko-gradient-soft)' }}
                        >
                          <BookOpen className="size-4 text-accent-2" aria-hidden />
                        </span>
                        <span className="flex flex-col">
                          <span className="font-mono text-xs text-subtext">{s.code}</span>
                          <span className="font-medium">{s.titleDe}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-2 text-ink-2 font-mono text-xs">{s.version}{s.issuedYear ? ` (${s.issuedYear})` : ''}</td>
                    <td className="py-3.5 px-2 text-right font-mono tabular-nums text-ink">{s.worksheetCount}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <VerificationProgressBar verified={s.fieldVerified} total={s.fieldTotal} />
                        <span className="text-[11px] font-mono tabular-nums text-subtext">{fieldPct}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <VerificationProgressBar verified={s.equationVerified} total={s.equationTotal} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-ink-2">{s.complianceTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
