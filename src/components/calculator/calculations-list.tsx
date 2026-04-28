import Link from 'next/link';
import { listCalculationsForProject } from '@/lib/actions/calculation';
import { getTranslations } from 'next-intl/server';

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
    return <p className="text-slate-600 text-sm">{t('noCalcs')}</p>;
  }
  return (
    <ul className="space-y-2">
      {calcs.map((c) => (
        <li key={c.id} className="border border-slate-200 rounded p-3 hover:bg-slate-50">
          <Link
            href={`/${locale}/projects/${projectId}/calc/${c.id}`}
            className="font-medium text-slate-900"
          >
            {c.name}
          </Link>
          <div className="text-xs text-slate-600">
            {c.regulationCode} {c.regulationVersion} · {c.worksheetId} · {c.complianceStatus}
          </div>
        </li>
      ))}
    </ul>
  );
}
