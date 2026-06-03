import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../formula';
import type { SurfaceInventoryCarrier } from '../surface-types';

/**
 * A138-07 preliminary Gl. 2 aggregator tests.
 *
 *   A_C_preliminary = Σ (A_E,i · C_i)   over surface_inventory rows
 *
 * Three-state contract exercised here:
 *   - empty carrier → manual_required
 *   - any incomplete row → manual_required naming the row
 *   - complete rows → computed, with paved/unpaved subtotals
 */

const A138_07_GL2_PRELIM_ID = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';

function call(carrier: SurfaceInventoryCarrier | null) {
  return evaluateFormula({
    equationId: A138_07_GL2_PRELIM_ID,
    formula: 'A_C_preliminary = Σ(A_E,i · C_i)',
    inputSymbols: [],
    outputSymbol: 'A_C_preliminary',
    expectedUnits: {},
    inputs: [],
    aggregator: carrier ? { surfaceInventory: carrier } : undefined,
  });
}

describe('A138-07 Gl. 2 preliminary aggregator', () => {
  it('returns manual_required when no carrier is plumbed in', () => {
    const r = call(null);
    expect(r.kind).toBe('manual_required');
  });

  it('returns manual_required when the carrier has no rows', () => {
    const r = call({ rows: [] });
    expect(r.kind).toBe('manual_required');
    if (r.kind === 'manual_required') {
      expect(r.reason).toMatch(/mindestens eine Zeile/i);
    }
  });

  it('returns manual_required when a row is missing area_m2', () => {
    const r = call({
      rows: [
        { id: 'r1', label: 'Hauptdach', surface_type: 'dach', area_m2: null, c_i: 0.9, c_s: 1.0 },
      ],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind === 'manual_required') {
      expect(r.reason).toMatch(/Hauptdach/);
    }
  });

  it('returns manual_required when a row is missing c_i', () => {
    const r = call({
      rows: [
        { id: 'r1', label: '', surface_type: 'dach', area_m2: 500, c_i: null, c_s: 1.0 },
      ],
    });
    expect(r.kind).toBe('manual_required');
  });

  it('does NOT require c_s — that feeds Gl. 10, not the preliminary Gl. 2', () => {
    const r = call({
      rows: [
        { id: 'r1', label: 'Dach', surface_type: 'dach', area_m2: 500, c_i: 0.9, c_s: null },
      ],
    });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') {
      expect(r.value).toBeCloseTo(500 * 0.9);
    }
  });

  it('computes A_C as Σ(A_E,i · C_i) for a single paved row', () => {
    const r = call({
      rows: [
        { id: 'r1', label: 'Dach', surface_type: 'dach', area_m2: 500, c_i: 0.9, c_s: 1.0 },
      ],
    });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') {
      expect(r.value).toBeCloseTo(500 * 0.9);
      expect(r.substituted!['Σ befestigt']).toBeCloseTo(450);
      expect(r.substituted!['Σ unbefestigt']).toBeCloseTo(0);
    }
  });

  it('splits paved + unpaved into the per-subtotal map and totals them', () => {
    const r = call({
      rows: [
        { id: 'r1', label: 'Dach',      surface_type: 'dach',    area_m2: 400, c_i: 0.9, c_s: 1.0 },
        { id: 'r2', label: 'Asphalt',   surface_type: 'asphalt', area_m2: 200, c_i: 0.9, c_s: 1.0 },
        { id: 'r3', label: 'Rasen',     surface_type: 'rasen',   area_m2: 100, c_i: 0.1, c_s: 0.3 },
      ],
    });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') {
      // paved Σ = 400·0.9 + 200·0.9 = 540
      // unpaved Σ = 100·0.1 = 10
      // total = 550
      expect(r.substituted!['Σ befestigt']).toBeCloseTo(540);
      expect(r.substituted!['Σ unbefestigt']).toBeCloseTo(10);
      expect(r.value).toBeCloseTo(550);
    }
  });

  it('treats engineer-overridden c_i (custom value) the same as defaulted c_i', () => {
    // The aggregator never reads SURFACE_TYPE_PROFILES.C_i_default —
    // it always uses whatever the engineer stored. So a customised row
    // and a default-matched row are arithmetically equivalent.
    const r = call({
      rows: [
        { id: 'r1', label: 'Custom Dach', surface_type: 'dach', area_m2: 500, c_i: 0.85, c_s: 1.0 },
      ],
    });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') {
      expect(r.value).toBeCloseTo(500 * 0.85);
    }
  });

  it('falls back to "Zeile N" when label is blank', () => {
    const r = call({
      rows: [
        { id: 'r1', label: '', surface_type: 'dach', area_m2: null, c_i: 0.9, c_s: 1.0 },
      ],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind === 'manual_required') {
      expect(r.reason).toMatch(/Zeile 1/);
    }
  });
});
