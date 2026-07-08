/**
 * Integration test: A138-11 Gl.6 (f_K), Gl.5 (k_i) + A138-13 Gl.9 (q_S_AC).
 *
 * Verifies the corrected stored formulas compute through the real engine
 * (real useEquationEngine + Zustand store + EquationEngineCard; no engine
 * mocks). Task 1 added min()/max() support; this proves it works end-to-end.
 *
 * Corrected formulas (fixtures — DB values applied at migration cutover):
 *   Gl.6  A138-11:6  f_K = min(f_ort * f_methode, 1)
 *   Gl.5  A138-11:5  k_i = k_f * f_K
 *   Gl.9  A138-13:9  q_S_AC = (k_i * A_S_m * 1000 + Q_Dr) / A_C * 10^4
 *
 * Hand-calc reference values:
 *   Case 1 (f_K normal): f_ort=0.3, f_methode=0.1 → f_K = min(0.03, 1) = 0.03
 *   Case 2 (f_K cap):    f_ort=2,   f_methode=1   → f_K = min(2.0, 1)  = 1.0
 *   Case 3 (k_i):        k_f=2.66e-6, f_K=0.03    → k_i = 7.98e-8
 *   Case 4 (q_S_AC):     k_i=2.66e-6, A_S_m=100, Q_Dr=0, A_C=4836.43
 *                         → q_S_AC = (2.66e-6·100·1000 + 0)/4836.43·10^4
 *                         = 0.266/4836.43·10000 ≈ 0.5500 (inadequate < 2)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import { useMemo } from 'react';
import { EquationEngineCard } from '../equation-engine-card';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import type { EvalState } from '@/lib/eval/formula';

// ────────────────────────────────────────────────────────────────────────────
// Fixture UUIDs (arbitrary but stable; never clash with production IDs)
// ────────────────────────────────────────────────────────────────────────────
const FK_ID  = 'fixture-a138-11-gl6-fK-00000000001';
const KI_ID  = 'fixture-a138-11-gl5-ki-00000000002';
const QS_ID  = 'fixture-a138-13-gl9-qS-00000000003';

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
function setNumber(fieldId: string, value: number | null) {
  act(() => {
    useWorksheetStore.getState().setField(fieldId, { type: 'number', value });
  });
}

function initStore(instanceId: string) {
  act(() => {
    useWorksheetStore.getState().init(instanceId, {}, {}, {});
  });
}

function getStoredNumber(fieldId: string): number | null {
  const v = useWorksheetStore.getState().values[fieldId];
  if (v?.type !== 'number') return null;
  return v.value;
}

// ============================================================================
// A138-11 Gl.6 — f_K = min(f_ort * f_methode, 1)
// ============================================================================

const FK_FIELD_IDS = {
  f_K:       'fk-field-output',
  f_ort:     'fk-field-f_ort',
  f_methode: 'fk-field-f_methode',
};

type FieldMeta = { id: string; symbol: string; unit: string | null };

const FK_FIELDS: FieldMeta[] = [
  { id: FK_FIELD_IDS.f_K,       symbol: 'f_K',       unit: null },
  { id: FK_FIELD_IDS.f_ort,     symbol: 'f_ort',     unit: null },
  { id: FK_FIELD_IDS.f_methode, symbol: 'f_methode', unit: null },
];

const FK_EQUATIONS = [
  {
    id: FK_ID,
    equationNumber: '6',
    formula: 'f_K = min(f_ort * f_methode, 1)',
    inputSymbols: ['f_ort', 'f_methode'],
    outputSymbol: 'f_K',
  },
];

function FKHarness() {
  const memoFields     = useMemo(() => FK_FIELDS, []);
  const memoEquations  = useMemo(() => FK_EQUATIONS, []);
  const memoWhitelist  = useMemo(() => new Set<string>(['A138-11:6']), []);
  const { engineStates } = useEquationEngine({
    worksheetCode: 'A138-11',
    fields:        memoFields,
    equations:     memoEquations,
    engineWhitelist: memoWhitelist,
  });
  const state = engineStates[FK_ID];
  if (!state) return null;
  return (
    <EquationEngineCard
      equationNumber="6"
      sourceFormula="f_K = min(f_ort * f_methode, 1)"
      state={state}
      outputSymbol="f_K"
      outputUnit={null}
    />
  );
}

// ============================================================================
// A138-11 Gl.5 — k_i = k_f * f_K
// ============================================================================

const KI_FIELD_IDS = {
  k_i: 'ki-field-output',
  k_f: 'ki-field-k_f',
  f_K: 'ki-field-f_K',
};

const KI_FIELDS: FieldMeta[] = [
  { id: KI_FIELD_IDS.k_i, symbol: 'k_i', unit: 'm/s' },
  { id: KI_FIELD_IDS.k_f, symbol: 'k_f', unit: 'm/s' },
  { id: KI_FIELD_IDS.f_K, symbol: 'f_K', unit: null  },
];

const KI_EQUATIONS = [
  {
    id: KI_ID,
    equationNumber: '5',
    formula: 'k_i = k_f * f_K',
    inputSymbols: ['k_f', 'f_K'],
    outputSymbol: 'k_i',
  },
];

function KIHarness() {
  const memoFields     = useMemo(() => KI_FIELDS, []);
  const memoEquations  = useMemo(() => KI_EQUATIONS, []);
  const memoWhitelist  = useMemo(() => new Set<string>(['A138-11:5']), []);
  const { engineStates } = useEquationEngine({
    worksheetCode: 'A138-11',
    fields:        memoFields,
    equations:     memoEquations,
    engineWhitelist: memoWhitelist,
  });
  const state = engineStates[KI_ID];
  if (!state) return null;
  return (
    <EquationEngineCard
      equationNumber="5"
      sourceFormula="k_i = k_f * f_K"
      state={state}
      outputSymbol="k_i"
      outputUnit="m/s"
    />
  );
}

// ============================================================================
// A138-13 Gl.9 — q_S_AC = (k_i * A_S_m * 1000 + Q_Dr) / A_C * 10^4
// ============================================================================

const QS_FIELD_IDS = {
  q_S_AC: 'qs-field-output',
  k_i:    'qs-field-k_i',
  A_S_m:  'qs-field-A_S_m',
  Q_Dr:   'qs-field-Q_Dr',
  A_C:    'qs-field-A_C',
};

const QS_FIELDS: FieldMeta[] = [
  { id: QS_FIELD_IDS.q_S_AC, symbol: 'q_S_AC', unit: 'l/(s·ha)' },
  { id: QS_FIELD_IDS.k_i,    symbol: 'k_i',    unit: 'm/s'       },
  { id: QS_FIELD_IDS.A_S_m,  symbol: 'A_S_m',  unit: 'm²'        },
  { id: QS_FIELD_IDS.Q_Dr,   symbol: 'Q_Dr',   unit: 'l/s'       },
  { id: QS_FIELD_IDS.A_C,    symbol: 'A_C',    unit: 'm²'        },
];

const QS_EQUATIONS = [
  {
    id: QS_ID,
    equationNumber: '9',
    formula: 'q_S_AC = (k_i * A_S_m * 1000 + Q_Dr) / A_C * 10^4',
    inputSymbols: ['k_i', 'A_S_m', 'Q_Dr', 'A_C'],
    outputSymbol: 'q_S_AC',
  },
];

function QSHarness() {
  const memoFields     = useMemo(() => QS_FIELDS, []);
  const memoEquations  = useMemo(() => QS_EQUATIONS, []);
  const memoWhitelist  = useMemo(() => new Set<string>(['A138-13:9']), []);
  const { engineStates } = useEquationEngine({
    worksheetCode: 'A138-13',
    fields:        memoFields,
    equations:     memoEquations,
    engineWhitelist: memoWhitelist,
  });
  const state = engineStates[QS_ID];
  if (!state) return null;
  return (
    <EquationEngineCard
      equationNumber="9"
      sourceFormula="q_S_AC = (k_i * A_S_m * 1000 + Q_Dr) / A_C * 10^4"
      state={state}
      outputSymbol="q_S_AC"
      outputUnit="l/(s·ha)"
    />
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('A138-11 Gl.6 — f_K = min(f_ort * f_methode, 1)', () => {
  beforeEach(() => initStore('fixture-instance-infil-fK'));

  it('f_ort=0.3, f_methode=0.1 → f_K = 0.03 (below cap)', () => {
    render(<FKHarness />);
    setNumber(FK_FIELD_IDS.f_ort,     0.3);
    setNumber(FK_FIELD_IDS.f_methode, 0.1);

    const card = screen.getByTestId('engine-card-gl-6');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/rechnerisch bestätigt/i)).toBeInTheDocument();

    // Store carries the exact float
    expect(getStoredNumber(FK_FIELD_IDS.f_K)).toBeCloseTo(0.03, 10);
  });

  it('f_ort=2, f_methode=1 → f_K clamped to 1 (min cap)', () => {
    render(<FKHarness />);
    setNumber(FK_FIELD_IDS.f_ort,     2);
    setNumber(FK_FIELD_IDS.f_methode, 1);

    const card = screen.getByTestId('engine-card-gl-6');
    expect(card).toHaveAttribute('data-engine-state', 'computed');

    // Card renders "f_K = 1" (de-DE, max 4 fraction digits)
    expect(within(card).getByText(/f_K = 1$/)).toBeInTheDocument();
    expect(getStoredNumber(FK_FIELD_IDS.f_K)).toBeCloseTo(1.0, 10);
  });

  it('missing f_ort → manual_required, no f_K value, store cleared', () => {
    render(<FKHarness />);
    setNumber(FK_FIELD_IDS.f_methode, 0.5);
    // f_ort left null (not set)

    const card = screen.getByTestId('engine-card-gl-6');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');
    expect(within(card).queryByText(/f_K\s*=\s*\d/)).not.toBeInTheDocument();
    expect(getStoredNumber(FK_FIELD_IDS.f_K)).toBeNull();
  });
});

describe('A138-11 Gl.5 — k_i = k_f * f_K', () => {
  beforeEach(() => initStore('fixture-instance-infil-ki'));

  it('k_f=2.66e-6, f_K=0.03 → k_i ≈ 7.98e-8', () => {
    render(<KIHarness />);
    setNumber(KI_FIELD_IDS.k_f, 2.66e-6);
    setNumber(KI_FIELD_IDS.f_K, 0.03);

    const card = screen.getByTestId('engine-card-gl-5');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/rechnerisch bestätigt/i)).toBeInTheDocument();

    // k_i = 2.66e-6 * 0.03 = 7.98e-8
    // value is < 0.01 so card renders toPrecision(6); assert via store
    const stored = getStoredNumber(KI_FIELD_IDS.k_i);
    expect(stored).not.toBeNull();
    expect(stored!).toBeCloseTo(7.98e-8, 15);
  });
});

describe('A138-13 Gl.9 — q_S_AC = (k_i·A_S_m·1000 + Q_Dr)/A_C·10^4', () => {
  // Hand-calc: k_i=2.66e-6, A_S_m=100, Q_Dr=0, A_C=4836.43
  //   numerator = 2.66e-6 * 100 * 1000 = 0.266
  //   q_S_AC    = 0.266 / 4836.43 * 10000 ≈ 0.5500 (l/(s·ha); inadequate < 2)
  const EXPECTED_Q_S_AC = (2.66e-6 * 100 * 1000 + 0) / 4836.43 * 10_000; // ≈ 0.54999...

  beforeEach(() => initStore('fixture-instance-infil-qs'));

  it('k_i=2.66e-6, A_S_m=100, Q_Dr=0, A_C=4836.43 → q_S_AC ≈ 0.55 (inadequate)', () => {
    render(<QSHarness />);
    setNumber(QS_FIELD_IDS.k_i,   2.66e-6);
    setNumber(QS_FIELD_IDS.A_S_m, 100);
    setNumber(QS_FIELD_IDS.Q_Dr,  0);
    setNumber(QS_FIELD_IDS.A_C,   4836.43);

    const card = screen.getByTestId('engine-card-gl-9');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/rechnerisch bestätigt/i)).toBeInTheDocument();

    // Store value matches the exact hand-calc (within floating-point tolerance)
    const stored = getStoredNumber(QS_FIELD_IDS.q_S_AC);
    expect(stored).not.toBeNull();
    expect(stored!).toBeCloseTo(EXPECTED_Q_S_AC, 8);

    // Card renders q_S_AC in de-DE locale (value ≈ 0.55, within [0.01, 1000))
    // → Intl.NumberFormat de-DE max 4 fraction digits → "0,55" displayed
    expect(within(card).getByText(/q_S_AC = 0,5[45]\d*/)).toBeInTheDocument();
  });

  it('Q_Dr contributes — Q_Dr=0.1, k_i=2.66e-6, A_S_m=100, A_C=4836.43 → q_S_AC > 0.55', () => {
    render(<QSHarness />);
    setNumber(QS_FIELD_IDS.k_i,   2.66e-6);
    setNumber(QS_FIELD_IDS.A_S_m, 100);
    setNumber(QS_FIELD_IDS.Q_Dr,  0.1);
    setNumber(QS_FIELD_IDS.A_C,   4836.43);

    const card = screen.getByTestId('engine-card-gl-9');
    expect(card).toHaveAttribute('data-engine-state', 'computed');

    // (0.266 + 0.1) / 4836.43 * 10000 = 0.366/4836.43*10000 ≈ 0.7568
    const expectedWithDr = (2.66e-6 * 100 * 1000 + 0.1) / 4836.43 * 10_000;
    const stored = getStoredNumber(QS_FIELD_IDS.q_S_AC);
    expect(stored).not.toBeNull();
    expect(stored!).toBeCloseTo(expectedWithDr, 8);
    expect(stored!).toBeGreaterThan(EXPECTED_Q_S_AC);
  });

  it('missing A_C → manual_required, store cleared', () => {
    render(<QSHarness />);
    setNumber(QS_FIELD_IDS.k_i,   2.66e-6);
    setNumber(QS_FIELD_IDS.A_S_m, 100);
    setNumber(QS_FIELD_IDS.Q_Dr,  0);
    // A_C left null

    const card = screen.getByTestId('engine-card-gl-9');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');
    expect(within(card).queryByText(/q_S_AC\s*=\s*\d/)).not.toBeInTheDocument();
    expect(getStoredNumber(QS_FIELD_IDS.q_S_AC)).toBeNull();
  });
});
