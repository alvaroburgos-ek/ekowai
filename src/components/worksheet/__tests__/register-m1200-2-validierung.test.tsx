/**
 * Plan 3 Task 16 — the M12002-05 `validierungsproben` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): paired
 * rows compute LRV_i = log10(x_i / y_i) per row, the Tab.-3 target per organism
 * from the worksheet's class (symbolLookup), the "erreicht" badge (a
 * below-detection pair counts as reached), and the per-organism §3.3.3 counts /
 * verdict evaluate through the real `evaluateFormula` over the same rows.
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/m1200_2';
import { EQUATIONS } from '@/lib/eval/equations/m1200_2';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';
import type { Value } from '@/lib/expr';

const STD = 'DWA-M-1200-2';
const FIELD_ID = 'fixture-validierungsproben';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'M12002-05' && e.symbol === 'validierungsproben')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const eq = (sym: string) => EQUATIONS.find((e) => e.output_symbol === sym)!;
const klasse = (k: string) => (s: string): Value | undefined => (s === 'wassergueteklasse' ? k : undefined);

type Row = Record<string, unknown> & { id: string };
const ROWS: Row[] = [
  { id: 'r1', organismus: 'somatische_coliphagen', date: '2024-01-01', x_i: 8.4e5, y_i: 0.3 },                        // L1830 → LRV_1 = 6,45 (L1844)
  { id: 'r2', organismus: 'somatische_coliphagen', date: '2024-01-03', x_i: 7.2e5, y_i: 0.05, below_detection: true }, // L1832 y_3 < 0,05 → LRV_3 > 7,16 (L1846)
  { id: 'r3', organismus: 'e_coli', date: '2024-01-01', x_i: 1e6, y_i: 100 },                                          // LRV 4,0 < 5,0 (Tab. 3 E. coli ≥ 5,0)
];

function initStore(rows: Row[]) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', { [FIELD_ID]: { type: 'json', value: { rows } } }, {}, {}); });
}
function storedRows(): Row[] {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const evalEq = (sym: string, rows: unknown[], k: string) => {
  const table = makeTableLookup(STD);
  const e = eq(sym);
  const reg = prepareRegisterRows({ rows }, CFG.columns, { table, tableRows: makeTableRows(STD), symbol: klasse(k) }, {});
  const inputs = e.input_symbols.includes('wassergueteklasse') ? [{ symbol: 'wassergueteklasse', value: k, unit: null }] : [];
  return evaluateFormula({ equationId: e.equation_number, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs, registers: { validierungsproben: reg }, tableLookup: table });
};

beforeEach(() => initStore(ROWS));

describe('validierungsproben through the generic RegisterEditor (Plan 3 Task 16)', () => {
  it('three paired rows under class A: LRV_i per row, the Tab.-3 target per organism, the erreicht badge (below-detection pair counts), all complete', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="validierungsproben" config={CFG} standardCode={STD} symbolLookup={klasse('A')} />);
    const rows = screen.getAllByTestId('register-row');
    expect(rows).toHaveLength(3);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    expect(within(rows[0]).getByTestId('derived-lrv_i')).toHaveTextContent('6,4472');
    expect(within(rows[0]).getByTestId('derived-ziel')).toHaveTextContent('6');
    expect(within(rows[0]).getByTestId('derived-badge-erreicht')).toHaveTextContent('erreicht');
    expect(within(rows[1]).getByTestId('derived-lrv_i')).toHaveTextContent('7,1584');
    expect(within(rows[1]).getByTestId('derived-badge-erreicht')).toHaveTextContent('erreicht');
    expect(within(rows[2]).getByTestId('derived-lrv_i')).toHaveTextContent('4');
    expect(within(rows[2]).getByTestId('derived-ziel')).toHaveTextContent('5');
    expect(within(rows[2]).getByTestId('derived-badge-erreicht')).toHaveTextContent('nicht erreicht');
    expect(within(rows[2]).getByTestId('derived-shortfall')).toHaveTextContent('1');
    const select = within(rows[0]).getByLabelText('Indikatororganismus') as HTMLSelectElement;
    expect([...select.options].map((o) => o.value).filter(Boolean)).toEqual(['e_coli', 'somatische_coliphagen', 'f_spez_coliphagen', 'clostridium', 'sulfatreduzierer']);
  });

  it('under class B-2 the target column is empty (Tab. 3 prints "－") and the rows stay complete; switching the E. coli row to Clostridium re-targets it to 4,0 and it passes', async () => {
    const { unmount } = render(<RegisterEditor fieldId={FIELD_ID} symbol="validierungsproben" config={CFG} standardCode={STD} symbolLookup={klasse('B-2')} />);
    const b2 = screen.getAllByTestId('register-row');
    expect(within(b2[0]).getByTestId('derived-ziel')).toHaveTextContent('—');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    unmount();
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="validierungsproben" config={CFG} standardCode={STD} symbolLookup={klasse('A')} />);
    await user.selectOptions(within(screen.getAllByTestId('register-row')[2]).getByLabelText('Indikatororganismus'), 'clostridium');
    const after = screen.getAllByTestId('register-row')[2];
    expect(within(after).getByTestId('derived-ziel')).toHaveTextContent('4');
    expect(within(after).getByTestId('derived-badge-erreicht')).toHaveTextContent('erreicht');
    expect(storedRows()[2]).toMatchObject({ organismus: 'clostridium' });
  });

  it('the per-organism equations evaluate over the rows the editor renders: n / n_erreicht / max shortfall per organism, the §3.3.3 verdict, and the footer names the engine symbols', () => {
    expect(evalEq('n_somat_coliphagen', storedRows(), 'A')).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalEq('n_erreicht_somat_coliphagen', storedRows(), 'A')).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalEq('max_unterschreitung_ecoli', storedRows(), 'A')).toMatchObject({ kind: 'computed', value: 1 });
    expect(evalEq('validierung_ok_ecoli', storedRows(), 'A')).toMatchObject({ kind: 'computed', value: 0 }); // 1 of 16 pairs
    expect(evalEq('n_proben_validierung', storedRows(), 'A')).toMatchObject({ kind: 'computed', value: 3 });
    const footerStates = {
      n_proben_validierung: { label: 'Probenpaare', unit: null, state: evalEq('n_proben_validierung', storedRows(), 'A') },
      validierung_ok_ecoli: { label: 'E. coli bestanden', unit: null, state: evalEq('validierung_ok_ecoli', storedRows(), 'A') },
    };
    render(<RegisterEditor fieldId={FIELD_ID} symbol="validierungsproben" config={CFG} standardCode={STD} symbolLookup={klasse('A')} footerStates={footerStates} />);
    expect(screen.getByTestId('footer-n_proben_validierung')).toHaveTextContent('3');
    expect(screen.getByTestId('footer-validierung_ok_ecoli')).toHaveTextContent('0');
    expect(CFG.footer).toEqual(['n_proben_validierung', 'validierung_ok_ecoli', 'validierung_ok_somat_coliphagen', 'validierung_ok_fspez_coliphagen', 'validierung_ok_clostridium', 'validierung_ok_sulfatreduzierer']);
  });
});
