/**
 * Plan 3 Task 1 — the A138-05 `kf_test_sites` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): picking
 * a Tab. 11 method fills the read-only f_Methode cell from the seeded TAB11
 * row, and the A138-05-D1 minimum evaluates through the real `evaluateFormula`
 * over the same prepared rows the editor renders.
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/a138';
import { EQUATIONS } from '@/lib/eval/equations/a138';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'DWA-A-138-1';
const FIELD_ID = 'fixture-kf-test-sites';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'A138-05' && e.symbol === 'kf_test_sites')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const D1 = EQUATIONS.find((e) => e.equation_number === 'A138-05-D1')!;

type Row = { id: string; label: string; method: string | null; f_methode_row?: number | null; depth_m?: number | null; k_f_measured: number | null; date?: string | null };
const TWO_ROWS: Row[] = [
  { id: 'r1', label: 'Schurf Nord', method: 'feldversuch_grossflaechig', k_f_measured: 3e-5, depth_m: 1.0 },
  { id: 'r2', label: 'Schurf Süd', method: 'open_end_test', k_f_measured: 8e-6, depth_m: 1.4 },
];

function initStore(rows: Row[]) {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance', { [FIELD_ID]: { type: 'json', value: { rows } } }, {}, {});
  });
}
function storedRows(): Row[] {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const kfSitesMin = (rows: unknown[]) => {
  const table = makeTableLookup(STD);
  const reg = prepareRegisterRows({ rows }, CFG.columns, { table, tableRows: makeTableRows(STD) });
  return evaluateFormula({ equationId: 'A138-05-D1', formula: D1.formula, inputSymbols: D1.input_symbols, outputSymbol: D1.output_symbol, inputs: [], registers: { kf_test_sites: reg }, tableLookup: table });
};

beforeEach(() => initStore(TWO_ROWS));

describe('kf_test_sites through the generic RegisterEditor (Plan 3 Task 1)', () => {
  it('renders two rows with the TAB11 f_Methode cell filled per method; the table is locked (no override toggle)', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="kf_test_sites" config={CFG} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    const cells = screen.getAllByTestId('lookup-value-f_methode_row');
    expect(cells[0]).toHaveTextContent('1');
    expect(cells[1]).toHaveTextContent('0,8');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(screen.queryByRole('button', { name: 'abweichend wählen' })).toBeNull(); // TAB11 override_policy locked
    // the Tab. 11 rows are the select options (label_de), keyed by the seeded row keys
    const select = screen.getAllByLabelText('Verfahren (Tab. 11)')[0] as HTMLSelectElement;
    expect([...select.options].map((o) => o.value).filter(Boolean)).toEqual([
      'feldversuch_grossflaechig', 'feldversuch_kleine_testgrube', 'doppelzylinder_infiltrometer', 'open_end_test', 'labor_ungestoert', 'labor_gestoert_sieblinie',
    ]);
  });

  it('changing the method re-fills f_Methode from the table row and stores the key', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="kf_test_sites" config={CFG} standardCode={STD} />);
    const selects = screen.getAllByLabelText('Verfahren (Tab. 11)');
    await user.selectOptions(selects[0], 'labor_gestoert_sieblinie');
    expect(storedRows()[0].method).toBe('labor_gestoert_sieblinie');
    expect(storedRows()[0].f_methode_row).toBe(0.1);
    expect(screen.getAllByTestId('lookup-value-f_methode_row')[0]).toHaveTextContent('0,1');
    await user.selectOptions(selects[1], 'doppelzylinder_infiltrometer');
    expect(storedRows()[1].f_methode_row).toBe(0.9);
  });

  it('A138-05-D1 evaluates k_f_sites_min = min over the complete rows through evaluateFormula (the minimum governs, L1354)', async () => {
    const s = kfSitesMin(storedRows());
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') expect(s.value).toBe(8e-6);
    // a third row without k_f is incomplete and does not count; a lower complete value moves the minimum
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="kf_test_sites" config={CFG} standardCode={STD} />);
    await user.click(screen.getByRole('button', { name: '+ Standort' }));
    expect(kfSitesMin(storedRows())).toMatchObject({ kind: 'computed', value: 8e-6 });
    const kfInputs = screen.getAllByLabelText('k_f gemessen');
    await user.type(kfInputs[2], '0.000002');
    await user.selectOptions(screen.getAllByLabelText('Verfahren (Tab. 11)')[2], 'open_end_test');
    await user.type(screen.getAllByLabelText('Standort')[2], 'S3');
    expect(kfSitesMin(storedRows())).toMatchObject({ kind: 'computed', value: 2e-6 });
  });
});
