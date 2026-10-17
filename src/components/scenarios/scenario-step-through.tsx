'use client';
/**
 * Step-through with the substituted formula (spec §4.4): per-D table (always-available table
 * view per the dataviz rules), prev/next D, jump to the governing D, a slider, and a case switch.
 */
import { useState } from 'react';
import { fmtNum } from '@/lib/scenarios/format';
import { stepLines } from '@/lib/scenarios/step-text';
import type { IterationSeries } from '@/lib/scenarios/types';

const L = {
  de: { case: 'Fall', prev: '◀ vorherige D', next: 'nächste D ▶', gov: 'zur maßgebenden D', slider: 'Dauerstufe', D: 'D (min)', r: 'r_D l/(s·ha)' },
  en: { case: 'Case', prev: '◀ previous D', next: 'next D ▶', gov: 'go to governing D', slider: 'Duration step', D: 'D (min)', r: 'r_D l/(s·ha)' },
} as const;

type Option = { id: string; label: string; series: IterationSeries };
const govIndex = (s: IterationSeries) => Math.max(0, s.perDuration.findIndex((p) => p.D === s.governingD));

export function ScenarioStepThrough({ locale, options }: { locale: 'de' | 'en'; options: Option[] }) {
  const t = L[locale];
  const [id, setId] = useState(options[0]?.id ?? '');
  const opt = options.find((o) => o.id === id) ?? options[0];
  const [index, setIndex] = useState(opt ? govIndex(opt.series) : 0);
  if (!opt) return null;
  const s = opt.series;
  const last = s.perDuration.length - 1;
  const g = govIndex(s);
  const show = (v: number) => fmtNum(s.floorAtZero ? Math.max(0, v) : v, locale);
  return (
    <div className="space-y-2" data-testid="scenario-step-through">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="inline-flex items-center gap-1">{t.case}
          <select aria-label={t.case} value={opt.id} onChange={(e) => { const o = options.find((x) => x.id === e.target.value); setId(e.target.value); if (o) setIndex(govIndex(o.series)); }} className="border border-hairline rounded px-2 py-0.5">
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} className="rounded border border-hairline px-2">{t.prev}</button>
        <input type="range" aria-label={t.slider} min={0} max={last} value={index} onChange={(e) => setIndex(Number(e.target.value))} />
        <button type="button" onClick={() => setIndex((i) => Math.min(last, i + 1))} className="rounded border border-hairline px-2">{t.next}</button>
        <button type="button" onClick={() => setIndex(g)} className="rounded border border-hairline px-2">{t.gov}</button>
      </div>
      <pre data-testid="step-formula" className="text-xs whitespace-pre-wrap rounded-lg border border-hairline bg-paper-2/60 p-3 text-ink">{stepLines(s, index, locale).join('\n')}</pre>
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-xs tabular-nums">
          <thead><tr><th className="text-left">{t.D}</th><th className="text-right">{t.r}</th><th className="text-right">{s.outputSymbol} ({s.unit})</th></tr></thead>
          <tbody>
            {s.perDuration.map((p, i) => (
              <tr key={p.D} data-testid={`step-row-${p.D}`} data-governing={i === g} aria-current={i === index ? true : undefined}
                className={`${i === g ? 'font-semibold' : ''} ${i === index ? 'bg-amber-50' : ''}`}
                onClick={() => setIndex(i)}>
                <td>{p.D}</td><td className="text-right">{fmtNum(p.r_D, locale)}</td><td className="text-right">{show(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
