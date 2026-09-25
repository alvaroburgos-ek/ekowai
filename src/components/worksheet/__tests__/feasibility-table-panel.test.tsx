import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
import { render, screen, fireEvent } from '@testing-library/react';
import { FeasibilityTablePanel, type Tab3FieldMeta } from '../feasibility-table-panel';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const META: Record<string, Tab3FieldMeta> = {
  gw_clearance: { id: 'f-gw', dataType: 'number' },
  contaminated_land_status: { id: 'f-alt', dataType: 'enum' },
  water_protection_zone: { id: 'f-wsg', dataType: 'enum', inheritedFrom: 'A138-01' },
  kf_initial_estimate: { id: 'f-kf', dataType: 'number' },
  geotech_hazards: { id: 'f-geo', dataType: 'enum' },
  building_clearance_status: { id: 'f-abst', dataType: 'enum' },
  slope_risk: { id: 'f-hang', dataType: 'enum' },
};
const DET = 'f-det';
const base = { fieldsBySymbol: META, determinationFieldId: DET, readOnly: false, locale: 'de', projectId: 'p1', standardCode: 'DWA-A-138-1' };

function init(overrides: Record<string, unknown> = {}) {
  const v: Record<string, unknown> = {
    'f-gw': { type: 'number', value: 3 }, 'f-alt': { type: 'enum', value: 'none' }, 'f-wsg': { type: 'enum', value: 'zone_III' },
    'f-kf': { type: 'number', value: 1.1e-5 }, 'f-geo': { type: 'enum', value: 'none' }, 'f-abst': { type: 'enum', value: 'met' }, 'f-hang': { type: 'enum', value: 'none' },
    ...overrides,
  };
  useWorksheetStore.getState().init('inst-1', v as never, {}, {});
}
const val = (id: string) => (useWorksheetStore.getState().values[id] as { value: unknown } | undefined)?.value;

describe('FeasibilityTablePanel (Tab. 3 as input)', () => {
  beforeEach(() => init());

  it('renders the seven printed rows, highlights the case in column 3 and proposes "Bedingt umsetzbar"', () => {
    render(<FeasibilityTablePanel {...base} />);
    expect(screen.getByTestId('feasibility-table-overall').textContent).toMatch(/Spalte 3 · Versickerung ist potenziell möglich/);
    expect(screen.getByTestId('tab3-row-wsg').textContent).toMatch(/☑ Trinkwasserschutzgebiet liegt vor; Risiko einer Verschmutzung durch die Versickerungsanlage ist aber sehr gering/);
    expect(screen.getByTestId('tab3-num-mhgw').textContent).toBe('3 m');
    expect(screen.getByTestId('tab3-num-kf').textContent).toMatch(/1,1 · 10⁻5 m\/s/);
    expect(screen.getByTestId('feasibility-table-hint').textContent).toMatch(/Vorschlag für die Umsetzbarkeitsbestimmung: Bedingt umsetzbar/);
  });

  it('a click on a cell writes the answer to the store (autosave path) and moves the tick', () => {
    render(<FeasibilityTablePanel {...base} />);
    fireEvent.click(screen.getByTestId('tab3-cell-hang-3'));
    expect(val('f-hang')).toBe('unlikely');
    expect(useWorksheetStore.getState().pendingFieldIds.has('f-hang')).toBe(true);
    expect(screen.getByTestId('tab3-row-hang').textContent).toMatch(/☑ Der Standort der Versickerungsanlage liegt in der Nähe eines Hangs/);
    fireEvent.click(screen.getByTestId('tab3-cell-geotech-4'));
    expect(val('f-geo')).toBe('at_site');
    expect(screen.getByTestId('feasibility-table-overall').textContent).toMatch(/Spalte 4/);
  });

  it('the protection-zone row (inherited from A138-01) and the numeric rows are not clickable', () => {
    render(<FeasibilityTablePanel {...base} />);
    expect(screen.queryByTestId('tab3-cell-wsg-2')).toBeNull();
    expect(screen.queryByTestId('tab3-cell-mhgw-3')).toBeNull();
    expect(screen.getByTestId('tab3-row-wsg').textContent).toMatch(/← A138-01/);
  });

  it('"Übernehmen" sets feasibility_determination to the table\'s column; a contradicting value is flagged', () => {
    render(<FeasibilityTablePanel {...base} />);
    fireEvent.click(screen.getByTestId('tab3-adopt'));
    expect(val(DET)).toBe('conditional');
    expect(screen.getByTestId('feasibility-table-hint').textContent).toMatch(/„Bedingt umsetzbar“ entspricht Spalte 3/);
    init({ [DET]: { type: 'enum', value: 'feasible' } });
    render(<FeasibilityTablePanel {...base} />);
    expect(screen.getAllByTestId('feasibility-table-hint').at(-1)!.textContent).toMatch(/Die Tabelle ergibt Spalte 3 \(Bedingt umsetzbar\); die Umsetzbarkeitsbestimmung steht auf „Umsetzbar“/);
  });

  it('read-only (approved) worksheets render no buttons', () => {
    render(<FeasibilityTablePanel {...base} readOnly />);
    expect(screen.queryByTestId('tab3-cell-hang-3')).toBeNull();
    expect(screen.queryByTestId('tab3-adopt')).toBeNull();
  });
});
