/**
 * Plan 2b Task 7 — render proof through the REAL WorksheetForm:
 *  - A138-12 `ac_as_ratio_limit` (widget NULL ⇒ LOOKUP_BINDINGS_FALLBACK) renders
 *    through WIDGETS.lookup_fill in DISPLAY mode: LOADING_CHECK_SYMBOLS marks it
 *    server-owned, so the persisted value shows read-only with the Tab. 6 badge and
 *    the store is never written by the widget (the materialiser stays the producer);
 *  - the null case keeps today's wording (`— (kein Tab. 6-Grenzwert)`) — the
 *    `ac-as-ratio-limit-null` testid of the DynamicField path maps to `lookup-fill-value`;
 *  - a DB `widget='lookup_fill'` number field nobody owns renders in FILL mode and
 *    writes the table value into the store exactly once.
 * Scaffolding (mock list, PROPS shape, store init) reused from widgets-form-render.test.tsx.
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
import { render, screen, act, waitFor, within } from '@testing-library/react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { WorksheetForm } from '../worksheet-form';
import { resolveRegulationTable } from '@/lib/eval/regulation-tables-fallback';

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

const LIMIT = makeField({ id: 'f-lim', symbol: 'ac_as_ratio_limit', labelDe: 'Grenzwert A_C/A_S,m (Tab. 6)', sectionId: 's1', orderIndex: 0 });
const SURFACE = makeField({
  id: 'f-surf', symbol: 'surface_type', labelDe: 'Oberfläche', sectionId: 's1', orderIndex: 1, dataType: 'enum' as const,
  enumValues: [{ value: 'schwarzdecke_asphalt', labelDe: 'Asphalt', labelEn: null }],
});
const C_FILL = makeField({
  id: 'f-c', symbol: 'c_fill', labelDe: 'Abflussbeiwert aus Tab. 9', sectionId: 's1', orderIndex: 2,
  widget: 'lookup_fill', lookup: { table_code: 'TAB9', role: 'value', keys: [{ column: 'surface_type', from_symbol: 'surface_type' }], value: 'cm' },
});

const PROPS = {
  locale: 'de' as const,
  projectId: 'p',
  worksheet: { template: { code: 'A138-12', titleDe: 'T', titleEn: null } },
  instance: { id: 'inst-lookup', status: 'draft' as const },
  sections: SECTIONS,
  fields: [LIMIT, SURFACE, C_FILL],
  equations: [],
  complianceRequirements: [],
  complianceSuggestions: [],
  initialValues: {},
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: {},
  standardCode: 'DWA-A-138-1',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

describe('WorksheetForm — lookup_fill through the ONE renderer path', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it('A138-12 ac_as_ratio_limit (widget NULL) renders in DISPLAY mode: read-only persisted value, Tab. 6 badge, store untouched', async () => {
    act(() => { useWorksheetStore.getState().init('inst-lookup', { 'f-lim': { type: 'number', value: 30 } }, {}, {}); });
    render(<WorksheetForm {...PROPS} initialValues={{ 'f-lim': { type: 'number', value: 30 } }} />);
    const root = screen.getAllByTestId('lookup-fill').find((r) => r.dataset.symbol === 'ac_as_ratio_limit')!;
    expect(root.dataset.mode).toBe('display');
    expect(within(root).getByTestId('lookup-fill-value')).toHaveTextContent('30');
    // Fix round 1 ruling: display mode names the SOURCE only (no key diagnostics).
    expect(within(root).getByTestId('lookup-source')).toHaveTextContent('Tab. 6 (Grenzwert)');
    expect(within(root).getByTestId('lookup-source')).not.toHaveTextContent('Schlüssel fehlt');
    expect(screen.queryByRole('button', { name: 'abweichend wählen' })).toBeNull();
    // No DynamicField number input for the limit (the old read-only input is gone; the null testid maps to lookup-fill-value).
    expect(screen.queryByLabelText('Grenzwert A_C/A_S,m (Tab. 6)', { exact: false })).toBeNull();
    expect(screen.queryByTestId('ac-as-ratio-limit-null')).toBeNull();
    // Wait for any fill effect of the sibling lookup_fill field to settle, then prove the limit was never written.
    await waitFor(() => expect(useWorksheetStore.getState().values['f-lim']).toEqual({ type: 'number', value: 30 }));
    expect(useWorksheetStore.getState().pendingFieldIds.has('f-lim')).toBe(false);
  });

  it('null persisted limit ⇒ "— (kein Tab. 6-Grenzwert)" (today\'s ac-as-ratio-limit-null wording, generic)', () => {
    render(<WorksheetForm {...PROPS} />);
    const root = screen.getAllByTestId('lookup-fill').find((r) => r.dataset.symbol === 'ac_as_ratio_limit')!;
    expect(within(root).getByTestId('lookup-fill-value')).toHaveTextContent('— (kein Tab. 6-Grenzwert)');
  });

  it('a DB widget=lookup_fill field nobody owns renders in FILL mode and writes the TAB9 value into the store once the key resolves', async () => {
    const asphaltCm = resolveRegulationTable('DWA-A-138-1', 'TAB9')!.rows.find((r) => r.row_key === 'schwarzdecke_asphalt')!.values.cm as number;
    act(() => { useWorksheetStore.getState().init('inst-lookup', { 'f-surf': { type: 'enum', value: 'schwarzdecke_asphalt' } }, {}, {}); });
    render(<WorksheetForm {...PROPS} initialValues={{ 'f-surf': { type: 'enum', value: 'schwarzdecke_asphalt' } }} />);
    const roots = screen.getAllByTestId('lookup-fill');
    const fill = roots.find((r) => r.dataset.symbol === 'c_fill')!;
    expect(fill.dataset.mode).toBe('fill');
    await waitFor(() => expect(useWorksheetStore.getState().values['f-c']).toEqual({ type: 'number', value: asphaltCm }));
    expect(useWorksheetStore.getState().pendingFieldIds.has('f-c')).toBe(true);
    // The limit field (display mode) was still not written.
    expect(useWorksheetStore.getState().values['f-lim']).toBeUndefined();
  });
});
