import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ALL_WORKSHEETS } from '@/lib/worksheets/DWA-A-201/v3.1';
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
            className="block w-full rounded-none border-0 border-b border-hairline-strong bg-transparent px-1 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-0"
            defaultValue=""
          >
            <option value="" disabled>
              —
            </option>
            {ALL_WORKSHEETS.map((w) => {
              const previewMark = w.status === 'preview' ? ' [Vorschau]' : '';
              return (
                <option key={w.id} value={w.id}>
                  {w.id} — {locale === 'de' ? w.titleDe : w.titleEn}
                  {previewMark}
                </option>
              );
            })}
          </select>
          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-subtext">
            Vorschau-Arbeitsblätter sind inhaltlich noch nicht regelwerksvalidiert.
          </span>
        </label>
        <Button type="submit">{t('createCalc')}</Button>
      </form>
    </Card>
  );
}
