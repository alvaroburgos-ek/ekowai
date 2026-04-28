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
    <section className="border border-hairline bg-paper">
      <header className="border-b border-hairline px-5 py-3 flex items-baseline justify-between">
        <h2 className="font-display text-lg text-ink">{title}</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtext">
          Ergebnis ·{' '}
          {section.fields.length}{' '}
          {section.fields.length === 1 ? 'Wert' : 'Werte'}
        </span>
      </header>
      <ul className="divide-y divide-hairline">
        {section.fields.map((id) => {
          const c = computedDefs.get(id);
          if (!c) return null;
          const v = result.computed[id];
          const display = Number.isFinite(v) ? v.toFixed(c.precision ?? 2) : '—';
          return (
            <li
              key={id}
              className="grid grid-cols-12 gap-4 px-5 py-5 items-baseline group"
            >
              {/* Label + citation */}
              <div className="col-span-6 space-y-1">
                <p className="font-display text-base text-ink leading-tight">
                  {locale === 'de' ? c.labelDe : c.labelEn}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtext">
                  {c.citation}
                </p>
              </div>
              {/* Value — large tabular */}
              <div className="col-span-6 text-right">
                <span
                  className="font-mono tabular-nums text-3xl text-ink group-hover:text-accent-2 transition-colors"
                  data-num
                >
                  {display}
                </span>
                {c.unit && (
                  <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.15em] text-subtext">
                    {c.unit}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {result.errors.length > 0 && (
        <div className="border-t border-error/40 bg-error-soft/30 px-5 py-3">
          {result.errors.map((e) => (
            <p key={e} className="font-mono text-[11px] text-error">
              ⚠ {e}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
