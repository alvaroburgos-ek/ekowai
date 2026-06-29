import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RainfallTablesEditor } from '../rainfall-tables-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { RETURN_PERIODS } from '@/lib/eval/rainfall-tables';

const FIELD = 'fld-rdn-table';

function initStore(value: unknown) {
  useWorksheetStore.getState().init('inst-1', { [FIELD]: { type: 'json', value } }, {}, {});
}

/** A native 2D table (no legacyDesignColumn). */
const NATIVE_TABLE = {
  id: 'n1',
  name: 'Krefeld 2D',
  source: 'KOSTRA-DWD-2020',
  columns: [1, 2, 3, 5, 10, 20, 30, 50, 100],
  rows: [
    { D_min: 10, r: { '5': 195, '10': 155, '30': 260 } },
    { D_min: 30, r: { '5': 130, '10': 100, '30': 180 } },
  ],
};

/** A legacy 1D table (Piece-2 shape → normalizer sets legacyDesignColumn:true). */
const LEGACY_TABLE = {
  id: 'k1',
  name: 'KOSTRA Krefeld',
  source: 'KOSTRA-DWD-2020',
  rows: [{ D_min: 10, r_D_n: 220 }, { D_min: 30, r_D_n: 130 }],
};

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

// ─────────────────────────────────────────────────────────────────────────────
// Task 6: 2D matrix editor
// ─────────────────────────────────────────────────────────────────────────────

describe('RainfallTablesEditor — 2D matrix (native table)', () => {
  beforeEach(() => {
    initStore({ tables: [NATIVE_TABLE] });
  });

  it('renders all 9 T_n column headers including 20a', () => {
    render(<RainfallTablesEditor fieldId={FIELD} />);
    // Expected labels: "1a", "2a", "3a", "5a", "10a", "20a", "30a", "50a", "100a"
    for (const rp of RETURN_PERIODS) {
      expect(screen.getByText(`${rp}a`)).toBeInTheDocument();
    }
  });

  it('renders a "D (min)" column header', () => {
    render(<RainfallTablesEditor fieldId={FIELD} />);
    expect(screen.getByText('D (min)')).toBeInTheDocument();
  });

  it('editing a cell writes r[Tn] into the stored carrier', () => {
    render(<RainfallTablesEditor fieldId={FIELD} />);
    // Find the cell input for T_n=5 (label "5a"), row 0 (D_min=10).
    // Each data row has one input per Tn + one for D_min.
    const inputs = screen.getAllByLabelText('r_D für 5a');
    fireEvent.change(inputs[0], { target: { value: '199' } });

    const stored = useWorksheetStore.getState().values[FIELD] as { value: { tables: Array<{ rows: Array<{ r: Record<string, number> }> }> } };
    expect(stored.value.tables[0].rows[0].r['5']).toBe(199);
  });

  it('editing D_min updates the row D_min', () => {
    render(<RainfallTablesEditor fieldId={FIELD} />);
    const dInputs = screen.getAllByLabelText('Dauerstufe D (min)');
    fireEvent.change(dInputs[0], { target: { value: '15' } });

    const stored = useWorksheetStore.getState().values[FIELD] as { value: { tables: Array<{ rows: Array<{ D_min: number }> }> } };
    expect(stored.value.tables[0].rows[0].D_min).toBe(15);
  });

  it('adding a row inserts an empty 2D row { D_min: null, r: {} }', () => {
    render(<RainfallTablesEditor fieldId={FIELD} />);
    fireEvent.click(screen.getByText('+ Zeile'));
    const stored = useWorksheetStore.getState().values[FIELD] as { value: { tables: Array<{ rows: unknown[] }> } };
    expect(stored.value.tables[0].rows).toHaveLength(3);
    const last = stored.value.tables[0].rows[2] as { D_min: unknown; r: Record<string, unknown> };
    expect(last.D_min).toBeNull();
    expect(last.r).toEqual({});
  });

  it('disables all inputs when readOnly', () => {
    render(<RainfallTablesEditor fieldId={FIELD} readOnly />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.every((el) => (el as HTMLInputElement).readOnly || (el as HTMLInputElement).disabled)).toBe(true);
  });
});

describe('RainfallTablesEditor — legacy design-column table', () => {
  beforeEach(() => {
    initStore({ tables: [LEGACY_TABLE] });
  });

  it('renders the design-column notice for a legacy table', () => {
    render(<RainfallTablesEditor fieldId={FIELD} />);
    // Should show "Altdaten" notice
    expect(screen.getByText(/Altdaten/i)).toBeInTheDocument();
    expect(screen.getByText(/Bemessungsspalte/i)).toBeInTheDocument();
  });

  it('renders the legacy curve values read-only (one per row)', () => {
    render(<RainfallTablesEditor fieldId={FIELD} />);
    // The two legacy rows have r_D_n = 220 and 130
    expect(screen.getByDisplayValue('220')).toBeInTheDocument();
    expect(screen.getByDisplayValue('130')).toBeInTheDocument();
  });

  it('clicking "2D-Raster erfassen" flips the table to native (legacyDesignColumn gone) when designReturnPeriod is set', () => {
    render(<RainfallTablesEditor fieldId={FIELD} designReturnPeriod={5} />);
    fireEvent.click(screen.getByText(/2D-Raster erfassen/i));

    const stored = useWorksheetStore.getState().values[FIELD] as {
      value: { tables: Array<{ legacyDesignColumn?: boolean; columns: number[]; rows: Array<{ r: Record<string, unknown> }> }> };
    };
    const t = stored.value.tables[0];
    expect(t.legacyDesignColumn).toBeFalsy();
    // Rows should now have native r object
    expect(t.rows[0].r).toBeDefined();
  });

  it('disables the "2D-Raster erfassen" action when readOnly', () => {
    render(<RainfallTablesEditor fieldId={FIELD} readOnly designReturnPeriod={5} />);
    const btn = screen.getByText(/2D-Raster erfassen/i) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 6 Bug Fix: convertLegacyToNative preserves r_D values into design column
// ─────────────────────────────────────────────────────────────────────────────

/** A legacy table with two rows, matching the PLT-HS-01 shape (n=0.2 → T_n=5). */
const LEGACY_TABLE_TWO_ROWS = {
  id: 'k2',
  name: 'KOSTRA Krefeld (PLT-HS-01)',
  source: 'KOSTRA-DWD-2020',
  rows: [
    { D_min: 10, r_D_n: 220 },
    { D_min: 30, r_D_n: 130 },
  ],
};

describe('RainfallTablesEditor — legacy→native conversion preserves r_D values (bug fix)', () => {
  beforeEach(() => {
    initStore({ tables: [LEGACY_TABLE_TWO_ROWS] });
  });

  it('with designReturnPeriod=5: each row\'s __legacyValue lands in r["5"]', () => {
    render(<RainfallTablesEditor fieldId={FIELD} designReturnPeriod={5} />);
    fireEvent.click(screen.getByText(/2D-Raster erfassen/i));

    const stored = useWorksheetStore.getState().values[FIELD] as {
      value: { tables: Array<{ legacyDesignColumn?: boolean; rows: Array<{ r: Record<string, unknown> }> }> };
    };
    const t = stored.value.tables[0];
    // Must be native now
    expect(t.legacyDesignColumn).toBeFalsy();
    // Row 0: r_D_n was 220 → must be in r['5']
    expect(t.rows[0].r['5']).toBe(220);
    // Row 1: r_D_n was 130 → must be in r['5']
    expect(t.rows[1].r['5']).toBe(130);
  });

  it('with designReturnPeriod=null: convert button is disabled and T_n-not-set note shows', () => {
    render(<RainfallTablesEditor fieldId={FIELD} designReturnPeriod={null} />);
    // Button must be disabled
    const btn = screen.getByText(/2D-Raster erfassen/i) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    // Note must be visible
    expect(
      screen.getByText(/Projekt-Wiederkehrzeit T_n nicht gesetzt/i),
    ).toBeInTheDocument();
  });

  it('with designReturnPeriod=5: shows "T_n = 5 a übernommen" hint', () => {
    render(<RainfallTablesEditor fieldId={FIELD} designReturnPeriod={5} />);
    expect(
      screen.getByText(/Bemessungsspalte T_n = 5 a übernommen/i),
    ).toBeInTheDocument();
  });
});
