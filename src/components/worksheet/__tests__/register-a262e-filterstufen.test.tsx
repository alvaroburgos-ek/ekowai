/**
 * Plan 3 Task 3 — the A262-10 `filterstufen` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): two
 * rows of different `filter_type` read their limits from the seeded
 * TABLE_LIMITS rows (three positional keys, the `sewer_key` badge mapping the
 * prod sewer token onto the printed Tr/M columns), the discriminator-driven
 * columns hide per row, `a_min_m2 = EZ · A_spez` is derived from the worksheet
 * scope, and A262-10-D1 / -D2 evaluate through the real `evaluateFormula`
 * over the same prepared rows (the Σ footer values).
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/a262e';
import { EQUATIONS } from '@/lib/eval/equations/a262e';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';
import type { Value } from '@/lib/expr';

const STD = 'DWA-A-262E';
const FIELD_ID = 'fixture-filterstufen';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'A262-10' && e.symbol === 'filterstufen')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const D1 = EQUATIONS.find((e) => e.equation_number === 'A262-10-D1')!;
const D2 = EQUATIONS.find((e) => e.equation_number === 'A262-10-D2')!;
const EZ = (s: string): Value | undefined => (s === 'EZ' ? 4 : undefined);

type Row = { id: string; label: string; stage_role: string; filter_type: string; system_size: string; sewer: string; area_m2: number | null; t_sicker_h?: number | null; l_rieselr_m?: number | null };
const TWO_ROWS: Row[] = [
  { id: 'r1', label: 'Hauptfilter', stage_role: 'main', filter_type: 'vf_sand_0_2', system_size: 'small_wwts', sewer: 'no_sewer', area_m2: 20 },                          // Tab. 4: ≥ 4 m²/P → 16 m²
  { id: 'r2', label: 'Filtergraben', stage_role: 'main', filter_type: 'two_layer_filter_trench', system_size: 'small_wwts', sewer: 'separate_sewer', area_m2: 10, l_rieselr_m: 30 }, // Tab. 8: ≥ 3 m²/P → 12 m²
];

function initStore(rows: Row[]) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', { [FIELD_ID]: { type: 'json', value: { rows } } }, {}, {}); });
}
function storedRows(): Row[] {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const evalD = (eq: typeof D1, rows: unknown[]) => {
  const table = makeTableLookup(STD);
  const reg = prepareRegisterRows({ rows }, CFG.columns, { table, tableRows: makeTableRows(STD), symbol: EZ }, {});
  return evaluateFormula({ equationId: eq.equation_number, formula: eq.formula, inputSymbols: eq.input_symbols, outputSymbol: eq.output_symbol, inputs: [], registers: { filterstufen: reg }, tableLookup: table });
};

beforeEach(() => initStore(TWO_ROWS));

describe('filterstufen through the generic RegisterEditor (Plan 3 Task 3)', () => {
  it('two rows of different filter_type: limits per row from TABLE_LIMITS, a_min_m2 = EZ · A_spez from the worksheet scope, discriminator-driven cells hidden per row', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="filterstufen" config={CFG} standardCode={STD} symbolLookup={EZ} />);
    const rows = screen.getAllByTestId('register-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    // Tab. 4 (sand, small) → A_spez 4 · EZ 4 = 16; Tab. 8 (trench, small) → 3 · 4 = 12
    expect(within(rows[0]).getByTestId('derived-a_spez_min')).toHaveTextContent('4');
    expect(within(rows[0]).getByTestId('derived-a_min_m2')).toHaveTextContent('16');
    expect(within(rows[1]).getByTestId('derived-a_spez_min')).toHaveTextContent('3');
    expect(within(rows[1]).getByTestId('derived-a_min_m2')).toHaveTextContent('12');
    // the sewer badge maps the prod token onto the printed Tr/M column (no_sewer → Tr)
    expect(within(rows[0]).getByTestId('derived-badge-sewer_key')).toHaveTextContent('Tr (separated)');
    expect(within(rows[0]).getByTestId('derived-badge-area_ok')).toHaveTextContent('erfüllt');
    // discriminator-driven columns: Σ L_Rieselr only on the trench row, t_Sicker only on municipal rows
    expect(within(rows[0]).getByTestId('cell-l_rieselr_m')).toBeEmptyDOMElement();
    expect(within(rows[1]).getByTestId('cell-l_rieselr_m')).not.toBeEmptyDOMElement();
    expect(within(rows[0]).getByTestId('cell-t_sicker_h')).toBeEmptyDOMElement();
    expect(within(rows[1]).getByTestId('cell-t_sicker_h')).toBeEmptyDOMElement();
    // the nine prod filter_type tokens are the options of the discriminator column
    const select = within(rows[0]).getByLabelText('Filtertyp') as HTMLSelectElement;
    expect([...select.options].map((o) => o.value).filter(Boolean)).toEqual([
      'vf_sand_0_2', 'two_stage_vf_gravel_sand', 'vf_coarse_sand_0_4', 'aerated_vf_gravel_8_16', 'vf_lava_sand_0_4', 'two_layer_filter_trench', 'aerated_hf_gravel_8_16', 'hf_coarse_sand_or_gravel_downstream', 'raw_wastewater_filter',
    ]);
  });

  it('changing the discriminator re-derives the limits and the hidden cells; a municipal row shows t_Sicker and its Tab. 10 minimum', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="filterstufen" config={CFG} standardCode={STD} symbolLookup={EZ} />);
    const rows = screen.getAllByTestId('register-row');
    await user.selectOptions(within(rows[0]).getByLabelText('Anlagengröße'), 'municipal_wwtp');
    expect(storedRows()[0].system_size).toBe('municipal_wwtp');
    const after = screen.getAllByTestId('register-row');
    expect(within(after[0]).getByTestId('cell-t_sicker_h')).not.toBeEmptyDOMElement();
    expect(within(after[0]).getByTestId('derived-t_sicker_min')).toHaveTextContent('6'); // Tab. 10 t_Sicker,min,aM ≥ 6
    expect(within(after[0]).getByTestId('derived-f_a_f_csb_max')).toHaveTextContent('20'); // Tab. 10 f_A,Fo,CSB ≤ 20
    expect(within(after[0]).getByTestId('derived-a_min_m2')).toHaveTextContent('16'); // still ≥ 4 m²/P
    await user.selectOptions(within(after[0]).getByLabelText('Filtertyp'), 'vf_coarse_sand_0_4');
    await user.selectOptions(screen.getAllByTestId('register-row')[0].querySelector('select[aria-label="Kanalsystem"]') as HTMLSelectElement, 'combined_sewer');
    const final = screen.getAllByTestId('register-row');
    expect(within(final[0]).getByTestId('derived-badge-sewer_key')).toHaveTextContent('M (combined)');
    expect(within(final[0]).getByTestId('derived-a_spez_min')).toHaveTextContent('1'); // Tab. 12 A_Fo,spez,M ≥ 1
    expect(within(final[0]).getByTestId('derived-a_min_m2')).toHaveTextContent('4');
  });

  it('A262-10-D1 Σ main areas = 30 and A262-10-D2 undersized count = 1 over the rows the editor renders; the footer names both engine symbols', async () => {
    expect(evalD(D1, storedRows())).toMatchObject({ kind: 'computed', value: 30 });
    expect(evalD(D2, storedRows())).toMatchObject({ kind: 'computed', value: 1 }); // trench 10 m² < 12 m²
    const user = userEvent.setup();
    const footerStates = {
      A_Fo_gesamt: { label: 'Σ A_Fo', unit: 'm²', state: evalD(D1, storedRows()) },
      filterstufen_area_fail: { label: 'unterschritten', unit: null, state: evalD(D2, storedRows()) },
    };
    render(<RegisterEditor fieldId={FIELD_ID} symbol="filterstufen" config={CFG} standardCode={STD} symbolLookup={EZ} footerStates={footerStates} />);
    expect(screen.getByTestId('footer-A_Fo_gesamt')).toHaveTextContent('30');
    expect(screen.getByTestId('footer-filterstufen_area_fail')).toHaveTextContent('1');
    await user.click(screen.getByRole('button', { name: '+ Filterstufe' }));
    expect(evalD(D1, storedRows())).toMatchObject({ kind: 'computed', value: 30 }); // incomplete third row does not count
  });
});
