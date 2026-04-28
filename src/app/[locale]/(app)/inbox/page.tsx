import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
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
    <Card className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('inboxTitle')}</h1>
      {items.length === 0 ? (
        <p className="text-sm text-slate-600">{t('inboxEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li
              key={c.id}
              className="rounded border border-slate-200 p-3 hover:bg-slate-50"
            >
              <Link
                href={`/${locale}/projects/${c.projectId}/calc/${c.id}`}
                className="font-medium text-slate-900"
              >
                {c.name}
              </Link>
              <div className="text-xs text-slate-600">
                {c.regulationCode} {c.regulationVersion} · {c.worksheetId}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
