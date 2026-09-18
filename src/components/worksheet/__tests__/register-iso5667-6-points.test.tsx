/**
 * Plan 3 Task 23 — the ISO-5667-6-02 `sampling_points_6` register renders through
 * the generic RegisterEditor from its DATA config (no per-standard React): a bridge
 * row shows the §7.2 columns (position / checks a–d) and hides the ice-safety one,
 * an under-ice row the reverse (discriminator column + row-scope visible_when);
 * the §7.1 `depth_ok` badge reads the seeded S7_1 figures and flips when a depth
 * is typed below 30 cm; ISO-5667-6-02-D1 / D2 count the rows through the real
 * `evaluateFormula`; the `kennung` column is required (a new row is incomplete).
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/iso5667_6';
import { EQUATIONS } from '@/lib/eval/equations/iso5667_6';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'ISO-5667-6';
const POINTS = parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((e) => e.worksheet === 'ISO-5667-6-02' && e.symbol === 'sampling_points_6')!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const POINTS_ID = 'fixture-sampling-points-6';

type Row = Record<string, unknown> & { id: string };
const ROWS: Row[] = [
  { id: 'p1', kennung: 'RP-1', location_type: 'bridge', bridge_position: 'upstream', bridge_checks: true, homogeneity_status: 'homogeneous', depth_below_surface_cm: 30, height_above_bed_cm: 45 },
  { id: 'p2', kennung: 'RP-2', location_type: 'under_ice', ice_safety: true, homogeneity_status: 'untested', depth_below_surface_cm: 40, height_above_bed_cm: 35 },
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
  const reg = prepareRegisterRows({ rows }, POINTS.columns, { table, tableRows: makeTableRows(STD), symbol: () => undefined });
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { sampling_points_6: reg }, tableLookup: table });
};

beforeEach(() => initStore({ [POINTS_ID]: { type: 'json', value: { rows: ROWS } } }));

describe('sampling_points_6 through the generic RegisterEditor (Plan 3 Task 23)', () => {
  it('a bridge row shows the §7.2 columns (position / checks) and hides the ice-safety one; an under-ice row the reverse; both §7.1 badges read ok from S7_1; D1 / D2 count 2 / 0', () => {
    render(<RegisterEditor fieldId={POINTS_ID} symbol="sampling_points_6" config={POINTS} standardCode={STD} />);
    expect(screen.getAllByTestId('register-row')).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    // bridge-only columns exist once (on the bridge row); the ice column once (on the under-ice row); the wading / bank PPE column on neither
    expect(screen.getAllByLabelText('Aguas arriba o aguas abajo del puente')).toHaveLength(1);
    expect(screen.getAllByLabelText('Brückenprüfungen a) bis d) erfüllt (§7.2)')).toHaveLength(1);
    expect(screen.getAllByLabelText('Eisdicke / Tragfähigkeit und Ausbildung geprüft (§7.6 / §15)')).toHaveLength(1);
    expect(screen.queryByLabelText('Warnschutzkleidung und Schwimmhilfe verwendet (§7.1 / §15)')).toBeNull();
    // mixing columns hidden while mixing_relevant is unset on both rows
    expect(screen.queryByLabelText('Mischungsdimension (§5.1.2 a–c)')).toBeNull();
    expect((screen.getAllByLabelText('Aguas arriba o aguas abajo del puente')[0] as HTMLSelectElement).value).toBe('upstream');
    const badges = screen.getAllByTestId('derived-badge-depth_ok');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent('§7.1 ≥ 30 cm über Sohle und unter Oberfläche (Anhaltswert, iso5667_6-J-1)');
    expect(badges[1]).toHaveTextContent('§7.1 ≥ 30 cm über Sohle und unter Oberfläche (Anhaltswert, iso5667_6-J-1)');
    expect(screen.queryByTestId('register-diagnostics')).toBeNull();
    expect(screen.queryAllByRole('button', { name: 'abweichend wählen' })).toHaveLength(0); // no lookup column — no override affordance
    expect(evalOut('ISO-5667-6-02-D1', storedRows(POINTS_ID))).toMatchObject({ kind: 'computed', value: 2 });
    expect(evalOut('ISO-5667-6-02-D2', storedRows(POINTS_ID))).toMatchObject({ kind: 'computed', value: 0 });
  });

  it('typing a depth below 30 cm flips the §7.1 badge and D2 counts the row; a new row without kennung is incomplete and never counts; ticking mixing_relevant reveals the dimension column', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={POINTS_ID} symbol="sampling_points_6" config={POINTS} standardCode={STD} />);
    const depth = screen.getAllByLabelText('Probenahmetiefe unter der Oberfläche in cm')[1];
    await user.clear(depth);
    await user.type(depth, '20');
    expect(screen.getAllByTestId('derived-badge-depth_ok')[1]).toHaveTextContent('§7.1 Position nicht erfüllt oder nicht eingetragen (Anhaltswert, iso5667_6-J-1)');
    expect(evalOut('ISO-5667-6-02-D2', storedRows(POINTS_ID))).toMatchObject({ kind: 'computed', value: 1 });
    await user.click(screen.getByRole('button', { name: '+ Probenahmepunkt' }));
    expect(screen.getAllByTestId('register-row')).toHaveLength(3);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/3');
    expect(evalOut('ISO-5667-6-02-D1', storedRows(POINTS_ID))).toMatchObject({ kind: 'computed', value: 2 });
    await user.type(screen.getAllByLabelText('Kennung des Probenahmepunkts')[2], 'RP-3');
    await user.selectOptions(screen.getAllByLabelText('Probenahme-Ortstyp')[2], 'bank');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('3/3');
    expect(screen.getAllByLabelText('Warnschutzkleidung und Schwimmhilfe verwendet (§7.1 / §15)')).toHaveLength(1); // the bank row shows the wading / bank PPE column
    expect(evalOut('ISO-5667-6-02-D1', storedRows(POINTS_ID))).toMatchObject({ kind: 'computed', value: 3 });
    expect(evalOut('ISO-5667-6-02-D2', storedRows(POINTS_ID))).toMatchObject({ kind: 'computed', value: 2 }); // the new row has no depths → badge 0
    await user.click(screen.getAllByLabelText('Mischung für das Probenahmeregime relevant (§5.1.2)')[2]);
    expect(screen.getAllByLabelText('Mischungsdimension (§5.1.2 a–c)')).toHaveLength(1);
  });
});
