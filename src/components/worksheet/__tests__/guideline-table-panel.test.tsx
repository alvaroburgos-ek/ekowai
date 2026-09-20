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

describe('Tab. 5 (A138-06)', () => {
  it('has the 19 printed groups with prod tokens and their categories; roofs are category I', () => {
    const t = GUIDELINE_TABLES.TAB5;
    expect(t.rows.map((r) => r.key)).toEqual(['D', 'VW1', 'V1', 'VW2', 'V2', 'V3', 'BG1', 'BF', 'BL', 'BG2', 'SD1', 'SD2', 'SV', 'SVW', 'SF', 'SL', 'BG3', 'SG', 'SA']);
    expect(t.rows.find((r) => r.key === 'D')!.writes).toEqual({ flaechengruppe: 'D', belastungskategorie: 'BK_I' });
    expect(t.rows.filter((r) => r.writes.belastungskategorie === 'BK_III').map((r) => r.key)).toEqual(['V3', 'SD2', 'SV', 'SVW', 'SF', 'SL', 'BG3', 'SG', 'SA']);
    expect(matchingRows(t, { flaechengruppe: 'D' })).toEqual(['D']);
  });

  it('a click on SD1 writes group and category II', () => {
    useWorksheetStore.getState().init('inst-1', { 'f-fg': { type: 'enum', value: 'D' }, 'f-bk': { type: 'enum', value: 'BK_I' } } as never, {}, {});
    render(<GuidelineTablePanel tableCode="TAB5" readOnly={false} fieldsBySymbol={{ flaechengruppe: { id: 'f-fg', dataType: 'enum' }, belastungskategorie: { id: 'f-bk', dataType: 'enum' } }} />);
    expect(screen.getByTestId('gt-row-TAB5-D').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('gt-row-TAB5-D').textContent).toMatch(/Alle Dachflächen ≤ 50 m²/);
    fireEvent.click(screen.getByTestId('gt-row-TAB5-SD1'));
    expect(val('f-fg')).toBe('SD1');
    expect(val('f-bk')).toBe('BK_II');
  });
});

describe('Tab. 6 (A138-06, display only)', () => {
  it('highlights the row of the chosen group and reads the (*) case for roofs as an authority question', () => {
    useWorksheetStore.getState().init('inst-1', { 'f-fg': { type: 'enum', value: 'D' } } as never, {}, {});
    render(<GuidelineTablePanel tableCode="TAB6" readOnly={false} fieldsBySymbol={{ flaechengruppe: { id: 'f-fg', dataType: 'enum' } }} />);
    expect(screen.getByTestId('gt-row-TAB6-D').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText(/Nur Anzeige — markiert ist die Zeile/)).toBeInTheDocument();
    expect(screen.getByTestId('gt-reading-TAB6').textContent).toMatch(/richten sich nach den rechtlichen Anforderungen und sind ggf\. mit der zuständigen Behörde abzustimmen/);
    expect(GUIDELINE_TABLES.TAB6.rows.find((r) => r.key === 'V2')!.cells[2]).toMatch(/A_C\/A_S,m ≤ 30/);
    expect(GUIDELINE_TABLES.TAB6.rows.find((r) => r.key === 'VW1')!.note).toMatch(/= Nein/);
  });
});

describe('remaining tables (7, 12, 13, A.1, 4, q_VS)', () => {
  it('registers every table on its worksheet', () => {
    expect(Object.keys(GUIDELINE_TABLES).sort()).toEqual(['QVS', 'TAB11', 'TAB12', 'TAB13', 'TAB14', 'TAB4', 'TAB5', 'TAB6', 'TAB7', 'TAB8', 'TABA1']);
    expect(TABLES_BY_WORKSHEET['A138-03']).toEqual(['TAB11', 'TABA1', 'TAB4']);
    expect(TABLES_BY_WORKSHEET['A138-06']).toEqual(['TAB5', 'TAB6', 'TAB7']);
  });

  it('Tab. 7 reads the case (roofs) as (*) and the traffic groups with their efficiencies', () => {
    expect(matchingRows(GUIDELINE_TABLES.TAB7, { flaechengruppe: 'D' })).toEqual(['D']);
    expect(GUIDELINE_TABLES.TAB7.rows.find((r) => r.key === 'V2')!.cells.slice(2, 4)).toEqual(['70 %', '65 % (**)']);
    expect(GUIDELINE_TABLES.TAB7.rows.find((r) => r.key === 'V3')!.note).toMatch(/η_AFS63 ≥ 80 %/);
  });

  it('Tab. 13 click writes the soil band; Tab. A.1 reads the sieve curve as suited to deep facilities and names the infiltrometer for swales', () => {
    useWorksheetStore.getState().init('inst-1', { 'f-sb': { type: 'enum', value: 'schluffig' }, 'f-ptm': { type: 'enum', value: 'korngroessenanalyse' } } as never, {}, {});
    render(<GuidelineTablePanel tableCode="TAB13" readOnly={false} fieldsBySymbol={{ soil_bodenart_tab13: { id: 'f-sb', dataType: 'enum' } }} />);
    expect(screen.getByTestId('gt-row-TAB13-schluffig').getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByTestId('gt-row-TAB13-mittel_feinsand'));
    expect(val('f-sb')).toBe('mittel_feinsand');
    render(<GuidelineTablePanel tableCode="TABA1" readOnly={false} fieldsBySymbol={{ permeability_test_method: { id: 'f-ptm', dataType: 'enum' } }} />);
    expect(screen.getByTestId('gt-row-TABA1-sieblinie').getAttribute('aria-pressed')).toBe('true'); // six columns ⇒ card layout
    expect(screen.getByTestId('gt-reading-TABA1').textContent).toMatch(/Doppelzylinder-Infiltrometer als geeignete Methode/);
  });

  it('Tab. 12 highlights the chosen method; Tab. 4 and q_VS are pure references', () => {
    expect(matchingRows(GUIDELINE_TABLES.TAB12, { design_method: 'einfaches_verfahren' })).toEqual(['einfaches_verfahren']);
    expect(GUIDELINE_TABLES.TAB4.rows).toHaveLength(5);
    expect(GUIDELINE_TABLES.QVS.rows.map((r) => r.cells[1])).toEqual(['q_VS = 0,2 l/(s·m)', 'q_VS = 5 l/(s·m)']);
  });
});
