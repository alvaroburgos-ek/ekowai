/**
 * Batch-2 + Batch-3 evaluator tests.
 *
 * Covers the §6.x.y arithmetic equations (Gl. 14, 15, 17 already wired
 * but tested here for completeness, 19, 20, 22, 23, 24, 26-37, 39, 40, 41)
 * plus the two ≥-condition aggregators (Gl. 25, 38).
 *
 * Hand-calc references in audit-reports/DWA-A-138-1/_eval-reference-Gl{N}.md.
 * Each equation gets: hand-calc reproduction. Unit-conflict + missing-input
 * fail-loud are tested as a representative sample (not exhaustively
 * per-equation) since the engine's guards are identical across arithmetic
 * profiles — the test surface is the per-profile expectedUnits map.
 *
 * Three-state contract always preserved.
 */
import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from '../formula';

// Equation IDs (from Step 0 DB query)
const IDS = {
  GL14: 'bfe6e59a-015f-4c95-b717-8599f80cb68a',
  GL15: '44fd56a8-b473-441a-be21-297d9f501226',
  GL19: '58c0c298-ca72-4bb6-ab05-0b298114523e',
  GL20: 'b8e74a4b-64cc-4b81-b306-b2e01e759f5e',
  GL22: '20c31318-7401-4f89-a27b-bc3cf8723548',
  GL23: '927aa5ab-3aa9-486e-a05d-f91847e8d31e',
  GL24: 'f17ba5d8-601e-4de1-8e59-d6b0a69e21a6',
  GL25: '86cdef5c-4199-4de6-ad0d-e2248b0834c9',
  GL26: '32b85bf3-7b59-4abe-ac98-62f4fb15007b',
  GL27: '150baf9a-0e7c-4a6c-9ce1-890ca7f491df',
  GL28: '570a63ed-08c4-4324-9ee7-0408816bba3f',
  GL29: 'bc11db1c-c935-40c7-87fb-6b35c6f1b1b0',
  GL30: '947db98f-6ad1-482c-ae15-e9d0963d1abe',
  GL31: '71af6131-12d3-4294-b192-256878ce7ecf',
  GL32: '904f2f36-9b62-4960-ba21-d77e6e0d89a4',
  GL33: '9357f6ea-65c6-4cad-a90e-17ec33461246',
  GL34: '059d3751-b942-41ec-bc7f-4f0343353eb6',
  GL35: 'bfaf30f2-26e6-4373-9642-23429805afa2',
  GL36: '36f70dae-ec78-4fc5-b5c9-83b138339ffa',
  GL37: 'aba53568-97f3-4054-b613-1b1413cb36fd',
  GL38: '19f36c1e-9b20-43cd-8b09-6040e81598c2',
  GL39: 'a3d078ba-3386-4feb-a302-ab22dc2d1fc8',
  GL40: '2c491f26-2b35-4dc6-8af0-c185173af0c6',
  GL41: '433f7700-90cb-410d-8103-7b72f53db8fa',
} as const;

const A_S_m = 68.823529411764706;
const S_R = 0.317166;

function req(
  id: string,
  formula: string,
  inputSymbols: string[],
  outputSymbol: string,
  inputs: EvalRequest['inputs'],
): EvalRequest {
  return { equationId: id, formula, inputSymbols, outputSymbol, inputs };
}

// =========================================================================
// Batch-2: Gl. 14, 15, 19, 20, 22, 23
// =========================================================================

describe('Gl. 14 — V_M Mulde required', () => {
  it('hand calc → 22.051 m³', () => {
    const r = evaluateFormula(
      req(
        IDS.GL14,
        'V_M = ((A_C + A_VA) * 10^-7 * r_D(n) - A_S_m * k_i) * D * 60 * f_Z',
        ['A_C', 'A_VA', 'r_D(n)', 'A_S_m', 'k_i', 'D', 'f_Z'],
        'V_M',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'A_VA', value: 50, unit: 'm²' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'A_S_m', value: A_S_m, unit: 'm²' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
          { symbol: 'D', value: 30, unit: 'min' },
          { symbol: 'f_Z', value: 1.2, unit: null },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(22.051, 2);
  });

  it('unit guard: A_VA in ha → manual_required', () => {
    const r = evaluateFormula(
      req(
        IDS.GL14,
        'V_M = ((A_C + A_VA) * 10^-7 * r_D(n) - A_S_m * k_i) * D * 60 * f_Z',
        ['A_C', 'A_VA', 'r_D(n)', 'A_S_m', 'k_i', 'D', 'f_Z'],
        'V_M',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'A_VA', value: 0.005, unit: 'ha' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'A_S_m', value: A_S_m, unit: 'm²' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
          { symbol: 'D', value: 30, unit: 'min' },
          { symbol: 'f_Z', value: 1.2, unit: null },
        ],
      ),
    );
    expect(r.kind).toBe('manual_required');
  });
});

describe('Gl. 15 — V_M geometric', () => {
  it('hand calc → 20.647 m³', () => {
    const r = evaluateFormula(
      req(IDS.GL15, 'V_M = A_S_m * h_M', ['A_S_m', 'h_M'], 'V_M', [
        { symbol: 'A_S_m', value: A_S_m, unit: 'm²' },
        { symbol: 'h_M', value: 0.3, unit: 'm' },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(20.647, 2);
  });
});

describe('Gl. 19 — V_R Rigole required', () => {
  it('hand calc → 25.812 m³', () => {
    const r = evaluateFormula(
      req(
        IDS.GL19,
        'V_R = (A_C * 10^-7 * r_D(n) - ((b_R + h_R) * L_R + b_R * h_R) * k_i - Q_Dr * 10^-3) * D * 60 * f_Z',
        ['A_C', 'r_D(n)', 'b_R', 'h_R', 'L_R', 'k_i', 'Q_Dr', 'D', 'f_Z'],
        'V_R',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'b_R', value: 1, unit: 'm' },
          { symbol: 'h_R', value: 1, unit: 'm' },
          { symbol: 'L_R', value: 10, unit: 'm' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
          { symbol: 'Q_Dr', value: 0, unit: 'l/s' },
          { symbol: 'D', value: 30, unit: 'min' },
          { symbol: 'f_Z', value: 1.2, unit: null },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(25.812, 2);
  });
});

describe('Gl. 20 — V_R geometric', () => {
  it('hand calc → 3.172 m³', () => {
    const r = evaluateFormula(
      req(
        IDS.GL20,
        'V_R = b_R * h_R * L_R * s_R',
        ['b_R', 'h_R', 'L_R', 's_R'],
        'V_R',
        [
          { symbol: 'b_R', value: 1, unit: 'm' },
          { symbol: 'h_R', value: 1, unit: 'm' },
          { symbol: 'L_R', value: 10, unit: 'm' },
          { symbol: 's_R', value: S_R, unit: null },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(3.172, 3);
  });
});

describe('Gl. 22 — s_R thin-wall', () => {
  it('hand calc → 0.318 613', () => {
    const r = evaluateFormula(
      req(
        IDS.GL22,
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
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(0.318613, 5);
  });
});

describe('Gl. 23 — L_R required', () => {
  it('hand calc → 52.464 m', () => {
    const r = evaluateFormula(
      req(
        IDS.GL23,
        'L_R = (A_C * 10^-7 * r_D(n) - b_R * h_R * k_i - Q_Dr * 10^-3) / (b_R * h_R * s_R / (D * 60 * f_Z) + (b_R + h_R) * k_i)',
        ['A_C', 'r_D(n)', 'b_R', 'h_R', 'k_i', 'Q_Dr', 's_R', 'D', 'f_Z'],
        'L_R',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'b_R', value: 1, unit: 'm' },
          { symbol: 'h_R', value: 1, unit: 'm' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
          { symbol: 'Q_Dr', value: 0, unit: 'l/s' },
          { symbol: 's_R', value: S_R, unit: null },
          { symbol: 'D', value: 30, unit: 'min' },
          { symbol: 'f_Z', value: 1.2, unit: null },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(52.464, 2);
  });
});

// =========================================================================
// Batch-3: Gl. 24, 25, 26-33, 34-40, 41
// =========================================================================

describe('Gl. 24 — q_VS', () => {
  it('hand calc → 0.100 l/(s·m)', () => {
    const r = evaluateFormula(
      req(
        IDS.GL24,
        'q_VS = 0.1 * az_SOE * A_SOE * 10^-1',
        ['az_SOE', 'A_SOE'],
        'q_VS',
        [
          { symbol: 'az_SOE', value: 10, unit: '1/m' },
          { symbol: 'A_SOE', value: 1, unit: 'cm²' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(0.1, 6);
  });
});

describe('Gl. 25 — ≥ condition (Vollsickerrohr-Leistung)', () => {
  it('hand calc: L_VS=400, slack = +10', () => {
    const r = evaluateFormula(
      req(
        IDS.GL25,
        'L_VS * q_VS >= r_5(n) * A_C * 10^-4',
        ['L_VS', 'q_VS', 'r_5(n)', 'A_C'],
        '(condition)',
        [
          { symbol: 'L_VS', value: 400, unit: 'm' },
          { symbol: 'q_VS', value: 0.1, unit: 'l/(s·m)' },
          { symbol: 'r_5_n', value: 300, unit: 'l/(s·ha)' },
          { symbol: 'A_C', value: 1000, unit: 'm²' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(10, 6);
    expect(r.substituted['L_VS · q_VS']).toBeCloseTo(40, 6);
    expect(r.substituted['r_5(n) · A_C · 10⁻⁴']).toBeCloseTo(30, 6);
  });

  it('negative: L_VS=200, slack = −10', () => {
    const r = evaluateFormula(
      req(
        IDS.GL25,
        'L_VS * q_VS >= r_5(n) * A_C * 10^-4',
        ['L_VS', 'q_VS', 'r_5(n)', 'A_C'],
        '(condition)',
        [
          { symbol: 'L_VS', value: 200, unit: 'm' },
          { symbol: 'q_VS', value: 0.1, unit: 'l/(s·m)' },
          { symbol: 'r_5_n', value: 300, unit: 'l/(s·ha)' },
          { symbol: 'A_C', value: 1000, unit: 'm²' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(-10, 6);
  });

  it('missing input → manual_required', () => {
    const r = evaluateFormula(
      req(IDS.GL25, 'L_VS * q_VS >= r_5(n) * A_C * 10^-4', ['L_VS', 'q_VS', 'r_5(n)', 'A_C'], '(condition)', [
        { symbol: 'L_VS', value: 400, unit: 'm' },
        { symbol: 'q_VS', value: 0.1, unit: 'l/(s·m)' },
      ]),
    );
    expect(r.kind).toBe('manual_required');
  });
});

describe('Gl. 26 — V_MR = V_M + V_R', () => {
  it('hand calc → 47.863 m³', () => {
    const r = evaluateFormula(
      req(IDS.GL26, 'V_MR = V_M + V_R', ['V_M', 'V_R'], 'V_MR', [
        { symbol: 'V_M', value: 22.051, unit: 'm³' },
        { symbol: 'V_R', value: 25.812, unit: 'm³' },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(47.863, 3);
  });
});

describe('Gl. 27 — V_R = V_MR − V_M', () => {
  it('hand calc → 25.812 m³', () => {
    const r = evaluateFormula(
      req(IDS.GL27, 'V_R = V_MR - V_M', ['V_MR', 'V_M'], 'V_R', [
        { symbol: 'V_MR', value: 47.863, unit: 'm³' },
        { symbol: 'V_M', value: 22.051, unit: 'm³' },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(25.812, 3);
  });
});

describe('Gl. 28 — V_MR required (MRE)', () => {
  it('hand calc → 27.216 m³', () => {
    const r = evaluateFormula(
      req(
        IDS.GL28,
        'V_MR = ((A_C + A_VA) * 10^-7 * r_D(n) - ((b_R + h_R) * L_R + b_R * h_R) * k_i) * D * 60 * f_Z',
        ['A_C', 'A_VA', 'r_D(n)', 'b_R', 'h_R', 'L_R', 'k_i', 'D', 'f_Z'],
        'V_MR',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'A_VA', value: 50, unit: 'm²' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'b_R', value: 1, unit: 'm' },
          { symbol: 'h_R', value: 1, unit: 'm' },
          { symbol: 'L_R', value: 10, unit: 'm' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
          { symbol: 'D', value: 30, unit: 'min' },
          { symbol: 'f_Z', value: 1.2, unit: null },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(27.216, 2);
  });
});

describe('Gl. 29 — L_R MRE required', () => {
  it('hand calc → 13.738 m', () => {
    const r = evaluateFormula(
      req(
        IDS.GL29,
        'L_R = ((A_C + A_VA) * 10^-7 * r_D(n) - b_R * h_R * k_i - V_M/(D * 60 * f_Z)) / (b_R * h_R * s_R / (D * 60 * f_Z) + (b_R + h_R) * k_i)',
        ['A_C', 'A_VA', 'r_D(n)', 'b_R', 'h_R', 'k_i', 'V_M', 's_R', 'D', 'f_Z'],
        'L_R',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'A_VA', value: 50, unit: 'm²' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'b_R', value: 1, unit: 'm' },
          { symbol: 'h_R', value: 1, unit: 'm' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
          { symbol: 'V_M', value: 22.051, unit: 'm³' },
          { symbol: 's_R', value: S_R, unit: null },
          { symbol: 'D', value: 30, unit: 'min' },
          { symbol: 'f_Z', value: 1.2, unit: null },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(13.738, 2);
  });
});

describe('Gl. 30 — V_MUE', () => {
  it('hand calc → 7.051 m³', () => {
    const r = evaluateFormula(
      req(
        IDS.GL30,
        'V_MUE = ((A_C + A_VA) * r_D(n_R) * 10^-7 - A_S_m * k_i) * D * 60 * f_Z - V_M',
        ['A_C', 'A_VA', 'r_D(n_R)', 'A_S_m', 'k_i', 'D', 'f_Z', 'V_M'],
        'V_MUE',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'A_VA', value: 50, unit: 'm²' },
          { symbol: 'r_D_n_R', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'A_S_m', value: A_S_m, unit: 'm²' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
          { symbol: 'D', value: 30, unit: 'min' },
          { symbol: 'f_Z', value: 1.2, unit: null },
          { symbol: 'V_M', value: 15, unit: 'm³' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(7.051, 2);
  });
});

describe('Gl. 31 — Q_MUE', () => {
  it('hand calc → 10.500 l/s', () => {
    const r = evaluateFormula(
      req(
        IDS.GL31,
        'Q_MUE = A_C * 10^-4 * r_MUE - A_VA * k_i * 1000',
        ['A_C', 'r_MUE', 'A_VA', 'k_i'],
        'Q_MUE',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'r_MUE', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'A_VA', value: 50, unit: 'm²' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(10.5, 3);
  });
});

describe('Gl. 32 — L_R MRS required (Q_Dr=0)', () => {
  it('hand calc → 13.738 m (matches Gl. 29 when Q_Dr=0)', () => {
    const r = evaluateFormula(
      req(
        IDS.GL32,
        'L_R = ((A_C + A_VA) * 10^-7 * r_D(n) - b_R * h_R * k_i - V_M/(D * 60 * f_Z) - Q_Dr * 10^-3) / (b_R * h_R * s_R / (D * 60 * f_Z) + (b_R + h_R) * k_i)',
        ['A_C', 'A_VA', 'r_D(n)', 'b_R', 'h_R', 'k_i', 'V_M', 'Q_Dr', 's_R', 'D', 'f_Z'],
        'L_R',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'A_VA', value: 50, unit: 'm²' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'b_R', value: 1, unit: 'm' },
          { symbol: 'h_R', value: 1, unit: 'm' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
          { symbol: 'V_M', value: 22.051, unit: 'm³' },
          { symbol: 'Q_Dr', value: 0, unit: 'l/s' },
          { symbol: 's_R', value: S_R, unit: null },
          { symbol: 'D', value: 30, unit: 'min' },
          { symbol: 'f_Z', value: 1.2, unit: null },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(13.738, 2);
  });
});

describe('Gl. 33 — Q_Dr mean', () => {
  it('hand calc: (2+8)/2 = 5', () => {
    const r = evaluateFormula(
      req(IDS.GL33, 'Q_Dr = (Q_Dr_min + Q_Dr_max) / 2', ['Q_Dr_min', 'Q_Dr_max'], 'Q_Dr', [
        { symbol: 'Q_Dr_min', value: 2, unit: 'l/s' },
        { symbol: 'Q_Dr_max', value: 8, unit: 'l/s' },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBe(5);
  });
});

describe('Gl. 34 — A_S Schacht', () => {
  it('hand calc: d_a=1, h_S=4.05 → 7.147 m²', () => {
    const r = evaluateFormula(
      req(IDS.GL34, 'A_S = pi * d_a^2 / 4 + pi * d_a * h_S / 2', ['d_a', 'h_S'], 'A_S', [
        { symbol: 'd_a', value: 1, unit: 'm' },
        { symbol: 'h_S', value: 4.05, unit: 'm' },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(7.147, 3);
  });
});

describe('Gl. 35 — V_S required', () => {
  it('hand calc → 2.036 m³', () => {
    const r = evaluateFormula(
      req(
        IDS.GL35,
        'V_S = (A_C * 10^-7 * r_D(n) - A_S * k_i) * D * 60 * f_Z',
        ['A_C', 'r_D(n)', 'A_S', 'k_i', 'D', 'f_Z'],
        'V_S',
        [
          { symbol: 'A_C', value: 100, unit: 'm²' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'A_S', value: 7.147, unit: 'm²' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
          { symbol: 'D', value: 30, unit: 'min' },
          { symbol: 'f_Z', value: 1.2, unit: null },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(2.036, 2);
  });
});

describe('Gl. 36 — V_S geometric', () => {
  it('hand calc: d_i=0.8, h_S=4.05 → 2.036 m³', () => {
    const r = evaluateFormula(
      req(IDS.GL36, 'V_S = pi * d_i^2 / 4 * h_S', ['d_i', 'h_S'], 'V_S', [
        { symbol: 'd_i', value: 0.8, unit: 'm' },
        { symbol: 'h_S', value: 4.05, unit: 'm' },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(2.036, 2);
  });
});

describe('Gl. 37 — h_S Schacht required', () => {
  it('hand calc → 4.050 m', () => {
    const r = evaluateFormula(
      req(
        IDS.GL37,
        'h_S = (A_C * 10^-7 * r_D(n) - (pi * d_a^2 / 4) * k_i) / (pi * d_i^2 / (4 * D * 60 * f_Z) + d_a * pi * k_i / 2)',
        ['A_C', 'r_D(n)', 'd_a', 'd_i', 'k_i', 'D', 'f_Z'],
        'h_S',
        [
          { symbol: 'A_C', value: 100, unit: 'm²' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'd_a', value: 1, unit: 'm' },
          { symbol: 'd_i', value: 0.8, unit: 'm' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
          { symbol: 'D', value: 30, unit: 'min' },
          { symbol: 'f_Z', value: 1.2, unit: null },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(4.05, 2);
  });
});

describe('Gl. 38 — ≥ condition Filterleistung', () => {
  it('hand calc: slack ≈ +1.45×10⁻⁴', () => {
    const r = evaluateFormula(
      req(
        IDS.GL38,
        'A_S_FS * k_f_FS >= A_S_Schacht * k_i',
        ['A_S_FS', 'k_f_FS', 'A_S_Schacht', 'k_i'],
        '(condition)',
        [
          { symbol: 'A_S_FS', value: 0.5027, unit: 'm²' },
          { symbol: 'k_f_FS', value: 1e-3, unit: 'm/s' },
          { symbol: 'A_S_Schacht', value: 7.147, unit: 'm²' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(1.453e-4, 6);
    expect(r.substituted['A_S,FS · k_f,FS']).toBeCloseTo(5.027e-4, 6);
    expect(r.substituted['A_S,Schacht · k_i']).toBeCloseTo(3.574e-4, 6);
  });
});

describe('Gl. 39 — erf_k_f_FS minimum', () => {
  it('hand calc → 7.109×10⁻⁴ m/s', () => {
    const r = evaluateFormula(
      req(
        IDS.GL39,
        'erf_k_f_FS >= ((d_a^2 + 2 * h_S * d_a) / d_i^2) * k_i',
        ['d_a', 'h_S', 'd_i', 'k_i'],
        'erf_k_f_FS',
        [
          { symbol: 'd_a', value: 1, unit: 'm' },
          { symbol: 'h_S', value: 4.05, unit: 'm' },
          { symbol: 'd_i', value: 0.8, unit: 'm' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(7.109e-4, 6);
  });
});

describe('Gl. 40 — h_S filter form', () => {
  it('hand calc → 3.425 m', () => {
    const r = evaluateFormula(
      req(
        IDS.GL40,
        'h_S = (A_C * 10^-7 * r_D(n) - (pi * d_i^2 / 4) * k_f_FS) * 4 * D * 60 * f_Z / (d_i^2 * pi)',
        ['A_C', 'r_D(n)', 'd_i', 'k_f_FS', 'D', 'f_Z'],
        'h_S',
        [
          { symbol: 'A_C', value: 100, unit: 'm²' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'd_i', value: 0.8, unit: 'm' },
          { symbol: 'k_f_FS', value: 1e-3, unit: 'm/s' },
          { symbol: 'D', value: 30, unit: 'min' },
          { symbol: 'f_Z', value: 1.2, unit: null },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(3.425, 2);
  });
});

describe('Gl. 41 — V_VA Becken', () => {
  it('hand calc → 22.051 m³ (with f_A=1.0)', () => {
    const r = evaluateFormula(
      req(
        IDS.GL41,
        'V_VA = ((A_C + A_VA) * 10^-7 * r_D(n) - A_S_m * k_i - Q_Dr * 10^-3) * D * 60 * f_Z * f_A',
        ['A_C', 'A_VA', 'r_D(n)', 'A_S_m', 'k_i', 'Q_Dr', 'D', 'f_Z', 'f_A'],
        'V_VA',
        [
          { symbol: 'A_C', value: 1000, unit: 'm²' },
          { symbol: 'A_VA', value: 50, unit: 'm²' },
          { symbol: 'r_D_n', value: 130, unit: 'l/(s·ha)' },
          { symbol: 'A_S_m', value: A_S_m, unit: 'm²' },
          { symbol: 'k_i', value: 5e-5, unit: 'm/s' },
          { symbol: 'Q_Dr', value: 0, unit: 'l/s' },
          { symbol: 'D', value: 30, unit: 'min' },
          { symbol: 'f_Z', value: 1.2, unit: null },
          { symbol: 'f_A', value: 1.0, unit: null },
        ],
      ),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(22.051, 2);
  });
});
