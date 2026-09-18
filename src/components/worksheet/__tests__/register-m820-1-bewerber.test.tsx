/**
 * Plan 3 Task 18 — the M820-18 `bewerber` register renders through the generic
 * RegisterEditor from its DATA config (no per-standard React): two Bewerber rows
 * with the Anh. F columns, the M820-18-D1 … D4 counts evaluate through the real
 * `evaluateFormula` over the same prepared rows, and ticking "zur Angebotsphase
 * zugelassen" / "Zuschlag" moves the counts. The Preis badge of the upgraded
 * award_criteria_list register is pinned in the same file (row badge test-id).
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/m820_1';
import { EQUATIONS } from '@/lib/eval/equations/m820_1';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'DWA-M-820-1';
const FIELD_ID = 'fixture-bewerber';
const cfgOf = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const CFG = cfgOf('M820-18', 'bewerber');

type Row = { id: string; name: string | null; formal_ok?: boolean; p123_ok?: boolean; p124_ok?: boolean; eignung_punkte?: number | null; rang?: number | null; shortlisted?: boolean; angebot_punkte?: number | null; final_offer?: boolean; winner?: boolean };
const TWO_ROWS: Row[] = [
  { id: 'r1', name: 'Ingenieurbüro A', formal_ok: true, p123_ok: true, p124_ok: true, eignung_punkte: 82, rang: 1, shortlisted: true, angebot_punkte: 90, final_offer: true, winner: true },
  { id: 'r2', name: 'Ingenieurbüro B', formal_ok: true, p123_ok: true, p124_ok: true, eignung_punkte: 75, rang: 2 },
];

function initStore(rows: Row[]) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', { [FIELD_ID]: { type: 'json', value: { rows } } }, {}, {}); });
}
function storedRows(): Row[] {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const evalTwin = (n: string, rows: unknown[], symbol = 'bewerber', cfg = CFG) => {
  const table = makeTableLookup(STD);
  const e = EQUATIONS.find((x) => x.equation_number === n)!;
  const reg = prepareRegisterRows({ rows }, cfg.columns, { table, tableRows: makeTableRows(STD), symbol: () => undefined }, {});
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { [symbol]: reg }, tableLookup: table });
};

beforeEach(() => initStore(TWO_ROWS));

describe('bewerber through the generic RegisterEditor (Plan 3 Task 18)', () => {
  it('renders two Bewerber rows with the Anh. F columns (name required, four booleans, points and rank), both complete, no override toggle', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="bewerber" config={CFG} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    const names = screen.getAllByLabelText('Name des Bewerbers / Bieters') as HTMLInputElement[];
    expect(names.map((n) => n.value)).toEqual(['Ingenieurbüro A', 'Ingenieurbüro B']);
    const shortlisted = screen.getAllByLabelText('zur Angebotsphase zugelassen') as HTMLInputElement[];
    expect(shortlisted.map((c) => c.checked)).toEqual([true, false]);
    const winner = screen.getAllByLabelText('Zuschlag') as HTMLInputElement[];
    expect(winner.map((c) => c.checked)).toEqual([true, false]);
    expect(screen.queryAllByRole('button', { name: 'abweichend wählen' })).toHaveLength(0); // no lookup column — no override affordance
    expect(screen.getByRole('button', { name: '+ Bewerber' })).toBeInTheDocument();
  });

  it('M820-18-D1 … D4 = 2 applicants / 1 shortlisted / 1 final offer / 1 winner through evaluateFormula; ticking the second row moves the counts', async () => {
    expect(evalTwin('M820-18-D1', storedRows())).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalTwin('M820-18-D2', storedRows())).toMatchObject({ kind: 'computed', value: 1 });
    expect(evalTwin('M820-18-D3', storedRows())).toMatchObject({ kind: 'computed', value: 1 });
    expect(evalTwin('M820-18-D4', storedRows())).toMatchObject({ kind: 'computed', value: 1 });
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="bewerber" config={CFG} standardCode={STD} />);
    await user.click(screen.getAllByLabelText('zur Angebotsphase zugelassen')[1]);
    await user.click(screen.getAllByLabelText('endgültiges Angebot abgegeben')[1]);
    expect(storedRows()[1].shortlisted).toBe(true);
    expect(storedRows()[1].final_offer).toBe(true);
    expect(evalTwin('M820-18-D2', storedRows())).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalTwin('M820-18-D3', storedRows())).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalTwin('M820-18-D4', storedRows())).toMatchObject({ kind: 'computed', value: 1 });
    // a third row without a name is incomplete and does not count
    await user.click(screen.getByRole('button', { name: '+ Bewerber' }));
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(evalTwin('M820-18-D1', storedRows())).toMatchObject({ kind: 'computed', value: 2 });
  });

  it('the upgraded award_criteria_list renders the Preis badge per row from the quoted-literal expr and keeps the Plan-1 keys', async () => {
    const AWARD_ID = 'fixture-award';
    const cfg = cfgOf('M820-14', 'award_criteria_list');
    act(() => { useWorksheetStore.getState().init('fixture-instance-2', { [AWARD_ID]: { type: 'json', value: { rows: [{ id: 'a1', kriterium: 'Schlüsselpersonal', gewichtung: 70 }, { id: 'a2', kriterium: 'Preis', gewichtung: 30 }] } } }, {}, {}); });
    render(<RegisterEditor fieldId={AWARD_ID} symbol="award_criteria_list" config={cfg} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getAllByTestId('derived-badge-ist_preis')).toHaveLength(1); // the '' label of a non-price row renders no badge
    expect(screen.getByTestId('derived-badge-ist_preis')).toHaveTextContent('Preiskriterium (E.2.8)');
    const v = useWorksheetStore.getState().values[AWARD_ID];
    const rows = v?.type === 'json' ? (v.value as { rows: unknown[] }).rows : [];
    expect(evalTwin('M820-14-D1', rows, 'award_criteria_list', cfg)).toMatchObject({ kind: 'computed', value: 100 });
    expect(evalTwin('M820-14-D2', rows, 'award_criteria_list', cfg)).toMatchObject({ kind: 'computed', value: 30 });
    expect(evalTwin('M820-14-D3', rows, 'award_criteria_list', cfg)).toMatchObject({ kind: 'computed', value: 1 });
  });
});
