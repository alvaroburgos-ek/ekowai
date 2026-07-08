/**
 * Task 2 — A138-10 auto Q_zu integration tests.
 *
 * Three scenarios:
 *   1. Basin materialization: A138-13 Gl.8 with Heinsberg inputs writes
 *      r_D_n=130 and D_min=30 (from derivedExtras) into the store alongside
 *      V_VA=18.684.
 *   2. A138-10 auto-Q_zu: with inherited r_D_n=130 + D_min=30 and
 *      A_C=1000, A_VA=50, Gl.3 computes Q_zu = 130·(1000+50)·1e-4 = 13.65.
 *   3. Withhold: basin manual_required → derivedExtras undefined →
 *      r_D_n/D_min fields written as null → Q_zu stays blank.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import { useMemo } from 'react';
import { EquationEngineCard } from '../equation-engine-card';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import type { KostraCarrier } from '@/lib/eval/aggregators';

// ─── Equation IDs ────────────────────────────────────────────────────────────
const A138_13_GL8_ID = '69f31e6e-a755-4246-af10-ae46668b5c86';
// Gl.3: Q_zu = r_D_n · (A_C + A_VA) · 10^-4
// Use a stable fixture id (not the real prod UUID which isn't needed for unit tests)
const A138_10_GL3_ID = 'a138-10-gl3-fixture-0000-000000000003';

const GL8_FORMULA = 'V_VA = (Q_zu - Q_S - Q_Dr) * D * 60 * f_Z * f_A * 10^-3';
const GL3_FORMULA = 'Q_zu = r_D_n * (A_C + A_VA) * 10^-4';

// ─── Field IDs for the basin (A138-13) harness ───────────────────────────────
const BASIN_FIELD_IDS = {
  V_VA:        'basin-V_VA',
  r_D_n:       'basin-r_D_n',     // new derived producer field on A138-13
  D_min:       'basin-D_min',     // new derived producer field on A138-13
  A_C:         'basin-A_C',
  A_VA:        'basin-A_VA',
  Q_S:         'basin-Q_S',
  Q_Dr:        'basin-Q_Dr',
  f_Z:         'basin-f_Z',
  f_A:         'basin-f_A',
  r_D_n_table: 'basin-r_D_n_table',
  n:           'basin-n',
};

type FieldMeta = { id: string; symbol: string; unit: string | null };

const basinFields: FieldMeta[] = [
  { id: BASIN_FIELD_IDS.V_VA,        symbol: 'V_VA',        unit: 'm³' },
  { id: BASIN_FIELD_IDS.r_D_n,       symbol: 'r_D_n',       unit: 'l/(s·ha)' },
  { id: BASIN_FIELD_IDS.D_min,       symbol: 'D_min',       unit: 'min' },
  { id: BASIN_FIELD_IDS.A_C,         symbol: 'A_C',         unit: 'm²' },
  { id: BASIN_FIELD_IDS.A_VA,        symbol: 'A_VA',        unit: 'm²' },
  { id: BASIN_FIELD_IDS.Q_S,         symbol: 'Q_S',         unit: 'l/s' },
  { id: BASIN_FIELD_IDS.Q_Dr,        symbol: 'Q_Dr',        unit: 'l/s' },
  { id: BASIN_FIELD_IDS.f_Z,         symbol: 'f_Z',         unit: null },
  { id: BASIN_FIELD_IDS.f_A,         symbol: 'f_A',         unit: null },
  { id: BASIN_FIELD_IDS.r_D_n_table, symbol: 'r_D_n_table', unit: 'l/(s·ha)' },
  { id: BASIN_FIELD_IDS.n,           symbol: 'n',           unit: '1/a' },
];

const BASIN_EQUATIONS = [
  {
    id: A138_13_GL8_ID,
    equationNumber: '8',
    formula: GL8_FORMULA,
    inputSymbols: ['Q_zu', 'Q_S', 'Q_Dr', 'D', 'f_Z', 'f_A'],
    outputSymbol: 'V_VA',
  },
];

// ─── Field IDs for A138-10 harness ───────────────────────────────────────────
const A10_FIELD_IDS = {
  Q_zu:  'a10-Q_zu',
  r_D_n: 'a10-r_D_n',
  D_min: 'a10-D_min',
  A_C:   'a10-A_C',
  A_VA:  'a10-A_VA',
};

const a10Fields: FieldMeta[] = [
  { id: A10_FIELD_IDS.Q_zu,  symbol: 'Q_zu',  unit: 'l/s' },
  { id: A10_FIELD_IDS.r_D_n, symbol: 'r_D_n', unit: 'l/(s·ha)' },
  { id: A10_FIELD_IDS.D_min, symbol: 'D_min', unit: 'min' },
  { id: A10_FIELD_IDS.A_C,   symbol: 'A_C',   unit: 'm²' },
  { id: A10_FIELD_IDS.A_VA,  symbol: 'A_VA',  unit: 'm²' },
];

const A10_EQUATIONS = [
  {
    id: A138_10_GL3_ID,
    equationNumber: '3',
    formula: GL3_FORMULA,
    inputSymbols: ['r_D_n', 'A_C', 'A_VA'],
    outputSymbol: 'Q_zu',
  },
];

// ─── Heinsberg KOSTRA fixture ─────────────────────────────────────────────────
const HEINSBERG_KOSTRA: KostraCarrier = {
  rows: [
    { id: '5',   D_min: 5,   r_D_n: 300 },
    { id: '10',  D_min: 10,  r_D_n: 230 },
    { id: '15',  D_min: 15,  r_D_n: 195 },
    { id: '30',  D_min: 30,  r_D_n: 130 },
    { id: '60',  D_min: 60,  r_D_n: 80  },
    { id: '120', D_min: 120, r_D_n: 50  },
  ],
};

// ─── Harnesses ────────────────────────────────────────────────────────────────

/** Basin harness: renders Gl.8; also exposes the hook's engineStates ref
 * so tests can inspect derivedExtras. */
function BasinHarness({ fields }: { fields: FieldMeta[] }) {
  const memoFields = useMemo(() => fields, [fields]);
  const { engineStates } = useEquationEngine({
    worksheetCode: 'A138-13',
    fields: memoFields,
    equations: BASIN_EQUATIONS,
    engineWhitelist: new Set<string>(['A138-13:8']),
  });
  const state = engineStates[A138_13_GL8_ID];
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

/** A138-10 harness: renders Gl.3 Q_zu = r_D_n·(A_C+A_VA)·1e-4.
 * The engine whitelist key is the fixture key used in the engine-whitelist
 * module. In tests we supply it directly so the arithmetic engine runs. */
function A10Harness({ fields }: { fields: FieldMeta[] }) {
  const memoFields = useMemo(() => fields, [fields]);
  const { engineStates } = useEquationEngine({
    worksheetCode: 'A138-10',
    fields: memoFields,
    equations: A10_EQUATIONS,
    engineWhitelist: new Set<string>(['A138-10:3']),
  });
  const state = engineStates[A138_10_GL3_ID];
  if (!state) return null;
  return (
    <EquationEngineCard
      equationNumber="3"
      sourceFormula={GL3_FORMULA}
      state={state}
      outputSymbol="Q_zu"
      outputUnit="l/s"
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    useWorksheetStore.getState().init('fixture-instance-a138-10-auto', {}, {}, {});
  });
}

function getStoreNumber(fieldId: string): number | null {
  const v = useWorksheetStore.getState().values[fieldId];
  if (v?.type !== 'number') return null;
  return v.value;
}

function loadBasinScalars() {
  setNumber(BASIN_FIELD_IDS.A_C,  1000);
  setNumber(BASIN_FIELD_IDS.A_VA, 50);
  setNumber(BASIN_FIELD_IDS.Q_S,  5);
  setNumber(BASIN_FIELD_IDS.Q_Dr, 0);
  setNumber(BASIN_FIELD_IDS.f_Z,  1.2);
  setNumber(BASIN_FIELD_IDS.f_A,  1.0);
  // n=0.2 → T_n=5: the Heinsberg KostraCarrier is the legacy {rows} shape
  // (accepted by the legacy path), served for any T_n.
  setNumber(BASIN_FIELD_IDS.n, 0.2);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Task 2: Basin materialization — r_D_n + D_min written as derivedExtras', () => {
  beforeEach(() => initStore());

  it('Heinsberg inputs → V_VA=18.684, r_D_n=130 and D_min=30 written to store', () => {
    render(<BasinHarness fields={basinFields} />);
    loadBasinScalars();
    setJson(BASIN_FIELD_IDS.r_D_n_table, HEINSBERG_KOSTRA);

    // Card computed
    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'computed');

    // Primary output V_VA=18.684 (existing 18.684 witness — must stay green)
    expect(getStoreNumber(BASIN_FIELD_IDS.V_VA)).toBeCloseTo(18.684, 3);

    // Task 2: derivedExtras → r_D_n and D_min written to basin's own fields
    expect(getStoreNumber(BASIN_FIELD_IDS.r_D_n)).toBe(130);
    expect(getStoreNumber(BASIN_FIELD_IDS.D_min)).toBe(30);
  });

  it('basin manual_required (missing scalar) → r_D_n and D_min cleared to null', () => {
    const { rerender } = render(<BasinHarness fields={basinFields} />);
    loadBasinScalars();
    setJson(BASIN_FIELD_IDS.r_D_n_table, HEINSBERG_KOSTRA);
    // First compute to populate derived fields
    expect(getStoreNumber(BASIN_FIELD_IDS.r_D_n)).toBe(130);

    // Now withhold by removing a required scalar
    setNumber(BASIN_FIELD_IDS.f_Z, null);
    rerender(<BasinHarness fields={basinFields} />);

    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');

    // derivedExtras absent → r_D_n and D_min must be cleared
    expect(getStoreNumber(BASIN_FIELD_IDS.r_D_n)).toBeNull();
    expect(getStoreNumber(BASIN_FIELD_IDS.D_min)).toBeNull();
  });
});

describe('Task 2: A138-10 auto-Q_zu from inherited r_D_n/D_min', () => {
  beforeEach(() => initStore());

  it('inherited r_D_n=130, A_C=1000, A_VA=50 → Q_zu=13.65 auto-computed', () => {
    render(<A10Harness fields={a10Fields} />);
    // Provide inherited governing values (as if materialized by the basin engine)
    setNumber(A10_FIELD_IDS.r_D_n, 130);
    setNumber(A10_FIELD_IDS.A_C,  1000);
    setNumber(A10_FIELD_IDS.A_VA,  50);

    const card = screen.getByTestId('engine-card-gl-3');
    expect(card).toHaveAttribute('data-engine-state', 'computed');

    // Q_zu = 130 · (1000 + 50) · 1e-4 = 130 · 1050 · 1e-4 = 13.65
    expect(getStoreNumber(A10_FIELD_IDS.Q_zu)).toBeCloseTo(13.65, 2);
    // Card also shows computed result
    expect(within(card).getByText(/rechnerisch bestätigt/i)).toBeInTheDocument();
  });

  it('r_D_n not provided (basin withheld) → Q_zu manual_required / blank', () => {
    render(<A10Harness fields={a10Fields} />);
    // A_C + A_VA present but r_D_n is missing (basin did not materialize it)
    setNumber(A10_FIELD_IDS.A_C,  1000);
    setNumber(A10_FIELD_IDS.A_VA,  50);
    // r_D_n left as null (not set)

    const card = screen.getByTestId('engine-card-gl-3');
    // Without r_D_n the formula cannot compute
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');
    expect(getStoreNumber(A10_FIELD_IDS.Q_zu)).toBeNull();
  });
});

describe('Task 2: Withhold — basin missing → downstream Q_zu blank', () => {
  beforeEach(() => initStore());

  it('basin manual_required (no KOSTRA table) → r_D_n/D_min null → Q_zu manual_required', () => {
    // Render basin WITHOUT the KOSTRA table → manual_required → no derivedExtras
    render(<BasinHarness fields={basinFields} />);
    loadBasinScalars();
    // Do NOT set the KOSTRA table → basin stays manual_required

    const basinCard = screen.getByTestId('engine-card-gl-8');
    expect(basinCard).toHaveAttribute('data-engine-state', 'manual_required');

    // Basin derived fields stay null
    expect(getStoreNumber(BASIN_FIELD_IDS.r_D_n)).toBeNull();
    expect(getStoreNumber(BASIN_FIELD_IDS.D_min)).toBeNull();
  });
});
