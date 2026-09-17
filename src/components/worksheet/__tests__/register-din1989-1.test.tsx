/**
 * Plan 3 Task 2 — the DIN-1989-1-04 `auffangflaechen` register renders through
 * the generic RegisterEditor from its DATA config (no per-standard React):
 * picking a Tab. 3 Art fills the read-only `e` cell from the seeded TAB3 row,
 * the TAB3 `anhaltswert` policy offers the override toggle, and the
 * DIN-1989-1-04-D1 sum evaluates through the real `evaluateFormula` over the
 * same prepared rows the editor renders (the Σ footer value).
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/din1989_1';
import { EQUATIONS } from '@/lib/eval/equations/din1989_1';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'DIN-1989-1';
const FIELD_ID = 'fixture-auffangflaechen';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'DIN-1989-1-04' && e.symbol === 'auffangflaechen')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const D1 = EQUATIONS.find((e) => e.equation_number === 'DIN-1989-1-04-D1')!;

type Row = { id: string; label: string; art: string | null; a_a: number | null; e?: number | null; e_override?: boolean };
const TWO_ROWS: Row[] = [
  { id: 'r1', label: 'Hauptdach', art: 'geneigtes_hartdach', a_a: 100 },
  { id: 'r2', label: 'Garage', art: 'flachdach_bekiest', a_a: 50 },
];

function initStore(rows: Row[]) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', { [FIELD_ID]: { type: 'json', value: { rows } } }, {}, {}); });
}
function storedRows(): Row[] {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const sumAE = (rows: unknown[]) => {
  const table = makeTableLookup(STD);
  const reg = prepareRegisterRows({ rows }, CFG.columns, { table, tableRows: makeTableRows(STD) }, { overrideFlagKey: CFG.override?.flag_key, overrideAppliesTo: CFG.override?.applies_to });
  return evaluateFormula({ equationId: 'DIN-1989-1-04-D1', formula: D1.formula, inputSymbols: D1.input_symbols, outputSymbol: D1.output_symbol, inputs: [], registers: { auffangflaechen: reg }, tableLookup: table });
};

beforeEach(() => initStore(TWO_ROWS));

describe('auffangflaechen through the generic RegisterEditor (Plan 3 Task 2)', () => {
  it('renders two rows with the Tab. 3 e cell filled per Art; the seven printed Tab. 3 rows are the options; anhaltswert ⇒ override toggle', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="auffangflaechen" config={CFG} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    const cells = screen.getAllByTestId('lookup-value-e');
    expect(cells[0]).toHaveTextContent('0,8');
    expect(cells[1]).toHaveTextContent('0,6');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(screen.getAllByRole('button', { name: 'abweichend wählen' }).length).toBeGreaterThan(0); // TAB3 override_policy anhaltswert
    const select = screen.getAllByLabelText('Art der Auffangfläche')[0] as HTMLSelectElement;
    expect([...select.options].map((o) => o.value).filter(Boolean)).toEqual([
      'geneigtes_hartdach', 'flachdach_unbekiest', 'flachdach_bekiest', 'gruendach_intensiv', 'gruendach_extensiv', 'pflasterflaeche', 'asphaltbelag',
    ]);
    // derived A_A·e per row
    const derived = screen.getAllByTestId('derived-a_e');
    expect(derived[0]).toHaveTextContent('80');
    expect(derived[1]).toHaveTextContent('30');
  });

  it('changing the Art re-fills e from the table row and stores the key', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="auffangflaechen" config={CFG} standardCode={STD} />);
    const selects = screen.getAllByLabelText('Art der Auffangfläche');
    await user.selectOptions(selects[0], 'gruendach_extensiv');
    expect(storedRows()[0].art).toBe('gruendach_extensiv');
    expect(storedRows()[0].e).toBe(0.5);
    expect(screen.getAllByTestId('lookup-value-e')[0]).toHaveTextContent('0,5');
    await user.selectOptions(selects[1], 'asphaltbelag');
    expect(storedRows()[1].e).toBe(0.8);
  });

  it('DIN-1989-1-04-D1 evaluates Σ A_A·e = 110 over the two rows through evaluateFormula; a third row counts once complete', async () => {
    expect(sumAE(storedRows())).toMatchObject({ kind: 'computed', value: 110 });
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="auffangflaechen" config={CFG} standardCode={STD} />);
    await user.click(screen.getByRole('button', { name: '+ Fläche' }));
    expect(sumAE(storedRows())).toMatchObject({ kind: 'computed', value: 110 }); // incomplete third row does not count
    await user.selectOptions(screen.getAllByLabelText('Art der Auffangfläche')[2], 'asphaltbelag');
    await user.type(screen.getAllByLabelText('Auffangfläche A_A')[2], '25');
    expect(sumAE(storedRows())).toMatchObject({ kind: 'computed', value: 130 }); // + 25 · 0,8
  });
});
