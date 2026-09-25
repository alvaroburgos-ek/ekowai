import { Card } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';

export default async function ImpressumPage({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
}) {
  const { locale } = await params;
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
        <h1 className="text-2xl font-semibold text-slate-900">{t('impressum.title')}</h1>
        <div className="space-y-2 text-sm text-slate-700">
          <p>{t('impressum.companyName')}</p>
          <p>{t('impressum.address')}</p>
          <p>{t('impressum.contact')}</p>
          <p>{t('impressum.represented')}</p>
          <p>{t('impressum.taxId')}</p>
          <p className="text-xs text-slate-500 mt-4">
            {locale === 'de'
              ? 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV'
              : 'Responsible for content per § 18 (2) MStV'}
          </p>
        </div>
      </Card>
    </main>
  );
}
