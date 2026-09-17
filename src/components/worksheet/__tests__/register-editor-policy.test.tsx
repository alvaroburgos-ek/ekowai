/**
 * I-4 (final review, guideline-to-tool): the register override honours the
 * TABLE's `override_policy` (spec §7 "toggle + reason" applies to registers
 * too). The policy comes from `resolveRegulationTable(std, code)` of the FIRST
 * lookup_key column's table — the table is the single source; when
 * `ui_config.override.policy` disagrees, the table wins and a diagnostic is
 * listed.
 *
 *   anhaltswert ⇒ toggle + a reason textarea per overridden row
 *                 (`recordManualOverride(fieldId, 'register:<TABLE>:<rowId>', reason)`,
 *                 `Begründung fehlt` per overridden row until saved);
 *   kann        ⇒ the override control is a select over the value column's
 *                 printed alternatives (`value_columns[value].values`), no reason;
 *   messwert    ⇒ free entry labelled "(Messwert)" + reason;
 *   locked      ⇒ no toggle at all.
 *
 * Plus the register minors: `lookup_value` override input honours a
 * non-numeric value column; datalist ids keyed by fieldId; ReadOnlyRegisterTable
 * hides a cell whose column `visible_when` fails in row scope; `registerFlagKeys`
 * never falls back to the symbol map once a config is given.
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor, ReadOnlyRegisterTable } from '../register-editor';
import { resetSavedOverrideReasons } from '../override-reason';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { REGISTER_CONFIGS_FALLBACK, registerFlagKeys } from '@/lib/eval/register-configs';
import { clearTables, registerTables, type RegulationTable } from '@/lib/eval/regulation-tables';
import { recordManualOverride } from '@/lib/actions/overrides';
import type { RegisterUiConfig } from '@/lib/eval/field-config';

const FIELD_ID = '11111111-1111-4111-8111-111111111111';
const PROJECT_ID = '22222222-2222-4222-8222-222222222222';
const STD = 'DWA-A-138-1';
const surface = REGISTER_CONFIGS_FALLBACK.surface_inventory;

function initStore(value?: unknown) {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance', value !== undefined ? { [FIELD_ID]: { type: 'json', value } } : {}, {}, {});
  });
}
function stored(): { rows: Array<Record<string, unknown>> } {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? (v.value as { rows: Array<Record<string, unknown>> }) : { rows: [] };
}
const ASPHALT_ROW = { id: 'r1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false };

/** A synthetic standard whose TAB1 carries the requested policy and a string value column with printed alternatives. */
function synthetic(policy: RegulationTable['override_policy']): RegulationTable {
  return {
    standard_code: 'SYN-1', edition: '2026-01', table_code: 'TAB1', title_de: 'Synthetisch', clause_reference: null, page_ref: null,
    key_columns: ['k'], value_columns: [{ name: 'v', type: 'number', values: ['1', '2.5', '4'] }, { name: 'cls', type: 'string', values: ['A', 'B'] }],
    override_policy: policy, override_quote: null, verification_status: 'imported_unverified',
    rows: [
      { row_key: 'a', keys: { k: 'a' }, group_label: null, label_de: 'Zeile A', order_index: 0, values: { v: 2.5, cls: 'A' }, verbatim_quote: 'q' },
      { row_key: 'b', keys: { k: 'b' }, group_label: null, label_de: 'Zeile B', order_index: 1, values: { v: 4, cls: 'B' }, verbatim_quote: 'q' },
    ],
  };
}
const SYN_CFG: RegisterUiConfig = {
  title: 'Syn', columns: [
    { key: 'k', type: 'lookup_key', label: 'K', required: true, lookup: { table_code: 'TAB1' } },
    { key: 'v', type: 'lookup_value', label: 'V', lookup: { table_code: 'TAB1', key_column: 'k', value: 'v' } },
    { key: 'cls', type: 'lookup_value', label: 'Klasse', lookup: { table_code: 'TAB1', key_column: 'k', value: 'cls' } },
    { key: 'ov', type: 'boolean', label: 'abweichend' },
  ],
  override: { flag_key: 'ov', applies_to: ['v', 'cls'], policy: 'anhaltswert' },
};
const SYN_ROW = { id: 'r1', k: 'a', v: 2.5, cls: 'A', ov: false };

beforeEach(() => { initStore(); vi.mocked(recordManualOverride).mockClear(); resetSavedOverrideReasons(); });
afterEach(() => clearTables());

describe('RegisterEditor — override policy from the TABLE (I-4)', () => {
  it('anhaltswert (TAB9): toggle + per-row reason; "Begründung fehlt" until recordManualOverride(register:TAB9:<rowId>) succeeds', async () => {
    const user = userEvent.setup();
    initStore({ rows: [ASPHALT_ROW] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} projectId={PROJECT_ID} />);
    expect(screen.queryByTestId('register-reason-missing')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    expect(stored().rows[0].coeff_override).toBe(true);
    expect(screen.getByTestId('register-reason-missing')).toHaveTextContent('Begründung fehlt');
    const submit = screen.getByRole('button', { name: 'Abweichung begründen' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Begründung der Abweichung'), { target: { value: 'Örtliche Messung 2026' } });
    expect(submit.disabled).toBe(false);
    await act(async () => { fireEvent.click(submit); });
    expect(recordManualOverride).toHaveBeenCalledWith({ projectId: PROJECT_ID, fieldId: FIELD_ID, equationNumber: 'register:TAB9:r1', reason: 'Örtliche Messung 2026' });
    expect(await screen.findByText('✓ Abweichung begründet')).toBeInTheDocument();
    expect(screen.queryByTestId('register-reason-missing')).toBeNull();
    // "übernehmen" clears the override AND the confirmation.
    await user.click(screen.getByRole('button', { name: 'Tab. 9 übernehmen' }));
    expect(stored().rows[0]).toMatchObject({ coeff_override: false, c_i: 0.9 });
    expect(screen.queryByText('✓ Abweichung begründet')).toBeNull();
  });

  it('kann: the override control of a lookup_value cell is a select over the printed alternatives; no reason UI', async () => {
    registerTables([synthetic('kann')]);
    const user = userEvent.setup();
    initStore({ rows: [SYN_ROW] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="syn" config={SYN_CFG} standardCode="SYN-1" projectId={PROJECT_ID} />);
    await user.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    const v = screen.getByLabelText('V (abweichend)') as HTMLSelectElement;
    expect(v.tagName).toBe('SELECT');
    expect([...v.options].map((o) => o.value)).toEqual(['1', '2.5', '4']);
    await user.selectOptions(v, '4');
    expect(stored().rows[0]).toMatchObject({ ov: true, v: 4 });
    // The string value column selects over its own printed alternatives and stores a string.
    const cls = screen.getByLabelText('Klasse (abweichend)') as HTMLSelectElement;
    expect([...cls.options].map((o) => o.value)).toEqual(['A', 'B']);
    await user.selectOptions(cls, 'B');
    expect(stored().rows[0].cls).toBe('B');
    expect(screen.queryByLabelText('Begründung der Abweichung')).toBeNull();
    expect(screen.queryByTestId('register-reason-missing')).toBeNull();
    // The policy diagnostic: ui_config says anhaltswert, the table says kann ⇒ table wins, diagnostic listed.
    expect(screen.getByTestId('register-diagnostics')).toHaveTextContent('override.policy „anhaltswert“ weicht von Tab. 1 (kann) ab — die Tabelle gilt');
  });

  it('messwert: free entry labelled "(Messwert)" + reason; a string value column gets a text input', async () => {
    registerTables([synthetic('messwert')]);
    const user = userEvent.setup();
    initStore({ rows: [SYN_ROW] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="syn" config={SYN_CFG} standardCode="SYN-1" projectId={PROJECT_ID} />);
    await user.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    const v = screen.getByLabelText('V (Messwert)') as HTMLInputElement;
    expect(v.type).toBe('number');
    const cls = screen.getByLabelText('Klasse (Messwert)') as HTMLInputElement;
    expect(cls.type).toBe('text');
    await user.clear(cls);
    await user.type(cls, 'C');
    expect(stored().rows[0].cls).toBe('C');
    expect(screen.getByTestId('register-reason-missing')).toBeInTheDocument();
    expect(screen.getByLabelText('Begründung der Abweichung')).toBeInTheDocument();
  });

  it('locked: no toggle even though ui_config carries an override block (table wins, diagnostic listed)', () => {
    registerTables([synthetic('locked')]);
    initStore({ rows: [SYN_ROW] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="syn" config={SYN_CFG} standardCode="SYN-1" projectId={PROJECT_ID} />);
    expect(screen.queryByRole('button', { name: 'abweichend wählen' })).toBeNull();
    expect(screen.getByTestId('register-diagnostics')).toHaveTextContent('override.policy „anhaltswert“ weicht von Tab. 1 (locked) ab — die Tabelle gilt');
  });

  it('anhaltswert without a projectId: the reason form cannot post (no audit path) — the missing-reason state still shows', async () => {
    registerTables([synthetic('anhaltswert')]);
    const user = userEvent.setup();
    initStore({ rows: [SYN_ROW] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="syn" config={SYN_CFG} standardCode="SYN-1" />);
    await user.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    expect(screen.getByTestId('register-reason-missing')).toBeInTheDocument();
    expect(screen.queryByLabelText('Begründung der Abweichung')).toBeNull();
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
  });
});

describe('register minors (final review)', () => {
  it('datalist ids are keyed by fieldId, not by the config title', () => {
    const cfg: RegisterUiConfig = { title: 'Same Title', columns: [{ key: 'name', type: 'text', label: 'Name', datalist: ['x', 'y'] }] };
    initStore({ rows: [{ id: '1', name: '' }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="a" config={cfg} standardCode={STD} />);
    const input = screen.getByLabelText('Name') as HTMLInputElement;
    expect(input.getAttribute('list')).toBe(`reg-${FIELD_ID}-name`);
    expect(document.getElementById(`reg-${FIELD_ID}-name`)?.tagName).toBe('DATALIST');
  });

  it('ReadOnlyRegisterTable hides a cell whose column visible_when fails in row scope', () => {
    const cfg: RegisterUiConfig = {
      title: 'T', columns: [
        { key: 'kind', type: 'enum', label: 'Art', options: ['a', 'b'] },
        { key: 'extra', type: 'text', label: 'Extra', visible_when: "kind == 'a'" },
      ],
    };
    render(<ReadOnlyRegisterTable config={cfg} carrier={{ rows: [{ id: '1', kind: 'a', extra: 'shown' }, { id: '2', kind: 'b', extra: 'hidden' }] }} standardCode={STD} symbol="t" />);
    const rows = within(screen.getByTestId('register-readonly')).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('shown');
    expect(rows[2]).not.toHaveTextContent('hidden');
    expect(within(rows[2]).getAllByRole('cell')[1].textContent).toBe('');
  });

  it('registerFlagKeys: once a config is given, ONLY ui.flags count — no symbol-map fallback', () => {
    expect(registerFlagKeys('pollutant_register')).toEqual(['not_applicable']);          // no config at all ⇒ symbol map
    expect(registerFlagKeys('pollutant_register', {})).toEqual([]);                       // DB config without flags ⇒ none
    expect(registerFlagKeys('pollutant_register', { flags: [{ key: 'z' }] })).toEqual(['z']);
  });
});
