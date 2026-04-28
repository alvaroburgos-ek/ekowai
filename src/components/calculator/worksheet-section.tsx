'use client';

import { useCalculatorStore } from '@/lib/state/calculator-store';
import type { WorksheetSection as SectionDef } from '@/lib/engine';
import { InputField } from './input-field';

export function WorksheetSection({
  section,
  locale,
  editable,
}: {
  section: SectionDef;
  locale: 'de' | 'en';
  editable?: boolean;
}) {
  const worksheet = useCalculatorStore((s) => s.worksheet);
  if (!worksheet) return null;

  const title = locale === 'de' ? section.titleDe : section.titleEn;
  const inputDefs = new Map(worksheet.inputs.map((f) => [f.id, f]));

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {section.fields.map((id) => {
        const f = inputDefs.get(id);
        if (!f || !editable) return null;
        return <InputField key={id} field={f} locale={locale} />;
      })}
    </section>
  );
}
