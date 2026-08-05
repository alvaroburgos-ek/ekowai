/**
 * Margin Guard gauge — presentational contract over the pure core
 * (lib/offers/margin-guard.ts). Uses the concept's own €8,010 example.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarginGuard } from '../margin-guard';

const BASE = { festpreisEur: 8010, externalTotal: 0, estimatedHours: 84 };

describe('MarginGuard', () => {
  it('green at 40 h: €200/h with runway to the floor', () => {
    const { getByTestId } = render(<MarginGuard {...BASE} actualHours={40} />);
    expect(getByTestId('margin-guard').getAttribute('data-status')).toBe('green');
    expect(getByTestId('margin-guard-rate').textContent).toBe('200 €/h');
    expect(getByTestId('margin-guard-runway').textContent).toContain('bis zum Floor');
    expect(getByTestId('margin-guard-marker')).toBeTruthy();
  });

  it('amber at 90 h (≈€89/h) with both warnings listed', () => {
    const { getByTestId, getByText } = render(<MarginGuard {...BASE} actualHours={90} />);
    expect(getByTestId('margin-guard').getAttribute('data-status')).toBe('amber');
    expect(getByTestId('margin-guard-rate').textContent).toBe('89 €/h');
    expect(getByText(/nähert sich dem Cash-Cost-Floor/)).toBeTruthy();
    expect(getByText(/überschreiten die kalkulierten Stunden/)).toBeTruthy();
  });

  it('red below the floor', () => {
    const { getByTestId } = render(<MarginGuard {...BASE} actualHours={120} />);
    expect(getByTestId('margin-guard').getAttribute('data-status')).toBe('red');
  });

  it('idle without logged hours: em-dash, no marker', () => {
    const { getByTestId, queryByTestId } = render(<MarginGuard {...BASE} actualHours={0} />);
    expect(getByTestId('margin-guard').getAttribute('data-status')).toBe('idle');
    expect(getByTestId('margin-guard-rate').textContent).toBe('—');
    expect(queryByTestId('margin-guard-marker')).toBeNull();
  });
});
