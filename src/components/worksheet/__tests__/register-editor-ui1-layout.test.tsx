/**
 * UI-1 / B1 (owner rule, 100 % zoom): the register table lives in its own horizontal scroll
 * container, the first column stays pinned, numeric and select cells carry a minimum width and
 * every chosen option / value carries a title tooltip with the full text.
 *
 * B3 (FLLNT-08 equipment list): a register whose config marks no column required treats its
 * first text column as required for completeness; the summary counts ROWS first.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor, NUM_CELL_MIN, SELECT_CELL_MIN, withDefaultRequired } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { REGISTER_CONFIGS_FALLBACK, resolveRegisterConfig } from '@/lib/eval/register-configs';
import { SELECTION_CONFIGS } from '@/lib/eval/selection-fields';
import type { RegisterUiConfig } from '@/lib/eval/field-config';

const FIELD_ID = 'fixture-register';
const surface = REGISTER_CONFIGS_FALLBACK.surface_inventory;
const STD = 'DWA-A-138-1';

function initStore(value?: unknown) {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance', value !== undefined ? { [FIELD_ID]: { type: 'json', value } } : {}, {}, {});
  });
}
beforeEach(() => initStore());

describe('B1 — register layout at 100 % zoom (UI-1)', () => {
  const row = { id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 1.179, c_i: 0.9, c_s: 1.0, coeff_override: false };

  it('the table sits in its own horizontal scroll container bounded to the column width', () => {
    initStore({ rows: [row] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} />);
    const box = screen.getByTestId('register-scroll');
    expect(box).toHaveClass('overflow-x-auto');
    expect(box).toHaveClass('max-w-full');
    expect(box.querySelector('table')).not.toBeNull();
    // No negative-margin bleed and no forced table minimum: the page column must never move.
    expect(box.className).not.toMatch(/-mx-/);
    expect(box.querySelector('table')!.className).not.toMatch(/min-w-\[40rem\]/);
  });

  it('the first column (label) is sticky in header and body while the rest scrolls', () => {
    initStore({ rows: [row] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} />);
    const ths = screen.getAllByRole('columnheader');
    expect(ths[0]).toHaveClass('sticky');
    expect(ths[0]).toHaveClass('left-0');
    expect(ths[1]).not.toHaveClass('sticky');
    const firstCell = screen.getByTestId('cell-label');
    expect(firstCell).toHaveClass('sticky');
    expect(firstCell).toHaveClass('left-0');
    expect(screen.getByTestId('cell-area_m2')).not.toHaveClass('sticky');
  });

  it('numeric inputs and their cells carry the 6-character minimum width; the value is in the tooltip', () => {
    initStore({ rows: [row] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} />);
    const area = screen.getByLabelText('Fläche') as HTMLInputElement;
    expect(area).toHaveClass(NUM_CELL_MIN);
    expect(screen.getByTestId('cell-area_m2')).toHaveClass(NUM_CELL_MIN);
    expect(area).toHaveAttribute('title', '1,179 m²');
    // header of a numeric column also reserves the width and carries the full label + unit
    const th = screen.getByRole('columnheader', { name: 'A (m²)' });
    expect(th).toHaveClass(NUM_CELL_MIN);
    expect(th).toHaveAttribute('title', 'A (m²)');
  });

  it('select cells carry a minimum width and the chosen option label as tooltip; every option carries its label as title', () => {
    initStore({ rows: [row] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} />);
    const sel = screen.getByLabelText('Oberflächentyp') as HTMLSelectElement;
    expect(sel).toHaveClass(SELECT_CELL_MIN);
    expect(screen.getByTestId('cell-tab9_value')).toHaveClass(SELECT_CELL_MIN);
    expect(sel).toHaveAttribute('title', 'Schwarzdecken (Asphalt)');
    expect(screen.getByRole('option', { name: 'Schwarzdecken (Asphalt)' })).toHaveAttribute('title', 'Schwarzdecken (Asphalt)');
    // an empty select has no stale tooltip
    initStore({ rows: [{ ...row, tab9_value: null, c_i: null, c_s: null }] });
    expect((screen.getByLabelText('Oberflächentyp') as HTMLSelectElement)).not.toHaveAttribute('title');
  });

  it('enum select in a 13-column-class register: the chosen label is the tooltip, derived badge stays reachable in the scroll box', async () => {
    const user = userEvent.setup();
    const config: RegisterUiConfig = {
      title: 'Filterstufen', columns: [
        { key: 'name', label: 'Bezeichnung', type: 'text' },
        { key: 'art', label: 'Art', type: 'enum', options: ['substratfilter', 'biofilm'], option_labels: { substratfilter: 'Substratfilter', biofilm: 'Biofilmfilter' } },
        { key: 'fliess', label: 'Fließrichtung', type: 'enum', options: ['vertikal_down'], option_labels: { vertikal_down: 'vertikal durchströmt (abwärts)' } },
        { key: 'q', label: 'Q', type: 'number', unit: 'm³/h' },
        { key: 'ok', label: 'Prüfung', type: 'derived', display: 'badge', expr: "if(q > 0, 'ok', 'offen')", value_labels: { ok: 'ok', offen: 'offen' } },
      ],
    } as RegisterUiConfig;
    initStore({ rows: [{ id: 'a', name: 'F1', art: '', fliess: '', q: 0.2 }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="filterstufen" config={config} standardCode="FLL-NT" />);
    await user.selectOptions(screen.getByLabelText('Art'), 'substratfilter');
    expect(screen.getByLabelText('Art')).toHaveAttribute('title', 'Substratfilter');
    await user.selectOptions(screen.getByLabelText('Fließrichtung'), 'vertikal_down');
    expect(screen.getByLabelText('Fließrichtung')).toHaveAttribute('title', 'vertikal durchströmt (abwärts)');
    expect(screen.getByLabelText('Q')).toHaveAttribute('title', '0,2 m³/h');
    const badge = screen.getByTestId('derived-badge-ok');
    expect(badge).toHaveTextContent('ok');
    expect(badge).toHaveAttribute('title', 'ok');
    expect(screen.getByTestId('register-scroll').contains(badge)).toBe(true);
  });
});

describe('B3 — completeness + summary of the legacy checklist register (FLLNT-08 equipment list)', () => {
  const equipment = resolveRegisterConfig({ symbol: 'equipment_elements_list', dataType: 'json', widget: null })!;
  const eq = SELECTION_CONFIGS.equipment_elements_list;
  if (eq.kind !== 'register') throw new Error('config');

  it('withDefaultRequired marks the first text column required only when no column is required', () => {
    const cols = withDefaultRequired(equipment.columns);
    expect(cols.map((c) => !!c.required)).toEqual([true, false, false]);
    expect(cols[0].key).toBe('element');
    // explicit required ⇒ untouched (same reference)
    const explicit = [{ key: 'a', label: 'A', type: 'text' as const }, { key: 'b', label: 'B', type: 'number' as const, required: true }];
    expect(withDefaultRequired(explicit)).toBe(explicit);
  });

  it('"+ Element" adds an empty row that is NOT complete; the summary counts rows first', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="equipment_elements_list" config={equipment} standardCode="FLL-NT" />);
    await user.click(screen.getByRole('button', { name: '+ Element' }));
    expect(screen.getByTestId('rows-count')).toHaveTextContent('1');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('0/1');
    const summary = screen.getByTestId('rows-count').parentElement!.textContent ?? '';
    expect(summary).toMatch(/1\s*Einträge · 0\/1\s*vollständig/);
    await user.type(screen.getByRole('textbox', { name: 'Element' }), 'Skimmer');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('1/1');
    // the stored carrier is unchanged in shape: three text cells, no `required` leakage
    const v = useWorksheetStore.getState().values[FIELD_ID];
    expect(v?.type === 'json' ? (v.value as { rows: unknown[] }).rows[0] : null).toMatchObject({ element: 'Skimmer', typ: '', bemerkung: '' });
  });

  it('one present row with an empty first column reads "1 Einträge · 0/1 vollständig" (not "0 Einträge")', () => {
    initStore({ rows: [{ id: 'x', element: '', typ: 'Oase', bemerkung: '' }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="equipment_elements_list" config={equipment} standardCode="FLL-NT" />);
    const summary = screen.getByTestId('rows-count').parentElement!.textContent ?? '';
    expect(summary).toMatch(/^1\s*Einträge · 0\/1\s*vollständig/);
  });

  it('the note no longer claims the source is missing from the library', () => {
    expect(eq.note).not.toMatch(/nicht in der Bibliothek/);
    expect(eq.note).toMatch(/nicht erfunden/);
    const plants = SELECTION_CONFIGS.plant_species_list;
    if (plants.kind !== 'register') throw new Error('config');
    expect(plants.note).not.toMatch(/nicht in der Bibliothek/);
    expect(plants.note).toMatch(/nicht erfunden/);
  });
});
