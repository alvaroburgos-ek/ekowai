import Link from 'next/link';
import { listCalculationsForProject } from '@/lib/actions/calculation';
import { getTranslations } from 'next-intl/server';

const STATUS_LABEL: Record<string, { de: string; en: string; tone: string }> = {
  draft: { de: 'Entwurf', en: 'Draft', tone: 'text-subtext' },
  submitted: { de: 'In Prüfung', en: 'In review', tone: 'text-accent-2' },
  approved: { de: 'Freigegeben', en: 'Approved', tone: 'text-success' },
  rejected: { de: 'Abgelehnt', en: 'Rejected', tone: 'text-error' },
  changes_requested: { de: 'Änderungen erbeten', en: 'Changes requested', tone: 'text-warning' },
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
      <div className="border border-dashed border-hairline-strong p-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtext">
          {t('noCalcs')}
        </p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-hairline border-y border-hairline">
      {calcs.map((c, i) => {
        const status = STATUS_LABEL[c.status];
        return (
          <li key={c.id}>
            <Link
              href={`/${locale}/projects/${projectId}/calc/${c.id}`}
              className="grid grid-cols-12 gap-4 px-2 py-4 items-baseline hover:bg-paper-2/50 transition-colors group"
            >
              <span className="col-span-1 font-mono text-[11px] tabular-nums text-subtext">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="col-span-5 font-display text-base text-ink group-hover:text-accent-2 transition-colors">
                {c.name}
              </span>
              <span className="col-span-3 font-mono text-[11px] text-subtext uppercase tracking-[0.15em]">
                {c.regulationCode} · {c.worksheetId}
              </span>
              <span
                className={`col-span-3 font-mono text-[10px] uppercase tracking-[0.2em] text-right ${status?.tone ?? 'text-subtext'}`}
              >
                {status ? status[locale] : c.status}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
