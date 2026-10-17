import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ScenarioSummary } from '@/lib/scenarios/types';

const a = vi.hoisted(() => ({
  listScenarios: vi.fn(), createScenario: vi.fn(), duplicateScenario: vi.fn(), updateScenario: vi.fn(), archiveScenario: vi.fn(),
  setScenarioOverrides: vi.fn(), removeScenarioOverride: vi.fn(), setScenariosEnabled: vi.fn(), searchOverridableFields: vi.fn(),
}));
vi.mock('@/lib/actions/scenarios', () => a);
import { ScenariosPanel } from '../scenarios-panel';

const sc = (over: Partial<ScenarioSummary>): ScenarioSummary => ({
  id: 's1', name: 'K5', reason: 'Feldversuch', slot: 3, includeInReport: false, archivedAt: null, createdAt: '2026-10-14T00:00:00.000Z',
  overrides: [{ fieldId: 'f1', symbol: 'k_f', labelDe: 'Durchlässigkeit', labelEn: 'Permeability', unit: 'm/s', dataType: 'number', worksheetCode: 'A138-05', standardCode: 'DWA-A-138-1',
    value: { type: 'number', value: 1e-5 }, baseValueAtCreation: { type: 'number', value: 1e-6 }, currentReal: { type: 'number', value: 2e-6 }, drift: true, note: 'n' }],
  ...over,
});
beforeEach(() => {
  for (const f of Object.values(a)) f.mockReset();
  a.listScenarios.mockResolvedValue({ ok: true, available: true, enabled: true, scenarios: [sc({})] });
});

describe('ScenariosPanel', () => {
  it('says so when the tables are not set up', () => {
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: false, enabled: false, scenarios: [] }} />);
    expect(screen.getByText(/nicht eingerichtet/)).toBeTruthy();
  });
  it('switching „Fälle aktiv" on calls the setting action', async () => {
    a.setScenariosEnabled.mockResolvedValue({ ok: true });
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: true, enabled: false, scenarios: [] }} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Fälle aktiv/ }));
    await waitFor(() => expect(a.setScenariosEnabled).toHaveBeenCalledWith('p', true));
  });
  it('lists a case with its colour slot and the drift warning', () => {
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: true, enabled: true, scenarios: [sc({})] }} />);
    expect(screen.getByTestId('scenario-swatch-s1').getAttribute('style')).toContain('var(--scn-3)');
    expect(screen.getByText('Realwert geändert: 1·10⁻⁶ → 2·10⁻⁶')).toBeTruthy();
  });
  it('disables „Neuer Fall" at 6 active cases', () => {
    const six = [1, 2, 3, 4, 5, 6].map((n) => sc({ id: `s${n}`, slot: n, overrides: [] }));
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: true, enabled: true, scenarios: six }} />);
    expect((screen.getByRole('button', { name: 'Neuer Fall' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Höchstens 6 aktive Fälle/)).toBeTruthy();
  });
  it('creates a case with name and reason', async () => {
    a.createScenario.mockResolvedValue({ ok: true, scenario: sc({ id: 's9', name: 'K6' }) });
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: true, enabled: true, scenarios: [] }} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'K6' } });
    fireEvent.change(screen.getByLabelText('Grund'), { target: { value: 'Feldversuch' } });
    fireEvent.click(screen.getByRole('button', { name: 'Neuer Fall' }));
    await waitFor(() => expect(a.createScenario).toHaveBeenCalledWith({ projectId: 'p', name: 'K6', reason: 'Feldversuch' }));
  });
  it('adds an override: search, pick (real value shown), value + required note', async () => {
    a.searchOverridableFields.mockResolvedValue({ ok: true, fields: [{ fieldId: 'f9', symbol: 'k_f', labelDe: 'Durchlässigkeit', labelEn: null, unit: 'm/s', dataType: 'number', enumValues: null, worksheetCode: 'A138-05', standardCode: 'DWA-A-138-1', realValue: { type: 'number', value: 1e-6 } }] });
    a.setScenarioOverrides.mockResolvedValue({ ok: true, scenario: sc({}) });
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: true, enabled: true, scenarios: [sc({ overrides: [] })] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Wert ändern' }));
    fireEvent.change(screen.getByLabelText('Feld suchen (Bezeichnung oder Symbol)'), { target: { value: 'k_f' } });
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }));
    fireEvent.click(await screen.findByRole('button', { name: /Durchlässigkeit \(k_f\)/ }));
    expect(screen.getByText(/Realwert: 1·10⁻⁶ m\/s/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Fallwert'), { target: { value: '1e-5' } });
    const save = screen.getByRole('button', { name: 'Übernehmen' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Notiz (Herkunft der Annahme)'), { target: { value: 'Feldversuch' } });
    fireEvent.click(save);
    await waitFor(() => expect(a.setScenarioOverrides).toHaveBeenCalledWith('s1', [{ fieldId: 'f9', value: '1e-5', note: 'Feldversuch' }]));
  });
  it('archive asks first (in-app, no window.confirm); cancel keeps the case, confirm archives it', async () => {
    a.archiveScenario.mockResolvedValue({ ok: true });
    const prev = window.confirm; const wc = vi.fn(() => true); window.confirm = wc;
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: true, enabled: true, scenarios: [sc({})] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Archivieren' }));
    expect(a.archiveScenario).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('„K5" wirklich archivieren?');
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(a.archiveScenario).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Archivieren' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ja, archivieren' }));
    await waitFor(() => expect(a.archiveScenario).toHaveBeenCalledWith('s1'));
    expect(wc).not.toHaveBeenCalled();
    window.confirm = prev;
  });
  it('remove override asks first; EN wording', async () => {
    a.removeScenarioOverride.mockResolvedValue({ ok: true });
    render(<ScenariosPanel locale="en" projectId="p" initial={{ available: true, enabled: true, scenarios: [sc({})] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(a.removeScenarioOverride).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Remove Permeability (k_f) and its note from „K5"?');
    fireEvent.click(screen.getByRole('button', { name: 'Yes, remove' }));
    await waitFor(() => expect(a.removeScenarioOverride).toHaveBeenCalledWith('s1', 'f1'));
  });
  it('archive confirmation in EN', () => {
    render(<ScenariosPanel locale="en" projectId="p" initial={{ available: true, enabled: true, scenarios: [sc({})] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Archive „K5"?');
    expect(screen.getByRole('button', { name: 'Yes, archive' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });
  it('shows a refused override reason', async () => {
    a.searchOverridableFields.mockResolvedValue({ ok: true, fields: [{ fieldId: 'f9', symbol: 'k_f', labelDe: 'Durchlässigkeit', labelEn: null, unit: null, dataType: 'number', enumValues: null, worksheetCode: 'A138-05', standardCode: 'S', realValue: null }] });
    a.setScenarioOverrides.mockResolvedValue({ ok: false, error: 'Durchlässigkeit (k_f): 5 liegt über dem zulässigen Maximum 1.' });
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: true, enabled: true, scenarios: [sc({ overrides: [] })] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Wert ändern' }));
    fireEvent.change(screen.getByLabelText('Feld suchen (Bezeichnung oder Symbol)'), { target: { value: 'k_f' } });
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }));
    fireEvent.click(await screen.findByRole('button', { name: /Durchlässigkeit \(k_f\)/ }));
    fireEvent.change(screen.getByLabelText('Fallwert'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Notiz (Herkunft der Annahme)'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('zulässigen Maximum');
  });
});
