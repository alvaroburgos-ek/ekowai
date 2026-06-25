import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SurfaceInventoryEditor } from '../surface-inventory-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { normalizeSurfaceCarrier, type SurfaceInventoryCarrier } from '@/lib/eval/surface-inventory';

const FIELD_ID = 'fixture-surface-inventory';

function initStore(initial?: SurfaceInventoryCarrier) {
  act(() => {
    useWorksheetStore.getState().init(
      'fixture-instance',
      initial ? { [FIELD_ID]: { type: 'json', value: initial } } : {},
      {},
      {},
    );
  });
}

function storedCarrier(): SurfaceInventoryCarrier {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? (v.value as SurfaceInventoryCarrier) : { rows: [] };
}

beforeEach(() => initStore());

describe('SurfaceInventoryEditor — Tab. 9 picker', () => {
  it('selecting an Oberflächentyp auto-fills C_i/C_s read-only and derives kind', async () => {
    const user = userEvent.setup();
    render(<SurfaceInventoryEditor fieldId={FIELD_ID} />);
    await user.click(screen.getByRole('button', { name: '+ Zeile hinzufügen' }));

    const typeSelect = screen.getByLabelText('Oberflächentyp');
    await user.selectOptions(typeSelect, 'park_flach');

    const row = storedCarrier().rows[0];
    expect(row.tab9_value).toBe('park_flach');
    expect(row.c_i).toBe(0.1);
    expect(row.c_s).toBe(0.2);
    expect(row.coeff_override).toBe(false);

    // C_i / C_s are read-only (not editable inputs) until override.
    expect(screen.getByTestId('c_i-readonly')).toHaveTextContent('0,1');
    expect(screen.getByTestId('c_s-readonly')).toHaveTextContent('0,2');
    expect(screen.getByTestId('kind-badge')).toHaveTextContent('unbefestigt');
  });

  it('"abweichend wählen" makes C_i/C_s editable, flags override, keeps the Tab. 9 pair visible', async () => {
    const user = userEvent.setup();
    initStore(
      normalizeSurfaceCarrier({
        rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }],
      }),
    );
    render(<SurfaceInventoryEditor fieldId={FIELD_ID} />);

    await user.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    const ci = screen.getByLabelText('C_i (abweichend)');
    await user.clear(ci);
    await user.type(ci, '0.75');

    const row = storedCarrier().rows[0];
    expect(row.coeff_override).toBe(true);
    expect(row.c_i).toBe(0.75);
    expect(row.tab9_value).toBe('schwarzdecke_asphalt'); // unchanged
    // Original Tab. 9 pair shown for audit.
    expect(screen.getByTestId('tab9-original')).toHaveTextContent('Tab. 9: 0,9 / 1');
  });

  it('migrates legacy rows on load: Gewächshausdach drops to reselection, others clean', () => {
    initStore();
    act(() => {
      useWorksheetStore.getState().init(
        'fixture-instance',
        {
          [FIELD_ID]: {
            type: 'json',
            value: {
              rows: [
                { id: 'g', label: 'Gewächshausdach', surface_type: 'dach', area_m2: 3786.8, c_i: 0.9, c_s: 1.0 },
                { id: 'p', label: 'Parkplatz', surface_type: 'asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0 },
              ],
            },
          },
        },
        {},
        {},
      );
    });
    render(<SurfaceInventoryEditor fieldId={FIELD_ID} />);
    // Gewächshausdach row shows the reselection badge.
    expect(screen.getByText(/Oberflächentyp neu wählen/i)).toBeInTheDocument();
    // Footer totals: A_E,b,a counts only complete paved rows (Parkplatz 1575.9);
    // Gewächshausdach is incomplete ⇒ excluded.
    expect(screen.getByTestId('total-paved')).toHaveTextContent('1.575,9');
    expect(screen.getByTestId('total-unpaved')).toHaveTextContent('0');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('1/2');
  });
});
