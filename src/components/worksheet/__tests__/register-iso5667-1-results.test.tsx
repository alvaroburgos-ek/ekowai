/**
 * Plan 3 Task 28 — the ISO-5667-1-05 `sites_1` register renders through the generic RegisterEditor
 * from its DATA config (no per-standard React): a GROUNDWATER row shows the §9.6.2 columns (purge +
 * depth) and hides the stormwater one, a STORMWATER row the reverse (discriminator column + row-scope
 * visible_when); switching a row to sludge reveals the §12.1.2 diameter and its badge, which reads the
 * SEEDED 50 mm and flips when a smaller diameter is typed; ISO-5667-1-05-D1 counts the rows through
 * the real `evaluateFormula`; the `kennung` column is required (a new row is incomplete).
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/iso5667_1';
import { EQUATIONS } from '@/lib/eval/equations/iso5667_1';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'ISO-5667-1';
const SITES = parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((e) => e.worksheet === 'ISO-5667-1-05' && e.symbol === 'sites_1')!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const SITES_ID = 'fixture-sites-1';

type Row = Record<string, unknown> & { id: string };
const ROWS: Row[] = [
  { id: 's1', kennung: 'GW-1', situation_type: 'groundwater', location_identified: true, well_purged: true, depth_below_ground_m: 12.5, weather: 'trocken' },
  { id: 's2', kennung: 'SW-1', situation_type: 'stormwater', location_identified: true, flow_proportional: true, weather: 'Starkregen' },
];

function initStore(values: Record<string, { type: 'json'; value: { rows: Row[] } }>) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', values, {}, {}); });
}
function storedRows(fieldId: string): Row[] {
  const v = useWorksheetStore.getState().values[fieldId];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const evalOut = (n: string, rows: unknown[]) => {
  const table = makeTableLookup(STD);
  const e = EQUATIONS.find((x) => x.equation_number === n)!;
  const reg = prepareRegisterRows({ rows }, SITES.columns, { table, tableRows: makeTableRows(STD), symbol: () => undefined });
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { sites_1: reg }, tableLookup: table });
};

beforeEach(() => initStore({ [SITES_ID]: { type: 'json', value: { rows: ROWS } } }));

describe('sites_1 through the generic RegisterEditor (Plan 3 Task 28)', () => {
  it('a groundwater row shows the §9.6.2 columns and hides the §13 one; a stormwater row the reverse; the sludge columns appear on neither; D1 counts 2', () => {
    render(<RegisterEditor fieldId={SITES_ID} symbol="sites_1" config={SITES} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    // §9.6.2 columns exist once (on the groundwater row)
    expect(screen.getAllByLabelText('Brunnen vor der Probenahme abgepumpt (§9.6.2)')).toHaveLength(1);
    expect(screen.getAllByLabelText('Entnahmetiefe unter Geländeoberkante in m (§9.6.2)')).toHaveLength(1);
    // §13 column once (on the stormwater row)
    expect(screen.getAllByLabelText('Durchflussproportionale Probenahme vorgesehen (§13)')).toHaveLength(1);
    // situation-specific columns of the OTHER situations are on neither row
    expect(screen.queryByLabelText('Durchmesser der Schlamm-Probenahmeleitung in mm (§12.1.2)')).toBeNull();
    expect(screen.queryByLabelText('Kühlsystemtyp nach §10.2.4')).toBeNull();
    expect(screen.queryByLabelText('Inspektionsschacht so ausgebildet, dass ohne Einstieg beprobt werden kann (§11.1)')).toBeNull();
    expect(screen.queryByLabelText('Probenahme ober- und unterstrom der Einleitung (§9.3.2)')).toBeNull();
    expect(screen.queryAllByTestId('derived-badge-sludge_pipe_ok')).toHaveLength(0);
    // the discriminator carries the printed situation labels
    const discriminators = screen.getAllByLabelText('Gewässersituationstyp der Probenahmestelle') as HTMLSelectElement[];
    expect(discriminators[0].value).toBe('groundwater');
    expect(discriminators[1].value).toBe('stormwater');
    expect((screen.getAllByLabelText('Entnahmetiefe unter Geländeoberkante in m (§9.6.2)')[0] as HTMLInputElement).value).toBe('12.5');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
    expect(evalOut('ISO-5667-1-05-D1', storedRows(SITES_ID))).toMatchObject({ kind: 'computed', value: 2 });
  });

  it('switching the stormwater row to Klärschlamm reveals the §12.1.2 diameter and its badge; 80 mm passes the seeded 50 mm, 40 mm fails; a new row without Kennung is incomplete and never counts', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={SITES_ID} symbol="sites_1" config={SITES} standardCode={STD} />);
    await user.selectOptions(screen.getAllByLabelText('Gewässersituationstyp der Probenahmestelle')[1], 'wastewater_sludge');
    expect(screen.queryByLabelText('Durchflussproportionale Probenahme vorgesehen (§13)')).toBeNull();
    const dn = screen.getAllByLabelText('Durchmesser der Schlamm-Probenahmeleitung in mm (§12.1.2)');
    expect(dn).toHaveLength(1);
    await user.type(dn[0], '80');
    expect(screen.getByTestId('derived-badge-sludge_pipe_ok')).toHaveTextContent('§12.1.2 ≥ 50 mm erfüllt');
    await user.clear(screen.getAllByLabelText('Durchmesser der Schlamm-Probenahmeleitung in mm (§12.1.2)')[0]);
    await user.type(screen.getAllByLabelText('Durchmesser der Schlamm-Probenahmeleitung in mm (§12.1.2)')[0], '40');
    expect(screen.getByTestId('derived-badge-sludge_pipe_ok')).toHaveTextContent('§12.1.2 unter 50 mm oder nicht eingetragen');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();

    await user.click(screen.getByRole('button', { name: '+ Probenahmestelle' }));
    expect(screen.getAllByTestId('register-row')).toHaveLength(3);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(evalOut('ISO-5667-1-05-D1', storedRows(SITES_ID))).toMatchObject({ kind: 'computed', value: 2 });
    await user.type(screen.getAllByLabelText('Kennung der Probenahmestelle')[2], 'CE-1');
    await user.selectOptions(screen.getAllByLabelText('Gewässersituationstyp der Probenahmestelle')[2], 'commercial_effluent');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    // the §11.1 column belongs to the commercial-effluent row only
    expect(screen.getAllByLabelText('Inspektionsschacht so ausgebildet, dass ohne Einstieg beprobt werden kann (§11.1)')).toHaveLength(1);
    expect(evalOut('ISO-5667-1-05-D1', storedRows(SITES_ID))).toMatchObject({ kind: 'computed', value: 3 });
  });
});
