/**
 * Plan 3 Task 10 — the DIN-18130-1-03 `ablesungen` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): the
 * konstant columns (h_o/h_u/p_o/p_u/V_w) show under `gefaelle_typ = konstant`
 * and the veränderlich columns (h_1/h_2) under `veraenderlich`, the per-row k
 * (Gl. 8 / Gl. 9) and its printed mantissa · 10^exponent form (§8.4 ANMERKUNG)
 * come from the same prepared rows, and DIN-18130-1-03-D1 evaluates the mean
 * over them through the real `evaluateFormula`.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/din18130_1';
import { EQUATIONS } from '@/lib/eval/equations/din18130_1';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';
import type { Value } from '@/lib/expr';

const STD = 'DIN-18130-1';
const FIELD_ID = 'fixture-ablesungen';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'DIN-18130-1-03' && e.symbol === 'ablesungen')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const D1 = EQUATIONS.find((e) => e.equation_number === 'DIN-18130-1-03-D1')!;

// Tab. 11 (§9.4): l = 0,05 m, A = 7,238·10⁻³ m², γ_w = 10 kN/m³, konstantes Gefälle with p_o = 20 kN/m²
const WS_KONSTANT: Record<string, Value> = { gefaelle_typ: 'konstant', gamma_w: 10, l: 0.05, l_0: 0.05, A: 7.238e-3, a: null };
// Tab. 7 (§9.1): a = 2,43·10⁻⁵ m², l_0 = 0,01985 m, A = 7,85·10⁻³ m², veränderliches Gefälle
const WS_VERAENDERLICH: Record<string, Value> = { gefaelle_typ: 'veraenderlich', gamma_w: 10, l: 0.01985, l_0: 0.01985, A: 7.85e-3, a: 2.43e-5 };
const lookup = (ws: Record<string, Value>) => (s: string) => (s in ws ? ws[s] : undefined);

type Row = Record<string, unknown> & { id: string };
const KONSTANT_ROWS: Row[] = [
  { id: 'r1', nr: 1, t_s: 76800, h_o: 0.51, h_u: 0.189, p_o: 20, p_u: 0, v_w: 1.25e-5, t_c: 20.5 },
  { id: 'r2', nr: 2, t_s: 86400, h_o: 0.504, h_u: 0.192, p_o: 20, p_u: 0, v_w: 1.31e-5, t_c: 20.5 },
];
const VERAENDERLICH_ROWS: Row[] = [
  { id: 'r1', nr: 1, t_s: 15, h_1: 0.655, h_2: 0.648, t_c: 21 },
  { id: 'r2', nr: 2, t_s: 390, h_1: 0.655, h_2: 0.503, t_c: 21 },
];

function initStore(rows: Row[]) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', { [FIELD_ID]: { type: 'json', value: { rows } } }, {}, {}); });
}
function storedRows(): Row[] {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const kTmean = (rows: unknown[], ws: Record<string, Value>) => {
  const table = makeTableLookup(STD);
  const reg = prepareRegisterRows({ rows }, CFG.columns, { table, tableRows: makeTableRows(STD), symbol: lookup(ws) });
  return evaluateFormula({ equationId: 'DIN-18130-1-03-D1', formula: D1.formula, inputSymbols: D1.input_symbols, outputSymbol: D1.output_symbol, inputs: [], registers: { ablesungen: reg }, tableLookup: table });
};

beforeEach(() => initStore(KONSTANT_ROWS));

describe('ablesungen through the generic RegisterEditor (Plan 3 Task 10)', () => {
  it('konstant: two Tab.-11 rows show h_o/h_u/p_o/p_u/V_w, hide h_1/h_2, and derive h, i and k per row (k as mantissa · 10^exponent)', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="ablesungen" config={CFG} standardCode={STD} symbolLookup={lookup(WS_KONSTANT)} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getAllByLabelText('Standrohrspiegelhöhe Oberstrom h_o')).toHaveLength(2);
    expect(screen.getAllByLabelText('Wasservolumen V_w')).toHaveLength(2);
    expect(screen.queryByLabelText('Wasserhöhe im Standrohr bei Versuchsbeginn h_1')).toBeNull();
    expect(screen.queryByLabelText('Wasserhöhe im Standrohr bei Versuchsende h_2')).toBeNull();
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    const h = screen.getAllByTestId('derived-h_row');
    expect(h[0]).toHaveTextContent('2,321');
    expect(h[1]).toHaveTextContent('2,312');
    expect(screen.getAllByTestId('derived-i_row')[0]).toHaveTextContent('46,42');
    // k = 4,8·10⁻¹⁰ (Tab. 11 Ablesung 1): the printed representation (L850) is readable, the raw cell is the engine input (I-2)
    expect(screen.getAllByTestId('derived-k_exp')[0]).toHaveTextContent('-10');
    expect(screen.getAllByTestId('derived-k_mant')[0]).toHaveTextContent('4,84');
    expect(screen.getAllByTestId('derived-alpha_row')[0]).toHaveTextContent('0,762');
    expect(screen.getAllByTestId('derived-k10_mant')[0]).toHaveTextContent('3,69');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
  });

  it('veränderlich: the Tab.-7 rows show h_1/h_2, hide the konstant columns, and k follows Gl. 9', () => {
    initStore(VERAENDERLICH_ROWS);
    render(<RegisterEditor fieldId={FIELD_ID} symbol="ablesungen" config={CFG} standardCode={STD} symbolLookup={lookup(WS_VERAENDERLICH)} />);
    expect(screen.getAllByLabelText('Wasserhöhe im Standrohr bei Versuchsbeginn h_1')).toHaveLength(2);
    expect(screen.queryByLabelText('Standrohrspiegelhöhe Oberstrom h_o')).toBeNull();
    expect(screen.queryByLabelText('Wasservolumen V_w')).toBeNull();
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    // ln(0,655/0,503) = 0,2640 at t = 390 s → k = 2,43·10⁻⁵ · 0,01985 / (7,85·10⁻³ · 390) · 0,2640 = 4,16·10⁻⁸
    expect(screen.getAllByTestId('derived-k_exp')[1]).toHaveTextContent('-8');
    expect(screen.getAllByTestId('derived-k_mant')[1]).toHaveTextContent('4,16');
    expect(screen.getAllByTestId('derived-i_row')[1]).toHaveTextContent('32,9975'); // h_1 / l_0 = 0,655 / 0,01985 = 33,0 (§9.1 max. i = 33)
    expect(screen.getAllByTestId('derived-h_row')[0]).toHaveTextContent('—'); // konstant-only cell, never a number
  });

  it('DIN-18130-1-03-D1 evaluates the mean k_T over the two konstant rows through evaluateFormula; a third row counts once complete', async () => {
    const before = kTmean(storedRows(), WS_KONSTANT);
    expect(before.kind).toBe('computed');
    expect((before.kind === 'computed' ? before.value : NaN) * 1e10).toBeCloseTo((4.84 + 4.52) / 2, 1);
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="ablesungen" config={CFG} standardCode={STD} symbolLookup={lookup(WS_KONSTANT)} />);
    await user.click(screen.getByRole('button', { name: '+ Ablesung' }));
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(kTmean(storedRows(), WS_KONSTANT)).toMatchObject(before); // incomplete third row does not count
    await user.type(screen.getAllByRole('spinbutton', { name: 'Nr.' })[2], '3');
    await user.type(screen.getAllByLabelText('Meßzeitspanne t')[2], '259200');
    await user.type(screen.getAllByLabelText('Standrohrspiegelhöhe Oberstrom h_o')[2], '0.277');
    await user.type(screen.getAllByLabelText('Standrohrspiegelhöhe Unterstrom h_u')[2], '0.257');
    await user.type(screen.getAllByLabelText('Oberwasserdruck p_o')[2], '20');
    await user.type(screen.getAllByLabelText('Unterwasserdruck p_u')[2], '0');
    await user.type(screen.getAllByLabelText('Wasservolumen V_w')[2], '0.0000335');
    await user.type(screen.getAllByLabelText('Wassertemperatur T')[2], '20.5');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    const after = kTmean(storedRows(), WS_KONSTANT);
    expect((after.kind === 'computed' ? after.value : NaN) * 1e10).toBeCloseTo((4.84 + 4.52 + 4.43) / 3, 1); // Tab. 11: 4,8 / 4,5 / 4,4
  });
});
