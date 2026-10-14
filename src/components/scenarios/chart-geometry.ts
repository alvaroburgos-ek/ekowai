/**
 * Iteration chart geometry (spec §4.3): log x axis 5 min … 7 d, one y-axis, nice ticks, duration
 * labels, nearest-point lookup for the crosshair, and the fixed categorical colour-by-slot rule.
 */
export const CHART = { W: 720, H: 320, M: { l: 56, r: 16, t: 16, b: 44 } } as const;
export const X_TICKS = [5, 10, 30, 60, 180, 360, 720, 1440, 4320, 10080] as const;

export type ChartSeries = {
  id: string; label: string; slot: number; dashed: boolean;
  points: Array<{ D: number; r_D: number; value: number }>;
  governingIndex: number | null; boundaryLimited: boolean;
};

export function xScale(dMin: number, dMax: number): (d: number) => number {
  const { W, M } = CHART;
  const lo = Math.log10(dMin); const hi = Math.log10(dMax);
  return (d) => (hi === lo ? (M.l + W - M.r) / 2 : M.l + ((Math.log10(d) - lo) / (hi - lo)) * (W - M.l - M.r));
}
export function yDomain(values: number[]): [number, number] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return [0, 1];
  const lo = Math.min(0, ...finite);
  const hi = Math.max(...finite);
  if (hi <= lo) return [lo, lo + 1];
  return [lo, Number((hi * 1.08).toPrecision(12))];
}
export function yScale([lo, hi]: [number, number]): (v: number) => number {
  const { H, M } = CHART;
  return (v) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);
}
function niceStep(range: number): number {
  const raw = range / 6;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}
export function yTicks([lo, hi]: [number, number]): number[] {
  const step = niceStep(hi - lo);
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-12; v += step) out.push(Number(v.toPrecision(10)));
  return out;
}
export function labelDuration(d: number, _locale: 'de' | 'en'): string {
  if (d < 60) return `${d} min`;
  if (d < 1440) return `${Number((d / 60).toPrecision(4))} h`;
  return `${Number((d / 1440).toPrecision(4))} d`;
}
export function nearestIndex(ds: readonly number[], x: number, sx: (d: number) => number): number {
  let best = 0; let dist = Infinity;
  ds.forEach((d, i) => { const k = Math.abs(sx(d) - x); if (k < dist) { dist = k; best = i; } });
  return best;
}
export function seriesColor(slot: number): string {
  return slot === 0 ? 'var(--scn-real)' : `var(--scn-${slot})`;
}
