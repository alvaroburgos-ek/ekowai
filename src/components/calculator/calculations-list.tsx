import Link from 'next/link';
import { listCalculationsForProject } from '@/lib/actions/calculation';
import { getTranslations } from 'next-intl/server';

const STATUS_LABEL: Record<string, { de: string; en: string; tone: string }> = {
  draft: { de: 'Entwurf', en: 'Draft', tone: 'bg-paper-2 text-subtext border border-hairline-strong' },
  submitted: { de: 'In Prüfung', en: 'In review', tone: 'bg-accent-soft/60 text-accent-2 border border-accent/30' },
  approved: { de: 'Freigegeben', en: 'Approved', tone: 'bg-success-soft/60 text-success border border-success/30' },
  rejected: { de: 'Abgelehnt', en: 'Rejected', tone: 'bg-error-soft/60 text-error border border-error/30' },
  changes_requested: { de: 'Änderungen erbeten', en: 'Changes requested', tone: 'bg-warning-soft/60 text-warning border border-warning/30' },
};

export async function CalculationsList({
  projectId,
  locale,
}: {
  projectId: string;
  locale: 'de' | 'en';
}) {
  const t = await getTranslations('calc');
  const calcs = await listCalculationsForProject(projectId);
  if (calcs.length === 0) {
    return (
      <div className="py-14 text-center space-y-4">
        <div className="text-4xl font-light text-hairline-strong select-none">○</div>
        <p className="text-sm text-ink-2">{t('noCalcs')}</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-hairline border-y border-hairline">
      {calcs.map((c, i) => {
        const status = STATUS_LABEL[c.status];
        return (
          <li key={c.id} className="group relative overflow-hidden list-item" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="absolute left-0 top-0 bottom-0 w-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: 'var(--eko-gradient)' }} />
            <Link
              href={`/${locale}/projects/${projectId}/calc/${c.id}`}
              className="grid grid-cols-12 gap-4 px-2 py-4 items-center hover:bg-paper-2/50 transition-colors group"
            >
              <span className="col-span-1 text-[11px] tabular-nums text-subtext">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="col-span-5 font-display text-base text-ink group-hover:text-accent-2 transition-colors">
                {c.name}
              </span>
              <span className="col-span-3 text-[11px] text-subtext uppercase tracking-[0.15em]">
                {c.regulationCode} · {c.worksheetId}
              </span>
              <span className={`col-span-3 flex justify-end`}>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${status?.tone ?? 'text-subtext'}`}>
                  {status ? status[locale] : c.status}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
