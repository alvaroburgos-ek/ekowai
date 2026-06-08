import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../formula';
import { aggregators } from '../aggregators';
import { summarizeSurfaceInventory, type SurfaceInventoryCarrier } from '../surface-types';

/**
 * Pile-14 — A138-10's surface-inventory-driven aggregators.
 *
 * After consolidation onto the single `surface_inventory` carrier, A138-10
 * exposes three read-only aggregators that read the SAME carrier the A138-07
 * preliminary Gl. 2 reads (consumer-linked onto A138-10):
 *
 *   ΣSealed   = summarizeSurfaceInventory(rows).sealed
 *   ΣUnsealed = summarizeSurfaceInventory(rows).unsealed
 *   C_m       = ac / area   (mean runoff coefficient, §5.3.3.5)
 *
 * All three run the same three-state completeness gate as a138_07_gl2_prelim.
 */

const SIGMA_SEALED_ID = 'd1a38110-0000-0000-0000-000000000001';
const SIGMA_UNSEALED_ID = 'd1a38110-0000-0000-0000-000000000002';
const C_M_ID = 'd1a38110-0000-0000-0000-000000000003';

const A138_07_GL2_PRELIM_ID = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';

function call(eqId: string, carrier: SurfaceInventoryCarrier | null) {
  return evaluateFormula({
    equationId: eqId,
    formula: 'aggregator',
    inputSymbols: [],
    outputSymbol: 'X',
    expectedUnits: {},
    inputs: [],
    aggregator: carrier ? { surfaceInventory: carrier } : undefined,
  });
}

// Mixed paved/unpaved inventory used across the computed-value assertions.
//   Dach   (paved):   400 · 0.9 = 360  → sealed
//   Asphalt(paved):   200 · 0.9 = 180  → sealed
//   Rasen  (unpaved): 100 · 0.1 =  10  → unsealed
//   Kies   (unpaved): 300 · 0.3 =  90  → unsealed
// sealed = 540 ; unsealed = 100 ; area = 1000 ; ac = 640 ; C_m = 0.64
const MIXED: SurfaceInventoryCarrier = {
  rows: [
    { id: 'r1', label: 'Dach', surface_type: 'dach', area_m2: 400, c_i: 0.9, c_s: 1.0 },
    { id: 'r2', label: 'Asphalt', surface_type: 'asphalt', area_m2: 200, c_i: 0.9, c_s: 1.0 },
    { id: 'r3', label: 'Rasen', surface_type: 'rasen', area_m2: 100, c_i: 0.1, c_s: 0.3 },
    { id: 'r4', label: 'Kies', surface_type: 'kies', area_m2: 300, c_i: 0.3, c_s: 0.5 },
  ],
};
const EXPECTED_SEALED = 540;
const EXPECTED_UNSEALED = 100;
const EXPECTED_AC = 640;
const EXPECTED_C_M = 0.64;

describe('A138-10 ΣSealed aggregator', () => {
  it('manual_required when no carrier is plumbed in', () => {
    expect(call(SIGMA_SEALED_ID, null).kind).toBe('manual_required');
  });
  it('manual_required when the carrier has no rows', () => {
    const r = call(SIGMA_SEALED_ID, { rows: [] });
    expect(r.kind).toBe('manual_required');
    if (r.kind === 'manual_required') expect(r.reason).toMatch(/mindestens eine Zeile/i);
  });
  it('manual_required naming the incomplete row (missing area_m2)', () => {
    const r = call(SIGMA_SEALED_ID, {
      rows: [{ id: 'r1', label: 'Hauptdach', surface_type: 'dach', area_m2: null, c_i: 0.9, c_s: 1.0 }],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind === 'manual_required') expect(r.reason).toMatch(/Hauptdach/);
  });
  it('manual_required naming the incomplete row (missing c_i)', () => {
    const r = call(SIGMA_SEALED_ID, {
      rows: [{ id: 'r1', label: 'Hauptdach', surface_type: 'dach', area_m2: 400, c_i: null, c_s: 1.0 }],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind === 'manual_required') expect(r.reason).toMatch(/Hauptdach/);
  });
  it('computes sealed = 540 for the mixed inventory', () => {
    const r = call(SIGMA_SEALED_ID, MIXED);
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') {
      expect(r.value).toBeCloseTo(EXPECTED_SEALED, 6);
      expect(r.value).toBeCloseTo(summarizeSurfaceInventory(MIXED.rows).sealed, 6);
    }
  });
});

describe('A138-10 ΣUnsealed aggregator', () => {
  it('manual_required when no carrier is plumbed in', () => {
    expect(call(SIGMA_UNSEALED_ID, null).kind).toBe('manual_required');
  });
  it('manual_required naming the incomplete row', () => {
    const r = call(SIGMA_UNSEALED_ID, {
      rows: [{ id: 'r1', label: 'Wiese', surface_type: 'rasen', area_m2: 100, c_i: null, c_s: 0.3 }],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind === 'manual_required') expect(r.reason).toMatch(/Wiese/);
  });
  it('computes unsealed = 100 for the mixed inventory', () => {
    const r = call(SIGMA_UNSEALED_ID, MIXED);
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') {
      expect(r.value).toBeCloseTo(EXPECTED_UNSEALED, 6);
      expect(r.value).toBeCloseTo(summarizeSurfaceInventory(MIXED.rows).unsealed, 6);
    }
  });
});

describe('A138-10 C_m (mean runoff coefficient) aggregator', () => {
  it('manual_required when no carrier is plumbed in', () => {
    expect(call(C_M_ID, null).kind).toBe('manual_required');
  });
  it('manual_required naming the incomplete row', () => {
    const r = call(C_M_ID, {
      rows: [{ id: 'r1', label: 'Hof', surface_type: 'asphalt', area_m2: null, c_i: 0.9, c_s: 1.0 }],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind === 'manual_required') expect(r.reason).toMatch(/Hof/);
  });
  it('computes C_m = ac / area = 0.64 for the mixed inventory', () => {
    const r = call(C_M_ID, MIXED);
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') {
      expect(r.value).toBeCloseTo(EXPECTED_C_M, 6);
    }
  });
  it('manual_required (NOT NaN/Infinity) when Σ area is 0', () => {
    // All rows have area 0 → complete (0 is finite) but area sum = 0.
    const r = call(C_M_ID, {
      rows: [
        { id: 'r1', label: 'Null A', surface_type: 'dach', area_m2: 0, c_i: 0.9, c_s: 1.0 },
        { id: 'r2', label: 'Null B', surface_type: 'rasen', area_m2: 0, c_i: 0.1, c_s: 0.3 },
      ],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind === 'manual_required') expect(r.reason).toMatch(/Fläche/);
  });
});

describe('Pile-14 no-divergence invariant', () => {
  it('ΣSealed + ΣUnsealed === A_C_preliminary aggregator value for the same inventory', () => {
    const sealed = call(SIGMA_SEALED_ID, MIXED);
    const unsealed = call(SIGMA_UNSEALED_ID, MIXED);
    const prelim = aggregators[A138_07_GL2_PRELIM_ID].run({
      equationId: A138_07_GL2_PRELIM_ID,
      formula: 'aggregator',
      inputSymbols: [],
      outputSymbol: 'A_C_preliminary',
      inputs: [],
      aggregator: { surfaceInventory: MIXED },
    });
    expect(sealed.kind).toBe('computed');
    expect(unsealed.kind).toBe('computed');
    expect(prelim.kind).toBe('computed');
    if (sealed.kind === 'computed' && unsealed.kind === 'computed' && prelim.kind === 'computed') {
      expect(sealed.value + unsealed.value).toBeCloseTo(prelim.value, 6);
      expect(sealed.value + unsealed.value).toBeCloseTo(EXPECTED_AC, 6);
    }
  });
});
