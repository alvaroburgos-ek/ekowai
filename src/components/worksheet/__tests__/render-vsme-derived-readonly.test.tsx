/**
 * Task 4 (dp-vsme-02) — DIAGNOSIS test.
 *
 * The reasoning map (generated from DB artifacts only, NOT runtime — see its
 * own caveat in dp-vsme-02-derived-editable.md) claims "15 derived-yet-editable
 * fields": every VSME equation output is stored as a plain `number` field, so
 * a DB-only scan sees it as hand-enterable. But `computeComputedSymbols` (the
 * render-layer home-exclusion lock, src/lib/eval/computed-symbols.ts) marks a
 * LOCAL equation output as `isComputed=true` -> DynamicField renders it
 * `readOnly`, UNLESS its home is a different worksheet
 * (`inheritedFromBySymbol[out]` set) or it has no local field.
 *
 * This test exercises that lock through the real WorksheetForm + DynamicField
 * with VSME-shaped fixtures, verified against prod today via Supabase MCP:
 *
 *   - VSME-EQ-08/09 (TotalWasteGeneratedMass/Volume) are hosted on VSME-B07.200
 *     with both inputs (TotalHazardousWasteGeneratedMass,
 *     TotalNonHazardousWasteGeneratedMass) as LOCAL fields on the same sheet.
 *   - VSME-EQ-01 (NumberOfEmployees = NumberOfPermanentContractEmployees +
 *     NumberOfTemporaryContractEmployees) is hosted on VSME-B01.000, and
 *     `NumberOfEmployees` is a field on VSME-B01.000 too (query 2026-07-27).
 *     The reasoning map claimed EQ-01 lives on B08.000 (it read the XBRL
 *     calculation-linkbase role `role-b08000`, not the DB `worksheet_template_id`
 *     the equation and field actually resolve to) — this fixture models the
 *     VERIFIED PROD SHAPE (equation + field both on B01.000), not the map's
 *     claim, and the assertion below is what settles which one governs runtime.
 *
 * DIAGNOSIS VERDICT (see task-4-report.md for the full writeup): BOTH pass.
 * The runtime render lock is already correct for every VSME equation output —
 * all 10 VSME equations (EQ-01..EQ-10) are same-sheet (output field's home ==
 * the equation's host worksheet), so none of them exercise the
 * `inheritedFromBySymbol` home-exclusion path this file's sibling
 * (render-computed-symbols-isComputed.test.tsx) covers. The map's "15
 * derived-yet-editable" headline is a DB-schema observation (these ARE plain
 * `number` fields with no DB-level lock flag), not a runtime defect — no code
 * change follows from this test.
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

const baseProps = {
  locale: 'de' as const,
  projectId: 'p',
  instance: { id: 'inst-vsme', status: 'draft' as const },
  sections: [],
  complianceRequirements: [],
  complianceSuggestions: [],
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  standardCode: 'VSME',
  docs: [],
};

describe('VSME derived-output render lock (dp-vsme-02 diagnosis)', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  // Side 1: VSME-B07.200 — VSME-EQ-08 (TotalWasteGeneratedMass = Hazardous +
  // NonHazardous) with all three symbols as LOCAL fields on the same sheet.
  it('B07.200: TotalWasteGeneratedMass (same-sheet equation output) is readOnly', () => {
    const OUT_ID = 'fld-total-waste-mass';
    const HAZ_ID = 'fld-haz-mass';
    const NONHAZ_ID = 'fld-nonhaz-mass';

    const fields = [
      makeField({ id: HAZ_ID, symbol: 'TotalHazardousWasteGeneratedMass', labelDe: 'Gefährlicher Abfall, Masse', unit: 't', orderIndex: 0 }),
      makeField({ id: NONHAZ_ID, symbol: 'TotalNonHazardousWasteGeneratedMass', labelDe: 'Ungefährlicher Abfall, Masse', unit: 't', orderIndex: 1 }),
      makeField({ id: OUT_ID, symbol: 'TotalWasteGeneratedMass', labelDe: 'Gesamtabfall, Masse', unit: 't', orderIndex: 2 }),
    ];
    const equations = [
      makeEq({
        id: '33333333-3333-4333-8333-333333333008',
        equationNumber: 'VSME-EQ-08',
        formula: 'TotalHazardousWasteGeneratedMass + TotalNonHazardousWasteGeneratedMass',
        inputSymbols: ['TotalHazardousWasteGeneratedMass', 'TotalNonHazardousWasteGeneratedMass'],
        outputSymbol: 'TotalWasteGeneratedMass',
      }),
    ];

    const { getByLabelText } = render(
      <WorksheetForm
        {...baseProps}
        worksheet={{ template: { code: 'VSME-B07.200', titleDe: 'Abfall', titleEn: null } }}
        fields={fields}
        equations={equations}
        initialValues={{
          [HAZ_ID]: { type: 'number', value: 3 },
          [NONHAZ_ID]: { type: 'number', value: 7 },
          [OUT_ID]: { type: 'number', value: 10 },
        }}
        inheritedFromBySymbol={{}}
      />,
    );

    const input = getByLabelText('Gesamtabfall, Masse', { exact: false }) as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });

  // Side 2: VSME-B01.000 — VSME-EQ-01 (NumberOfEmployees = Permanent +
  // Temporary). Verified against prod 2026-07-27: the equation's
  // worksheet_template_id AND the NumberOfEmployees field's worksheet_template_id
  // are BOTH VSME-B01.000 (the map's "hosted on B08.000" claim does not match
  // the DB). Inputs are declared on VSME-B08.000 in prod with no
  // consumer_worksheets entry (a separate, out-of-scope materialization gap —
  // see project_engine_output_materialization) so they are NOT modeled as
  // inherited fields here; only the OUTPUT symbol's readOnly status is under
  // test, matching Step 1 of the brief.
  it('B01.000: NumberOfEmployees (local equation output) is readOnly', () => {
    const OUT_ID = 'fld-number-of-employees';

    const fields = [
      makeField({ id: OUT_ID, symbol: 'NumberOfEmployees', labelDe: 'Anzahl der Mitarbeiter', unit: null, orderIndex: 0 }),
    ];
    const equations = [
      makeEq({
        id: '33333333-3333-4333-8333-333333333001',
        equationNumber: 'VSME-EQ-01',
        formula: 'NumberOfPermanentContractEmployees + NumberOfTemporaryContractEmployees',
        inputSymbols: ['NumberOfPermanentContractEmployees', 'NumberOfTemporaryContractEmployees'],
        outputSymbol: 'NumberOfEmployees',
      }),
    ];

    const { getByLabelText } = render(
      <WorksheetForm
        {...baseProps}
        worksheet={{ template: { code: 'VSME-B01.000', titleDe: 'Allgemeine Angaben', titleEn: null } }}
        fields={fields}
        equations={equations}
        initialValues={{
          [OUT_ID]: { type: 'number', value: 12 },
        }}
        inheritedFromBySymbol={{}}
      />,
    );

    const input = getByLabelText('Anzahl der Mitarbeiter', { exact: false }) as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });
});
