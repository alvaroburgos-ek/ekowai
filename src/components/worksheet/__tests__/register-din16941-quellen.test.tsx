/**
 * Plan 3 Task 15 — the DIN-EN-16941-2-03 `grauwasserquellen_16941` register
 * renders through the generic RegisterEditor from its DATA config (no
 * per-standard React): two source rows — Dusche (Q · t · u, the t column
 * shown) and Waschmaschine (V · u, no t) — with the Tab.-A.2 hint text and the
 * in-range badge from the same prepared rows, and DIN-EN-16941-2-03-D1
 * evaluating Gl. (1) over them through the real `evaluateFormula`.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/din16941_2';
import { EQUATIONS } from '@/lib/eval/equations/din16941_2';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'DIN-EN-16941-2';
const WS = 'DIN-EN-16941-2-03';
const FIELD_ID = 'fixture-grauwasserquellen';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === WS && e.symbol === 'grauwasserquellen_16941')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const D1 = EQUATIONS.find((e) => e.equation_number === 'DIN-EN-16941-2-03-D1')!;
const lookup = () => undefined;

type Row = Record<string, unknown> & { id: string };
const ROWS: Row[] = [
  { id: 'r1', quelle: 'dusche', q_or_v: 10, t_x: 5, u_x: 1 },
  { id: 'r2', quelle: 'waschmaschine', q_or_v: 45, u_x: 0.25 },
];

function initStore(rows: Row[]) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', { [FIELD_ID]: { type: 'json', value: { rows } } }, {}, {}); });
}
function storedRows(): Row[] {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const yieldOf = (rows: unknown[], n: number) => {
  const table = makeTableLookup(STD);
  const reg = prepareRegisterRows({ rows }, CFG.columns, { table, tableRows: makeTableRows(STD), symbol: lookup });
  return evaluateFormula({ equationId: D1.equation_number, formula: D1.formula, inputSymbols: D1.input_symbols, outputSymbol: D1.output_symbol, inputs: [{ symbol: 'n', value: n, unit: 'p' }], registers: { grauwasserquellen_16941: reg }, tableLookup: table });
};
const value = (r: ReturnType<typeof evaluateFormula>) => (r.kind === 'computed' ? r.value : NaN);

beforeEach(() => initStore(ROWS));

describe('grauwasserquellen_16941 through the generic RegisterEditor (Plan 3 Task 15)', () => {
  it('two rows: Dusche shows the t column (Q · t · u) and the Tab.-A.2 hint "5 bis 15"; Waschmaschine hides t (V · u) with hint "30 bis 60"; per-person yields 50 and 11,25; both in range; both complete', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="grauwasserquellen_16941" config={CFG} standardCode={STD} symbolLookup={lookup} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getAllByLabelText('Grauwasserabfluss Q in l/min bzw. Wasservolumen V in l je Nutzung')).toHaveLength(2);
    expect(screen.getAllByLabelText('Dauer je Nutzung in Minuten (Dusche, Waschbecken, Küchenspüle)')).toHaveLength(1); // Dusche only
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    const term = screen.getAllByTestId('derived-mit_dauer');
    expect(term[0]).toHaveTextContent('Q · t · u');
    expect(term[1]).toHaveTextContent('V · u');
    const hints = screen.getAllByTestId('derived-hint');
    expect(hints[0]).toHaveTextContent('5 bis 15');
    expect(hints[1]).toHaveTextContent('30 bis 60');
    const yields = screen.getAllByTestId('derived-ertrag_row');
    expect(yields[0]).toHaveTextContent('50');
    expect(yields[1]).toHaveTextContent('11,25');
    const badges = screen.getAllByTestId('derived-badge-in_hint');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent('innerhalb der Größenordnung nach Tab. A.2');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
  });

  it('a source outside the printed Größenordnung gets the out-of-range HINT badge and still computes (SR-2: never a limit); Waschbecken has no hint and no badge', () => {
    initStore([{ id: 'r1', quelle: 'dusche', q_or_v: 20, t_x: 5, u_x: 1 }, { id: 'r2', quelle: 'waschbecken', q_or_v: 4, t_x: 0.5, u_x: 3 }]);
    render(<RegisterEditor fieldId={FIELD_ID} symbol="grauwasserquellen_16941" config={CFG} standardCode={STD} symbolLookup={lookup} />);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(screen.getAllByTestId('derived-ertrag_row')[0]).toHaveTextContent('100');
    const badges = screen.getAllByTestId('derived-badge-in_hint');
    expect(badges).toHaveLength(1); // the Waschbecken row renders no badge (no printed row)
    expect(badges[0]).toHaveTextContent('außerhalb der Größenordnung nach Tab. A.2 (Hinweis, kein Grenzwert)');
    expect(screen.getAllByTestId('derived-hint')[1]).toHaveTextContent('—');
    expect(value(yieldOf(storedRows(), 2))).toBe(212); // 2 · (100 + 6)
  });

  it('DIN-EN-16941-2-03-D1 evaluates Gl. (1) over the complete rows through evaluateFormula; a typed third row counts once complete', async () => {
    expect(value(yieldOf(storedRows(), 4))).toBe(245); // 4 · (50 + 11,25)
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="grauwasserquellen_16941" config={CFG} standardCode={STD} symbolLookup={lookup} />);
    await user.click(screen.getByRole('button', { name: '+ Grauwasserquelle' }));
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(value(yieldOf(storedRows(), 4))).toBe(245); // the incomplete row does not count
    await user.selectOptions(screen.getAllByRole('combobox', { name: 'Quelle' })[2], 'badewanne');
    await user.type(screen.getAllByLabelText('Grauwasserabfluss Q in l/min bzw. Wasservolumen V in l je Nutzung')[2], '100');
    await user.type(screen.getAllByLabelText('Häufigkeit der Nutzung je Person und je Tag')[2], '0.2');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    expect(value(yieldOf(storedRows(), 4))).toBe(325); // 4 · (50 + 11,25 + 20)
  });
});
