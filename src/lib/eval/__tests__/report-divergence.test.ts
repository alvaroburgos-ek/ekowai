/**
 * Two-project divergence test for the PDF report path.
 *
 * The integration-health sweep + the fixture-framing PR documented a
 * specific failure mode the report path must not have: a "filled
 * project" PDF that always shows the same number (e.g. V_VA = 18.684 m³)
 * regardless of which project's inputs were saved. The number being
 * fixed to the Heinsberg reference would mean the report was rendering
 * a hard-coded fixture rather than computing live from project
 * parameters.
 *
 * This test guards against that by running `evaluateWorksheetEquations`
 * — the function the PDF loader calls — on TWO different sets of
 * project inputs for the Gl. 8 V_VA aggregator. It asserts:
 *
 *   1. The two outputs DIFFER (no hard-coded fixture would change).
 *   2. Each output equals its own hand-computed value (the engine
 *      computes from the inputs it receives, not from a memorised
 *      constant).
 *
 * The hand calc for each project is reproduced inline so a future
 * regression that re-introduces a fixture short-cut (e.g. someone
 * returning a memoised result) breaks this test with a clear "the
 * computed value doesn't match the inputs" failure rather than a
 * silent always-Heinsberg PDF.
 *
 * Task 4 additions: parity tests verifying the server path (evaluate-for-report)
 * resolves the 2D grid by facilityReturnPeriod T_n — matching the client engine.
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateWorksheetEquations,
  type ReportField,
  type ReportEquation,
  type ReportParameter,
} from '../evaluate-for-report';

// Mirrors the runtime field shape A138-13 has in production.
const A138_13_FIELDS: ReportField[] = [
  { id: 'f-A_C', symbol: 'A_C', unit: 'm²', dataType: 'number' },
  { id: 'f-A_VA', symbol: 'A_VA', unit: 'm²', dataType: 'number' },
  { id: 'f-Q_S', symbol: 'Q_S', unit: 'l/s', dataType: 'number' },
  { id: 'f-Q_Dr', symbol: 'Q_Dr', unit: 'l/s', dataType: 'number' },
  { id: 'f-f_Z', symbol: 'f_Z', unit: null, dataType: 'number' },
  { id: 'f-f_A', symbol: 'f_A', unit: null, dataType: 'number' },
  { id: 'f-r_D_n_table', symbol: 'r_D_n_table', unit: 'l/(s·ha)', dataType: 'json' },
  { id: 'f-V_VA', symbol: 'V_VA', unit: 'm³', dataType: 'number' },
];

// Extended field set for Task 4 parity tests — adds n (inherited project
// frequency) so facilityReturnPeriod can resolve the T_n column.
const A138_13_FIELDS_WITH_N: ReportField[] = [
  ...A138_13_FIELDS,
  { id: 'f-n', symbol: 'n', unit: '1/a', dataType: 'number' },
];

const A138_13_GL8_EQUATIONS: ReportEquation[] = [
  {
    id: '69f31e6e-a755-4246-af10-ae46668b5c86', // production equation_id
    equationNumber: '8',
    formula: 'V_VA = (Q_zu - Q_S - Q_Dr) * D * 60 * f_Z * f_A * 10^-3',
    inputSymbols: ['Q_zu', 'Q_S', 'Q_Dr', 'D', 'f_Z', 'f_A'],
    outputSymbol: 'V_VA',
    outputUnit: 'm³',
  },
];

// === Project A — the Heinsberg-like reference fixture =========================
// Same inputs the _eval-reference-Gl8.md fixture uses. Per the fixture header
// added in the same PR as this test, the number 18.684 is the engine's output
// for THESE inputs — NOT a normative constant.
const PROJECT_A_PARAMS: ReportParameter[] = [
  { fieldId: 'f-A_C', valueNumber: 1000, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-A_VA', valueNumber: 50, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-Q_S', valueNumber: 5, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-Q_Dr', valueNumber: 0, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-f_Z', valueNumber: 1.2, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-f_A', valueNumber: 1.0, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  {
    fieldId: 'f-r_D_n_table',
    valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null,
    valueJson: {
      rows: [
        { id: '5', D_min: 5, r_D_n: 300 },
        { id: '10', D_min: 10, r_D_n: 230 },
        { id: '15', D_min: 15, r_D_n: 195 },
        { id: '30', D_min: 30, r_D_n: 130 }, // governs
        { id: '60', D_min: 60, r_D_n: 80 },
        { id: '120', D_min: 120, r_D_n: 50 },
      ],
    },
  },
];

// Hand calc for Project A (Heinsberg fixture), governing duration D = 30 min:
//   Q_zu = r_D · (A_C + A_VA) · 10⁻⁴ = 130 · 1050 · 10⁻⁴ = 13.65 l/s
//   net  = Q_zu − Q_S − Q_Dr           = 13.65 − 5 − 0    = 8.65 l/s
//   V_VA = net · D · 60 · f_Z · f_A · 10⁻³
//        = 8.65 · 30 · 60 · 1.2 · 1.0 · 10⁻³
//        = 18.684 m³
const PROJECT_A_EXPECTED_V_VA = 18.684;
const PROJECT_A_GOVERNING_D = 30;

// === Project B — a different real project with a different catchment ==========
// Larger catchment, lower throttle, different f_Z, fewer KOSTRA rows. The
// values are deliberately NOT near any other fixture in the codebase so a
// hard-coded fixture lookup would not accidentally return them.
const PROJECT_B_PARAMS: ReportParameter[] = [
  { fieldId: 'f-A_C', valueNumber: 2500, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-A_VA', valueNumber: 100, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-Q_S', valueNumber: 8, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-Q_Dr', valueNumber: 2, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-f_Z', valueNumber: 1.1, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-f_A', valueNumber: 1.0, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  {
    fieldId: 'f-r_D_n_table',
    valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null,
    valueJson: {
      rows: [
        { id: '10', D_min: 10, r_D_n: 180 },
        { id: '15', D_min: 15, r_D_n: 150 },
        { id: '20', D_min: 20, r_D_n: 130 }, // governs (see hand calc below)
      ],
    },
  },
];

// Hand calc per duration (Project B):
//   Symbols:  A_C+A_VA = 2600  ·  Q_S+Q_Dr = 10  ·  f_Z·f_A = 1.1  ·  10⁻³ tail
//   V(D)     = (r_D · 2600 · 10⁻⁴ − 10) · D · 60 · 1.1 · 10⁻³
//
//   D = 10 min  · r_D = 180  → Q_zu = 46.8 · net 36.8 · V = 36.8 · 10 · 60 · 1.1 · 10⁻³ = 24.288 m³
//   D = 15 min  · r_D = 150  → Q_zu = 39.0 · net 29.0 · V = 29.0 · 15 · 60 · 1.1 · 10⁻³ = 28.710 m³
//   D = 20 min  · r_D = 130  → Q_zu = 33.8 · net 23.8 · V = 23.8 · 20 · 60 · 1.1 · 10⁻³ = 31.416 m³  ← governing
//
// Independent enough from Project A (18.684 at D=30) that any fixture lookup
// would have to be implausibly specific to fake both.
const PROJECT_B_EXPECTED_V_VA = 31.416;
const PROJECT_B_GOVERNING_D = 20;

describe('PDF report path · evaluate-for-report computes from project inputs, not a fixture', () => {
  it('Project A (Heinsberg-like) → V_VA = 18.684 m³ at D = 30 min', () => {
    const results = evaluateWorksheetEquations(
      'A138-13',
      A138_13_GL8_EQUATIONS,
      A138_13_FIELDS,
      PROJECT_A_PARAMS,
    );
    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.state.kind).toBe('computed');
    if (r.state.kind !== 'computed') return;
    expect(r.state.value).toBeCloseTo(PROJECT_A_EXPECTED_V_VA, 3);
    expect(r.state.substituted['Maßgebende Dauerstufe D (min)']).toBe(PROJECT_A_GOVERNING_D);
  });

  it('Project B (different catchment) → V_VA = 31.416 m³ at D = 20 min', () => {
    const results = evaluateWorksheetEquations(
      'A138-13',
      A138_13_GL8_EQUATIONS,
      A138_13_FIELDS,
      PROJECT_B_PARAMS,
    );
    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.state.kind).toBe('computed');
    if (r.state.kind !== 'computed') return;
    expect(r.state.value).toBeCloseTo(PROJECT_B_EXPECTED_V_VA, 3);
    expect(r.state.substituted['Maßgebende Dauerstufe D (min)']).toBe(PROJECT_B_GOVERNING_D);
  });

  it('the two project outputs DIVERGE — proves the report computes live, not hard-coded', () => {
    // If a future refactor replaces the evaluator path with a memoised
    // fixture (or pulls V_VA from a snapshot in the DB by mistake), both
    // projects would return the same number and this test fails loud.
    const resA = evaluateWorksheetEquations(
      'A138-13',
      A138_13_GL8_EQUATIONS,
      A138_13_FIELDS,
      PROJECT_A_PARAMS,
    )[0];
    const resB = evaluateWorksheetEquations(
      'A138-13',
      A138_13_GL8_EQUATIONS,
      A138_13_FIELDS,
      PROJECT_B_PARAMS,
    )[0];
    if (resA.state.kind !== 'computed' || resB.state.kind !== 'computed') {
      throw new Error('Both projects must produce computed states');
    }
    expect(resA.state.value).not.toBeCloseTo(resB.state.value, 3);
    // Spread is large enough that any fixture-style mistake (returning the
    // Heinsberg number for both) would be obvious. 31.416 − 18.684 = 12.732 m³.
    expect(Math.abs(resA.state.value - resB.state.value)).toBeGreaterThan(10);
  });

  it('changing ONE input on Project A changes the output — sanity check the loop reads inputs', () => {
    // Take Project A, double f_Z, expect V_VA to scale linearly (×2 minus
    // proportional rounding). If the report short-cut returned the Heinsberg
    // value regardless of inputs, this test would fail.
    const tweakedParams = PROJECT_A_PARAMS.map((p) =>
      p.fieldId === 'f-f_Z' ? { ...p, valueNumber: 2.4 } : p,
    );
    const results = evaluateWorksheetEquations(
      'A138-13',
      A138_13_GL8_EQUATIONS,
      A138_13_FIELDS,
      tweakedParams,
    );
    const r = results[0];
    expect(r.state.kind).toBe('computed');
    if (r.state.kind !== 'computed') return;
    // V_VA scales linearly with f_Z because f_Z is a pure multiplier on the
    // outer expression. Doubling f_Z → doubling V_VA.
    expect(r.state.value).toBeCloseTo(PROJECT_A_EXPECTED_V_VA * 2, 3);
  });
});

// =============================================================================
// Task 4 parity tests — server path resolves the 2D grid by T_n
// =============================================================================
// The Heinsberg curve (PLT-HS-01) used as the T_n=5 column of a native 2D grid.
// n = 0.2 → T_n = 1/0.2 = 5 → snapped to 5 → column '5'.
const HEINSBERG_2D_KOSTRA_JSON = {
  tables: [
    {
      id: 'plt-hs-01',
      name: 'Heinsberg Rasterfeld',
      source: 'KOSTRA-DWD-2020',
      columns: [5, 10],
      rows: [
        { D_min: 5,   r: { '5': 300, '10': 380 } },
        { D_min: 10,  r: { '5': 230, '10': 290 } },
        { D_min: 15,  r: { '5': 195, '10': 245 } },
        { D_min: 30,  r: { '5': 130, '10': 165 } }, // T_n=5 governs at D=30
        { D_min: 60,  r: { '5': 80,  '10': 100 } },
        { D_min: 120, r: { '5': 50,  '10': 65  } },
      ],
    },
  ],
};

// Parameters for the 2D native grid test (n=0.2 → T_n=5).
const PARAMS_2D_NATIVE_TN5: ReportParameter[] = [
  { fieldId: 'f-n',         valueNumber: 0.2, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-A_C',       valueNumber: 1000, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-A_VA',      valueNumber: 50,   valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-Q_S',       valueNumber: 5,    valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-Q_Dr',      valueNumber: 0,    valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-f_Z',       valueNumber: 1.2,  valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-f_A',       valueNumber: 1.0,  valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  {
    fieldId: 'f-r_D_n_table',
    valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null,
    valueJson: HEINSBERG_2D_KOSTRA_JSON,
  },
];

// The same grid but only has T_n=10; facility needs T_n=5 → missing → manual_required.
const HEINSBERG_2D_ONLY_TN10_JSON = {
  tables: [
    {
      id: 'plt-hs-01',
      name: 'Heinsberg Rasterfeld',
      source: 'KOSTRA-DWD-2020',
      columns: [10],
      rows: [
        { D_min: 5,   r: { '10': 380 } },
        { D_min: 15,  r: { '10': 245 } },
        { D_min: 30,  r: { '10': 165 } },
      ],
    },
  ],
};

const PARAMS_2D_MISSING_TN5: ReportParameter[] = [
  { fieldId: 'f-n',         valueNumber: 0.2, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-A_C',       valueNumber: 1000, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-A_VA',      valueNumber: 50,   valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-Q_S',       valueNumber: 5,    valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-Q_Dr',      valueNumber: 0,    valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-f_Z',       valueNumber: 1.2,  valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  { fieldId: 'f-f_A',       valueNumber: 1.0,  valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  {
    fieldId: 'f-r_D_n_table',
    valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null,
    valueJson: HEINSBERG_2D_ONLY_TN10_JSON,
  },
];

// Legacy {rows} carrier + n=0.2 → should still compute 18.684 (back-compat).
const PARAMS_LEGACY_CARRIER_N02: ReportParameter[] = [
  { fieldId: 'f-n',         valueNumber: 0.2, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null },
  ...PROJECT_A_PARAMS.filter((p) => p.fieldId !== 'f-n'),
];

describe('Task 4 · server path (evaluate-for-report) · 2D grid parity with client', () => {
  it('native 2D carrier, T_n=5 column (n=0.2) → V_VA = 18.684 m³ at D=30 (parity with client)', () => {
    // Hand calc: T_n=5 column at D=30 has r_D_n=130, same Heinsberg curve.
    // n=0.2 → T_n=5 → resolveColumn picks the '5' column → same aggregator
    // path as before → V_VA = 18.684 (same as Project A using legacy carrier).
    const results = evaluateWorksheetEquations(
      'A138-13',
      A138_13_GL8_EQUATIONS,
      A138_13_FIELDS_WITH_N,
      PARAMS_2D_NATIVE_TN5,
    );
    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.state.kind).toBe('computed');
    if (r.state.kind !== 'computed') return;
    expect(r.state.value).toBeCloseTo(PROJECT_A_EXPECTED_V_VA, 3); // 18.684
    expect(r.state.substituted['Maßgebende Dauerstufe D (min)']).toBe(PROJECT_A_GOVERNING_D); // 30
  });

  it('native 2D grid, only T_n=10 present, facility needs T_n=5 → manual_required (withhold)', () => {
    // The grid has a T_n=10 column but the facility needs T_n=5 (n=0.2).
    // Server path must withhold — matching the client's missing-column guard.
    const results = evaluateWorksheetEquations(
      'A138-13',
      A138_13_GL8_EQUATIONS,
      A138_13_FIELDS_WITH_N,
      PARAMS_2D_MISSING_TN5,
    );
    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.state.kind).toBe('manual_required');
    if (r.state.kind !== 'manual_required') return;
    expect(r.state.reason).toContain('T_n = 5');
  });

  it('legacy {rows} carrier + n=0.2 → still computes 18.684 (back-compat, never withheld)', () => {
    // Legacy carriers (no real 2D columns) must serve the single curve for
    // ANY T_n. The server path must never withhold a legacy carrier.
    const results = evaluateWorksheetEquations(
      'A138-13',
      A138_13_GL8_EQUATIONS,
      A138_13_FIELDS_WITH_N,
      PARAMS_LEGACY_CARRIER_N02,
    );
    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.state.kind).toBe('computed');
    if (r.state.kind !== 'computed') return;
    expect(r.state.value).toBeCloseTo(PROJECT_A_EXPECTED_V_VA, 3);
  });
});
