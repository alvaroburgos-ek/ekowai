/**
 * Plan 3 Task 12 — the M187-13 `filterschichten` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): picking a
 * Bild-3 layer fills the material / Soll-Stärke / GAK band / CaCO3 cells from
 * BILD3, the GAK badge is derived per row, and M187-13-D1 sums the planned sand
 * layers to h_FK through the real `evaluateFormula` (10 + 60 + 30 cm = 1,00 m).
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/m187';
import { EQUATIONS } from '@/lib/eval/equations/m187';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'DWA-M-187';
const FIELD_ID = 'fixture-filterschichten';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'M187-13' && e.symbol === 'filterschichten')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const D1 = EQUATIONS.find((e) => e.equation_number === 'M187-13-D1')!;
const D3 = EQUATIONS.find((e) => e.equation_number === 'M187-13-D3')!;

type Row = Record<string, unknown> & { id: string };
const ROWS: Row[] = [
  { id: 'r1', lage: '1', dicke_ist_cm: 10, gak_vol_pct: 15, caco3_pct: 20 }, // 10 cm Filtersand / Meliorationsschicht, GAK 10–20 %
  { id: 'r2', lage: '2', dicke_ist_cm: 60, caco3_pct: 20 },                  // 60 cm Filtersand
];

function initStore(rows: Row[]) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', { [FIELD_ID]: { type: 'json', value: { rows } } }, {}, {}); });
}
function storedRows(): Row[] {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const evalEq = (eq: typeof D1, rows: unknown[]) => {
  const table = makeTableLookup(STD);
  const reg = prepareRegisterRows({ rows }, CFG.columns, { table, tableRows: makeTableRows(STD) });
  return evaluateFormula({ equationId: eq.equation_number, formula: eq.formula, inputSymbols: eq.input_symbols, outputSymbol: eq.output_symbol, inputs: [], registers: { filterschichten: reg }, tableLookup: table });
};

beforeEach(() => initStore(ROWS));

describe('filterschichten through the generic RegisterEditor (Plan 3 Task 12)', () => {
  it('two Bild-3 layers render with the BILD3 fills (material, Soll-Stärke, GAK band, CaCO3) and the GAK badge per row', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="filterschichten" config={CFG} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    const material = screen.getAllByTestId('lookup-value-material');
    expect(material[0]).toHaveTextContent('Filtersand / Meliorationsschicht');
    expect(material[1]).toHaveTextContent('Filtersand');
    const soll = screen.getAllByTestId('lookup-value-dicke_soll_cm');
    expect(soll[0]).toHaveTextContent('10');
    expect(soll[1]).toHaveTextContent('60');
    const gakMin = screen.getAllByTestId('lookup-value-gak_min');
    expect(gakMin[0]).toHaveTextContent('10');
    expect(screen.getAllByTestId('lookup-value-gak_max')[0]).toHaveTextContent('20');
    expect(screen.getAllByTestId('lookup-value-caco3_soll_pct')[1]).toHaveTextContent('20');
    const ok = screen.getAllByTestId('derived-badge-gak_ok');
    expect(ok[0]).toHaveTextContent('ja');
    expect(ok[1]).toHaveTextContent('ja'); // no band printed for the 60 cm layer → ok by construction
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
    // the row picker offers the four printed layers
    const pickers = screen.getAllByRole('combobox', { name: 'Lage (Bild 3)' });
    expect(pickers).toHaveLength(2);
    expect(pickers[0].querySelectorAll('option').length).toBeGreaterThanOrEqual(4);
  });

  it('M187-13-D1 sums the two planned sand layers to 0,70 m; adding the printed 30 cm GAK layer through the editor reaches the Bild-3 1,00 m; a GAK share outside the band flips the badge and M187-13-D3', async () => {
    expect(evalEq(D1, storedRows())).toMatchObject({ kind: 'computed', value: 0.7 });
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="filterschichten" config={CFG} standardCode={STD} />);
    await user.click(screen.getByRole('button', { name: '+ Lage' }));
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    await user.selectOptions(screen.getAllByRole('combobox', { name: 'Lage (Bild 3)' })[2], '3');
    await user.type(screen.getAllByLabelText('geplante Schichtstärke in cm')[2], '30');
    await user.type(screen.getAllByLabelText('GAK-Volumenanteil geplant')[2], '35');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    expect(screen.getAllByTestId('lookup-value-material')[2]).toHaveTextContent('Filtersand');
    expect(screen.getAllByTestId('lookup-value-gak_min')[2]).toHaveTextContent('30');
    expect(evalEq(D1, storedRows())).toMatchObject({ kind: 'computed', value: 1 });
    expect(evalEq(D3, storedRows())).toMatchObject({ kind: 'computed', value: 0 });
    // GAK 45 % in the lower layer (band 30–40 %) → badge nein, one violation
    await user.clear(screen.getAllByLabelText('GAK-Volumenanteil geplant')[2]);
    await user.type(screen.getAllByLabelText('GAK-Volumenanteil geplant')[2], '45');
    expect(screen.getAllByTestId('derived-badge-gak_ok')[2]).toHaveTextContent('nein');
    expect(evalEq(D3, storedRows())).toMatchObject({ kind: 'computed', value: 1 });
  });
});
