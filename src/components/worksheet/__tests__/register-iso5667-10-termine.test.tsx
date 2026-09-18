/**
 * Plan 3 Task 20 — the ISO-5667-10-02 `probenahmestellen` and the ISO-5667-10-03
 * `probenahmetermine` registers render through the generic RegisterEditor from
 * their DATA configs (no per-standard React): a sewer row shows the §5.1 columns
 * and hides the §5.4 ones, a cooling row the reverse (discriminator column +
 * row-scope visible_when), the §5 badges come from the seeded S5_SITE figures;
 * the schedule rows derive the Fórmula (1) day from the worksheet's A and n
 * (symbolLookup), ISO-5667-10-03-D4 counts them through the real
 * `evaluateFormula`, and a new row without k is incomplete.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/iso5667_10';
import { EQUATIONS } from '@/lib/eval/equations/iso5667_10';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';
import type { Value } from '@/lib/expr';

const STD = 'ISO-5667-10';
const cfgOf = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STELLEN = cfgOf('ISO-5667-10-02', 'probenahmestellen');
const TERMINE = cfgOf('ISO-5667-10-03', 'probenahmetermine');
const STELLEN_ID = 'fixture-probenahmestellen';
const TERMINE_ID = 'fixture-probenahmetermine';
const lookup = (ws: Record<string, Value>) => (s: string) => (s in ws ? ws[s] : undefined);
/** -03 worksheet scope: n = 30 samples over a year (Fórmula 1), A drawn as −5 (inside −365/30 … 0). */
const WS03: Record<string, Value> = { A: -5, number_of_samples: 30 };

type Row = Record<string, unknown> & { id: string };
const STELLEN_ROWS: Row[] = [
  { id: 'p1', kennung: 'K-1', specific_site_type: 'sewer_channel_manhole', restriction_downstream_diameters: 4, sampling_depth_fraction: 0.4, flow_type: 'open', well_mixed: true },
  { id: 'p2', kennung: 'KW-2', specific_site_type: 'cooling_system', cooling_type: 'closed', cooling_runoff_s: 45, upstream_of_biocide: true, flow_type: 'closed' },
];
const TERMINE_ROWS: Row[] = [{ id: 't1', k: 1 }, { id: 't2', k: 2, done: true }];

function initStore(values: Record<string, { type: 'json'; value: { rows: Row[] } }>) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', values, {}, {}); });
}
function storedRows(fieldId: string): Row[] {
  const v = useWorksheetStore.getState().values[fieldId];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const evalOut = (n: string, symbol: string, cfg: RegisterUiConfig, rows: unknown[], ws: Record<string, Value> = {}) => {
  const table = makeTableLookup(STD);
  const e = EQUATIONS.find((x) => x.equation_number === n)!;
  const reg = prepareRegisterRows({ rows }, cfg.columns, { table, tableRows: makeTableRows(STD), symbol: lookup(ws) });
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { [symbol]: reg }, tableLookup: table });
};

beforeEach(() => initStore({
  [STELLEN_ID]: { type: 'json', value: { rows: STELLEN_ROWS } },
  [TERMINE_ID]: { type: 'json', value: { rows: TERMINE_ROWS } },
}));

describe('probenahmestellen through the generic RegisterEditor (Plan 3 Task 20)', () => {
  it('a sewer row shows the §5.1 columns (restriction / depth) and hides the §5.4 ones; a cooling row the reverse; the §5 badges read the seeded S5_SITE figures', () => {
    render(<RegisterEditor fieldId={STELLEN_ID} symbol="probenahmestellen" config={STELLEN} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    // sewer row: restriction + depth inputs exist once (only on the sewer row); cooling inputs exist once (only on the cooling row)
    expect(screen.getAllByLabelText('Abstand stromabwärts der Drossel in Rohrdurchmessern')).toHaveLength(1);
    expect(screen.getAllByLabelText('Probenahmetiefe als Anteil der Wassertiefe')).toHaveLength(1);
    expect(screen.getAllByLabelText('Vorlaufzeit des Kühlwassers vor der Probenahme')).toHaveLength(1);
    expect(screen.getAllByLabelText('Probenahmestelle stromaufwärts der Biozid-Dosierung')).toHaveLength(1);
    expect(screen.queryByLabelText('Objetivo del muestreo en la planta')).toBeNull(); // no wwtp row → the §5.2 columns are hidden on both
    expect((screen.getAllByLabelText('Vorlaufzeit des Kühlwassers vor der Probenahme')[0] as HTMLInputElement).value).toBe('45');
    // badges: sewer 4 × D / depth 0,4 ok; cooling 45 s ok — every non-applicable badge reads 1 (ok)
    const restriction = screen.getAllByTestId('derived-badge-restriction_ok');
    expect(restriction).toHaveLength(2);
    expect(restriction[0]).toHaveTextContent('§5.1 Abstand ok');
    expect(screen.getAllByTestId('derived-badge-depth_ok')[0]).toHaveTextContent('§5.1 Tiefe ok');
    expect(screen.getAllByTestId('derived-badge-runoff_ok')[1]).toHaveTextContent('§5.4 Vorlauf ok');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
    expect(screen.queryAllByRole('button', { name: 'abweichend wählen' })).toHaveLength(0); // no lookup column — no override affordance
  });

  it('typing a run-off below 30 s flips the cooling badge and ISO-5667-10-02-D2 counts the row; the id column is required (a new row is incomplete)', async () => {
    act(() => {
      useWorksheetStore.getState().init('fixture-instance', { [STELLEN_ID]: { type: 'json', value: { rows: [
        { id: 'p2', specific_site_type: 'cooling_system', cooling_type: 'closed', cooling_runoff_s: 45 }, // no kennung yet
      ] } } }, {}, {});
    });
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={STELLEN_ID} symbol="probenahmestellen" config={STELLEN} standardCode={STD} />);
    // the row lacks the required text column `kennung` → incomplete until typed
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('0/1');
    await user.type(screen.getByLabelText('Identifikation der Probenahmestelle'), 'KW-1');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('1/1');
    expect(evalOut('ISO-5667-10-02-D2', 'probenahmestellen', STELLEN, storedRows(STELLEN_ID))).toMatchObject({ kind: 'computed', value: 0 });
    const runoff = screen.getByLabelText('Vorlaufzeit des Kühlwassers vor der Probenahme');
    await user.clear(runoff);
    await user.type(runoff, '20');
    expect(screen.getByTestId('derived-badge-runoff_ok')).toHaveTextContent('§5.4 Vorlauf < 30 s');
    expect(evalOut('ISO-5667-10-02-D2', 'probenahmestellen', STELLEN, storedRows(STELLEN_ID))).toMatchObject({ kind: 'computed', value: 1 });
    expect(evalOut('ISO-5667-10-02-D1', 'probenahmestellen', STELLEN, storedRows(STELLEN_ID))).toMatchObject({ kind: 'computed', value: 1 });
  });
});

describe('probenahmetermine through the generic RegisterEditor (Plan 3 Task 20)', () => {
  it('two schedule rows derive the Fórmula (1) day from A = −5 and n = 30 (7,17 / 19,33); ISO-5667-10-03-D4 / D5 count 2 / 1; a third row without k is incomplete and does not count', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={TERMINE_ID} symbol="probenahmetermine" config={TERMINE} standardCode={STD} symbolLookup={lookup(WS03)} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    const days = screen.getAllByTestId('derived-day_or_week');
    expect(days[0]).toHaveTextContent('7,1667');
    expect(days[1]).toHaveTextContent('19,3333');
    expect(evalOut('ISO-5667-10-03-D4', 'probenahmetermine', TERMINE, storedRows(TERMINE_ID), WS03)).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalOut('ISO-5667-10-03-D5', 'probenahmetermine', TERMINE, storedRows(TERMINE_ID), WS03)).toMatchObject({ kind: 'computed', value: 1 });
    await user.click(screen.getByRole('button', { name: '+ Termin' }));
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(evalOut('ISO-5667-10-03-D4', 'probenahmetermine', TERMINE, storedRows(TERMINE_ID), WS03)).toMatchObject({ kind: 'computed', value: 2 });
    await user.type(screen.getAllByLabelText('Probenindex k')[2], '3');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    expect(screen.getAllByTestId('derived-day_or_week')[2]).toHaveTextContent('31,5');
    expect(evalOut('ISO-5667-10-03-D4', 'probenahmetermine', TERMINE, storedRows(TERMINE_ID), WS03)).toMatchObject({ kind: 'computed', value: 3 });
  });

  it('without A on the worksheet the derived day is empty (—) and the row still counts; under n = 12 the same row reads the Fórmula (2) week', () => {
    render(<RegisterEditor fieldId={TERMINE_ID} symbol="probenahmetermine" config={TERMINE} standardCode={STD} symbolLookup={lookup({ number_of_samples: 30 })} />);
    expect(screen.getAllByTestId('derived-day_or_week')[0]).toHaveTextContent('—');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(evalOut('ISO-5667-10-03-D4', 'probenahmetermine', TERMINE, storedRows(TERMINE_ID), { number_of_samples: 30 })).toMatchObject({ kind: 'computed', value: 2 });
    const table = makeTableLookup(STD);
    const week = prepareRegisterRows({ rows: storedRows(TERMINE_ID) }, TERMINE.columns, { table, tableRows: makeTableRows(STD), symbol: lookup({ A: -2, number_of_samples: 12 }) });
    expect(week.rows[0].values.day_or_week).toBeCloseTo(-2 + 52 / 12, 6);
  });
});
