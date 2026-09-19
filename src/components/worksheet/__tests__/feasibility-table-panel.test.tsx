import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeasibilityTablePanel } from '../feasibility-table-panel';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const IDS = { gw_clearance: 'f-gw', contaminated_land_status: 'f-alt', water_protection_zone: 'f-wsg', kf_initial_estimate: 'f-kf', geotech_hazards: 'f-geo', building_clearance_status: 'f-abst', slope_risk: 'f-hang' };

function init(overrides: Record<string, unknown> = {}) {
  const v: Record<string, unknown> = {
    'f-gw': { type: 'number', value: 3 }, 'f-alt': { type: 'enum', value: 'none' }, 'f-wsg': { type: 'enum', value: 'zone_III' },
    'f-kf': { type: 'number', value: 1.1e-5 }, 'f-geo': { type: 'enum', value: 'none' }, 'f-abst': { type: 'enum', value: 'met' }, 'f-hang': { type: 'enum', value: 'none' },
    ...overrides,
  };
  useWorksheetStore.getState().init('inst-1', v as never, {}, {});
}

describe('FeasibilityTablePanel (Tab. 3)', () => {
  beforeEach(() => init());

  it('renders the seven printed rows, highlights the case in column 3 and proposes "Bedingt umsetzbar"', () => {
    render(<FeasibilityTablePanel fieldIdBySymbol={IDS} determination={null} />);
    expect(screen.getByText(/Tabelle 3 — Überprüfung der Umsetzbarkeit/)).toBeInTheDocument();
    expect(screen.getByTestId('feasibility-table-overall').textContent).toMatch(/Spalte 3 · Versickerung ist potenziell möglich/);
    expect(screen.getByTestId('tab3-row-wsg').textContent).toMatch(/☑ Trinkwasserschutzgebiet liegt vor; Risiko einer Verschmutzung durch die Versickerungsanlage ist aber sehr gering/);
    expect(screen.getByTestId('tab3-row-mhgw').textContent).toMatch(/☑ Abstand Sohle Versickerungsanlage zum MHGW ≥ 1 m/);
    expect(screen.getByTestId('feasibility-table-hint').textContent).toMatch(/Vorschlag für die Umsetzbarkeitsbestimmung: Bedingt umsetzbar/);
    expect(screen.getByText(/Wenn eine oder mehrere Kriterien dieser Kategorie zutreffen/)).toBeInTheDocument();
  });

  it('flags a determination that contradicts the table', () => {
    render(<FeasibilityTablePanel fieldIdBySymbol={IDS} determination="feasible" />);
    expect(screen.getByTestId('feasibility-table-hint').textContent).toMatch(/Die Tabelle ergibt Spalte 3 \(Bedingt umsetzbar\); die Umsetzbarkeitsbestimmung steht auf „Umsetzbar“/);
  });

  it('shows what is still open', () => {
    init({ 'f-hang': { type: 'enum', value: null } });
    render(<FeasibilityTablePanel fieldIdBySymbol={IDS} determination={null} />);
    expect(screen.getByTestId('feasibility-table-overall').textContent).toMatch(/offen: hang/);
  });
});
