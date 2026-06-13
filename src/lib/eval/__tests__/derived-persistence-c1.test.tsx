/**
 * §C1 reproduction — does an engine-computed *scalar* output reach the save
 * path so it lands in project_parameters?
 *
 * The 138-derived-skill-foundation doc (§C1) names this the blocker:
 *   "Engine/aggregator computed outputs (A_C, A_C_preliminary, Q_zu, …) are
 *    NOT persisted to project_parameters. The use-equation-engine write-back
 *    is in-memory display only; saveWorksheet does not persist computed/
 *    derived fields."
 *
 * Persistence works like this: the store's `flush()` sends exactly the field
 * ids in `pendingFieldIds` to `saveWorksheet`, which UPSERTs them into
 * project_parameters. So a computed scalar is durably saved IFF the engine's
 * write-back marks the output field pending.
 *
 * This test drives the PRODUCTION hook (`useEquationEngine`) + the real store
 * for A138-10's A_C aggregator (eq 1a48af79, recompute-from-carrier, NOT
 * displayOnly) and asserts the computed A_C is both written into the store
 * AND queued in pendingFieldIds. If it is NOT queued, the downstream scalar
 * chain (e.g. A138-13 Gl. 8 inheriting the A_C row) reads null — exactly the
 * symptom the doc anchors on.
 */
/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useMemo } from 'react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import type { SurfaceInventoryCarrier } from '@/lib/eval/surface-types';

const A_C_EQ_ID = '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3';

type Field = { id: string; symbol: string; unit: string | null };

// A138-10 owns A_C (the recompute-from-carrier producer) and reads the
// surface_inventory carrier inherited from A138-07.
const FIELDS: Field[] = [
  { id: 'a10.surface_inventory', symbol: 'surface_inventory', unit: null },
  { id: 'a10.A_C', symbol: 'A_C', unit: 'm²' },
];

const EQUATIONS = [
  {
    id: A_C_EQ_ID,
    equationNumber: '2',
    formula: 'aggregator',
    inputSymbols: [],
    outputSymbol: 'A_C',
  },
];

// Same mixed inventory as formula-A138-10-inventory.test.ts → A_C = 640.
const MIXED: SurfaceInventoryCarrier = {
  rows: [
    { id: 'r1', label: 'Dach', surface_type: 'dach', area_m2: 400, c_i: 0.9, c_s: 1.0 },
    { id: 'r2', label: 'Asphalt', surface_type: 'asphalt', area_m2: 200, c_i: 0.9, c_s: 1.0 },
    { id: 'r3', label: 'Rasen', surface_type: 'rasen', area_m2: 100, c_i: 0.1, c_s: 0.3 },
    { id: 'r4', label: 'Kies', surface_type: 'kies', area_m2: 300, c_i: 0.3, c_s: 0.5 },
  ],
};
const EXPECTED_AC = 640;

function Harness() {
  const fields = useMemo(() => FIELDS, []);
  const equations = useMemo(() => EQUATIONS, []);
  useEquationEngine({
    worksheetCode: 'A138-10',
    fields,
    equations,
    engineWhitelist: new Set<string>(['A138-10:2']),
  });
  return null;
}

describe('§C1 — engine-computed scalar must reach the save payload', () => {
  beforeEach(() => {
    act(() => useWorksheetStore.getState().init('a10-instance', {}, {}, {}));
  });

  it('A_C computed from the inventory carrier is written into the store', () => {
    act(() => {
      useWorksheetStore
        .getState()
        .setField('a10.surface_inventory', { type: 'json', value: MIXED });
    });
    render(<Harness />);
    const acValue = useWorksheetStore.getState().values['a10.A_C'];
    expect(acValue?.type === 'number' ? acValue.value : null).toBeCloseTo(EXPECTED_AC, 6);
  });

  it('A_C is queued in pendingFieldIds so flush() persists it to project_parameters', () => {
    act(() => {
      useWorksheetStore
        .getState()
        .setField('a10.surface_inventory', { type: 'json', value: MIXED });
    });
    render(<Harness />);
    // The single-source contract requires the produced scalar to be durable:
    // downstream consumers inherit it by reading its project_parameters row.
    expect(useWorksheetStore.getState().pendingFieldIds.has('a10.A_C')).toBe(true);
  });
});
