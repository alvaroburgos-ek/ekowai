// Plan 2b: PollutantRegisterEditor deleted; the VSME-B04 carrier renders through the generic RegisterEditor and the sums are Plan 2a equation states.
// Moved from pollutant-register.test.tsx (Task 4). Testid map: pollutant-register-editor → register-editor[data-symbol=pollutant_register] ·
//   sum-air/-water/-soil → footer-AmountOfEmissionToAir/-Water/-Soil · pollutant-na-toggle → flag-not_applicable · rows-complete → rows-complete.
/**
 * VSME-B04.100 pollutant register + server-computed lock (2026-08-01 spec:
 * docs/superpowers/specs/2026-08-01-vsme-b03-b04-worksheet-fidelity-design.md).
 *
 *  1. The `pollutant_register` carrier renders through the generic register
 *     editor (bottom strip) and is SKIPPED in the field grid (no "Phase 2" placeholder).
 *  2. Fields listed in serverComputedFieldIds render readOnly with the
 *     provenance hint (B03 → CO₂-table link; B04 sums → register hint).
 *  3. Editor: N/A toggle is an explicit zero statement; the per-medium sums are
 *     ENGINE states (Plan 2a fallback equations) shown in the footer — the
 *     editor computes nothing.
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
// Plan 2b: `../surface-inventory-editor` deleted (generic RegisterEditor) — its vi.mock removed.
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
import { RegisterEditor } from '../register-editor';
import { REGISTER_CONFIGS_FALLBACK } from '@/lib/eval/register-configs';

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

  it('renders the generic register editor for the carrier and skips it in the grid', () => {
    const { queryByText, getByTestId } = render(
      <WorksheetForm
        {...baseProps}
        worksheet={{ template: { code: 'VSME-B04.100', titleDe: 'Umweltverschmutzung', titleEn: null } }}
        fields={b04Fields}
        initialValues={{ [REG_ID]: { type: 'json', value: { not_applicable: false, rows: [] } } }}
      />,
    );
    // Plan 2b: was getByTestId('pollutant-register-editor') — the generic editor carries the symbol as data-symbol.
    expect(getByTestId('register-editor').dataset.symbol).toBe('pollutant_register');
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
    const regHint = hints.find((h) => h.textContent?.includes('Schadstoffregister'));
    expect(regHint).toBeTruthy();
    // Plan 2b Task 3 fix round 1: neutral wording (the output need not be a sum) + the registerPlacement ruling (undefined ⇒ bottom).
    expect(regHint?.textContent).toContain('Aus dem Register „Schadstoffregister (E-PRTR)“ berechnet');
    expect(regHint?.textContent).toContain('unten auf dieser Seite');
    expect(regHint?.textContent).not.toContain('Summe');
  });

  it('shows the CO₂-Rechner hint on B03 engine fields BEFORE any computation (field stays editable)', () => {
    const SCOPE1_ID = 'fld-scope1-empty';
    const { getByLabelText, getByTestId } = render(
      <WorksheetForm
        {...baseProps}
        worksheet={{ template: { code: 'VSME-B03.200', titleDe: 'Treibhausgasemissionen', titleEn: null } }}
        fields={[makeField({ id: SCOPE1_ID, symbol: 'GrossScope1GreenhouseGasEmissions', labelDe: 'GrossScope1GreenhouseGasEmissions', unit: 'tCO2eq' })]}
        initialValues={{}}
      />,
    );
    const input = getByLabelText('GrossScope1GreenhouseGasEmissions', { exact: false }) as HTMLInputElement;
    expect(input.readOnly).toBe(false); // empty project: still hand-enterable
    const hint = getByTestId('computed-hint');
    expect(hint.textContent).toContain('CO₂-Rechner');
    expect(hint.querySelector('a')?.getAttribute('href')).toBe('/de/projects/p/vsme/emissions');
  });

  it('shows the register hint on B04 sum fields before first save when the register field exists', () => {
    const { getByLabelText, getAllByTestId } = render(
      <WorksheetForm
        {...baseProps}
        worksheet={{ template: { code: 'VSME-B04.100', titleDe: 'Umweltverschmutzung', titleEn: null } }}
        fields={b04Fields}
        initialValues={{}}
      />,
    );
    const input = getByLabelText('Amount of emission to air', { exact: false }) as HTMLInputElement;
    expect(input.readOnly).toBe(false);
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

// Plan 2b: the two PollutantRegisterEditor cases below became RegisterEditor / form cases (old editor deleted).
describe('VSME-B04.100 pollutant register through the generic RegisterEditor', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  const THREE_ROWS = [
    { id: 'r1', label: 'Heizanlage', pollutant: 'AmmoniaNH3Member', medium: 'air', amount_t: 0.4 },
    { id: 'r2', label: '', pollutant: 'ZincAndCompoundsZnMember', medium: 'water', amount_t: 0.25 },
    { id: 'r3', label: 'unvollständig', pollutant: null, medium: 'soil', amount_t: 9 },
  ];

  it('footer shows the per-medium sums as ENGINE states of the Plan 2a fallback equations (form-level)', () => {
    // Plan 2b: was a PollutantRegisterEditor case asserting sum-air/sum-water/sum-soil computed client-side.
    // Now the FORM adds the fallback equations (withFallbackRegisterEquations, 2a Task 7); `equations` stays [].
    const { getByTestId } = render(
      <WorksheetForm
        {...baseProps}
        worksheet={{ template: { code: 'VSME-B04.100', titleDe: 'Umweltverschmutzung', titleEn: null } }}
        fields={b04Fields}
        initialValues={{ [REG_ID]: { type: 'json', value: { not_applicable: false, rows: THREE_ROWS } } }}
      />,
    );
    expect(getByTestId('footer-AmountOfEmissionToAir').textContent).toBe('0,4');     // was sum-air
    expect(getByTestId('footer-AmountOfEmissionToWater').textContent).toBe('0,25');  // was sum-water
    // 0 for soil: sum_rows over the 2 complete rows (r3 has no pollutant) — summarizePollutants parity
    // (eval/__tests__/pollutant-register.test.ts).
    expect(getByTestId('footer-AmountOfEmissionToSoil').textContent).toBe('0');      // was sum-soil
    expect(getByTestId('rows-complete').textContent).toBe('2/3');
  });

  it('N/A toggle writes the explicit zero statement into the carrier (rows preserved)', () => {
    // Plan 2b: was getByTestId('pollutant-na-toggle') on PollutantRegisterEditor → flag-not_applicable on RegisterEditor.
    act(() => {
      useWorksheetStore.getState().init('inst-ed-2', {
        [REG_ID]: { type: 'json', value: { not_applicable: false, rows: [THREE_ROWS[0]] } },
      }, {}, {});
    });
    const { getByTestId } = render(
      <RegisterEditor fieldId={REG_ID} symbol="pollutant_register" config={REGISTER_CONFIGS_FALLBACK.pollutant_register} standardCode="VSME" />,
    );
    fireEvent.click(getByTestId('flag-not_applicable'));
    const stored = useWorksheetStore.getState().values[REG_ID];
    expect(stored?.type).toBe('json');
    const carrier = stored?.value as { not_applicable: boolean; rows: unknown[] };
    expect(carrier.not_applicable).toBe(true);
    expect(carrier.rows).toHaveLength(1);
  });

  it('not_applicable ⇒ the three footer states read 0 (engine, via flag() in the fallback formula)', () => {
    // Plan 2b: new pin — the flag is a stored carrier key; the sums are engine states, never editor arithmetic.
    const { getByTestId } = render(
      <WorksheetForm
        {...baseProps}
        worksheet={{ template: { code: 'VSME-B04.100', titleDe: 'Umweltverschmutzung', titleEn: null } }}
        fields={b04Fields}
        initialValues={{ [REG_ID]: { type: 'json', value: { not_applicable: true, rows: [] } } }}
      />,
    );
    expect(getByTestId('footer-AmountOfEmissionToAir').textContent).toBe('0');
    expect(getByTestId('footer-AmountOfEmissionToWater').textContent).toBe('0');
    expect(getByTestId('footer-AmountOfEmissionToSoil').textContent).toBe('0');
  });

  it('not_applicable WITH summable rows present ⇒ the flag wins, footer states still 0', () => {
    // Plan 2b Task 3 fix round 1 (Task 4 review): the explicit null statement overrides the rows, never the reverse.
    const { getByTestId } = render(
      <WorksheetForm
        {...baseProps}
        worksheet={{ template: { code: 'VSME-B04.100', titleDe: 'Umweltverschmutzung', titleEn: null } }}
        fields={b04Fields}
        initialValues={{ [REG_ID]: { type: 'json', value: { not_applicable: true, rows: THREE_ROWS } } }}
      />,
    );
    expect(getByTestId('footer-AmountOfEmissionToAir').textContent).toBe('0');
    expect(getByTestId('footer-AmountOfEmissionToWater').textContent).toBe('0');
    expect(getByTestId('footer-AmountOfEmissionToSoil').textContent).toBe('0');
  });
});
