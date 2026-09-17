/**
 * Plan 3 Task 7 — the FLL-GAR-09 `abdichtungslagen` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): two rows
 * (Schutzlage unten with the Tab.-26 Baugrund fill; Abdichtung with its material),
 * the discriminator `rolle` drives which cells show (Baugrund / Sand only on the
 * lower protection layer, Abdichtungsart only on the sealing row), the Tab.-26
 * lookup values refill per row from the seeded table, and FLL-GAR-09-D1 / -D2
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
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/fll_gar';
import { EQUATIONS } from '@/lib/eval/equations/fll_gar';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'FLL-GAR-2023';
const FIELD_ID = 'fixture-abdichtungslagen';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'FLL-GAR-09' && e.symbol === 'abdichtungslagen')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const D1 = EQUATIONS.find((e) => e.equation_number === 'FLL-GAR-09-D1')!;
const D2 = EQUATIONS.find((e) => e.equation_number === 'FLL-GAR-09-D2')!;

type Row = Record<string, unknown> & { id: string };
const TWO_ROWS: Row[] = [
  { id: 'r1', position: 1, rolle: 'schutzlage_unten', dicke_mm: 3, flaechengewicht_g_m2: 300, baugrund: 'UL' }, // L5388: UL, UM, UA → Sand 5 cm | x x x x
  { id: 'r2', position: 2, rolle: 'abdichtung', material: 'bahn_kunststoff_elastomer', dicke_mm: 1.5 },        // L1408: ≤ 1:1,5
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
  return evaluateFormula({ equationId: eq.equation_number, formula: eq.formula, inputSymbols: eq.input_symbols, outputSymbol: eq.output_symbol, inputs: [], registers: { abdichtungslagen: reg }, tableLookup: table });
};

beforeEach(() => initStore(TWO_ROWS));

describe('abdichtungslagen through the generic RegisterEditor (Plan 3 Task 7)', () => {
  it('two rows: the lower protection layer shows the Tab.-26 Baugrund select and refills Sand 5 cm + the allowed materials; the sealing row shows the material select and the Tab.-1 limit 1,5', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="abdichtungslagen" config={CFG} standardCode={STD} />);
    const rows = screen.getAllByTestId('register-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    // row 1 — Schutzlage unten
    expect(within(rows[0]).queryByLabelText('Baugrund DIN 18196 (Tab. 26)')).not.toBeNull();
    expect(within(rows[0]).getByTestId('lookup-value-sand_min_cm')).toHaveTextContent('5');
    expect(within(rows[0]).getByTestId('lookup-value-werkstoffe_tab26')).toHaveTextContent('Vliesstoffe bzw. Geo- textilien ≥ 300 g/m2, GRK 5');
    expect(within(rows[0]).queryByLabelText('Abdichtungsart (Tab. 1)')).toBeNull();
    expect(within(rows[0]).queryByLabelText('SWK (Tab. 27)')).toBeNull();
    expect(within(rows[0]).getByTestId('derived-neigung_limit')).toHaveTextContent('0');
    // row 2 — Abdichtung
    expect(within(rows[1]).queryByLabelText('Abdichtungsart (Tab. 1)')).not.toBeNull();
    expect(within(rows[1]).queryByLabelText('Baugrund DIN 18196 (Tab. 26)')).toBeNull();
    expect(within(rows[1]).queryByLabelText('Flächengewicht der Schutzlage')).toBeNull();
    expect(within(rows[1]).getByTestId('derived-neigung_limit')).toHaveTextContent('1,5');
    const material = within(rows[1]).getByLabelText('Abdichtungsart (Tab. 1)') as HTMLSelectElement;
    expect([...material.options].map((o) => o.value).filter(Boolean)).toHaveLength(12); // every prod abdichtungs_art token, not only the 8 Tab.-1 rows
  });

  it('switching the first row to Schutzlage oben reveals the SWK select; picking SWK 2 refills 500 g/m² and flags the 300 g/m² as under Tab. 27', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="abdichtungslagen" config={CFG} standardCode={STD} />);
    const first = screen.getAllByTestId('register-row')[0];
    await user.selectOptions(within(first).getByLabelText('Rolle'), 'schutzlage_oben');
    const after = screen.getAllByTestId('register-row')[0];
    expect(within(after).queryByLabelText('Baugrund DIN 18196 (Tab. 26)')).toBeNull();
    await user.selectOptions(within(after).getByLabelText('SWK (Tab. 27)'), 'swk2');
    const oben = screen.getAllByTestId('register-row')[0];
    expect(within(oben).getByTestId('lookup-value-fg_min')).toHaveTextContent('500'); // L5444
    expect(within(oben).getByTestId('derived-badge-fg_ok')).toHaveTextContent('Flächengewicht unter der SWK-Mindestanforderung (Tab. 27)');
    expect(storedRows()[0]).toMatchObject({ rolle: 'schutzlage_oben', swk: 'swk2' });
  });

  it('FLL-GAR-09-D1 Σ 1,5 mm and -D2 one Abdichtung row over the rows the editor renders; the footer names both engine symbols', () => {
    expect(evalD(D1, storedRows())).toMatchObject({ kind: 'computed', value: 1.5 });
    expect(evalD(D2, storedRows())).toMatchObject({ kind: 'computed', value: 1 });
    const footerStates = {
      lagen_gesamtdicke_mm: { label: 'Σ Abdichtung', unit: 'mm', state: evalD(D1, storedRows()) },
      abdichtungslagen_count: { label: 'Abdichtungslagen', unit: null, state: evalD(D2, storedRows()) },
    };
    render(<RegisterEditor fieldId={FIELD_ID} symbol="abdichtungslagen" config={CFG} standardCode={STD} footerStates={footerStates} />);
    expect(screen.getByTestId('footer-lagen_gesamtdicke_mm')).toHaveTextContent('1,5');
    expect(screen.getByTestId('footer-abdichtungslagen_count')).toHaveTextContent('1');
  });
});
