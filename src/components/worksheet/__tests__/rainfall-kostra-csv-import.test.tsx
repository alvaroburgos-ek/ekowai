/**
 * "KOSTRA-CSV einfügen" on the rainfall-tables editor: pasting the DWD cell
 * file replaces the table's grid with the printed r_D(n) values (no typing of
 * 22 × 9 cells), tags the source KOSTRA-DWD-2020 and reports errors inline.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RainfallTablesEditor } from '../rainfall-tables-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const FIELD = 'fld-rdn-table';
const HEADER = 'D_min;hN_T1;hN_T2;hN_T3;hN_T5;hN_T10;hN_T20;hN_T30;hN_T50;hN_T100;rN_T1;rN_T2;rN_T3;rN_T5;rN_T10;rN_T20;rN_T30;rN_T50;rN_T100;UC_T5;UC_T10';
const ROW5 = '5;6,0;7,4;8,3;9,4;11,0;12,7;13,8;15,2;17,3;200,0;246,7;276,7;313,3;366,7;423,3;460,0;506,7;576,7;11;12';
const ROW10 = '10;8,0;9,9;11,0;12,5;14,6;16,9;18,3;20,2;23,0;133,3;165,0;183,3;208,3;243,3;281,7;305,0;336,7;383,3;15;16';

type Stored = { value: { tables: Array<{ id: string; source: string; columns: number[]; rows: Array<{ D_min: number | null; r: Record<string, number | null> }>; legacyDesignColumn?: boolean }> } };
const stored = () => useWorksheetStore.getState().values[FIELD] as Stored;

describe('RainfallTablesEditor — KOSTRA CSV import', () => {
  beforeEach(() => {
    useWorksheetStore.getState().init('inst-1', {
      [FIELD]: {
        type: 'json',
        value: { tables: [{ id: 'n1', name: 'Zelle', source: 'engineer', columns: [1, 2, 3, 5, 10, 20, 30, 50, 100], rows: [{ D_min: 99, r: { '5': 1 } }] }] },
      },
    }, {}, {});
  });

  it('replaces the grid with the pasted rows and tags the source KOSTRA-DWD-2020', () => {
    render(<RainfallTablesEditor fieldId={FIELD} />);
    fireEvent.click(screen.getByText('KOSTRA-CSV einfügen'));
    fireEvent.change(screen.getByLabelText('KOSTRA-CSV Inhalt'), { target: { value: `${HEADER}\n${ROW5}\n${ROW10}` } });
    fireEvent.click(screen.getByText('Übernehmen'));

    const t = stored().value.tables[0];
    expect(t.source).toBe('KOSTRA-DWD-2020');
    expect(t.rows.map((r) => r.D_min)).toEqual([5, 10]);
    expect(t.rows[0].r['10']).toBe(366.7);
    expect(t.rows[1].r['100']).toBe(383.3);
    expect(t.columns).toEqual([1, 2, 3, 5, 10, 20, 30, 50, 100]);
    expect(screen.getByTestId('kostra-import-status').textContent).toMatch(/2 Dauerstufen/);
    // the cells are now in the grid inputs
    expect((screen.getAllByLabelText('Dauerstufe D (min)')[0] as HTMLInputElement).value).toBe('5');
  });

  it('shows the parser error inline and leaves the table untouched', () => {
    render(<RainfallTablesEditor fieldId={FIELD} />);
    fireEvent.click(screen.getByText('KOSTRA-CSV einfügen'));
    fireEvent.change(screen.getByLabelText('KOSTRA-CSV Inhalt'), { target: { value: 'D_min;hN_T5\n5;9,4' } });
    fireEvent.click(screen.getByText('Übernehmen'));
    expect(screen.getByRole('alert').textContent).toMatch(/rN_T/);
    expect(stored().value.tables[0].rows[0].D_min).toBe(99);
    expect(stored().value.tables[0].source).toBe('engineer');
  });

  it('converts a legacy 1D table into a native grid on import', () => {
    useWorksheetStore.getState().init('inst-1', {
      [FIELD]: { type: 'json', value: { tables: [{ id: 'k1', name: 'alt', source: 'KOSTRA-DWD-2020', rows: [{ D_min: 10, r_D_n: 220 }] }] } },
    }, {}, {});
    render(<RainfallTablesEditor fieldId={FIELD} />);
    fireEvent.click(screen.getByText('KOSTRA-CSV einfügen'));
    fireEvent.change(screen.getByLabelText('KOSTRA-CSV Inhalt'), { target: { value: `${HEADER}\n${ROW5}` } });
    fireEvent.click(screen.getByText('Übernehmen'));
    const t = stored().value.tables[0];
    expect(t.legacyDesignColumn).toBeUndefined();
    expect(t.rows).toEqual([{ D_min: 5, r: { '1': 200, '2': 246.7, '3': 276.7, '5': 313.3, '10': 366.7, '20': 423.3, '30': 460, '50': 506.7, '100': 576.7 } }]);
  });

  it('is disabled when readOnly', () => {
    render(<RainfallTablesEditor fieldId={FIELD} readOnly />);
    expect((screen.getByText('KOSTRA-CSV einfügen') as HTMLButtonElement).disabled).toBe(true);
  });
});
