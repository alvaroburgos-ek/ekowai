'use client';

import { useMemo } from 'react';
import { evaluateDesignWindow, interpretRowDe, type FacilityKey, type RainRow, type WindowRow } from '@/lib/eval/design-window';

type Props = {
  facility: FacilityKey;
  /** Resolved KOSTRA rows of the design return period. */
  rows: RainRow[];
  designReturnPeriod: number | null;
  /** Optional second column for the comparison curve (e.g. T = 5 a). */
  compareRows?: { T: number; rows: RainRow[] } | null;
  scalars: Record<string, number | null | undefined>;
  /** Current value of the facility's design variable. */
  current: number | null;
};

const nf = (v: number | null | undefined, digits: number) =>
  v == null || !Number.isFinite(v) ? '—' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits > 3 ? 0 : digits }).format(v);

function band(row: WindowRow): 'ok' | 'near' | 'fail' {
  if (!row.ok) return 'fail';
  return row.checks.some((c) => c.near) ? 'near' : 'ok';
}
const BAND_CLS = { ok: 'bg-success/15 text-success', near: 'bg-warning/20 text-warning', fail: 'bg-error/15 text-error' } as const;
const BAND_DE = { ok: 'im Fenster', near: 'nahe Grenze', fail: 'außerhalb' } as const;

/**
 * "Bemessungsfenster": the derived values and every guideline limit for the
 * facility's design variable at its current value and at scanned neighbours,
 * plus the per-duration curve that shows why the governing D governs. Pure
 * display; nothing is written back — the engineer changes the input field.
 */
export function DesignWindowPanel({ facility, rows, designReturnPeriod, compareRows, scalars, current }: Props) {
  const result = useMemo(() => evaluateDesignWindow(facility, rows, scalars, current), [facility, rows, scalars, current]);
  const compare = useMemo(
    () => (compareRows && compareRows.rows.length ? evaluateDesignWindow(facility, compareRows.rows, scalars, current) : null),
    [facility, compareRows, scalars, current],
  );

  if ('error' in result) {
    return (
      <section className="border border-hairline rounded p-4 space-y-1" data-testid="design-window">
        <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">Bemessungsfenster</h2>
        <p className="text-xs text-subtext">{result.error}</p>
      </section>
    );
  }
  const { def, steps, window, curve, governingD } = result;
  const cur = result.current;
  const cmpCur = compare && !('error' in compare) ? compare.current : null;

  return (
    <section className="border border-hairline rounded p-4 space-y-4" data-testid="design-window">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">{def.titleDe}</h2>
        <div className="text-xs text-subtext tabular-nums">
          T = {designReturnPeriod ?? '—'} a · Fenster {def.variable.symbol}: {window.min == null ? 'kein zulässiger Wert im Suchbereich' : `${nf(window.min, 0)} … ${nf(window.max, 0)} ${def.variable.unit}`}
        </div>
      </div>

      {cur && (
        <div className={`rounded px-3 py-2 text-sm ${BAND_CLS[band(cur)]}`} data-testid="design-window-current">
          <span className="font-medium">{def.variable.symbol} = {nf(cur.x, 1)} {def.variable.unit}: {BAND_DE[band(cur)]}</span>
          <span className="ml-3 text-ink/80">
            {def.derived.map((d) => `${d.key} ${nf(cur.derived[d.key], d.digits)} ${d.unit}`).join(' · ')}
          </span>
        </div>
      )}

      {cur && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
          {cur.checks.map((c) => (
            <li key={c.key} className="flex items-baseline gap-2">
              <span className={`inline-block rounded px-1.5 py-0.5 ${c.severity === 'info' ? 'bg-paper-2 text-subtext' : c.ok ? (c.near ? BAND_CLS.near : BAND_CLS.ok) : BAND_CLS.fail}`}>
                {c.severity === 'info' ? (c.ok ? 'Info: ok' : 'Info: über') : c.ok ? (c.near ? 'nahe' : 'erfüllt') : 'verletzt'}
              </span>
              {c.severity === 'rule' && <span className="text-[10px] uppercase tracking-[0.12em] text-subtext">Regelwert</span>}
              <span className="text-ink">{c.labelDe}</span>
              <span className="text-subtext tabular-nums">{nf(c.value, 1)} {c.unit} {c.kind === 'max' ? '≤' : '≥'} {c.bound} · {c.clause}</span>
            </li>
          ))}
        </ul>
      )}

      {cur && (
        <div className="rounded border border-hairline bg-paper-2/40 p-3 space-y-1" data-testid="design-window-interpretation">
          <div className="text-[10px] uppercase tracking-[0.18em] text-subtext">Auslegung nach Regelwerk</div>
          {interpretRowDe(def, cur, window).map((s, i) => <p key={i} className="text-xs text-ink leading-snug">{s}</p>)}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs" data-testid="design-window-steps">
          <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
            <tr>
              <th className="text-right font-normal pb-1 pr-2">{def.variable.symbol} [{def.variable.unit}]</th>
              {def.derived.map((d) => <th key={d.key} className="text-right font-normal pb-1 pr-2" title={d.labelDe}>{d.key} [{d.unit}]</th>)}
              <th className="text-left font-normal pb-1">Grenzen</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((r) => (
              <tr key={r.x} className={`border-t border-hairline/60 ${r.isCurrent ? 'font-medium bg-paper-2/60' : ''}`}>
                <td className="py-0.5 pr-2 text-right tabular-nums">{nf(r.x, 1)}</td>
                {def.derived.map((d) => <td key={d.key} className="py-0.5 pr-2 text-right tabular-nums">{nf(r.derived[d.key], d.digits)}</td>)}
                <td className="py-0.5">
                  <span className={`inline-block rounded px-1.5 ${BAND_CLS[band(r)]}`}>{BAND_DE[band(r)]}</span>
                  {!r.ok && <span className="ml-1 text-subtext">{r.checks.filter((c) => !c.ok && c.severity !== 'info').map((c) => c.key).join(', ')}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {curve && curve.length > 1 && (
        <DurationChart
          curve={curve}
          governingD={governingD}
          label={`T = ${designReturnPeriod ?? '?'} a`}
          compare={compare && !('error' in compare) && compare.curve ? { curve: compare.curve, governingD: compare.governingD, label: `T = ${compareRows?.T} a` } : null}
          unit={def.derived[0].unit}
          quantity={def.derived[0].key}
        />
      )}

      {cmpCur && compareRows && (
        <p className="text-xs text-subtext">
          Vergleich T = {compareRows.T} a bei {def.variable.symbol} = {nf(cmpCur.x, 1)} {def.variable.unit}: {def.derived.map((d) => `${d.key} ${nf(cmpCur.derived[d.key], d.digits)} ${d.unit}`).join(' · ')}
        </p>
      )}

      <ul className="text-[11px] text-subtext list-disc pl-4 space-y-0.5">
        {def.notesDe.map((n) => <li key={n}>{n}</li>)}
        <li>Suchbereich: 0,1- bis 4-facher aktueller Wert. Die Tabelle ersetzt keine Eingabe — den gewählten Wert im Feld {def.variable.symbol} eintragen.</li>
      </ul>
    </section>
  );
}

/** Log-x line chart of the sized quantity over duration D; the governing D is marked. Inline SVG, no library. */
function DurationChart({ curve, governingD, label, compare, unit, quantity }: {
  curve: Array<{ D: number; r_D: number; value: number }>;
  governingD: number | null;
  label: string;
  compare: { curve: Array<{ D: number; r_D: number; value: number }>; governingD: number | null; label: string } | null;
  unit: string;
  quantity: string;
}) {
  const W = 640, H = 220, L = 48, R = 12, T = 12, B = 34;
  const all = compare ? [...curve, ...compare.curve] : curve;
  const xs = all.map((p) => Math.log10(p.D));
  const ys = all.map((p) => p.value);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(0, ...ys), y1 = Math.max(...ys) * 1.08 || 1;
  const sx = (d: number) => L + ((Math.log10(d) - x0) / (x1 - x0 || 1)) * (W - L - R);
  const sy = (v: number) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const path = (c: typeof curve) => c.map((p, i) => `${i ? 'L' : 'M'}${sx(p.D).toFixed(1)},${sy(p.value).toFixed(1)}`).join(' ');
  const ticks = [5, 15, 60, 180, 540, 1440, 4320, 10080].filter((d) => Math.log10(d) >= x0 - 1e-9 && Math.log10(d) <= x1 + 1e-9);
  const yt = 4;
  const gov = curve.find((p) => p.D === governingD);
  const govC = compare?.curve.find((p) => p.D === compare.governingD);
  return (
    <figure className="space-y-1" data-testid="design-window-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${quantity} über der Dauerstufe D, maßgebend bei D = ${governingD ?? '?'} min`}>
        {Array.from({ length: yt + 1 }, (_, i) => y0 + ((y1 - y0) * i) / yt).map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} stroke="currentColor" strokeOpacity="0.12" />
            <text x={L - 6} y={sy(v) + 3} fontSize="9" textAnchor="end" fill="currentColor" fillOpacity="0.6">{v.toFixed(1)}</text>
          </g>
        ))}
        {ticks.map((d) => (
          <g key={d}>
            <line x1={sx(d)} x2={sx(d)} y1={T} y2={H - B} stroke="currentColor" strokeOpacity="0.12" />
            <text x={sx(d)} y={H - B + 12} fontSize="9" textAnchor="middle" fill="currentColor" fillOpacity="0.6">{d}</text>
          </g>
        ))}
        <text x={(L + W - R) / 2} y={H - 4} fontSize="9" textAnchor="middle" fill="currentColor" fillOpacity="0.6">Dauerstufe D [min], logarithmisch</text>
        <text x={10} y={T + 8} fontSize="9" fill="currentColor" fillOpacity="0.6">{quantity} [{unit}]</text>
        {compare && <path d={path(compare.curve)} fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="4 3" />}
        <path d={path(curve)} fill="none" stroke="var(--color-accent, #2563eb)" strokeWidth="2" />
        {gov && <circle cx={sx(gov.D)} cy={sy(gov.value)} r="4" fill="var(--color-accent, #2563eb)" />}
        {gov && <text x={sx(gov.D) + 6} y={sy(gov.value) - 6} fontSize="10" fill="currentColor">max {gov.value.toFixed(1)} {unit} bei D = {gov.D} min</text>}
        {govC && <circle cx={sx(govC.D)} cy={sy(govC.value)} r="3" fill="currentColor" fillOpacity="0.5" />}
      </svg>
      <figcaption className="text-[11px] text-subtext">
        {label}: durchgezogen{compare ? ` · ${compare.label}: gestrichelt` : ''}. Kurze Dauerstufen sind intensiv, aber kurz; lange sind schwach, aber die Versickerung ist begrenzt — das Maximum ist die maßgebende Dauerstufe.
      </figcaption>
    </figure>
  );
}
