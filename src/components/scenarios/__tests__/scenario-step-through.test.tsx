import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScenarioStepThrough } from '../scenario-step-through';
import { gl10Series } from '@/lib/scenarios/iteration-series';
import { rows } from '@/lib/scenarios/__fixtures__/c4-a138-chain';

const real = gl10Series(rows(30), { AcS_paved: 602.161, A_VA: 50, Q_S: 0.0015, Q_Dr: 0, V_VA: 70.0037505216 }, 30);
const k5 = gl10Series(rows(30), { AcS_paved: 602.161, A_VA: 48.58, Q_S: 0.4858, Q_Dr: 0, V_VA: 14.57 }, 30);
const OPTS = [{ id: 'real', label: 'Real · T = 30 a', series: real }, { id: 'k5', label: 'K5 · T = 30 a', series: k5 }];

describe('ScenarioStepThrough', () => {
  it('starts at the governing D, steps, jumps back, switches case', () => {
    render(<ScenarioStepThrough locale="de" options={OPTS} />);
    const cur = () => screen.getByRole('row', { current: true });
    expect(cur().textContent).toContain('10080');
    fireEvent.click(screen.getByRole('button', { name: /vorherige D/ }));
    expect(cur().textContent).toContain('8640');
    fireEvent.click(screen.getByRole('button', { name: 'zur maßgebenden D' }));
    expect(cur().textContent).toContain('10080');
    fireEvent.change(screen.getByLabelText('Fall'), { target: { value: 'k5' } });
    expect(cur().textContent).toContain('360');
    expect(screen.getByTestId('step-formula').textContent).toContain('13,5907 m³');
  });
  it('renders the full per-D table with the governing row bold', () => {
    render(<ScenarioStepThrough locale="de" options={OPTS} />);
    expect(screen.getAllByTestId(/^step-row-/)).toHaveLength(22);
    expect(screen.getByTestId('step-row-10080').getAttribute('data-governing')).toBe('true');
  });
  it('slider moves the current D', () => {
    render(<ScenarioStepThrough locale="en" options={OPTS} />);
    fireEvent.change(screen.getByLabelText('Duration step'), { target: { value: '0' } });
    expect(screen.getByRole('row', { current: true }).textContent).toContain('5');
  });
});
