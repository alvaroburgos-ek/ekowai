/**
 * U-3 (UX pass 820, 2026-10-08): the „Vorgelagerte Werte" panel is collapsed by default, expands on click, remembers
 * the open state per worksheet (localStorage) and lists project identity values last under „Projektdaten".
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
import { fireEvent } from '@testing-library/react';
import { WorksheetForm } from '../worksheet-form';
import { splitInheritedForPanel, upstreamPanelStorageKey } from '../inherited-panel';

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

const FIELDS = [
  makeField({ id: 'i-name', symbol: 'project_name', labelDe: 'Projektname', dataType: 'text' as const, inheritedFromWorksheet: 'M820-01' }),
  makeField({ id: 'i-cl', symbol: 'client_name', labelDe: 'Auftraggeber', dataType: 'text' as const, inheritedFromWorksheet: 'M820-01' }),
  makeField({ id: 'i-bp', symbol: 'bedarfsplanung_projekt_complete', labelDe: 'Bedarfsplanung abgeschlossen', dataType: 'boolean' as const, inheritedFromWorksheet: 'M820-05' }),
  makeField({ id: 'own', symbol: 'own_q', labelDe: 'Eigene Frage' }),
];

const PROPS = {
  locale: 'de' as const,
  projectId: 'p',
  worksheet: { template: { code: 'M820-10', titleDe: 'Leistungsbeschreibung', titleEn: null } },
  instance: { id: 'inst-10', status: 'draft' as const },
  sections: [],
  fields: FIELDS,
  equations: [],
  complianceRequirements: [],
  complianceSuggestions: [],
  initialValues: {
    'i-name': { type: 'text' as const, value: 'Kläranlage Nord' },
    'i-cl': { type: 'text' as const, value: 'Stadt X' },
    'i-bp': { type: 'boolean' as const, value: true },
  },
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: {},
  standardCode: 'DWA-M-820-1',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

const KEY = upstreamPanelStorageKey('DWA-M-820-1', 'M820-10');

describe('WorksheetForm — upstream values panel (U-3)', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
    window.localStorage.clear();
  });

  it('collapsed by default with the count summary; click expands and remembers the state', () => {
    render(<WorksheetForm {...PROPS} />);
    const toggle = screen.getByTestId('inherited-values-toggle');
    expect(toggle).toHaveTextContent('3 vorgelagerte Werte (aus anderen Arbeitsblättern) — anzeigen');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('inherited-values-body')).not.toBeVisible();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent('— ausblenden');
    expect(screen.getByTestId('inherited-values-body')).toBeVisible();
    expect(window.localStorage.getItem(KEY)).toBe('open');
    fireEvent.click(toggle);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('a remembered open state reopens the panel', () => {
    window.localStorage.setItem(KEY, 'open');
    render(<WorksheetForm {...PROPS} />);
    expect(screen.getByTestId('inherited-values-toggle')).toHaveAttribute('aria-expanded', 'true');
  });

  it('sheet-specific values first, identity values last under „Projektdaten"; EN wording', () => {
    render(<WorksheetForm {...PROPS} locale="en" />);
    expect(screen.getByTestId('inherited-values-toggle')).toHaveTextContent('3 upstream values (from other worksheets) — show');
    const body = screen.getByTestId('inherited-values-body');
    const order = [...body.querySelectorAll('li[data-symbol]')].map((li) => li.getAttribute('data-symbol'));
    expect(order).toEqual(['bedarfsplanung_projekt_complete', 'project_name', 'client_name']);
    expect(screen.getByTestId('inherited-values-identity-heading')).toHaveTextContent('Project data');
    expect(body.querySelector('li[data-symbol="bedarfsplanung_projekt_complete"]')?.textContent).toContain('Yes');
  });
  it("a sheet whose own questions are all hidden (U-5 notice) starts collapsed even when remembered open", () => {
    window.localStorage.setItem(KEY, "open");
    const fields = [
      makeField({ id: "i-pp", symbol: "procurement_procedure", labelDe: "Vergabeverfahren", dataType: "enum" as const, inheritedFromWorksheet: "M820-02" }),
      makeField({ id: "own", symbol: "own_q", labelDe: "Eigene Frage", visibleWhen: "procurement_procedure != 'direktvergabe'" }),
    ];
    render(<WorksheetForm {...PROPS} fields={fields} initialValues={{ "i-pp": { type: "enum" as const, value: "direktvergabe" } }} />);
    expect(screen.getByTestId("all-hidden-notice")).toBeInTheDocument();
    expect(screen.getByTestId("inherited-values-toggle")).toHaveAttribute("aria-expanded", "false");
  });
});

describe("splitInheritedForPanel", () => {
  it('keeps the input order of specific values and the canonical order of identity values', () => {
    const r = splitInheritedForPanel([{ symbol: 'client_name' }, { symbol: 'b' }, { symbol: 'project_number' }, { symbol: 'a' }]);
    expect(r.specific.map((x) => x.symbol)).toEqual(['b', 'a']);
    expect(r.identity.map((x) => x.symbol)).toEqual(['project_number', 'client_name']);
  });
});
