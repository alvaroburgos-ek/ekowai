// src/components/worksheet/__tests__/surface-source-banner.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SurfaceSourceBanner } from '../surface-source-banner';
import { surfaceSourceState } from '@/lib/eval/surface-source-state';

describe('SurfaceSourceBanner', () => {
  it('renders nothing when source is ok', () => {
    const { container } = render(<SurfaceSourceBanner state={surfaceSourceState({ rows: [{ id: '1', tab9_value: 'beton', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }] }, 'final')} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('shows the incomplete cause with n/m', () => {
    render(<SurfaceSourceBanner state={surfaceSourceState({ rows: [
      { id: '1', tab9_value: 'beton', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: '2', tab9_value: null, area_m2: null, c_i: null, c_s: null, coeff_override: false },
    ] }, 'final')} />);
    expect(screen.getByText(/Quelle A138-07 nicht final \(1\/2/)).toBeInTheDocument();
  });
  it('shows the missing cause', () => {
    render(<SurfaceSourceBanner state={surfaceSourceState(null, 'final')} />);
    expect(screen.getByText(/nicht erfasst/)).toBeInTheDocument();
  });
});
