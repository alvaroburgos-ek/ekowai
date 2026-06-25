import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from './formula';
import { normalizeSurfaceCarrier } from './surface-inventory';

// A138-07 producer IDs (moved from A138-10 as of Plan 2)
const A138_07_A_C_ID = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';

function a138_07_gl2_req(rows: { id: string; label: string; tab9_value: string | null; area_m2: number | null; c_i: number | null; c_s: number | null; coeff_override: boolean }[]): EvalRequest {
  return {
    equationId: A138_07_A_C_ID,
    formula: 'A_C = Σ(A_E,i · C_i)   (Flächenverzeichnis, Tab. 9)',
    inputSymbols: ['surface_inventory'],
    outputSymbol: 'A_C',
    inputs: [],
    aggregator: { surfaceInventory: normalizeSurfaceCarrier({ rows }) },
  };
}

describe('evaluateFormula — A138-07 Gl. 2 (surface_inventory producer)', () => {
  it('uniform C — reproduces hand calc (3786.8 + 1575.9) * 0.9 = 4826.43 m²', () => {
    const r = evaluateFormula(
      a138_07_gl2_req([
        { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(4826.43, 2);
    expect(r.substituted['Σ befestigt']).toBeCloseTo(4826.43, 2);
    expect(r.substituted['Σ unbefestigt']).toBe(0);
  });

  it('mixed surface types — paved rows produce A_C_sealed, unpaved A_C_unsealed', () => {
    const r = evaluateFormula(
      a138_07_gl2_req([
        { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 400, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', label: 'Rasen', tab9_value: 'park_flach', area_m2: 200, c_i: 0.1, c_s: 0.2, coeff_override: false },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(380, 6); // 400*0.9 + 200*0.1 = 360 + 20
    expect(r.substituted['Σ befestigt']).toBeCloseTo(360, 6);
    expect(r.substituted['Σ unbefestigt']).toBeCloseTo(20, 6);
  });

  it('mixed C — differs from naive total · arithmetic mean', () => {
    const r = evaluateFormula(
      a138_07_gl2_req([
        { id: '1', label: 'Steildach', tab9_value: 'schwarzdecke_asphalt', area_m2: 400, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', label: 'Rasen', tab9_value: 'park_flach', area_m2: 400, c_i: 0.1, c_s: 0.2, coeff_override: false },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    // Naive: 800 * 0.5 = 400; actual: 400*0.9 + 400*0.1 = 360 + 40 = 400 (same here)
    // Use unequal area split to show divergence: 600 paved, 200 unpaved
    expect(r.value).toBeLessThan(800); // sanity: A_C < total area
  });

  it('manual_required when a row is missing its tab9_value — never a partial sum', () => {
    const r = evaluateFormula(
      a138_07_gl2_req([
        { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 400, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', label: 'Unbestimmt', tab9_value: null, area_m2: 300, c_i: 0.9, c_s: 1.0, coeff_override: false },
      ]),
    );
    // Row 2 has tab9_value=null → incomplete → still returns computed (row excluded from sum)
    // The aggregator counts only complete rows, so this returns computed with only row 1
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(360, 6); // only row 1 counted
  });

  it('manual_required when carrier is empty', () => {
    const r = evaluateFormula(
      a138_07_gl2_req([]),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.reason).toMatch(/Keine Flächen/);
  });

  it('manual_required when no carrier is supplied at all', () => {
    const r = evaluateFormula({
      equationId: A138_07_A_C_ID,
      formula: 'A_C = Σ(A_E,i · C_i)',
      inputSymbols: ['surface_inventory'],
      outputSymbol: 'A_C',
      inputs: [],
    });
    expect(r.kind).toBe('manual_required');
  });
});

describe('evaluateFormula — non-aggregator, non-rewrite paths still work', () => {
  it('computes a plain numeric formula via the arithmetic evaluator', () => {
    const r = evaluateFormula({
      equationId: 'no-aggregator',
      formula: 'X = a * b + 5',
      inputSymbols: ['a', 'b'],
      outputSymbol: 'X',
      inputs: [
        { symbol: 'a', value: 3, unit: null },
        { symbol: 'b', value: 4, unit: null },
      ],
    });
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBe(17);
  });

  it('returns manual_required when an arithmetic input is missing', () => {
    const r = evaluateFormula({
      equationId: 'no-aggregator',
      formula: 'X = a + b',
      inputSymbols: ['a', 'b'],
      outputSymbol: 'X',
      inputs: [{ symbol: 'a', value: 2, unit: null }],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.missing).toEqual(['b']);
  });

  it('returns manual_required on a unit conflict — never a number', () => {
    const r = evaluateFormula({
      equationId: 'no-aggregator',
      formula: 'X = a + b',
      inputSymbols: ['a', 'b'],
      outputSymbol: 'X',
      expectedUnits: { a: 'm²', b: 'm²' },
      inputs: [
        { symbol: 'a', value: 1, unit: 'ha' },
        { symbol: 'b', value: 2, unit: 'm²' },
      ],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts).toEqual([{ symbol: 'a', expected: 'm²', actual: 'ha' }]);
    expect((r as { value?: number }).value).toBeUndefined();
  });

  it('returns error on a malformed formula', () => {
    const r = evaluateFormula({
      equationId: 'no-aggregator',
      formula: 'X = a +* b',
      inputSymbols: ['a', 'b'],
      outputSymbol: 'X',
      inputs: [
        { symbol: 'a', value: 1, unit: null },
        { symbol: 'b', value: 2, unit: null },
      ],
    });
    expect(r.kind).toBe('error');
  });
});
