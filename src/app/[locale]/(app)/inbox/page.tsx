import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { listInbox } from '@/lib/actions/approval';

export default async function InboxPage({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('approval');
  const items = await listInbox();

  return (
    <article className="space-y-10">
      <header className="border-b border-hairline pb-8">
        <div className="text-[10px] uppercase tracking-[0.25em] text-subtext mb-2">
          Sektion 03 · Zur Prüfung
        </div>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-ink">
          {t('inboxTitle')}
        </h1>
        <p className="mt-3 text-[11px] tabular-nums text-subtext">
          {String(items.length).padStart(2, '0')}{' '}
          {items.length === 1 ? 'Eintrag' : 'Einträge'}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="border border-dashed border-hairline-strong p-12 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-subtext mb-3">
            ⌬ Eingang leer
          </p>
          <p className="text-xl font-semibold text-ink-2 tracking-tight">{t('inboxEmpty')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-hairline border-y border-hairline">
          {items.map((c, i) => (
            <li key={c.id} className="group">
              <Link
                href={`/${locale}/projects/${c.projectId}/calc/${c.id}`}
                className="grid grid-cols-12 gap-4 px-2 py-4 items-baseline hover:bg-paper-2/50 transition-colors"
              >
                <span className="col-span-1 text-[11px] tabular-nums text-subtext">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="col-span-6 text-base font-semibold text-ink group-hover:text-accent-2 transition-colors tracking-tight">
                  {c.name}
                </span>
                <span className="col-span-3 text-[11px] uppercase tracking-[0.15em] text-subtext">
                  {c.regulationCode} · {c.worksheetId}
                </span>
                <span className="col-span-2 text-[10px] uppercase tracking-[0.2em] text-right text-accent-2">
                  ● In Prüfung
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
