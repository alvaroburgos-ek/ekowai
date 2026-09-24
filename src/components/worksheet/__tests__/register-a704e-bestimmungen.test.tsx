/**
 * Plan 3 Task 27 — the ATV-A-704E-09 `einzelbestimmungen` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): two single
 * determinations of one parameter and date, the nine prod parameter tokens with prod's
 * labels in the select, and the worksheet equations reading the STORED rows —
 * `mean_value_calc` (the stored EQ-01 math over the rows) and `max_dev_pct_calc` (the
 * stored EQ-02 math maximised) through the real `evaluateFormula`.
 *
 * Adding a third value changes the mean and the greatest deviation live; a new row
 * without a result is incomplete and never counts (the count keeps the complete rows,
 * the mean stays the mean of what is entered).
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/atv_a704e';
import { EQUATIONS } from '@/lib/eval/equations/atv_a704e';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'ATV-A-704E';
const EINZ = parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((e) => e.worksheet === 'ATV-A-704E-09' && e.symbol === 'einzelbestimmungen')!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const EINZ_ID = 'fixture-einzelbestimmungen-a704e';

type Row = Record<string, unknown> & { id: string };
const ROWS: Row[] = [
  { id: 'e1', parameter: 'cod', date: '2026-01-05', single_result: 100, unit: 'mg/l' },
  { id: 'e2', parameter: 'cod', date: '2026-01-05', single_result: 110, unit: 'mg/l' },
];

function initStore(values: Record<string, { type: 'json'; value: { rows: Row[] } }>) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', values, {}, {}); });
}
function storedRows(fieldId: string): Row[] {
  const v = useWorksheetStore.getState().values[fieldId];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const table = makeTableLookup(STD);
const prepared = (rows: unknown[]) => prepareRegisterRows({ rows }, EINZ.columns, { table, tableRows: makeTableRows(STD), symbol: () => undefined });
const evalOut = (n: string, rows: unknown[]) => {
  const e = EQUATIONS.find((x) => x.equation_number === n)!;
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { einzelbestimmungen: prepared(rows) }, tableLookup: table });
};
const PARAMETER = 'Analytischer Parameter der Mehrfachbestimmung (IQC-Karte 3 Spalte 4)';
const RESULT = 'Einzelner Messwert der Mehrfachbestimmung (IQC-Karte 3 Spalten 4 bis 6)';
const DATE = 'Datum der Bestimmung (IQC-Karte 3 Spalte 1)';

beforeEach(() => initStore({ [EINZ_ID]: { type: 'json', value: { rows: ROWS } } }));

describe('einzelbestimmungen through the generic RegisterEditor (Plan 3 Task 27)', () => {
  it('two single determinations of one parameter: both rows complete, the parameter select offers the nine prod tokens with prod labels, and the equations read 2 / 105 / max(110−105, 105−100) × 100 / 105 ≈ 4,762 %', () => {
    render(<RegisterEditor fieldId={EINZ_ID} symbol="einzelbestimmungen" config={EINZ} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(screen.getAllByLabelText(RESULT)).toHaveLength(2);
    expect(screen.getAllByLabelText(DATE)).toHaveLength(2);
    const params = screen.getAllByLabelText(PARAMETER) as HTMLSelectElement[];
    expect(params.map((s) => s.value)).toEqual(['cod', 'cod']);
    expect(Array.from(params[0].options).map((o) => o.value).filter(Boolean)).toEqual(['settable_substances', 'bod5', 'cod', 'nh4_n', 'no3_n', 'no2_n', 'p_total', 'tn', 'toc']);
    expect(Array.from(params[0].options).map((o) => o.textContent)).toContain('CSB');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
    expect(screen.queryAllByRole('button', { name: 'abweichend wählen' })).toHaveLength(0); // no lookup table — no override affordance (nothing seeded)
    expect(evalOut('ATV-A-704E-09-D1', storedRows(EINZ_ID))).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalOut('ATV-A-704E-09-D2', storedRows(EINZ_ID))).toMatchObject({ kind: 'computed', value: 105 });
    const dev = evalOut('ATV-A-704E-09-D3', storedRows(EINZ_ID));
    expect(dev.kind).toBe('computed');
    expect(dev.kind === 'computed' ? dev.value : NaN).toBeCloseTo(4.7619047, 6); // 5 × 100 / 105
  });

  it('adding a third determination of 90 mg/l makes the mean 100 and the greatest deviation 10 %; a fourth row without a result is incomplete (3/4) and never counts', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={EINZ_ID} symbol="einzelbestimmungen" config={EINZ} standardCode={STD} />);
    await user.click(screen.getByRole('button', { name: '+ Einzelwert' }));
    expect(screen.getAllByTestId('register-row')).toHaveLength(3);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    await user.selectOptions(screen.getAllByLabelText(PARAMETER)[2], 'cod');
    await user.type(screen.getAllByLabelText(DATE)[2], '2026-01-05');
    await user.type(screen.getAllByLabelText(RESULT)[2], '90');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    expect(evalOut('ATV-A-704E-09-D1', storedRows(EINZ_ID))).toMatchObject({ kind: 'computed', value: 3 });
    expect(evalOut('ATV-A-704E-09-D2', storedRows(EINZ_ID))).toMatchObject({ kind: 'computed', value: 100 });
    expect(evalOut('ATV-A-704E-09-D3', storedRows(EINZ_ID))).toMatchObject({ kind: 'computed', value: 10 });
    await user.click(screen.getByRole('button', { name: '+ Einzelwert' }));
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/4');
    expect(evalOut('ATV-A-704E-09-D1', storedRows(EINZ_ID))).toMatchObject({ kind: 'computed', value: 3 });
    expect(evalOut('ATV-A-704E-09-D2', storedRows(EINZ_ID))).toMatchObject({ kind: 'computed', value: 100 });
  });
});
