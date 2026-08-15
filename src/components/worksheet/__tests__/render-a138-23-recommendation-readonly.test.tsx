/**
 * Finding G2 (summary fix wave) — render-layer repro: the A138-23 recommendation
 * enum must render READ-ONLY, the verdict enum must stay EDITABLE.
 *
 * Root cause: A138-23 has NO equations → computeComputedSymbols returns ∅ → NO
 * A138-23 field is isComputed → the DERIVED `recommended_phase_4_gate` rendered as a
 * normal EDITABLE SegmentedControl, visually identical to the editable
 * `phase_4_gate_result` verdict beside it (#15b adjacency). Selecting FAIL on the
 * recommendation = no dirty → no save → the user's "my FAIL didn't persist".
 *
 * Fix (G2a/b): an explicit A138-23 read-only symbol set (PHASE4_READONLY_SYMBOLS ∋
 * recommended_phase_4_gate) folded into computedSymbols → DynamicField locks it +
 * labels it as a read-only recommendation, visually distinct from the editable verdict.
 *
 * RENDER-LAYER REPRO rider: renders the REAL WorksheetForm with the REAL topology.
 * RED before the marker: recommended_phase_4_gate renders EDITABLE (not locked).
 */

// ── Mocks (before imports the mocked modules touch) ───────────────────────────
vi.mock('@/lib/actions/worksheet', () => ({
  saveWorksheet: vi.fn(async () => ({ ok: true, warnings: [] })),
}));
vi.mock('@/lib/actions/worksheet-transition', () => ({
  transitionWorksheet: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/overrides', () => ({
  recordManualOverride: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/citations', () => ({
  addCitation: vi.fn(async () => ({ ok: true })),
  removeCitation: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/documents', () => ({
  uploadDocument: vi.fn(async () => ({ ok: true, id: 'stub-doc' })),
}));
vi.mock('@/lib/actions/verification', () => ({
  verifyField: vi.fn(async () => ({ ok: true })),
  unverifyField: vi.fn(async () => ({ ok: true })),
  verifyEquation: vi.fn(async () => ({ ok: true })),
  unverifyEquation: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/project-standards', () => ({
  addStandardByCodeToProject: vi.fn(async () => ({ ok: true })),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={String(href)}>{children}</a>
  ),
}));
vi.mock('../section-group', () => ({ SectionGroup: () => null }));
vi.mock('../equations-block', () => ({ EquationsBlock: () => null }));
vi.mock('../compliance-block', () => ({ ComplianceBlock: () => null }));
vi.mock('../approval-bar', () => ({ ApprovalBar: () => null }));
vi.mock('../equation-engine-card', () => ({ EquationEngineCard: () => null }));
vi.mock('../rainfall-tables-editor', () => ({ RainfallTablesEditor: () => null }));
vi.mock('../rainfall-table-selector', () => ({ RainfallTableSelector: () => null }));
vi.mock('../surface-inventory-editor', () => ({ SurfaceInventoryEditor: () => null }));
vi.mock('../surface-source-banner', () => ({ SurfaceSourceBanner: () => null }));
vi.mock('@/components/form-templates/SourceFormReferencePanel', () => ({
  SourceFormReferencePanel: () => null,
}));
vi.mock('@/components/documents/citation-picker', () => ({ CitationPicker: () => null }));
vi.mock('@/components/documents/citation-chips', () => ({ CitationChips: () => null }));
vi.mock('./verify-button', () => ({ VerifyButton: () => null }));

// ── Imports ───────────────────────────────────────────────────────────────────
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, within, fireEvent } from '@testing-library/react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { WorksheetForm } from '../worksheet-form';

const RECOMMENDED_FIELD_ID = 'fld-recommended';
const VERDICT_FIELD_ID = 'fld-verdict';

const ENUM_OPTIONS = [
  { value: 'PASS', label_de: 'Bestanden', label_en: 'Pass' },
  { value: 'CONDITIONAL', label_de: 'Bedingt', label_en: 'Conditional' },
  { value: 'FAIL', label_de: 'Nicht bestanden', label_en: 'Fail' },
];

function makeField(over: Record<string, unknown>) {
  return {
    id: '',
    symbol: '',
    labelDe: '',
    labelEn: null,
    unit: null,
    dataType: 'enum' as const,
    isRequired: false,
    enumValues: ENUM_OPTIONS,
    validationRules: null,
    clauseReference: null,
    verificationStatus: 'imported_unverified',
    description: null,
    sectionId: null,
    orderIndex: 0,
    active: true,
    ...over,
  };
}

const FIELDS = [
  makeField({ id: RECOMMENDED_FIELD_ID, symbol: 'recommended_phase_4_gate', labelDe: 'Empfohlenes Ergebnis', orderIndex: 0 }),
  makeField({ id: VERDICT_FIELD_ID, symbol: 'phase_4_gate_result', labelDe: 'Ergebnis (Prüfvermerk)', orderIndex: 1 }),
];

const WORKSHEET_FORM_PROPS = {
  locale: 'de' as const,
  projectId: 'proj-fixture',
  worksheet: { template: { code: 'A138-23', titleDe: 'Phase-4 Summary', titleEn: null } },
  instance: { id: 'inst-a138-23', status: 'draft' as const },
  sections: [],
  fields: FIELDS,
  equations: [], // A138-23 owns NO equations — the crux of Finding G2.
  complianceRequirements: [],
  complianceSuggestions: [],
  initialValues: {
    [RECOMMENDED_FIELD_ID]: { type: 'enum' as const, value: 'FAIL' },
    [VERDICT_FIELD_ID]: { type: 'enum' as const, value: null },
  },
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: {},
  standardCode: 'DWA-A-138-1',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

describe('Finding G2 (render) — A138-23 recommendation read-only, verdict editable', () => {
  beforeEach(() => {
    act(() => {
      useWorksheetStore.getState().init('reset', {}, {}, {});
    });
  });

  it('recommended_phase_4_gate renders READ-ONLY (locked recommendation marker)', () => {
    const { container } = render(<WorksheetForm {...WORKSHEET_FORM_PROPS} />);
    const recWrap = container.querySelector('[data-symbol="recommended_phase_4_gate"]');
    expect(recWrap).toBeTruthy();
    // The G2b fingerprint: the radiogroup carries the read-only-recommendation marker.
    const radiogroup = recWrap!.querySelector('[role="radiogroup"]');
    expect(radiogroup?.getAttribute('data-readonly-recommendation')).toBe('true');
    // And the visible locked label is present.
    expect(within(recWrap as HTMLElement).getByTestId('readonly-recommendation-lock')).toBeTruthy();
  });

  it('recommended_phase_4_gate does NOT dirty on click (the #15b no-op is now honest read-only)', () => {
    const { container } = render(<WorksheetForm {...WORKSHEET_FORM_PROPS} />);
    const recWrap = container.querySelector('[data-symbol="recommended_phase_4_gate"]') as HTMLElement;
    const passBtn = within(recWrap).getByText('Bestanden');
    fireEvent.click(passBtn);
    // Locked → no dirty; store value unchanged (still FAIL), field not pending.
    const st = useWorksheetStore.getState();
    expect(st.pendingFieldIds.has(RECOMMENDED_FIELD_ID)).toBe(false);
    const v = st.values[RECOMMENDED_FIELD_ID];
    expect(v?.type === 'enum' ? v.value : null).toBe('FAIL');
  });

  it('phase_4_gate_result stays EDITABLE — a click dirties + persists it', () => {
    const { container } = render(<WorksheetForm {...WORKSHEET_FORM_PROPS} />);
    const verdictWrap = container.querySelector('[data-symbol="phase_4_gate_result"]') as HTMLElement;
    // NOT a read-only recommendation.
    const radiogroup = verdictWrap.querySelector('[role="radiogroup"]');
    expect(radiogroup?.getAttribute('data-readonly-recommendation')).toBeNull();
    // A click DOES set the value + dirty the field.
    const failBtn = within(verdictWrap).getByText('Nicht bestanden');
    act(() => {
      fireEvent.click(failBtn);
    });
    const st = useWorksheetStore.getState();
    const v = st.values[VERDICT_FIELD_ID];
    expect(v?.type === 'enum' ? v.value : null).toBe('FAIL');
    expect(st.pendingFieldIds.has(VERDICT_FIELD_ID)).toBe(true);
  });
});
