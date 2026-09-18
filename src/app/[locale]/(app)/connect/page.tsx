import { env } from '@/env';
import { CopyField } from './copy-field';

/**
 * Setup instructions for connecting an MCP client to EKOWAI.
 *
 * Copy is inlined per locale rather than pulled from the message catalogue on
 * purpose: this page ships independently of the wider i18n rework, and the
 * strings are specific enough that the catalogue would gain little.
 */
const COPY = {
  de: {
    title: 'EKOWAI mit Claude verbinden',
    intro:
      'Verbinde Claude mit EKOWAI und arbeite im Chat an deinen Projekten: Angaben aus einer Kundenmail in die Arbeitsblätter übertragen, den Stand einer Norm abfragen, Projekte anlegen. Claude handelt dabei in deinem Namen und sieht genau das, was du auch in der App siehst.',
    urlHeading: 'Server-Adresse',
    urlNote:
      'Diese Adresse brauchst du in beiden Varianten unten.',
    copy: 'Kopieren',
    copied: 'Kopiert',
    codeHeading: 'Claude Code',
    codeStep:
      'Führe den Befehl im Projektordner aus. Danach einmal /mcp eingeben, ekowai auswählen und Authenticate wählen.',
    desktopHeading: 'Claude Desktop und Claude im Browser',
    desktopSteps: [
      'Einstellungen öffnen und zu Connectors wechseln.',
      'Add custom connector wählen.',
      'Als Namen EKOWAI eintragen und die Server-Adresse von oben einfügen.',
      'Auf Connect klicken — es öffnet sich die Anmeldung.',
      'Mit deinem EKOWAI-Konto anmelden und den Zugriff bestätigen.',
    ],
    afterHeading: 'Danach',
    after:
      'Claude zeigt die EKOWAI-Werkzeuge an. Ein guter erster Test: frag nach deinen Projekten. Angaben aus Kundenmails übernimmt Claude mit dem wörtlichen Zitat als Quelle und markiert sie als Kundenangabe; bei mehrdeutigen Angaben schreibt es nichts, sondern hinterlegt eine Rückfrage am Feld.',
    securityHeading: 'Zugriff',
    security:
      'Die Verbindung gilt nur für dein Konto und lässt sich jederzeit in den Einstellungen von Claude wieder trennen. Genehmigen und Finalisieren von Arbeitsblättern bleibt deine Entscheidung — Claude tut das nur, wenn du es ausdrücklich verlangst.',
  },
  en: {
    title: 'Connect EKOWAI to Claude',
    intro:
      'Connect Claude to EKOWAI and work on your projects from the chat: transfer figures from a client email into the worksheets, ask where a standard stands, create projects. Claude acts as you and sees exactly what you see in the app.',
    urlHeading: 'Server address',
    urlNote: 'You need this address for both options below.',
    copy: 'Copy',
    copied: 'Copied',
    codeHeading: 'Claude Code',
    codeStep:
      'Run the command in your project folder. Then type /mcp once, select ekowai and choose Authenticate.',
    desktopHeading: 'Claude Desktop and Claude in the browser',
    desktopSteps: [
      'Open Settings and go to Connectors.',
      'Choose Add custom connector.',
      'Enter EKOWAI as the name and paste the server address from above.',
      'Click Connect — the sign-in page opens.',
      'Sign in with your EKOWAI account and approve the access.',
    ],
    afterHeading: 'After that',
    after:
      'Claude will list the EKOWAI tools. A good first test: ask for your projects. Figures taken from client emails are saved with the verbatim quote as their source and marked as client-supplied; where a figure is ambiguous Claude writes nothing and leaves a question on the field instead.',
    securityHeading: 'Access',
    security:
      'The connection applies to your account only and can be removed at any time in Claude’s settings. Approving and finalising worksheets stays your decision — Claude only does it when you explicitly ask.',
  },
} as const;

export default async function ConnectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = COPY[locale === 'en' ? 'en' : 'de'];
  const mcpUrl = `${env.NEXT_PUBLIC_APP_URL}/api/mcp`;
  const cliCommand = `claude mcp add --transport http ekowai ${mcpUrl}`;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-xl font-medium text-ink">{t.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">{t.intro}</p>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-ink">{t.urlHeading}</h2>
        <p className="mt-1 text-xs text-subtext">{t.urlNote}</p>
        <div className="mt-3">
          <CopyField value={mcpUrl} label={t.copy} copiedLabel={t.copied} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-ink">{t.codeHeading}</h2>
        <p className="mt-1 text-xs leading-relaxed text-subtext">{t.codeStep}</p>
        <div className="mt-3">
          <CopyField value={cliCommand} label={t.copy} copiedLabel={t.copied} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-ink">{t.desktopHeading}</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-2">
          {t.desktopSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="mt-8 rounded border border-ink/10 bg-paper-2/50 p-4">
        <h2 className="text-sm font-medium text-ink">{t.afterHeading}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{t.after}</p>
      </section>

      <section className="mt-4 rounded border border-ink/10 p-4">
        <h2 className="text-sm font-medium text-ink">{t.securityHeading}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{t.security}</p>
      </section>
    </main>
  );
}
