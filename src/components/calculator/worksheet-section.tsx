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
    <section className="border border-hairline bg-paper-2/30">
      <header className="border-b border-hairline px-5 py-3 flex items-baseline justify-between">
        <h2 className="font-display text-lg text-ink">{title}</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtext">
          {section.fields.length} Felder
        </span>
      </header>
      <div className="px-5 py-5 space-y-5">
        {section.fields.map((id) => {
          const f = inputDefs.get(id);
          if (!f || !editable) return null;
          return <InputField key={id} field={f} locale={locale} />;
        })}
      </div>
    </section>
  );
}
