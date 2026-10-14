'use client';
/**
 * Iteration chart (spec §4.3): every shown case over the rain duration D (log x 5 min … 7 d), one y-axis, peak marked,
 * „kein eindeutiges Maximum" when the governing D is the last tabulated one, crosshair tooltip with every visible case,
 * legend (also the filter), direct labels at the peaks (≤ 4 series), T = 100 a dashed.
 */
import { useMemo, useState } from 'react';
import { fmtNum } from '@/lib/scenarios/format';
import {
  CHART, X_TICKS, xScale, yDomain, yScale, yTicks, labelDuration, nearestIndex, seriesColor, type ChartSeries,
} from './chart-geometry';

const T = {
  de: { boundary: 'kein eindeutiges Maximum', duration: 'Regendauer D', aria: 'Ergebnis je Regendauer und Fall' },
  en: { boundary: 'no peak inside the table', duration: 'rain duration D', aria: 'Result per rain duration and case' },
} as const;

export function ScenarioIterationChart({ locale, title, unit, series }: { locale: 'de' | 'en'; title: string; unit: string; series: ChartSeries[] }) {
  const t = T[locale];
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<number | null>(null);
  const visible = series.filter((s) => !hidden.has(s.id));
  const allD = useMemo(() => [...new Set(series.flatMap((s) => s.points.map((p) => p.D)))].sort((a, b) => a - b), [series]);
  const dMin = allD[0] ?? 5; const dMax = allD[allD.length - 1] ?? 10080;
  const sx = xScale(dMin, dMax);
  const domain = yDomain(visible.flatMap((s) => s.points.map((p) => p.value)));
  const sy = yScale(domain);
  const { W, H, M } = CHART;
  const direct = visible.length <= 4;

  const move = (clientX: number, el: Element) => {
    const svg = (el as SVGGraphicsElement).ownerSVGElement ?? el;
    const r = svg.getBoundingClientRect();
    const x = r.width > 0 ? ((clientX - r.left) / r.width) * W : clientX;
    setHover(nearestIndex(allD, x, sx));
  };
  const hoverD = hover != null ? allD[hover] : null;

  return (
    <figure className="space-y-2" data-testid="scenario-chart">
      <figcaption className="text-sm font-medium text-ink">{title}</figcaption>
      <ul className="flex flex-wrap gap-2" aria-label="Legende">
        {series.map((s) => (
          <li key={s.id}>
            <button type="button" data-testid={`legend-${s.id}`} aria-pressed={!hidden.has(s.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-0.5 text-xs ${hidden.has(s.id) ? 'opacity-40' : ''}`}
              onClick={() => setHidden((h) => { const n = new Set(h); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}>
              <svg width="22" height="6" aria-hidden><line x1="0" x2="22" y1="3" y2="3" stroke={seriesColor(s.slot)} strokeWidth="3" strokeDasharray={s.dashed ? '7 5' : undefined} /></svg>
              <span className="text-ink">{s.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${title} — ${t.aria}`}>
          {yTicks(domain).map((v) => (
            <g key={`y${v}`}>
              <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="var(--hairline, #e5e5e5)" />
              <text x={M.l - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="var(--subtext, #666)">{fmtNum(v, locale)}</text>
            </g>
          ))}
          {X_TICKS.filter((d) => d >= dMin && d <= dMax).map((d) => (
            <g key={`x${d}`}>
              <line x1={sx(d)} x2={sx(d)} y1={M.t} y2={H - M.b} stroke="var(--hairline, #e5e5e5)" />
              <text x={sx(d)} y={H - M.b + 16} textAnchor="middle" fontSize="11" fill="var(--subtext, #666)">{labelDuration(d, locale)}</text>
            </g>
          ))}
          <text x={M.l} y={M.t - 4} fontSize="11" fill="var(--subtext, #666)">{unit}</text>
          <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--subtext, #666)">{t.duration}</text>
          {visible.map((s) => (
            <path key={s.id} data-testid={`series-${s.id}`} fill="none" stroke={seriesColor(s.slot)} strokeWidth="2"
              strokeDasharray={s.dashed ? '7 5' : undefined}
              d={s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.D).toFixed(1)},${sy(p.value).toFixed(1)}`).join('')} />
          ))}
          {visible.map((s) => {
            if (s.governingIndex == null || !s.points[s.governingIndex]) return null;
            const p = s.points[s.governingIndex];
            const cx = sx(p.D); const cy = sy(p.value);
            return (
              <g key={`pk-${s.id}`}>
                <circle data-testid={`peak-${s.id}`} cx={cx} cy={cy} r={5}
                  fill={s.boundaryLimited ? 'var(--paper, #fff)' : seriesColor(s.slot)} stroke={s.boundaryLimited ? seriesColor(s.slot) : 'var(--paper, #fff)'} strokeWidth={2} />
                {direct && <text x={Math.min(cx + 8, W - 140)} y={cy - 8} fontSize="11" fill="var(--ink)">{`${s.label}: ${fmtNum(p.value, locale)}`}</text>}
                {s.boundaryLimited && <text data-testid={`boundary-${s.id}`} x={Math.min(cx + 8, W - 140)} y={cy + 14} fontSize="10" fill="var(--subtext, #666)">{t.boundary}</text>}
              </g>
            );
          })}
          {hoverD != null && <line x1={sx(hoverD)} x2={sx(hoverD)} y1={M.t} y2={H - M.b} stroke="var(--subtext, #666)" strokeDasharray="3 3" />}
          <rect data-testid="chart-hit" x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill="transparent" tabIndex={0}
            aria-label={t.aria}
            onMouseMove={(e) => move(e.clientX, e.currentTarget)}
            onMouseLeave={() => setHover(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') setHover((h) => Math.min(allD.length - 1, (h ?? -1) + 1));
              if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? allD.length) - 1));
            }} />
        </svg>
        {hoverD != null && (
          <div data-testid="chart-tooltip" role="status" className="absolute top-2 right-2 rounded-lg border border-hairline bg-paper px-3 py-2 text-xs shadow-soft">
            <div className="font-semibold text-ink">D = {hoverD} min</div>
            {visible.map((s) => {
              const p = s.points.find((x) => x.D === hoverD);
              return p ? <div key={s.id} className="text-ink">{`${s.label}: ${fmtNum(p.value, locale)} ${unit}`}</div> : null;
            })}
          </div>
        )}
      </div>
    </figure>
  );
}
