'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface WorksheetMeta {
  id: string;
  titleDe: string;
  titleEn: string;
  status: string;
}

const PHASES: { label: string; ids: string[] }[] = [
  {
    label: 'Planung & Grundlagen',
    ids: ['A201-01', 'A201-02', 'A201-03', 'A201-04'],
  },
  {
    label: 'Systemauswahl',
    ids: ['A201-05'],
  },
  {
    label: 'Bemessung Teiche',
    ids: ['A201-06', 'A201-07', 'A201-08', 'A201-09', 'A201-10', 'A201-11'],
  },
  {
    label: 'Bauliche Anforderungen',
    ids: ['A201-12', 'A201-13'],
  },
  {
    label: 'Mischwasserbehandlung',
    ids: ['A201-14', 'A201-15', 'A201-16'],
  },
  {
    label: 'Dokumentation & Abschluss',
    ids: ['A201-17', 'A201-18', 'A201-19', 'A201-20', 'A201-21', 'A201-22'],
  },
];

export function WorksheetPicker({
  worksheets,
  locale,
}: {
  worksheets: WorksheetMeta[];
  locale: 'de' | 'en';
}) {
  const [selected, setSelected] = useState('');
  const byId = new Map(worksheets.map((w) => [w.id, w]));

  return (
    <div className="border border-hairline">
      <input type="hidden" name="worksheetId" value={selected} />

      {PHASES.map((phase, pi) => {
        const items = phase.ids.flatMap((id) => {
          const w = byId.get(id);
          return w ? [w] : [];
        });
        if (items.length === 0) return null;

        return (
          <div key={phase.label}>
            {/* Phase header */}
            <div className="px-3 py-1.5 bg-paper-2/60 border-t border-hairline flex items-baseline justify-between">
              <span className="text-[9px] uppercase tracking-[0.22em] text-subtext">
                {phase.label}
              </span>
              <span className="text-[9px] tabular-nums text-subtext/50">
                {String(pi + 1).padStart(2, '0')}
              </span>
            </div>

            {/* Worksheet rows — 2-column grid, single line each */}
            <ul className="grid grid-cols-2">
              {items.map((w) => {
                const title = locale === 'de' ? w.titleDe : w.titleEn;
                const isSelected = selected === w.id;

                return (
                  <li
                    key={w.id}
                    className="border-t border-r border-hairline [&:nth-child(2n)]:border-r-0"
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(w.id)}
                      className={cn(
                        'w-full flex items-baseline gap-3 px-3 py-2 text-left transition-colors',
                        isSelected ? 'bg-accent-soft/50' : 'hover:bg-paper-2/40',
                      )}
                    >
                      <span
                        className={cn(
                          'shrink-0 text-[10px] tabular-nums tracking-[0.08em] w-14',
                          isSelected ? 'text-accent-2 font-semibold' : 'text-subtext',
                        )}
                      >
                        {w.id}
                      </span>
                      <span
                        className={cn(
                          'truncate text-[11px]',
                          isSelected ? 'text-ink' : 'text-ink-2',
                        )}
                      >
                        {title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
