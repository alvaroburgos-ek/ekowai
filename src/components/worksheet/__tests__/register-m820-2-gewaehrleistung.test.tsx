/**
 * Plan 3 Task 19 — the 820-2-24 `gewaehrleistungen` register (Gewährleistungskalender,
 * § 5.8.2) renders through the generic RegisterEditor from its DATA config (no
 * per-standard React): two rows per Auftragnehmer with the three required dates,
 * the 820-2-24-D1 / D2 count / open-defects evaluate through the real
 * `evaluateFormula` over the same prepared rows, and a new row without its dates
 * is incomplete. The upgraded Plan-1 `change_orders` register (820-2-21) is pinned
 * in the same file: its Σ / count / open twins evaluate through `evaluateFormula`
 * (the Plan-1 client `sum_column` is gone).
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/m820_2';
import { EQUATIONS } from '@/lib/eval/equations/m820_2';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'DWA-M-820-2';
const FIELD_ID = 'fixture-gewaehrleistungen';
const cfgOf = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const CFG = cfgOf('820-2-24', 'gewaehrleistungen');

type Row = { id: string; auftragnehmer: string | null; abnahme?: string | null; beginn?: string | null; ende?: string | null; maengel_offen?: number | null };
const TWO_ROWS: Row[] = [
  { id: 'r1', auftragnehmer: 'Firma A (Rohbau)', abnahme: '2026-03-01', beginn: '2026-03-01', ende: '2030-03-01', maengel_offen: 2 },
  { id: 'r2', auftragnehmer: 'Firma B (Maschinentechnik)', abnahme: '2026-05-15', beginn: '2026-05-15', ende: '2028-05-15' },
];

function initStore(rows: Row[]) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', { [FIELD_ID]: { type: 'json', value: { rows } } }, {}, {}); });
}
function storedRows(): Row[] {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const evalTwin = (n: string, rows: unknown[], symbol = 'gewaehrleistungen', cfg = CFG) => {
  const table = makeTableLookup(STD);
  const e = EQUATIONS.find((x) => x.equation_number === n)!;
  const reg = prepareRegisterRows({ rows }, cfg.columns, { table, tableRows: makeTableRows(STD), symbol: () => undefined }, {});
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { [symbol]: reg }, tableLookup: table });
};

beforeEach(() => initStore(TWO_ROWS));

describe('gewaehrleistungen through the generic RegisterEditor (Plan 3 Task 19)', () => {
  it('renders two Auftragnehmer rows with Abnahme / Beginn / Ende dates and the open-defects column, both complete, no override toggle', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="gewaehrleistungen" config={CFG} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    const names = screen.getAllByLabelText('Auftragnehmer / ausführende Firma') as HTMLInputElement[];
    expect(names.map((n) => n.value)).toEqual(['Firma A (Rohbau)', 'Firma B (Maschinentechnik)']);
    const ends = screen.getAllByLabelText('Ende der Gewährleistungsfrist') as HTMLInputElement[];
    expect(ends.map((d) => d.value)).toEqual(['2030-03-01', '2028-05-15']);
    const defects = screen.getAllByLabelText('Anzahl offener Mängel dieses Auftragnehmers') as HTMLInputElement[];
    expect(defects.map((d) => d.value)).toEqual(['2', '']);
    expect(screen.queryAllByRole('button', { name: 'abweichend wählen' })).toHaveLength(0); // no lookup column — no override affordance
    expect(screen.getByRole('button', { name: '+ Auftragnehmer / Firma' })).toBeInTheDocument();
  });

  it('820-2-24-D1 / D2 = 2 entries / 2 open defects through evaluateFormula; typing defects on the second row moves the Σ; a third row without dates is incomplete', async () => {
    expect(evalTwin('820-2-24-D1', storedRows())).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalTwin('820-2-24-D2', storedRows())).toMatchObject({ kind: 'computed', value: 2 });
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="gewaehrleistungen" config={CFG} standardCode={STD} />);
    await user.type(screen.getAllByLabelText('Anzahl offener Mängel dieses Auftragnehmers')[1], '3');
    expect(storedRows()[1].maengel_offen).toBe(3);
    expect(evalTwin('820-2-24-D2', storedRows())).toMatchObject({ kind: 'computed', value: 5 });
    await user.click(screen.getByRole('button', { name: '+ Auftragnehmer / Firma' }));
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(evalTwin('820-2-24-D1', storedRows())).toMatchObject({ kind: 'computed', value: 2 });
  });

  it('the upgraded change_orders register (Plan-1 keys kept) feeds count / Σ / open through evaluateFormula — an empty Kostenwirkung counts as 0', () => {
    const CO_ID = 'fixture-change-orders';
    const cfg = cfgOf('820-2-21', 'change_orders');
    const rows = [
      { id: 'c1', aenderung: 'Nachtrag 1', datum: '2026-03-02', kosten_eur: 12000, status: 'offen' },
      { id: 'c2', aenderung: 'Nachtrag 2', datum: '2026-03-20', terminwirkung: '+3 Wochen', status: 'genehmigt' },
    ];
    act(() => { useWorksheetStore.getState().init('fixture-instance-2', { [CO_ID]: { type: 'json', value: { rows } } }, {}, {}); });
    render(<RegisterEditor fieldId={CO_ID} symbol="change_orders" config={cfg} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(cfg.sum_column).toBeUndefined();
    const v = useWorksheetStore.getState().values[CO_ID];
    const stored = v?.type === 'json' ? (v.value as { rows: unknown[] }).rows : [];
    expect(evalTwin('820-2-21-D1', stored, 'change_orders', cfg)).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalTwin('820-2-21-D2', stored, 'change_orders', cfg)).toMatchObject({ kind: 'computed', value: 12000 });
    expect(evalTwin('820-2-21-D3', stored, 'change_orders', cfg)).toMatchObject({ kind: 'computed', value: 1 });
  });
});
