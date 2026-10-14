import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScenarioIterationChart } from '../scenario-iteration-chart';
import type { ChartSeries } from '../chart-geometry';
import { xScale, estimateLabelWidth } from '../chart-geometry';

const pts = (vals: number[]) => [5, 180, 10080].map((D, i) => ({ D, r_D: 10, value: vals[i] }));
const S: ChartSeries[] = [
  { id: 'real:T30', label: 'Real · T = 30 a', slot: 0, dashed: false, points: pts([1, 5, 9]), governingIndex: 2, boundaryLimited: true },
  { id: 'k5:T100', label: 'K5 · T = 100 a', slot: 2, dashed: true, points: pts([2, 8, 3]), governingIndex: 1, boundaryLimited: false },
];

describe('ScenarioIterationChart', () => {
  it('draws one path per series, dashed for T = 100 a, coloured by slot', () => {
    render(<ScenarioIterationChart locale="de" title="Gl. 10" unit="m³" series={S} />);
    expect(screen.getByTestId('series-real:T30').getAttribute('stroke')).toBe('var(--scn-real)');
    expect(screen.getByTestId('series-real:T30').getAttribute('stroke-dasharray')).toBeNull();
    expect(screen.getByTestId('series-k5:T100').getAttribute('stroke')).toBe('var(--scn-2)');
    expect(screen.getByTestId('series-k5:T100').getAttribute('stroke-dasharray')).toBe('7 5');
  });
  it('marks every peak and flags a boundary-limited one', () => {
    render(<ScenarioIterationChart locale="de" title="Gl. 10" unit="m³" series={S} />);
    expect(screen.getByTestId('peak-real:T30')).toBeTruthy();
    expect(screen.getByTestId('peak-k5:T100')).toBeTruthy();
    expect(screen.getByTestId('boundary-real:T30').textContent).toMatch(/kein eindeutiges Maximum/);
    expect(screen.queryByTestId('boundary-k5:T100')).toBeNull();
  });
  it('has a legend that hides and shows a series without repainting the others', () => {
    render(<ScenarioIterationChart locale="de" title="Gl. 10" unit="m³" series={S} />);
    fireEvent.click(screen.getByTestId('legend-k5:T100'));
    expect(screen.queryByTestId('series-k5:T100')).toBeNull();
    expect(screen.getByTestId('series-real:T30').getAttribute('stroke')).toBe('var(--scn-real)');
  });
  it('crosshair tooltip lists every visible case at the hovered duration', () => {
    render(<ScenarioIterationChart locale="de" title="Gl. 10" unit="m³" series={S} />);
    fireEvent.mouseMove(screen.getByTestId('chart-hit'), { clientX: xScale(5, 10080)(180) });
    const tip = screen.getByTestId('chart-tooltip');
    expect(tip.textContent).toContain('D = 180 min');
    expect(tip.textContent).toContain('Real · T = 30 a: 5 m³');
    expect(tip.textContent).toContain('K5 · T = 100 a: 8 m³');
    fireEvent.keyDown(screen.getByTestId('chart-hit'), { key: 'ArrowRight' });
    expect(screen.getByTestId('chart-tooltip').textContent).toContain('D = 10080 min');
  });
  it('labels every visible peak and nudges overlapping labels apart (7 visible series, contrast WARN mitigation)', () => {
    // All seven peaks land on the same point — the worst case for collisions, and exactly the
    // slot-3-5 contrast mitigation this covers (Real + 6 active cases, the maximum visible).
    const seven: ChartSeries[] = ['real:T30', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6'].map((id, i) => ({
      id, label: `Case ${i}`, slot: i, dashed: false, points: pts([1, 5, 9]), governingIndex: 1, boundaryLimited: false,
    }));
    const { container } = render(<ScenarioIterationChart locale="de" title="Gl. 10" unit="m³" series={seven} />);
    const labels = Array.from(container.querySelectorAll('[data-testid^="peak-label-"]'));
    expect(labels).toHaveLength(7);
    const boxes = labels.map((el) => ({
      x: Number(el.getAttribute('x')),
      y: Number(el.getAttribute('y')),
      width: estimateLabelWidth(el.textContent ?? ''),
    }));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const xOverlap = boxes[i].x < boxes[j].x + boxes[j].width && boxes[j].x < boxes[i].x + boxes[i].width;
        if (xOverlap) expect(Math.abs(boxes[i].y - boxes[j].y)).toBeGreaterThanOrEqual(14);
      }
    }
  });
});
