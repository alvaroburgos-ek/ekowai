'use client';

import { useCalculatorStore } from '@/lib/state/calculator-store';
import type { WorksheetSection as SectionDef } from '@/lib/engine';

export function ResultsPanel({
  section,
  locale,
}: {
  section: SectionDef;
  locale: 'de' | 'en';
}) {
  const worksheet = useCalculatorStore((s) => s.worksheet);
  const result = useCalculatorStore((s) => s.result);
  if (!worksheet || !result) return null;

  const computedDefs = new Map(worksheet.computed.map((c) => [c.id, c]));
  const title = locale === 'de' ? section.titleDe : section.titleEn;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <dl className="space-y-2">
        {section.fields.map((id) => {
          const c = computedDefs.get(id);
          if (!c) return null;
          const v = result.computed[id];
          const display = Number.isFinite(v) ? v.toFixed(c.precision ?? 2) : '—';
          return (
            <div
              key={id}
              className="flex items-baseline justify-between border-b border-slate-100 py-1"
            >
              <dt className="text-sm text-slate-700">
                {locale === 'de' ? c.labelDe : c.labelEn}
                <span className="ml-2 text-xs text-slate-500">{c.citation}</span>
              </dt>
              <dd className="font-medium text-slate-900">
                {display}
                {c.unit && <span className="text-slate-500 text-sm ml-1">{c.unit}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
      {result.errors.length > 0 && (
        <div className="text-xs text-red-700">
          {result.errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}
    </section>
  );
}
