/**
 * Plan 3 Task 17 — the DIN-1989-2-03 `prueflaeufe` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): picking a
 * Tab. 2 step fills the read-only `%` and `t` cells from the seeded TAB2 row, the
 * Soll flow derives from the worksheet's Q_Zu,max (G-13), η per row follows Gl. 3,
 * TAB2 is `locked` (no override toggle), and the DIN-1989-2-03-D6 / -D8 twins
 * evaluate through the real `evaluateFormula` over the same prepared rows.
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/din1989_2';
import { EQUATIONS } from '@/lib/eval/equations/din1989_2';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'DIN-1989-2';
const FIELD_ID = 'fixture-prueflaeufe';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'DIN-1989-2-03' && e.symbol === 'prueflaeufe')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const WS = { Q_Zu_max: 10 };
const lookup = (s: string) => (WS as Record<string, number>)[s];

type Row = { id: string; stufe: string | null; belastet?: boolean; q_zu: number | null; q_ab: number | null; q_pct?: number | null; t_min?: number | null };
const TWO_ROWS: Row[] = [
  { id: 'r1', stufe: 'p100', q_zu: 10, q_ab: 2 },
  { id: 'r2', stufe: 'p50', q_zu: 5, q_ab: 0.5 },
];

function initStore(rows: Row[]) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', { [FIELD_ID]: { type: 'json', value: { rows } } }, {}, {}); });
}
function storedRows(): Row[] {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const evalTwin = (n: string, rows: unknown[]) => {
  const table = makeTableLookup(STD);
  const e = EQUATIONS.find((x) => x.equation_number === n)!;
  const reg = prepareRegisterRows({ rows }, CFG.columns, { table, tableRows: makeTableRows(STD), symbol: lookup }, {});
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { prueflaeufe: reg }, tableLookup: table });
};

beforeEach(() => initStore(TWO_ROWS));

describe('prueflaeufe through the generic RegisterEditor (Plan 3 Task 17)', () => {
  it('renders two steps with % and Prüfzeit filled from Tab. 2, Q_Zu Soll from Q_Zu,max, η per row; the seven printed steps are the options; locked ⇒ no override toggle', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="prueflaeufe" config={CFG} standardCode={STD} symbolLookup={lookup} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    const pct = screen.getAllByTestId('lookup-value-q_pct');
    expect(pct[0]).toHaveTextContent('100');
    expect(pct[1]).toHaveTextContent('50');
    const t = screen.getAllByTestId('lookup-value-t_min');
    expect(t[0]).toHaveTextContent('2');
    expect(t[1]).toHaveTextContent('2');
    const soll = screen.getAllByTestId('derived-q_soll');
    expect(soll[0]).toHaveTextContent('10');
    expect(soll[1]).toHaveTextContent('5');
    const eta = screen.getAllByTestId('derived-eta_row');
    expect(eta[0]).toHaveTextContent('0,8');
    expect(eta[1]).toHaveTextContent('0,9');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(screen.queryAllByRole('button', { name: 'abweichend wählen' })).toHaveLength(0); // TAB2 override_policy locked
    const select = screen.getAllByLabelText('Stufe Q_Zu/Q_Zu,max (Tab. 2)')[0] as HTMLSelectElement;
    expect([...select.options].map((o) => o.value).filter(Boolean)).toEqual(['p100', 'p50', 'p20', 'p10', 'p5', 'p2_5', 'p1']);
  });

  it('changing the step re-fills % and t from the table row and stores the key', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="prueflaeufe" config={CFG} standardCode={STD} symbolLookup={lookup} />);
    const selects = screen.getAllByLabelText('Stufe Q_Zu/Q_Zu,max (Tab. 2)');
    await user.selectOptions(selects[1], 'p2_5');
    expect(storedRows()[1].stufe).toBe('p2_5');
    expect(storedRows()[1].q_pct).toBe(2.5);
    expect(storedRows()[1].t_min).toBe(8);
    expect(screen.getAllByTestId('lookup-value-q_pct')[1]).toHaveTextContent('2,5');
    expect(screen.getAllByTestId('lookup-value-t_min')[1]).toHaveTextContent('8');
  });

  it('DIN-1989-2-03-D6 (η at 100 %, unbelastet) = 0,8 and -D8 (min over the unbelastet rows) = 0,8 through evaluateFormula; a third row counts once complete', async () => {
    expect(evalTwin('DIN-1989-2-03-D6', storedRows())).toMatchObject({ kind: 'computed', value: 0.8 });
    expect(evalTwin('DIN-1989-2-03-D8', storedRows())).toMatchObject({ kind: 'computed', value: 0.8 });
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="prueflaeufe" config={CFG} standardCode={STD} symbolLookup={lookup} />);
    await user.click(screen.getByRole('button', { name: '+ Prüflauf' }));
    expect(evalTwin('DIN-1989-2-03-D8', storedRows())).toMatchObject({ kind: 'computed', value: 0.8 }); // incomplete third row does not count
    await user.selectOptions(screen.getAllByLabelText('Stufe Q_Zu/Q_Zu,max (Tab. 2)')[2], 'p20');
    await user.type(screen.getAllByLabelText('zugeführter Volumenstrom Q_Zu')[2], '2');
    await user.type(screen.getAllByLabelText('abgeführter Volumenstrom Q_Ab')[2], '0.5');
    expect(evalTwin('DIN-1989-2-03-D8', storedRows())).toMatchObject({ kind: 'computed', value: 0.75 }); // (2 − 0,5) / 2
    expect(evalTwin('DIN-1989-2-03-D6', storedRows())).toMatchObject({ kind: 'computed', value: 0.8 }); // still the p100 row
    expect(evalTwin('DIN-1989-2-03-D7', storedRows()).kind).toBe('manual_required'); // no dauerbelastet row yet
  });
});
