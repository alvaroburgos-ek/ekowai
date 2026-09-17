/**
 * Plan 3 Task 8 — the FLLNT-10 `filtereinheiten` register renders through the
 * generic RegisterEditor from its DATA config (no per-standard React): a
 * hydrobotanical row and a substrate-filter row show only their own columns
 * (discriminator `unit_kind` in row scope), the substrate row reads its Tab.-15
 * surface from the seeded TABLE15 row (lookup_key / lookup_value pair — the
 * override toggle sits under it, Tab. 15 being `anhaltswert`), the colonizable
 * surface is derived per row (App. 5 Ex. 1: 600 · 15 · 0.7 = 6300 m²), the
 * Tab.-10 / Tab.-12 limits come out per row, and FLLNT-10-D1 / -D2 evaluate
 * through the real `evaluateFormula` over the same rows into the footer.
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { FIELD_CONFIGS } from '@/lib/eval/field-configs/fll_naturteich';
import { EQUATIONS } from '@/lib/eval/equations/fll_naturteich';
import { evaluateFormula } from '@/lib/eval/formula';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';

const STD = 'FLL-Naturteich';
const FIELD_ID = 'fixture-filtereinheiten';
const entry = FIELD_CONFIGS.find((e) => e.worksheet === 'FLLNT-10' && e.symbol === 'filtereinheiten')!;
const CFG = parseFieldConfig({ widget: 'register', uiConfig: entry.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const D1 = EQUATIONS.find((e) => e.equation_number === 'FLLNT-10-D1')!;
const D2 = EQUATIONS.find((e) => e.equation_number === 'FLLNT-10-D2')!;

type Row = Record<string, unknown> & { id: string };
const TWO_ROWS: Row[] = [
  { id: 'r1', label: 'Hydrobotanik', unit_kind: 'hydrobotanical', hydrobot_type: 'emersed', area_m2: 20, layer_cm: 25, feed_rate: 4 },
  { id: 'r2', label: 'Schnellfilter', unit_kind: 'substrate_filter', flow_type: 'quick', flow_direction: 'vertical_continuous_overflow', area_m2: 15, layer_cm: 70, grain_class: '8_16', feed_rate: 20 }, // App. 5 Ex. 1 (L4073–L4080)
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
  const reg = prepareRegisterRows({ rows }, CFG.columns, { table, tableRows: makeTableRows(STD) }, { overrideFlagKey: CFG.override?.flag_key, overrideAppliesTo: CFG.override?.applies_to });
  return evaluateFormula({ equationId: eq.equation_number, formula: eq.formula, inputSymbols: eq.input_symbols, outputSymbol: eq.output_symbol, inputs: [], registers: { filtereinheiten: reg }, tableLookup: table });
};

beforeEach(() => initStore(TWO_ROWS));

describe('filtereinheiten through the generic RegisterEditor (Plan 3 Task 8)', () => {
  it('two rows: the hydrobotanical row hides the filter columns and reads Tab. 10, the substrate row reads Tab. 15 (600 m²/m³) and Tab. 12; colonized surface 0 / 6300 m²', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="filtereinheiten" config={CFG} standardCode={STD} />);
    const rows = screen.getAllByTestId('register-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
    // hydrobotanical row: no grain class / flow selects, Tab.-10 substrate minimum 10 cm, feed limit Qmax 5
    expect(within(rows[0]).queryByLabelText('Kornklasse (Tab. 15)')).toBeNull();
    expect(within(rows[0]).queryByLabelText('Fließrichtung')).toBeNull();
    expect(within(rows[0]).getByLabelText('Hydrobotanik-Typ (Tab. 10)')).toHaveValue('emersed');
    expect(within(rows[0]).getByTestId('derived-layer_min')).toHaveTextContent('10');
    expect(within(rows[0]).getByTestId('derived-feed_limit')).toHaveTextContent('5');
    expect(within(rows[0]).getByTestId('derived-colonized_m2')).toHaveTextContent('0');
    expect(within(rows[0]).getByTestId('derived-badge-feed_ok')).toHaveTextContent('Beschickung nach Tab. 10 / 11 / 12');
    // substrate row: Tab.-15 surface filled from the seeded row, Tab.-12 layer ≥ 50 cm and Qmin 15, 600 · 15 · 0.7 = 6300 m²
    expect(within(rows[1]).queryByLabelText('Hydrobotanik-Typ (Tab. 10)')).toBeNull();
    expect(within(rows[1]).getByTestId('lookup-value-surface_m2_m3')).toHaveTextContent('600');
    expect(within(rows[1]).getByTestId('derived-layer_min')).toHaveTextContent('50');
    expect(within(rows[1]).getByTestId('derived-feed_limit')).toHaveTextContent('15');
    expect(within(rows[1]).getByTestId('derived-colonized_m2')).toHaveTextContent('6.300'); // de-DE thousands separator
    const grain = within(rows[1]).getByLabelText('Kornklasse (Tab. 15)') as HTMLSelectElement;
    expect([...grain.options].map((o) => o.value).filter(Boolean)).toEqual(['4_6', '4_8', '6_8', '8_12', '8_16', '12_16', '16_22', '16_32', '22_32']);
  });

  it('changing the grain class re-fills the Tab.-15 surface and the colonized surface follows (4/8 → 1200 · 15 · 0.7 = 12600 m²)', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="filtereinheiten" config={CFG} standardCode={STD} />);
    await user.selectOptions(within(screen.getAllByTestId('register-row')[1]).getByLabelText('Kornklasse (Tab. 15)'), '4_8');
    const after = screen.getAllByTestId('register-row');
    expect(within(after[1]).getByTestId('lookup-value-surface_m2_m3')).toHaveTextContent('1.200');
    expect(within(after[1]).getByTestId('derived-colonized_m2')).toHaveTextContent('12.600');
    expect(storedRows()[1].grain_class).toBe('4_8');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('2/2');
  });

  it('FLLNT-10-D1 Σ 6300 m² and FLLNT-10-D2 0 violations over the rows the editor renders; the footer names both engine symbols; an incomplete third row does not count', async () => {
    expect(evalD(D1, storedRows())).toMatchObject({ kind: 'computed', value: 6300 });
    expect(evalD(D2, storedRows())).toMatchObject({ kind: 'computed', value: 0 });
    const user = userEvent.setup();
    const footerStates = {
      filter_colonized_surface_total: { label: 'Σ besiedelbare Oberfläche', unit: 'm²', state: evalD(D1, storedRows()) },
      filter_feed_violations: { label: 'Beschickung außerhalb', unit: null, state: evalD(D2, storedRows()) },
    };
    render(<RegisterEditor fieldId={FIELD_ID} symbol="filtereinheiten" config={CFG} standardCode={STD} footerStates={footerStates} />);
    expect(screen.getByTestId('footer-filter_colonized_surface_total')).toHaveTextContent('6.300');
    expect(screen.getByTestId('footer-filter_feed_violations')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: '+ Einheit' }));
    expect(evalD(D1, storedRows())).toMatchObject({ kind: 'computed', value: 6300 });
  });
});
