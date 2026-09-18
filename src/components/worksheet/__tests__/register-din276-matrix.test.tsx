/**
 * Plan 3 Task 13 — the DIN-276-18 `kostenstufen_matrix` register and the
 * DIN-276-11 `kg3_positionen` register render through the generic RegisterEditor
 * from their DATA configs (no per-standard React): two stage rows show the derived
 * Σ KG 100–800 (§3.11) and Bauwerkskosten (§3.12) per row, the per-stage Σ come
 * from the engine footer, and picking a Table-1 row in the KG register fills the
 * designation and the Tab.-3 unit while `im_kg` flags a foreign KG.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor, type FooterState } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/din276';
import { EQUATIONS } from '@/lib/eval/equations/din276';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'DIN-276';
const cfgOf = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const MATRIX = cfgOf('DIN-276-18', 'kostenstufen_matrix');
const KG3 = cfgOf('DIN-276-11', 'kg3_positionen');
const MATRIX_ID = 'fixture-matrix';
const KG3_ID = 'fixture-kg3';

type Row = Record<string, unknown> & { id: string };
const STAGE_ROWS: Row[] = [
  { id: 'r1', stufe: 'kr', datum: '2026-01-10', kg100: 100, kg200: 50, kg300: 1000, kg400: 400, kg500: 200, kg600: 30, kg700: 250, kg800: 20 },
  { id: 'r2', stufe: 'ksch', datum: '2026-03-01', kg100: 100, kg200: 60, kg300: 1100, kg400: 450, kg500: 210, kg600: 30, kg700: 260, kg800: 20 },
];
const KG_ROWS: Row[] = [
  { id: 'k1', kg: 'kg_311', menge: 100, kennwert: 12.5, kosten_eur: 1250 },
  { id: 'k2', kg: 'kg_411', tab4_nr: '1', kosten_eur: 5 },
];

function initStore(values: Record<string, Row[]>) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', Object.fromEntries(Object.entries(values).map(([id, rows]) => [id, { type: 'json', value: { rows } }])), {}, {}); });
}
function storedRows(id: string): Row[] {
  const v = useWorksheetStore.getState().values[id];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const evalEq = (n: string, symbol: string, cfg: RegisterUiConfig, rows: unknown[]) => {
  const e = EQUATIONS.find((x) => x.equation_number === n)!;
  const table = makeTableLookup(STD);
  const reg = prepareRegisterRows({ rows }, cfg.columns, { table, tableRows: makeTableRows(STD) });
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { [symbol]: reg }, tableLookup: table });
};

beforeEach(() => initStore({ [MATRIX_ID]: STAGE_ROWS, [KG3_ID]: KG_ROWS }));

describe('DIN-276 registers through the generic RegisterEditor (Plan 3 Task 13)', () => {
  it('matrix: two stage rows render with derived Σ KG 100–800 (2050 / 2230) and Bauwerkskosten (1400 / 1550); the footer shows the engine states of the per-stage Σ', () => {
    const fs = (label: string, value: number): FooterState => ({ label, unit: 'EUR', state: { kind: 'computed', value, unit: 'EUR' } as never });
    const footerStates: Record<string, FooterState> = { KR_gesamt_calc: fs('Σ Kostenrahmen', 2050), KSch_gesamt_calc: fs('Σ Kostenschätzung', 2230), KF_gesamt_calc: fs('Σ Kostenfeststellung', 0), stufe_aktuell_gesamt: fs('aktuell', 2230) };
    render(<RegisterEditor fieldId={MATRIX_ID} symbol="kostenstufen_matrix" config={MATRIX} standardCode={STD} footerStates={footerStates} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    const gesamt = screen.getAllByTestId('derived-gesamt');
    expect(gesamt[0]).toHaveTextContent('2.050');
    expect(gesamt[1]).toHaveTextContent('2.230');
    const bauwerk = screen.getAllByTestId('derived-bauwerk');
    expect(bauwerk[0]).toHaveTextContent('1.400');
    expect(bauwerk[1]).toHaveTextContent('1.550');
    expect(screen.getByTestId('footer-KR_gesamt_calc')).toHaveTextContent('2.050');
    expect(screen.getByTestId('footer-KSch_gesamt_calc')).toHaveTextContent('2.230');
    expect(screen.getByTestId('footer-stufe_aktuell_gesamt')).toHaveTextContent('2.230');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
    // the stage picker offers the five printed stages
    const pickers = screen.getAllByRole('combobox', { name: 'Stufe' });
    expect(pickers).toHaveLength(2);
    expect(Array.from(pickers[0].querySelectorAll('option')).map((o) => o.getAttribute('value')).filter(Boolean)).toEqual(['kr', 'ksch', 'kber', 'ka', 'kf']);
    expect(evalEq('DIN-276-18-D1', 'kostenstufen_matrix', MATRIX, storedRows(MATRIX_ID))).toMatchObject({ kind: 'computed', value: 2050 });
    expect(evalEq('DIN-276-18-D7', 'kostenstufen_matrix', MATRIX, storedRows(MATRIX_ID))).toMatchObject({ kind: 'computed', value: 2230 });
  });

  it('matrix: adding a third stage through the editor makes the row incomplete until every KG column is filled; then DIN-276-18-D7 reads the new row', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={MATRIX_ID} symbol="kostenstufen_matrix" config={MATRIX} standardCode={STD} />);
    await user.click(screen.getByRole('button', { name: '+ Stufe' }));
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    await user.selectOptions(screen.getAllByRole('combobox', { name: 'Stufe' })[2], 'kber');
    await user.type(screen.getAllByLabelText('Kostenstand (Datum)')[2], '2026-05-01');
    for (const [kg, v] of [['KG 100', '100'], ['KG 200', '60'], ['KG 300', '1200'], ['KG 400', '500'], ['KG 500', '220'], ['KG 600', '30'], ['KG 700', '270']] as const) await user.type(screen.getAllByLabelText(kg)[2], v);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3'); // KG 800 still blank
    expect(evalEq('DIN-276-18-D7', 'kostenstufen_matrix', MATRIX, storedRows(MATRIX_ID))).toMatchObject({ kind: 'computed', value: 2230 });
    await user.type(screen.getAllByLabelText('KG 800')[2], '20');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    expect(screen.getAllByTestId('derived-gesamt')[2]).toHaveTextContent('2.400');
    expect(evalEq('DIN-276-18-D7', 'kostenstufen_matrix', MATRIX, storedRows(MATRIX_ID))).toMatchObject({ kind: 'computed', value: 2400 });
    expect(evalEq('DIN-276-18-D3', 'kostenstufen_matrix', MATRIX, storedRows(MATRIX_ID))).toMatchObject({ kind: 'computed', value: 2400 });
  });

  it('KG 300 register: the Table-1 picker (grouped by parent KG) fills designation + Tab.-3 unit, Menge × Kennwert is derived, a KG 400 row is flagged "nein" and excluded from DIN-276-11-D1', () => {
    render(<RegisterEditor fieldId={KG3_ID} symbol="kg3_positionen" config={KG3} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    const bez = screen.getAllByTestId('lookup-value-bezeichnung');
    expect(bez[0]).toHaveTextContent('Manufacture');
    expect(bez[1]).toHaveTextContent('Sewage systems');
    const einheit = screen.getAllByTestId('derived-einheit');
    expect(einheit[0]).toHaveTextContent('m³');
    expect(einheit[1]).toHaveTextContent('m');
    expect(screen.getAllByTestId('derived-kosten_calc')[0]).toHaveTextContent('1.250');
    const badge = screen.getAllByTestId('derived-badge-im_kg');
    expect(badge[0]).toHaveTextContent('ja');
    expect(badge[1]).toHaveTextContent('nein');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
    const picker = screen.getAllByRole('combobox', { name: 'Kostengruppe (Tab. 1)' })[0];
    expect(picker.querySelectorAll('option').length).toBeGreaterThanOrEqual(326);
    expect(picker.querySelectorAll('optgroup').length).toBe(50); // 1 first-level group + 8 first-level parents + the 41 second-level KGs that have printed children (52 − 11 childless: 110, 230, 610 … 690, 810 … 890)
    expect(evalEq('DIN-276-11-D1', 'kg3_positionen', KG3, storedRows(KG3_ID))).toMatchObject({ kind: 'computed', value: 1250 });
    expect(evalEq('DIN-276-11-D3', 'kg3_positionen', KG3, storedRows(KG3_ID))).toMatchObject({ kind: 'computed', value: 1 });
  });
});
