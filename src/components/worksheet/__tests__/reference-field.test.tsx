/**
 * Plan 2b Task 6 — the `reference` widget renders a select over ANOTHER
 * carrier's rows and stores the chosen row ID (never a copied value).
 *
 * Plan 2b: the three RainfallTableSelector pins are moved here from
 * rainfall-table-selector.test.tsx (component deleted); rendered through
 * ReferenceField with the rainfall_table_ref fallback config (widget IS NULL).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReferenceField } from '../reference-field';
import type { WidgetContext, WorksheetFormField } from '../widgets';
import type { FieldValue } from '@/lib/state/worksheet-store';
import { type RainfallTable, RETURN_PERIODS } from '@/lib/eval/rainfall-tables';

const TABLES: RainfallTable[] = [
  { id: 'k1', name: 'KOSTRA Krefeld', source: 'KOSTRA-DWD-2020', columns: [...RETURN_PERIODS], rows: [] },
  { id: 'l1', name: 'Lokal 531', source: 'DWA-A-531-local', columns: [...RETURN_PERIODS], rows: [] },
];

function makeField(over: Partial<WorksheetFormField>): WorksheetFormField {
  return {
    id: '', symbol: '', labelDe: '', labelEn: null, unit: null, dataType: 'text', isRequired: false, enumValues: null,
    validationRules: null, clauseReference: null, verificationStatus: 'x', description: null, sectionId: 's1',
    orderIndex: 0, active: true, widget: null, uiConfig: null, lookup: null, visibleWhen: null,
    ...over,
  } as WorksheetFormField;
}

const KOSTRA = makeField({ id: 'f-kostra', symbol: 'r_D_n_table', labelDe: 'KOSTRA', dataType: 'json' });
const REF = makeField({ id: 'f-ref', symbol: 'rainfall_table_ref', labelDe: 'Verwendete Regenspendentabelle' });

function makeCtx(over: Partial<WidgetContext> & { values?: Record<string, FieldValue | undefined> } = {}): WidgetContext {
  return {
    standardCode: 'DWA-A-138-1', locale: 'de', projectId: 'p', readOnly: false,
    fieldBySymbol: new Map([[KOSTRA.symbol, KOSTRA], [REF.symbol, REF]]),
    values: { 'f-kostra': { type: 'json', value: { tables: TABLES } }, 'f-ref': { type: 'text', value: 'k1' } },
    setField: vi.fn(), symbolLookup: () => undefined, engineStates: {}, equations: [], computedSymbols: new Set(),
    serverComputedSet: new Set(), rainfallDesignReturnPeriod: null,
    renderDynamic: (f) => <input data-testid="dynamic-fallback" aria-label={f.labelDe} />,
    ...over,
  };
}

describe('ReferenceField — rainfall_table_ref through the fallback config', () => {
  // Plan 2b: moved from rainfall-table-selector.test.tsx (onSelect(id) ⇒ setField(id, { type: 'text', value: id })).
  it('lists one option per table and selecting one calls setField with its id (stored shape { type: "text" })', () => {
    const ctx = makeCtx();
    render(<ReferenceField field={REF} ctx={ctx} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(screen.getByRole('option', { name: /KOSTRA Krefeld/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Lokal 531/ })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'l1' } });
    expect(ctx.setField).toHaveBeenCalledWith('f-ref', { type: 'text', value: 'l1' });
  });

  // Plan 2b: moved from rainfall-table-selector.test.tsx.
  it('never renders an r_D(n) value input (table-selection only)', () => {
    render(<ReferenceField field={REF} ctx={makeCtx()} />);
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  // Plan 2b: moved from rainfall-table-selector.test.tsx.
  it('is disabled when readOnly', () => {
    render(<ReferenceField field={REF} ctx={makeCtx({ readOnly: true })} />);
    expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(true);
  });

  it('badge labels come from ui_config.badge_labels; title + aria-label from the config', () => {
    render(<ReferenceField field={REF} ctx={makeCtx()} />);
    expect(screen.getByRole('option', { name: 'KOSTRA Krefeld · KOSTRA' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Lokal 531 · DWA-A 531' })).toBeInTheDocument();
    expect(screen.getByLabelText('Regenspendentabelle wählen')).toBeInTheDocument();
    expect(screen.getByText('Regenspendentabelle (Quelle für r_D(n))')).toBeInTheDocument();
    expect(screen.getByTestId('reference-field').dataset.symbol).toBe('rainfall_table_ref');
    expect(screen.getByTestId('reference-select')).toBe(screen.getByRole('combobox'));
  });

  it('a legacy 1-D r_D_n_table carrier is normalised through CARRIER_NORMALISERS before rows_path', () => {
    const ctx = makeCtx({ values: { 'f-kostra': { type: 'json', value: { rows: [{ D_min: 10, r_D_n: 100 }] } }, 'f-ref': { type: 'text', value: null } } });
    render(<ReferenceField field={REF} ctx={ctx} />);
    expect(screen.getByRole('option', { name: 'Standardtabelle · Ingenieur' })).toBeInTheDocument();
  });

  it('the placeholder option shows only while the stored value is null (empty_label from the config)', () => {
    render(<ReferenceField field={REF} ctx={makeCtx({ values: { 'f-kostra': { type: 'json', value: { tables: TABLES } }, 'f-ref': { type: 'text', value: null } } })} />);
    expect(screen.getByRole('option', { name: '— Tabelle wählen —' })).toBeInTheDocument();
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('');
  });

  it('no placeholder once a value is stored; the stored id is the selected option', () => {
    render(<ReferenceField field={REF} ctx={makeCtx()} />);
    expect(screen.queryByRole('option', { name: '— Tabelle wählen —' })).toBeNull();
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('k1');
  });

  it('carrier not on this worksheet (not inherited yet) ⇒ empty notice naming the carrier symbol, never a raw text input', () => {
    const ctx = makeCtx({ fieldBySymbol: new Map([[REF.symbol, REF]]), values: { 'f-ref': { type: 'text', value: null } } });
    render(<ReferenceField field={REF} ctx={ctx} />);
    expect(screen.getByTestId('reference-empty').textContent).toBe('Keine Einträge in „r_D_n_table“ — zuerst im vorgelagerten Arbeitsblatt erfassen.');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByTestId('dynamic-fallback')).toBeNull();
    expect(screen.queryByRole('option', { name: /Krefeld/ })).toBeNull();
  });

  it('carrier present but empty ⇒ the same empty notice', () => {
    const ctx = makeCtx({ values: { 'f-kostra': { type: 'json', value: { tables: [] } }, 'f-ref': { type: 'text', value: null } } });
    render(<ReferenceField field={REF} ctx={ctx} />);
    expect(screen.getByTestId('reference-empty')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('an enum-typed reference field stores { type: "enum" } (data_type decides the stored tag, never the widget)', () => {
    const ctx = makeCtx({ values: { 'f-kostra': { type: 'json', value: { tables: TABLES } }, 'f-ref': { type: 'enum', value: 'k1' } } });
    render(<ReferenceField field={makeField({ ...REF, dataType: 'enum' })} ctx={ctx} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'l1' } });
    expect(ctx.setField).toHaveBeenCalledWith('f-ref', { type: 'enum', value: 'l1' });
  });

  it('a DB `reference` field with a different carrier binding reads THAT carrier (DB config wins over the fallback)', () => {
    const OTHER = makeField({ id: 'f-other', symbol: 'soil_profiles', dataType: 'json' });
    const dbRef = makeField({ id: 'f-ref', symbol: 'rainfall_table_ref', labelDe: 'Bodenprofil', widget: 'reference',
      uiConfig: { carrier_symbol: 'soil_profiles', rows_path: 'items', id_key: 'key', label_key: 'title' } });
    const ctx = makeCtx({
      fieldBySymbol: new Map([[KOSTRA.symbol, KOSTRA], [OTHER.symbol, OTHER]]),
      values: { 'f-kostra': { type: 'json', value: { tables: TABLES } }, 'f-other': { type: 'json', value: { items: [{ key: 'p1', title: 'Profil 1' }] } }, 'f-ref': { type: 'text', value: null } },
    });
    render(<ReferenceField field={dbRef} ctx={ctx} />);
    expect(screen.getByRole('option', { name: 'Profil 1' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Krefeld/ })).toBeNull();
    // No title/aria in the config ⇒ the field label serves both.
    expect(screen.getByLabelText('Bodenprofil')).toBe(screen.getByRole('combobox'));
  });

  it('a `reference` widget without a usable config falls back to the dynamic input with a visible notice (never silent)', () => {
    const broken = makeField({ id: 'f-ref', symbol: 'rainfall_table_ref', labelDe: 'Kaputt', widget: 'reference', uiConfig: { title: 'no binding' } });
    render(<ReferenceField field={broken} ctx={makeCtx()} />);
    expect(screen.getByTestId('reference-unconfigured').textContent).toBe('Referenz nicht konfiguriert (ui_config fehlt)');
    expect(screen.getByTestId('dynamic-fallback')).toBeInTheDocument();
  });
});

describe('ReferenceField — Task 8 sweep (Task 6 review items)', () => {
  it('the empty notice is phrasing content inside the <label> (span.block) and describes the disabled select via aria-describedby', () => {
    const ctx = makeCtx({ fieldBySymbol: new Map([[REF.symbol, REF]]), values: { 'f-ref': { type: 'text', value: null } } });
    render(<ReferenceField field={REF} ctx={ctx} />);
    const notice = screen.getByTestId('reference-empty');
    expect(notice.tagName).toBe('SPAN');
    expect(notice.classList.contains('block')).toBe(true);
    expect(notice.id).not.toBe('');
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(select.getAttribute('aria-describedby')).toBe(notice.id);
    expect(select).toHaveAccessibleDescription(notice.textContent ?? '');
  });

  it('no empty notice ⇒ no dangling aria-describedby on the select', () => {
    render(<ReferenceField field={REF} ctx={makeCtx()} />);
    expect(screen.getByRole('combobox').getAttribute('aria-describedby')).toBeNull();
  });

  it('a stored id that is not among the rows ⇒ placeholder option selected + hint naming the engine\'s fallback (rows[0], the resolveSelectedTable rule); the store is left untouched', () => {
    const ctx = makeCtx({ values: { 'f-kostra': { type: 'json', value: { tables: TABLES } }, 'f-ref': { type: 'text', value: 'gone-42' } } });
    render(<ReferenceField field={REF} ctx={ctx} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(screen.getByRole('option', { name: '— Tabelle wählen —' })).toBeInTheDocument();
    expect(select.value).toBe('');
    expect(select.disabled).toBe(false);
    const hint = screen.getByTestId('reference-stale');
    expect(hint.textContent).toBe('Verweis „gone-42“ nicht gefunden — die Berechnung verwendet bis zur Neuauswahl „KOSTRA Krefeld“. Bitte neu wählen.');
    expect(hint.tagName).toBe('SPAN');
    expect(select.getAttribute('aria-describedby')).toBe(hint.id);
    expect(ctx.setField).not.toHaveBeenCalled();
    // The real rows are still selectable.
    fireEvent.change(select, { target: { value: 'l1' } });
    expect(ctx.setField).toHaveBeenCalledWith('f-ref', { type: 'text', value: 'l1' });
  });

  it('a stored id that IS among the rows shows no stale hint', () => {
    render(<ReferenceField field={REF} ctx={makeCtx()} />);
    expect(screen.queryByTestId('reference-stale')).toBeNull();
  });
});

describe('ReferenceField — stale-ref hint tells the truth about the engine fallback (Task 8 fix round 1)', () => {
  it('readOnly + stale ⇒ the fallback is named, the imperative "neu wählen" is dropped, select disabled on the placeholder', () => {
    const ctx = makeCtx({ readOnly: true, values: { 'f-kostra': { type: 'json', value: { tables: TABLES } }, 'f-ref': { type: 'text', value: 'gone-42' } } });
    render(<ReferenceField field={REF} ctx={ctx} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(select.value).toBe('');
    const hint = screen.getByTestId('reference-stale');
    expect(hint.textContent).toBe('Verweis „gone-42“ nicht gefunden — die Berechnung verwendet „KOSTRA Krefeld“.');
    expect(hint.textContent).not.toMatch(/neu wählen/);
    expect(select.getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('stale + no rows ⇒ only the empty notice (nothing to fall back to), never a stale hint', () => {
    const ctx = makeCtx({ values: { 'f-kostra': { type: 'json', value: { tables: [] } }, 'f-ref': { type: 'text', value: 'gone-42' } } });
    render(<ReferenceField field={REF} ctx={ctx} />);
    expect(screen.getByTestId('reference-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('reference-stale')).toBeNull();
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('');
  });
});
