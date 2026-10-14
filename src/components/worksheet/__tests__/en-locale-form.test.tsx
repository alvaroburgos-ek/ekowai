/**
 * O-8 (UX follow-up 2026-10-14): WorksheetForm texts next to the wave's surfaces read English under EN — the upstream
 * panel's link title, the read-only banner and the twin pre-fill bar. German unchanged.
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
vi.mock('next/link', () => ({ default: ({ children, href, ...rest }: { children: React.ReactNode; href: string } & Record<string, unknown>) => <a href={String(href)} {...rest}>{children}</a> }));
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

const PROPS = {
  locale: 'en' as const,
  projectId: 'p',
  worksheet: { template: { code: 'M820-14', titleDe: 'Vergabe', titleEn: null } },
  instance: { id: 'inst-14', status: 'draft' as const },
  sections: [],
  fields: [
    makeField({ id: 'f-up', symbol: 'up', labelDe: 'Oben', inheritedFromWorksheet: 'M820-10' }),
    makeField({ id: 'f-a', symbol: 'a', labelDe: 'A' }),
    makeField({ id: 'f-b', symbol: 'b', labelDe: 'B', orderIndex: 1 }),
  ],
  equations: [],
  complianceRequirements: [],
  complianceSuggestions: [],
  initialValues: { 'f-up': { type: 'number' as const, value: 1 }, 'f-a': { type: 'number' as const, value: 2 }, 'f-b': { type: 'number' as const, value: 3 } },
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: { up: 'M820-10' },
  standardCode: 'DWA-M-820-1',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

const TWIN = { 'f-a': { worksheetCode: 'M820-05', symbol: 'a0' }, 'f-b': { worksheetCode: 'M820-05', symbol: 'b0' } };

describe('WorksheetForm EN texts (O-8)', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it('EN: panel link title, twin pre-fill bar', () => {
    render(<WorksheetForm {...PROPS} twinSourceByFieldId={TWIN} />);
    expect(screen.getByTitle('Open worksheet M820-10')).toBeInTheDocument();
    const bar = screen.getByTestId('twin-prefill-bar');
    expect(bar).toHaveTextContent('2 fields prefilled from upstream worksheets (not saved yet).');
    expect(bar).toHaveTextContent('Apply all prefills');
  });

  it('EN: read-only banner', () => {
    render(<WorksheetForm {...PROPS} instance={{ id: 'inst-14', status: 'engineer_approved' as const }} />);
    expect(screen.getByTestId('worksheet-lock-banner')).toHaveTextContent('Read-only (approved/final) — use “Reopen” to edit.');
  });

  it('DE unchanged', () => {
    render(<WorksheetForm {...PROPS} locale="de" twinSourceByFieldId={TWIN} />);
    expect(screen.getByTitle('Arbeitsblatt M820-10 öffnen')).toBeInTheDocument();
    const bar = screen.getByTestId('twin-prefill-bar');
    expect(bar.textContent).toBe('2 Felder aus vorgelagerten Arbeitsblättern vorbefüllt (noch nicht gespeichert).Alle Vorbefüllungen übernehmen');
  });

  it('DE read-only banner unchanged', () => {
    render(<WorksheetForm {...PROPS} locale="de" instance={{ id: 'inst-14', status: 'engineer_approved' as const }} />);
    expect(screen.getByTestId('worksheet-lock-banner').textContent).toBe('Schreibgeschützt (genehmigt/final) — zum Bearbeiten „Wieder öffnen“.');
  });
});
