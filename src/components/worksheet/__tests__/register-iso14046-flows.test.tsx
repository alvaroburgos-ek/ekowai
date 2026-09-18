/**
 * Plan 3 Task 26 — the ISO-14046-03 `elementary_flows` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): an input row
 * shows the §5.3.2 a) – f) attributes and hides g) releases, an output row shows the
 * releases column (discriminator `direction` + row-scope `visible_when`); the
 * resource-type select offers the six prod tokens with prod's labels; the Σ / balance
 * equations read the stored rows (150 in / 50 out / 100 balance / count 2); switching
 * a row to output reveals its releases input and moves its quantity from Σ in to Σ out;
 * a new row without quantity / type is incomplete and never counts.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/iso14046';
import { EQUATIONS } from '@/lib/eval/equations/iso14046';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'ISO-14046';
const FLOWS = parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((e) => e.worksheet === 'ISO-14046-03' && e.symbol === 'elementary_flows')!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const FLOWS_ID = 'fixture-flows-14046';

type Row = Record<string, unknown> & { id: string };
const ROWS: Row[] = [
  { id: 'f1', unit_process: 'Bewässerung', direction: 'input', quantity_m3: 150, resource_type: 'groundwater', form_of_use: 'evaporation', location: 'Krefeld' },
  { id: 'f2', unit_process: 'Bewässerung', direction: 'output', quantity_m3: 50, resource_type: 'surface_water', releases: 'Nitrat' },
];

function initStore(values: Record<string, { type: 'json'; value: { rows: Row[] } }>) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', values, {}, {}); });
}
function storedRows(fieldId: string): Row[] {
  const v = useWorksheetStore.getState().values[fieldId];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const table = makeTableLookup(STD);
const prepared = (rows: unknown[]) => prepareRegisterRows({ rows }, FLOWS.columns, { table, tableRows: makeTableRows(STD), symbol: () => undefined });
const evalOut = (n: string, rows: unknown[]) => {
  const e = EQUATIONS.find((x) => x.equation_number === n)!;
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { elementary_flows: prepared(rows) }, tableLookup: table });
};
const RELEASES = 'Emissionen in die Luft oder Einleitungen in Wasser und Boden mit Wasserqualitätswirkung (§5.3.2 g, nur Ausgänge)';
const QUANTITY = 'Menge des Wasserflusses in m³ (§5.3.2 a)';
const DIRECTION = 'Eingang oder Ausgang (§5.3.2 a)';

beforeEach(() => initStore({ [FLOWS_ID]: { type: 'json', value: { rows: ROWS } } }));

describe('elementary_flows through the generic RegisterEditor (Plan 3 Task 26)', () => {
  it('an input row and an output row: the releases column only on the output row; the resource-type select carries the six prod tokens; D1 / D2 / D3 / D4 read 150 / 50 / 100 / 2', () => {
    render(<RegisterEditor fieldId={FLOWS_ID} symbol="elementary_flows" config={FLOWS} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(screen.getAllByLabelText(QUANTITY)).toHaveLength(2);
    expect(screen.getAllByLabelText('Wasserressourcentyp (§5.3.2 b)')).toHaveLength(2);
    expect(screen.getAllByLabelText('Form der Wassernutzung (§5.3.2 d)')).toHaveLength(2);
    expect(screen.getAllByLabelText(RELEASES)).toHaveLength(1); // output row only
    expect((screen.getByLabelText(RELEASES) as HTMLInputElement).value).toBe('Nitrat');
    const directions = screen.getAllByLabelText(DIRECTION) as HTMLSelectElement[];
    expect(directions.map((s) => s.value)).toEqual(['input', 'output']);
    const types = screen.getAllByLabelText('Wasserressourcentyp (§5.3.2 b)') as HTMLSelectElement[];
    expect(types.map((s) => s.value)).toEqual(['groundwater', 'surface_water']);
    expect(Array.from(types[0].options).map((o) => o.value).filter(Boolean)).toEqual(['rainwater', 'surface_water', 'seawater', 'brackish_water', 'groundwater', 'fossil_water']);
    expect(Array.from(types[0].options).map((o) => o.textContent)).toContain('Grundwasser');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
    expect(screen.queryAllByRole('button', { name: 'abweichend wählen' })).toHaveLength(0); // no lookup table — no override affordance
    expect(evalOut('ISO-14046-03-D1', storedRows(FLOWS_ID))).toMatchObject({ kind: 'computed', value: 150 });
    expect(evalOut('ISO-14046-03-D2', storedRows(FLOWS_ID))).toMatchObject({ kind: 'computed', value: 50 });
    expect(evalOut('ISO-14046-03-D3', storedRows(FLOWS_ID))).toMatchObject({ kind: 'computed', value: 100 });
    expect(evalOut('ISO-14046-03-D4', storedRows(FLOWS_ID))).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalOut('ISO-14046-03-D9', storedRows(FLOWS_ID))).toMatchObject({ kind: 'computed', value: 150 }); // groundwater
  });

  it('switching the input row to output reveals its releases input and moves 150 m³ from Σ in to Σ out (balance −200); a new row is incomplete (2/3) and never counts; picking input + typing a quantity + a type completes it', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FLOWS_ID} symbol="elementary_flows" config={FLOWS} standardCode={STD} />);
    await user.selectOptions(screen.getAllByLabelText(DIRECTION)[0], 'output');
    expect(screen.getAllByLabelText(RELEASES)).toHaveLength(2);
    expect(evalOut('ISO-14046-03-D1', storedRows(FLOWS_ID))).toMatchObject({ kind: 'computed', value: 0 });
    expect(evalOut('ISO-14046-03-D2', storedRows(FLOWS_ID))).toMatchObject({ kind: 'computed', value: 200 });
    expect(evalOut('ISO-14046-03-D3', storedRows(FLOWS_ID))).toMatchObject({ kind: 'computed', value: -200 });
    await user.click(screen.getByRole('button', { name: '+ Fluss' }));
    expect(screen.getAllByTestId('register-row')).toHaveLength(3);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(evalOut('ISO-14046-03-D4', storedRows(FLOWS_ID))).toMatchObject({ kind: 'computed', value: 2 });
    await user.type(screen.getAllByLabelText('Prozesseinheit (proceso unitario, §3.5.6)')[2], 'Reinigung');
    await user.selectOptions(screen.getAllByLabelText(DIRECTION)[2], 'input');
    expect(screen.getAllByLabelText(RELEASES)).toHaveLength(2); // the new input row shows no releases input
    await user.type(screen.getAllByLabelText(QUANTITY)[2], '30');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3'); // resource type still missing
    await user.selectOptions(screen.getAllByLabelText('Wasserressourcentyp (§5.3.2 b)')[2], 'rainwater');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    expect(evalOut('ISO-14046-03-D4', storedRows(FLOWS_ID))).toMatchObject({ kind: 'computed', value: 3 });
    expect(evalOut('ISO-14046-03-D1', storedRows(FLOWS_ID))).toMatchObject({ kind: 'computed', value: 30 });
    expect(evalOut('ISO-14046-03-D5', storedRows(FLOWS_ID))).toMatchObject({ kind: 'computed', value: 30 }); // rainwater
  });
});
