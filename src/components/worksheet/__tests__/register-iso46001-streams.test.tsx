/**
 * Plan 3 Task 22 — the ISO-46001-08 `water_streams` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): two rows
 * (one utility input WD, one output O) show the term badge per row, the
 * role-scoped columns (source kind on the input row only, output class on the
 * output row only), and Win_calc / Wout_calc / leak_indicator through the real
 * `evaluateFormula`; typing a volume moves the difference; a new row without
 * its role / volume is incomplete and never enters the Σ; the `objectives`
 * register renders its five §6.2.1 planning columns and counts.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/iso46001';
import { EQUATIONS } from '@/lib/eval/equations/iso46001';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'ISO-46001';
const cfgOf = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STREAMS = cfgOf('ISO-46001-08', 'water_streams');
const OBJECTIVES = cfgOf('ISO-46001-03', 'objectives');
const STREAMS_ID = 'fixture-streams';
const OBJECTIVES_ID = 'fixture-objectives';

type Row = Record<string, unknown> & { id: string };
const STREAM_ROWS: Row[] = [
  { id: 's1', label: 'Stadtwerke Hauptzähler', role: 'wd', volume_m3: 1000, source_kind: 'drinking water', meter_location: 'Hausanschluss' },
  { id: 's2', label: 'Kanal', role: 'output', volume_m3: 900, output_type: 'sewer_discharge' },
];
const OBJECTIVE_ROWS: Row[] = [
  { id: 'o1', objective: '−10 % Wasser je Einheit bis 2027', what: 'Kühlturm-Optimierung', resources: '20 k€', responsible: 'Technik', deadline: '2027-06-30', evaluation_method: 'Monatsvergleich' },
  { id: 'o2', objective: 'Leckagen 0', what: 'Zählerausbau' },
];

function initStore(values: Record<string, { type: 'json'; value: { rows: Row[] } }>) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', values, {}, {}); });
}
function storedRows(fieldId: string): Row[] {
  const v = useWorksheetStore.getState().values[fieldId];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const evalOut = (n: string, symbol: string, cfg: RegisterUiConfig, rows: unknown[]) => {
  const table = makeTableLookup(STD);
  const e = EQUATIONS.find((x) => x.equation_number === n)!;
  const reg = prepareRegisterRows({ rows }, cfg.columns, { table, tableRows: makeTableRows(STD) });
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { [symbol]: reg }, tableLookup: table });
};

beforeEach(() => initStore({
  [STREAMS_ID]: { type: 'json', value: { rows: STREAM_ROWS } },
  [OBJECTIVES_ID]: { type: 'json', value: { rows: OBJECTIVE_ROWS } },
}));

describe('water_streams through the generic RegisterEditor (Plan 3 Task 22)', () => {
  it('two rows (WD + O) show the term badge (Win / Wout), the role-scoped columns per row, no diagnostics; Win_calc 1000 / Wout_calc 900 / leak_indicator 100 / count 2 through evaluateFormula', () => {
    render(<RegisterEditor fieldId={STREAMS_ID} symbol="water_streams" config={STREAMS} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    const badges = screen.getAllByTestId('derived-badge-balance_term');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent('Win (C.1 / C.2)');
    expect(badges[1]).toHaveTextContent('Wout (C.1 / C.2)');
    expect(screen.getAllByLabelText('Art der Wasserquelle (Annex C b) / A.7.3)')).toHaveLength(1);      // input row only
    expect(screen.getAllByLabelText('Klasse des Wasserausgangs nach Annex C')).toHaveLength(1);         // output row only
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
    expect(screen.queryAllByRole('button', { name: 'abweichend wählen' })).toHaveLength(0);           // no lookup column — no override affordance
    expect(evalOut('ISO-46001-08-D1', 'water_streams', STREAMS, storedRows(STREAMS_ID))).toMatchObject({ kind: 'computed', value: 1000 });
    expect(evalOut('ISO-46001-08-D2', 'water_streams', STREAMS, storedRows(STREAMS_ID))).toMatchObject({ kind: 'computed', value: 900 });
    expect(evalOut('ISO-46001-08-D3', 'water_streams', STREAMS, storedRows(STREAMS_ID))).toMatchObject({ kind: 'computed', value: 100 });
    expect(evalOut('ISO-46001-08-D6', 'water_streams', STREAMS, storedRows(STREAMS_ID))).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalOut('ISO-46001-08-D4', 'water_streams', STREAMS, storedRows(STREAMS_ID))).toMatchObject({ kind: 'computed', value: 0 }); // no recycling rows: (0 + 0) / (0 + 0 + 1000) × 100 = 0 % — CR-038 is IF-guarded by recycling_streams_count (G-4)
  });

  it('typing the output volume to 1000 balances the chart (leak_indicator 0); a new row without role / volume is incomplete and never enters the Σ; choosing a recycling role adds the row to recycling_streams_count', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={STREAMS_ID} symbol="water_streams" config={STREAMS} standardCode={STD} />);
    const vol = screen.getAllByLabelText('Gemessene Wassermenge des Stroms')[1];
    await user.clear(vol);
    await user.type(vol, '1000');
    expect(evalOut('ISO-46001-08-D3', 'water_streams', STREAMS, storedRows(STREAMS_ID))).toMatchObject({ kind: 'computed', value: 0 });
    await user.click(screen.getByRole('button', { name: '+ Strom / Zähler' }));
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(evalOut('ISO-46001-08-D6', 'water_streams', STREAMS, storedRows(STREAMS_ID))).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalOut('ISO-46001-08-D1', 'water_streams', STREAMS, storedRows(STREAMS_ID))).toMatchObject({ kind: 'computed', value: 1000 });
    await user.type(screen.getAllByLabelText('Bezeichnung des Wasserstroms oder Zählers')[2], 'Rückführung');
    await user.selectOptions(screen.getAllByLabelText('Rolle des Stroms in der Wasserbilanz')[2], 'rp');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3'); // the volume is still required
    await user.type(screen.getAllByLabelText('Gemessene Wassermenge des Stroms')[2], '250');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    expect(screen.getAllByTestId('derived-badge-balance_term')[2]).toHaveTextContent('Recycling (C.3 / C.5)');
    expect(evalOut('ISO-46001-08-D7', 'water_streams', STREAMS, storedRows(STREAMS_ID))).toMatchObject({ kind: 'computed', value: 1 });
    expect(evalOut('ISO-46001-08-D4', 'water_streams', STREAMS, storedRows(STREAMS_ID))).toMatchObject({ kind: 'computed', value: 20 }); // (250 + 0) / (250 + 0 + 1000) × 100
  });
});

describe('objectives through the generic RegisterEditor (Plan 3 Task 22)', () => {
  it('two objective rows with the §6.2.1 1) – 5) planning columns render complete; objectives_count 2; a new row without its objective text is incomplete', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={OBJECTIVES_ID} symbol="objectives" config={OBJECTIVES} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(screen.getAllByLabelText('Fertigstellungstermin (§6.2.1 4)')).toHaveLength(2);
    expect(evalOut('ISO-46001-03-D1', 'objectives', OBJECTIVES, storedRows(OBJECTIVES_ID))).toMatchObject({ kind: 'computed', value: 2 });
    await user.click(screen.getByRole('button', { name: '+ Ziel' }));
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(evalOut('ISO-46001-03-D1', 'objectives', OBJECTIVES, storedRows(OBJECTIVES_ID))).toMatchObject({ kind: 'computed', value: 2 });
  });
});
