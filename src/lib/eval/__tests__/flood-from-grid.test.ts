/**
 * Integration tests for A138-26 Gl.10 with the 2D KOSTRA grid.
 *
 * Verifies:
 *  1. NATIVE 2D grid WITH a populated T_n=30 column → aggregator iterates
 *     the 30-column; V_Rück computed from the governing D; no typed r_D_30
 *     scalar required; governing D surfaced in substituted map.
 *  2. LEGACY carrier (status:'legacy') → falls back to the existing
 *     single-eval behaviour using the typed r_D_T_n_Ue + D scalars; no
 *     regression vs existing formula-Gl10 tests.
 *  3. MISSING 30-column in a native grid (status:'missing') → manual_required
 *     with appropriate cause message; aggregator NOT called with wrong column.
 *
 * These tests exercise the refactored a138_26_gl10 aggregator that routes
 * between the iterate-30-column path (ok) and the legacy fallback path
 * (legacy/missing gl10Scalars).
 */
import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from '../formula';
import type {
  FloodSubAreasCarrier,
  Gl10Scalars,
  AggregatorContext,
} from '../aggregators';
import {
  normalizeRainfallCarrier,
  resolveSelectedTable,
  resolveColumn,
} from '../rainfall-tables';

const GL10_ID = '8e3c7e22-e3c7-449a-b267-928332c89306';
const GL10_FORMULA =
  'V_Rück = ((r_D(T_n,Ü)·(Σ(A_E,b,a·C_S)+A_VA)/10000) − (Q_S+Q_Dr))·D·60/1000 − V_VA';

// ---------------------------------------------------------------------------
// Shared flood sub-areas carrier (paved areas with C_S)
//   AcS_paved = 5000·1.0 + 2000·0.8 = 6600
// ---------------------------------------------------------------------------
const FLOOD_CARRIER: FloodSubAreasCarrier = {
  rows: [
    { id: 'r1', label: 'Dach', kind: 'paved', area_m2: 5000, c_S: 1.0 },
    { id: 'r2', label: 'Hof', kind: 'paved', area_m2: 2000, c_S: 0.8 },
  ],
};

// AcS_paved = 6600, A_VA=50, combined = 6650
const FLOOD_SCALARS_LEGACY: Gl10Scalars = {
  A_VA: 50,
  Q_S: 5,
  Q_Dr: 0,
  D: 30,
  V_VA: 22.051,
  r_D_T_n_Ue: 130, // typed for legacy path
};

// ---------------------------------------------------------------------------
// 2D native grid with T_n=30 column
// ---------------------------------------------------------------------------
const NATIVE_GRID_RAW = {
  tables: [
    {
      id: 'grid1',
      name: 'KOSTRA-DWD-2020 Heinsberg',
      source: 'KOSTRA-DWD-2020',
      columns: [5, 10, 30, 100],
      rows: [
        { D_min: 5,   r: { '5': 370, '10': 450, '30': 300,  '100': 520 } },
        { D_min: 10,  r: { '5': 280, '10': 340, '30': 230,  '100': 395 } },
        { D_min: 30,  r: { '5': 170, '10': 205, '30': 130,  '100': 238 } },
        { D_min: 60,  r: { '5': 105, '10': 127, '30':  80,  '100': 147 } },
        { D_min: 120, r: { '5':  65, '10':  78, '30':  50,  '100':  90 } },
      ],
    },
  ],
};

// Hand-computed V_Rück per D for the native 30-column with AcS_paved=6600, A_VA=50,
// Q_S=5, Q_Dr=0, V_VA=22.051:
//   combined = AcS_paved + A_VA = 6650
//
//   D=5,   r_D=300: ((300*6650/10000)-5)*5*60/1000 - 22.051
//                  = (199.5-5)*0.3 - 22.051 = 58.35 - 22.051 = 36.299
//   D=10,  r_D=230: (152.95-5)*0.6 - 22.051 = 88.77 - 22.051 = 66.719
//   D=30,  r_D=130: (86.45-5)*1.8 - 22.051 = 146.61 - 22.051 = 124.559
//   D=60,  r_D=80:  (53.20-5)*3.6 - 22.051 = 173.52 - 22.051 = 151.469
//   D=120, r_D=50:  (33.25-5)*7.2 - 22.051 = 203.40 - 22.051 = 181.349  ← GOVERNING

// ---------------------------------------------------------------------------
// Helper: build EvalRequest for the aggregator with the new context shape
// ---------------------------------------------------------------------------
function makeFloodReq(
  ctx: AggregatorContext,
  gl10Scalars_override?: Partial<Gl10Scalars>,
): EvalRequest {
  const gl10 = gl10Scalars_override
    ? { ...ctx.gl10Scalars, ...gl10Scalars_override } as Gl10Scalars
    : ctx.gl10Scalars as Gl10Scalars;
  return {
    equationId: GL10_ID,
    formula: GL10_FORMULA,
    inputSymbols: ['r_D(T_n,Ü)', 'A_E,b,a', 'C_S', 'A_VA', 'Q_S', 'Q_Dr', 'D', 'V_VA'],
    outputSymbol: 'V_Rück',
    inputs: [],
    aggregator: {
      ...ctx,
      gl10Scalars: gl10,
    },
  };
}

// ---------------------------------------------------------------------------
// Test 1: NATIVE grid with populated 30-column → iterate; governing D surfaced
// ---------------------------------------------------------------------------
describe('A138-26 Gl.10 — native 2D grid 30-column path', () => {
  const normalized = normalizeRainfallCarrier(NATIVE_GRID_RAW);
  const table = resolveSelectedTable(normalized, 'grid1')!;
  const col30 = resolveColumn(table, 30);

  // Scalars without typed r_D_T_n_Ue (it's derived from the grid now)
  const scalarsNoR: Gl10Scalars = {
    A_VA: 50,
    Q_S: 5,
    Q_Dr: 0,
    D: null,           // not used in iterate path
    V_VA: 22.051,
    r_D_T_n_Ue: null,  // not typed; derived from grid
  };

  it('resolveColumn(grid, 30) is ok status', () => {
    expect(col30.status).toBe('ok');
  });

  it('iterates the 30-column → governing D=120, V_Rück≈181.349 m³', () => {
    expect(col30.status).toBe('ok');

    // AggregatorContext with the 30-column rows fed as kostraTable (the
    // refactored aggregator reads floodKostra30Col when status=ok)
    const ctx: AggregatorContext = {
      floodSubAreas: FLOOD_CARRIER,
      gl10Scalars: scalarsNoR,
      kostraUnit: 'l/(s·ha)',
      floodKostra30Col: col30.status === 'ok' ? { rows: col30.rows } : null,
    };

    const req = makeFloodReq(ctx);
    const result = evaluateFormula(req);

    expect(result.kind).toBe('computed');
    if (result.kind !== 'computed') return;

    // Governing D must be 120 (the duration that maximises V_Rück in the 30-column)
    expect(result.substituted['Maßgebende Dauerstufe D (min)']).toBe(120);

    // V_Rück = max(0, 181.349) = 181.349
    const expected_120 = ((50 * 6650) / 10000 - 5) * 120 * 60 / 1000 - 22.051;
    expect(result.value).toBeCloseTo(expected_120, 3);
    expect(result.value).toBeCloseTo(181.349, 1);

    // r_D_30 at governing D surfaced
    expect(result.substituted['r_D(30) @ maßgebende Dauerstufe (l/(s·ha))']).toBe(50);
  });

  it('all-negative 30-column → V_Rück = 0 (floored)', () => {
    expect(col30.status).toBe('ok');

    // Make a carrier with tiny catchment / huge drain → every D < 0
    const tinyCarrier: FloodSubAreasCarrier = {
      rows: [{ id: 'r1', label: 'tiny', kind: 'paved', area_m2: 10, c_S: 0.1 }],
    };
    const negScalars: Gl10Scalars = {
      A_VA: 1,
      Q_S: 999, // massive drain
      Q_Dr: 0,
      D: null,
      V_VA: 0,
      r_D_T_n_Ue: null,
    };

    const ctx: AggregatorContext = {
      floodSubAreas: tinyCarrier,
      gl10Scalars: negScalars,
      kostraUnit: 'l/(s·ha)',
      floodKostra30Col: col30.status === 'ok' ? { rows: col30.rows } : null,
    };

    const req = makeFloodReq(ctx);
    const result = evaluateFormula(req);

    expect(result.kind).toBe('computed');
    if (result.kind !== 'computed') return;
    // Floor applied: max(0, governing) = 0
    expect(result.value).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 2: LEGACY carrier → single-eval fallback (existing behaviour, no regression)
// ---------------------------------------------------------------------------
describe('A138-26 Gl.10 — legacy carrier fallback (single-eval, regression guard)', () => {
  // Legacy 1D carrier → resolveColumn → status:'legacy'
  const legacyRaw = {
    tables: [
      {
        id: 'hs01',
        name: 'PLT-HS-01',
        source: 'KOSTRA-DWD-2020',
        rows: [
          { D_min: 5,  r_D_n: 300 },
          { D_min: 30, r_D_n: 130 },
        ],
      },
    ],
  };
  const legNorm = normalizeRainfallCarrier(legacyRaw);
  const legTable = resolveSelectedTable(legNorm, 'hs01')!;
  const legCol = resolveColumn(legTable, 30);

  it('legacy resolveColumn → status legacy (back-compat)', () => {
    expect(legCol.status).toBe('legacy');
  });

  it('legacy path: no floodKostra30Col → uses scalar r_D_T_n_Ue + D', () => {
    // Legacy fallback: floodKostra30Col is null → aggregator uses typed r_D_T_n_Ue
    const ctx: AggregatorContext = {
      floodSubAreas: FLOOD_CARRIER,
      gl10Scalars: FLOOD_SCALARS_LEGACY,
      kostraUnit: 'l/(s·ha)',
      floodKostra30Col: null, // explicit null → legacy single-eval
    };

    const req = makeFloodReq(ctx);
    const result = evaluateFormula(req);

    expect(result.kind).toBe('computed');
    if (result.kind !== 'computed') return;

    // Legacy computes: D=30, r_D=130 typed scalar
    //   ((130*(6600+50)/10000) - 5)*30*60/1000 - 22.051
    //   = (86.45-5)*1.8 - 22.051 = 146.61 - 22.051 = 124.559
    // AcS_paved = 5000*1.0 + 2000*0.8 = 6600
    const expected = ((130 * (6600 + 50)) / 10000 - (5 + 0)) * 30 * 60 / 1000 - 22.051;
    expect(result.value).toBeCloseTo(expected, 4);
    expect(result.value).toBeCloseTo(124.559, 2);
  });

  it('legacy path: missing scalar r_D_T_n_Ue → manual_required (existing guard preserved)', () => {
    const ctx: AggregatorContext = {
      floodSubAreas: FLOOD_CARRIER,
      gl10Scalars: { ...FLOOD_SCALARS_LEGACY, r_D_T_n_Ue: null },
      kostraUnit: 'l/(s·ha)',
      floodKostra30Col: null,
    };

    const req = makeFloodReq(ctx);
    const result = evaluateFormula(req);
    expect(result.kind).toBe('manual_required');
    if (result.kind !== 'manual_required') return;
    expect(result.missing).toContain('r_D_T_n_Ue');
  });
});

// ---------------------------------------------------------------------------
// Test 3: missing 30-column in a native grid → manual_required (no wrong data)
// ---------------------------------------------------------------------------
describe('A138-26 Gl.10 — missing 30-column in native grid', () => {
  // A native grid but WITHOUT T_n=30 column → resolveColumn → status:'missing'
  const gridNo30Raw = {
    tables: [
      {
        id: 'g2',
        name: 'Grid no-30',
        source: 'KOSTRA-DWD-2020',
        columns: [5, 10],
        rows: [
          { D_min: 30, r: { '5': 170, '10': 205 } }, // no '30' key
        ],
      },
    ],
  };
  const norm2 = normalizeRainfallCarrier(gridNo30Raw);
  const table2 = resolveSelectedTable(norm2, 'g2')!;
  const col30_missing = resolveColumn(table2, 30);

  it('missing col → status missing', () => {
    expect(col30_missing.status).toBe('missing');
  });

  it('missing col → aggregator given floodKostra30Col=null with missingReason → manual_required', () => {
    // When the 30-column is missing, the wiring layer sets floodKostra30Col=null
    // AND passes a missingFlood30Reason. The aggregator surfaces manual_required.
    const ctx: AggregatorContext = {
      floodSubAreas: FLOOD_CARRIER,
      gl10Scalars: { ...FLOOD_SCALARS_LEGACY, r_D_T_n_Ue: null }, // no typed value either
      kostraUnit: 'l/(s·ha)',
      floodKostra30Col: null,
      missingFlood30Reason: 'Regenspende r_D für T_n = 30 a nicht in der Niederschlagstabelle erfasst',
    };

    const req = makeFloodReq(ctx);
    const result = evaluateFormula(req);

    expect(result.kind).toBe('manual_required');
    if (result.kind !== 'manual_required') return;
    expect(result.reason).toMatch(/T_n.*30|30.*T_n|Niederschlagstabelle/);
  });
});
