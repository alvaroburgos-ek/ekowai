/**
 * Fix-wave 2 (render-level) — the test that reproduces the ACTUAL live symptom
 * (V_M blocked on A138-17) with the REAL prod topology, and would have caught
 * the mis-keyed Finding-E fix.
 *
 * WHY THE PRIOR render test (render-a138-17-asm-inherited.test.tsx) was a no-op
 * proof: it seeded `inheritedFromBySymbol: { A_S_m: 'A138-12' }`. In PROD that
 * key is UNSET for A_S_m on A138-17 — the injected inherited A_S_m field has a
 * project_parameters row by field-id (943.43), so the page's initialValues loop
 * resolves it via STEP 1 (local param), NOT step 2 (same-symbol upstream), so
 * inheritedFromBySymbol[A_S_m] is never set. The OLD suppress/exclude signal
 * (keyed on inheritedFromBySymbol) is therefore ∅ for A_S_m → the Gl.16 null
 * write-back is NOT suppressed → it CLOBBERS the inherited 943.43 → Gl.15 reads
 * null → V_M blocked.
 *
 * The reliable home signal is the FIELD being inherited:
 * `field.inheritedFromWorksheet` (set on the injected A_S_m field on A138-17).
 *
 * REAL prod-shaped A138-17 (Mulde) topology reproduced here:
 *   - A_S_m: INJECTED INHERITED field (inheritedFromWorksheet='A138-12', active,
 *     hidden from the grid) carrying the initial value 943.43 in the store.
 *   - Gl.16: local equation, outputSymbol 'A_S_m', inputs unresolvable
 *     client-side (server-only Dauerstufen sweep, no D) → engine state is NOT
 *     'computed' → desired=null in the write-back effect.
 *   - Gl.15: local equation V_M = A_S_m · h_M (outputSymbol V_M), h_M = 0.30.
 *   - inheritedFromBySymbol = {} for A_S_m (mirrors prod — the crux that makes
 *     the OLD signal a no-op).
 *
 * Assertions (on the FIX):
 *   - the A_S_m store value STAYS 943.43 (NOT clobbered to null).
 *   - Gl.15/V_M computes from the inherited A_S_m: 943.43 · 0.30 ≈ 283.03.
 *
 * RED (current code): composeEngineSuppressedSymbols keyed on
 * inheritedFromBySymbol → A_S_m NOT suppressed → Gl.16 null write-back clobbers
 * 943.43 → A_S_m null, V_M blocked → both assertions FAIL.
 */

// ── Mocks — declared BEFORE imports the mocked modules touch ──────────────────
vi.mock('@/lib/actions/worksheet', () => ({
  saveWorksheet: vi.fn(async () => ({ ok: true, warnings: [] })),
}));
vi.mock('@/lib/actions/worksheet-transition', () => ({
  transitionWorksheet: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/overrides', () => ({
  recordManualOverride: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/citations', () => ({
  addCitation: vi.fn(async () => ({ ok: true })),
  removeCitation: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/documents', () => ({
  uploadDocument: vi.fn(async () => ({ ok: true, id: 'stub-doc' })),
}));
vi.mock('@/lib/actions/verification', () => ({
  verifyField: vi.fn(async () => ({ ok: true })),
  unverifyField: vi.fn(async () => ({ ok: true })),
  verifyEquation: vi.fn(async () => ({ ok: true })),
  unverifyEquation: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/project-standards', () => ({
  addStandardByCodeToProject: vi.fn(async () => ({ ok: true })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={String(href)}>{children}</a>
  ),
}));

// Sub-components with server-only / heavy deps (NOT DynamicField — that is the
// component under test):
vi.mock('../section-group', () => ({ SectionGroup: () => null }));
vi.mock('../equations-block', () => ({ EquationsBlock: () => null }));
vi.mock('../compliance-block', () => ({ ComplianceBlock: () => null }));
vi.mock('../approval-bar', () => ({ ApprovalBar: () => null }));
vi.mock('../equation-engine-card', () => ({ EquationEngineCard: () => null }));
vi.mock('../rainfall-tables-editor', () => ({ RainfallTablesEditor: () => null }));
vi.mock('../rainfall-table-selector', () => ({ RainfallTableSelector: () => null }));
vi.mock('../surface-inventory-editor', () => ({ SurfaceInventoryEditor: () => null }));
vi.mock('../surface-source-banner', () => ({ SurfaceSourceBanner: () => null }));
vi.mock('@/components/form-templates/SourceFormReferencePanel', () => ({
  SourceFormReferencePanel: () => null,
}));
vi.mock('@/components/documents/citation-picker', () => ({ CitationPicker: () => null }));
vi.mock('@/components/documents/citation-chips', () => ({ CitationChips: () => null }));
vi.mock('./verify-button', () => ({ VerifyButton: () => null }));

// ── Imports (AFTER mock declarations) ─────────────────────────────────────────
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { WorksheetForm } from '../worksheet-form';

// ── Field ids ─────────────────────────────────────────────────────────────────
const A_S_M_FIELD_ID = 'fld-a_s_m';
const H_M_FIELD_ID = 'fld-h_m';
const V_M_FIELD_ID = 'fld-v_m';

const INHERITED_A_S_M = 943.43; // value inherited from A138-12 (prod value)
const H_M = 0.3;
const EXPECTED_V_M = INHERITED_A_S_M * H_M; // 283.029

function makeField(over: Record<string, unknown>) {
  return {
    id: '',
    symbol: '',
    labelDe: '',
    labelEn: null,
    unit: null,
    dataType: 'number' as const,
    isRequired: false,
    enumValues: null,
    validationRules: null,
    clauseReference: null,
    verificationStatus: 'imported_unverified',
    description: null,
    sectionId: null,
    orderIndex: 0,
    active: true,
    ...over,
  };
}

const FIELDS = [
  // A_S_m INJECTED INHERITED field (inheritedFromWorksheet='A138-12'), carrying
  // the prod value 943.43. It is ALSO the output field of local Gl.16.
  makeField({ id: A_S_M_FIELD_ID, symbol: 'A_S_m', labelDe: 'Mittlere Versickerungsfläche', unit: 'm²', orderIndex: 0, inheritedFromWorksheet: 'A138-12' }),
  makeField({ id: H_M_FIELD_ID, symbol: 'h_M', labelDe: 'Muldentiefe', unit: 'm', orderIndex: 1 }),
  makeField({ id: V_M_FIELD_ID, symbol: 'V_M', labelDe: 'Muldenvolumen', unit: 'm³', orderIndex: 2 }),
];

function makeEq(over: Record<string, unknown>) {
  return {
    id: '',
    equationNumber: '',
    formula: '',
    inputSymbols: null,
    outputSymbol: null,
    clauseReference: null,
    description: null,
    verificationStatus: 'imported_unverified',
    ...over,
  };
}

const EQUATIONS = [
  // Gl.16 — outputs A_S_m. Inputs reference symbols with NO field/value on this
  // worksheet (server-only Dauerstufen sweep) → engine state is NOT 'computed'
  // → desired=null in the write-back effect → clobbers the inherited value
  // UNLESS A_S_m is in suppressWriteBackSymbols.
  makeEq({
    id: '11111111-1111-4111-8111-111111111116',
    equationNumber: '16',
    formula: 'A_S_m = A_M / (1 + a_D)',
    inputSymbols: ['A_M', 'a_D'],
    outputSymbol: 'A_S_m',
  }),
  // Gl.15 — V_M = A_S_m · h_M (consumer of the inherited A_S_m).
  makeEq({
    id: '11111111-1111-4111-8111-111111111115',
    equationNumber: '15',
    formula: 'V_M = A_S_m * h_M',
    inputSymbols: ['A_S_m', 'h_M'],
    outputSymbol: 'V_M',
  }),
];

const WORKSHEET_FORM_PROPS = {
  locale: 'de' as const,
  projectId: 'proj-fixture',
  worksheet: { template: { code: 'A138-17', titleDe: 'Mulde', titleEn: null } },
  instance: { id: 'inst-a138-17', status: 'draft' as const },
  sections: [],
  fields: FIELDS,
  equations: EQUATIONS,
  complianceRequirements: [],
  complianceSuggestions: [],
  initialValues: {
    [A_S_M_FIELD_ID]: { type: 'number' as const, value: INHERITED_A_S_M },
    [H_M_FIELD_ID]: { type: 'number' as const, value: H_M },
  },
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  // CRUX: inheritedFromBySymbol is EMPTY for A_S_m (mirrors prod — the value
  // came via the injected field-id row, NOT same-symbol upstream). This makes
  // the OLD (inheritedFromBySymbol-keyed) signal a no-op.
  inheritedFromBySymbol: {},
  standardCode: 'DWA-A-138-1',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

describe('Fix-wave 2 (render) — prod-signal: A138-17 inherited A_S_m must not be clobbered by Gl.16 null write-back', () => {
  beforeEach(() => {
    act(() => {
      useWorksheetStore.getState().init('reset', {}, {}, {});
    });
  });

  it('the inherited A_S_m store value survives (NOT clobbered to null by Gl.16)', () => {
    render(<WorksheetForm {...WORKSHEET_FORM_PROPS} />);
    const asm = useWorksheetStore.getState().values[A_S_M_FIELD_ID];
    expect(asm?.type === 'number' ? asm.value : null).toBe(INHERITED_A_S_M);
  });

  it('Gl.15 / V_M computes from the inherited A_S_m (≈ 943.43 · 0.30 = 283.03)', () => {
    render(<WorksheetForm {...WORKSHEET_FORM_PROPS} />);
    const vm = useWorksheetStore.getState().values[V_M_FIELD_ID];
    expect(vm?.type === 'number' ? vm.value : null).toBeCloseTo(EXPECTED_V_M, 3);
  });
});
