/**
 * U-5 (UX pass 820, 2026-10-08): a sheet whose own questions are ALL hidden by `visible_when` says so and names the
 * driving selections (label = value ← origin worksheet); with at least one visible question there is no notice.
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
vi.mock('../section-group', () => ({ SectionGroup: () => null }));
vi.mock('../compliance-block', () => ({ ComplianceBlock: () => null }));
vi.mock('../approval-bar', () => ({ ApprovalBar: () => null }));
vi.mock('../equation-engine-card', () => ({ EquationEngineCard: () => null }));
vi.mock('../rainfall-tables-editor', () => ({ RainfallTablesEditor: () => null }));
vi.mock('@/components/form-templates/SourceFormReferencePanel', () => ({ SourceFormReferencePanel: () => null }));
vi.mock('@/components/documents/citation-picker', () => ({ CitationPicker: () => null }));
vi.mock('@/components/documents/citation-chips', () => ({ CitationChips: () => null }));
vi.mock('@/components/norm-text/clause-chip', () => ({ ClauseChip: () => null }));
vi.mock('@/components/math/katex-formula', () => ({ KatexFormula: ({ source }: { source: string }) => <span>{source}</span> }));
vi.mock('../verify-button', () => ({ VerifyButton: () => null }));

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

const RULE = "procurement_procedure != 'direktvergabe'";
const FIELDS = [
  makeField({
    id: 'f-pp', symbol: 'procurement_procedure', labelDe: 'Vergabeverfahren', dataType: 'enum' as const, inheritedFromWorksheet: 'M820-02',
    enumValues: [
      { value: 'direktvergabe', label_de: 'Direktvergabe', label_en: 'Direct award', order_index: 0 },
      { value: 'offen', label_de: 'Offenes Verfahren', label_en: 'Open procedure', order_index: 1 },
    ],
  }),
  makeField({ id: 'f-a', symbol: 'tender_date', labelDe: 'Datum der Bekanntmachung', visibleWhen: RULE }),
  makeField({ id: 'f-b', symbol: 'bid_count', labelDe: 'Anzahl Angebote', visibleWhen: RULE, orderIndex: 1 }),
  makeField({ id: 'f-old', symbol: 'retired', labelDe: 'alt', active: false }),
];

const EQUATIONS = [
  {
    id: 'eq-1', equationNumber: '14.1', formula: 'bid_ratio = bid_count / tender_date', inputSymbols: ['bid_count', 'tender_date'], outputSymbol: null,
    clauseReference: null, description: null, verificationStatus: 'engineer_verified', orderIndex: 0,
  },
];

const PROPS = {
  locale: 'de' as const,
  projectId: 'p',
  worksheet: { template: { code: 'M820-14', titleDe: 'Vergabe', titleEn: null } },
  instance: { id: 'inst-14', status: 'draft' as const },
  sections: [],
  fields: FIELDS,
  equations: EQUATIONS,
  complianceRequirements: [],
  complianceSuggestions: [],
  initialValues: {},
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: { procurement_procedure: 'M820-02' },
  standardCode: 'DWA-M-820-1',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

const withValue = (v: string) => ({ ...PROPS, initialValues: { 'f-pp': { type: 'enum' as const, value: v } } });

describe('WorksheetForm — all own questions hidden (U-5)', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it('direct award ⇒ notice with the driver „Vergabeverfahren = Direktvergabe (← M820-02)"; the equation over hidden inputs is not listed', () => {
    render(<WorksheetForm {...withValue('direktvergabe')} />);
    const notice = screen.getByTestId('all-hidden-notice');
    expect(notice).toHaveTextContent('Dieses Blatt stellt unter den aktuellen Auswahlen keine Fragen.');
    const items = notice.querySelectorAll('li');
    expect([...items].map((li) => li.textContent)).toEqual(['Vergabeverfahren = Direktvergabe (← M820-02)']);
    expect(screen.queryByText('Gleichungen dieses Arbeitsblatts')).toBeNull();
  });

  it('English locale wording + enum label', () => {
    render(<WorksheetForm {...withValue('direktvergabe')} locale="en" />);
    const notice = screen.getByTestId('all-hidden-notice');
    expect(notice).toHaveTextContent('Under the current selections this sheet asks no questions.');
    expect(notice.querySelector('li')?.textContent).toBe('Vergabeverfahren = Direct award (← M820-02)');
  });

  it('open procedure ⇒ questions visible, no notice, equation listed', () => {
    render(<WorksheetForm {...withValue('offen')} />);
    expect(screen.queryByTestId('all-hidden-notice')).toBeNull();
    expect(screen.getByText('Gleichungen dieses Arbeitsblatts')).toBeInTheDocument();
  });
});
