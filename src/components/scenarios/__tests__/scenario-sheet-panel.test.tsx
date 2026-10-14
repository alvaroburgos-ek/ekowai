import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { runScenarioChain } from '@/lib/eval/scenario-chain';
import { buildFixtureBaseline, overridesFor, K5 } from '@/lib/scenarios/__fixtures__/hellenthal-a138';
import type { ScenarioSummary } from '@/lib/scenarios/types';

const a = vi.hoisted(() => ({ getScenarioResults: vi.fn() }));
vi.mock('@/lib/actions/scenarios', () => a);
import { ScenarioSheetPanel } from '../scenario-sheet-panel';

// Block body: Vitest 4 runs a function returned from beforeEach as teardown — returning the mock would call it after each test.
beforeEach(() => { a.getScenarioResults.mockReset(); });

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
  it.each([
    ['de', 'Fälle anzeigen', 'Die Fälle konnten nicht gerechnet werden', 'Fälle werden gerechnet …'],
    ['en', 'Show cases', 'The cases could not be computed', 'Computing cases …'],
  ] as const)('a thrown action (%s) shows an error and never leaves the busy text standing', async (locale, button, error, busy) => {
    a.getScenarioResults.mockRejectedValue(new Error('connection reset'));
    render(<ScenarioSheetPanel locale={locale} projectId="p" standardCode="DWA-A-138-1" worksheetCode="A138-13" />);
    fireEvent.click(screen.getByRole('button', { name: button }));
    expect(await screen.findByRole('alert')).toHaveTextContent(error);
    expect(screen.queryByText(busy)).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });
  it('A138-12 with a geometry case: the case column shows the tool-materialised A_S,m, marked (W)', async () => {
    const b = buildFixtureBaseline();
    const k5: ScenarioSummary = { id: 'k5', name: 'K5', reason: null, slot: 2, includeInReport: false, archivedAt: null, createdAt: '2026-10-14T00:00:00.000Z', overrides: [] };
    a.getScenarioResults.mockResolvedValue({ ok: true, available: true, standardCode: 'DWA-A-138-1', ignoredScenarioIds: [],
      real: runScenarioChain(b, [], { caseId: 'real', approvalWithholding: 'bypass' }),
      cases: [{ scenario: k5, run: runScenarioChain(b, overridesFor(K5), { caseId: 'k5', approvalWithholding: 'bypass' }) }] });
    render(<ScenarioSheetPanel locale="de" projectId="p" standardCode="DWA-A-138-1" worksheetCode="A138-12" />);
    fireEvent.click(screen.getByRole('button', { name: 'Fälle anzeigen' }));
    const cell = await screen.findByText('48,576 (W)');
    expect(cell.getAttribute('title')).toMatch(/vom Werkzeug berechnet/);
  });
});
