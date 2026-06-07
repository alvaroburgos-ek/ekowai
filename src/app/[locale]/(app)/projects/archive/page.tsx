import { createClient } from '@/lib/supabase/server';
import { listArchivedProjectsForUser, unarchiveProject } from '@/lib/actions/project';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { BackLink } from '@/components/ui/back-link';

export default async function ArchivedProjectsPage({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('projects');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const items = user ? await listArchivedProjectsForUser(user.id) : [];

  return (
    <section className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4 sm:gap-6 border-b border-hairline pb-6">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.25em] text-subtext mb-2">
            Sektion 04 · Archiv
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-ink tracking-tight">
            {t('archiveTitle')}
          </h1>
          <p className="mt-3 text-[11px] text-subtext tabular-nums">
            {String(items.length).padStart(2, '0')}{' '}
            {items.length === 1 ? 'Eintrag' : 'Einträge'}
          </p>
        </div>
        <BackLink href={`/${locale}/projects`} label={t('backToActive')} />
      </header>

      {items.length === 0 ? (
        <div className="border border-dashed border-hairline-strong p-12 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-subtext mb-3">
            ⌬ Archiv leer
          </p>
          <p className="text-xl font-semibold text-ink-2 tracking-tight">{t('archiveEmpty')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-hairline border-y border-hairline">
          {items.map((p, i) => {
            const restoreAction = async () => {
              'use server';
              await unarchiveProject(p.id, locale);
            };
            return (
              <li
                key={p.id}
                className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-12 gap-x-3 gap-y-1.5 sm:gap-4 px-2 py-5 sm:items-baseline"
              >
                <span className="self-baseline sm:col-span-1 text-[11px] tabular-nums text-subtext">
                  {String(i + 1).padStart(3, '0')}
                </span>
                <span className="self-baseline sm:col-span-5 text-lg text-ink min-w-0 break-words">
                  {p.name}
                </span>
                <span className="self-baseline col-start-2 sm:col-start-auto sm:col-span-3 text-sm text-subtext truncate min-w-0">
                  {p.clientName ?? '—'}
                </span>
                <span className="self-baseline col-start-2 sm:col-start-auto sm:col-span-2 text-[10px] uppercase tracking-[0.18em] text-subtext sm:text-right">
                  {p.archivedAt
                    ? new Date(p.archivedAt).toLocaleDateString(locale, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
                <span className="row-start-1 col-start-3 sm:row-start-auto sm:col-start-auto sm:col-span-1 text-right">
                  <form action={restoreAction}>
                    <Button type="submit" variant="ghost" size="sm">
                      {t('restore')}
                    </Button>
                  </form>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
