import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { runScenarioChain } from '@/lib/eval/scenario-chain';
import { buildFixtureBaseline } from '@/lib/scenarios/__fixtures__/hellenthal-a138';

const a = vi.hoisted(() => ({ getScenarioResults: vi.fn() }));
vi.mock('@/lib/actions/scenarios', () => a);
import { ScenarioSheetPanel } from '../scenario-sheet-panel';

beforeEach(() => a.getScenarioResults.mockReset());

describe('ScenarioSheetPanel', () => {
  it('is off by default — the sheet stays unchanged and nothing is computed', () => {
    render(<ScenarioSheetPanel locale="de" projectId="p" standardCode="DWA-A-138-1" worksheetCode="A138-13" />);
    expect(screen.getByRole('button', { name: 'Fälle anzeigen' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('table')).toBeNull();
    expect(a.getScenarioResults).not.toHaveBeenCalled();
  });
  it('switched on: columns, chart and step-through for the sheet', async () => {
    const b = buildFixtureBaseline();
    a.getScenarioResults.mockResolvedValue({ ok: true, available: true, standardCode: 'DWA-A-138-1', ignoredScenarioIds: [], real: runScenarioChain(b, [], { caseId: 'real', approvalWithholding: 'bypass' }), cases: [] });
    render(<ScenarioSheetPanel locale="de" projectId="p" standardCode="DWA-A-138-1" worksheetCode="A138-13" />);
    fireEvent.click(screen.getByRole('button', { name: 'Fälle anzeigen' }));
    expect(await screen.findByRole('columnheader', { name: /Real/ })).toBeTruthy();
    expect(screen.getByTestId('scenario-chart')).toBeTruthy();
    expect(screen.getByTestId('scenario-step-through')).toBeTruthy();
    expect(a.getScenarioResults).toHaveBeenCalledWith('p', 'DWA-A-138-1');
  });
  it('shows the action error', async () => {
    a.getScenarioResults.mockResolvedValue({ ok: false, error: 'Kein Zugriff auf dieses Projekt.' });
    render(<ScenarioSheetPanel locale="en" projectId="p" standardCode="DWA-A-138-1" worksheetCode="A138-13" />);
    fireEvent.click(screen.getByRole('button', { name: 'Show cases' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Kein Zugriff');
  });
});
