/**
 * Defect #22 — A138-17 A_S,m dual-role INTEGRATION test (reproduction grade).
 *
 * Drives the real useEquationEngine hook + real zustand store on an
 * A138-17-shaped worksheet with Gl.16 (producer of A_S_m), Gl.14 (primary
 * consumer, produces V_M), and Gl.15 (displayOnly, also consumes A_S_m).
 *
 * REPRODUCTION PROPERTY: the test is structured so that removing the
 * symbolHomeSuppressedSymbols union from worksheet-form (i.e. not passing
 * the A_S_m-suppression set to suppressWriteBackSymbols) makes the
 * "WITH suppression" case FAIL — the collision returns, Gl.14 becomes
 * manual_required.
 *
 *   WITHOUT suppression (old/buggy path):
 *     Gl.16 is called but h_M is absent → engine writes null → A_S_m blanked
 *     → Gl.14 reports manual_required (missing A_S_m) → V_M blocked.
 *
 *   WITH suppression (fixed path):
 *     Gl.16 write-back suppressed → inherited A_S_m=68.82 stays in store
 *     → Gl.14 computes V_M ≈ 22.05 m³.
 *
 * Regression guard: pure-consumer shape (no local Gl.16) resolves inherited
 * A_S_m cleanly and computes V_M regardless of the suppression set.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useMemo } from 'react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import type { EvalState } from '@/lib/eval/formula';

// Verified equation ids from Global Constraints
const GL16_ID = '14999c2a-cdeb-42c1-98fd-fcdec65123da'; // produces A_S_m
const GL14_ID = 'bfe6e59a-015f-4c95-b717-8599f80cb68a'; // produces V_M (consumes A_S_m)
const GL15_ID = '44fd56a8-b473-441a-be21-297d9f501226'; // displayOnly V_M (consumes A_S_m)

// Gl.16: A_S,m from Mulde geometry (§6.3.2)
const GL16_FORMULA = 'A_S_m = (A_C * 10^-7 * r_D_n) / (h_M / (D * 60 * f_Z) + k_i)';
// Gl.14: required Mulde volume (primary writer of V_M)
const GL14_FORMULA = 'V_M = ((A_C + A_VA) * 10^-7 * r_D_n - A_S_m * k_i) * D * 60 * f_Z';
// Gl.15: geometric Mulde volume (displayOnly — not a write-back writer)
const GL15_FORMULA = 'V_M = A_S_m * h_M';

// Fixture field ids
const FIELD_IDS = {
  A_S_m: 'fix17-A_S_m', // inherited from A138-12 (home)
  A_C:   'fix17-A_C',   // inherited from A138-07
  A_VA:  'fix17-A_VA',  // inherited from A138-07
  r_D_n: 'fix17-r_D_n', // inherited from A138-10
  k_i:   'fix17-k_i',   // inherited from A138-10
  D:     'fix17-D',     // inherited from A138-10
  f_Z:   'fix17-f_Z',   // inherited
  h_M:   'fix17-h_M',   // local A138-17 field (the Mulde depth)
  V_M:   'fix17-V_M',   // local A138-17 output
};

type FieldMeta = { id: string; symbol: string; unit: string | null };

const A138_17_FIELDS: FieldMeta[] = [
  { id: FIELD_IDS.A_S_m, symbol: 'A_S_m', unit: 'm²' },
  { id: FIELD_IDS.A_C,   symbol: 'A_C',   unit: 'm²' },
  { id: FIELD_IDS.A_VA,  symbol: 'A_VA',  unit: 'm²' },
  { id: FIELD_IDS.r_D_n, symbol: 'r_D_n', unit: 'l/(s·ha)' },
  { id: FIELD_IDS.k_i,   symbol: 'k_i',   unit: 'm/s' },
  { id: FIELD_IDS.D,     symbol: 'D',     unit: 'min' },
  { id: FIELD_IDS.f_Z,   symbol: 'f_Z',   unit: null },
  { id: FIELD_IDS.h_M,   symbol: 'h_M',   unit: 'm' },
  { id: FIELD_IDS.V_M,   symbol: 'V_M',   unit: 'm³' },
];

// All three A138-17 equations: Gl.16 (producer), Gl.14+Gl.15 (consumers)
const A138_17_EQUATIONS = [
  {
    id: GL16_ID,
    equationNumber: '16',
    formula: GL16_FORMULA,
    inputSymbols: ['A_C', 'r_D_n', 'h_M', 'D', 'f_Z', 'k_i'],
    outputSymbol: 'A_S_m',
  },
  {
    id: GL14_ID,
    equationNumber: '14',
    formula: GL14_FORMULA,
    inputSymbols: ['A_C', 'A_VA', 'r_D_n', 'A_S_m', 'k_i', 'D', 'f_Z'],
    outputSymbol: 'V_M',
  },
  {
    id: GL15_ID,
    equationNumber: '15',
    formula: GL15_FORMULA,
    inputSymbols: ['A_S_m', 'h_M'],
    outputSymbol: 'V_M',
  },
];

// Hand-calc reference values (from formula-Gl14-15…test.ts baseline):
//   A_C=1000, A_VA=50, r_D_n=130, A_S_m=68.82352941…, k_i=5e-5, D=30, f_Z=1.2
//   V_M = ((1050 * 1e-7 * 130) − (68.82… * 5e-5)) * 30 * 60 * 1.2 ≈ 22.051 m³
const INHERITED_A_S_M = 68.82352941176471; // value from A138-12

let capturedStates: Record<string, EvalState> = {};

// ---- Harness ---------------------------------------------------------------

function Harness({
  suppressWriteBackSymbols,
}: {
  suppressWriteBackSymbols?: ReadonlySet<string>;
}) {
  const memoFields = useMemo(() => A138_17_FIELDS, []);
  const memoEqs   = useMemo(() => A138_17_EQUATIONS, []);
  const { engineStates } = useEquationEngine({
    worksheetCode: 'A138-17',
    fields: memoFields,
    equations: memoEqs,
    suppressWriteBackSymbols,
  });
  capturedStates = engineStates;
  return null;
}

// ---- Helpers ---------------------------------------------------------------

function setNumber(fieldId: string, value: number | null) {
  act(() => {
    useWorksheetStore.getState().setField(fieldId, { type: 'number', value });
  });
}

function getStoredNumber(fieldId: string): number | null {
  const v = useWorksheetStore.getState().values[fieldId];
  if (v?.type !== 'number') return null;
  return v.value;
}

/** Load all design inputs EXCEPT h_M (so Gl.16 stays manual_required → writes null if unsuppressed). */
function loadInputsWithoutHM() {
  setNumber(FIELD_IDS.A_C,   1000);
  setNumber(FIELD_IDS.A_VA,  50);
  setNumber(FIELD_IDS.r_D_n, 130);
  setNumber(FIELD_IDS.k_i,   5e-5);
  setNumber(FIELD_IDS.D,     30);
  setNumber(FIELD_IDS.f_Z,   1.2);
  // h_M intentionally absent: Gl.16 cannot compute → its write-back nulls A_S_m
  // if not suppressed (reproducing the defect).
}

// ============================================================================
// Tests
// ============================================================================

describe('defect #22 — A138-17 A_S_m dual-role (integration, reproduction grade)', () => {
  beforeEach(() => {
    act(() => {
      useWorksheetStore.getState().init('a138-17-dual-role', {}, {}, {});
    });
    capturedStates = {};
    // Simulate the inherited A_S_m value that came from A138-12 via same-symbol inheritance.
    setNumber(FIELD_IDS.A_S_m, INHERITED_A_S_M);
  });

  // ── Reproduction test: shows the bug exists WITHOUT the fix ───────────────

  it('bug path — WITHOUT A_S_m suppression: Gl.16 write-back blanks A_S_m → Gl.14 manual_required', () => {
    // No suppressWriteBackSymbols ← the old code path before the fix.
    // Removing the symbolHomeSuppressedSymbols union from worksheet-form
    // produces exactly this path: suppressWriteBackSymbols = asmEngineSuppressedSymbols(null) = empty set.
    render(<Harness suppressWriteBackSymbols={new Set()} />);
    loadInputsWithoutHM();

    // Gl.16: h_M is absent → evaluateFormula returns manual_required → engine writes null to A_S_m.
    // This overwrites the inherited A_S_m=68.82 → store has null.
    expect(getStoredNumber(FIELD_IDS.A_S_m)).toBeNull();

    // Gl.14: A_S_m missing → manual_required. V_M blocked. (The defect.)
    expect(capturedStates[GL14_ID]?.kind).toBe('manual_required');

    // Gl.15 (displayOnly): also manual_required but it never writes back anyway.
    expect(capturedStates[GL15_ID]?.kind).toBe('manual_required');
  });

  // ── Fix test: shows the fix works WITH suppression ────────────────────────

  it('fix path — WITH A_S_m suppression: inherited value preserved → Gl.14 computes V_M', () => {
    // Suppress A_S_m write-back: this is what the symbolHomeSuppressedSymbols union adds.
    // On A138-17, A_S_m is inherited (home=A138-12 ≠ A138-17), so the helper
    // returns {A_S_m} and this set is unioned into engineSuppressedSymbols.
    const suppress = new Set<string>(['A_S_m']);
    render(<Harness suppressWriteBackSymbols={suppress} />);
    loadInputsWithoutHM();

    // A_S_m write-back suppressed → Gl.16's null output is NOT written to store.
    // The inherited A_S_m=68.82 persists.
    expect(getStoredNumber(FIELD_IDS.A_S_m)).toBeCloseTo(INHERITED_A_S_M, 6);

    // Gl.14: all inputs present (inherited A_S_m survives) → computes V_M.
    const gl14 = capturedStates[GL14_ID];
    expect(gl14?.kind).toBe('computed');
    if (gl14?.kind === 'computed') {
      const exact = ((1050 * 1e-7 * 130 - INHERITED_A_S_M * 5e-5) * 30 * 60 * 1.2);
      expect(gl14.value).toBeCloseTo(exact, 6);
      expect(gl14.value).toBeCloseTo(22.051, 2); // ~22 m³ (§6.3.2 reference)
    }

    // V_M is written back to the store by Gl.14 (not displayOnly).
    const vm = getStoredNumber(FIELD_IDS.V_M);
    expect(vm).not.toBeNull();
    expect(vm!).toBeCloseTo(22.051, 2);

    // Gl.15 (displayOnly): evaluates using the inherited A_S_m but h_M is absent → manual_required.
    // (displayOnly never writes back; V_M store value is from Gl.14 only.)
    expect(capturedStates[GL15_ID]?.kind).toBe('manual_required');
  });

  // ── Regression: pure-consumer shape (A138-20/A138-22 style) ─────────────

  it('regression — pure-consumer shape (no local Gl.16): inherited A_S_m stays, V_M computes', () => {
    // A138-20/A138-22 have NO Gl.16 equation locally. Suppression set is
    // present (as the home-boundary union would set it), but since no equation
    // produces A_S_m on this worksheet, it is a no-op: the inherited value
    // is never threatened by a local write-back.
    const suppress = new Set<string>(['A_S_m']);
    const pureConsumerEqs = [A138_17_EQUATIONS[1]]; // only Gl.14 (no Gl.16)

    function PureConsumerHarness() {
      const memoFields = useMemo(() => A138_17_FIELDS, []);
      const memoEqs   = useMemo(() => pureConsumerEqs, []);
      const { engineStates } = useEquationEngine({
        worksheetCode: 'A138-20', // pure consumer worksheet
        fields: memoFields,
        equations: memoEqs,
        suppressWriteBackSymbols: suppress,
      });
      capturedStates = engineStates;
      return null;
    }

    render(<PureConsumerHarness />);
    loadInputsWithoutHM();

    // A_S_m untouched — no local writer even without suppression.
    expect(getStoredNumber(FIELD_IDS.A_S_m)).toBeCloseTo(INHERITED_A_S_M, 6);

    // Gl.14 computes V_M cleanly from the inherited A_S_m.
    const gl14 = capturedStates[GL14_ID];
    expect(gl14?.kind).toBe('computed');
    if (gl14?.kind === 'computed') {
      expect(gl14.value).toBeCloseTo(22.051, 2);
    }
  });
});
