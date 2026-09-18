/**
 * Plan 3 Task 21 — the ISO-59020-05 `inflows` and the ISO-59020-06 `outflows`
 * registers render through the generic RegisterEditor from their DATA configs
 * (no per-standard React): two inflow rows show the Formula (A.1) – (A.3)
 * percentages and the linear share per row, the 100 %-balance badge, the
 * mass-weighted ISO-59020-05-D7 … D10 aggregates through the real
 * `evaluateFormula`; typing a mass moves the derived cells and the sums; a new
 * row without its label is incomplete; an outflow row without traceable
 * recycling data hides mRECO and reads 0 % (A.3.4).
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/iso59020';
import { EQUATIONS } from '@/lib/eval/equations/iso59020';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'ISO-59020';
const cfgOf = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const INFLOWS = cfgOf('ISO-59020-05', 'inflows');
const OUTFLOWS = cfgOf('ISO-59020-06', 'outflows');
const INFLOWS_ID = 'fixture-inflows';
const OUTFLOWS_ID = 'fixture-outflows';

type Row = Record<string, unknown> & { id: string };
const INFLOW_ROWS: Row[] = [
  { id: 'i1', label: 'Stahl', m_ti: 1000, m_reui: 200, m_reci: 500, m_reni: 0 },
  { id: 'i2', label: 'Holz', m_ti: 400, m_reui: 0, m_reci: 0, m_reni: 300 },
];
const OUTFLOW_ROWS: Row[] = [
  { id: 'o1', label: 'Produkt', m_to: 1000, m_reuo: 100, traceable_recycling: true, m_reco: 300, m_reno: 0 },
  { id: 'o2', label: 'Reststoff', m_to: 500, m_reuo: 0, m_reno: 100 },
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
  [INFLOWS_ID]: { type: 'json', value: { rows: INFLOW_ROWS } },
  [OUTFLOWS_ID]: { type: 'json', value: { rows: OUTFLOW_ROWS } },
}));

describe('inflows through the generic RegisterEditor (Plan 3 Task 21)', () => {
  it('two inflow rows show %REUI / %RECI / PRENI per row (20 / 50 / 0 and 0 / 0 / 75), the linear share (30 / 25 %) and the balance badge; the mass-weighted aggregates read 14,29 / 35,71 / 21,43 / 28,57 % over Σ mTI = 1400 kg', () => {
    render(<RegisterEditor fieldId={INFLOWS_ID} symbol="inflows" config={INFLOWS} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    const reui = screen.getAllByTestId('derived-pct_reui');
    expect(reui[0]).toHaveTextContent('20');
    expect(reui[1]).toHaveTextContent('0');
    expect(screen.getAllByTestId('derived-pct_reci')[0]).toHaveTextContent('50');
    expect(screen.getAllByTestId('derived-pct_reni')[1]).toHaveTextContent('75');
    expect(screen.getAllByTestId('derived-pct_linear')[0]).toHaveTextContent('30');
    expect(screen.getAllByTestId('derived-pct_linear')[1]).toHaveTextContent('25');
    expect(screen.getAllByTestId('derived-m_linear')[0]).toHaveTextContent('300');
    const badges = screen.getAllByTestId('derived-badge-balanced');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent('bilanziert');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
    expect(screen.queryAllByRole('button', { name: 'abweichend wählen' })).toHaveLength(0); // no lookup column — no override affordance
    expect(evalOut('ISO-59020-05-D2', 'inflows', INFLOWS, storedRows(INFLOWS_ID))).toMatchObject({ kind: 'computed', value: 1400 });
    const d7 = evalOut('ISO-59020-05-D7', 'inflows', INFLOWS, storedRows(INFLOWS_ID));
    expect(d7.kind).toBe('computed');
    if (d7.kind === 'computed') expect(d7.value).toBeCloseTo(14.2857, 3);
    const d10 = evalOut('ISO-59020-05-D10', 'inflows', INFLOWS, storedRows(INFLOWS_ID));
    if (d10.kind === 'computed') expect(d10.value).toBeCloseTo(28.5714, 3); else expect.fail(JSON.stringify(d10));
    expect(evalOut('ISO-59020-05-D11', 'inflows', INFLOWS, storedRows(INFLOWS_ID))).toMatchObject({ kind: 'computed', value: 0 });
  });

  it('typing mREUI = 700 on the steel row flips its balance badge (700 + 500 > 1000) and ISO-59020-05-D11 counts it; a new row without its label is incomplete and never enters the sums', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={INFLOWS_ID} symbol="inflows" config={INFLOWS} standardCode={STD} />);
    const reui = screen.getAllByLabelText('Masse wiederverwendeter Komponenten und Produkte des Zuflusses X')[0];
    await user.clear(reui);
    await user.type(reui, '700');
    expect(screen.getAllByTestId('derived-badge-balanced')[0]).toHaveTextContent('übersteigen');
    expect(screen.getAllByTestId('derived-pct_linear')[0]).toHaveTextContent('-20');
    expect(evalOut('ISO-59020-05-D11', 'inflows', INFLOWS, storedRows(INFLOWS_ID))).toMatchObject({ kind: 'computed', value: 1 });
    await user.click(screen.getByRole('button', { name: '+ Zufluss' }));
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(evalOut('ISO-59020-05-D1', 'inflows', INFLOWS, storedRows(INFLOWS_ID))).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalOut('ISO-59020-05-D2', 'inflows', INFLOWS, storedRows(INFLOWS_ID))).toMatchObject({ kind: 'computed', value: 1400 });
    await user.type(screen.getAllByLabelText('Bezeichnung des Zuflusses X')[2], 'Kunststoff');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3'); // the four masses are still required
  });
});

describe('outflows through the generic RegisterEditor (Plan 3 Task 21)', () => {
  it('a row without traceable recycling data hides the mRECO input and reads PRECO 0 % (A.3.4), stays complete; the traceable row shows 30 %; ISO-59020-06-D12 counts the untraceable row', () => {
    render(<RegisterEditor fieldId={OUTFLOWS_ID} symbol="outflows" config={OUTFLOWS} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(screen.getAllByLabelText('Masse recycelten Materials aus dem Abfluss X')).toHaveLength(1); // only on the traceable row
    const reco = screen.getAllByTestId('derived-pct_reco');
    expect(reco[0]).toHaveTextContent('30');
    expect(reco[1]).toHaveTextContent('0');
    expect(screen.getAllByTestId('derived-pct_linear')[1]).toHaveTextContent('80');
    expect(screen.getAllByTestId('derived-rlp')[0]).toHaveTextContent('—'); // no lifetime pair entered
    expect(evalOut('ISO-59020-06-D12', 'outflows', OUTFLOWS, storedRows(OUTFLOWS_ID))).toMatchObject({ kind: 'computed', value: 1 });
    expect(evalOut('ISO-59020-06-D8', 'outflows', OUTFLOWS, storedRows(OUTFLOWS_ID))).toMatchObject({ kind: 'computed', value: 20 });
  });
});
