import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listArchivedProjectsForUser, unarchiveProject } from '@/lib/actions/project';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';

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
      <header className="flex items-end justify-between gap-6 border-b border-hairline pb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-subtext mb-2">
            Sektion 04 · Archiv
          </div>
          <h1 className="text-3xl lg:text-4xl font-semibold text-ink tracking-tight">
            {t('archiveTitle')}
          </h1>
          <p className="mt-3 text-[11px] text-subtext tabular-nums">
            {String(items.length).padStart(2, '0')}{' '}
            {items.length === 1 ? 'Eintrag' : 'Einträge'}
          </p>
        </div>
        <Link href={`/${locale}/projects`}>
          <Button variant="ghost" size="sm">
            ← {t('backToActive')}
          </Button>
        </Link>
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
              <li key={p.id} className="grid grid-cols-12 gap-4 px-2 py-5 items-baseline">
                <span className="col-span-1 text-[11px] tabular-nums text-subtext">
                  {String(i + 1).padStart(3, '0')}
                </span>
                <span className="col-span-5 text-lg text-ink">{p.name}</span>
                <span className="col-span-3 text-sm text-subtext truncate">
                  {p.clientName ?? '—'}
                </span>
                <span className="col-span-2 text-[10px] uppercase tracking-[0.18em] text-subtext text-right">
                  {p.archivedAt
                    ? new Date(p.archivedAt).toLocaleDateString(locale, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
                <span className="col-span-1 text-right">
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
