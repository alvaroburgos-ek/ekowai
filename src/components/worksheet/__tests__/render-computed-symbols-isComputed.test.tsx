/**
 * Finding E (render, isComputed lever) — exercises computeComputedSymbols →
 * isComputed THROUGH the real WorksheetForm + real DynamicField.
 *
 * BINDING-CONDITION NOTE (read the task report): on the ACTUAL A138-17 topology,
 * A_S_m has NO local field — it is inherited-only from A138-12 (verified against
 * the DB), so it is hidden from the editable grid and its isComputed flag is
 * never rendered. The A138-17 "Fehlt: A_S_m → V_M blocked" symptom is governed
 * by engine WRITE-BACK suppression (composeEngineSuppressedSymbols, defect #22,
 * already merged), NOT by isComputed. See render-a138-17-asm-inherited.test.tsx
 * for that (real-topology) render guard.
 *
 * This test instead exercises the exact lever Finding E's fix changes: a symbol
 * that is BOTH a local equation output (has a VISIBLE local field) AND has an
 * inherited value from a different worksheet. computeComputedSymbols must drop
 * it from the computed set → DynamicField renders it editable (isComputed=false)
 * showing the inherited value, instead of a read-only engine-output card.
 *
 * Reverting worksheet-form's computedSymbols memo to the old union (no home-
 * exclusion) puts the symbol back in the set → isComputed=true → input readOnly
 * → assertion FAILS. That is the RED the fix closes.
 */

vi.mock('@/lib/actions/worksheet', () => ({ saveWorksheet: vi.fn(async () => ({ ok: true, warnings: [] })) }));
vi.mock('@/lib/actions/worksheet-transition', () => ({ transitionWorksheet: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/citations', () => ({ addCitation: vi.fn(async () => ({ ok: true })), removeCitation: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/documents', () => ({ uploadDocument: vi.fn(async () => ({ ok: true, id: 'd' })) }));
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
vi.mock('../surface-inventory-editor', () => ({ SurfaceInventoryEditor: () => null }));
vi.mock('../surface-source-banner', () => ({ SurfaceSourceBanner: () => null }));
vi.mock('@/components/form-templates/SourceFormReferencePanel', () => ({ SourceFormReferencePanel: () => null }));
vi.mock('@/components/documents/citation-picker', () => ({ CitationPicker: () => null }));
vi.mock('@/components/documents/citation-chips', () => ({ CitationChips: () => null }));
vi.mock('./verify-button', () => ({ VerifyButton: () => null }));

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { WorksheetForm } from '../worksheet-form';

const OUT_FIELD_ID = 'fld-out';
const IN_FIELD_ID = 'fld-in';
const INHERITED_VALUE = 42;

function makeField(over: Record<string, unknown>) {
  return {
    id: '', symbol: '', labelDe: '', labelEn: null, unit: null,
    dataType: 'number' as const, isRequired: false, enumValues: null,
    validationRules: null, clauseReference: null, verificationStatus: 'x',
    description: null, sectionId: null, orderIndex: 0, active: true, ...over,
  };
}
function makeEq(over: Record<string, unknown>) {
  return {
    id: '', equationNumber: '', formula: '', inputSymbols: null, outputSymbol: null,
    clauseReference: null, description: null, verificationStatus: 'x', ...over,
  };
}

// Symbol S: a LOCAL equation output field on this worksheet whose VALUE is
// inherited from another worksheet (inheritedFromBySymbol['S']='OTHER'). This is
// exactly the shape computeComputedSymbols' home-exclusion governs.
const FIELDS = [
  makeField({ id: OUT_FIELD_ID, symbol: 'S', labelDe: 'Geteilte Größe', unit: 'm²', orderIndex: 0 }),
  makeField({ id: IN_FIELD_ID, symbol: 'X', labelDe: 'Lokale Eingabe', unit: 'm', orderIndex: 1 }),
];
const EQUATIONS = [
  makeEq({ id: '22222222-2222-4222-8222-222222222001', equationNumber: '99', formula: 'S = X * 2', inputSymbols: ['X'], outputSymbol: 'S' }),
];

const PROPS = {
  locale: 'de' as const,
  projectId: 'p',
  worksheet: { template: { code: 'A138-99', titleDe: 'T', titleEn: null } },
  instance: { id: 'inst-cs', status: 'draft' as const },
  sections: [],
  fields: FIELDS,
  equations: EQUATIONS,
  complianceRequirements: [],
  complianceSuggestions: [],
  initialValues: { [OUT_FIELD_ID]: { type: 'number' as const, value: INHERITED_VALUE } },
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: { S: 'A138-OTHER' },
  standardCode: 'DWA-A-138-1',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

describe('Finding E (render) — locally-output-but-inherited symbol is NOT isComputed', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it('S renders editable (isComputed=false) and shows the inherited value', () => {
    const { getByLabelText } = render(<WorksheetForm {...PROPS} />);
    const input = getByLabelText('Geteilte Größe', { exact: false }) as HTMLInputElement;
    // OLD union → S ∈ computedSymbols → isComputed=true → readOnly. FIXED → editable.
    expect(input.readOnly).toBe(false);
    expect(input.value).toBe(String(INHERITED_VALUE));
  });
});
