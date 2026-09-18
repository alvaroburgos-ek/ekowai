/**
 * Plan 3 Task 14 — the A178-04 `teilflaechen_178` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): two
 * Teilflächen rows, the e_0 column hidden under `system_type = trenn` (Gl. 2)
 * and shown under `misch` (Gl. 3), the per-row load and the Rechenwert badge
 * from the same prepared rows, and A178-04-D1 / -D2 evaluating the sums over
 * them through the real `evaluateFormula`.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/a178';
import { EQUATIONS } from '@/lib/eval/equations/a178';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';
import type { Value } from '@/lib/expr';

const STD = 'DWA-A-178';
const FIELD_ID = 'fixture-teilflaechen';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'A178-04' && e.symbol === 'teilflaechen_178')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const D1 = EQUATIONS.find((e) => e.equation_number === 'A178-04-D1')!;
const D2 = EQUATIONS.find((e) => e.equation_number === 'A178-04-D2')!;

const TRENN: Record<string, Value> = { system_type: 'trenn' };
const MISCH: Record<string, Value> = { system_type: 'misch' };
const lookup = (ws: Record<string, Value>) => (s: string) => (s in ws ? ws[s] : undefined);

type Row = Record<string, unknown> & { id: string };
const ROWS: Row[] = [
  { id: 'r1', label: 'Wohngebiet', a_e_b_a_i: 2, b_r_a_i: 530 },
  { id: 'r2', label: 'Gewerbe', a_e_b_a_i: 1, b_r_a_i: 600, e_0_i: 50 },
];

function initStore(rows: Row[]) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', { [FIELD_ID]: { type: 'json', value: { rows } } }, {}, {}); });
}
function storedRows(): Row[] {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const sums = (rows: unknown[], ws: Record<string, Value>) => {
  const table = makeTableLookup(STD);
  const reg = prepareRegisterRows({ rows }, CFG.columns, { table, tableRows: makeTableRows(STD), symbol: lookup(ws) });
  const ev = (e: typeof D1) => evaluateFormula({ equationId: e.equation_number, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { teilflaechen_178: reg }, tableLookup: table });
  return { area: ev(D1), load: ev(D2) };
};
const value = (r: ReturnType<typeof evaluateFormula>) => (r.kind === 'computed' ? r.value : NaN);

beforeEach(() => initStore(ROWS));

describe('teilflaechen_178 through the generic RegisterEditor (Plan 3 Task 14)', () => {
  it('Trennsystem (Gl. 2): two rows, e_0 hidden, per-row load A · b_R,a and the Rechenwert badge; both rows complete', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="teilflaechen_178" config={CFG} standardCode={STD} symbolLookup={lookup(TRENN)} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getAllByLabelText('Befestigte, angeschlossene Teilfläche A_E,b,a,i')).toHaveLength(2);
    expect(screen.getAllByLabelText('Spezifisches AFS63-Jahresfrachtpotenzial b_R,a der Teilfläche')).toHaveLength(2);
    expect(screen.queryByLabelText('Mittlere Jahresentlastungsrate der Vorstufe e_0 (Mischsystem)')).toBeNull();
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    const load = screen.getAllByTestId('derived-b_row');
    expect(load[0]).toHaveTextContent('1.060');
    expect(load[1]).toHaveTextContent('600');
    expect(screen.getAllByTestId('derived-b_r_a_rechenwert')[0]).toHaveTextContent('530');
    // the badge renders under its row (derived-badge-<key>) with the value_labels text
    const badges = screen.getAllByTestId('derived-badge-abw_rechenwert');
    expect(badges[0]).toHaveTextContent('Rechenwert');
    expect(badges[1]).toHaveTextContent('abweichend vom Rechenwert');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
  });

  it('Mischsystem (Gl. 3): the e_0 column is shown and required — the row without e_0 is incomplete, the other computes A · b_R,a · e_0 / 100', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="teilflaechen_178" config={CFG} standardCode={STD} symbolLookup={lookup(MISCH)} />);
    expect(screen.getAllByLabelText('Mittlere Jahresentlastungsrate der Vorstufe e_0 (Mischsystem)')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('1/2');
    expect(screen.getAllByTestId('derived-b_row')[1]).toHaveTextContent('300');
  });

  it('A178-04-D1 / -D2 evaluate Σ A and Σ load over the complete rows through evaluateFormula; a typed third row counts once complete', async () => {
    const before = sums(storedRows(), TRENN);
    expect(value(before.area)).toBe(3);
    expect(value(before.load)).toBe(1660);
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="teilflaechen_178" config={CFG} standardCode={STD} symbolLookup={lookup(TRENN)} />);
    await user.click(screen.getByRole('button', { name: '+ Teilfläche' }));
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(sums(storedRows(), TRENN)).toMatchObject({ area: { value: 3 }, load: { value: 1660 } }); // the incomplete row does not count
    await user.type(screen.getAllByRole('textbox', { name: 'Teilfläche' })[2], 'Straße');
    await user.type(screen.getAllByLabelText('Befestigte, angeschlossene Teilfläche A_E,b,a,i')[2], '0.5');
    await user.type(screen.getAllByLabelText('Spezifisches AFS63-Jahresfrachtpotenzial b_R,a der Teilfläche')[2], '530');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    const after = sums(storedRows(), TRENN);
    expect(value(after.area)).toBe(3.5);
    expect(value(after.load)).toBe(1925); // 1060 + 600 + 265
  });
});
