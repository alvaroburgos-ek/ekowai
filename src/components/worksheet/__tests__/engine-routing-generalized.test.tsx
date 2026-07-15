/**
 * Engine-generalization (Layer 0) — routing test.
 *
 * Proves the gate is no longer DWA-A-138-only: an ARBITRARY non-138 equation
 * with a clean arithmetic formula routes to the real engine and computes,
 * WITHOUT any allow-list entry. And a deny-listed equation (A138-18:18, the
 * ×10³ magnitude trap) is NOT auto-evaluated.
 *
 * Renders the real useEquationEngine hook + real zustand store (no mocks).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useMemo } from 'react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import type { EvalState } from '@/lib/eval/formula';

type FieldMeta = { id: string; symbol: string; unit: string | null };

// A made-up non-138 worksheet — NOT in any whitelist, NOT 138-shaped.
const NON138_EQ_ID = 'din-test-eq-volume-0001';
const NON138_FIELDS: FieldMeta[] = [
  { id: 'f-A', symbol: 'A_grund', unit: 'm²' },
  { id: 'f-h', symbol: 'h_nutz', unit: 'm' },
  { id: 'f-V', symbol: 'V_speicher', unit: 'm³' },
];
const NON138_EQUATIONS = [
  {
    id: NON138_EQ_ID,
    equationNumber: 'KG1-01',
    formula: 'V_speicher = A_grund * h_nutz',
    inputSymbols: ['A_grund', 'h_nutz'],
    outputSymbol: 'V_speicher',
  },
];

// A deny-listed equation: worksheet A138-18, equation 18 (the ×10³ trap).
const DENY_EQ_ID = 'deny-fixture-a138-18-18';
const DENY_FIELDS: FieldMeta[] = [
  { id: 'g-Q', symbol: 'Q_S', unit: 'l/s' },
  { id: 'g-a', symbol: 'A_S_m', unit: 'm²' },
  { id: 'g-k', symbol: 'k_i', unit: 'm/s' },
];
const DENY_EQUATIONS = [
  {
    id: DENY_EQ_ID,
    equationNumber: '18',
    formula: 'Q_S = k_i * A_S_m',
    inputSymbols: ['k_i', 'A_S_m'],
    outputSymbol: 'Q_S',
  },
];

let captured: Record<string, EvalState> = {};
let capturedIds: Set<string> = new Set();

function Harness({
  worksheetCode,
  fields,
  equations,
}: {
  worksheetCode: string;
  fields: FieldMeta[];
  equations: typeof NON138_EQUATIONS;
}) {
  const memoFields = useMemo(() => fields, [fields]);
  const memoEqs = useMemo(() => equations, [equations]);
  const { engineStates, engineEquationIds } = useEquationEngine({
    worksheetCode,
    fields: memoFields,
    equations: memoEqs,
  });
  captured = engineStates;
  capturedIds = engineEquationIds;
  return null;
}

function setNumber(fieldId: string, value: number | null) {
  act(() => {
    useWorksheetStore.getState().setField(fieldId, { type: 'number', value });
  });
}

describe('engine generalization — routing (Layer 0)', () => {
  beforeEach(() => {
    act(() => useWorksheetStore.getState().init('fixture-gen', {}, {}, {}));
    captured = {};
    capturedIds = new Set();
  });

  it('routes an arbitrary non-138 arithmetic equation to the engine and computes it (no allow-list)', () => {
    render(
      <Harness
        worksheetCode="DIN-276-09"
        fields={NON138_FIELDS}
        equations={NON138_EQUATIONS}
      />,
    );
    setNumber('f-A', 2);
    setNumber('f-h', 3);

    expect(capturedIds.has(NON138_EQ_ID)).toBe(true);
    const state = captured[NON138_EQ_ID];
    expect(state?.kind).toBe('computed');
    if (state?.kind === 'computed') {
      expect(state.value).toBeCloseTo(6, 9);
    }
    // and it wrote back into the store
    const stored = useWorksheetStore.getState().values['f-V'];
    expect(stored?.type === 'number' ? stored.value : null).toBeCloseTo(6, 9);
  });

  it('does NOT auto-evaluate a deny-listed equation (A138-18:18 ×10³ trap)', () => {
    render(
      <Harness
        worksheetCode="A138-18"
        fields={DENY_FIELDS}
        equations={DENY_EQUATIONS}
      />,
    );
    setNumber('g-a', 45);
    setNumber('g-k', 0.0001);

    // deny-listed → never enters the engine set, never computes, store untouched
    expect(capturedIds.has(DENY_EQ_ID)).toBe(false);
    expect(captured[DENY_EQ_ID]).toBeUndefined();
    const stored = useWorksheetStore.getState().values['g-Q'];
    expect(stored?.type === 'number' ? stored.value : null).toBeNull();
  });
});

// (The DIN-276 chained-sum regression now lives in engine-din276-rollup.test.tsx,
// pointed at the real 53-equation cost roll-up rather than a synthetic chain.)

// --- Regression: multi-producer collision (Addition 2) ----------------------
// Two active equations on ONE worksheet produce the SAME output symbol
// (the M760 Qs_eff Method-A/B shape). Under route-all, both fire — the guard
// must blank BOTH (manual_required) rather than silently last-wins.
const MP_FIELDS: FieldMeta[] = [
  { id: 'm-a', symbol: 'Q_a', unit: 'm³/h' },
  { id: 'm-b', symbol: 'Q_b', unit: 'm³/h' },
  { id: 'm-eff', symbol: 'Qs_eff', unit: 'm³/h' },
];
const MP_EQ_A = 'mp-method-a';
const MP_EQ_B = 'mp-method-b';
const MP_EQUATIONS = [
  { id: MP_EQ_A, equationNumber: 'A', formula: 'Qs_eff = Q_a', inputSymbols: ['Q_a'], outputSymbol: 'Qs_eff' },
  { id: MP_EQ_B, equationNumber: 'B', formula: 'Qs_eff = Q_b', inputSymbols: ['Q_b'], outputSymbol: 'Qs_eff' },
];

describe('engine generalization — multi-producer collision guard (Addition 2)', () => {
  beforeEach(() => {
    act(() => useWorksheetStore.getState().init('fixture-mp', {}, {}, {}));
    captured = {};
    capturedIds = new Set();
  });

  it('blanks BOTH equations when one worksheet has two writers for a symbol', () => {
    render(
      <Harness
        worksheetCode="DWA-M-760-12"
        fields={MP_FIELDS}
        equations={MP_EQUATIONS}
      />,
    );
    setNumber('m-a', 7);
    setNumber('m-b', 9);

    // Neither producer may report a computed value — collision is ambiguous.
    expect(captured[MP_EQ_A]?.kind).toBe('manual_required');
    expect(captured[MP_EQ_B]?.kind).toBe('manual_required');
    // The shared output field must NOT carry a silently-picked value.
    const stored = useWorksheetStore.getState().values['m-eff'];
    expect(stored?.type === 'number' ? stored.value : null).toBeNull();
  });
});
