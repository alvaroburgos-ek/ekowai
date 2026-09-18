/**
 * Plan 3 Task 9 — the M8203-07 `qe52_items` register (Anhang A.1, QE 5.2)
 * renders through the generic RegisterEditor from its DATA config (no
 * per-standard React): two rows picked from the seeded QE_A1 catalogue show
 * the printed `kriterium` / `hinweise` cells filled from the `nr` key
 * (lookup_key / lookup_value pair — no override toggle, the rows are picked,
 * never rewritten), the rating select carries the four Y / P / N / NA
 * options, changing `nr` re-fills the printed text, and the M8203-07 count /
 * share equations evaluate through the real `evaluateFormula` over the same
 * rows into the footer. The B.2 split register (M8203-12) shows the `in_teil`
 * badge and groups the select by the printed Leistungsphase headings.
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/m820_3';
import { EQUATIONS } from '@/lib/eval/equations/m820_3';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'DWA-M-820-3';
const FIELD_ID = 'fixture-qe52-items';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'M8203-07' && e.symbol === 'qe52_items')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const entry12 = FIELD_CONFIGS.find((e) => e.worksheet === 'M8203-12' && e.symbol === 'qe63a_items')!;
const CFG12 = parseFieldConfig({ widget: 'register', uiConfig: entry12.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const D1 = EQUATIONS.find((e) => e.equation_number === 'M8203-07-D1')!;
const D5 = EQUATIONS.find((e) => e.equation_number === 'M8203-07-D5')!;
const D6 = EQUATIONS.find((e) => e.equation_number === 'M8203-07-D6')!;

type Row = Record<string, unknown> & { id: string };
const TWO_ROWS: Row[] = [
  { id: 'r1', nr: 'n1', rating: 'y', evidence: 'Zielsetzung im Konzeptbericht §1' }, // L689 "Ist-Zustand und Zielsetzung formulieren"
  { id: 'r2', nr: 'n8', rating: 'p' },                                                // L696 "Bearbeitungstiefe" — empty Hinweise cell printed
];

function initStore(rows: Row[]) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', { [FIELD_ID]: { type: 'json', value: { rows } } }, {}, {}); });
}
function storedRows(): Row[] {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const evalD = (eq: typeof D1, rows: unknown[], scalars: Array<{ symbol: string; value: number }> = []) => {
  const table = makeTableLookup(STD);
  const reg = prepareRegisterRows({ rows }, CFG.columns, { table, tableRows: makeTableRows(STD) });
  return evaluateFormula({ equationId: eq.equation_number, formula: eq.formula, inputSymbols: eq.input_symbols, outputSymbol: eq.output_symbol, inputs: scalars.map((s) => ({ symbol: s.symbol, value: s.value, unit: null })) as never, registers: { qe52_items: reg }, tableLookup: table });
};

beforeEach(() => initStore(TWO_ROWS));

describe('qe52_items (Anhang A.1) through the generic RegisterEditor (Plan 3 Task 9)', () => {
  it('two rows: kriterium / hinweise fill from the picked Nr. (QE_A1 rows L689 / L696); the Nr. select lists the 15 printed items; rating offers Y / P / N / NA; no override toggle', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="qe52_items" config={CFG} standardCode={STD} />);
    const rows = screen.getAllByTestId('register-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(within(rows[0]).getByTestId('lookup-value-kriterium')).toHaveTextContent('Ist-Zustand und Zielsetzung formulieren');
    expect(within(rows[0]).getByTestId('lookup-value-hinweise')).toHaveTextContent('Aussagen zu Technik, Ökonomie, Ökologie und Termine');
    expect(within(rows[1]).getByTestId('lookup-value-kriterium')).toHaveTextContent('Bearbeitungstiefe');
    const nr = within(rows[0]).getByLabelText('Kriterium aus A. 1 QE 5.2: Bedarfsplanung Konzept wählen') as HTMLSelectElement;
    expect([...nr.options].map((o) => o.value).filter(Boolean)).toEqual([...Array(15)].map((_, i) => `n${i + 1}`));
    expect([...nr.options].find((o) => o.value === 'n15')?.textContent).toBe('15 · Anwendung DIN 18205'); // L709
    const rating = within(rows[0]).getByLabelText('Bewertung') as HTMLSelectElement;
    expect([...rating.options].map((o) => o.value).filter(Boolean)).toEqual(['y', 'p', 'n', 'na']);
    expect(rating).toHaveValue('y');
    expect(screen.queryByRole('button', { name: /abweichend/ })).toBeNull();
  });

  it('changing the Nr. re-fills the printed text (n8 → n15 "Anwendung DIN 18205" / "Checklisten"); the stored row keeps only its key + inputs', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="qe52_items" config={CFG} standardCode={STD} />);
    await user.selectOptions(within(screen.getAllByTestId('register-row')[1]).getByLabelText('Kriterium aus A. 1 QE 5.2: Bedarfsplanung Konzept wählen'), 'n15');
    const after = screen.getAllByTestId('register-row');
    expect(within(after[1]).getByTestId('lookup-value-kriterium')).toHaveTextContent('Anwendung DIN 18205');
    expect(within(after[1]).getByTestId('lookup-value-hinweise')).toHaveTextContent('Checklisten');
    expect(storedRows()[1].nr).toBe('n15');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
  });

  it('M8203-07-D1 / -D5 / -D6 over the rows the editor renders (1 Y, 2 rated, 6.67 % of 15) into the footer; a new empty row does not count', async () => {
    expect(evalD(D1, storedRows())).toMatchObject({ kind: 'computed', value: 1 });
    expect(evalD(D5, storedRows())).toMatchObject({ kind: 'computed', value: 2 });
    const share = evalD(D6, storedRows(), [{ symbol: 'qe52_items_total', value: 15 }]);
    expect(share.kind).toBe('computed');
    expect(share.kind === 'computed' ? share.value : NaN).toBeCloseTo(6.667, 3);
    const user = userEvent.setup();
    const footerStates = {
      qe52_items_rated: { label: 'bewertete Kriterien', unit: null, state: evalD(D5, storedRows()) },
      qe52_items_y_calc: { label: 'Y', unit: null, state: evalD(D1, storedRows()) },
      qe52_share_y_pct: { label: 'Anteil Y', unit: '%', state: share },
    };
    render(<RegisterEditor fieldId={FIELD_ID} symbol="qe52_items" config={CFG} standardCode={STD} footerStates={footerStates} />);
    expect(screen.getByTestId('footer-qe52_items_rated')).toHaveTextContent('2');
    expect(screen.getByTestId('footer-qe52_items_y_calc')).toHaveTextContent('1');
    expect(screen.getByTestId('footer-qe52_share_y_pct')).toHaveTextContent('6,6667'); // de-DE, four decimals (the footer formatter)
    await user.click(screen.getByRole('button', { name: '+ Kriterium' }));
    expect(storedRows()).toHaveLength(3);
    expect(evalD(D5, storedRows())).toMatchObject({ kind: 'computed', value: 2 });
  });

  it('M8203-12 (B.2 Teil 1): the Nr. select is grouped by the printed Leistungsphase headings and a Nr.-22 row carries the "außerhalb" badge', () => {
    act(() => { useWorksheetStore.getState().init('fixture-instance-12', { 'fixture-qe63a': { type: 'json', value: { rows: [{ id: 'a', nr: 'n1', rating: 'y' }, { id: 'b', nr: 'n22', rating: 'y' }] } } }, {}, {}); });
    render(<RegisterEditor fieldId="fixture-qe63a" symbol="qe63a_items" config={CFG12} standardCode={STD} />);
    const rows = screen.getAllByTestId('register-row');
    const nr = within(rows[0]).getByLabelText('Kriterium aus B. 2 QE 6.3: Planung wählen') as HTMLSelectElement;
    expect([...nr.querySelectorAll('optgroup')].map((g) => g.label)).toEqual(['Grundlagenermittlung', 'Vorplanung', 'Entwurfsplanung', 'Genehmigungsplanung (inkl. Genehmigungsverfahren)']);
    expect([...nr.options].map((o) => o.value).filter(Boolean)).toHaveLength(40);
    expect(within(rows[0]).getByTestId('derived-badge-in_teil')).toHaveTextContent('gehört zu Teil 1 (Nr. 1–21)');
    expect(within(rows[1]).getByTestId('derived-badge-in_teil')).toHaveTextContent('außerhalb Teil 1 (Nr. 1–21)');
    expect(within(rows[1]).getByTestId('lookup-value-kriterium')).toHaveTextContent('Schnittstelle zwischen EMSR, Automatisie-rungs- und Maschinentechnik geklärt'); // L833
  });
});
