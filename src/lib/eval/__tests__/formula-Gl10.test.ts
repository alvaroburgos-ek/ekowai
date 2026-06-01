/**
 * Gl. 10 (A138-26) — V_Rück flood-check (§5.3.4).
 *
 *   V_Rück = ((r_D(T_n,Ü) · (Σ(A_E,b,a · C_S) + A_VA) / 10000)
 *            − (Q_S + Q_Dr)) · D · 60 / 1000  −  V_VA   ≥ 0
 *
 * Hand-calc reference: audit-reports/DWA-A-138-1/_eval-reference-Gl10.md.
 *
 * Worst-case (large catchment, 30-min storm, C_S=1.0): V_Rück ≈ +87.119 m³
 * (positive → additional flood retention required).
 *
 * Smaller-storm safe case (5-min, smaller catchment): V_Rück ≈ −17.701 m³
 * (negative → V_VA already covers the flood event).
 *
 * Strict three-state: missing scalar / empty carrier / incomplete row / wrong
 * unit on r_D_30 all → manual_required (never silently zero or NaN).
 */
import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from '../formula';
import type {
  FloodSubAreasCarrier,
  Gl10Scalars,
} from '../aggregators';

const GL10_ID = '8e3c7e22-e3c7-449a-b267-928332c89306';

const GL10_FORMULA =
  'V_Rück = ((r_D(T_n,Ü)·(Σ(A_E,b,a·C_S)+A_VA)/10000) − (Q_S+Q_Dr))·D·60/1000 − V_VA';

function gl10Req(
  carrier: FloodSubAreasCarrier | null,
  scalars: Gl10Scalars,
  rD_unit: string | null = 'l/(s·ha)',
): EvalRequest {
  return {
    equationId: GL10_ID,
    formula: GL10_FORMULA,
    inputSymbols: ['r_D(T_n,Ü)', 'A_E,b,a', 'C_S', 'A_VA', 'Q_S', 'Q_Dr', 'D', 'V_VA'],
    outputSymbol: 'V_Rück',
    inputs: [],
    aggregator: {
      floodSubAreas: carrier,
      gl10Scalars: scalars,
      kostraUnit: rD_unit,
    },
  };
}

const WORST_CASE_SCALARS: Gl10Scalars = {
  A_VA: 50,
  Q_S: 5,
  Q_Dr: 0,
  D: 30,
  V_VA: 22.051,
  r_D_T_n_Ue: 130,
};

const WORST_CASE_CARRIER: FloodSubAreasCarrier = {
  rows: [
    {
      id: 'r1',
      label: 'paved 5000 m²',
      kind: 'paved',
      area_m2: 5000,
      c_S: 1.0,
    },
  ],
};

describe('Gl. 10 — V_Rück flood-check (A138-26)', () => {
  it('hand calc worst-case → +87.119 m³ (flood retention required)', () => {
    const r = evaluateFormula(gl10Req(WORST_CASE_CARRIER, WORST_CASE_SCALARS));
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    // Reproduce arithmetic exactly so rounding follows JS math:
    //   Σ = 5000·1.0 = 5000;  Σ + A_VA = 5050;  /10000 = 0.505
    //   r_D · 0.505 = 130·0.505 = 65.65 l/s
    //   net = 65.65 − 5 = 60.65 l/s
    //   ·D·60/1000 = 60.65·30·60/1000 = 109.17 m³
    //   V_Rück = 109.17 − 22.051 = 87.119 m³
    const expected =
      ((130 * (5000 * 1.0 + 50)) / 10000 - (5 + 0)) * 30 * 60 / 1000 - 22.051;
    expect(r.value).toBeCloseTo(expected, 6);
    expect(r.value).toBeCloseTo(87.119, 3);
    expect(r.substituted['Σ A_E,b,a · C_S (m²)']).toBeCloseTo(5000, 6);
    expect(r.substituted['Zufluss r_D·(Σ+A_VA)/10⁴ (l/s)']).toBeCloseTo(
      65.65,
      6,
    );
    expect(r.substituted['Flutvolumen (m³)']).toBeCloseTo(109.17, 3);
    expect(r.substituted['V_Rück = Volumen − V_VA (m³)']).toBeCloseTo(
      87.119,
      3,
    );
  });

  it('smaller-storm safe case → −17.701 m³ (V_VA covers flood)', () => {
    const safeCarrier: FloodSubAreasCarrier = {
      rows: [
        { id: 'r1', label: 'paved 600 m²', kind: 'paved', area_m2: 600, c_S: 1.0 },
      ],
    };
    const safeScalars: Gl10Scalars = {
      A_VA: 50,
      Q_S: 5,
      Q_Dr: 0,
      D: 5,
      V_VA: 22.051,
      r_D_T_n_Ue: 300,
    };
    const r = evaluateFormula(gl10Req(safeCarrier, safeScalars));
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    const expected =
      ((300 * (600 * 1.0 + 50)) / 10000 - (5 + 0)) * 5 * 60 / 1000 - 22.051;
    expect(r.value).toBeCloseTo(expected, 6);
    expect(r.value).toBeLessThan(0);
    expect(r.value).toBeCloseTo(-17.701, 3);
  });

  it('per-row contribution visible in substituted', () => {
    const r = evaluateFormula(gl10Req(WORST_CASE_CARRIER, WORST_CASE_SCALARS));
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.substituted['paved 5000 m² (5000 · C_S=1)']).toBeCloseTo(5000, 6);
  });

  it('design-event C must NOT silently substitute for C_S — separate carrier required', () => {
    // Engineer passes empty flood carrier (the design-event sub_areas_A138_10
    // is NOT visible to this aggregator at all). Result must be manual_required,
    // never a silent fall-through that uses C from the design event.
    const r = evaluateFormula(gl10Req({ rows: [] }, WORST_CASE_SCALARS));
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.reason).toMatch(/Flut-Teilflächen|C_S/);
  });

  describe('fail-loud rules', () => {
    it('missing scalar V_VA → manual_required naming it', () => {
      const scalars: Gl10Scalars = { ...WORST_CASE_SCALARS, V_VA: null };
      const r = evaluateFormula(gl10Req(WORST_CASE_CARRIER, scalars));
      expect(r.kind).toBe('manual_required');
      if (r.kind !== 'manual_required') return;
      expect(r.missing).toContain('V_VA');
      expect(r.reason).toMatch(/V_VA/);
    });

    it('missing scalar r_D_T_n_Ue → manual_required naming it', () => {
      const scalars: Gl10Scalars = { ...WORST_CASE_SCALARS, r_D_T_n_Ue: null };
      const r = evaluateFormula(gl10Req(WORST_CASE_CARRIER, scalars));
      expect(r.kind).toBe('manual_required');
      if (r.kind !== 'manual_required') return;
      expect(r.missing).toContain('r_D_T_n_Ue');
    });

    it('null carrier → manual_required', () => {
      const r = evaluateFormula(gl10Req(null, WORST_CASE_SCALARS));
      expect(r.kind).toBe('manual_required');
      if (r.kind !== 'manual_required') return;
      expect(r.reason).toMatch(/Flut-Teilflächen|C_S/);
    });

    it('empty carrier (0 rows) → manual_required', () => {
      const r = evaluateFormula(gl10Req({ rows: [] }, WORST_CASE_SCALARS));
      expect(r.kind).toBe('manual_required');
      if (r.kind !== 'manual_required') return;
      expect(r.reason).toMatch(/Flut-Teilflächen|C_S/);
    });

    it('incomplete row (area null) → manual_required naming the row', () => {
      const carrier: FloodSubAreasCarrier = {
        rows: [
          {
            id: 'r1',
            label: 'unbekannte Fläche',
            kind: 'paved',
            area_m2: null,
            c_S: 1.0,
          },
        ],
      };
      const r = evaluateFormula(gl10Req(carrier, WORST_CASE_SCALARS));
      expect(r.kind).toBe('manual_required');
      if (r.kind !== 'manual_required') return;
      expect(r.reason).toMatch(/unbekannte Fläche|Unvollständige Flut-Zeilen/);
    });

    it('incomplete row (C_S null) → manual_required naming the row', () => {
      const carrier: FloodSubAreasCarrier = {
        rows: [
          {
            id: 'r1',
            label: 'kein C_S',
            kind: 'paved',
            area_m2: 5000,
            c_S: null,
          },
        ],
      };
      const r = evaluateFormula(gl10Req(carrier, WORST_CASE_SCALARS));
      expect(r.kind).toBe('manual_required');
      if (r.kind !== 'manual_required') return;
      expect(r.reason).toMatch(/kein C_S|Unvollständige Flut-Zeilen/);
    });

    it('wrong unit on r_D_30 (mm/h) → manual_required with unit conflict', () => {
      const r = evaluateFormula(
        gl10Req(WORST_CASE_CARRIER, WORST_CASE_SCALARS, 'mm/h'),
      );
      expect(r.kind).toBe('manual_required');
      if (r.kind !== 'manual_required') return;
      expect(r.unitConflicts?.[0]).toEqual({
        symbol: 'r_D(T_n,Ü)',
        expected: 'l/(s·ha)',
        actual: 'mm/h',
      });
    });

    it('null unit on r_D_30 → allowed (engineer hasn\'t labeled it, value still trusted)', () => {
      // null/empty unit is treated as "no engineer-asserted unit" — the
      // aggregator does NOT block on this. The engineer is responsible for
      // labelling. This mirrors Gl. 8 (KOSTRA) behaviour.
      const r = evaluateFormula(
        gl10Req(WORST_CASE_CARRIER, WORST_CASE_SCALARS, null),
      );
      expect(r.kind).toBe('computed');
    });
  });

  it('multi-row carrier → sums per-row contributions', () => {
    const carrier: FloodSubAreasCarrier = {
      rows: [
        { id: 'r1', label: 'Dach', kind: 'paved', area_m2: 3000, c_S: 1.0 },
        { id: 'r2', label: 'Hof', kind: 'paved', area_m2: 2000, c_S: 1.0 },
      ],
    };
    const r = evaluateFormula(gl10Req(carrier, WORST_CASE_SCALARS));
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    // Same total Σ = 5000, so V_Rück matches worst-case.
    expect(r.value).toBeCloseTo(87.119, 3);
    expect(r.substituted['Σ A_E,b,a · C_S (m²)']).toBeCloseTo(5000, 6);
    expect(r.substituted['Dach (3000 · C_S=1)']).toBeCloseTo(3000, 6);
    expect(r.substituted['Hof (2000 · C_S=1)']).toBeCloseTo(2000, 6);
  });

  it('mixed-completeness multi-row → manual_required naming the bad row', () => {
    const carrier: FloodSubAreasCarrier = {
      rows: [
        { id: 'r1', label: 'Dach', kind: 'paved', area_m2: 3000, c_S: 1.0 },
        { id: 'r2', label: 'Hof unbekannt', kind: 'paved', area_m2: 2000, c_S: null },
      ],
    };
    const r = evaluateFormula(gl10Req(carrier, WORST_CASE_SCALARS));
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.reason).toMatch(/Hof unbekannt/);
  });
});
