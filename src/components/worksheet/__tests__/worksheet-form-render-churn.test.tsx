/**
 * Render-churn proof for the FLL register stall (2026-09-30, FLLNT-06/12, FLL-GAR-24):
 * "Chrome's renderer stops answering for 30 s+ after '+ Pflanzenart' … every add
 * cost ~0,6 s of blocked main thread … fill 12 cells of a fresh register row
 * quickly → stall".
 *
 * Through the REAL WorksheetForm (real store, real engine hook, real
 * RegisterEditor, real EquationEngineCard + KaTeX, real DynamicField) this
 * test counts, across N register writes:
 *   - KaTeX typesets (`katex.renderToString`)           → must stay constant
 *   - renders of a DynamicField the write does not touch → must stay constant
 *   - renders of the engine card of an unrelated equation → must stay constant
 *   - renders of the card whose verdict DOES move          → bounded by N
 * and, for the autosave, that N rapid writes produce ONE saveWorksheet call,
 * that a write during an in-flight save produces exactly one follow-up call
 * (never an overlapping one), and that `router.refresh()` is never called.
 *
 * The section probe counts how often the form itself re-rendered (the
 * "before" number every un-memoised child used to pay) — it is reported, not
 * bounded: the form subscribes to `values` by design.
 */

const probe = vi.hoisted(() => ({
  field: {} as Record<string, number>,
  card: {} as Record<string, number>,
  section: 0,
  refresh: vi.fn(),
  reset() {
    this.field = {};
    this.card = {};
    this.section = 0;
    this.refresh.mockClear();
  },
}));

vi.mock('@/lib/actions/worksheet', () => ({ saveWorksheet: vi.fn(async () => ({ ok: true, saved: 1, warnings: [], derived: [] })) }));
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
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: probe.refresh, push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={String(href)}>{children}</a> }));
vi.mock('../approval-bar', () => ({ ApprovalBar: () => null }));
vi.mock('../rationale-panel', () => ({ RationalePanel: () => null }));
vi.mock('../rainfall-tables-editor', () => ({ RainfallTablesEditor: () => null }));
vi.mock('../surface-source-banner', () => ({ SurfaceSourceBanner: () => null }));
vi.mock('@/components/form-templates/SourceFormReferencePanel', () => ({ SourceFormReferencePanel: () => null }));
vi.mock('@/components/documents/citation-picker', () => ({ CitationPicker: () => null }));
vi.mock('@/components/documents/citation-chips', () => ({ CitationChips: () => null }));
vi.mock('@/components/norm-text/clause-chip', () => ({ ClauseChip: () => null }));
vi.mock('../verify-button', () => ({ VerifyButton: () => null }));

// Counting wrappers around the REAL components. The form wraps `DynamicField`
// in `memo(...)` itself, so this plain wrapper counts ACTUAL renders (a memo
// bail-out never reaches it). The card wrapper is memoised with the card's
// own props, so it counts what a memoised card renders.
vi.mock('../dynamic-field', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../dynamic-field')>();
  const Real = mod.DynamicField;
  function CountingDynamicField(props: Parameters<typeof Real>[0]) {
    probe.field[props.field.symbol] = (probe.field[props.field.symbol] ?? 0) + 1;
    return Real(props);
  }
  return { ...mod, DynamicField: CountingDynamicField };
});
vi.mock('../equation-engine-card', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../equation-engine-card')>();
  const React = await import('react');
  const Real = mod.EquationEngineCard;
  const Counting = React.memo(function CountingCard(props: React.ComponentProps<typeof Real>) {
    probe.card[props.equationNumber] = (probe.card[props.equationNumber] ?? 0) + 1;
    return React.createElement(Real, props);
  });
  return { ...mod, EquationEngineCard: Counting };
});
vi.mock('../section-group', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../section-group')>();
  const React = await import('react');
  const Real = mod.SectionGroup;
  function CountingSection(props: React.ComponentProps<typeof Real>) {
    probe.section += 1;
    return React.createElement(Real, props);
  }
  return { ...mod, SectionGroup: CountingSection };
});

import React from 'react';
import katex from 'katex';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { saveWorksheet } from '@/lib/actions/worksheet';
import { WorksheetForm } from '../worksheet-form';

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

const SECTIONS = [
  { id: 's1', code: 'A', titleDe: 'Abschnitt', titleEn: null, orderIndex: 0, parentSectionId: null, visibleWhen: null },
];

const REG_ID = 'f-reg';
const FIELDS = [
  makeField({
    id: REG_ID, symbol: 'plant_species_list', labelDe: 'Pflanzenliste', orderIndex: 0, dataType: 'json' as const, widget: 'register',
    uiConfig: {
      title: 'Pflanzenliste', add_label: '+ Pflanzenart', placement: 'section',
      columns: [
        { key: 'art', label: 'Pflanzenart', type: 'text', required: true },
        { key: 'area_m2', label: 'Pflanzfläche', type: 'number', unit: 'm²', required: true, min: 0 },
        { key: 'density', label: 'gewählte Dichte', type: 'number', unit: '1/m²', required: true, min: 0 },
        { key: 'count', label: 'Stück', type: 'derived', expr: 'area_m2 * density', unit: 'Stk' },
      ],
      footer: ['plant_count_total'],
    },
  }),
  makeField({ id: 'f-total', symbol: 'plant_count_total', labelDe: 'Σ Pflanzen', unit: 'Stk', orderIndex: 1 }),
  makeField({ id: 'f-unrelated', symbol: 'unrelated', labelDe: 'Unbeteiligtes Feld', orderIndex: 2 }),
  makeField({ id: 'f-other-in', symbol: 'other_in', labelDe: 'Andere Eingabe', orderIndex: 3 }),
  makeField({ id: 'f-other-out', symbol: 'other_out', labelDe: 'Andere Ausgabe', orderIndex: 4 }),
];

const EQUATIONS = [
  {
    id: 'eq-d1', equationNumber: 'D1', formula: 'plant_count_total = sum_rows(plant_species_list, area_m2 * density)',
    inputSymbols: ['plant_species_list'], outputSymbol: 'plant_count_total', clauseReference: '§10.4.3', description: null, verificationStatus: 'engineer_verified',
  },
  {
    id: 'eq-d2', equationNumber: 'D2', formula: 'other_out = other_in * 2',
    inputSymbols: ['other_in'], outputSymbol: 'other_out', clauseReference: '§1', description: null, verificationStatus: 'engineer_verified',
  },
];

const PROPS = {
  locale: 'de' as const,
  projectId: 'p',
  worksheet: { template: { code: 'CHURN-12', titleDe: 'Pflanzplan', titleEn: null } },
  instance: { id: 'inst-churn', status: 'draft' as const },
  sections: SECTIONS,
  fields: FIELDS,
  equations: EQUATIONS,
  complianceRequirements: [],
  complianceSuggestions: [],
  initialValues: { 'f-other-in': { type: 'number' as const, value: 3 } },
  initialSources: {},
  initialCitations: {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol: {},
  standardCode: 'FLL-Naturteich',
  docs: [],
} satisfies Parameters<typeof WorksheetForm>[0];

type Row = { id: string; art: string; area_m2: number | null; density: number | null };
const rowsUpTo = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: `r${i + 1}`, art: `Art ${i + 1}`, area_m2: i + 1, density: 2 }));

function setRegister(rows: Row[]) {
  act(() => { useWorksheetStore.getState().setField(REG_ID, { type: 'json', value: { rows } }); });
}

const snapshot = () => ({
  katex: katexSpy.mock.calls.length,
  field: { ...probe.field },
  card: { ...probe.card },
  section: probe.section,
});
const delta = (a: ReturnType<typeof snapshot>, b: ReturnType<typeof snapshot>) => ({
  katex: b.katex - a.katex,
  unrelated: (b.field.unrelated ?? 0) - (a.field.unrelated ?? 0),
  other_out: (b.field.other_out ?? 0) - (a.field.other_out ?? 0),
  total: (b.field.plant_count_total ?? 0) - (a.field.plant_count_total ?? 0),
  cardD1: (b.card.D1 ?? 0) - (a.card.D1 ?? 0),
  cardD2: (b.card.D2 ?? 0) - (a.card.D2 ?? 0),
  formPasses: b.section - a.section,
});

let katexSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  probe.reset();
  vi.mocked(saveWorksheet).mockClear();
  katexSpy = vi.spyOn(katex, 'renderToString');
  act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
});
afterEach(() => {
  katexSpy.mockRestore();
  vi.useRealTimers();
});

describe('WorksheetForm render churn — register writes do not fan out to unrelated subtrees', () => {
  it('N = 12 programmatic register writes (one cell change each): 0 KaTeX typesets, 0 renders of the unrelated field / unrelated card', () => {
    render(<WorksheetForm {...PROPS} />);
    expect(screen.getByTestId('register-editor')).toBeInTheDocument();
    // Both engine cards mounted (D2 computes from the seeded other_in = 3).
    expect(screen.getByTestId('engine-card-gl-D2')).toHaveAttribute('data-engine-state', 'computed');
    const before = snapshot();
    const N = 12;
    for (let i = 1; i <= N; i++) setRegister(rowsUpTo(i));
    const after = snapshot();
    const d = delta(before, after);
    // The verdict moved every time (Σ grows with each row) — so the D1 card
    // and the Σ field legitimately re-render, once per write plus once for
    // the engine write-back pass that lands the new Σ in the store.
    expect(screen.getByTestId('footer-plant_count_total')).toHaveTextContent('156'); // Σ (i·2) for i=1..12
    console.log('[churn] 12 register writes →', JSON.stringify(d));
    expect(d.formPasses).toBeGreaterThanOrEqual(N); // the form itself re-renders per store write (by design; reported)
    expect(d.katex).toBe(0);
    expect(d.unrelated).toBe(0);
    expect(d.other_out).toBe(0);
    expect(d.cardD2).toBe(0);
    expect(d.cardD1).toBeLessThanOrEqual(N);
    expect(d.total).toBeLessThanOrEqual(2 * N);
  });

  it('"+ Pflanzenart" click then 12 keystrokes into the new row (user events through the real RegisterEditor): same bounds', async () => {
    const user = userEvent.setup();
    render(<WorksheetForm {...PROPS} />);
    const before = snapshot();
    await user.click(screen.getByRole('button', { name: '+ Pflanzenart' }));
    const row = screen.getAllByTestId('register-row')[0];
    await user.type(within(row).getByLabelText('Pflanzenart'), 'Nymphaea'); // 8 keystrokes
    await user.type(within(row).getByLabelText('Pflanzfläche'), '12'); // 2
    await user.type(within(row).getByLabelText('gewählte Dichte'), '5'); // 1  → 11 cell writes + 1 add-row = 12 store writes
    const after = snapshot();
    const d = delta(before, after);
    console.log('[churn] add-row + 11 keystrokes →', JSON.stringify(d));
    expect(screen.getByTestId('footer-plant_count_total')).toHaveTextContent('60');
    expect(d.katex).toBe(0);
    expect(d.unrelated).toBe(0);
    expect(d.other_out).toBe(0);
    expect(d.cardD2).toBe(0);
    // Σ only moves on the two numeric cells' keystrokes (area 1 → 12, density 5): a
    // handful of D1 renders, never one per keystroke of the text cell.
    expect(d.cardD1).toBeLessThanOrEqual(6);
    expect(probe.refresh).not.toHaveBeenCalled();
  });
});

describe('WorksheetForm autosave — one flush per burst, no overlap, no router.refresh()', () => {
  it('12 rapid writes → exactly one saveWorksheet call carrying the final values; a write during the in-flight save → one follow-up call after it lands; refresh never called', async () => {
    vi.useFakeTimers();
    render(<WorksheetForm {...PROPS} />);
    const save = vi.mocked(saveWorksheet);
    expect(save).not.toHaveBeenCalled();

    // Burst: 12 register writes inside the 1 s debounce window.
    for (let i = 1; i <= 12; i++) {
      setRegister(rowsUpTo(i));
      act(() => { vi.advanceTimersByTime(50); });
    }
    expect(save).not.toHaveBeenCalled();

    // First call goes on the wire and STAYS there (deferred promise).
    let resolveFirst!: (v: Awaited<ReturnType<typeof saveWorksheet>>) => void;
    save.mockImplementationOnce(() => new Promise((res) => { resolveFirst = res; }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(save).toHaveBeenCalledTimes(1);
    const firstPayload = save.mock.calls[0][0];
    expect(firstPayload.instanceId).toBe('inst-churn');
    const savedRows = (firstPayload.values[REG_ID] as { type: 'json'; value: { rows: Row[] } }).value.rows;
    expect(savedRows).toHaveLength(12); // the burst collapsed into one save carrying the last state

    // A 13th row typed while the save is in flight: the debounce fires again
    // but must NOT open a second round-trip while the first is unanswered.
    setRegister(rowsUpTo(13));
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(save).toHaveBeenCalledTimes(1);
    // (setField resets the indicator to 'idle' on every edit — pre-existing rule, unchanged.)
    expect(useWorksheetStore.getState().pendingFieldIds.has(REG_ID)).toBe(true);

    // First save lands → the in-flight edit is still pending → one follow-up flush.
    await act(async () => {
      resolveFirst({ ok: true, saved: 1, warnings: [], derived: [] });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(useWorksheetStore.getState().pendingFieldIds.has(REG_ID)).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(save).toHaveBeenCalledTimes(2);
    const secondRows = (save.mock.calls[1][0].values[REG_ID] as { type: 'json'; value: { rows: Row[] } }).value.rows;
    expect(secondRows).toHaveLength(13);

    // Settled: nothing pending, no third call, no RSC refetch triggered from the client.
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(save).toHaveBeenCalledTimes(2);
    expect(useWorksheetStore.getState().pendingFieldIds.size).toBe(0);
    expect(probe.refresh).not.toHaveBeenCalled();
  });
});
