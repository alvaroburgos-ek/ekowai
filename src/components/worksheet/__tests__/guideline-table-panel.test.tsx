import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GuidelineTablePanel } from '../guideline-table-panel';
import { GUIDELINE_TABLES, TABLES_BY_WORKSHEET, matchingRows } from '@/lib/eval/guideline-tables';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const val = (id: string) => (useWorksheetStore.getState().values[id] as { value: unknown } | undefined)?.value;

describe('guideline tables (data)', () => {
  it('Tab. 11 has the six printed rows with their factors; Tab. 8 eight rows (4 categories × 2 bands); Tab. 14 seven facilities', () => {
    expect(GUIDELINE_TABLES.TAB11.rows.map((r) => r.writes.f_methode)).toEqual([1, 0.9, 0.9, 0.8, 0.7, 0.1]);
    expect(GUIDELINE_TABLES.TAB8.rows.map((r) => r.writes.n)).toEqual([0.33, 0.5, 0.2, 0.33, 0.2, 0.2, 0.1, 0.1]);
    expect(GUIDELINE_TABLES.TAB8.rows[7].writes.T_n).toBe(10);
    expect(GUIDELINE_TABLES.TAB14.rows.map((r) => r.key)).toEqual(['flaeche', 'mulde', 'MRE', 'MRS', 'rigole', 'schacht', 'becken']);
    expect(GUIDELINE_TABLES.TAB14.rows[2].cells.find((c) => c.startsWith('Freibord'))).toMatch(/Zelle leer gedruckt/); // a138-U-6
    expect(TABLES_BY_WORKSHEET['A138-08']).toEqual(['TAB8']);
  });

  it('matches the case: f_Methode 0,1 = Sieblinie; n 0,1 with A_C ≤ 800 = (4) sehr stark; facility mulde', () => {
    expect(matchingRows(GUIDELINE_TABLES.TAB11, { f_methode: 0.1, permeability_test_method: 'korngroessenanalyse' })).toEqual(['labor_gestoert_sieblinie']);
    expect(matchingRows(GUIDELINE_TABLES.TAB8, { n: 0.1, ac_band: 'le800' })).toEqual(['sehr_stark|le800']);
    expect(matchingRows(GUIDELINE_TABLES.TAB8, { n: 0.2, ac_band: 'le800' })).toEqual(['maessig|le800', 'stark|le800']); // both print ≤ 0,2/a — category not stored yet
    expect(matchingRows(GUIDELINE_TABLES.TAB14, { facility_type_selected: 'mulde' })).toEqual(['mulde']);
  });
});

describe('GuidelineTablePanel', () => {
  beforeEach(() => {
    useWorksheetStore.getState().init('inst-1', {
      'f-fm': { type: 'number', value: 0.1 }, 'f-ptm': { type: 'enum', value: 'korngroessenanalyse' },
      'f-n': { type: 'number', value: 0.1 }, 'f-tn': { type: 'number', value: 10 },
      'f-ft': { type: 'enum', value: 'mulde' },
    } as never, {}, {});
  });

  it('Tab. 11: highlights the Sieblinie row and a click on "Open-End-Test" writes f_methode 0,8 + Feldversuch', () => {
    render(<GuidelineTablePanel tableCode="TAB11" readOnly={false} fieldsBySymbol={{ f_methode: { id: 'f-fm', dataType: 'number' }, permeability_test_method: { id: 'f-ptm', dataType: 'enum' } }} />);
    expect(screen.getByTestId('gt-row-TAB11-labor_gestoert_sieblinie').getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByTestId('gt-row-TAB11-open_end_test'));
    expect(val('f-fm')).toBe(0.8);
    expect(val('f-ptm')).toBe('feldversuch');
    expect(screen.getByTestId('gt-row-TAB11-open_end_test').getAttribute('aria-selected')).toBe('true');
  });

  it('Tab. 8: highlights (4) sehr stark for n 0,1 and A_C ≤ 800; a click on (3) stark writes n 0,2 and T_n 5', () => {
    render(<GuidelineTablePanel tableCode="TAB8" readOnly={false} extraValues={{ ac_band: 'le800' }} fieldsBySymbol={{ n: { id: 'f-n', dataType: 'number' }, T_n: { id: 'f-tn', dataType: 'number' } }} />);
    expect(screen.getByTestId('gt-row-TAB8-sehr_stark|le800').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('gt-row-TAB8-sehr_stark|gt800').getAttribute('aria-selected')).toBe('false');
    fireEvent.click(screen.getByTestId('gt-row-TAB8-stark|le800'));
    expect(val('f-n')).toBe(0.2);
    expect(val('f-tn')).toBe(5);
    expect(screen.getByText(/Nach DIN 1986-100 ist kein rechnerischer Überflutungsnachweis erforderlich/)).toBeInTheDocument();
  });

  it('Tab. 14: card per facility, chosen one pressed; click sets facility_type_selected; read-only when the target is inherited', () => {
    const { unmount } = render(<GuidelineTablePanel tableCode="TAB14" readOnly={false} fieldsBySymbol={{ facility_type_selected: { id: 'f-ft', dataType: 'enum' } }} />);
    expect(screen.getByTestId('gt-row-TAB14-mulde').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('gt-row-TAB14-mulde').textContent).toMatch(/Einstauhöhe \[cm\]: für Mulden i\. d\. R\. ≤ 30/);
    fireEvent.click(screen.getByTestId('gt-row-TAB14-rigole'));
    expect(val('f-ft')).toBe('rigole');
    unmount();
    render(<GuidelineTablePanel tableCode="TAB14" readOnly={false} fieldsBySymbol={{ facility_type_selected: { id: 'f-ft', dataType: 'enum', inheritedFrom: 'A138-15' } }} />);
    expect((screen.getByTestId('gt-row-TAB14-becken') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/liegt auf einem anderen Arbeitsblatt — nur Anzeige/)).toBeInTheDocument();
  });
});
