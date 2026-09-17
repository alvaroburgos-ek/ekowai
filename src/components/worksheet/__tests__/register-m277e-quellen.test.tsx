/**
 * Plan 3 Task 4 — the M277E-06 `grauwasserquellen` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): two
 * rows of different `source` read their Tab.-2 range from the seeded TABLE2
 * rows (lookup_key / lookup_value pair), the in-range badge follows the
 * engineer's pick, Q_GW,i is derived per row, and M277E-06-D1 / -D2 evaluate
 * through the real `evaluateFormula` over the same rows (the Σ / type-code
 * footer values — the §9.3 worked example A1 = 1,375 l/d).
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/m277e';
import { EQUATIONS } from '@/lib/eval/equations/m277e';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'DWA-M-277E';
const FIELD_ID = 'fixture-grauwasserquellen';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'M277E-06' && e.symbol === 'grauwasserquellen')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const D1 = EQUATIONS.find((e) => e.equation_number === 'M277E-06-D1')!;
const D2 = EQUATIONS.find((e) => e.equation_number === 'M277E-06-D2')!;

type Row = { id: string; source: string; persons: number | null; q_gw_p: number | null };
const TWO_ROWS: Row[] = [
  { id: 'r1', source: 'shower', persons: 25, q_gw_p: 40 },  // L692: 25 P · 40 l/(P·d) shower — Tab. 2 range 10-50
  { id: 'r2', source: 'bathtub', persons: 25, q_gw_p: 15 }, // L692: 25 P · 15 l/(P·d) bathtub — Tab. 2 range 0-30
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
  const reg = prepareRegisterRows({ rows }, CFG.columns, { table, tableRows: makeTableRows(STD) }, {});
  return evaluateFormula({ equationId: eq.equation_number, formula: eq.formula, inputSymbols: eq.input_symbols, outputSymbol: eq.output_symbol, inputs: [], registers: { grauwasserquellen: reg }, tableLookup: table });
};

beforeEach(() => initStore(TWO_ROWS));

describe('grauwasserquellen through the generic RegisterEditor (Plan 3 Task 4)', () => {
  it('two rows: Tab.-2 min/max filled per source, in-range badge, Q_GW,i derived; the six source tokens are the lookup_key options', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="grauwasserquellen" config={CFG} standardCode={STD} />);
    const rows = screen.getAllByTestId('register-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(within(rows[0]).getByTestId('lookup-value-q_min')).toHaveTextContent('10');
    expect(within(rows[0]).getByTestId('lookup-value-q_max')).toHaveTextContent('50');
    expect(within(rows[1]).getByTestId('lookup-value-q_min')).toHaveTextContent('0');
    expect(within(rows[1]).getByTestId('lookup-value-q_max')).toHaveTextContent('30');
    expect(within(rows[0]).getByTestId('derived-badge-in_range')).toHaveTextContent('im Bereich Tab. 2');
    expect(within(rows[0]).getByTestId('derived-q_row')).toHaveTextContent('1.000'); // de-DE thousands separator
    expect(within(rows[1]).getByTestId('derived-q_row')).toHaveTextContent('375');
    const select = within(rows[0]).getByLabelText('Quelle') as HTMLSelectElement;
    expect([...select.options].map((o) => o.value).filter(Boolean)).toEqual(['shower', 'bathtub', 'hand_washbasin', 'washing_machine', 'kitchen_sink', 'dishwasher']);
  });

  it('a pick outside the printed range is flagged, never blocked; changing the source re-fills the range', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="grauwasserquellen" config={CFG} standardCode={STD} />);
    const rows = screen.getAllByTestId('register-row');
    const pick = within(rows[0]).getByLabelText('gewählter spezifischer Grauwasseranfall') as HTMLInputElement;
    await user.clear(pick);
    await user.type(pick, '60');
    expect(storedRows()[0].q_gw_p).toBe(60);
    expect(within(screen.getAllByTestId('register-row')[0]).getByTestId('derived-badge-in_range')).toHaveTextContent('außerhalb Tab. 2');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    await user.selectOptions(within(screen.getAllByTestId('register-row')[1]).getByLabelText('Quelle'), 'kitchen_sink');
    const after = screen.getAllByTestId('register-row');
    expect(within(after[1]).getByTestId('lookup-value-q_min')).toHaveTextContent('5');
    expect(within(after[1]).getByTestId('lookup-value-q_max')).toHaveTextContent('10');
    expect(storedRows()[1].source).toBe('kitchen_sink');
  });

  it('M277E-06-D2 Σ Q_GW = 1,375 l/d and M277E-06-D1 type code 1 (A1) over the rows the editor renders; the footer names both engine symbols', async () => {
    expect(evalD(D2, storedRows())).toMatchObject({ kind: 'computed', value: 1375 });
    expect(evalD(D1, storedRows())).toMatchObject({ kind: 'computed', value: 1 });
    const user = userEvent.setup();
    const footerStates = {
      Q_GW_rows: { label: 'Σ Q_GW', unit: 'l/d', state: evalD(D2, storedRows()) },
      greywater_type_code: { label: 'Typ-Code', unit: null, state: evalD(D1, storedRows()) },
    };
    render(<RegisterEditor fieldId={FIELD_ID} symbol="grauwasserquellen" config={CFG} standardCode={STD} footerStates={footerStates} />);
    expect(screen.getByTestId('footer-Q_GW_rows')).toHaveTextContent('1.375'); // de-DE rendering of 1,375 l/d (L693)
    expect(screen.getByTestId('footer-greywater_type_code')).toHaveTextContent('1');
    await user.click(screen.getByRole('button', { name: '+ Quelle' }));
    expect(evalD(D2, storedRows())).toMatchObject({ kind: 'computed', value: 1375 }); // the incomplete third row does not count
  });
});
