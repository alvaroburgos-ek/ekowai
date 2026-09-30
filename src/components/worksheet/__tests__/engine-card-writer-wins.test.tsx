/**
 * Readiness run 2026-09-30, case A5 (A138-18 Rigole): the field `s_R` has TWO equations —
 * Gl. 21 (thick-wall pipe, the writer) and Gl. 22 (thin-wall alternative, `displayOnly` in
 * equation-profiles). The form rendered the LAST equation's card beside the field, so the
 * sheet said s_R = 0,3959 (Gl. 22) while the saved value was 0,3925 (Gl. 21). The writer's
 * card must own the slot; the display-only alternative goes to the bottom section.
 *
 * Uses the REAL profile ids of Gl. 21 / Gl. 22 so the displayOnly lookup is exercised as
 * in production; the card itself is mocked to a marker carrying the equation number.
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
vi.mock('../equation-engine-card', () => ({
  EquationEngineCard: ({ equationNumber, outputSymbol }: { equationNumber: string; outputSymbol: string }) => (
    <div data-testid="engine-card" data-eq={equationNumber} data-out={outputSymbol} />
  ),
}));
vi.mock('../rainfall-tables-editor', () => ({ RainfallTablesEditor: () => null }));
vi.mock('../surface-source-banner', () => ({ SurfaceSourceBanner: () => null }));
vi.mock('@/components/form-templates/SourceFormReferencePanel', () => ({ SourceFormReferencePanel: () => null }));
vi.mock('@/components/documents/citation-picker', () => ({ CitationPicker: () => null }));
vi.mock('@/components/documents/citation-chips', () => ({ CitationChips: () => null }));
vi.mock('@/components/norm-text/clause-chip', () => ({ ClauseChip: () => null }));
vi.mock('../verify-button', () => ({ VerifyButton: () => null }));

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { equationProfiles } from '@/lib/eval/equation-profiles';
import { WorksheetForm } from '../worksheet-form';

const GL21_ID = '069c2b02-8883-48a4-82ce-b21c9ef1fff8'; // writer (not displayOnly)
const GL22_ID = '20c31318-7401-4f89-a27b-bc3cf8723548'; // displayOnly alternative

function makeField(over: Record<string, unknown>) {
  return {
    id: '', symbol: '', labelDe: '', labelEn: null, unit: null,
    dataType: 'number' as const, isRequired: false, enumValues: null,
    validationRules: null, clauseReference: null, verificationStatus: 'x',
    description: null, sectionId: 's1', orderIndex: 0, active: true,
    widget: null, uiConfig: null, lookup: null, visibleWhen: null,
    ...over,
  };
}
const num = (id: string, symbol: string, orderIndex: number) => makeField({ id, symbol, labelDe: symbol, orderIndex });

const SECTIONS = [{ id: 's1', code: 'B', titleDe: 'Rigole', titleEn: null, orderIndex: 0, parentSectionId: null, visibleWhen: null }];
const FIELDS = [
  num('f-sF', 's_F', 0), num('f-bR', 'b_R', 1), num('f-hR', 'h_R', 2), num('f-az', 'az', 3),
  num('f-di', 'd_i', 4), num('f-da', 'd_a', 5), num('f-sR', 's_R', 6),
];
const eqBase = { clauseReference: '§6.4.2', description: null, verificationStatus: 'engineer_verified' };
const EQUATIONS = [
  // Gl. 21 first, Gl. 22 LAST — the order that produced the defect.
  { ...eqBase, id: GL21_ID, equationNumber: '21', outputSymbol: 's_R',
    formula: 's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi / 4) * ((d_i^2 / s_F) - d_a^2))',
    inputSymbols: ['s_F', 'b_R', 'h_R', 'az', 'd_i', 'd_a'] },
  { ...eqBase, id: GL22_ID, equationNumber: '22', outputSymbol: 's_R',
    formula: 's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi * d^2 / 4) * ((1 / s_F) - 1))',
    inputSymbols: ['s_F', 'b_R', 'h_R', 'az', 'd'] },
];
const VALUES = {
  'f-sF': { type: 'number' as const, value: 0.35 }, 'f-bR': { type: 'number' as const, value: 1 },
  'f-hR': { type: 'number' as const, value: 1 }, 'f-az': { type: 'number' as const, value: 1 },
  'f-di': { type: 'number' as const, value: 0.3 }, 'f-da': { type: 'number' as const, value: 0.32 },
};
const PROPS = {
  locale: 'de' as const, projectId: 'p',
  worksheet: { template: { code: 'A138-18', titleDe: 'Rigole Bemessung', titleEn: null } },
  instance: { id: 'inst-18', status: 'draft' as const },
  sections: SECTIONS, fields: FIELDS, equations: EQUATIONS,
  complianceRequirements: [], complianceSuggestions: [],
  initialValues: VALUES, initialSources: {}, initialCitations: {},
  sameSymbolValuesBySymbol: {}, inheritedFromBySymbol: {},
  standardCode: 'DWA-A-138-1', docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

describe('WorksheetForm — the WRITER equation owns the card beside its output field', () => {
  beforeEach(() => { act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); }); });

  it('sanity: the real profile marks Gl. 22 displayOnly and Gl. 21 not', () => {
    expect(equationProfiles[GL22_ID]?.displayOnly).toBe(true);
    expect(equationProfiles[GL21_ID]?.displayOnly).not.toBe(true);
  });

  it('s_R gets the Gl. 21 card beside the field; Gl. 22 is listed in the bottom section only', () => {
    const { container } = render(<WorksheetForm {...PROPS} />);
    const cards = screen.getAllByTestId('engine-card');
    // Exactly one card carries Gl. 21 and one carries Gl. 22 — nothing is dropped.
    expect(cards.map((c) => c.dataset.eq).sort()).toEqual(['21', '22']);
    // Beside the s_R input (the DynamicField wrapper carries data-symbol) sits the WRITER's card.
    const sRWrapper = container.querySelector('[data-symbol="s_R"]');
    expect(sRWrapper).not.toBeNull();
    const inField = Array.from(sRWrapper!.querySelectorAll('[data-testid="engine-card"]')).map((c) => (c as HTMLElement).dataset.eq);
    expect(inField).toEqual(['21']);
    // The display-only alternative is listed in the bottom "kein Zielfeld" section instead.
    const bottom = screen.getByText('Engine-Auswertung (kein Zielfeld)').closest('section');
    expect(bottom).not.toBeNull();
    const inBottom = Array.from(bottom!.querySelectorAll('[data-testid="engine-card"]')).map((c) => (c as HTMLElement).dataset.eq);
    expect(inBottom).toEqual(['22']);
  });
});
