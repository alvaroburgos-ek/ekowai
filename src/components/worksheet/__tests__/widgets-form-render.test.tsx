/**
 * Plan 2b Task 3 — render proof through the REAL WorksheetForm that the ONE
 * renderer path (`WIDGETS[effectiveWidget(f)]`) dispatches by widget:
 *  - a `register` field renders the generic RegisterEditor IN ITS SECTION when
 *    ui_config.placement === 'section', and in the bottom strip (`bottom-<symbol>`,
 *    h2 = config title) when placement is absent (registerPlacement ⇒ bottom);
 *  - a `scalar` field still renders DynamicField (labelled input in the grid);
 *  - a register hidden by `visible_when` renders nothing (2a semantics kept);
 *  - bottom-strip order follows orderIndex.
 * Scaffolding (mock list, PROPS shape, store init) reused from
 * selection-dispatch-form-render.test.tsx; SectionGroup is NOT mocked.
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
vi.mock('../rainfall-table-selector', () => ({ RainfallTableSelector: () => null }));
vi.mock('../surface-source-banner', () => ({ SurfaceSourceBanner: () => null }));
vi.mock('@/components/form-templates/SourceFormReferencePanel', () => ({ SourceFormReferencePanel: () => null }));
vi.mock('@/components/documents/citation-picker', () => ({ CitationPicker: () => null }));
vi.mock('@/components/documents/citation-chips', () => ({ CitationChips: () => null }));
vi.mock('@/components/norm-text/clause-chip', () => ({ ClauseChip: () => null }));
vi.mock('../verify-button', () => ({ VerifyButton: () => null }));

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { WorksheetForm } from '../worksheet-form';

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

const REG_COLUMNS = [{ key: 'name', type: 'text', label: 'Name' }];

const FIELDS = [
  makeField({ id: 'f-scalar', symbol: 'q', labelDe: 'Skalar im Grid', sectionId: 's1', orderIndex: 0 }),
  makeField({
    id: 'f-reg-section', symbol: 'reg_in_section', labelDe: 'Register im Abschnitt', sectionId: 's1', orderIndex: 1,
    dataType: 'json' as const, widget: 'register', uiConfig: { title: 'Register (Abschnitt)', placement: 'section', columns: REG_COLUMNS },
  }),
  makeField({
    id: 'f-reg-bottom-b', symbol: 'reg_bottom_b', labelDe: 'Register unten B', sectionId: 's1', orderIndex: 5,
    dataType: 'json' as const, widget: 'register', uiConfig: { title: 'Register unten B', columns: REG_COLUMNS },
  }),
  makeField({
    id: 'f-reg-bottom-a', symbol: 'reg_bottom_a', labelDe: 'Register unten A', sectionId: 's1', orderIndex: 2,
    dataType: 'json' as const, widget: 'register', uiConfig: { title: 'Register unten A', columns: REG_COLUMNS },
  }),
  makeField({
    id: 'f-reg-hidden', symbol: 'reg_hidden', labelDe: 'Register versteckt', sectionId: 's1', orderIndex: 3,
    dataType: 'json' as const, widget: 'register', uiConfig: { title: 'Register versteckt', columns: REG_COLUMNS },
    visibleWhen: 'q > 100',
  }),
];

const PROPS = {
  locale: 'de' as const,
  projectId: 'p',
  worksheet: { template: { code: 'WIDGETS-99', titleDe: 'T', titleEn: null } },
  instance: { id: 'inst-widgets', status: 'draft' as const },
  sections: SECTIONS,
  fields: FIELDS,
  equations: [],
  complianceRequirements: [],
  complianceSuggestions: [],
  initialValues: {},
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: {},
  standardCode: 'DWA-M-820-1',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

describe('WorksheetForm — one renderer path via the WIDGETS registry', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it('scalar ⇒ DynamicField in the grid; register with placement section ⇒ RegisterEditor inside its SectionGroup', () => {
    render(<WorksheetForm {...PROPS} />);
    expect(screen.getByLabelText('Skalar im Grid', { exact: false })).toBeInTheDocument();
    const fieldset = screen.getByRole('group', { name: /Abschnitt Eins/ });
    const inSection = within(fieldset).getAllByTestId('register-editor');
    expect(inSection.map((el) => el.dataset.symbol)).toEqual(['reg_in_section']);
    expect(within(fieldset).getByText('Register (Abschnitt)')).toBeInTheDocument();
    // No raw json placeholder for any register field.
    expect(screen.queryByText('Mehrzeilige Eingabe — Phase 2')).toBeNull();
  });

  it('register without placement ⇒ bottom strip section `bottom-<symbol>` with the config title, ordered by orderIndex', () => {
    render(<WorksheetForm {...PROPS} />);
    const a = screen.getByTestId('bottom-reg_bottom_a');
    const b = screen.getByTestId('bottom-reg_bottom_b');
    expect(a.querySelector('h2')?.textContent).toBe('Register unten A');
    expect(within(a).getByTestId('register-editor').dataset.symbol).toBe('reg_bottom_a');
    expect(within(b).getByTestId('register-editor').dataset.symbol).toBe('reg_bottom_b');
    // orderIndex 2 before orderIndex 5, regardless of the field list order.
    expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The bottom registers are not duplicated inside the section.
    const fieldset = screen.getByRole('group', { name: /Abschnitt Eins/ });
    expect(within(fieldset).queryByTestId('bottom-reg_bottom_a')).toBeNull();
  });

  it('an out-of-enum DB widget string falls back to the scalar renderer (DynamicField), never a blank', () => {
    // schema.ts types `widget` as text; the CHECK constraint lives in an unapplied migration.
    const FIELDS_BOGUS = [makeField({ id: 'f-bogus', symbol: 'bogus_sym', labelDe: 'Unbekanntes Widget', sectionId: 's1', widget: 'not_a_widget' })];
    render(<WorksheetForm {...PROPS} fields={FIELDS_BOGUS} />);
    expect(screen.getByLabelText('Unbekanntes Widget', { exact: false })).toBeInTheDocument();
  });

  it('a register hidden by visible_when renders nothing (Plan 2a hiddenFieldIds semantics kept)', () => {
    // q = 50 ⇒ `q > 100` fails ⇒ hidden (only `fail` hides; pending keeps it visible).
    render(<WorksheetForm {...PROPS} initialValues={{ 'f-scalar': { type: 'number', value: 50 } }} />);
    expect(screen.queryByTestId('bottom-reg_hidden')).toBeNull();
    expect(screen.queryAllByText('Register versteckt')).toHaveLength(0);
    act(() => { useWorksheetStore.getState().setField('f-scalar', { type: 'number', value: 200 }); });
    expect(screen.getByTestId('bottom-reg_hidden')).toBeInTheDocument();
  });
});
