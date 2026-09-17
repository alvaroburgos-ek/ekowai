/**
 * Plan 3 Task 6 — the M12003-06 `schlaege` register renders through the generic
 * RegisterEditor from its DATA config (no per-standard React): two rows
 * (sprinkler Tab. 7 vs drip), the sprinkler-only cells (Sprinklergruppe,
 * Wurfweite, Spritzschutz, Abstand vorhanden) are hidden on the drip row,
 * `faktor` / `min_abstand_m` derive per row from the seeded TAB789 on the
 * inherited class (the printed example L922: class D, 25 m, no shield → 50 m),
 * and M12003-06-D1 / -D2 evaluate through the real `evaluateFormula` over the
 * same rows.
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/m1200_3';
import { EQUATIONS } from '@/lib/eval/equations/m1200_3';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';
import type { Value } from '@/lib/expr';

const STD = 'DWA-M-1200-3';
const FIELD_ID = 'fixture-schlaege';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'M12003-06' && e.symbol === 'schlaege')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const D1 = EQUATIONS.find((e) => e.equation_number === 'M12003-06-D1')!;
const D2 = EQUATIONS.find((e) => e.equation_number === 'M12003-06-D2')!;
const classD = (s: string): Value | undefined => (s === 'gueteklasse' ? 'D' : undefined);

type Row = Record<string, unknown> & { id: string };
const TWO_ROWS: Row[] = [
  { id: 'r1', schlag_nr: '3001-1', feldblock: 'DEXXYY-2222-22244', flaeche_ha: 20, kultur: 'Kartoffeln', pflanzentyp: 'salzunempfindlich', technik: 'beregnung_sprinkler', sprinkler_gruppe: 't7', wurfweite_m: 25, spritzschutz: false, abstand_ist_m: 40 }, // L922: Regnerkanone, 25 m, Klasse D, kein Spritzschutz → 50 m
  { id: 'r2', schlag_nr: '3001-2', flaeche_ha: 5, kultur: 'Hopfen', pflanzentyp: 'salzempfindlich', technik: 'tropfbewaesserung', weidegang_laktierend: false },                                          // L912: keine besonderen Abstände
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
  const reg = prepareRegisterRows({ rows }, CFG.columns, { table, tableRows: makeTableRows(STD), symbol: classD }, {});
  return evaluateFormula({ equationId: eq.equation_number, formula: eq.formula, inputSymbols: eq.input_symbols, outputSymbol: eq.output_symbol, inputs: [], registers: { schlaege: reg }, tableLookup: table });
};

beforeEach(() => initStore(TWO_ROWS));

describe('schlaege through the generic RegisterEditor (Plan 3 Task 6)', () => {
  it('two rows: the sprinkler row derives faktor 2 and 50 m from TAB789 (class D, Tab. 7, no shield) and flags the 40 m as unterschritten; the drip row hides the sprinkler cells and needs no distance', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="schlaege" config={CFG} standardCode={STD} symbolLookup={classD} />);
    const rows = screen.getAllByTestId('register-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(within(rows[0]).getByTestId('derived-badge-faktor')).toHaveTextContent('2-fache Wurfweite');
    expect(within(rows[0]).getByTestId('derived-min_abstand_m')).toHaveTextContent('50');
    expect(within(rows[0]).getByTestId('derived-badge-abstand_ok')).toHaveTextContent('unterschritten');
    expect(within(rows[0]).queryByLabelText('Sprinklergruppe (Tab. 7/8/9)')).not.toBeNull();
    expect(within(rows[0]).queryByLabelText('reguläre Wurfweite ohne Windeinflüsse')).not.toBeNull();
    expect(within(rows[0]).queryByLabelText('Spritzschutz (≥ 2 m Höhe, ≥ 1 m Stärke)')).not.toBeNull();
    expect(within(rows[0]).queryByLabelText('steuerbarer Zugang (Abstandsregelung entfällt)')).toBeNull(); // only for Tab. 9
    // the drip row: no sprinkler inputs, no factor, no distance, but complete
    expect(within(rows[1]).queryByLabelText('Sprinklergruppe (Tab. 7/8/9)')).toBeNull();
    expect(within(rows[1]).queryByLabelText('reguläre Wurfweite ohne Windeinflüsse')).toBeNull();
    expect(within(rows[1]).queryByLabelText('Spritzschutz (≥ 2 m Höhe, ≥ 1 m Stärke)')).toBeNull();
    expect(within(rows[1]).queryByLabelText('vorhandener Abstand vom Wasseraustritt')).toBeNull();
    expect(within(rows[1]).queryByTestId('derived-badge-faktor')).toBeNull();
    expect(within(rows[1]).getByTestId('derived-min_abstand_m')).toHaveTextContent('—');
    expect(within(rows[1]).getByTestId('derived-badge-abstand_ok')).toHaveTextContent('eingehalten');
    const technik = within(rows[1]).getByLabelText('Bewässerungstechnik') as HTMLSelectElement;
    expect([...technik.options].map((o) => o.value).filter(Boolean)).toEqual(['beregnung_sprinkler', 'tropfbewaesserung', 'mikrosprueh', 'hydroponik', 'einstau', 'furchenbewaesserung', 'rieselbewaesserung']);
  });

  it('switching the sprinkler row to Tab. 9 reveals "steuerbarer Zugang"; ticking it voids the rule (faktor 0, eingehalten)', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="schlaege" config={CFG} standardCode={STD} symbolLookup={classD} />);
    const first = screen.getAllByTestId('register-row')[0];
    await user.selectOptions(within(first).getByLabelText('Sprinklergruppe (Tab. 7/8/9)'), 't9');
    const after = screen.getAllByTestId('register-row')[0];
    expect(within(after).getByTestId('derived-badge-faktor')).toHaveTextContent('2-fache Wurfweite'); // Tab. 9 D ohne = 2 (L1048)
    const zugang = within(after).getByLabelText('steuerbarer Zugang (Abstandsregelung entfällt)');
    await user.click(zugang);
    const voided = screen.getAllByTestId('register-row')[0];
    expect(within(voided).getByTestId('derived-badge-faktor')).toHaveTextContent('entfällt (steuerbarer Zugang)'); // L1030
    expect(within(voided).getByTestId('derived-badge-abstand_ok')).toHaveTextContent('eingehalten');
    expect(storedRows()[0]).toMatchObject({ sprinkler_gruppe: 't9', steuerbarer_zugang: true });
  });

  it('M12003-06-D1 Σ 25 ha and M12003-06-D2 one violation over the rows the editor renders; the footer names both engine symbols', () => {
    expect(evalD(D1, storedRows())).toMatchObject({ kind: 'computed', value: 25 });
    expect(evalD(D2, storedRows())).toMatchObject({ kind: 'computed', value: 1 });
    const footerStates = {
      flaeche_gesamt_ha: { label: 'Σ Fläche', unit: 'ha', state: evalD(D1, storedRows()) },
      abstand_verletzungen: { label: 'Abstand unterschritten', unit: null, state: evalD(D2, storedRows()) },
    };
    render(<RegisterEditor fieldId={FIELD_ID} symbol="schlaege" config={CFG} standardCode={STD} symbolLookup={classD} footerStates={footerStates} />);
    expect(screen.getByTestId('footer-flaeche_gesamt_ha')).toHaveTextContent('25');
    expect(screen.getByTestId('footer-abstand_verletzungen')).toHaveTextContent('1');
  });
});
