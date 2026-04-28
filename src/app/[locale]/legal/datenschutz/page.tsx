import { Card } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';

export default async function DatenschutzPage() {
  const t = await getTranslations('legal');
  const reviewed = process.env.LEGAL_REVIEWED === 'true' || process.env.LEGAL_REVIEWED === '1';

  return (
    <main className="max-w-3xl mx-auto p-6">
      <Card className="p-6 space-y-4">
        {!reviewed && (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            {t('draftBanner')}
          </div>
        )}
        <h1 className="text-2xl font-semibold text-slate-900">{t('datenschutz.title')}</h1>
        <p className="text-sm text-slate-700 whitespace-pre-line">{t('datenschutz.intro')}</p>
      </Card>
    </main>
  );
}
