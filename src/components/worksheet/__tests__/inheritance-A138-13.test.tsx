/**
 * End-to-end inheritance test — A138-13 Gl. 8 must compute on the actual
 * resolved field list produced by `mergeInheritedFields`, not on a synthetic
 * hand-coded set.
 *
 * Setup:
 *   1. Build A138-13's own fields (V_VA + locals only — the realistic schema).
 *   2. Build inherited-field rows mimicking what loadInheritedFields would
 *      return: origin fields from A138-08 (f_Z, f_A), A138-10 (A_C, A_VA),
 *      A138-12 (Q_S), A138-20 (Q_Dr), A138-04 (r_D_n_table). Each annotated
 *      with `originWorksheetCode`.
 *   3. Run `mergeInheritedFields()` — the SAME function the page loader runs.
 *   4. Render the engine subtree with the merged fields + the KOSTRA carrier
 *      value + scalar values in the store (simulating that they were saved
 *      on the origin worksheets and read via project_parameters).
 *   5. Assert Gl. 8 computes V_VA = 18.684 m³ with governing D = 30 min.
 *
 * This is the integration that proves cross-worksheet inheritance flows
 * end-to-end: own + inherited + values → engine state.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import { useMemo } from 'react';
import { EquationEngineCard } from '../equation-engine-card';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import {
  mergeInheritedFields,
  type InheritedFieldShape,
} from '@/lib/eval/merge-inherited-fields';
import type { KostraCarrier } from '@/lib/eval/aggregators';

// ---- Real DB ids (from the Step 0 query) ---------------------------------
const A138_13_GL8_EQ_ID = '69f31e6e-a755-4246-af10-ae46668b5c86';
const GL8_FORMULA = 'V_VA = (Q_zu - Q_S - Q_Dr) * D * 60 * f_Z * f_A * 10^-3';

// ---- Field shape (subset of the production type) -------------------------
type Field = {
  id: string;
  symbol: string;
  unit: string | null;
  active: boolean;
};

// ---- A138-13's own fields (only the locals — no upstream symbols) --------
const A138_13_OWN_FIELDS: Field[] = [
  { id: 'a13.V_VA', symbol: 'V_VA', unit: 'm³', active: true },
  { id: 'a13.q_S_AC', symbol: 'q_S_AC', unit: 'l/(s·ha)', active: true },
];

// ---- Inherited rows — what loadInheritedFields(A138-13) would return -----
const INHERITED_ROWS: InheritedFieldShape<Field>[] = [
  { id: 'a08.f_Z', symbol: 'f_Z', unit: null, active: true, originWorksheetCode: 'A138-08' },
  { id: 'a08.f_A', symbol: 'f_A', unit: null, active: true, originWorksheetCode: 'A138-08' },
  // Task 3: n is inherited from A138-08; needed to resolve the legacy design column.
  { id: 'a08.n', symbol: 'n', unit: '1/a', active: true, originWorksheetCode: 'A138-08' },
  { id: 'a10.A_C', symbol: 'A_C', unit: 'm²', active: true, originWorksheetCode: 'A138-10' },
  { id: 'a10.A_VA', symbol: 'A_VA', unit: 'm²', active: true, originWorksheetCode: 'A138-10' },
  { id: 'a12.Q_S', symbol: 'Q_S', unit: 'l/s', active: true, originWorksheetCode: 'A138-12' },
  { id: 'a20.Q_Dr', symbol: 'Q_Dr', unit: 'l/s', active: true, originWorksheetCode: 'A138-20' },
  {
    id: 'a04.r_D_n_table',
    symbol: 'r_D_n_table',
    unit: 'l/(s·ha)',
    active: true,
    originWorksheetCode: 'A138-04',
  },
];

const EQUATIONS = [
  {
    id: A138_13_GL8_EQ_ID,
    equationNumber: '8',
    formula: GL8_FORMULA,
    inputSymbols: ['Q_zu', 'Q_S', 'Q_Dr', 'D', 'f_Z', 'f_A'],
    outputSymbol: 'V_VA',
  },
];

const HEINSBERG_KOSTRA: KostraCarrier = {
  rows: [
    { id: '5', D_min: 5, r_D_n: 300 },
    { id: '10', D_min: 10, r_D_n: 230 },
    { id: '15', D_min: 15, r_D_n: 195 },
    { id: '30', D_min: 30, r_D_n: 130 },
    { id: '60', D_min: 60, r_D_n: 80 },
    { id: '120', D_min: 120, r_D_n: 50 },
  ],
};

// ---- Harness -------------------------------------------------------------
function Harness({
  fields,
  ambiguousSymbols,
}: {
  fields: Field[];
  ambiguousSymbols?: Record<string, string[]>;
}) {
  // Strip the `inheritedFromWorksheet` flag if present — the hook signature
  // only needs { id, symbol, unit }.
  const memoFields = useMemo(() => fields, [fields]);
  const { engineStates } = useEquationEngine({
    worksheetCode: 'A138-13',
    fields: memoFields,
    equations: EQUATIONS,
    ambiguousSymbols,
  });
  const state = engineStates[A138_13_GL8_EQ_ID];
  if (!state) return null;
  return (
    <EquationEngineCard
      equationNumber="8"
      sourceFormula={GL8_FORMULA}
      state={state}
      outputSymbol="V_VA"
      outputUnit="m³"
    />
  );
}

// ---- Helpers -------------------------------------------------------------
function setNumber(fieldId: string, value: number | null) {
  act(() => {
    useWorksheetStore.getState().setField(fieldId, { type: 'number', value });
  });
}
function setJson(fieldId: string, value: unknown) {
  act(() => {
    useWorksheetStore.getState().setField(fieldId, { type: 'json', value });
  });
}
function initStore() {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance', {}, {}, {});
  });
}

describe('cross-worksheet inheritance — A138-13 Gl. 8 on the merged field list', () => {
  beforeEach(() => initStore());

  it('merge contract: own fields are kept, inherited fields appended with attribution', () => {
    const { fields: merged } = mergeInheritedFields(A138_13_OWN_FIELDS, INHERITED_ROWS);
    // Own fields preserved (no attribution)
    expect(merged.find((f) => f.symbol === 'V_VA')?.inheritedFromWorksheet).toBeUndefined();
    expect(merged.find((f) => f.symbol === 'q_S_AC')?.inheritedFromWorksheet).toBeUndefined();
    // Inherited fields appended with origin
    expect(merged.find((f) => f.symbol === 'A_C')?.inheritedFromWorksheet).toBe('A138-10');
    expect(merged.find((f) => f.symbol === 'A_VA')?.inheritedFromWorksheet).toBe('A138-10');
    expect(merged.find((f) => f.symbol === 'Q_S')?.inheritedFromWorksheet).toBe('A138-12');
    expect(merged.find((f) => f.symbol === 'Q_Dr')?.inheritedFromWorksheet).toBe('A138-20');
    expect(merged.find((f) => f.symbol === 'f_Z')?.inheritedFromWorksheet).toBe('A138-08');
    expect(merged.find((f) => f.symbol === 'f_A')?.inheritedFromWorksheet).toBe('A138-08');
    expect(merged.find((f) => f.symbol === 'r_D_n_table')?.inheritedFromWorksheet).toBe('A138-04');
  });

  it('merge contract: own field wins on symbol collision', () => {
    // Pretend A138-13 redefines f_Z locally
    const ownWithCollision: Field[] = [
      ...A138_13_OWN_FIELDS,
      { id: 'a13.f_Z_local', symbol: 'f_Z', unit: null, active: true },
    ];
    const { fields: merged, ambiguousSymbols } = mergeInheritedFields(
      ownWithCollision,
      INHERITED_ROWS,
    );
    const f_Z = merged.filter((f) => f.symbol === 'f_Z');
    expect(f_Z).toHaveLength(1);
    expect(f_Z[0].id).toBe('a13.f_Z_local');
    expect(f_Z[0].inheritedFromWorksheet).toBeUndefined();
    // Own-field override resolves any would-be ambiguity → not flagged
    expect(ambiguousSymbols.has('f_Z')).toBe(false);
  });

  it('end-to-end: values entered on origin worksheets flow → A138-13 Gl. 8 computes 18.684 at D=30', () => {
    const { fields: merged } = mergeInheritedFields(A138_13_OWN_FIELDS, INHERITED_ROWS);
    render(<Harness fields={merged} />);

    // Task 3: n=0.2 → T_n=5 = design T_n. HEINSBERG_KOSTRA normalizes to a
    // legacyDesignColumn table; served only when T_n matches the design return period.
    setNumber('a08.n', 0.2);

    // Simulate "engineer saves values on origin worksheets" — project_parameters
    // is keyed by field_id, so the values land under the ORIGIN field's id.
    // When A138-13 loads, the page loader reads those same rows and seeds
    // the store. We replicate that here by writing to each origin field id.
    setNumber('a08.f_Z', 1.2);
    setNumber('a08.f_A', 1.0);
    setNumber('a10.A_C', 1000);
    setNumber('a10.A_VA', 50);
    setNumber('a12.Q_S', 5);
    setNumber('a20.Q_Dr', 0);
    setJson('a04.r_D_n_table', HEINSBERG_KOSTRA);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/V_VA = 18,684 m³/)).toBeInTheDocument();
    expect(
      within(card).getByText(/Maßgebende Dauerstufe D \(min\) = 30/),
    ).toBeInTheDocument();

    // Store carries the value at the V_VA output field id (own field).
    const v = useWorksheetStore.getState().values['a13.V_VA'];
    expect(v?.type === 'number' ? v.value : null).toBeCloseTo(18.684, 3);
  });

  it('negative: missing upstream value (no Q_S on A138-12) → manual_required, no number', () => {
    const { fields: merged } = mergeInheritedFields(A138_13_OWN_FIELDS, INHERITED_ROWS);
    const { rerender } = render(<Harness fields={merged} />);

    setNumber('a08.f_Z', 1.2);
    setNumber('a08.f_A', 1.0);
    // Task 3: n=0.2 → T_n=5 so the legacy carrier resolves; missing Q_S is the trigger.
    setNumber('a08.n', 0.2);
    setNumber('a10.A_C', 1000);
    setNumber('a10.A_VA', 50);
    // Q_S deliberately NOT set on A138-12 → null in project_parameters
    setNumber('a20.Q_Dr', 0);
    setJson('a04.r_D_n_table', HEINSBERG_KOSTRA);
    rerender(<Harness fields={merged} />);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');
    expect(
      within(card).getByText(/rechnerisch nicht bestätigt — manuell prüfen/i),
    ).toBeInTheDocument();
    // The reason names Q_S as the missing input
    expect(within(card).getAllByText(/Q_S/).length).toBeGreaterThan(0);
    // No V_VA number rendered
    expect(within(card).queryByText(/V_VA\s*=\s*\d/)).not.toBeInTheDocument();
  });

  it('unit guard still bites on inherited values: r_D_n_table inherited with unit "mm/h" → manual_required', () => {
    // Replace r_D_n_table inherited row with a corrupted unit
    const tweaked: InheritedFieldShape<Field>[] = INHERITED_ROWS.map((r) =>
      r.symbol === 'r_D_n_table' ? { ...r, unit: 'mm/h' } : r,
    );
    const { fields: merged } = mergeInheritedFields(A138_13_OWN_FIELDS, tweaked);
    render(<Harness fields={merged} />);

    setNumber('a08.f_Z', 1.2);
    setNumber('a08.f_A', 1.0);
    // Task 3: n=0.2 so the carrier resolves; unit guard fires after.
    setNumber('a08.n', 0.2);
    setNumber('a10.A_C', 1000);
    setNumber('a10.A_VA', 50);
    setNumber('a12.Q_S', 5);
    setNumber('a20.Q_Dr', 0);
    setJson('a04.r_D_n_table', HEINSBERG_KOSTRA);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');
    // Unit conflict surfaced
    expect(
      within(card)
        .getAllByRole('listitem')
        .some((li) => /^r_D\(n\):\s*erwartet l\/\(s·ha\), geliefert mm\/h/.test(li.textContent ?? '')),
    ).toBe(true);
    expect(within(card).queryByText(/V_VA\s*=\s*\d/)).not.toBeInTheDocument();
  });

  // ---- Ambiguity guard ---------------------------------------------------

  it('merge contract: two inherited producers for the same symbol → ambiguousSymbols populated, both dropped from fields', () => {
    // Construct a synthetic collision: a second worksheet (A138-ROGUE) also
    // produces Q_S. mergeInheritedFields must NOT silently keep either.
    const withCollision: InheritedFieldShape<Field>[] = [
      ...INHERITED_ROWS,
      {
        id: 'rogue.Q_S',
        symbol: 'Q_S',
        unit: 'l/s',
        active: true,
        originWorksheetCode: 'A138-ROGUE',
      },
    ];
    const { fields: merged, ambiguousSymbols } = mergeInheritedFields(
      A138_13_OWN_FIELDS,
      withCollision,
    );
    expect(ambiguousSymbols.get('Q_S')).toEqual(['A138-12', 'A138-ROGUE']);
    // Neither producer's field row appears in the merged list
    expect(merged.find((f) => f.symbol === 'Q_S')).toBeUndefined();
    // Other inherited rows still resolve unambiguously
    expect(merged.find((f) => f.symbol === 'A_C')?.inheritedFromWorksheet).toBe(
      'A138-10',
    );
  });

  it('two active fields produce Q_S → consuming Gl. 8 goes manual_required ("mehrdeutige Quelle für Q_S"), NO V_VA number', () => {
    const withCollision: InheritedFieldShape<Field>[] = [
      ...INHERITED_ROWS,
      {
        id: 'rogue.Q_S',
        symbol: 'Q_S',
        unit: 'l/s',
        active: true,
        originWorksheetCode: 'A138-ROGUE',
      },
    ];
    const { fields: merged, ambiguousSymbols } = mergeInheritedFields(
      A138_13_OWN_FIELDS,
      withCollision,
    );
    const ambiguous = Object.fromEntries(ambiguousSymbols);
    render(<Harness fields={merged} ambiguousSymbols={ambiguous} />);

    // Even with every value the engine would otherwise need, ambiguity wins.
    setNumber('a08.f_Z', 1.2);
    setNumber('a08.f_A', 1.0);
    setNumber('a08.n', 0.2);
    setNumber('a10.A_C', 1000);
    setNumber('a10.A_VA', 50);
    // Both Q_S field ids set just to remove any doubt that we're not picking
    // a value silently — the engine MUST refuse regardless.
    setNumber('a12.Q_S', 5);
    setNumber('rogue.Q_S', 7);
    setNumber('a20.Q_Dr', 0);
    setJson('a04.r_D_n_table', HEINSBERG_KOSTRA);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');
    expect(
      within(card).getByText(/mehrdeutige Quelle für Q_S/),
    ).toBeInTheDocument();
    expect(within(card).getByText(/A138-12.*A138-ROGUE/)).toBeInTheDocument();
    // No V_VA number rendered — neither 18.684 (from A138-12 Q_S) nor 17.244
    // (from A138-ROGUE Q_S=7). Engine refused to pick.
    expect(within(card).queryByText(/V_VA\s*=\s*\d/)).not.toBeInTheDocument();
  });

  it('regression guard: single producer (the actual A138-13 case) still computes 18.684 — ambiguity guard is opt-in', () => {
    const { fields: merged, ambiguousSymbols } = mergeInheritedFields(
      A138_13_OWN_FIELDS,
      INHERITED_ROWS,
    );
    expect(ambiguousSymbols.size).toBe(0);
    render(
      <Harness
        fields={merged}
        ambiguousSymbols={Object.fromEntries(ambiguousSymbols)}
      />,
    );

    setNumber('a08.f_Z', 1.2);
    setNumber('a08.f_A', 1.0);
    // Task 3: n=0.2 → T_n=5 = design T_n so the legacy carrier resolves.
    setNumber('a08.n', 0.2);
    setNumber('a10.A_C', 1000);
    setNumber('a10.A_VA', 50);
    setNumber('a12.Q_S', 5);
    setNumber('a20.Q_Dr', 0);
    setJson('a04.r_D_n_table', HEINSBERG_KOSTRA);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/V_VA = 18,684 m³/)).toBeInTheDocument();
  });
});
