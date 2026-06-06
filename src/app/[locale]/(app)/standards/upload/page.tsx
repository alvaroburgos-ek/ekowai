import { redirect } from 'next/navigation';
import { currentUserIsPlatformEngineer } from '@/lib/auth/platform-engineer';
import { WorkbookUploadForm } from '@/components/library/workbook-upload-form';
import { BackLink } from '@/components/ui/back-link';

export const dynamic = 'force-dynamic';

export default async function WorkbookUploadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isPlatformEngineer = await currentUserIsPlatformEngineer();
  if (!isPlatformEngineer) redirect(`/${locale}/projects`);
  const localeTyped = locale === 'en' ? 'en' : 'de';

  return (
    <div className="space-y-6">
      <BackLink href={`/${locale}/standards`} label="Zurück zur Bibliothek" />

      <header className="border-b border-hairline pb-6 space-y-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-subtext">Bibliothek · Upload</div>
        <h1 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight">Pass3c-Workbook hochladen</h1>
        <p className="text-sm text-subtext max-w-2xl">
          Datei auswählen → automatische Validierung und Vorschau → Bestätigung führt den eigentlichen Import aus. Bereits verifizierte Felder, deren Inhalt sich ändert, werden zur erneuten Prüfung zurückgesetzt.
        </p>
      </header>

      <WorkbookUploadForm locale={localeTyped} />
    </div>
  );
}
