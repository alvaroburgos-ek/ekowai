import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RainfallTablesEditor } from '../rainfall-tables-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const FIELD = 'fld-rdn-table';

function initStore(value: unknown) {
  useWorksheetStore.getState().init('inst-1', { [FIELD]: { type: 'json', value } }, {}, {});
}

describe('RainfallTablesEditor', () => {
  beforeEach(() => {
    initStore({
      tables: [
        { id: 'k1', name: 'KOSTRA Krefeld', source: 'KOSTRA-DWD-2020', rows: [{ D_min: 10, r_D_n: 220 }] },
      ],
    });
  });

  it('renders existing tables with a source selector', () => {
    render(<RainfallTablesEditor fieldId={FIELD} />);
    expect(screen.getByDisplayValue('KOSTRA Krefeld')).toBeInTheDocument();
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
  });

  it('adds a new table when "Tabelle hinzufügen" is clicked', () => {
    render(<RainfallTablesEditor fieldId={FIELD} />);
    fireEvent.click(screen.getByText('Tabelle hinzufügen'));
    const stored = useWorksheetStore.getState().values[FIELD] as { value: { tables: unknown[] } };
    expect(stored.value.tables).toHaveLength(2);
  });

  it('disables adding when readOnly', () => {
    render(<RainfallTablesEditor fieldId={FIELD} readOnly />);
    expect((screen.getByText('Tabelle hinzufügen') as HTMLButtonElement).disabled).toBe(true);
  });
});
