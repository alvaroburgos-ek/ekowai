/**
 * O-7 (UX follow-up 2026-10-14): the equations block also drops an equation whose inputs are hidden AT THEIR SOURCE
 * sheet (the R-16 set the compliance block uses: own hidden + hidden-at-source symbols that are not an own field).
 * Display only — the engine already sees those values absent.
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

const eq = (id: string, n: string, inputSymbols: string[], outputSymbol: string | null) => ({
  id, equationNumber: n, formula: `${outputSymbol ?? 'r'} = ${inputSymbols.join(' + ')}`, inputSymbols, outputSymbol,
  clauseReference: null, description: null, verificationStatus: 'engineer_verified', orderIndex: 0,
});

const PROPS = {
  locale: 'de' as const,
  projectId: 'p',
  worksheet: { template: { code: 'M820-14', titleDe: 'Vergabe', titleEn: null } },
  instance: { id: 'inst-14', status: 'draft' as const },
  sections: [],
  fields: [makeField({ id: 'f-own', symbol: 'own_count' })],
  equations: [
    eq('eq-src', '14.1', ['src_hidden_a', 'src_hidden_b'], null),
    eq('eq-mixed', '14.2', ['src_hidden_a', 'own_count'], null),
  ],
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

describe('WorksheetForm — equations over hidden-at-source inputs (O-7)', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it('an equation whose inputs are all hidden at source is not listed; one with a visible own input stays', () => {
    render(<WorksheetForm {...PROPS} hiddenAtSourceSymbols={['src_hidden_a', 'src_hidden_b']} />);
    expect(screen.getByText('Gleichungen dieses Arbeitsblatts')).toBeInTheDocument();
    expect(screen.queryByText('Gl. 14.1')).toBeNull();
    expect(screen.getByText('Gl. 14.2')).toBeInTheDocument();
  });

  it('a symbol that is an OWN field is never hidden by the source set (the sheet answers it itself)', () => {
    render(
      <WorksheetForm
        {...PROPS}
        equations={[eq('eq-own', '14.3', ['own_count'], null)]}
        hiddenAtSourceSymbols={['own_count']}
      />,
    );
    expect(screen.getByText('Gl. 14.3')).toBeInTheDocument();
  });

  it('every equation fed only by hidden-at-source inputs ⇒ the block disappears', () => {
    render(<WorksheetForm {...PROPS} equations={[PROPS.equations[0]]} hiddenAtSourceSymbols={['src_hidden_a', 'src_hidden_b']} />);
    expect(screen.queryByText('Gleichungen dieses Arbeitsblatts')).toBeNull();
  });

  it('without a source set nothing changes', () => {
    render(<WorksheetForm {...PROPS} />);
    expect(screen.getByText('Gl. 14.1')).toBeInTheDocument();
    expect(screen.getByText('Gl. 14.2')).toBeInTheDocument();
  });
});
