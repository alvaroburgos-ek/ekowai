/**
 * Plan 2b Task 3 (fix round 1) — form-level pin of the CONSUMER path
 * (`registerSources` → `registerSourceStates`): a worksheet that consumes a
 * register owned elsewhere (A138-10 ← A138-07 `surface_inventory`) and has NO
 * field for the carrier itself still gets the upstream-cause banner and the
 * read-only mirror, resolved through the symbol-keyed TS fallback config
 * (controller ruling). SurfaceSourceBanner and the register editor are NOT
 * mocked — the banner text and the mirror are under test.
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
vi.mock('../equations-block', () => ({ EquationsBlock: () => null }));
vi.mock('../compliance-block', () => ({ ComplianceBlock: () => null }));
vi.mock('../approval-bar', () => ({ ApprovalBar: () => null }));
vi.mock('../equation-engine-card', () => ({ EquationEngineCard: () => null }));
vi.mock('../rainfall-tables-editor', () => ({ RainfallTablesEditor: () => null }));
vi.mock('../rainfall-table-selector', () => ({ RainfallTableSelector: () => null }));
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

// A138-10-shaped consumer: NO surface_inventory field of its own.
const FIELDS = [
  makeField({ id: 'f-a-c', symbol: 'A_C', labelDe: 'A_C', unit: 'm²', orderIndex: 0 }),
  makeField({ id: 'f-c-m', symbol: 'C_m', labelDe: 'C_m', orderIndex: 1 }),
];

const TWO_COMPLETE_ROWS = {
  rows: [
    { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
    { id: '2', label: 'Parkplatz', tab9_value: 'park_flach', area_m2: 1575.9, c_i: 0.1, c_s: 0.2, coeff_override: false },
  ],
};

const PROPS = {
  locale: 'de' as const,
  projectId: 'p',
  worksheet: { template: { code: 'A138-10', titleDe: 'Versickerung', titleEn: null } },
  instance: { id: 'inst-a138-10', status: 'draft' as const },
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
  standardCode: 'DWA-A-138-1',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

const source = (status: string, carrier: unknown) => [{ symbol: 'surface_inventory', ownerCode: 'A138-07', status, carrier }];

describe('WorksheetForm — consumed registers (registerSources) without a local carrier field', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it('draft owner + two complete rows ⇒ "nicht final (2/2)" banner AND the read-only mirror', () => {
    render(<WorksheetForm {...PROPS} registerSources={source('draft', TWO_COMPLETE_ROWS)} />);
    expect(screen.getByTestId('surface-source-banner')).toHaveTextContent(
      'Quelle A138-07 nicht final (2/2 Zeilen vollständig) — abgeleitete Werte ausgeblendet.',
    );
    const mirror = screen.getByTestId('source-surface_inventory');
    expect(mirror.querySelector('h2')?.textContent).toBe('Flächenverzeichnis (aus A138-07 — schreibgeschützt)');
    const table = within(mirror).getByTestId('register-readonly');
    expect(table.dataset.symbol).toBe('surface_inventory');
    expect(within(table).getAllByRole('row')).toHaveLength(3); // header + 2 rows
    expect(within(table).getByText('Parkplatz')).toBeInTheDocument();
    expect(within(table).queryByRole('textbox')).toBeNull();
    // The consumer never gets an EDITABLE register for a carrier it does not own.
    expect(screen.queryByTestId('register-editor')).toBeNull();
  });

  it('final owner + complete rows ⇒ no banner, mirror present', () => {
    render(<WorksheetForm {...PROPS} registerSources={source('final', TWO_COMPLETE_ROWS)} />);
    expect(screen.queryByTestId('surface-source-banner')).toBeNull();
    expect(screen.getByTestId('source-surface_inventory')).toBeInTheDocument();
  });

  it('null carrier ⇒ "nicht erfasst" banner (missing cause, as before Plan 2b), no mirror', () => {
    render(<WorksheetForm {...PROPS} registerSources={source('final', null)} />);
    expect(screen.getByTestId('surface-source-banner')).toHaveTextContent('Quelle A138-07 nicht erfasst — abgeleitete Werte ausgeblendet.');
    expect(screen.queryByTestId('source-surface_inventory')).toBeNull();
  });

  it('no registerSources ⇒ neither banner nor mirror', () => {
    render(<WorksheetForm {...PROPS} />);
    expect(screen.queryByTestId('surface-source-banner')).toBeNull();
    expect(screen.queryByTestId('source-surface_inventory')).toBeNull();
  });
});
