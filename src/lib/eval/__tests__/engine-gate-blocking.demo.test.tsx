/**
 * E1-A DEMO — the deny-set SSOT gating route-all end-to-end, through the SAME
 * production hook (useEquationEngine) the worksheet form runs.
 *
 * Post-full-circle state: A138-18:22 (the gate's first catch) was FIXED at source
 * (migration 20260713120000, d→d_i) and has LEFT the gate deny-set → it now routes.
 * The deny-set SSOT still blocks class-(ii) manual-denied equations (A138-18:18,
 * missing ×10³). This proves the single-SSOT enforcement both ways.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { useMemo } from 'react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const FIELDS = [
  { id: 'f-s_F', symbol: 's_F', unit: null },
  { id: 'f-b_R', symbol: 'b_R', unit: null },
  { id: 'f-h_R', symbol: 'h_R', unit: null },
  { id: 'f-az', symbol: 'az', unit: null },
  { id: 'f-d_i', symbol: 'd_i', unit: null },
  { id: 'f-A_C', symbol: 'A_C', unit: null },
  { id: 'f-k_i', symbol: 'k_i', unit: null },
];

// A138-18:18 — class-(ii) manual-denied (Q_S missing ×10³). Excluded by the SSOT.
const EQ_DENIED = {
  id: 'eq-a138-18-18', equationNumber: '18',
  formula: 'Q_S = k_i * A_S', inputSymbols: ['k_i', 'A_S'], outputSymbol: 'Q_S',
};
// A138-18:22 — FIXED at source (d→d_i), left the gate deny-set → routes again.
const EQ_FIXED = {
  id: 'eq-a138-18-22', equationNumber: '22',
  formula: 's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi * d_i^2/4) * ((1/s_F) - 1))',
  inputSymbols: ['s_F', 'b_R', 'h_R', 'az', 'd_i'], outputSymbol: 's_R',
};
// Faithful → routes.
const EQ_FAITHFUL = {
  id: 'eq-faithful', equationNumber: '99',
  formula: 'z = A_C * k_i', inputSymbols: ['A_C', 'k_i'], outputSymbol: 'z',
};

let captured = new Set<string>();
function Harness() {
  const memoFields = useMemo(() => FIELDS, []);
  const memoEquations = useMemo(() => [EQ_DENIED, EQ_FIXED, EQ_FAITHFUL], []);
  const { engineEquationIds } = useEquationEngine({
    worksheetCode: 'A138-18',
    fields: memoFields,
    equations: memoEquations,
  });
  captured = engineEquationIds;
  return null;
}

describe('E1-A DEMO — deny-set SSOT gating route-all (post full-circle)', () => {
  it('A138-18:18 (manual-denied) EXCLUDED; A138-18:22 (fixed at source) + faithful ROUTED', () => {
    useWorksheetStore.setState({ values: {} });
    render(<Harness />);
    expect(captured.has('eq-a138-18-18')).toBe(false); // deny-set SSOT still blocks class (ii)
    expect(captured.has('eq-a138-18-22')).toBe(true);  // full circle: re-verified → routes
    expect(captured.has('eq-faithful')).toBe(true);
  });
});
