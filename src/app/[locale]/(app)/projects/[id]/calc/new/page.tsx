import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ALL_WORKSHEETS } from '@/lib/worksheets/DWA-A-201/v3.1';
import { createCalculation } from '@/lib/actions/calculation';
import { WorksheetPicker } from '@/components/calculator/worksheet-picker';

export default async function NewCalcPage({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en'; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations('calc');

  const worksheets = ALL_WORKSHEETS.map((w) => ({
    id: w.id,
    titleDe: w.titleDe,
    titleEn: w.titleEn,
    status: w.status,
  }));

  return (
    <section className="space-y-10">
      <header className="border-b border-hairline pb-8 mb-2">
        <div className="text-[11px] uppercase tracking-[0.25em] text-subtext mb-3">
          Sektion 01 · Neue Berechnung
        </div>
        <h1 className="text-3xl lg:text-4xl font-semibold text-ink tracking-tight">
          {t('newCalc')}
        </h1>
      </header>

      <form action={createCalculation} className="space-y-10">
        <input type="hidden" name="projectId" value={id} />
        <input type="hidden" name="locale" value={locale} />

        <Field label={t('calcName')} required>
          <Input name="name" required minLength={1} autoFocus />
        </Field>

        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-subtext">
            {t('worksheet')}
          </div>
          <WorksheetPicker worksheets={worksheets} locale={locale} />
        </div>

        <div className="border-t border-hairline pt-6 flex justify-end">
          <Button type="submit">{t('createCalc')}</Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid grid-cols-12 gap-4 items-baseline rounded-md px-3 py-2 -mx-3 has-[:focus-within]:bg-paper-2/50 transition-colors">
      <span className="col-span-3 text-[10px] uppercase tracking-[0.2em] text-subtext">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </span>
      <div className="col-span-9">{children}</div>
    </label>
  );
}
