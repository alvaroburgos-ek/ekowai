/**
 * Plan 2a Task 10 — render proof through the REAL WorksheetForm that
 * `visible_when` hides fields and sections, and that a hidden symbol reaches
 * the compliance gates as `not_applicable`.
 *
 * Scaffolding (mock list, PROPS shape, store init) reused from
 * selection-dispatch-form-render.test.tsx; SectionGroup and ComplianceBlock
 * are deliberately NOT mocked — the section hide and the badge are under test.
 *
 * Plan 2a: the two ASM early returns (`soil_bodenart_tab13` only when
 * method='soil_estimate', `a_s_m_provenance` only when method='manual') moved
 * from DynamicField into computeVisibility (LEGACY_VISIBLE_WHEN); the second
 * describe pins that behaviour at the form level, where the decision now lives.
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
vi.mock('../approval-bar', () => ({ ApprovalBar: () => null }));
vi.mock('../equation-engine-card', () => ({ EquationEngineCard: () => null }));
vi.mock('../rainfall-tables-editor', () => ({ RainfallTablesEditor: () => null }));
vi.mock('../rainfall-table-selector', () => ({ RainfallTableSelector: () => null }));
vi.mock('../surface-inventory-editor', () => ({ SurfaceInventoryEditor: () => null }));
vi.mock('../surface-source-banner', () => ({ SurfaceSourceBanner: () => null }));
vi.mock('@/components/form-templates/SourceFormReferencePanel', () => ({ SourceFormReferencePanel: () => null }));
vi.mock('@/components/documents/citation-picker', () => ({ CitationPicker: () => null }));
vi.mock('@/components/documents/citation-chips', () => ({ CitationChips: () => null }));
vi.mock('@/components/norm-text/clause-chip', () => ({ ClauseChip: () => null }));
vi.mock('../verify-button', () => ({ VerifyButton: () => null }));

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  { id: 's1', code: 'A', titleDe: 'Netz', titleEn: null, orderIndex: 0, parentSectionId: null, visibleWhen: null },
  { id: 's2', code: 'B', titleDe: 'Mischsystem', titleEn: null, orderIndex: 1, parentSectionId: null, visibleWhen: null },
  { id: 's3', code: 'C', titleDe: 'Trennsystem-Abschnitt', titleEn: null, orderIndex: 2, parentSectionId: null, visibleWhen: "sewer_system_type == 'trenn'" },
];

const FIELDS = [
  makeField({
    id: 'f-sewer', symbol: 'sewer_system_type', labelDe: 'Entwässerungssystem', sectionId: 's1',
    dataType: 'enum' as const,
    enumValues: [
      { value: 'misch', label_de: 'Misch', label_en: null, order_index: 0 },
      { value: 'trenn', label_de: 'Trenn', label_en: null, order_index: 1 },
    ],
  }),
  makeField({ id: 'f-x', symbol: 'x', labelDe: 'Wert x (nur Misch)', sectionId: 's2', visibleWhen: "sewer_system_type == 'misch'" }),
  makeField({ id: 'f-y', symbol: 'y', labelDe: 'Wert y (nur Trenn)', sectionId: 's3' }),
];

const PROPS = {
  locale: 'de' as const,
  projectId: 'p',
  worksheet: { template: { code: 'VIS-99', titleDe: 'T', titleEn: null } },
  instance: { id: 'inst-vis', status: 'draft' as const },
  sections: SECTIONS,
  fields: FIELDS,
  equations: [],
  complianceRequirements: [
    {
      id: 'cr-1', code: 'CR-1', titleDe: 'x mindestens 1', titleEn: null, condition: 'x >= 1',
      description: null, clauseReference: null, severity: 'block', suggestion: null,
    },
  ],
  complianceSuggestions: [],
  initialValues: {},
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: {},
  standardCode: 'DWA-M-820-1',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

const inputFor = (symbol: string) => document.querySelector(`[data-symbol="${symbol}"] input`);
const badge = (label: string) => screen.queryByLabelText(label);

describe('WorksheetForm visible_when (Plan 2a Task 10)', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it('1. enum unset: x and y render (pending ⇒ visible); CR-1 is "Eingabe erforderlich"', () => {
    render(<WorksheetForm {...PROPS} />);
    expect(inputFor('x')).not.toBeNull();
    expect(inputFor('y')).not.toBeNull();
    expect(screen.getByText('Trennsystem-Abschnitt', { exact: false })).toBeInTheDocument();
    expect(badge('Eingabe erforderlich')).toBeInTheDocument();
    expect(badge('Nicht anwendbar')).toBeNull();
  });

  it('2. select trenn: x leaves the DOM, y stays, CR-1 becomes "Nicht anwendbar"', async () => {
    const user = userEvent.setup();
    render(<WorksheetForm {...PROPS} />);
    await user.click(screen.getByRole('button', { name: 'Trenn' }));
    expect(inputFor('x')).toBeNull();
    expect(screen.queryByText('Wert x (nur Misch)')).toBeNull();
    expect(inputFor('y')).not.toBeNull();
    expect(badge('Nicht anwendbar')).toBeInTheDocument();
    expect(badge('Eingabe erforderlich')).toBeNull();
  });

  it('3. select misch: x is back, section s3 (and y) are gone; CR-1 is pending again', async () => {
    const user = userEvent.setup();
    render(<WorksheetForm {...PROPS} />);
    await user.click(screen.getByRole('button', { name: 'Trenn' }));
    expect(inputFor('x')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Misch' }));
    expect(inputFor('x')).not.toBeNull();
    expect(inputFor('y')).toBeNull();
    expect(screen.queryByText('Trennsystem-Abschnitt', { exact: false })).toBeNull();
    expect(badge('Eingabe erforderlich')).toBeInTheDocument();
    expect(badge('Nicht anwendbar')).toBeNull();
  });
});

// Plan 2a: moved up one level from DynamicField (the two ASM early returns are
// deleted there); LEGACY_VISIBLE_WHEN supplies the rules while
// fields.visible_when IS NULL (migration 20260916120000 written-not-applied).
describe('ASM legacy visibility through WorksheetForm (Plan 2a: decision moved out of DynamicField)', () => {
  const ASM_FIELDS = [
    makeField({
      id: 'f-method', symbol: 'a_s_m_determination_method', labelDe: 'Methode', sectionId: 's1',
      dataType: 'enum' as const,
      enumValues: [
        { value: 'direct', label_de: 'Direkt', label_en: null, order_index: 0 },
        { value: 'manual', label_de: 'Manuell', label_en: null, order_index: 1 },
        { value: 'soil_estimate', label_de: 'Bodenschätzung', label_en: null, order_index: 2 },
      ],
    }),
    makeField({ id: 'f-soil', symbol: 'soil_bodenart_tab13', labelDe: 'Bodenart Tab.13', sectionId: 's1', dataType: 'text' as const }),
    makeField({ id: 'f-prov', symbol: 'a_s_m_provenance', labelDe: 'Herkunft', sectionId: 's1', dataType: 'text' as const }),
  ];
  const ASM_PROPS = { ...PROPS, fields: ASM_FIELDS, complianceRequirements: [], sections: [SECTIONS[0]] };

  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it('method unset ⇒ both hidden; soil_estimate ⇒ soil only; manual ⇒ provenance only', async () => {
    const user = userEvent.setup();
    render(<WorksheetForm {...ASM_PROPS} />);
    expect(inputFor('soil_bodenart_tab13')).toBeNull();
    expect(inputFor('a_s_m_provenance')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Bodenschätzung' }));
    expect(inputFor('soil_bodenart_tab13')).not.toBeNull();
    expect(inputFor('a_s_m_provenance')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Manuell' }));
    expect(inputFor('soil_bodenart_tab13')).toBeNull();
    expect(inputFor('a_s_m_provenance')).not.toBeNull();
  });
});
