import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { UserRoundPlus } from 'lucide-react';
import { currentUserIsPlatformEngineer } from '@/lib/auth/platform-engineer';
import { createClient } from '@/lib/supabase/server';
import { listLeads, loadLeadStatusCounts } from '@/lib/db/queries/leads';
import { isLeadFilter, type LeadFilter } from '@/lib/types/lead';
import { LeadRow } from './lead-row';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const FILTERS: LeadFilter[] = ['new', 'contacted', 'converted', 'archived', 'all'];

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  if (!(await currentUserIsPlatformEngineer())) redirect(`/${locale}/projects`);

  const { status } = await searchParams;
  const filter: LeadFilter = isLeadFilter(status) ? status : 'new';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? '';

  const t = await getTranslations('leads');
  const [counts, rows] = await Promise.all([
    loadLeadStatusCounts(),
    listLeads(filter === 'all' ? undefined : filter),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-2 max-w-2xl">
        <div className="inline-flex items-center gap-2 text-xs text-subtext">
          <UserRoundPlus className="size-4" aria-hidden />
          <span>{t('eyebrow')}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-ink tracking-tight">
          {t('title')}
        </h1>
        <p className="text-sm text-subtext">{t('subtitle')}</p>
      </header>

      <nav className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap" aria-label={t('title')}>
        {FILTERS.map((f) => {
          const active = f === filter;
          const n = counts[f];
          return (
            <Link
              key={f}
              href={`/${locale}/leads?status=${f}`}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
                active
                  ? 'bg-paper-2 text-ink shadow-soft'
                  : 'text-ink-2 hover:bg-paper-2/60 hover:text-ink',
              )}
            >
              {t(`filter.${f}`)}
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full text-[10px] tabular-nums',
                  active ? 'bg-ink text-paper' : 'bg-paper-3 text-subtext',
                )}
              >
                {n}
              </span>
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline-strong bg-paper-2/40 p-8 sm:p-12 text-center space-y-4">
          <div
            className="mx-auto inline-flex items-center justify-center size-14 rounded-full"
            style={{ background: 'var(--eko-gradient-soft)' }}
          >
            <UserRoundPlus className="size-7 text-accent-2" aria-hidden />
          </div>
          <p className="text-sm text-subtext max-w-md mx-auto">{t(`empty.${filter}`)}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-hairline bg-paper shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-xs text-subtext bg-paper-2/60">
                <th className="text-left font-medium py-3 px-4">{t('col.contact')}</th>
                <th className="text-left font-medium py-3 px-2">{t('col.topic')}</th>
                <th className="text-left font-medium py-3 px-2">{t('col.standard')}</th>
                <th className="text-left font-medium py-3 px-2">{t('col.received')}</th>
                <th className="text-left font-medium py-3 px-2">{t('col.status')}</th>
                <th className="text-left font-medium py-3 px-2">{t('col.owner')}</th>
                <th className="text-right font-medium py-3 px-4">{t('col.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((r) => (
                <LeadRow
                  key={r.id}
                  locale={locale}
                  currentUserId={currentUserId}
                  lead={{
                    id: r.id,
                    name: r.name,
                    email: r.email,
                    company: r.company,
                    phone: r.phone,
                    topic: r.topic,
                    message: r.message,
                    standardCode: r.standardCode,
                    sourcePath: r.sourcePath,
                    source: r.source,
                    status: r.status,
                    claimedByUserId: r.claimedByUserId,
                    claimedByName: r.claimedByName,
                    claimedByEmail: r.claimedByEmail,
                    createdAtIso: r.createdAt.toISOString(),
                    convertedToProjectId: r.convertedToProjectId,
                    convertedProjectName: r.convertedProjectName,
                  }}
                />
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
