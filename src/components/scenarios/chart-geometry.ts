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

/** Rough glyph-width estimate for a single-line SVG label at the chart's 11 px label font. */
export function estimateLabelWidth(text: string): number {
  return text.length * 6;
}

export type PeakLabelBox = { id: string; x: number; y: number; width: number };
export type LabelBounds = { top: number; bottom: number };

/**
 * Deterministic peak-label collision avoidance (contrast WARN mitigation, slots 3-5): every
 * visible series' peak gets a direct label, so with up to 7 visible series (Real + 6 cases)
 * labels can collide. Processed in input order against everything placed so far — including
 * any fixed `obstacles` (e.g. a „kein eindeutiges Maximum" caption, which never itself moves).
 * A colliding label is nudged straight down by `MIN_GAP` one step at a time as long as the next
 * step still fits inside `bounds`; if downward room runs out while a collision remains, the
 * label is nudged *upward* from its own anchor instead (above the earlier labels), again
 * bounded. Either way the final position is clamped to `bounds` — a simple, reproducible
 * offset, not a layout solver, but one that never places a label outside the plot.
 */
const MIN_GAP = 14;
export function layoutPeakLabels(
  boxes: readonly PeakLabelBox[],
  bounds: LabelBounds,
  obstacles: readonly PeakLabelBox[] = [],
): Array<{ id: string; x: number; y: number }> {
  const placed: Array<{ x: number; y: number; width: number }> = obstacles.map((o) => ({ x: o.x, y: o.y, width: o.width }));
  const out: Array<{ id: string; x: number; y: number }> = [];
  const collides = (x: number, y: number, width: number) => placed.some(
    (p) => x < p.x + p.width && p.x < x + width && Math.abs(y - p.y) < MIN_GAP,
  );

  for (const b of boxes) {
    // Prefer nudging down, one MIN_GAP step at a time, only while the next step still fits.
    let down = b.y;
    while (collides(b.x, down, b.width) && down + MIN_GAP <= bounds.bottom) down += MIN_GAP;

    let y = down;
    if (collides(b.x, down, b.width)) {
      // Downward room ran out with a collision still open — nudge up above the earlier labels.
      let up = b.y;
      while (collides(b.x, up, b.width) && up - MIN_GAP >= bounds.top) up -= MIN_GAP;
      if (!collides(b.x, up, b.width)) y = up;
      // else: overcrowded — keep the best-effort downward position; the final clamp below
      // still guarantees it never lands outside the plot.
    }

    y = Math.min(bounds.bottom, Math.max(bounds.top, y));
    placed.push({ x: b.x, y, width: b.width });
    out.push({ id: b.id, x: b.x, y });
  }
  return out;
}
