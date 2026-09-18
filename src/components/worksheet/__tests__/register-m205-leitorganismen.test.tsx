/**
 * Plan 3 Task 11 — the M205-10 `leitorganismen` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): the
 * `quelle` discriminator switches the visible columns per row (Tab. 1 row picker
 * + G/I lookup values vs Tab. 2 parameter + derived limit from the inherited
 * Gewässerklasse), the derived `limit` / `ok` cells come from the same prepared
 * rows, and M205-10-D1 counts the violations through the real `evaluateFormula`.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/m205';
import { EQUATIONS } from '@/lib/eval/equations/m205';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';
import type { Value } from '@/lib/expr';

const STD = 'DWA-M-205';
const FIELD_ID = 'fixture-leitorganismen';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'M205-10' && e.symbol === 'leitorganismen')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const D1 = EQUATIONS.find((e) => e.equation_number === 'M205-10-D1')!;

/** M205-10 inherits the Gewässerklasse (Binnengewässer, gut) and the Eignungsklasse from M205-02. */
const WS10: Record<string, Value> = { gewaesserklasse: 'binnen_gut', eignungsklasse_bewaesserung: '2' };
const lookup = (ws: Record<string, Value>) => (s: string) => (s in ws ? ws[s] : undefined);

type Row = Record<string, unknown> & { id: string };
const ROWS: Row[] = [
  { id: 'r1', quelle: 't1', parameter_t1: 'faekalcoliforme', wert_typ: 'g', messwert: 80 },   // Tab. 1: 100 (80) → eingehalten
  { id: 'r2', quelle: 't2', parameter_t2: 'e_coli', messwert: 1200 },                           // Tab. 2 binnen gut: 1.000 (95) → überschritten
];

function initStore(rows: Row[]) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', { [FIELD_ID]: { type: 'json', value: { rows } } }, {}, {}); });
}
function storedRows(): Row[] {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const violations = (rows: unknown[]) => {
  const table = makeTableLookup(STD);
  const reg = prepareRegisterRows({ rows }, CFG.columns, { table, tableRows: makeTableRows(STD), symbol: lookup(WS10) });
  return evaluateFormula({ equationId: 'M205-10-D1', formula: D1.formula, inputSymbols: D1.input_symbols, outputSymbol: D1.output_symbol, inputs: [], registers: { leitorganismen: reg }, tableLookup: table });
};

beforeEach(() => initStore(ROWS));

describe('leitorganismen through the generic RegisterEditor (Plan 3 Task 11)', () => {
  it('a Tab.-1 row shows the parameter picker with the G/I lookup values and the target choice; a Tab.-2 row shows the parameter and the limit derived from the inherited Gewässerklasse', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="leitorganismen" config={CFG} standardCode={STD} symbolLookup={lookup(WS10)} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    // Tab. 1 row: Fäkalcoliforme 100 (80) / 2.000 (95), Leitwert chosen → limit 100
    expect(screen.getByTestId('lookup-value-g_wert_t1')).toHaveTextContent('100');
    expect(screen.getByTestId('lookup-value-i_wert_t1')).toHaveTextContent('2.000');
    expect(screen.getByTestId('lookup-value-g_pct_t1')).toHaveTextContent('80');
    expect(screen.getByRole('combobox', { name: 'Zielwert = Leitwert (G) oder Grenzwert (I)' })).toHaveValue('g');
    // Tab. 2 row: E. coli, Binnengewässer gut → 1.000 (95)
    expect(screen.getByTestId('derived-limit_t2')).toHaveTextContent('1.000');
    expect(screen.getByTestId('derived-pct_t2')).toHaveTextContent('95');
    expect(screen.getByTestId('derived-methode_t2')).toHaveTextContent('DIN EN ISO 9308-3 oder DIN EN ISO 9308-1');
    // the discriminator hides the other tables' columns per row: exactly one Tab.-1 picker and one Tab.-2 parameter select
    expect(screen.getAllByRole('combobox', { name: 'Parameter (Tab. 1)' })).toHaveLength(1);
    expect(screen.getAllByRole('combobox', { name: 'Parameter (Tab. 2)' })).toHaveLength(1);
    expect(screen.queryByRole('combobox', { name: 'Parameter (Tab. 3)' })).toBeNull();
    expect(screen.queryByLabelText('behördlicher Zielwert')).toBeNull();
    const limits = screen.getAllByTestId('derived-limit');
    expect(limits[0]).toHaveTextContent('100');
    expect(limits[1]).toHaveTextContent('1.000');
    const ok = screen.getAllByTestId('derived-badge-ok');
    expect(ok[0]).toHaveTextContent('eingehalten');
    expect(ok[1]).toHaveTextContent('überschritten');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
  });

  it('M205-10-D1 counts one violation over the two rows; a Behörde row typed in the editor counts once complete', async () => {
    const before = violations(storedRows());
    expect(before).toMatchObject({ kind: 'computed', value: 1 });
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="leitorganismen" config={CFG} standardCode={STD} symbolLookup={lookup(WS10)} />);
    await user.click(screen.getByRole('button', { name: '+ Organismus' }));
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(violations(storedRows())).toMatchObject(before); // the incomplete third row does not count
    await user.selectOptions(screen.getAllByRole('combobox', { name: 'Zieltabelle' })[2], 'behoerde');
    await user.type(screen.getByLabelText('Leitorganismus (Behörde)'), 'E. coli');
    await user.type(screen.getByLabelText('behördlicher Zielwert'), '50');
    await user.type(screen.getAllByLabelText('Konzentration im Ablauf der Desinfektionsanlage')[2], '60');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    expect(violations(storedRows())).toMatchObject({ kind: 'computed', value: 2 }); // 60 > 50
  });
});
