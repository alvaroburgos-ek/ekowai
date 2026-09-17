// Plan 2b: moved from surface-inventory-editor.test.tsx (component deleted); same carrier shape, same assertions, testids mapped per Plan 2b Task 2.
//   c_i-readonly → lookup-value-c_i · c_s-readonly → lookup-value-c_s · kind-badge → derived-badge-kind ·
//   tab9-original → lookup-original · total-paved → footer-A_E_ba · total-unpaved → footer-A_E_nba · rows-complete → rows-complete.
// The two footer totals are ENGINE states now (single-source), so they are asserted through the real WorksheetForm
// (fourth case) instead of the editor alone.

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
vi.mock('../surface-source-banner', () => ({ SurfaceSourceBanner: () => null }));
vi.mock('@/components/form-templates/SourceFormReferencePanel', () => ({ SourceFormReferencePanel: () => null }));
vi.mock('@/components/documents/citation-picker', () => ({ CitationPicker: () => null }));
vi.mock('@/components/documents/citation-chips', () => ({ CitationChips: () => null }));
vi.mock('./verify-button', () => ({ VerifyButton: () => null }));

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor } from '../register-editor';
import { WorksheetForm } from '../worksheet-form';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { REGISTER_CONFIGS_FALLBACK } from '@/lib/eval/register-configs';
import { normalizeSurfaceCarrier, type SurfaceRow } from '@/lib/eval/surface-inventory';

const FIELD_ID = 'fixture-surface-inventory';
const CFG = REGISTER_CONFIGS_FALLBACK.surface_inventory;

function initStore(initial?: { rows: SurfaceRow[] }) {
  act(() => {
    useWorksheetStore.getState().init(
      'fixture-instance',
      initial ? { [FIELD_ID]: { type: 'json', value: initial } } : {},
      {},
      {},
    );
  });
}

function storedCarrier(): { rows: SurfaceRow[] } {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? (v.value as { rows: SurfaceRow[] }) : { rows: [] };
}

const editor = () => (
  <RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={CFG} standardCode="DWA-A-138-1" />
);

beforeEach(() => initStore());

describe('surface_inventory through the generic RegisterEditor — Tab. 9 picker', () => {
  it('selecting an Oberflächentyp auto-fills C_i/C_s read-only and derives kind', async () => {
    const user = userEvent.setup();
    render(editor());
    await user.click(screen.getByRole('button', { name: '+ Zeile hinzufügen' }));

    const typeSelect = screen.getByLabelText('Oberflächentyp');
    await user.selectOptions(typeSelect, 'park_flach');

    const row = storedCarrier().rows[0];
    expect(row.tab9_value).toBe('park_flach');
    expect(row.c_i).toBe(0.1);
    expect(row.c_s).toBe(0.2);
    expect(row.coeff_override).toBe(false);

    // C_i / C_s are read-only (not editable inputs) until override.
    expect(screen.getByTestId('lookup-value-c_i')).toHaveTextContent('0,1'); // was c_i-readonly
    expect(screen.getByTestId('lookup-value-c_s')).toHaveTextContent('0,2'); // was c_s-readonly
    expect(screen.getByTestId('derived-badge-kind')).toHaveTextContent('unbefestigt'); // was kind-badge
    // The override flag is driven by the toggle, never by a raw checkbox (Task 2 fix round 1).
    expect(screen.queryByRole('checkbox', { name: 'abweichend' })).toBeNull();
    // TAB9 group-2 optgroup label is the seed's wording (deliberate delta from the old editor's 'Teildurchlässige Flächen').
    expect(screen.getByRole('group', { name: 'Teildurchlässige / schwach ableitende Flächen' })).toBeInTheDocument();
  });

  it('"abweichend wählen" makes C_i/C_s editable, flags override, keeps the Tab. 9 pair visible', async () => {
    const user = userEvent.setup();
    initStore(
      normalizeSurfaceCarrier({
        rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }],
      }),
    );
    render(editor());

    await user.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    const ci = screen.getByLabelText('C_i (abweichend)');
    await user.clear(ci);
    await user.type(ci, '0.75');

    const row = storedCarrier().rows[0];
    expect(row.coeff_override).toBe(true);
    expect(row.c_i).toBe(0.75);
    expect(row.tab9_value).toBe('schwarzdecke_asphalt'); // unchanged
    // Original Tab. 9 pair shown for audit.
    expect(screen.getByTestId('lookup-original')).toHaveTextContent('Tab. 9: 0,9 / 1'); // was tab9-original
  });

  it('migrates legacy rows on load: Gewächshausdach drops to reselection, others clean', () => {
    initStore();
    act(() => {
      useWorksheetStore.getState().init(
        'fixture-instance',
        {
          [FIELD_ID]: {
            type: 'json',
            value: {
              rows: [
                { id: 'g', label: 'Gewächshausdach', surface_type: 'dach', area_m2: 3786.8, c_i: 0.9, c_s: 1.0 },
                { id: 'p', label: 'Parkplatz', surface_type: 'asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0 },
              ],
            },
          },
        },
        {},
        {},
      );
    });
    render(editor());
    // Gewächshausdach row shows the reselection badge.
    expect(screen.getByText(/Oberflächentyp neu wählen/i)).toBeInTheDocument();
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('1/2');
  });
});

// ---- Form-level: footer totals are engine states (single-source) -----------

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

// Prod UUIDs + Σ formulas verbatim from engine-wiring-a138-07.test.tsx / -sealed.test.tsx (the 2a bridge rewrites them).
const EQUATIONS = [
  { id: 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0', equationNumber: '2', formula: 'A_C = SUM(A_i * C_i)', inputSymbols: ['surface_inventory'], outputSymbol: 'A_C' },
  { id: 'a1380702-0000-4000-8000-000000000002', equationNumber: '2c', formula: 'C_m = SUM(A_i * C_i) / A_C', inputSymbols: ['surface_inventory'], outputSymbol: 'C_m' },
  { id: 'a1380702-0000-4000-8000-000000000003', equationNumber: '2d', formula: 'A_E_ba = SUM(A_E_ba_i)', inputSymbols: ['surface_inventory'], outputSymbol: 'A_E_ba' },
  { id: 'a1380702-0000-4000-8000-000000000004', equationNumber: '2e', formula: 'A_E_nba = SUM(A_E_nba_i)', inputSymbols: ['surface_inventory'], outputSymbol: 'A_E_nba' },
  { id: 'a1380702-0000-4000-8000-000000000005', equationNumber: '2f', formula: 'A_C_sealed = SUM(A_E_ba_i * C_i)', inputSymbols: ['surface_inventory'], outputSymbol: 'A_C_sealed' },
  { id: 'a1380702-0000-4000-8000-000000000006', equationNumber: '2g', formula: 'A_C_unsealed = SUM(A_E_nba_i * C_i)', inputSymbols: ['surface_inventory'], outputSymbol: 'A_C_unsealed' },
].map((e) => ({ ...e, clauseReference: null, description: null, verificationStatus: 'x', verifiedByLabel: null, verifiedAt: null, verificationNote: null }));

const FORM_FIELDS = [
  makeField({ id: FIELD_ID, symbol: 'surface_inventory', dataType: 'json' as const, labelDe: 'Flächenverzeichnis', orderIndex: 0 }),
  makeField({ id: 'fixture-A_E_ba', symbol: 'A_E_ba', labelDe: 'A_E,b,a', unit: 'm²', orderIndex: 1 }),
  makeField({ id: 'fixture-A_E_nba', symbol: 'A_E_nba', labelDe: 'A_E,nb,a', unit: 'm²', orderIndex: 2 }),
  makeField({ id: 'fixture-A_C', symbol: 'A_C', labelDe: 'A_C', unit: 'm²', orderIndex: 3 }),
];

const baseProps = {
  locale: 'de' as const,
  projectId: 'p',
  worksheet: { template: { code: 'A138-07', titleDe: 'Flächen', titleEn: null } },
  instance: { id: 'inst-a138-07', status: 'draft' as const },
  sections: [],
  fields: FORM_FIELDS,
  equations: EQUATIONS,
  complianceRequirements: [],
  complianceSuggestions: [],
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: {},
  standardCode: 'DWA-A-138-1',
  docs: [],
} satisfies Omit<Parameters<typeof WorksheetForm>[0], 'initialValues'>;

describe('surface_inventory through WorksheetForm — footer totals from the engine', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it('legacy two-row carrier: footer A_E_ba = 1.575,9 (Parkplatz only), A_E_nba = 0; no Phase-2 placeholder', () => {
    render(
      <WorksheetForm
        {...baseProps}
        initialValues={{
          [FIELD_ID]: {
            type: 'json',
            value: {
              rows: [
                { id: 'g', label: 'Gewächshausdach', surface_type: 'dach', area_m2: 3786.8, c_i: 0.9, c_s: 1.0 },
                { id: 'p', label: 'Parkplatz', surface_type: 'asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0 },
              ],
            },
          },
        }}
      />,
    );
    // Footer totals: A_E,b,a counts only complete paved rows (Parkplatz 1575.9);
    // Gewächshausdach is incomplete ⇒ excluded.
    expect(screen.getByTestId('footer-A_E_ba')).toHaveTextContent('1.575,9'); // was total-paved
    expect(screen.getByTestId('footer-A_E_nba')).toHaveTextContent('0'); // was total-unpaved
    expect(screen.getByTestId('register-editor').dataset.symbol).toBe('surface_inventory');
    expect(screen.queryByText('Mehrzeilige Eingabe — Phase 2')).toBeNull();
    // Bottom strip: the register section carries the config title (deliberate delta from the old hand-written h2).
    const section = screen.getByTestId('bottom-surface_inventory');
    expect(section.querySelector('h2')?.textContent).toBe('Flächenverzeichnis');
  });
});
