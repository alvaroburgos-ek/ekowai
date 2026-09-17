/**
 * Plan 2b Task 7 — the `lookup_fill` widget.
 *
 * Display mode: the symbol is server-owned (`computedSymbols` / `serverComputedSet`)
 * or an inherited copy (`inheritedFromWorksheet`) ⇒ the persisted value is shown
 * read-only with a SOURCE-only badge (fix round 1: no key diagnostics there); the widget
 * never writes the store and offers no override control (the five
 * materializeLoadingCheck sites stay the single producer of `ac_as_ratio_limit`).
 *
 * Fill mode: nobody else owns the symbol ⇒ the widget fills the store from the table
 * row once (stored null), the badge keeps the printed value visible, and an override
 * is policy-driven: `locked` ⇒ no affordance; `anhaltswert | kann | messwert` ⇒
 * "abweichend wählen" + reason ≥ reason_min_length recorded through the existing
 * `recordManualOverride` audit path (`equationNumber = 'lookup:<TABLE_CODE>'`).
 *
 * SR-1: the TAB9 figure in the fill assertions is read from the seed table through
 * `resolveRegulationTable`, never typed.
 */
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));

import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LookupFillField, resetSavedLookupReasons } from '../lookup-fill-field';
import type { WidgetContext, WorksheetFormField } from '../widgets';
import type { FieldValue } from '@/lib/state/worksheet-store';
import { recordManualOverride } from '@/lib/actions/overrides';
import { resolveRegulationTable } from '@/lib/eval/regulation-tables-fallback';
import { clearTables, registerTables, type RegulationTable } from '@/lib/eval/regulation-tables';

const STD = 'DWA-A-138-1';
const TAB9_ASPHALT_CM = resolveRegulationTable(STD, 'TAB9')!.rows.find((r) => r.row_key === 'schwarzdecke_asphalt')!.values.cm as number;

function makeField(over: Partial<WorksheetFormField>): WorksheetFormField {
  return {
    id: '', symbol: '', labelDe: '', labelEn: null, unit: null, dataType: 'number', isRequired: false, enumValues: null,
    validationRules: null, clauseReference: null, verificationStatus: 'x', description: null, sectionId: 's1',
    orderIndex: 0, active: true, widget: null, uiConfig: null, lookup: null, visibleWhen: null,
    ...over,
  } as WorksheetFormField;
}

const LIMIT = makeField({ id: 'f-lim', symbol: 'ac_as_ratio_limit', labelDe: 'Grenzwert A_C/A_S,m', unit: '–' });
const SURFACE = makeField({ id: 'f-surf', symbol: 'surface_type', labelDe: 'Oberfläche', dataType: 'enum' });
const TAB9_BINDING = { table_code: 'TAB9', role: 'value', keys: [{ column: 'surface_type', from_symbol: 'surface_type' }], value: 'cm' };
const C_TEST = makeField({ id: 'f-c', symbol: 'c_test', labelDe: 'c_test', widget: 'lookup_fill', lookup: TAB9_BINDING });

type Values = Record<string, FieldValue | undefined>;

/** Renders the widget over a live `values` state so `setField` re-renders like the store would. */
function Harness({ field, fields, initial, over, onSet, controls }: {
  field: WorksheetFormField; fields: WorksheetFormField[]; initial: Values;
  over?: Partial<WidgetContext>; onSet?: (id: string, v: FieldValue) => void;
  /** Extra buttons that mutate the live values (drives a sibling key without remounting the widget). */
  controls?: (set: (id: string, v: FieldValue) => void) => React.ReactNode;
}) {
  const [values, setValues] = useState<Values>(initial);
  const setRaw = (id: string, v: FieldValue) => setValues((prev) => ({ ...prev, [id]: v }));
  const fieldBySymbol = new Map(fields.map((f) => [f.symbol, f]));
  const symbolLookup = (sym: string) => {
    const f = fieldBySymbol.get(sym);
    const v = f ? values[f.id] : undefined;
    return v && v.type !== 'json' && v.value != null ? (v.value as string | number | boolean) : undefined;
  };
  const ctx: WidgetContext = {
    standardCode: STD, locale: 'de', projectId: 'p', readOnly: false, fieldBySymbol, values,
    setField: (id, v) => { onSet?.(id, v); setValues((prev) => ({ ...prev, [id]: v })); },
    symbolLookup, engineStates: {}, equations: [], computedSymbols: new Set(), serverComputedSet: new Set(),
    rainfallDesignReturnPeriod: null, renderDynamic: (f) => <input data-testid="dynamic-fallback" aria-label={f.labelDe} />,
    ...over,
  };
  return (
    <>
      {controls?.(setRaw)}
      <LookupFillField field={field} ctx={ctx} />
    </>
  );
}

beforeEach(() => { vi.mocked(recordManualOverride).mockClear(); resetSavedLookupReasons(); });
afterEach(() => { clearTables(); });

describe('LookupFillField — display mode (server-owned symbol)', () => {
  it('ac_as_ratio_limit (widget NULL ⇒ fallback binding) renders the stored value read-only with the Tab. 6 badge and no override control', () => {
    const setField = vi.fn();
    render(<Harness field={LIMIT} fields={[LIMIT]} initial={{ 'f-lim': { type: 'number', value: 30 } }} over={{ computedSymbols: new Set(['ac_as_ratio_limit']) }} onSet={setField} />);
    const root = screen.getByTestId('lookup-fill');
    expect(root.dataset.mode).toBe('display');
    expect(root.dataset.symbol).toBe('ac_as_ratio_limit');
    expect(screen.getByTestId('lookup-fill-value')).toHaveTextContent('30');
    // Fix round 1 ruling: display mode names the SOURCE only — the key diagnostics (tab6_tier / bbz_band are not
    // fields today, sign-off D-2b-3) belong to fill mode.
    expect(screen.getByTestId('lookup-source')).toHaveTextContent('Tab. 6 (Grenzwert)');
    expect(screen.getByTestId('lookup-source')).not.toHaveTextContent('Schlüssel fehlt');
    // No override marker / reason-missing state in display mode even though 30 differs from every TAB6 row.
    expect(screen.queryByText('abweichend')).toBeNull();
    expect(screen.queryByTestId('lookup-reason-missing')).toBeNull();
    expect(screen.queryByRole('button', { name: 'abweichend wählen' })).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByTestId('lookup-locked')).toBeNull();
    expect(screen.getByText('Grenzwert A_C/A_S,m')).toBeInTheDocument();
    expect(setField).not.toHaveBeenCalled();
  });

  it('null stored value + role limit ⇒ "— (kein Tab. 6-Grenzwert)"', () => {
    render(<Harness field={LIMIT} fields={[LIMIT]} initial={{}} over={{ computedSymbols: new Set(['ac_as_ratio_limit']) }} />);
    expect(screen.getByTestId('lookup-fill-value')).toHaveTextContent('— (kein Tab. 6-Grenzwert)');
  });

  it('serverComputedSet by field id also forces display mode; the widget never fills even when the row resolves', () => {
    const setField = vi.fn();
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ 'f-surf': { type: 'enum', value: 'schwarzdecke_asphalt' } }} over={{ serverComputedSet: new Set(['f-c']) }} onSet={setField} />);
    expect(screen.getByTestId('lookup-fill').dataset.mode).toBe('display');
    expect(screen.getByTestId('lookup-source')).toHaveTextContent(`Tab. 9: ${String(TAB9_ASPHALT_CM).replace('.', ',')}`);
    expect(screen.getByTestId('lookup-fill-value')).toHaveTextContent('—');
    expect(setField).not.toHaveBeenCalled();
  });

  it('a field without any binding falls through to renderDynamic', () => {
    const plain = makeField({ id: 'f-plain', symbol: 'plain', labelDe: 'Plain' });
    render(<Harness field={plain} fields={[plain]} initial={{}} />);
    expect(screen.getByTestId('dynamic-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('lookup-fill')).toBeNull();
  });
});

describe('LookupFillField — fill mode (client-owned scalar, DB binding, policy from the table)', () => {
  it('fills the store from the table when the stored value is null; the badge names the source', async () => {
    const setField = vi.fn();
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ 'f-surf': { type: 'enum', value: 'schwarzdecke_asphalt' } }} onSet={setField} />);
    expect(screen.getByTestId('lookup-fill').dataset.mode).toBe('fill');
    await waitFor(() => expect(setField).toHaveBeenCalledWith('f-c', { type: 'number', value: TAB9_ASPHALT_CM }));
    expect(setField).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('lookup-source')).toHaveTextContent('Tab. 9: 0,9');
    expect(screen.getByTestId('lookup-source')).not.toHaveTextContent('Grenzwert');
    expect(screen.getByTestId('lookup-fill-value')).toHaveTextContent('0,9');
    expect(screen.getByTestId('lookup-source').getAttribute('title')).toMatch(/^Tab\. 9: Schwarzdecken/);
  });

  it('does NOT fill while the key is unset (keys_missing badge) and does NOT fill when readOnly', () => {
    const setField = vi.fn();
    const { unmount } = render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{}} onSet={setField} />);
    expect(screen.getByTestId('lookup-source')).toHaveTextContent('Tab. 9: — (Schlüssel fehlt: surface_type)');
    expect(setField).not.toHaveBeenCalled();
    unmount();
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ 'f-surf': { type: 'enum', value: 'schwarzdecke_asphalt' } }} over={{ readOnly: true }} onSet={setField} />);
    expect(setField).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('an unknown key value ⇒ no_row badge, nothing written', () => {
    const setField = vi.fn();
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ 'f-surf': { type: 'enum', value: 'mondgestein' } }} onSet={setField} />);
    expect(screen.getByTestId('lookup-source')).toHaveTextContent('Tab. 9: — (keine Zeile für [mondgestein])');
    expect(setField).not.toHaveBeenCalled();
  });

  it('anhaltswert: "abweichend wählen" exposes the input + reason; "Abweichung begründen" records the reason via recordManualOverride with equationNumber lookup:TAB9', async () => {
    const setField = vi.fn();
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ 'f-surf': { type: 'enum', value: 'schwarzdecke_asphalt' }, 'f-c': { type: 'number', value: TAB9_ASPHALT_CM } }} onSet={setField} />);
    // Not overridden ⇒ read-only span, no input yet.
    expect(screen.queryByRole('spinbutton')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    const input = screen.getByLabelText('c_test (abweichend)') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '0.75' } });
    expect(setField).toHaveBeenCalledWith('f-c', { type: 'number', value: 0.75 });
    // The printed value stays visible on the badge.
    expect(screen.getByTestId('lookup-source')).toHaveTextContent('Tab. 9: 0,9');
    const submit = screen.getByRole('button', { name: 'Abweichung begründen' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Begründung der Abweichung'), { target: { value: 'kurz' } });
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Begründung der Abweichung'), { target: { value: 'Örtliche Messung 2026' } });
    expect(submit.disabled).toBe(false);
    await act(async () => { fireEvent.click(submit); });
    expect(recordManualOverride).toHaveBeenCalledWith({ projectId: 'p', fieldId: 'f-c', equationNumber: 'lookup:TAB9', reason: 'Örtliche Messung 2026' });
    expect(await screen.findByText('✓ Abweichung begründet')).toBeInTheDocument();
    expect(screen.getByTestId('lookup-source')).toHaveTextContent('Tab. 9: 0,9');
    // The override never re-fills: setField was called exactly once (the engineer's 0.75).
    expect(setField).toHaveBeenCalledTimes(1);
  });

  it('a failed audit write surfaces the server error and keeps the reason form open', async () => {
    vi.mocked(recordManualOverride).mockResolvedValueOnce({ ok: false, error: 'project_not_found' });
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ 'f-surf': { type: 'enum', value: 'schwarzdecke_asphalt' }, 'f-c': { type: 'number', value: 0.75 } }} />);
    // stored 0.75 ≠ 0.9 ⇒ overridden on mount ⇒ input + reason visible without clicking.
    expect(screen.getByLabelText('c_test (abweichend)')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Begründung der Abweichung'), { target: { value: 'Örtliche Messung 2026' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Abweichung begründen' })); });
    expect(await screen.findByText('project_not_found')).toBeInTheDocument();
    expect(screen.queryByText('✓ Abweichung begründet')).toBeNull();
    expect(screen.getByLabelText('Begründung der Abweichung')).toBeInTheDocument();
  });

  it('reason_min_length from ui_config raises the bar (never below the server minimum of 10)', () => {
    const f = makeField({ ...C_TEST, uiConfig: { reason_min_length: 20 } });
    render(<Harness field={f} fields={[f, SURFACE]} initial={{ 'f-surf': { type: 'enum', value: 'schwarzdecke_asphalt' }, 'f-c': { type: 'number', value: 0.75 } }} />);
    const submit = screen.getByRole('button', { name: 'Abweichung begründen' }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText('Begründung der Abweichung'), { target: { value: 'zwölf Zeichen!' } }); // 14 chars ≥ 10 but < 20
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Begründung der Abweichung'), { target: { value: 'Örtliche Messung vom 12.09.2026' } });
    expect(submit.disabled).toBe(false);
  });

  it('"Tab. 9 übernehmen" writes the table value back', () => {
    const setField = vi.fn();
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ 'f-surf': { type: 'enum', value: 'schwarzdecke_asphalt' }, 'f-c': { type: 'number', value: 0.75 } }} onSet={setField} />);
    expect(screen.queryByRole('button', { name: 'abweichend wählen' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tab. 9 übernehmen' }));
    expect(setField).toHaveBeenCalledWith('f-c', { type: 'number', value: TAB9_ASPHALT_CM });
    // Back to the read-only span + the "abweichend wählen" affordance.
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.getByRole('button', { name: 'abweichend wählen' })).toBeInTheDocument();
  });

  it('a key change re-fills ONLY when the stored value still equals the previous table value (no override in play)', async () => {
    const KIES_CM = resolveRegulationTable(STD, 'TAB9')!.rows.find((r) => r.row_key === 'kiesbelag_locker')!.values.cm as number;
    const controls = (set: (id: string, v: FieldValue) => void) => <button type="button" onClick={() => set('f-surf', { type: 'enum', value: 'kiesbelag_locker' })}>→ kies</button>;
    // (a) stored == asphalt table value ⇒ not overridden ⇒ the new row's value is filled in.
    const setA = vi.fn();
    const a = render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ 'f-surf': { type: 'enum', value: 'schwarzdecke_asphalt' }, 'f-c': { type: 'number', value: TAB9_ASPHALT_CM } }} onSet={setA} controls={controls} />);
    expect(setA).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '→ kies' }));
    await waitFor(() => expect(setA).toHaveBeenCalledWith('f-c', { type: 'number', value: KIES_CM }));
    expect(setA).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('lookup-source')).toHaveTextContent('Tab. 9: 0,2');
    a.unmount();
    // (b) stored 0.75 ≠ asphalt ⇒ overridden ⇒ a key change never overwrites the engineer's value.
    const setB = vi.fn();
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ 'f-surf': { type: 'enum', value: 'schwarzdecke_asphalt' }, 'f-c': { type: 'number', value: 0.75 } }} onSet={setB} controls={controls} />);
    fireEvent.click(screen.getByRole('button', { name: '→ kies' }));
    expect(screen.getByTestId('lookup-source')).toHaveTextContent('Tab. 9: 0,2');
    expect(setB).not.toHaveBeenCalled();
    expect(screen.getByLabelText('c_test (abweichend)')).toBeInTheDocument();
  });

  it('locked policy (TAB6 binding on a client-owned field) renders lookup-locked and no button', async () => {
    const setField = vi.fn();
    const tier = makeField({ id: 'f-tier', symbol: 'tab6_tier', dataType: 'enum' });
    const band = makeField({ id: 'f-band', symbol: 'bbz_band', dataType: 'enum' });
    const lim = makeField({ id: 'f-l', symbol: 'lim_test', labelDe: 'lim_test', widget: 'lookup_fill', lookup: { table_code: 'TAB6', role: 'limit', keys: [{ column: 'tier', from_symbol: 'tab6_tier' }, { column: 'bbz_band', from_symbol: 'bbz_band' }], value: 'max' } });
    render(<Harness field={lim} fields={[lim, tier, band]} initial={{ 'f-tier': { type: 'enum', value: 'tier2' }, 'f-band': { type: 'enum', value: 'thick' } }} onSet={setField} />);
    const max = resolveRegulationTable(STD, 'TAB6')!.rows.find((r) => r.row_key === 'tier2|thick')!.values.max as number;
    await waitFor(() => expect(setField).toHaveBeenCalledWith('f-l', { type: 'number', value: max }));
    expect(screen.getByTestId('lookup-locked')).toHaveTextContent('nach Tab. 6 festgelegt — keine Abweichung (Dokumentierte Abweichung: eigener Workflow)');
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.getByTestId('lookup-source')).toHaveTextContent(`Tab. 6: ${max} (Grenzwert)`);
  });

  it('kann: the editable control is a select over the printed alternatives only; messwert labels the input as Messwert', async () => {
    const synthetic = (policy: RegulationTable['override_policy']): RegulationTable => ({
      standard_code: 'SYN-1', edition: '2026-01', table_code: 'TAB1', title_de: 'Synthetisch', clause_reference: null, page_ref: null,
      key_columns: ['k'], value_columns: [{ name: 'v', type: 'number', values: ['1', '2.5', '4'] }], override_policy: policy, override_quote: null,
      verification_status: 'imported_unverified',
      rows: [{ row_key: 'a', keys: { k: 'a' }, group_label: null, label_de: 'A', order_index: 0, values: { v: 2.5 }, verbatim_quote: 'Tab. 1: A — 2,5' }],
    });
    const kField = makeField({ id: 'f-k', symbol: 'k', dataType: 'enum' });
    const vField = makeField({ id: 'f-v', symbol: 'v_test', labelDe: 'v_test', widget: 'lookup_fill', lookup: { table_code: 'TAB1', role: 'value', keys: [{ column: 'k', from_symbol: 'k' }], value: 'v' } });

    registerTables([synthetic('kann')]);
    const setField = vi.fn();
    const r1 = render(<Harness field={vField} fields={[vField, kField]} initial={{ 'f-k': { type: 'enum', value: 'a' }, 'f-v': { type: 'number', value: 2.5 } }} over={{ standardCode: 'SYN-1' }} onSet={setField} />);
    fireEvent.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    const select = screen.getByLabelText('v_test (abweichend)') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect([...select.options].map((o) => o.value)).toEqual(['1', '2.5', '4']);
    fireEvent.change(select, { target: { value: '4' } });
    expect(setField).toHaveBeenCalledWith('f-v', { type: 'number', value: 4 });
    expect(screen.queryByRole('spinbutton')).toBeNull();
    r1.unmount();
    clearTables();

    registerTables([synthetic('messwert')]);
    render(<Harness field={vField} fields={[vField, kField]} initial={{ 'f-k': { type: 'enum', value: 'a' }, 'f-v': { type: 'number', value: 2.5 } }} over={{ standardCode: 'SYN-1' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    expect(screen.getByLabelText('v_test (Messwert)')).toBeInTheDocument();
    expect(screen.getByLabelText('Begründung der Abweichung')).toBeInTheDocument();
  });
});

describe('LookupFillField — fix round 1 pins', () => {
  const ASPHALT = { 'f-surf': { type: 'enum', value: 'schwarzdecke_asphalt' } } as const;

  it('display mode also covers an INHERITED copy (inheritedFromWorksheet): no write, no controls, source-only badge', () => {
    const setField = vi.fn();
    const inherited = makeField({ ...C_TEST, inheritedFromWorksheet: 'A138-07' });
    render(<Harness field={inherited} fields={[inherited, SURFACE]} initial={{ ...ASPHALT }} onSet={setField} />);
    expect(screen.getByTestId('lookup-fill').dataset.mode).toBe('display');
    expect(screen.getByTestId('lookup-source')).toHaveTextContent('Tab. 9: 0,9');
    expect(screen.queryByRole('button')).toBeNull();
    expect(setField).not.toHaveBeenCalled();
  });

  it('display mode: an unresolved row shows the source only (no "Schlüssel fehlt"); a resolved row shows the figure', () => {
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{}} over={{ serverComputedSet: new Set(['f-c']) }} />);
    expect(screen.getByTestId('lookup-source')).toHaveTextContent(/^Tab\. 9$/);
  });

  it('an override without a saved reason shows "Begründung fehlt" (lookup-reason-missing) — visible state, no gate', async () => {
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ ...ASPHALT, 'f-c': { type: 'number', value: 0.75 } }} />);
    expect(screen.getByTestId('lookup-reason-missing')).toHaveTextContent('Begründung fehlt');
    fireEvent.change(screen.getByLabelText('Begründung der Abweichung'), { target: { value: 'Örtliche Messung 2026' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Abweichung begründen' })); });
    expect(await screen.findByText('✓ Abweichung begründet')).toBeInTheDocument();
    expect(screen.queryByTestId('lookup-reason-missing')).toBeNull();
  });

  it('deviate → justify → "übernehmen" → deviate again ⇒ NO ✓ (confirmation cleared), reason-missing shown again', async () => {
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ ...ASPHALT, 'f-c': { type: 'number', value: TAB9_ASPHALT_CM } }} />);
    fireEvent.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    fireEvent.change(screen.getByLabelText('c_test (abweichend)'), { target: { value: '0.75' } });
    fireEvent.change(screen.getByLabelText('Begründung der Abweichung'), { target: { value: 'Örtliche Messung 2026' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Abweichung begründen' })); });
    expect(await screen.findByText('✓ Abweichung begründet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tab. 9 übernehmen' }));
    expect(screen.getByTestId('lookup-fill-value')).toHaveTextContent('0,9');
    fireEvent.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    fireEvent.change(screen.getByLabelText('c_test (abweichend)'), { target: { value: '0.6' } });
    expect(screen.queryByText('✓ Abweichung begründet')).toBeNull();
    expect(screen.getByTestId('lookup-reason-missing')).toBeInTheDocument();
    expect(screen.getByLabelText('Begründung der Abweichung')).toBeInTheDocument();
    expect(recordManualOverride).toHaveBeenCalledTimes(1);
  });

  it('changing the value AFTER a confirmation (without übernehmen) also drops the ✓ — the confirmation is keyed by (fieldId, value)', async () => {
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ ...ASPHALT, 'f-c': { type: 'number', value: 0.75 } }} />);
    fireEvent.change(screen.getByLabelText('Begründung der Abweichung'), { target: { value: 'Örtliche Messung 2026' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Abweichung begründen' })); });
    expect(await screen.findByText('✓ Abweichung begründet')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('c_test (abweichend)'), { target: { value: '0.5' } });
    expect(screen.queryByText('✓ Abweichung begründet')).toBeNull();
    expect(screen.getByTestId('lookup-reason-missing')).toBeInTheDocument();
  });

  it('keys → row A (fill a), keys cleared (no write), keys → row B ⇒ re-fills b — never a phantom "abweichend"', async () => {
    const KIES_CM = resolveRegulationTable(STD, 'TAB9')!.rows.find((r) => r.row_key === 'kiesbelag_locker')!.values.cm as number;
    const setField = vi.fn();
    const controls = (set: (id: string, v: FieldValue) => void) => (
      <>
        <button type="button" onClick={() => set('f-surf', { type: 'enum', value: null })}>→ clear</button>
        <button type="button" onClick={() => set('f-surf', { type: 'enum', value: 'kiesbelag_locker' })}>→ kies</button>
      </>
    );
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ ...ASPHALT }} onSet={setField} controls={controls} />);
    await waitFor(() => expect(setField).toHaveBeenCalledWith('f-c', { type: 'number', value: TAB9_ASPHALT_CM }));
    fireEvent.click(screen.getByRole('button', { name: '→ clear' }));
    expect(screen.getByTestId('lookup-source')).toHaveTextContent('Schlüssel fehlt: surface_type');
    expect(setField).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '→ kies' }));
    await waitFor(() => expect(setField).toHaveBeenCalledWith('f-c', { type: 'number', value: KIES_CM }));
    expect(setField).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('abweichend')).toBeNull();
    expect(screen.queryByTestId('lookup-reason-missing')).toBeNull();
    expect(screen.getByTestId('lookup-fill-value')).toHaveTextContent('0,2');
  });

  it('Plan 2b close-out: a key change WHILE EDITING resets the deviation (treated as "übernehmen") — no phantom "abweichend" against the new row', async () => {
    const KIES_CM = resolveRegulationTable(STD, 'TAB9')!.rows.find((r) => r.row_key === 'kiesbelag_locker')!.values.cm as number;
    const setField = vi.fn();
    const controls = (set: (id: string, v: FieldValue) => void) => <button type="button" onClick={() => set('f-surf', { type: 'enum', value: 'kiesbelag_locker' })}>→ kies</button>;
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ ...ASPHALT }} onSet={setField} controls={controls} />);
    await waitFor(() => expect(setField).toHaveBeenCalledWith('f-c', { type: 'number', value: TAB9_ASPHALT_CM }));
    // open the deviation against the ASPHALT row and type a value (editing mode)
    fireEvent.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    fireEvent.change(screen.getByLabelText('c_test (abweichend)'), { target: { value: '0.5' } });
    expect(setField).toHaveBeenLastCalledWith('f-c', { type: 'number', value: 0.5 });
    expect(screen.getByText('abweichend')).toBeInTheDocument();
    // the sibling key moves to another row: the in-progress deviation was against the old row
    fireEvent.click(screen.getByRole('button', { name: '→ kies' }));
    await waitFor(() => expect(setField).toHaveBeenLastCalledWith('f-c', { type: 'number', value: KIES_CM }));
    expect(screen.queryByLabelText('c_test (abweichend)')).toBeNull();
    expect(screen.queryByText('abweichend')).toBeNull();
    expect(screen.queryByTestId('lookup-reason-missing')).toBeNull();
    expect(screen.getByTestId('lookup-fill-value')).toHaveTextContent('0,2');
    expect(screen.getByRole('button', { name: 'abweichend wählen' })).toBeInTheDocument();
  });

  it('clearing the number input keeps it empty (writes null, no snap-back to the table value)', async () => {
    const setField = vi.fn();
    render(<Harness field={C_TEST} fields={[C_TEST, SURFACE]} initial={{ ...ASPHALT, 'f-c': { type: 'number', value: 0.75 } }} onSet={setField} />);
    fireEvent.change(screen.getByLabelText('c_test (abweichend)'), { target: { value: '' } });
    expect(setField).toHaveBeenLastCalledWith('f-c', { type: 'number', value: null });
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(setField).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText('c_test (abweichend)') as HTMLInputElement).value).toBe('');
    // "übernehmen" is the way back to the table value.
    fireEvent.click(screen.getByRole('button', { name: 'Tab. 9 übernehmen' }));
    expect(setField).toHaveBeenLastCalledWith('f-c', { type: 'number', value: TAB9_ASPHALT_CM });
  });

  it('kann: the placeholder option never writes 0', () => {
    registerTables([{
      standard_code: 'SYN-2', edition: '2026-01', table_code: 'TAB1', title_de: 'Synthetisch', clause_reference: null, page_ref: null,
      key_columns: ['k'], value_columns: [{ name: 'v', type: 'number', values: ['1', '2.5', '4'] }], override_policy: 'kann', override_quote: null,
      verification_status: 'imported_unverified',
      rows: [{ row_key: 'a', keys: { k: 'a' }, group_label: null, label_de: 'A', order_index: 0, values: { v: 2.5 }, verbatim_quote: 'Tab. 1: A — 2,5' }],
    }]);
    const kField = makeField({ id: 'f-k', symbol: 'k', dataType: 'enum' });
    const vField = makeField({ id: 'f-v', symbol: 'v_test', labelDe: 'v_test', widget: 'lookup_fill', lookup: { table_code: 'TAB1', role: 'value', keys: [{ column: 'k', from_symbol: 'k' }], value: 'v' } });
    const setField = vi.fn();
    render(<Harness field={vField} fields={[vField, kField]} initial={{ 'f-k': { type: 'enum', value: 'a' }, 'f-v': { type: 'number', value: 4 } }} over={{ standardCode: 'SYN-2' }} onSet={setField} />);
    const select = screen.getByLabelText('v_test (abweichend)') as HTMLSelectElement;
    // A change to '' (the placeholder path) must be a no-op — never `Number('') === 0`.
    fireEvent.change(select, { target: { value: '' } });
    expect(setField).not.toHaveBeenCalledWith('f-v', { type: 'number', value: 0 });
    expect(setField).not.toHaveBeenCalled();
  });
});
