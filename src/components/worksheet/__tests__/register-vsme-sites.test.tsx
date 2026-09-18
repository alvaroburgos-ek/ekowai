/**
 * Plan 3 Task 24 — the VSME-B01.200 `sites` register renders through the generic
 * RegisterEditor from its DATA config (no per-standard React): two rows, the
 * conditional columns (area only on a row flagged in / near a biodiversity
 * sensitive area, water withdrawn only on a high water-stress row), the 256
 * country options from the prod enum, the required country / address columns,
 * and the three B01.200 equations reading the stored rows through the real
 * `evaluateFormula`. Ticking a flag reveals its column; a new row without
 * country / address is incomplete and never counts.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/vsme';
import { COUNTRY_TOKENS } from '@/lib/eval/field-configs/vsme-enums';
import { EQUATIONS } from '@/lib/eval/equations/vsme';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'VSME';
const SITES = parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((e) => e.worksheet === 'VSME-B01.200' && e.symbol === 'sites')!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const SITES_ID = 'fixture-vsme-sites';

type Row = Record<string, unknown> & { id: string };
const ROWS: Row[] = [
  { id: 's1', country: 'DE', gps: '51.33, 6.56', address: 'Oberstraße 3', postal_code: '47829', city: 'Krefeld', in_biodiversity_area: true, area_ha: 2.5, high_water_stress: true, water_withdrawn_m3: 100 },
  { id: 's2', country: 'ES', address: 'Calle Mayor 1', city: 'Madrid' },
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
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { sites: reg }, tableLookup: table });
};

beforeEach(() => initStore({ [SITES_ID]: { type: 'json', value: { rows: ROWS } } }));

describe('VSME sites through the generic RegisterEditor (Plan 3 Task 24)', () => {
  it('two rows: the flagged Krefeld site shows the area and water-withdrawn columns, the plain Madrid site neither; the country select carries the 256 prod tokens; D1 / D2 / D3 read 1 site / 2,5 ha / 100 m³', () => {
    render(<RegisterEditor fieldId={SITES_ID} symbol="sites" config={SITES} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(screen.getAllByLabelText('Area of the site in or near the biodiversity sensitive area in hectares')).toHaveLength(1);
    expect(screen.getAllByLabelText('Water withdrawn at this site in cubic metres')).toHaveLength(1);
    expect((screen.getAllByLabelText('Area of the site in or near the biodiversity sensitive area in hectares')[0] as HTMLInputElement).value).toBe('2.5');
    const countries = screen.getAllByLabelText('Country of site') as HTMLSelectElement[];
    expect(countries).toHaveLength(2);
    expect(countries[0].value).toBe('DE');
    expect(countries[1].value).toBe('ES');
    expect(countries[0].querySelectorAll('option[value]:not([value=""])')).toHaveLength(COUNTRY_TOKENS.length);
    expect(countries[0].querySelector('option[value="DE"]')).toHaveTextContent('Germany');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
    expect(screen.queryAllByRole('button', { name: 'abweichend wählen' })).toHaveLength(0); // no lookup column — no override affordance
    expect(evalOut('VSME-B01.200-D1', storedRows(SITES_ID))).toMatchObject({ kind: 'computed', value: 1 });
    expect(evalOut('VSME-B01.200-D2', storedRows(SITES_ID))).toMatchObject({ kind: 'computed', value: 2.5 });
    expect(evalOut('VSME-B01.200-D3', storedRows(SITES_ID))).toMatchObject({ kind: 'computed', value: 100 });
  });

  it('ticking "near biodiversity-sensitive area" on the Madrid row reveals its area column and D1 counts 2, D2 stays open until the area is typed (then 2,9 ha); a new row without country / address is incomplete and never counts', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={SITES_ID} symbol="sites" config={SITES} standardCode={STD} />);
    await user.click(screen.getAllByLabelText('Site located near a biodiversity sensitive area (B5 para 33)')[1]);
    expect(screen.getAllByLabelText('Area of the site in or near the biodiversity sensitive area in hectares')).toHaveLength(2);
    expect(evalOut('VSME-B01.200-D1', storedRows(SITES_ID))).toMatchObject({ kind: 'computed', value: 2 });
    const d2 = evalOut('VSME-B01.200-D2', storedRows(SITES_ID)); // a flagged site WITHOUT its area entered leaves the Σ open (manual_required) — never a silent 0 ha for a site Para 33 asks the area of
    expect(d2.kind).toBe('manual_required');
    expect(JSON.stringify(d2)).toMatch(/area_ha/);
    await user.type(screen.getAllByLabelText('Area of the site in or near the biodiversity sensitive area in hectares')[1], '0.4');
    expect(evalOut('VSME-B01.200-D2', storedRows(SITES_ID))).toMatchObject({ kind: 'computed', value: 2.9 });
    await user.click(screen.getByRole('button', { name: '+ site' }));
    expect(screen.getAllByTestId('register-row')).toHaveLength(3);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(evalOut('VSME-B01.200-D1', storedRows(SITES_ID))).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalOut('VSME-B01.200-D3', storedRows(SITES_ID))).toMatchObject({ kind: 'computed', value: 100 });
  });
});
