import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import userEvent from '@testing-library/user-event';
import { RegisterEditor, ReadOnlyRegisterTable, storedRows, tableLabel, registerPlacement } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { REGISTER_CONFIGS_FALLBACK } from '@/lib/eval/register-configs';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';
import type { RegisterUiConfig } from '@/lib/eval/field-config';

const FIELD_ID = 'fixture-register';
const surface = REGISTER_CONFIGS_FALLBACK.surface_inventory;
const STD = 'DWA-A-138-1';

function initStore(value?: unknown) {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance', value !== undefined ? { [FIELD_ID]: { type: 'json', value } } : {}, {}, {});
  });
}
function stored(): { rows: Array<Record<string, unknown>> } & Record<string, unknown> {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? (v.value as { rows: Array<Record<string, unknown>> }) : { rows: [] };
}
beforeEach(() => initStore());

describe('RegisterEditor — lookup_key / lookup_value / derived (A138 fallback config as fixture)', () => {
  it('selecting a lookup_key fills the lookup_value cells from the table, resets the override flag, shows the derived badge', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} />);
    expect(screen.getByTestId('register-editor')).toHaveAttribute('data-symbol', 'surface_inventory');
    expect(screen.getByText('Noch keine Einträge. „+ Zeile hinzufügen“ fügt eine Zeile hinzu.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Zeile hinzufügen' }));
    await user.selectOptions(screen.getByLabelText('Oberflächentyp'), 'park_flach');
    const row = stored().rows[0];
    expect(row).toMatchObject({ tab9_value: 'park_flach', c_i: 0.1, c_s: 0.2, coeff_override: false });
    expect(row).not.toHaveProperty('kind');                    // derived cells are never stored
    expect(row).not.toHaveProperty('a_c_i');
    expect(screen.getByTestId('lookup-value-c_i')).toHaveTextContent('0,1');
    expect(screen.getByTestId('lookup-value-c_s')).toHaveTextContent('0,2');
    expect(screen.getByTestId('derived-badge-kind')).toHaveTextContent('unbefestigt');
    expect(screen.getByTestId('derived-a_c_i')).toHaveTextContent('—');   // area missing ⇒ null derived cell
  });
  it('the lookup_key select groups rows by lookup.group_by with the table row label as option text', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} />);
    act(() => { useWorksheetStore.getState().setField(FIELD_ID, { type: 'json', value: { rows: [{ id: 'r', label: '', tab9_value: null, area_m2: null, c_i: null, c_s: null, coeff_override: false }] } }); });
    const select = screen.getByLabelText('Oberflächentyp') as HTMLSelectElement;
    const groups = [...select.querySelectorAll('optgroup')].map((g) => g.label);
    expect(groups).toEqual(['Wasserundurchlässige Flächen', 'Teildurchlässige / schwach ableitende Flächen', 'Durchlässige Flächen']);
    expect(screen.getByRole('option', { name: 'Schwarzdecken (Asphalt)' })).toBeInTheDocument();
    expect(screen.getByTestId('reselect-tab9_value')).toHaveTextContent('⚠ Oberflächentyp neu wählen (Tab. 9)');
    expect(screen.queryByRole('button', { name: 'abweichend wählen' })).toBeNull();   // no key ⇒ no override toggle
  });
  it('"abweichend wählen" makes the applies_to cells editable, sets the flag, keeps the table pair visible; "Tab. 9 übernehmen" reverts', async () => {
    const user = userEvent.setup();
    initStore({ rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} />);
    expect(screen.queryByTestId('lookup-original')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    const ci = screen.getByLabelText('C_i (abweichend)');
    await user.clear(ci);
    await user.type(ci, '0.75');
    expect(stored().rows[0]).toMatchObject({ coeff_override: true, c_i: 0.75, tab9_value: 'schwarzdecke_asphalt' });
    expect(screen.getByTestId('lookup-original')).toHaveTextContent('Tab. 9: 0,9 / 1');
    expect(screen.getByTestId('mismatch-c_i')).toHaveTextContent('C_i weicht von Tab. 9 ab');
    expect(screen.queryByTestId('mismatch-c_s')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Tab. 9 übernehmen' }));
    expect(stored().rows[0]).toMatchObject({ coeff_override: false, c_i: 0.9, c_s: 1 });
    expect(screen.queryByTestId('lookup-original')).toBeNull();
    expect(screen.getByTestId('lookup-value-c_i')).toHaveTextContent('0,9');
  });
  it('no override block in the config (locked policy) ⇒ no toggle at all', () => {
    initStore({ rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }] });
    const { override: _o, ...locked } = surface;
    void _o;
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={locked} standardCode={STD} />);
    expect(screen.queryByRole('button', { name: 'abweichend wählen' })).toBeNull();
    expect(screen.getByTestId('lookup-value-c_i')).toHaveTextContent('0,9');
  });
  it('replays a legacy carrier through prepareRegisterRows and persists the replayed shape on the first edit', async () => {
    const user = userEvent.setup();
    initStore({ rows: [
      { id: 'g', label: 'Gewächshausdach', surface_type: 'dach', area_m2: 3786.8, c_i: 0.9, c_s: 1.0 },
      { id: 'p', label: 'Parkplatz', surface_type: 'asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0 },
    ] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} />);
    expect(screen.getByTestId('reselect-tab9_value')).toBeInTheDocument();        // Gewächshausdach ⇒ reselection
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('1/2');
    await user.type(screen.getAllByLabelText('Bezeichnung')[1], '!');
    expect(stored().rows[1]).toMatchObject({ tab9_value: 'schwarzdecke_asphalt', coeff_override: false, label: 'Parkplatz!' });
    expect(stored().rows[1]).not.toHaveProperty('surface_type');
    expect(stored().rows[0]).toMatchObject({ tab9_value: null });
  });
  it('footer renders engine states by symbol, never a locally computed sum', () => {
    initStore({ rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD}
      footerStates={{ A_E_ba: { label: 'Σ Fläche befestigt', unit: 'm²', state: { kind: 'computed', value: 100, formulaEvaluated: 'x', substituted: {} } },
                      A_E_nba: { label: 'unbefestigt', unit: 'm²', state: { kind: 'manual_required', reason: 'Keine vollständigen Zeilen' } } }} />);
    expect(screen.getByTestId('footer-A_E_ba')).toHaveTextContent('100');
    expect(screen.getByTestId('footer-A_E_nba')).toHaveTextContent('—');
    expect(screen.getByTestId('footer-A_E_nba')).toHaveAttribute('title', 'Keine vollständigen Zeilen');
    expect(screen.getByTestId('footer-A_C')).toHaveTextContent('—');        // no state supplied ⇒ dash, no arithmetic
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('1/1');
    expect(screen.getByTestId('derived-a_c_i')).toHaveTextContent('90');   // engine-prepared derived cell, read-only
  });
  it('readOnly disables every control', () => {
    initStore({ rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} readOnly />);
    expect(screen.getByRole('button', { name: '+ Zeile hinzufügen' })).toBeDisabled();
    expect(screen.getByLabelText('Oberflächentyp')).toBeDisabled();
    expect(screen.getByLabelText('Fläche')).toBeDisabled();
    expect(screen.getByLabelText('Bezeichnung')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'abweichend wählen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zeile entfernen' })).toBeDisabled();
  });
  it('removing a row writes the remaining stored rows only', async () => {
    const user = userEvent.setup();
    initStore({ rows: [
      { id: 'a', label: 'A', tab9_value: 'schwarzdecke_asphalt', area_m2: 1, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: 'b', label: 'B', tab9_value: 'park_flach', area_m2: 2, c_i: 0.1, c_s: 0.2, coeff_override: false },
    ] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} />);
    await user.click(screen.getAllByRole('button', { name: 'Zeile entfernen' })[0]);
    expect(stored().rows.map((r) => r.id)).toEqual(['b']);
    expect(Object.keys(stored())).toEqual(['rows']);
  });
  it('SSR: renders to string without throwing (empty store, readOnly, with rows)', () => {
    expect(() => renderToString(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} />)).not.toThrow();
    initStore({ rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: true }] });
    expect(() => renderToString(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} readOnly />)).not.toThrow();
    expect(() => renderToString(<ReadOnlyRegisterTable config={surface} symbol="surface_inventory" standardCode={STD} carrier={stored()} />)).not.toThrow();
  });
});

const GENERIC: RegisterUiConfig = {
  title: 'Proben', add_label: '+ Probe',
  flags: [{ key: 'not_applicable', label: 'Keine Proben', disables_rows: true }],
  columns: [
    { key: 'name', type: 'text', label: 'Name', required: true },
    { key: 'typ', type: 'enum', label: 'Typ', options: ['a', 'b'], option_labels: { a: 'Alpha', b: 'Beta' }, discriminator: true, required: true },
    { key: 'menge', type: 'number', label: 'Menge', unit: 't', min: 0, visible_when: "typ == 'a'" },
    { key: 'datum', type: 'date', label: 'Datum' },
    { key: 'ok', type: 'boolean', label: 'Geprüft' },
  ],
};

describe('RegisterEditor — generic columns, flags, discriminator + column visible_when', () => {
  it('enum shows option labels; number/date/boolean cells store typed values; text stays a string', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="samples" config={GENERIC} standardCode="X" />);
    await user.click(screen.getByRole('button', { name: '+ Probe' }));
    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByTestId('reselect-typ')).toHaveTextContent('⚠ Typ wählen');
    await user.selectOptions(screen.getByLabelText('Typ'), 'a');
    expect(screen.queryByTestId('reselect-typ')).toBeNull();
    await user.type(screen.getByLabelText('Menge'), '2');
    await user.type(screen.getByLabelText('Datum'), '2026-09-16');
    await user.click(screen.getByLabelText('Geprüft'));
    await user.type(screen.getByLabelText('Name'), 'P1');
    expect(stored().rows[0]).toEqual({ id: expect.any(String), name: 'P1', typ: 'a', menge: 2, datum: '2026-09-16', ok: true });
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('1/1');
  });
  it('a column whose visible_when fails for the row is hidden and nulled on write; a negative number shows the range warning', async () => {
    const user = userEvent.setup();
    initStore({ rows: [{ id: 'r', name: 'P', typ: 'b', menge: 5, datum: '', ok: false }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="samples" config={GENERIC} standardCode="X" />);
    expect(screen.queryByLabelText('Menge')).toBeNull();
    await user.selectOptions(screen.getByLabelText('Typ'), 'a');
    expect(stored().rows[0].menge).toBeNull();                       // hidden ⇒ null on that write
    await user.type(screen.getByLabelText('Menge'), '-1');
    expect(screen.getByTestId('cell-menge')).toHaveTextContent('Menge muss ≥ 0 sein');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('0/1');
  });
  it('a flag writes carrier[key]; disables_rows hides the table and the add button while set', async () => {
    const user = userEvent.setup();
    initStore({ not_applicable: false, rows: [{ id: 'r', name: 'P', typ: 'a', menge: 1, datum: '', ok: false }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="samples" config={GENERIC} standardCode="X" />);
    expect(screen.getByLabelText('Keine Proben')).not.toBeChecked();
    await user.click(screen.getByTestId('flag-not_applicable'));
    expect(stored()).toMatchObject({ not_applicable: true, rows: [{ id: 'r', name: 'P' }] });
    expect(screen.queryByTestId('register-row')).toBeNull();
    expect(screen.getByRole('button', { name: '+ Probe' })).toBeDisabled();
    await user.click(screen.getByTestId('flag-not_applicable'));
    expect(stored()).toMatchObject({ not_applicable: false });
    expect(screen.getAllByTestId('register-row')).toHaveLength(1);
  });
  it('the written carrier is exactly { rows, <flags> } — no derived keys, no unknown keys', () => {
    const prepared = prepareRegisterRows({ rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false, junk: 1 }] },
      surface.columns, { table: makeTableLookup(STD), tableRows: makeTableRows(STD) }, { legacyMap: surface.legacy_map, overrideFlagKey: 'coeff_override' });
    expect(storedRows(prepared, surface.columns, () => false)).toEqual([{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1, coeff_override: false }]);
    expect(storedRows(prepared, surface.columns, (_id, key) => key === 'label' || key === 'area_m2')[0]).toMatchObject({ label: '', area_m2: null });
  });
  it('placement defaults to bottom when the config carries no key (migrated selection registers)', () => {
    expect(registerPlacement({})).toBe('bottom');
    expect(registerPlacement({ placement: undefined })).toBe('bottom');
    expect(registerPlacement({ placement: 'section' })).toBe('section');
    expect(registerPlacement(surface)).toBe('bottom');
  });
  it('a flag without a label uses its key as the checkbox label', () => {
    const cfg: RegisterUiConfig = { title: 'F', columns: [{ key: 'n', type: 'text', label: 'N' }], flags: [{ key: 'keine_angabe' }] };
    render(<RegisterEditor fieldId={FIELD_ID} symbol="f" config={cfg} standardCode="X" />);
    expect(screen.getByLabelText('keine_angabe')).toBeInTheDocument();
    expect(screen.getByTestId('flag-keine_angabe')).not.toBeChecked();
  });
  it('tableLabel', () => { expect(tableLabel('TAB9')).toBe('Tab. 9'); expect(tableLabel('TAB22')).toBe('Tab. 22'); expect(tableLabel('Table 1')).toBe('Table 1'); });
  it('derived diagnostics from prepareRegisterRows render as a de-duplicated list; a grid column renders the Task-9 placeholder', () => {
    const cfg: RegisterUiConfig = {
      title: 'Diag',
      columns: [
        { key: 'x', type: 'number', label: 'X' },
        { key: 'bad', type: 'derived', label: 'Bad', expr: 'x +' },
        { key: 'g', type: 'grid', label: 'Grid' },
      ],
    };
    initStore({ rows: [{ id: 'a', x: 1 }, { id: 'b', x: 2 }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="diag" config={cfg} standardCode="X" />);
    const items = screen.getByTestId('register-diagnostics').querySelectorAll('li');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('bad: Ausdruck nicht auswertbar (Syntax)');
    expect(screen.getAllByTestId('grid-pending')).toHaveLength(2);
    expect(screen.getAllByTestId('derived-bad')[0]).toHaveTextContent('—');
  });
  it('legacy sum_column footer is display-only and never written', async () => {
    const user = userEvent.setup();
    const cfg: RegisterUiConfig = { title: 'Summen', columns: [{ key: 'v', type: 'number', label: 'V' }], sum_column: { key: 'v', label: 'Σ V', unit: 'kg' } };
    initStore({ rows: [{ id: 'a', v: 1.5 }, { id: 'b', v: 2 }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="sums" config={cfg} standardCode="X" />);
    expect(screen.getByTestId('register-editor')).toHaveTextContent('Σ V: 3,5 kg');
    await user.type(screen.getAllByLabelText('V')[0], '0');       // 1.5 → 1.50
    expect(Object.keys(stored())).toEqual(['rows']);
    expect(Object.keys(stored().rows[0])).toEqual(['id', 'v']);
  });
});

describe('ReadOnlyRegisterTable', () => {
  it('renders the table row label for lookup keys, omits the override flag column, formats numbers de-DE', () => {
    render(<ReadOnlyRegisterTable config={surface} symbol="surface_inventory" standardCode={STD}
      carrier={{ rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false }] }} />);
    expect(screen.getByText('Schwarzdecken (Asphalt)')).toBeInTheDocument();
    expect(screen.getByText('1.575,9')).toBeInTheDocument();
    expect(screen.getByText('1.418,31')).toBeInTheDocument();          // derived a_c_i from the engine-prepared row
    expect(screen.queryByText('abweichend')).toBeNull();
    expect(screen.queryByText('befestigt/unbefestigt')).toBeNull();     // badge-derived column omitted
    expect(screen.queryByRole('textbox')).toBeNull();
  });
  it('booleans render Ja/Nein, enum cells render option labels', () => {
    render(<ReadOnlyRegisterTable config={GENERIC} symbol="samples" standardCode="X"
      carrier={{ rows: [{ id: 'r', name: 'P', typ: 'a', menge: 1, datum: '2026-09-16', ok: true }] }} />);
    expect(screen.getByText('Ja')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
  it('empty carrier ⇒ "Keine Zeilen erfasst."', () => {
    render(<ReadOnlyRegisterTable config={surface} symbol="surface_inventory" standardCode={STD} carrier={null} />);
    expect(screen.getByText('Keine Zeilen erfasst.')).toBeInTheDocument();
  });
});
