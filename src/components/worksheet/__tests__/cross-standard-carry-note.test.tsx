/**
 * M820 flow block 3 item 2 (X10) — render proof through the REAL WorksheetForm: a json carrier carried over the cross-standard
 * allow-list (DWA-M 820-1 risk register → DWA-M 820-2 sheet 820-2-10) shows the "taken from DWA-M 820-1 (M820-06 / M820-07)" note
 * above its bespoke editor while the carried value is untouched; the first edit (an own 820-2 value) removes the note. No note
 * without a carried value. Scaffolding (mock list, PROPS shape, store init) reused from widgets-form-render.test.tsx.
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
vi.mock('../surface-source-banner', () => ({ SurfaceSourceBanner: () => null }));
vi.mock('@/components/form-templates/SourceFormReferencePanel', () => ({ SourceFormReferencePanel: () => null }));
vi.mock('@/components/documents/citation-picker', () => ({ CitationPicker: () => null }));
vi.mock('@/components/documents/citation-chips', () => ({ CitationChips: () => null }));
vi.mock('@/components/norm-text/clause-chip', () => ({ ClauseChip: () => null }));
vi.mock('../verify-button', () => ({ VerifyButton: () => null }));

vi.mock('../risk-register-editor', () => ({ RiskRegisterEditor: ({ fieldId }: { fieldId: string }) => <div data-testid={`rr-${fieldId}`} /> }));
vi.mock('../mitigation-plan-editor', () => ({ MitigationPlanEditor: ({ fieldId }: { fieldId: string }) => <div data-testid={`mp-${fieldId}`} /> }));

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { WorksheetForm } from '../worksheet-form';
import { crossStandardCarryNote } from '@/lib/projects/cross-standard-carry';

function makeField(over: Record<string, unknown>) {
  return {
    id: '', symbol: '', labelDe: '', labelEn: null, unit: null,
    dataType: 'json' as const, isRequired: false, enumValues: null,
    validationRules: null, clauseReference: null, verificationStatus: 'x',
    description: null, sectionId: 's1', orderIndex: 0, active: true,
    widget: null, uiConfig: null, lookup: null, visibleWhen: null,
    ...over,
  };
}
const SECTIONS = [{ id: 's1', code: 'C', titleDe: 'Risiken', titleEn: null, orderIndex: 0, parentSectionId: null, visibleWhen: null }];
// 820-2-10 as encoded: risk_register (widget register, ui_config.editor = risk_register), risk_mitigation_plan (widget NULL)
const FIELDS = [
  makeField({ id: 'f-rr', symbol: 'risk_register', labelDe: 'Risikoregister', orderIndex: 0, widget: 'register',
    uiConfig: { title: 'Risikoanalyse (DWA-M 820-1 Anhang A, Tab. A.1)', editor: 'risk_register', placement: 'section', columns: [{ key: 'risk', type: 'text', label: 'Risiko' }] } }),
  makeField({ id: 'f-mp', symbol: 'risk_mitigation_plan', labelDe: 'Risiko-Maßnahmenplan', orderIndex: 1 }),
];
const CARRIED = { type: 'json' as const, value: { rows: [{ id: 'r1', group: 'Projektumfeld', risk: 'Synthetisch' }] } };
const NOTE = crossStandardCarryNote('risk_register', 'DWA-M-820-1', 'DWA-M-820-2')!;
const PROPS = {
  locale: 'de' as const,
  projectId: 'p',
  worksheet: { template: { code: '820-2-10', titleDe: 'Risikomanagement', titleEn: null } },
  instance: { id: 'inst-carry', status: 'draft' as const },
  sections: SECTIONS,
  fields: FIELDS,
  equations: [],
  complianceRequirements: [],
  complianceSuggestions: [],
  initialValues: { 'f-rr': CARRIED },
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: { risk_register: 'M820-06' },
  carriedNoteByFieldId: { 'f-rr': NOTE },
  standardCode: 'DWA-M-820-2',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

describe('WorksheetForm — cross-standard carry-over note (820-2-10 risk register from DWA-M 820-1)', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it('the carried register shows the note above its editor; the other carrier (nothing carried) shows none', () => {
    render(<WorksheetForm {...PROPS} />);
    const note = screen.getByTestId('carried-risk_register');
    expect(note.textContent).toContain('taken from DWA-M 820-1 (M820-06 / M820-07)');
    expect(note.textContent).toContain('überschreibbar');
    expect(screen.getByTestId('rr-f-rr')).toBeInTheDocument();
    expect(screen.queryByTestId('carried-risk_mitigation_plan')).toBeNull();
    expect(screen.getByTestId('mp-f-mp')).toBeInTheDocument();
  });

  it('overwriting the carried value (first edit = own 820-2 value) removes the note', () => {
    render(<WorksheetForm {...PROPS} />);
    expect(screen.getByTestId('carried-risk_register')).toBeInTheDocument();
    act(() => { useWorksheetStore.getState().setField('f-rr', { type: 'json', value: { rows: [{ id: 'r2', risk: 'Eigenes Risiko' }] } }); });
    expect(screen.queryByTestId('carried-risk_register')).toBeNull();
  });

  it('no note without a carried value (prop absent)', () => {
    render(<WorksheetForm {...PROPS} carriedNoteByFieldId={undefined} />);
    expect(screen.queryByTestId('carried-risk_register')).toBeNull();
  });
});
