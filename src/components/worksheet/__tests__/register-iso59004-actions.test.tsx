/**
 * Plan 3 Task 29 — the ISO-59004-05 `actions` register renders through the generic RegisterEditor from
 * its DATA config (no per-standard React): two rows show the thirteen printed Table-1 R-strategies with
 * prod's own labels on the discriminator, the §6.1 "preliminary" badge flips with the chosen strategy,
 * the §6.7 life-cycle note is offered on EVERY row (iso59004-J-3 — no per-row visible_when), the five
 * §6.2–§6.6 categories are an engineer-entered select because Table 1 is unseeded (iso59004-U-1), and
 * ISO-59004-05-D1 / -D2 / -D3 count through the real `evaluateFormula`.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS, ACTION_TOKENS, CATEGORY_TOKENS } from '@/lib/eval/field-configs/iso59004';
import { EQUATIONS } from '@/lib/eval/equations/iso59004';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'ISO-59004';
const ACTIONS = parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((e) => e.worksheet === 'ISO-59004-05' && e.symbol === 'actions')!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const ACTIONS_ID = 'fixture-actions';

type Row = Record<string, unknown> & { id: string };
const ROWS: Row[] = [
  { id: 'a1', action: 'refuse', category: 'create_added_value', pilot: true, feasibility_dimensions: 'Technisch', value_creation_model: 'Produkt als Dienstleistung', life_cycle_note: '' },
  { id: 'a2', action: 'recycle', category: 'value_recovery', pilot: false, feasibility_dimensions: 'Finanziell & wirtschaftlich', value_creation_model: '', life_cycle_note: '' },
];

function initStore(values: Record<string, { type: 'json'; value: { rows: Row[] } }>) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', values, {}, {}); });
}
function storedRows(fieldId: string): Row[] {
  const v = useWorksheetStore.getState().values[fieldId];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const evalOut = (n: string, rows: unknown[]) => {
  const table = makeTableLookup(STD);
  const e = EQUATIONS.find((x) => x.equation_number === n)!;
  const reg = prepareRegisterRows({ rows }, ACTIONS.columns, { table, tableRows: makeTableRows(STD), symbol: () => undefined });
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { actions: reg }, tableLookup: table });
};

beforeEach(() => initStore({ [ACTIONS_ID]: { type: 'json', value: { rows: ROWS } } }));

describe('actions through the generic RegisterEditor (Plan 3 Task 29)', () => {
  it('two complete rows; the discriminator offers all thirteen printed R-strategies with prod labels; the §6.1 badge marks only the refuse row; D1 = 2, D2 = 1, D3 = 1', () => {
    render(<RegisterEditor fieldId={ACTIONS_ID} symbol="actions" config={ACTIONS} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');

    const strategies = screen.getAllByLabelText('Gewaehlte Massnahme nach Tabelle 1 (refuse … re-mine)') as HTMLSelectElement[];
    expect(strategies).toHaveLength(2);
    expect(strategies[0].value).toBe('refuse');
    expect(strategies[1].value).toBe('recycle');
    // all thirteen printed Table-1 actions are offered, with prod's own German labels
    const offered = [...strategies[0].options].map((o) => o.value).filter((v) => v !== '');
    expect(offered).toEqual([...ACTION_TOKENS]);
    expect([...strategies[0].options].find((o) => o.value === 'recover_energy')!.text).toContain('Energie zurueckgewinnen');
    // iso59004-U-1: the category is an engineer-entered select over the five prod tokens (no table fill)
    const categories = screen.getAllByLabelText('Massnahmenkategorie nach §6.2 bis §6.6') as HTMLSelectElement[];
    expect([...categories[0].options].map((o) => o.value).filter((v) => v !== '')).toEqual([...CATEGORY_TOKENS]);
    // §6.1 badge: refuse is preliminary, recycle is not
    const badges = screen.getAllByTestId('derived-badge-preliminary');
    expect(badges[0]).toHaveTextContent('§6.1: refuse / rethink — vorlaeufige Massnahme');
    // iso59004-J-3: the life-cycle note is offered on BOTH rows (no per-row visible_when)
    expect(screen.getAllByLabelText('Begruendung der Massnahmenwahl aus der Lebenszyklusperspektive')).toHaveLength(2);
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();

    expect(evalOut('ISO-59004-05-D1', storedRows(ACTIONS_ID))).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalOut('ISO-59004-05-D2', storedRows(ACTIONS_ID))).toMatchObject({ kind: 'computed', value: 1 });
    expect(evalOut('ISO-59004-05-D3', storedRows(ACTIONS_ID))).toMatchObject({ kind: 'computed', value: 1 });
  });

  it('switching the recycle row to rethink flips its §6.1 badge and D2 to 2; a new row without an R-strategy is incomplete and never counts', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={ACTIONS_ID} symbol="actions" config={ACTIONS} standardCode={STD} />);
    await user.selectOptions(screen.getAllByLabelText('Gewaehlte Massnahme nach Tabelle 1 (refuse … re-mine)')[1], 'rethink');
    expect(screen.getAllByTestId('derived-badge-preliminary')).toHaveLength(2);
    expect(evalOut('ISO-59004-05-D2', storedRows(ACTIONS_ID))).toMatchObject({ kind: 'computed', value: 2 });

    await user.click(screen.getByRole('button', { name: '+ Massnahme' }));
    expect(screen.getAllByTestId('register-row')).toHaveLength(3);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(evalOut('ISO-59004-05-D1', storedRows(ACTIONS_ID))).toMatchObject({ kind: 'computed', value: 2 });
    await user.selectOptions(screen.getAllByLabelText('Gewaehlte Massnahme nach Tabelle 1 (refuse … re-mine)')[2], 're_mine');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    expect(evalOut('ISO-59004-05-D1', storedRows(ACTIONS_ID))).toMatchObject({ kind: 'computed', value: 3 });
    expect(evalOut('ISO-59004-05-D2', storedRows(ACTIONS_ID))).toMatchObject({ kind: 'computed', value: 2 });
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
  });
});
