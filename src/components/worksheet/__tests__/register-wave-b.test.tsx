/**
 * Plan 3 final wave B — the three register-editor defects.
 *
 *  3. An overridden row is never refilled (`m1200_2-I-2`, Plan-2c backlog 4): the override
 *     flag suppresses `refillLookupValues` for the WHOLE row, so a `lookup_value` column the
 *     override does not claim keeps a stale value — or stays blank — with no signal at all.
 *     Smallest honest behaviour: keep the engineer's value, SAY that the table now says
 *     something else.
 *  5. Register rows have no uniqueness constraint (`iso59020-F-2`, backlog 7): a duplicate row
 *     passes every count-based gate. `ui_config.unique_by` names the key columns; a duplicate
 *     is flagged VISIBLY and never dropped, merged or renumbered.
 *  6. No per-row `alternatives` on a `RegulationRow` (`a178-O-4`, backlog 17): a `kann` table
 *     that prints two permitted values FOR ONE ROW could only offer the value column's
 *     table-wide list (A-178 Tab. 1 offered 0,2 for every Vorstufe type).
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { resetSavedOverrideReasons } from '../override-reason';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { clearTables, registerTables, type RegulationTable } from '@/lib/eval/regulation-tables';
import type { RegisterUiConfig } from '@/lib/eval/field-config';

const FIELD_ID = '11111111-1111-4111-8111-111111111111';
const PROJECT_ID = '22222222-2222-4222-8222-222222222222';

function initStore(value?: unknown) {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance', value !== undefined ? { [FIELD_ID]: { type: 'json', value } } : {}, {}, {});
  });
}
function stored(): { rows: Array<Record<string, unknown>> } {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? (v.value as { rows: Array<Record<string, unknown>> }) : { rows: [] };
}

/** A-178 Tab. 1 shape: a `kann` table whose ROW A prints two permitted η values while the
 *  value column's table-wide list prints the union of everything any row permits. */
const KANN_TABLE: RegulationTable = {
  standard_code: 'SYN-2', edition: '2026-01', table_code: 'TAB1', title_de: 'Synthetisch kann',
  clause_reference: null, page_ref: null, key_columns: ['k'],
  value_columns: [{ name: 'v', type: 'number', values: ['0', '0.2', '0.3', '0.5'] }, { name: 'note', type: 'string' }],
  override_policy: 'kann', override_quote: null, verification_status: 'imported_unverified',
  rows: [
    { row_key: 'a', keys: { k: 'a' }, group_label: null, label_de: 'Zeile A', order_index: 0,
      values: { v: 0.2, note: 'x' }, verbatim_quote: 'q', alternatives: { v: ['0.2', '0.3'] } },
    { row_key: 'b', keys: { k: 'b' }, group_label: null, label_de: 'Zeile B', order_index: 1,
      values: { v: 0.5, note: 'y' }, verbatim_quote: 'q' },
  ],
};

const CFG: RegisterUiConfig = {
  title: 'Syn', columns: [
    { key: 'k', type: 'lookup_key', label: 'K', required: true, lookup: { table_code: 'TAB1' } },
    { key: 'v', type: 'lookup_value', label: 'V', lookup: { table_code: 'TAB1', key_column: 'k', value: 'v' } },
    { key: 'note', type: 'lookup_value', label: 'Hinweis', lookup: { table_code: 'TAB1', key_column: 'k', value: 'note' } },
    { key: 'ov', type: 'boolean', label: 'abweichend' },
  ],
  override: { flag_key: 'ov', applies_to: ['v'], policy: 'kann' },
};

beforeEach(() => { initStore(); resetSavedOverrideReasons(); });
afterEach(() => clearTables());

describe('defect 6 — per-row `alternatives` for a `kann` select', () => {
  it('the override select offers the ROW\'s printed alternatives, not the value column\'s table-wide list', async () => {
    registerTables([KANN_TABLE]);
    const user = userEvent.setup();
    initStore({ rows: [{ id: 'r1', k: 'a', v: 0.2, note: 'x', ov: false }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="syn" config={CFG} standardCode="SYN-2" projectId={PROJECT_ID} />);
    await user.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    const v = screen.getByLabelText('V (abweichend)') as HTMLSelectElement;
    expect([...v.options].map((o) => o.value)).toEqual(['0.2', '0.3']);
    await user.selectOptions(v, '0.3');
    expect(stored().rows[0]).toMatchObject({ ov: true, v: 0.3 });
  });

  it('a row that declares none falls back to the value column\'s list (unchanged behaviour)', async () => {
    registerTables([KANN_TABLE]);
    const user = userEvent.setup();
    initStore({ rows: [{ id: 'r1', k: 'b', v: 0.5, note: 'y', ov: false }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="syn" config={CFG} standardCode="SYN-2" projectId={PROJECT_ID} />);
    await user.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    const v = screen.getByLabelText('V (abweichend)') as HTMLSelectElement;
    expect([...v.options].map((o) => o.value)).toEqual(['0', '0.2', '0.3', '0.5']);
  });
});

describe('defect 3 — an overridden row says what the table now holds', () => {
  const overridden = { id: 'r1', k: 'a', v: 0.9, note: 'veraltet', ov: true };

  it('a lookup_value column the override does NOT claim shows the current table value beside the stale one', () => {
    registerTables([KANN_TABLE]);
    initStore({ rows: [overridden] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="syn" config={CFG} standardCode="SYN-2" projectId={PROJECT_ID} />);
    const marker = screen.getByTestId('table-stale-note');
    expect(marker).toHaveTextContent('Tab. 1: x');
    // …and the engineer's value is still the one stored and shown — never overwritten.
    expect(stored().rows[0].note).toBe('veraltet');
    expect(screen.getByTestId('lookup-value-note')).toHaveTextContent('veraltet');
  });

  it('no marker on a row that is not overridden, and none when the cell already equals the table', () => {
    registerTables([KANN_TABLE]);
    initStore({ rows: [{ ...overridden, ov: false }] });
    const { unmount } = render(<RegisterEditor fieldId={FIELD_ID} symbol="syn" config={CFG} standardCode="SYN-2" projectId={PROJECT_ID} />);
    expect(screen.queryByTestId('table-stale-note')).toBeNull();
    unmount();
    initStore({ rows: [{ ...overridden, note: 'x' }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="syn" config={CFG} standardCode="SYN-2" projectId={PROJECT_ID} />);
    expect(screen.queryByTestId('table-stale-note')).toBeNull();
  });
});

describe('defect 5 — register row uniqueness declared in ui_config', () => {
  const UNIQUE_CFG: RegisterUiConfig = { ...CFG, unique_by: ['k'] };

  it('duplicate rows are FLAGGED, never dropped or merged', () => {
    registerTables([KANN_TABLE]);
    initStore({ rows: [
      { id: 'r1', k: 'a', v: 0.2, note: 'x', ov: false },
      { id: 'r2', k: 'a', v: 0.2, note: 'x', ov: false },
      { id: 'r3', k: 'b', v: 0.5, note: 'y', ov: false },
    ] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="syn" config={UNIQUE_CFG} standardCode="SYN-2" projectId={PROJECT_ID} />);
    expect(screen.getByTestId('register-duplicates')).toHaveTextContent('K „Zeile A“');
    expect(screen.getByTestId('register-duplicates')).toHaveTextContent('2×');
    // all three rows still render, and the stored carrier is untouched
    expect(screen.getAllByTestId('register-row')).toHaveLength(3);
    expect(stored().rows).toHaveLength(3);
  });

  it('no warning when every key is unique, and none without `unique_by`', () => {
    registerTables([KANN_TABLE]);
    initStore({ rows: [
      { id: 'r1', k: 'a', v: 0.2, note: 'x', ov: false },
      { id: 'r2', k: 'b', v: 0.5, note: 'y', ov: false },
    ] });
    const { unmount } = render(<RegisterEditor fieldId={FIELD_ID} symbol="syn" config={UNIQUE_CFG} standardCode="SYN-2" projectId={PROJECT_ID} />);
    expect(screen.queryByTestId('register-duplicates')).toBeNull();
    unmount();
    initStore({ rows: [
      { id: 'r1', k: 'a', v: 0.2, note: 'x', ov: false },
      { id: 'r2', k: 'a', v: 0.2, note: 'x', ov: false },
    ] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="syn" config={CFG} standardCode="SYN-2" projectId={PROJECT_ID} />);
    expect(screen.queryByTestId('register-duplicates')).toBeNull();
  });

  it('a multi-column key only collides when EVERY declared column matches', () => {
    registerTables([KANN_TABLE]);
    initStore({ rows: [
      { id: 'r1', k: 'a', v: 0.2, note: 'x', ov: false },
      { id: 'r2', k: 'a', v: 0.3, note: 'x', ov: true },
    ] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="syn" config={{ ...CFG, unique_by: ['k', 'v'] }} standardCode="SYN-2" projectId={PROJECT_ID} />);
    expect(screen.queryByTestId('register-duplicates')).toBeNull();
  });
});
