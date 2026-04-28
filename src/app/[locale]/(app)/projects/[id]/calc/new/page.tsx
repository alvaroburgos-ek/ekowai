import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ALL_WORKSHEETS } from '@/lib/worksheets/DWA-A-201/v3.2';
import { createCalculation } from '@/lib/actions/calculation';

export default async function NewCalcPage({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en'; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations('calc');

  return (
    <Card className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">{t('newCalc')}</h1>
      <form action={createCalculation} className="space-y-4">
        <input type="hidden" name="projectId" value={id} />
        <input type="hidden" name="locale" value={locale} />
        <label className="block">
          <span className="text-sm text-slate-700">{t('calcName')}</span>
          <Input name="name" required minLength={1} />
        </label>
        <label className="block">
          <span className="text-sm text-slate-700">{t('worksheet')}</span>
          <select
            name="worksheetId"
            required
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            defaultValue=""
          >
            <option value="" disabled>
              —
            </option>
            {ALL_WORKSHEETS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.id} — {locale === 'de' ? w.titleDe : w.titleEn}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">{t('createCalc')}</Button>
      </form>
    </Card>
  );
}
