import { describe, it, expect } from 'vitest';
import { CHART, xScale, yDomain, yTicks, labelDuration, nearestIndex, seriesColor, placeLabelX } from '../chart-geometry';

describe('chart geometry', () => {
  it('log x from 5 min to 7 d spans the plot', () => {
    const sx = xScale(5, 10080);
    expect(sx(5)).toBe(CHART.M.l);
    expect(sx(10080)).toBeCloseTo(CHART.W - CHART.M.r, 9);
    expect(sx(Math.sqrt(5 * 10080))).toBeCloseTo((CHART.M.l + CHART.W - CHART.M.r) / 2, 9);
  });
  it('y domain starts at 0, includes negatives, pads the top by 8 %', () => {
    expect(yDomain([10, 100])).toEqual([0, 108]);
    expect(yDomain([-5, 50])).toEqual([-5, 54]);
    expect(yDomain([])).toEqual([0, 1]);
  });
  it('nice ticks', () => {
    expect(yTicks([0, 108])).toEqual([0, 20, 40, 60, 80, 100]);
    expect(yTicks([0, 0.03])).toEqual([0, 0.005, 0.01, 0.015, 0.02, 0.025, 0.03]);
  });
  it('duration labels DE/EN', () => {
    expect(labelDuration(5, 'de')).toBe('5 min');
    expect(labelDuration(180, 'de')).toBe('3 h');
    expect(labelDuration(4320, 'en')).toBe('3 d');
  });
  it('nearest tabulated duration to a pointer x', () => {
    const ds = [5, 10, 180, 10080];
    const sx = xScale(5, 10080);
    expect(nearestIndex(ds, sx(170), sx)).toBe(2);
  });
  it('Real is ink, cases keep their slot colour', () => {
    expect(seriesColor(0)).toBe('var(--scn-real)');
    expect(seriesColor(4)).toBe('var(--scn-4)');
  });
  it('placeLabelX: start-anchored right of the point when it fits, end-anchored left of it near the right edge', () => {
    expect(placeLabelX(200, 120)).toEqual({ x: 208, anchor: 'start', left: 208 });
    const edge = CHART.W - CHART.M.r;
    const r = placeLabelX(edge, 250);
    expect(r).toEqual({ x: edge - 8, anchor: 'end', left: edge - 8 - 250 });
    expect(r.x).toBeLessThanOrEqual(edge);
    // just fits: still start-anchored
    expect(placeLabelX(edge - 8 - 100, 100).anchor).toBe('start');
    expect(placeLabelX(edge - 8 - 100, 101).anchor).toBe('end');
  });
});
