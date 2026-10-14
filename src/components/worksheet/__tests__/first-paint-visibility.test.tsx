/**
 * O-4 (UX follow-up 2026-10-14): the FIRST render of a worksheet already applies `visible_when`.
 * Cause: the zustand store is seeded by an effect (`init` after mount), so the first render — the server HTML and the
 * first client paint after a navigation/save — evaluated visibility over the store's previous (or empty) values: every
 * driver absent ⇒ pending ⇒ every field visible, hidden only once the effect had run. The form now reads the server's
 * `initialValues` until the store holds THIS instance.
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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { act, render, screen } from '@testing-library/react';
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
    id: 'f-pp', symbol: 'procurement_procedure', labelDe: 'Vergabeverfahren', dataType: 'enum' as const, inheritedFromWorksheet: 'M820-10',
    enumValues: [
      { value: 'direktvergabe', label_de: 'Direktvergabe', label_en: 'Direct award', order_index: 0 },
      { value: 'offen', label_de: 'Offenes Verfahren', label_en: 'Open procedure', order_index: 1 },
    ],
  }),
  makeField({ id: 'f-a', symbol: 'tender_date', labelDe: 'Datum der Bekanntmachung', visibleWhen: RULE }),
  makeField({ id: 'f-b', symbol: 'bid_count', labelDe: 'Anzahl Angebote', visibleWhen: RULE, orderIndex: 1 }),
];

const PROPS = {
  locale: 'de' as const,
  projectId: 'p',
  worksheet: { template: { code: 'M820-14', titleDe: 'Vergabe', titleEn: null } },
  instance: { id: 'inst-14', status: 'draft' as const },
  sections: [],
  fields: FIELDS,
  equations: [],
  complianceRequirements: [],
  complianceSuggestions: [],
  initialValues: { 'f-pp': { type: 'enum' as const, value: 'direktvergabe' } },
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: { procurement_procedure: 'M820-10' },
  standardCode: 'DWA-M-820-1',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

const NOTICE = 'Dieses Blatt stellt unter den aktuellen Auswahlen keine Fragen.';

// The client tests freeze the store on what it held BEFORE the init effect (init = no-op), so the rendered DOM is the
// first paint. (renderToString always reads zustand's initial state — the server snapshot — so it models SSR only.)
const realInit = useWorksheetStore.getState().init;

describe('WorksheetForm — first paint applies visibility (O-4)', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.setState({ init: realInit }); useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });
  afterEach(() => {
    act(() => { useWorksheetStore.setState({ init: realInit }); });
  });

  it('server HTML (store not yet seeded): the all-hidden decision is taken from initialValues', () => {
    const html = renderToString(<WorksheetForm {...PROPS} />);
    expect(html).toContain(NOTICE);
  });

  it('first client paint while the store still holds the PREVIOUS sheet (navigation right after a save)', () => {
    act(() => {
      useWorksheetStore.getState().init('inst-10', { 'f-pp': { type: 'enum', value: 'offen' } }, {}, {});
      useWorksheetStore.setState({ init: () => {} });
    });
    render(<WorksheetForm {...PROPS} />);
    expect(screen.getByTestId('all-hidden-notice')).toHaveTextContent(NOTICE);
  });

  it('store seeded for THIS instance: the store (live edits) wins over initialValues', () => {
    act(() => {
      useWorksheetStore.getState().init('inst-14', { 'f-pp': { type: 'enum', value: 'offen' } }, {}, {});
      useWorksheetStore.setState({ init: () => {} });
    });
    render(<WorksheetForm {...PROPS} />);
    expect(screen.queryByTestId('all-hidden-notice')).toBeNull();
  });
});
