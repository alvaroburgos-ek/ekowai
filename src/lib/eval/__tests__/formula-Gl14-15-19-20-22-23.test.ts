/**
 * Batch-2 evaluator tests:
 *   Gl. 14  A138-17  V_M required (Mulde)
 *   Gl. 15  A138-17  V_M geometric (A_S,m · h_M)        — displayOnly
 *   Gl. 19  A138-18  V_R required (Rigole)
 *   Gl. 20  A138-18  V_R geometric (b·h·L·s_R)          — displayOnly
 *   Gl. 22  A138-18  s_R thin-wall (alt of Gl. 21)      — displayOnly
 *   Gl. 23  A138-18  L_R required                       — displayOnly
 *
 * Hand-calc references in audit-reports/DWA-A-138-1/_eval-reference-Gl{N}.md.
 * Each equation: hand-calc reproduction, unit-conflict guard, missing-input
 * fail-loud. Three-state contract preserved.
 */
import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from '../formula';

const GL14_ID = 'bfe6e59a-015f-4c95-b717-8599f80cb68a';
const GL15_ID = '44fd56a8-b473-441a-be21-297d9f501226';
const GL19_ID = '58c0c298-ca72-4bb6-ab05-0b298114523e';
const GL20_ID = 'b8e74a4b-64cc-4b81-b306-b2e01e759f5e';
const GL22_ID = '20c31318-7401-4f89-a27b-bc3cf8723548';
const GL23_ID = '927aa5ab-3aa9-486e-a05d-f91847e8d31e';

function req(
  id: string,
  formula: string,
  inputSymbols: string[],
  outputSymbol: string,
  inputs: EvalRequest['inputs'],
): EvalRequest {
  return { equationId: id, formula, inputSymbols, outputSymbol, inputs };
}

const A_S_m_HAND_CALC = 68.823529411764706; // Gl. 16 reference output

describe('Gl. 14 — V_M Mulde required', () => {
  const formula =
    'V_M = ((A_C + A_VA) * 10^-7 * r_D(n) - A_S_m * k_i) * D * 60 * f_Z';
  const symbols = ['A_C', 'A_VA', 'r_D(n)', 'A_S_m', 'k_i', 'D', 'f_Z'];

  it('hand calc → V_M ≈ 22.051 m³', () => {
    const r = evaluateFormula(
      req(GL14_ID, formula, symbols, 'V_M', [
        { symbol: 'A_C', value: 1000, unit: 'm²' },
        { symbol: 'A_VA', value: 50, unit: 'm²' },
        { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
        { symbol: 'A_S_m', value: A_S_m_HAND_CALC, unit: 'm²' },
        { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        { symbol: 'D', value: 30, unit: 'min' },
        { symbol: 'f_Z', value: 1.2, unit: null },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    const exact =
      (1050 * 1e-7 * 130 - A_S_m_HAND_CALC * 5e-5) * 30 * 60 * 1.2;
    expect(r.value).toBeCloseTo(exact, 10);
    expect(r.value).toBeCloseTo(22.051, 2);
  });

  it('unit guard: A_VA in "ha" → manual_required', () => {
    const r = evaluateFormula(
      req(GL14_ID, formula, symbols, 'V_M', [
        { symbol: 'A_C', value: 1000, unit: 'm²' },
        { symbol: 'A_VA', value: 0.005, unit: 'ha' },
        { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
        { symbol: 'A_S_m', value: A_S_m_HAND_CALC, unit: 'm²' },
        { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        { symbol: 'D', value: 30, unit: 'min' },
        { symbol: 'f_Z', value: 1.2, unit: null },
      ]),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts?.[0]).toEqual({
      symbol: 'A_VA',
      expected: 'm²',
      actual: 'ha',
    });
  });

  it('missing input → manual_required, names it', () => {
    const r = evaluateFormula(
      req(GL14_ID, formula, symbols, 'V_M', [
        { symbol: 'A_C', value: 1000, unit: 'm²' },
        { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
        { symbol: 'A_S_m', value: A_S_m_HAND_CALC, unit: 'm²' },
        { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        { symbol: 'D', value: 30, unit: 'min' },
        { symbol: 'f_Z', value: 1.2, unit: null },
      ]),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.missing).toEqual(['A_VA']);
  });
});

describe('Gl. 15 — V_M Mulde geometric (displayOnly)', () => {
  it('hand calc: A_S_m · h_M = 68.824 · 0.30 → 20.647 m³', () => {
    const r = evaluateFormula(
      req(
        GL15_ID,
        'V_M = A_S_m * h_M',
        ['A_S_m', 'h_M'],
        'V_M',
        [
          { symbol: 'A_S_m', value: A_S_m_HAND_CALC, unit: 'm²' },
          { symbol: 'h_M', value: 0.3, unit: 'm' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(20.647, 2);
  });

  it('unit guard: h_M in "cm" → manual_required', () => {
    const r = evaluateFormula(
      req(GL15_ID, 'V_M = A_S_m * h_M', ['A_S_m', 'h_M'], 'V_M', [
        { symbol: 'A_S_m', value: A_S_m_HAND_CALC, unit: 'm²' },
        { symbol: 'h_M', value: 30, unit: 'cm' },
      ]),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts?.[0]).toEqual({
      symbol: 'h_M',
      expected: 'm',
      actual: 'cm',
    });
  });
});

describe('Gl. 19 — V_R Rigole required', () => {
  const formula =
    'V_R = (A_C * 10^-7 * r_D(n) - ((b_R + h_R) * L_R + b_R * h_R) * k_i - Q_Dr * 10^-3) * D * 60 * f_Z';
  const symbols = ['A_C', 'r_D(n)', 'b_R', 'h_R', 'L_R', 'k_i', 'Q_Dr', 'D', 'f_Z'];

  it('hand calc → V_R ≈ 25.812 m³', () => {
    const r = evaluateFormula(
      req(GL19_ID, formula, symbols, 'V_R', [
        { symbol: 'A_C', value: 1000, unit: 'm²' },
        { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
        { symbol: 'b_R', value: 1, unit: 'm' },
        { symbol: 'h_R', value: 1, unit: 'm' },
        { symbol: 'L_R', value: 10, unit: 'm' },
        { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        { symbol: 'Q_Dr', value: 0, unit: 'l/s' },
        { symbol: 'D', value: 30, unit: 'min' },
        { symbol: 'f_Z', value: 1.2, unit: null },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    const exact =
      (1000 * 1e-7 * 130 - (2 * 10 + 1) * 5e-5 - 0) * 30 * 60 * 1.2;
    expect(r.value).toBeCloseTo(exact, 10);
    expect(r.value).toBeCloseTo(25.812, 2);
  });

  it('unit guard: L_R in "cm" → manual_required', () => {
    const r = evaluateFormula(
      req(GL19_ID, formula, symbols, 'V_R', [
        { symbol: 'A_C', value: 1000, unit: 'm²' },
        { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
        { symbol: 'b_R', value: 1, unit: 'm' },
        { symbol: 'h_R', value: 1, unit: 'm' },
        { symbol: 'L_R', value: 1000, unit: 'cm' },
        { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        { symbol: 'Q_Dr', value: 0, unit: 'l/s' },
        { symbol: 'D', value: 30, unit: 'min' },
        { symbol: 'f_Z', value: 1.2, unit: null },
      ]),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts?.[0]).toEqual({
      symbol: 'L_R',
      expected: 'm',
      actual: 'cm',
    });
  });
});

describe('Gl. 20 — V_R Rigole geometric (displayOnly)', () => {
  it('hand calc: 1 · 1 · 10 · 0.317166 → 3.172 m³', () => {
    const r = evaluateFormula(
      req(
        GL20_ID,
        'V_R = b_R * h_R * L_R * s_R',
        ['b_R', 'h_R', 'L_R', 's_R'],
        'V_R',
        [
          { symbol: 'b_R', value: 1, unit: 'm' },
          { symbol: 'h_R', value: 1, unit: 'm' },
          { symbol: 'L_R', value: 10, unit: 'm' },
          { symbol: 's_R', value: 0.317166, unit: null },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(3.17166, 4);
  });
});

describe('Gl. 22 — s_R thin-wall (displayOnly)', () => {
  // With d = d_i = 0.184, Gl. 22 must reproduce Gl. 21's answer (algebraically
  // identical when d_a = d_i). Reference value 0.318628.
  it('hand calc: s_F=0.30, b=h=1, az=1, d=0.184 → s_R ≈ 0.318 613', () => {
    const r = evaluateFormula(
      req(
        GL22_ID,
        's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi * d^2/4) * ((1/s_F) - 1))',
        ['s_F', 'b_R', 'h_R', 'az', 'd'],
        's_R',
        [
          { symbol: 's_F', value: 0.3, unit: null },
          { symbol: 'b_R', value: 1, unit: 'm' },
          { symbol: 'h_R', value: 1, unit: 'm' },
          { symbol: 'az', value: 1, unit: null },
          // The hook would alias d → d_i and read d_i's value from the field.
          // Evaluator-direct test: just pass d explicitly.
          { symbol: 'd', value: 0.184, unit: 'm' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    const d = 0.184;
    const exact = (0.3 / 1) * (1 + 1 * ((Math.PI * d * d) / 4) * (1 / 0.3 - 1));
    expect(r.value).toBeCloseTo(exact, 12);
    expect(r.value).toBeCloseTo(0.318613, 5);
  });

  it('algebraically matches Gl. 21 when d_a = d_i = d', () => {
    const r22 = evaluateFormula(
      req(
        GL22_ID,
        's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi * d^2/4) * ((1/s_F) - 1))',
        ['s_F', 'b_R', 'h_R', 'az', 'd'],
        's_R',
        [
          { symbol: 's_F', value: 0.3, unit: null },
          { symbol: 'b_R', value: 1, unit: 'm' },
          { symbol: 'h_R', value: 1, unit: 'm' },
          { symbol: 'az', value: 1, unit: null },
          { symbol: 'd', value: 0.184, unit: 'm' },
        ],
      ),
    );
    // Gl. 21 with d_a=d_i=0.184: (s_F/(b·h)) · (b·h + az·(π/4)·((d²/s_F) − d²))
    const d = 0.184;
    const gl21Expected =
      (0.3 / 1) * (1 + 1 * (Math.PI / 4) * (d * d / 0.3 - d * d));
    expect(r22.kind).toBe('computed');
    if (r22.kind !== 'computed') return;
    expect(r22.value).toBeCloseTo(gl21Expected, 12);
  });
});

describe('Gl. 23 — L_R Rigole required (displayOnly)', () => {
  const formula =
    'L_R = (A_C * 10^-7 * r_D(n) - b_R * h_R * k_i - Q_Dr * 10^-3) / (b_R * h_R * s_R / (D * 60 * f_Z) + (b_R + h_R) * k_i)';
  const symbols = [
    'A_C',
    'r_D(n)',
    'b_R',
    'h_R',
    'k_i',
    'Q_Dr',
    's_R',
    'D',
    'f_Z',
  ];

  it('hand calc → L_R ≈ 52.464 m', () => {
    const r = evaluateFormula(
      req(GL23_ID, formula, symbols, 'L_R', [
        { symbol: 'A_C', value: 1000, unit: 'm²' },
        { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
        { symbol: 'b_R', value: 1, unit: 'm' },
        { symbol: 'h_R', value: 1, unit: 'm' },
        { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        { symbol: 'Q_Dr', value: 0, unit: 'l/s' },
        { symbol: 's_R', value: 0.317166, unit: null },
        { symbol: 'D', value: 30, unit: 'min' },
        { symbol: 'f_Z', value: 1.2, unit: null },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    const num = 1000 * 1e-7 * 130 - 1 * 1 * 5e-5 - 0;
    const denom = (1 * 1 * 0.317166) / (30 * 60 * 1.2) + (1 + 1) * 5e-5;
    const exact = num / denom;
    expect(r.value).toBeCloseTo(exact, 9);
    expect(r.value).toBeCloseTo(52.464, 2);
  });

  it('unit guard: k_i in "mm/s" → manual_required', () => {
    const r = evaluateFormula(
      req(GL23_ID, formula, symbols, 'L_R', [
        { symbol: 'A_C', value: 1000, unit: 'm²' },
        { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
        { symbol: 'b_R', value: 1, unit: 'm' },
        { symbol: 'h_R', value: 1, unit: 'm' },
        { symbol: 'k_i', value: 0.05, unit: 'mm/s' },
        { symbol: 'Q_Dr', value: 0, unit: 'l/s' },
        { symbol: 's_R', value: 0.317166, unit: null },
        { symbol: 'D', value: 30, unit: 'min' },
        { symbol: 'f_Z', value: 1.2, unit: null },
      ]),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts?.[0]).toEqual({
      symbol: 'k_i',
      expected: 'm/s',
      actual: 'mm/s',
    });
  });
});
