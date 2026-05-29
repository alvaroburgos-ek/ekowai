/**
 * Combined evaluator tests for the §6.x.y batch:
 *   Gl. 4   A138-12   Q_S = k_i · A_S · 10³
 *   Gl. 7   A138-12   A_S,m = (A_S,min + A_S,max) / 2
 *   Gl. 11  A138-16   (A_C + A_S)·r_D(n)·10⁻⁷ = A_S·k_i   (balance aggregator)
 *   Gl. 12  A138-16   A_S = A_C / (k_i·10⁷/r_D(n) − 1)
 *   Gl. 16  A138-17   A_S,m = (A_C·10⁻⁷·r_D(n)) / (h_M/(D·60·f_Z) + k_i)
 *   Gl. 17  A138-18   A_S,m = (b_R+h_R)·L_R + b_R·h_R
 *   Gl. 18  A138-18   Q_S = ((b_R+h_R)·L_R + b_R·h_R) · k_i   (1000× unit trap noted)
 *
 * Each gets: hand-calc reproduction, unit-conflict guard, missing-input
 * fail-loud. All states obey the three-state contract — never a bare number.
 */
import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from '../formula';

// ---- ids (from Step 0 query) --------------------------------------------
const GL4_ID = 'bd080331-d673-4a11-b12a-29e00bdbc939';
const GL7_ID = '55151cb1-4a5a-48d1-b5c0-2312ef7b78ac';
const GL11_ID = '3b3b2cf6-da4f-43b2-a302-b7c38768d3ff';
const GL12_ID = 'a1cf1d5c-d001-45aa-ae9d-a7406d75d120';
const GL16_ID = '14999c2a-cdeb-42c1-98fd-fcdec65123da';
const GL17_ID = '8afdb49a-7bb1-4f07-a64e-43009b8b6be1';
const GL18_ID = 'ef4242d4-d9a0-43db-b65b-685bf9c92c9c';

function req(
  id: string,
  formula: string,
  inputSymbols: string[],
  outputSymbol: string,
  inputs: EvalRequest['inputs'],
): EvalRequest {
  return { equationId: id, formula, inputSymbols, outputSymbol, inputs };
}

describe('Gl. 4 — Q_S = k_i · A_S · 10³', () => {
  it('hand calc: k_i=5e-5, A_S=100 → Q_S = 5.000 l/s', () => {
    const r = evaluateFormula(
      req(GL4_ID, 'Q_S = k_i * A_S * 10^3', ['k_i', 'A_S'], 'Q_S', [
        { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        { symbol: 'A_S', value: 100, unit: 'm²' },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(5, 9);
  });

  it('unit guard: k_i in "mm/s" → manual_required, no number', () => {
    const r = evaluateFormula(
      req(GL4_ID, 'Q_S = k_i * A_S * 10^3', ['k_i', 'A_S'], 'Q_S', [
        { symbol: 'k_i', value: 5e-2, unit: 'mm/s' }, // wrong unit
        { symbol: 'A_S', value: 100, unit: 'm²' },
      ]),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts).toEqual([
      { symbol: 'k_i', expected: 'm/s', actual: 'mm/s' },
    ]);
    expect((r as { value?: number }).value).toBeUndefined();
  });

  it('missing input → manual_required, no number', () => {
    const r = evaluateFormula(
      req(GL4_ID, 'Q_S = k_i * A_S * 10^3', ['k_i', 'A_S'], 'Q_S', [
        { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
      ]),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.missing).toEqual(['A_S']);
  });
});

describe('Gl. 7 — A_S,m = (A_S,min + A_S,max) / 2', () => {
  it('hand calc: 80 + 120 → 100', () => {
    const r = evaluateFormula(
      req(
        GL7_ID,
        'A_S_m = (A_S_min + A_S_max) / 2',
        ['A_S_min', 'A_S_max'],
        'A_S_m',
        [
          { symbol: 'A_S_min', value: 80, unit: 'm²' },
          { symbol: 'A_S_max', value: 120, unit: 'm²' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBe(100);
  });

  it('unit guard: A_S_min in "ha" → manual_required', () => {
    const r = evaluateFormula(
      req(
        GL7_ID,
        'A_S_m = (A_S_min + A_S_max) / 2',
        ['A_S_min', 'A_S_max'],
        'A_S_m',
        [
          { symbol: 'A_S_min', value: 0.01, unit: 'ha' },
          { symbol: 'A_S_max', value: 120, unit: 'm²' },
        ],
      ),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts?.[0]).toEqual({
      symbol: 'A_S_min',
      expected: 'm²',
      actual: 'ha',
    });
  });
});

describe('Gl. 11 — Bilanz-Check (A_C + A_S) · r_D(n) · 10⁻⁷ vs A_S · k_i', () => {
  it('balanced case (A_S from Gl. 12) → computed, residual ≈ 0', () => {
    const r = evaluateFormula(
      req(
        GL11_ID,
        '(A_C + A_S) * r_D(n) * 10^-7 = A_S * k_i',
        ['A_C', 'A_S', 'r_D(n)', 'k_i'],
        '(balance)',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'A_S', value: 351.3513513513513, unit: 'm²' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(Math.abs(r.value)).toBeLessThan(1e-9);
    expect(r.substituted['LHS = (A_C + A_S) · r_D(n) · 10⁻⁷']).toBeCloseTo(
      0.017567567,
      6,
    );
    expect(r.substituted['RHS = A_S · k_i']).toBeCloseTo(0.017567567, 6);
  });

  it('unbalanced case (A_S = 100) → manual_required, "Bilanz weicht ab"', () => {
    const r = evaluateFormula(
      req(
        GL11_ID,
        '(A_C + A_S) * r_D(n) * 10^-7 = A_S * k_i',
        ['A_C', 'A_S', 'r_D(n)', 'k_i'],
        '(balance)',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'A_S', value: 100, unit: 'm²' }, // not balanced
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        ],
      ),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.reason).toMatch(/Bilanz weicht/);
    expect((r as { value?: number }).value).toBeUndefined();
  });

  it('missing input (A_S) → manual_required, names it', () => {
    const r = evaluateFormula(
      req(
        GL11_ID,
        '(A_C + A_S) * r_D(n) * 10^-7 = A_S * k_i',
        ['A_C', 'A_S', 'r_D(n)', 'k_i'],
        '(balance)',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        ],
      ),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.missing).toContain('A_S');
  });
});

describe('Gl. 12 — A_S Flächenversickerung', () => {
  it('hand calc: A_C=1000, k_i=5e-5, r_D(n)=130 → A_S = 351.351 m²', () => {
    const r = evaluateFormula(
      req(
        GL12_ID,
        'A_S = A_C / (k_i * 10^7 / r_D(n) - 1)',
        ['A_C', 'k_i', 'r_D(n)'],
        'A_S',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    const exact = 1000 / ((5e-5 * 1e7) / 130 - 1);
    expect(r.value).toBeCloseTo(exact, 12);
    expect(r.value).toBeCloseTo(351.351351, 4);
  });

  it('the r_D(n) normalisation: source-formatted formula evaluates without "function-call" error', () => {
    // The raw DB string literally contains `r_D(n)`. Engine must parse it
    // after normalising to `r_D_n`.
    const r = evaluateFormula(
      req(
        GL12_ID,
        'A_S = A_C / (k_i * 10^7 / r_D(n) - 1)',
        ['A_C', 'k_i', 'r_D(n)'],
        'A_S',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
  });

  it('unit guard: k_i in "mm/s" → manual_required', () => {
    const r = evaluateFormula(
      req(
        GL12_ID,
        'A_S = A_C / (k_i * 10^7 / r_D(n) - 1)',
        ['A_C', 'k_i', 'r_D(n)'],
        'A_S',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'k_i', value: 5e-2, unit: 'mm/s' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
        ],
      ),
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

describe('Gl. 16 — A_S,m Mulde (h_M form)', () => {
  it('hand calc: → A_S,m ≈ 68.824 m²', () => {
    const r = evaluateFormula(
      req(
        GL16_ID,
        'A_S_m = (A_C * 10^-7 * r_D(n)) / (h_M / (D * 60 * f_Z) + k_i)',
        ['A_C', 'r_D(n)', 'h_M', 'D', 'f_Z', 'k_i'],
        'A_S_m',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'h_M', value: 0.3, unit: 'm' },
          { symbol: 'D', value: 30, unit: 'min' },
          { symbol: 'f_Z', value: 1.2, unit: null },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    const exact = (1000 * 1e-7 * 130) / (0.3 / (30 * 60 * 1.2) + 5e-5);
    expect(r.value).toBeCloseTo(exact, 9);
    expect(r.value).toBeCloseTo(68.823529, 5);
  });

  it('unit guard: h_M in "cm" → manual_required', () => {
    const r = evaluateFormula(
      req(
        GL16_ID,
        'A_S_m = (A_C * 10^-7 * r_D(n)) / (h_M / (D * 60 * f_Z) + k_i)',
        ['A_C', 'r_D(n)', 'h_M', 'D', 'f_Z', 'k_i'],
        'A_S_m',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'h_M', value: 30, unit: 'cm' }, // wrong
          { symbol: 'D', value: 30, unit: 'min' },
          { symbol: 'f_Z', value: 1.2, unit: null },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        ],
      ),
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

describe('Gl. 17 — A_S,m Rigole (Geometrie)', () => {
  it('hand calc: b_R=h_R=1, L_R=10 → A_S,m = 21 m²', () => {
    const r = evaluateFormula(
      req(
        GL17_ID,
        'A_S_m = (b_R + h_R) * L_R + b_R * h_R',
        ['b_R', 'h_R', 'L_R'],
        'A_S_m',
        [
          { symbol: 'b_R', value: 1, unit: 'm' },
          { symbol: 'h_R', value: 1, unit: 'm' },
          { symbol: 'L_R', value: 10, unit: 'm' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBe(21);
  });

  it('unit guard: L_R in "cm" → manual_required', () => {
    const r = evaluateFormula(
      req(
        GL17_ID,
        'A_S_m = (b_R + h_R) * L_R + b_R * h_R',
        ['b_R', 'h_R', 'L_R'],
        'A_S_m',
        [
          { symbol: 'b_R', value: 1, unit: 'm' },
          { symbol: 'h_R', value: 1, unit: 'm' },
          { symbol: 'L_R', value: 1000, unit: 'cm' },
        ],
      ),
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

describe('Gl. 18 — Q_S Rigole (literal formula; ×10³ missing in DB — documented)', () => {
  it('hand calc per literal DB formula: → 1.050 × 10⁻³', () => {
    const r = evaluateFormula(
      req(
        GL18_ID,
        'Q_S = ((b_R + h_R) * L_R + b_R * h_R) * k_i',
        ['b_R', 'h_R', 'L_R', 'k_i'],
        'Q_S',
        [
          { symbol: 'b_R', value: 1, unit: 'm' },
          { symbol: 'h_R', value: 1, unit: 'm' },
          { symbol: 'L_R', value: 10, unit: 'm' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(1.05e-3, 9);
  });

  it('unit guard: b_R in "cm" → manual_required', () => {
    const r = evaluateFormula(
      req(
        GL18_ID,
        'Q_S = ((b_R + h_R) * L_R + b_R * h_R) * k_i',
        ['b_R', 'h_R', 'L_R', 'k_i'],
        'Q_S',
        [
          { symbol: 'b_R', value: 100, unit: 'cm' },
          { symbol: 'h_R', value: 1, unit: 'm' },
          { symbol: 'L_R', value: 10, unit: 'm' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        ],
      ),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts?.[0]).toEqual({
      symbol: 'b_R',
      expected: 'm',
      actual: 'cm',
    });
  });
});
