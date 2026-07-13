/**
 * E1-A DEMO — the faithfulness gate BLOCKING end-to-end (route-all exclusion).
 *
 * Renders the SAME production hook (useEquationEngine) the worksheet form runs
 * and asserts that a real mis-encoded formula is EXCLUDED from route-all
 * (never silently computed), while a faithful equation and a carrier-aggregator
 * are still routed. This closes the D1 condition: caught + flagged + NOT computed.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { useMemo } from 'react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

// Field set WITHOUT a bare `d` field (fields are d_a / d_i) — the A138-18:22 defect.
const FIELDS = [
  { id: 'f-s_F', symbol: 's_F', unit: null },
  { id: 'f-b_R', symbol: 'b_R', unit: null },
  { id: 'f-h_R', symbol: 'h_R', unit: null },
  { id: 'f-az', symbol: 'az', unit: null },
  { id: 'f-d_a', symbol: 'd_a', unit: null },
  { id: 'f-d_i', symbol: 'd_i', unit: null },
  { id: 'f-A_C', symbol: 'A_C', unit: null },
  { id: 'f-k_i', symbol: 'k_i', unit: null },
  { id: 'f-surf', symbol: 'surface_inventory', unit: null },
];

// Real A138-18:22 (s_R) encoding — references bare `d` (no such field).
const EQ_MISENCODED = {
  id: 'eq-a138-18-22',
  equationNumber: '22',
  formula: 's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi * d^2/4) * ((1/s_F) - 1))',
  inputSymbols: ['s_F', 'b_R', 'h_R', 'az', 'd'],
  outputSymbol: 's_R',
};
// Faithful — every symbol resolves.
const EQ_FAITHFUL = {
  id: 'eq-faithful',
  equationNumber: '99',
  formula: 'z = A_C * k_i',
  inputSymbols: ['A_C', 'k_i'],
  outputSymbol: 'z',
};
// Carrier-aggregator — consumes surface_inventory; exempt from the plain gate.
const EQ_AGGREGATOR = {
  id: 'eq-aggregator',
  equationNumber: '98',
  formula: 'agg = SUM(A_E * C_i)',
  inputSymbols: ['A_E', 'C_i', 'surface_inventory'],
  outputSymbol: 'agg',
};

let captured = new Set<string>();
function Harness() {
  const memoFields = useMemo(() => FIELDS, []);
  const memoEquations = useMemo(() => [EQ_MISENCODED, EQ_FAITHFUL, EQ_AGGREGATOR], []);
  const { engineEquationIds } = useEquationEngine({
    worksheetCode: 'A138-18',
    fields: memoFields,
    equations: memoEquations,
  });
  captured = engineEquationIds;
  return null;
}

describe('E1-A DEMO — gate blocking end-to-end (route-all exclusion)', () => {
  it('mis-encoded A138-18:22 (bare `d`) is EXCLUDED from route-all; faithful + carrier-aggregator are routed', () => {
    useWorksheetStore.setState({ values: {} });
    render(<Harness />);
    // BLOCKED — not silently computed:
    expect(captured.has('eq-a138-18-22')).toBe(false);
    // Faithful equation still routes:
    expect(captured.has('eq-faithful')).toBe(true);
    // Carrier-aggregator exempt (structural) — still routes despite SUM()/non-field symbols:
    expect(captured.has('eq-aggregator')).toBe(true);
  });
});
