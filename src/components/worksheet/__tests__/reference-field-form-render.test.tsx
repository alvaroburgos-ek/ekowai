/**
 * Plan 2b Task 6 — render proof through the REAL WorksheetForm that
 * `rainfall_table_ref` (widget IS NULL ⇒ REFERENCE_CONFIGS_FALLBACK) renders
 * the `reference` widget IN ITS SECTION (no bottom strip, no h2), that the
 * carrier rows are the inherited/injected `r_D_n_table` json field's rows
 * (SR-1: never typed), that a selection stores the row ID with the unchanged
 * value shape `{ type: 'text', value: id }` (engine / report / snapshot read
 * exactly that), that `visible_when` hides it like any other widget, and that
 * an absent carrier renders the empty notice, never a raw text input.
 *
 * Testid mapping: `rainfall-table-ref-section` (pre-2b bottom section) →
 * `bottom-rainfall_table_ref` (Task 3 bottom strip) → `reference-field`
 * [data-symbol="rainfall_table_ref"] inside the field's own section (Task 6).
 * Scaffolding (mock list, PROPS shape, store init) reused from
 * widgets-form-render.test.tsx; SectionGroup is NOT mocked.
 */

vi.mock('@/lib/actions/worksheet', () => ({ saveWorksheet: vi.fn(async () => ({ ok: true, warnings: [] })) }));
vi.mock('@/lib/actions/worksheet-transition', () => ({ transitionWorksheet: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/citations', () => ({ addCitation: vi.fn(async () => ({ ok: true })), removeCitation: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/documents', () => ({ uploadDocument: vi.fn(async () => ({ ok: true, id: 'd' })) }));
vi.mock('@/lib/actions/client-supplied', () => ({ setClientSupplied: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/verification', () => ({
  verifyField: vi.fn(async () => ({ ok: true })),
  unverifyField: vi.fn(async () => ({ ok: true })),
  verifyEquation: vi.fn(async () => ({ ok: true })),
  unverifyEquation: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/project-standards', () => ({ addStandardByCodeToProject: vi.fn(async () => ({ ok: true })) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={String(href)}>{children}</a> }));
vi.mock('../equations-block', () => ({ EquationsBlock: () => null }));
vi.mock('../compliance-block', () => ({ ComplianceBlock: () => null }));
vi.mock('../approval-bar', () => ({ ApprovalBar: () => null }));
vi.mock('../equation-engine-card', () => ({ EquationEngineCard: () => null }));
vi.mock('../rainfall-tables-editor', () => ({ RainfallTablesEditor: () => null }));
vi.mock('../surface-source-banner', () => ({ SurfaceSourceBanner: () => null }));
vi.mock('@/components/form-templates/SourceFormReferencePanel', () => ({ SourceFormReferencePanel: () => null }));
vi.mock('@/components/documents/citation-picker', () => ({ CitationPicker: () => null }));
vi.mock('@/components/documents/citation-chips', () => ({ CitationChips: () => null }));
vi.mock('@/components/norm-text/clause-chip', () => ({ ClauseChip: () => null }));
vi.mock('../verify-button', () => ({ VerifyButton: () => null }));

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, within, fireEvent } from '@testing-library/react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { WorksheetForm } from '../worksheet-form';
import { RETURN_PERIODS } from '@/lib/eval/rainfall-tables';

function makeField(over: Record<string, unknown>) {
  return {
    id: '', symbol: '', labelDe: '', labelEn: null, unit: null,
    dataType: 'number' as const, isRequired: false, enumValues: null,
    validationRules: null, clauseReference: null, verificationStatus: 'x',
    description: null, sectionId: null, orderIndex: 0, active: true,
    widget: null, uiConfig: null, lookup: null, visibleWhen: null,
    ...over,
  };
}

const SECTIONS = [
  { id: 's1', code: 'A', titleDe: 'Abschnitt Eins', titleEn: null, orderIndex: 0, parentSectionId: null, visibleWhen: null },
];

const TABLES = [
  { id: 'k1', name: 'KOSTRA Krefeld', source: 'KOSTRA-DWD-2020', columns: [...RETURN_PERIODS], rows: [] },
  { id: 'l1', name: 'Lokal 531', source: 'DWA-A-531-local', columns: [...RETURN_PERIODS], rows: [] },
];

// The KOSTRA carrier lives on A138-04 and is INJECTED here as an inherited field
// (`inheritedFromWorksheet`), exactly how the consumer worksheets receive it.
const KOSTRA = makeField({ id: 'f-kostra', symbol: 'r_D_n_table', labelDe: 'Regenspendentabellen', sectionId: 's1', orderIndex: 0, dataType: 'json' as const, inheritedFromWorksheet: 'A138-04' });
const REF = makeField({ id: 'f-ref', symbol: 'rainfall_table_ref', labelDe: 'Verwendete Regenspendentabelle', sectionId: 's1', orderIndex: 1, dataType: 'text' as const });
const SCALAR = makeField({ id: 'f-q', symbol: 'q', labelDe: 'Skalar im Grid', sectionId: 's1', orderIndex: 2 });

const PROPS = {
  locale: 'de' as const,
  projectId: 'p',
  worksheet: { template: { code: 'A138-13', titleDe: 'T', titleEn: null } },
  instance: { id: 'inst-ref', status: 'draft' as const },
  sections: SECTIONS,
  fields: [KOSTRA, REF, SCALAR],
  equations: [],
  complianceRequirements: [],
  complianceSuggestions: [],
  initialValues: {},
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: { r_D_n_table: 'A138-04' },
  standardCode: 'DWA-A-138-1',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

const WITH_TABLES = { 'f-kostra': { type: 'json' as const, value: { tables: TABLES } } };

describe('WorksheetForm — rainfall_table_ref renders through the reference widget', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it('renders IN ITS SECTION (no bottom strip) with the inherited carrier rows as options; selecting stores { type: "text", value: id }', () => {
    render(<WorksheetForm {...PROPS} initialValues={WITH_TABLES} />);
    const fieldset = screen.getByRole('group', { name: /Abschnitt Eins/ });
    const widget = within(fieldset).getByTestId('reference-field');
    expect(widget.dataset.symbol).toBe('rainfall_table_ref');
    expect(screen.queryByTestId('bottom-rainfall_table_ref')).toBeNull();
    expect(screen.queryByText('Verwendete Regenspendentabelle', { selector: 'h2' })).toBeNull();
    const select = within(widget).getByRole('combobox') as HTMLSelectElement;
    expect(within(widget).getByRole('option', { name: 'KOSTRA Krefeld · KOSTRA' })).toBeInTheDocument();
    expect(within(widget).getByRole('option', { name: 'Lokal 531 · DWA-A 531' })).toBeInTheDocument();
    // Never a raw text input for the reference field.
    expect(screen.queryByRole('textbox', { name: /Verwendete Regenspendentabelle/ })).toBeNull();
    fireEvent.change(select, { target: { value: 'l1' } });
    // Stored-value-shape pin: the engine (use-equation-engine), report
    // (evaluate-for-report) and snapshot (payload) read a `text` id string.
    expect(useWorksheetStore.getState().values['f-ref']).toEqual({ type: 'text', value: 'l1' });
    expect(select.value).toBe('l1');
    // The scalar neighbour still renders as DynamicField.
    expect(screen.getByLabelText('Skalar im Grid', { exact: false })).toBeInTheDocument();
  });

  it('carrier absent (not inherited yet) ⇒ empty notice, never a raw text input', () => {
    render(<WorksheetForm {...PROPS} fields={[REF, SCALAR]} inheritedFromBySymbol={{}} />);
    const widget = screen.getByTestId('reference-field');
    expect(within(widget).getByTestId('reference-empty').textContent).toContain('r_D_n_table');
    expect(screen.queryByRole('textbox', { name: /Verwendete Regenspendentabelle/ })).toBeNull();
    expect(within(widget).queryByRole('option', { name: /Krefeld/ })).toBeNull();
  });

  it('hidden by visible_when ⇒ renders nothing (Plan 2a visibility applies to the reference widget like any other)', () => {
    render(<WorksheetForm {...PROPS} fields={[KOSTRA, { ...REF, visibleWhen: 'q > 100' }, SCALAR]} initialValues={{ ...WITH_TABLES, 'f-q': { type: 'number', value: 1 } }} />);
    expect(screen.queryByTestId('reference-field')).toBeNull();
    expect(screen.queryByRole('combobox', { name: /Regenspendentabelle/ })).toBeNull();
    expect(screen.queryByRole('textbox', { name: /Verwendete Regenspendentabelle/ })).toBeNull();
    // Both ways: the condition satisfied ⇒ the widget is back in its section.
    act(() => { useWorksheetStore.getState().setField('f-q', { type: 'number', value: 200 }); });
    expect(screen.getByTestId('reference-field').dataset.symbol).toBe('rainfall_table_ref');
  });

  it('a DB widget=reference row (post-migration) renders the same widget in its section from ui_config alone', () => {
    const DB_REF = { ...REF, widget: 'reference', uiConfig: { title: 'DB-Titel', carrier_symbol: 'r_D_n_table', rows_path: 'tables', id_key: 'id', label_key: 'name' } };
    render(<WorksheetForm {...PROPS} fields={[KOSTRA, DB_REF, SCALAR]} initialValues={{ ...WITH_TABLES, 'f-ref': { type: 'text', value: 'k1' } }} />);
    const fieldset = screen.getByRole('group', { name: /Abschnitt Eins/ });
    const widget = within(fieldset).getByTestId('reference-field');
    expect(within(widget).getByText('DB-Titel')).toBeInTheDocument();
    // No badge_key in this config ⇒ plain labels; stored id preselected; no placeholder.
    expect(within(widget).getByRole('option', { name: 'KOSTRA Krefeld' })).toBeInTheDocument();
    expect((within(widget).getByRole('combobox') as HTMLSelectElement).value).toBe('k1');
    expect(within(widget).queryByRole('option', { name: /wählen/ })).toBeNull();
  });

  it('locked instance ⇒ the select is disabled (readOnly through the WidgetContext)', () => {
    render(<WorksheetForm {...PROPS} instance={{ id: 'inst-ref', status: 'engineer_approved' as const }} initialValues={WITH_TABLES} />);
    expect((screen.getByTestId('reference-select') as HTMLSelectElement).disabled).toBe(true);
  });
});
