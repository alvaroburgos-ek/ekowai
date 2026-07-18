/**
 * Finding E (render-level) — the test that would have caught the A_S_m masking
 * the first time. BINDING CONDITION: it exercises the REAL WorksheetForm with
 * the REAL DynamicField and the REAL useEquationEngine so the path
 *   computeComputedSymbols → isComputed → DynamicField(readOnly/inherited value)
 * runs end-to-end through the production component (NOT a synthetic hook feed).
 *
 * A138-17 (Mulde) topology:
 *   - A_S_m: LOCAL field on A138-17 (Gl.16's output field), but its VALUE is
 *     INHERITED from A138-12 (inheritedFromBySymbol['A_S_m']='A138-12'). The
 *     store is seeded with that inherited value.
 *   - Gl.16 (eqNumber '16') outputs A_S_m — SERVER-ONLY sweep; the client can't
 *     compute it (needs h_M in the Mulde geometry sweep). On the buggy code the
 *     union makes A_S_m a local computed output → isComputed=true → the A_S_m
 *     input renders read-only from the (blank) client engine → masks inherited.
 *   - Gl.15 (eqNumber '15') V_M = A_S_m · h_M — a consumer that must compute
 *     from the inherited A_S_m.
 *
 * Assertions:
 *   (a) the A_S_m field is NOT rendered isComputed → its <input> is editable
 *       (readOnly=false) and shows the INHERITED value, not a blank engine card.
 *   (b) Gl.15/V_M computes from the inherited A_S_m (store V_M field = A_S_m·h_M).
 *
 * RED (current code, before the render fix): A_S_m ∈ computedSymbols union →
 * isComputed=true → input readOnly + value blank → assertion (a) FAILS; V_M also
 * blocked because the write-back was suppressed AND the field is masked.
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
// DynamicField's document/citation sub-widgets hit deeper deps; stub only those.
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

const INHERITED_A_S_M = 100; // value inherited from A138-12
const H_M = 0.3;
const EXPECTED_V_M = INHERITED_A_S_M * H_M; // 30

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
  // REAL A138-17 topology (verified against the DB): A_S_m has NO local field
  // on A138-17 — it is INHERITED from A138-12 (mergeInheritedFields injects it
  // with inheritedFromWorksheet='A138-12' so equations resolve it; it renders in
  // the read-only "Vorgelagerte Werte" panel, NOT the editable grid). h_M and
  // V_M are the real local A138-17 fields.
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
  // Gl.16 — outputs A_S_m (home is A138-12; server-only geometry sweep).
  makeEq({
    id: '11111111-1111-4111-8111-111111111116',
    equationNumber: '16',
    formula: 'A_S_m = A_M / (1 + ...)',
    inputSymbols: [],
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
  // Inherited values arrive via the initialValues prop (the production path:
  // the server resolves inherited A_S_m from A138-12 and passes it here).
  // WorksheetForm.init(instance.id, initialValues, …) seeds the store on mount,
  // so seeding the store directly before render would be wiped — seed HERE.
  initialValues: {
    [A_S_M_FIELD_ID]: { type: 'number' as const, value: INHERITED_A_S_M },
    [H_M_FIELD_ID]: { type: 'number' as const, value: H_M },
  },
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: { A_S_m: 'A138-12' },
  standardCode: 'DWA-A-138-1',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

describe('Finding E (render) — A138-17 inherited A_S_m must not be masked as computed', () => {
  beforeEach(() => {
    // Reset the store so each test starts clean; WorksheetForm re-inits on mount
    // from initialValues anyway, but this avoids cross-test bleed.
    act(() => {
      useWorksheetStore.getState().init('reset', {}, {}, {});
    });
  });

  it('(a) the inherited A_S_m value survives (renders in the upstream panel, not "—")', () => {
    const { container } = render(<WorksheetForm {...WORKSHEET_FORM_PROPS} />);

    // A_S_m is inherited → shown in the read-only "Vorgelagerte Werte" panel,
    // keyed by data-symbol. On the buggy code the local Gl.16 output claims
    // A_S_m and the engine write-back CLEARS the inherited store value → the
    // panel shows "—". FIXED → the inherited value (100) is preserved.
    const asmRow = container.querySelector('[data-symbol="A_S_m"]');
    expect(asmRow).not.toBeNull();
    const shown = asmRow!.textContent ?? '';
    expect(shown).toContain(String(INHERITED_A_S_M)); // "100", not "—"

    // Direct store check: the inherited A_S_m value must not be null.
    const asm = useWorksheetStore.getState().values[A_S_M_FIELD_ID];
    expect(asm?.type === 'number' ? asm.value : null).toBe(INHERITED_A_S_M);
  });

  it('(b) Gl.15 / V_M computes from the inherited A_S_m', () => {
    render(<WorksheetForm {...WORKSHEET_FORM_PROPS} />);
    // The engine write-back effect runs on mount; V_M = A_S_m·h_M is written to
    // the store. When the inherited A_S_m is cleared, V_M cannot compute (null).
    const vm = useWorksheetStore.getState().values[V_M_FIELD_ID];
    expect(vm?.type === 'number' ? vm.value : null).toBeCloseTo(EXPECTED_V_M, 6);
  });
});
