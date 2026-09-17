/**
 * Plan 3 Task 5 — the M12001-07 `risiko_zeilen` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): two
 * rows (D × 4 = Hoch, A × 1 = Sehr niedrig) read their Ausgangsrisiko from the
 * seeded TAB23 rows per row, the Vorsorgemaßnahmen / Restrisiko cells are
 * hidden below "moderat" (row-scope visible_when on the derived code), the
 * Schutzgut lookup_key lists the nine Tab.-18 codes, and M12001-07-D1 / -D2
 * evaluate through the real `evaluateFormula` over the same rows.
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/m1200_1';
import { EQUATIONS } from '@/lib/eval/equations/m1200_1';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'DWA-M-1200-1';
const FIELD_ID = 'fixture-risiko-zeilen';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'M12001-07' && e.symbol === 'risiko_zeilen')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const D1 = EQUATIONS.find((e) => e.equation_number === 'M12001-07-D1')!;
const D2 = EQUATIONS.find((e) => e.equation_number === 'M12001-07-D2')!;

type Row = Record<string, unknown> & { id: string };
const TWO_ROWS: Row[] = [
  { id: 'r1', gefahr: 'mikrobiologisch', schutzgut: 'M-1', exposition: 'hoch', schadensausmass: '4', wahrscheinlichkeit: 'D', massnahmen: 'Filtration + Desinfektion', rest_schaden: '2', rest_wahrsch: 'B' }, // L2055: D × 4 → Hoch; residual B × 2 → Niedrig
  { id: 'r2', gefahr: 'salze', schutzgut: 'B', exposition: 'hoch', schadensausmass: '1', wahrscheinlichkeit: 'A' },                                                                                        // L2052: A × 1 → Sehr niedrig
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
  return evaluateFormula({ equationId: eq.equation_number, formula: eq.formula, inputSymbols: eq.input_symbols, outputSymbol: eq.output_symbol, inputs: [], registers: { risiko_zeilen: reg }, tableLookup: table });
};

beforeEach(() => initStore(TWO_ROWS));

describe('risiko_zeilen through the generic RegisterEditor (Plan 3 Task 5)', () => {
  it('two rows: Ausgangsrisiko filled from TAB23 per row, the Tab.-18 exposure path per Schutzgut, Vorsorgemaßnahmen hidden below moderat', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="risiko_zeilen" config={CFG} standardCode={STD} />);
    const rows = screen.getAllByTestId('register-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(within(rows[0]).getByTestId('derived-ausgangsrisiko')).toHaveTextContent('Hoch');
    expect(within(rows[0]).getByTestId('derived-badge-ausgangsrisiko_code')).toHaveTextContent('Hoch');
    expect(within(rows[0]).getByTestId('derived-badge-restrisiko_code')).toHaveTextContent('Niedrig');
    expect(within(rows[1]).getByTestId('derived-ausgangsrisiko')).toHaveTextContent('Sehr niedrig');
    expect(within(rows[1]).getByTestId('derived-badge-restrisiko_code')).toHaveTextContent('Sehr niedrig');
    expect(within(rows[0]).getByTestId('lookup-value-expositionsweg')).toHaveTextContent('Wasser - PflanzeMensch'); // TAB18 M-1 (L1891)
    expect(within(rows[1]).getByTestId('lookup-value-expositionsweg')).toHaveTextContent('Wasser - Boden');        // TAB18 B (L1894)
    // the second assessment is visible on the Hoch row only
    expect(within(rows[0]).queryByLabelText('Vorsorgemaßnahmen')).not.toBeNull();
    expect(within(rows[1]).queryByLabelText('Vorsorgemaßnahmen')).toBeNull();
    expect(within(rows[1]).queryByLabelText('Restrisiko: Schadensmaß')).toBeNull();
    const select = within(rows[0]).getByLabelText('Schutzgut (Tab. 18)') as HTMLSelectElement;
    expect([...select.options].map((o) => o.value).filter(Boolean)).toEqual(['M-1', 'M-2', 'M-3', 'B', 'N', 'K', 'G', 'O', 'S']);
  });

  it('raising the severity of the low row to 3 (C × 3 = Moderat) reveals the measures and makes the row incomplete until they are entered', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="risiko_zeilen" config={CFG} standardCode={STD} />);
    const low = screen.getAllByTestId('register-row')[1];
    await user.selectOptions(within(low).getByLabelText('Wahrscheinlichkeit (Tab. 21)'), 'C');
    await user.selectOptions(within(low).getByLabelText('Schadensausmaß (Tab. 22)'), '3');
    const after = screen.getAllByTestId('register-row')[1];
    expect(within(after).getByTestId('derived-badge-ausgangsrisiko_code')).toHaveTextContent('Moderat'); // L2054
    expect(within(after).queryByLabelText('Vorsorgemaßnahmen')).not.toBeNull();
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('1/2');
    expect(storedRows()[1]).toMatchObject({ wahrscheinlichkeit: 'C', schadensausmass: '3' });
  });

  it('M12001-07-D2 max Ausgangsrisiko = 4 and M12001-07-D1 max Restrisiko = 2 over the rows the editor renders; the footer names both engine symbols', () => {
    expect(evalD(D2, storedRows())).toMatchObject({ kind: 'computed', value: 4 });
    expect(evalD(D1, storedRows())).toMatchObject({ kind: 'computed', value: 2 });
    const footerStates = {
      ausgangsrisiko_max_code: { label: 'max. Ausgangsrisiko', unit: null, state: evalD(D2, storedRows()) },
      restrisiko_max_code: { label: 'max. Restrisiko', unit: null, state: evalD(D1, storedRows()) },
    };
    render(<RegisterEditor fieldId={FIELD_ID} symbol="risiko_zeilen" config={CFG} standardCode={STD} footerStates={footerStates} />);
    expect(screen.getByTestId('footer-ausgangsrisiko_max_code')).toHaveTextContent('4');
    expect(screen.getByTestId('footer-restrisiko_max_code')).toHaveTextContent('2');
  });
});
