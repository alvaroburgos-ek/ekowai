/**
 * Plan 3 Task 25 — the DIN-14021-01 `claims` register renders through the generic
 * RegisterEditor from its DATA config (no per-standard React): a recycled-content row
 * shows the §7.8 block (A / P → X %) and hides the §7.6 block, a recovered-energy row
 * the reverse (discriminator `claim_type` = CLAIMMAP lookup_key + row-scope
 * `visible_when` on `numeric_block`, a lookup_value refilled from the seeded table);
 * the printed per-row formulas compute (X = A/P × 100 = 25 %, net = (R−E)/((R−E)+P)
 * × 100 = 50 %); the §7.6.3 a) badge flips when E is typed above R and
 * DIN-14021-01-D2 counts the row; the `unqualified` box appears only on a renewable /
 * carbon-neutral / sustainable row and an unqualified 80 % renewable claim fails the
 * printed 100 %; a new row without a claim type is incomplete and never counts.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/din14021';
import { EQUATIONS } from '@/lib/eval/equations/din14021';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'DIN-14021';
const CLAIMS = parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((e) => e.worksheet === 'DIN-14021-01' && e.symbol === 'claims')!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const CLAIMS_ID = 'fixture-claims-14021';

type Row = Record<string, unknown> & { id: string };
const ROWS: Row[] = [
  { id: 'c1', claim_type: 'recycled_content', scope: 'complete_product', channel: 'product_packaging_label', symbol: true, mobius: true, a_mass: 25, p_mass: 100 },
  { id: 'c2', claim_type: 'recovered_energy', scope: 'complete_product', channel: 'product_literature', r: 100, e: 40, p: 60 },
];

function initStore(values: Record<string, { type: 'json'; value: { rows: Row[] } }>) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', values, {}, {}); });
}
function storedRows(fieldId: string): Row[] {
  const v = useWorksheetStore.getState().values[fieldId];
  return v?.type === 'json' ? ((v.value as { rows: Row[] }).rows ?? []) : [];
}
const table = makeTableLookup(STD);
const prepared = (rows: unknown[]) => prepareRegisterRows({ rows }, CLAIMS.columns, { table, tableRows: makeTableRows(STD), symbol: () => undefined });
const evalOut = (n: string, rows: unknown[]) => {
  const e = EQUATIONS.find((x) => x.equation_number === n)!;
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { claims: prepared(rows) }, tableLookup: table });
};

beforeEach(() => initStore({ [CLAIMS_ID]: { type: 'json', value: { rows: ROWS } } }));

describe('claims through the generic RegisterEditor (Plan 3 Task 25)', () => {
  it('a recycled-content row shows A / P (X = 25 %) and hides R / E / P; a recovered-energy row the reverse (net 50 %); the Möbius box only on the recycled row; the unqualified box on neither; both type badges read ok; D1 / D2 / D3 read 2 / 0 / 1', () => {
    render(<RegisterEditor fieldId={CLAIMS_ID} symbol="claims" config={CLAIMS} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    expect(screen.getAllByLabelText('A — Masse des recycelten Materials')).toHaveLength(1);
    expect(screen.getAllByLabelText('P — Produktmasse')).toHaveLength(1);
    expect(screen.getAllByLabelText('R — Energiemenge aus dem Prozess der Energierückgewinnung')).toHaveLength(1);
    expect(screen.getAllByLabelText('E — Energie aus Primärquellen für den Rückgewinnungsprozess')).toHaveLength(1);
    expect(screen.queryByLabelText('I — anfänglicher Ressourcenverbrauch je Produktionseinheit')).toBeNull();
    expect(screen.queryByLabelText('Anteil erneuerbares Material / erneuerbare Energie in Prozent')).toBeNull();
    expect(screen.queryByLabelText('Carbon Footprint des Produktes nach ISO/TS 14067')).toBeNull();
    expect(screen.getAllByLabelText('Drei-Pfeile-Symbol verwendet (§5.10.2.4, nur Recyclatgehalt / Recyclingfähigkeit)')).toHaveLength(1);
    expect(screen.queryByLabelText('Uneingeschränkte Aussage (§7.14.2 / §7.15.2 / §7.16.1 / §7.17.3.2)')).toBeNull();
    expect(screen.queryByLabelText('Vergleichsbasis (§6.3.1 a–d)')).toBeNull(); // comparative unticked on both rows
    // the discriminator select shows the printed terms of CLAIMMAP
    const selects = screen.getAllByLabelText('Aussagetyp (§7)') as HTMLSelectElement[];
    expect(selects.map((s) => s.value)).toEqual(['recycled_content', 'recovered_energy']);
    expect(Array.from(selects[0].options).map((o) => o.textContent)).toContain('Recyclatgehalt');
    expect(Array.from(selects[0].options).map((o) => o.textContent)).toContain('zurückgewonnene Energie');
    expect(Array.from(selects[0].options)).toHaveLength(24); // "— wählen —" + the 23 prod tokens
    // lookup_value cells refilled from CLAIMMAP
    const blocks = screen.getAllByTestId('lookup-value-numeric_block');
    expect(blocks.map((b) => b.textContent)).toEqual(['recycled_content', 'recovered_energy']);
    expect(screen.getAllByTestId('lookup-value-clause').map((b) => b.textContent)).toEqual(['7.8.2.1', '7.6.3 a)']);
    // the printed formulas per row
    expect(screen.getByTestId('derived-recycled_pct')).toHaveTextContent('25');
    expect(screen.getByTestId('derived-net_recovered_pct')).toHaveTextContent('50');
    const badges = screen.getAllByTestId('derived-badge-type_ok');
    expect(badges).toHaveLength(2);
    for (const b of badges) expect(b).toHaveTextContent('Typbedingung erfüllt');
    expect(screen.getAllByTestId('derived-badge-recovered_ok')[1]).toHaveTextContent('R−E>0 erfüllt (oder nicht zutreffend)');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
    expect(screen.queryAllByRole('button', { name: 'abweichend wählen' })).toHaveLength(0); // locked table — no override affordance
    expect(evalOut('DIN-14021-01-D1', storedRows(CLAIMS_ID))).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalOut('DIN-14021-01-D2', storedRows(CLAIMS_ID))).toMatchObject({ kind: 'computed', value: 0 });
    expect(evalOut('DIN-14021-01-D3', storedRows(CLAIMS_ID))).toMatchObject({ kind: 'computed', value: 1 });
  });

  it('typing E above R flips the §7.6.3 a) badge and D2 counts the row (D3 → 0); a new row without a claim type is incomplete and never counts; picking renewable_energy reveals the share + unqualified box and an unqualified 80 % fails the printed 100 %', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={CLAIMS_ID} symbol="claims" config={CLAIMS} standardCode={STD} />);
    const eInput = screen.getByLabelText('E — Energie aus Primärquellen für den Rückgewinnungsprozess');
    await user.clear(eInput);
    await user.type(eInput, '120');
    expect(screen.getAllByTestId('derived-badge-recovered_ok')[1]).toHaveTextContent('R−E>0 nicht erfüllt oder R / E nicht eingetragen (§7.6.3 a)');
    expect(screen.getAllByTestId('derived-badge-type_ok')[1]).toHaveTextContent('Typbedingung nicht erfüllt');
    expect(evalOut('DIN-14021-01-D2', storedRows(CLAIMS_ID))).toMatchObject({ kind: 'computed', value: 1 });
    expect(evalOut('DIN-14021-01-D3', storedRows(CLAIMS_ID))).toMatchObject({ kind: 'computed', value: 0 });
    await user.click(screen.getByRole('button', { name: '+ Aussage' }));
    expect(screen.getAllByTestId('register-row')).toHaveLength(3);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(evalOut('DIN-14021-01-D1', storedRows(CLAIMS_ID))).toMatchObject({ kind: 'computed', value: 2 });
    await user.selectOptions(screen.getAllByLabelText('Aussagetyp (§7)')[2], 'renewable_energy');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    expect(screen.getAllByTestId('lookup-value-numeric_block')[2]).toHaveTextContent('renewable_energy');
    expect(screen.getAllByLabelText('Anteil erneuerbares Material / erneuerbare Energie in Prozent')).toHaveLength(1);
    expect(screen.getAllByLabelText('Uneingeschränkte Aussage (§7.14.2 / §7.15.2 / §7.16.1 / §7.17.3.2)')).toHaveLength(1);
    expect(evalOut('DIN-14021-01-D1', storedRows(CLAIMS_ID))).toMatchObject({ kind: 'computed', value: 3 });
    await user.click(screen.getByLabelText('Uneingeschränkte Aussage (§7.14.2 / §7.15.2 / §7.16.1 / §7.17.3.2)'));
    await user.type(screen.getByLabelText('Anteil erneuerbares Material / erneuerbare Energie in Prozent'), '80');
    expect(screen.getAllByTestId('derived-badge-renewable_ok')[2]).toHaveTextContent('uneingeschränkte Aussage ohne 100 % (§7.14.2 / §7.15.2)');
    expect(evalOut('DIN-14021-01-D2', storedRows(CLAIMS_ID))).toMatchObject({ kind: 'computed', value: 2 });
  });
});
