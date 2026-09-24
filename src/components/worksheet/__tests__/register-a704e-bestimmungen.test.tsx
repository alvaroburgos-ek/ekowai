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
 *
 * Fix round 1 adds the ATV-A-704E-11 `pruefmittel` register: a photometer row and a
 * pipette row prove the FOUR row-scope `visible_when` columns through the real editor —
 * each type-specific column renders only on its own row type, switching a row's
 * `equipment` swaps which columns it shows, and the two -11 equations read the stored
 * rows throughout.
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
const PRUEF = parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((e) => e.worksheet === 'ATV-A-704E-11' && e.symbol === 'pruefmittel')!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const PRUEF_ID = 'fixture-pruefmittel-a704e';

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

const PRUEF_EQUIPMENT = 'Überwachtes Prüfmittel (IQC-Karte 9)';
const PIPETTE_VOL = 'Geprüftes Volumen der Kolbenhubpipette (IQC-Karte 9 Blatt 3)';
const PIPETTE_DEV = 'Gemessene Abweichung der Kolbenhubpipette in Prozent (IQC-Karte 9 Blatt 3)';
const HEATING_DEV = 'Gemessene Temperaturabweichung des Heizgeräts bzw. Thermoblocks in Grad Celsius (IQC-Karte 9)';
const PHOTOMETER_CHK = 'Photometer mit dem Testlösungssatz des Herstellers geprüft (IQC-Karte 9)';

const pruefPrepared = (rows: unknown[]) => prepareRegisterRows({ rows }, PRUEF.columns, { table, tableRows: makeTableRows(STD), symbol: () => undefined });
const pruefEval = (n: string, rows: unknown[]) => {
  const e = EQUATIONS.find((x) => x.equation_number === n)!;
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { pruefmittel: pruefPrepared(rows) }, tableLookup: table });
};

describe('pruefmittel through the generic RegisterEditor (Plan 3 Task 27, fix round 1)', () => {
  beforeEach(() => initStore({
    [PRUEF_ID]: {
      type: 'json',
      value: {
        rows: [
          { id: 'p1', equipment: 'photometer', interval: 'annually', last_check: '2026-02-02', photometer_check: true },
          { id: 'p2', equipment: 'piston_stroke_pipettes', interval: 'quarterly', last_check: '2026-01-10', pipette_volume_ml: 0.1, pipette_dev_pct: 1.5 },
        ],
      },
    },
  }));

  it('a photometer row and a pipette row: each of the four type-specific columns renders ONLY on its own row type; count 2 and pipette maximum 1,5 read the stored rows', () => {
    render(<RegisterEditor fieldId={PRUEF_ID} symbol="pruefmittel" config={PRUEF} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    const equipment = screen.getAllByLabelText(PRUEF_EQUIPMENT) as HTMLSelectElement[];
    expect(equipment.map((s) => s.value)).toEqual(['photometer', 'piston_stroke_pipettes']);
    // the photometer row shows ONLY the photometer checkbox; the pipette row ONLY the two pipette numbers; neither shows the thermoblock field
    expect(screen.getAllByLabelText(PHOTOMETER_CHK)).toHaveLength(1);
    expect((screen.getByLabelText(PHOTOMETER_CHK) as HTMLInputElement).checked).toBe(true);
    expect(screen.getAllByLabelText(PIPETTE_VOL)).toHaveLength(1);
    expect(screen.getAllByLabelText(PIPETTE_DEV)).toHaveLength(1);
    expect((screen.getByLabelText(PIPETTE_DEV) as HTMLInputElement).value).toBe('1.5');
    expect(screen.queryAllByLabelText(HEATING_DEV)).toHaveLength(0);
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
    expect(pruefEval('ATV-A-704E-11-D1', storedRows(PRUEF_ID))).toMatchObject({ kind: 'computed', value: 2 });
    expect(pruefEval('ATV-A-704E-11-D2', storedRows(PRUEF_ID))).toMatchObject({ kind: 'computed', value: 1.5 });
  });

  it('switching the photometer row to a thermoblock swaps its checkbox for the temperature field; switching it to a pipette reveals the two pipette numbers and, once a deviation is typed, moves the maximum', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={PRUEF_ID} symbol="pruefmittel" config={PRUEF} standardCode={STD} />);
    await user.selectOptions(screen.getAllByLabelText(PRUEF_EQUIPMENT)[0], 'heating_device_thermoblock');
    expect(screen.queryAllByLabelText(PHOTOMETER_CHK)).toHaveLength(0);
    expect(screen.getAllByLabelText(HEATING_DEV)).toHaveLength(1);
    expect(screen.getAllByLabelText(PIPETTE_DEV)).toHaveLength(1); // still only the pipette row
    expect(pruefEval('ATV-A-704E-11-D2', storedRows(PRUEF_ID))).toMatchObject({ kind: 'computed', value: 1.5 });
    await user.selectOptions(screen.getAllByLabelText(PRUEF_EQUIPMENT)[0], 'piston_stroke_pipettes');
    expect(screen.queryAllByLabelText(HEATING_DEV)).toHaveLength(0);
    expect(screen.getAllByLabelText(PIPETTE_VOL)).toHaveLength(2);
    expect(screen.getAllByLabelText(PIPETTE_DEV)).toHaveLength(2);
    await user.type(screen.getAllByLabelText(PIPETTE_DEV)[0], '2.4');
    expect(pruefEval('ATV-A-704E-11-D2', storedRows(PRUEF_ID))).toMatchObject({ kind: 'computed', value: 2.4 });
    expect(pruefEval('ATV-A-704E-11-D1', storedRows(PRUEF_ID))).toMatchObject({ kind: 'computed', value: 2 });
  });
});
