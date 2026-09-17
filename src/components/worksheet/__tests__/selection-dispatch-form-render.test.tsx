/**
 * Task 9 fix round 1 — integration proof that WorksheetForm's actual dispatch
 * (grid exclusion + bottom-section placement) honors `resolveSelectionConfig`
 * through the REAL component, not just the pure function. The brief's browser
 * check (Step 4) was skipped per controller ruling (.env.local = prod), so
 * this is the only render-level proof of the DB-wins / TS-fallback / no-shadow
 * contract. Pattern reused from render-computed-symbols-isComputed.test.tsx
 * (mock list, PROPS shape, store init).
 */

vi.mock('@/lib/actions/worksheet', () => ({ saveWorksheet: vi.fn(async () => ({ ok: true, warnings: [] })) }));
vi.mock('@/lib/actions/worksheet-transition', () => ({ transitionWorksheet: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/citations', () => ({ addCitation: vi.fn(async () => ({ ok: true })), removeCitation: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/documents', () => ({ uploadDocument: vi.fn(async () => ({ ok: true, id: 'd' })) }));
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
vi.mock('../section-group', () => ({ SectionGroup: () => null }));
vi.mock('../equations-block', () => ({ EquationsBlock: () => null }));
vi.mock('../compliance-block', () => ({ ComplianceBlock: () => null }));
vi.mock('../approval-bar', () => ({ ApprovalBar: () => null }));
vi.mock('../equation-engine-card', () => ({ EquationEngineCard: () => null }));
vi.mock('../rainfall-tables-editor', () => ({ RainfallTablesEditor: () => null }));
vi.mock('../rainfall-table-selector', () => ({ RainfallTableSelector: () => null }));
// Plan 2b: `../surface-inventory-editor` deleted (generic RegisterEditor) — its vi.mock removed.
vi.mock('../surface-source-banner', () => ({ SurfaceSourceBanner: () => null }));
vi.mock('@/components/form-templates/SourceFormReferencePanel', () => ({ SourceFormReferencePanel: () => null }));
vi.mock('@/components/documents/citation-picker', () => ({ CitationPicker: () => null }));
vi.mock('@/components/documents/citation-chips', () => ({ CitationChips: () => null }));
vi.mock('./verify-button', () => ({ VerifyButton: () => null }));
// NOTE: checklist-editor / register-editor are intentionally NOT mocked — the
// dispatch under test (the WIDGETS registry since Plan 2b Task 3) renders them for real.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { WorksheetForm } from '../worksheet-form';
import { SELECTION_CONFIGS } from '@/lib/eval/selection-fields';

function makeField(over: Record<string, unknown>) {
  return {
    id: '', symbol: '', labelDe: '', labelEn: null, unit: null,
    dataType: 'json' as const, isRequired: false, enumValues: null,
    validationRules: null, clauseReference: null, verificationStatus: 'x',
    description: null, sectionId: null, orderIndex: 0, active: true,
    widget: null, uiConfig: null, lookup: null, visibleWhen: null,
    ...over,
  };
}

// (1) DB-driven select_many widget: DB config must win, field must NOT
// render in the grid (only in its dedicated bottom section).
const DB_WIDGET_FIELD_ID = 'fld-db-widget';
const DB_WIDGET_LABEL = 'DB-Widget-Feld (nicht im Grid erwartet)';

// (2) widget IS NULL, symbol is TS-registry-known ⇒ legacy TS fallback.
const TS_FALLBACK_FIELD_ID = 'fld-ts-fallback';
const TS_FALLBACK_LABEL = 'TS-Fallback-Feld (nicht im Grid erwartet)';

// (3) non-selection widget on the SAME registry symbol as (2) ⇒ must NOT
// shadow/duplicate a registry checklist, and must render as a normal grid
// field instead.
const SCALAR_FIELD_ID = 'fld-scalar-same-symbol';
const SCALAR_LABEL = 'Scalar-Feld im Grid (gleiches Symbol wie TS-Fallback)';

const FIELDS = [
  makeField({
    id: DB_WIDGET_FIELD_ID,
    symbol: 'db_widget_symbol',
    labelDe: DB_WIDGET_LABEL,
    orderIndex: 0,
    widget: 'select_many',
    uiConfig: { title: 'DB-Checkliste' },
    enumValues: [{ value: 'a', label_de: 'A', order_index: 0 }],
  }),
  makeField({
    id: TS_FALLBACK_FIELD_ID,
    symbol: 'applicable_legal_bases',
    labelDe: TS_FALLBACK_LABEL,
    orderIndex: 1,
    widget: null,
    enumValues: null,
  }),
  makeField({
    id: SCALAR_FIELD_ID,
    symbol: 'applicable_legal_bases',
    labelDe: SCALAR_LABEL,
    orderIndex: 2,
    widget: 'scalar',
    enumValues: null,
  }),
];

const PROPS = {
  locale: 'de' as const,
  projectId: 'p',
  worksheet: { template: { code: 'DISPATCH-99', titleDe: 'T', titleEn: null } },
  instance: { id: 'inst-dispatch', status: 'draft' as const },
  sections: [],
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

describe('WorksheetForm dispatch by field.widget (Task 9 integration proof)', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  // Plan 2b (Task 3): a DB-configured select_many renders IN ITS SECTION slot
  // (spec §6; sectionId null ⇒ the orphan block) instead of the bottom strip —
  // the assertions hold unchanged because ChecklistEditor carries the DB title
  // and never renders the field's grid label.
  it('DB widget (select_many) wins: renders its checklist with the DB title, NOT as a grid input', () => {
    render(<WorksheetForm {...PROPS} />);
    // Bottom-section checklist editor exists with the DB-supplied title.
    const editors = screen.getAllByTestId('checklist-editor');
    expect(editors.some((el) => el.textContent?.includes('DB-Checkliste'))).toBe(true);
    // The field's grid label must NOT appear anywhere (it's excluded from the grid).
    expect(screen.queryByText(DB_WIDGET_LABEL)).not.toBeInTheDocument();
  });

  it('widget IS NULL ⇒ TS-registry checklist renders (legacy fallback)', () => {
    render(<WorksheetForm {...PROPS} />);
    const editors = screen.getAllByTestId('checklist-editor');
    expect(editors.some((el) => el.textContent?.includes(SELECTION_CONFIGS.applicable_legal_bases.title))).toBe(true);
    expect(screen.queryByText(TS_FALLBACK_LABEL)).not.toBeInTheDocument();
  });

  it('non-selection widget on a registry symbol: no extra registry checklist, field renders in the grid', () => {
    render(<WorksheetForm {...PROPS} />);
    // Exactly 2 selection editors total (DB-widget field + TS-fallback field) —
    // the scalar-widget field must not add a third.
    const editors = screen.getAllByTestId('checklist-editor');
    expect(editors).toHaveLength(2);
    // The scalar field's label IS present — it stayed in the grid.
    expect(screen.getByText(SCALAR_LABEL)).toBeInTheDocument();
  });
});
