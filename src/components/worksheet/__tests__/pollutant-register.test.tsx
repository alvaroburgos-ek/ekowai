/**
 * VSME-B04.100 pollutant register + server-computed lock (2026-08-01 spec:
 * docs/superpowers/specs/2026-08-01-vsme-b03-b04-worksheet-fidelity-design.md).
 *
 *  1. The `pollutant_register` carrier renders via its dedicated editor
 *     section and is SKIPPED in the field grid (no "Phase 2" placeholder).
 *  2. Fields listed in serverComputedFieldIds render readOnly with the
 *     provenance hint (B03 → CO₂-table link; B04 sums → register hint).
 *  3. Editor: N/A toggle is an explicit zero statement; complete rows sum
 *     per medium.
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
import { render, act, fireEvent } from '@testing-library/react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { WorksheetForm } from '../worksheet-form';
import { PollutantRegisterEditor } from '../pollutant-register-editor';

function makeField(over: Record<string, unknown>) {
  return {
    id: '', symbol: '', labelDe: '', labelEn: null, unit: null,
    dataType: 'number' as const, isRequired: false, enumValues: null,
    validationRules: null, clauseReference: null, verificationStatus: 'x',
    description: null, sectionId: null, orderIndex: 0, active: true, ...over,
  };
}

const baseProps = {
  locale: 'de' as const,
  projectId: 'p',
  instance: { id: 'inst-vsme-b04', status: 'draft' as const },
  sections: [],
  equations: [],
  complianceRequirements: [],
  complianceSuggestions: [],
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: {},
  standardCode: 'VSME',
  docs: [],
};

const REG_ID = 'fld-pollutant-register';
const AIR_ID = 'fld-emission-air';
const WATER_ID = 'fld-emission-water';
const SOIL_ID = 'fld-emission-soil';

const b04Fields = [
  makeField({ id: REG_ID, symbol: 'pollutant_register', dataType: 'json' as const, labelDe: 'Schadstoffregister', orderIndex: 0 }),
  makeField({ id: AIR_ID, symbol: 'AmountOfEmissionToAir', labelDe: 'Amount of emission to air', unit: 't', orderIndex: 1 }),
  makeField({ id: WATER_ID, symbol: 'AmountOfEmissionToWater', labelDe: 'Amount of emission to water', unit: 't', orderIndex: 2 }),
  makeField({ id: SOIL_ID, symbol: 'AmountOfEmissionToSoil', labelDe: 'Amount of emission to soil', unit: 't', orderIndex: 3 }),
];

describe('VSME-B04.100 pollutant register wiring', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it('renders the dedicated editor section and skips the carrier in the grid', () => {
    const { queryByText, getByTestId } = render(
      <WorksheetForm
        {...baseProps}
        worksheet={{ template: { code: 'VSME-B04.100', titleDe: 'Umweltverschmutzung', titleEn: null } }}
        fields={b04Fields}
        initialValues={{ [REG_ID]: { type: 'json', value: { not_applicable: false, rows: [] } } }}
      />,
    );
    expect(getByTestId('pollutant-register-editor')).toBeTruthy();
    // The json carrier must NOT fall through to the grid's Phase-2 placeholder.
    expect(queryByText('Mehrzeilige Eingabe — Phase 2')).toBeNull();
  });

  it('locks server-derived sum fields and shows the register hint', () => {
    const { getByLabelText, getAllByTestId } = render(
      <WorksheetForm
        {...baseProps}
        worksheet={{ template: { code: 'VSME-B04.100', titleDe: 'Umweltverschmutzung', titleEn: null } }}
        fields={b04Fields}
        initialValues={{ [AIR_ID]: { type: 'number', value: 0.5 } }}
        serverComputedFieldIds={[AIR_ID, WATER_ID, SOIL_ID]}
      />,
    );
    const input = getByLabelText('Amount of emission to air', { exact: false }) as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    const hints = getAllByTestId('computed-hint');
    expect(hints.some((h) => h.textContent?.includes('Schadstoffregister'))).toBe(true);
  });

  it('locks the CO₂-engine B03 fields and links to the emissions table', () => {
    const SCOPE1_ID = 'fld-scope1';
    const { getByLabelText, getByTestId } = render(
      <WorksheetForm
        {...baseProps}
        worksheet={{ template: { code: 'VSME-B03.200', titleDe: 'Treibhausgasemissionen', titleEn: null } }}
        fields={[makeField({ id: SCOPE1_ID, symbol: 'GrossScope1GreenhouseGasEmissions', labelDe: 'GrossScope1GreenhouseGasEmissions', unit: 'tCO2eq' })]}
        initialValues={{ [SCOPE1_ID]: { type: 'number', value: 12.3 } }}
        serverComputedFieldIds={[SCOPE1_ID]}
      />,
    );
    const input = getByLabelText('GrossScope1GreenhouseGasEmissions', { exact: false }) as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    const hint = getByTestId('computed-hint');
    expect(hint.textContent).toContain('CO₂-Aktivitätslinien');
    expect(hint.querySelector('a')?.getAttribute('href')).toBe('/de/projects/p/vsme/emissions');
  });
});

describe('PollutantRegisterEditor', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it('sums complete rows per medium in the footer', () => {
    act(() => {
      useWorksheetStore.getState().init('inst-ed-1', {
        [REG_ID]: {
          type: 'json',
          value: {
            not_applicable: false,
            rows: [
              { id: 'r1', label: 'Heizanlage', pollutant: 'AmmoniaNH3Member', medium: 'air', amount_t: 0.4 },
              { id: 'r2', label: '', pollutant: 'ZincAndCompoundsZnMember', medium: 'water', amount_t: 0.25 },
              { id: 'r3', label: 'unvollständig', pollutant: null, medium: 'soil', amount_t: 9 },
            ],
          },
        },
      }, {}, {});
    });
    const { getByTestId } = render(<PollutantRegisterEditor fieldId={REG_ID} />);
    expect(getByTestId('sum-air').textContent).toBe('0,4');
    expect(getByTestId('sum-water').textContent).toBe('0,25');
    expect(getByTestId('sum-soil').textContent).toBe('0');
    expect(getByTestId('rows-complete').textContent).toBe('2/3');
  });

  it('N/A toggle writes the explicit zero statement into the carrier', () => {
    act(() => {
      useWorksheetStore.getState().init('inst-ed-2', {
        [REG_ID]: { type: 'json', value: { not_applicable: false, rows: [] } },
      }, {}, {});
    });
    const { getByTestId } = render(<PollutantRegisterEditor fieldId={REG_ID} />);
    fireEvent.click(getByTestId('pollutant-na-toggle'));
    const stored = useWorksheetStore.getState().values[REG_ID];
    expect(stored?.type).toBe('json');
    expect((stored?.value as { not_applicable: boolean }).not_applicable).toBe(true);
  });
});
