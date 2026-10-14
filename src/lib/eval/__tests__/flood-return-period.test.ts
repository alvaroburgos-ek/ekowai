/**
 * F-A7 — A138-26 Gl. (10) flood proof must read the KOSTRA column of the
 * engineer's flood return period T_n_Ue, not a hard-wired T_n = 30 a.
 *
 * DWA-A 138-1 § 5.3.4.1 (print): "Bestehen die befestigten Flächen des
 * Grundstücks zum Beispiel um mehr als 70 % aus Dachflächen und nicht
 * überflutbaren Flächen, wie Innenhöfe, ist die Überflutungsprüfung nach
 * DIN 1986-100 für eine Wiederkehrzeit T_n = 100 Jahren nach Gl. (10) für
 * Regenspenden r_D(100) iterativ zu führen." — in der Regel T_n = 30 a.
 *
 * Live evidence (Hellenthal, A138-26, T_n_Ue = 100): the app computed
 * V_Rück = 31.6401 m³ (the T 30 value). Hand calculation, T 100 @ D = 10080:
 *   ((3.2 · (602.161 + 50) / 10000) − 0.0015) · 10080 · 60 / 1000 − 70.00375052159998
 *   = 0.20719152 · 604.8 − 70.00375052159998 = 55.305670…  m³
 * T 30 @ D = 10080:
 *   ((2.6 · 652.161 / 10000) − 0.0015) · 604.8 − 70.00375052159998 = 31.640…  m³
 *
 * Every verdict surface is covered: the shared resolver, the aggregator,
 * the report/PDF + server-recompute evaluator (evaluateWorksheetEquations)
 * and the snapshot/save payload (buildSnapshotPayload). The live form hook is
 * covered in src/components/worksheet/__tests__/engine-wiring-A138-26-flood-tn.test.tsx.
 */
import { describe, it, expect } from 'vitest';
import { normalizeRainfallCarrier, resolveSelectedTable } from '../rainfall-tables';
import { resolveFloodColumn, FLOOD_DEFAULT_T_N_UE } from '../flood-column';
import { evaluateWorksheetEquations } from '../evaluate-for-report';
import type { ReportField, ReportParameter, ReportEquation } from '../evaluate-for-report';
import { buildSnapshotPayload } from '@/lib/snapshots/payload';

const GL10_ID = '8e3c7e22-e3c7-449a-b267-928332c89306';
const GL10_FORMULA =
  'V_Rueck = ((r_D(T_n_Ue) * (SUM(A_E_b_a * C_S) + A_VA) / 10000) - (Q_S + Q_Dr)) * D * 60 / 1000 - V_VA';

const D = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 540, 720, 1080, 1440, 2880, 4320, 5760, 7200, 8640, 10080];
// KOSTRA-DWD-2020 cell 151093 (Hellenthal), l/(s·ha).
const T100 = [630, 413.3, 317.8, 261.7, 198.9, 150.4, 123.1, 92.6, 75.6, 56.7, 46.3, 34.7, 26, 21.2, 15.8, 12.9, 7.9, 5.9, 4.8, 4.1, 3.6, 3.2];
const T30 = [500, 328.3, 252.2, 208.3, 158.3, 119.6, 97.8, 73.7, 60.1, 45.1, 36.8, 27.5, 20.6, 16.8, 12.6, 10.3, 6.3, 4.7, 3.8, 3.3, 2.9, 2.6];

const GRID_30_100 = {
  tables: [{
    id: 'k151093',
    name: 'KOSTRA-DWD-2020 Zelle 151093',
    source: 'KOSTRA-DWD-2020',
    columns: [30, 100],
    rows: D.map((d, i) => ({ D_min: d, r: { '30': T30[i], '100': T100[i] } })),
  }],
};
const GRID_30_ONLY = {
  tables: [{
    id: 'k151093',
    name: 'KOSTRA-DWD-2020 Zelle 151093 (nur T 30)',
    source: 'KOSTRA-DWD-2020',
    columns: [30],
    rows: D.map((d, i) => ({ D_min: d, r: { '30': T30[i] } })),
  }],
};

const AcS = 602.161;
const A_VA = 50;
const Q_S = 0.0015;
const Q_Dr = 0;
const V_VA = 70.00375052159998;
const hand = (r: number, d: number) => ((r * (AcS + A_VA)) / 10000 - (Q_S + Q_Dr)) * d * 60 / 1000 - V_VA;
// Literal hand values (pinned, 1e-9): T 100 / T 30 @ D = 10080.
const EXPECT_T100 = 55.3056807744;
const EXPECT_T30 = 31.6400624064;

describe('hand values (sanity)', () => {
  it('T 100 @ D 10080 = 55.3056807744 m³, T 30 @ D 10080 = 31.6400624064 m³', () => {
    expect(hand(3.2, 10080)).toBeCloseTo(EXPECT_T100, 9);
    expect(hand(2.6, 10080)).toBeCloseTo(EXPECT_T30, 9);
  });
});

describe('resolveFloodColumn — flood column = T_n_Ue', () => {
  const table = resolveSelectedTable(normalizeRainfallCarrier(GRID_30_100), null)!;
  const only30 = resolveSelectedTable(normalizeRainfallCarrier(GRID_30_ONLY), null)!;

  it('T_n_Ue = 100 → the T 100 column', () => {
    const r = resolveFloodColumn(table, 100);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.T_n).toBe(100);
      expect(r.carrier.rows.find((x) => x.D_min === 10080)?.r_D_n).toBe(3.2);
    }
  });
  it('T_n_Ue = 30 → the T 30 column', () => {
    const r = resolveFloodColumn(table, 30);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.carrier.rows.find((x) => x.D_min === 10080)?.r_D_n).toBe(2.6);
  });
  it('T_n_Ue empty → default 30 (print: in der Regel T_n = 30 a)', () => {
    expect(FLOOD_DEFAULT_T_N_UE).toBe(30);
    const r = resolveFloodColumn(table, null);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.T_n).toBe(30);
      expect(r.carrier.rows.find((x) => x.D_min === 10080)?.r_D_n).toBe(2.6);
    }
  });
  it('T_n_Ue = 100 but grid lacks the 100 column → missing naming T_n = 100 (never falls back to 30)', () => {
    const r = resolveFloodColumn(only30, 100);
    expect(r.status).toBe('missing');
    if (r.status === 'missing') expect(r.reason).toMatch(/T_n = 100 a/);
  });
  it('T_n_Ue non-positive → missing (no silent default)', () => {
    expect(resolveFloodColumn(table, 0).status).toBe('missing');
    expect(resolveFloodColumn(table, -5).status).toBe('missing');
  });
  it('no table → none', () => {
    expect(resolveFloodColumn(null, 100).status).toBe('none');
  });
});

// ── Report / PDF / server-recompute evaluator ─────────────────────────────
function reportFixture(grid: unknown, T_n_Ue: number | null, legacy?: { r_D_30: number; D_min: number }) {
  const sym: Array<[string, string | null, string, number | null, unknown]> = [
    ['A_C_s_flood', 'm²', 'number', AcS, null],
    ['A_VA', 'm²', 'number', A_VA, null],
    ['Q_S', 'l/s', 'number', Q_S, null],
    ['Q_Dr', 'l/s', 'number', Q_Dr, null],
    ['V_VA', 'm³', 'number', V_VA, null],
    ['T_n_Ue', 'a', 'number', T_n_Ue, null],
    ['r_D_n_table', 'l/(s·ha)', 'json', null, grid],
    ['r_D_30', 'l/(s·ha)', 'number', legacy?.r_D_30 ?? null, null],
    ['D_min', 'min', 'number', legacy?.D_min ?? null, null],
    ['V_Rueck', 'm³', 'number', null, null],
  ];
  const fields: ReportField[] = sym.map(([s, unit, dataType]) => ({ id: `f-${s}`, symbol: s, unit, dataType }));
  const parameters: ReportParameter[] = sym
    .filter(([, , , n, j]) => n != null || j != null)
    .map(([s, , , n, j]) => ({
      fieldId: `f-${s}`, valueNumber: n, valueText: null, valueEnum: null,
      valueBoolean: null, valueDate: null, valueJson: j ?? null,
    }));
  const equations: ReportEquation[] = [{
    id: GL10_ID, equationNumber: '10', formula: GL10_FORMULA,
    inputSymbols: ['r_D(T_n_Ue)', 'A_E_b_a', 'C_S', 'A_VA', 'Q_S', 'Q_Dr', 'D', 'V_VA'],
    outputSymbol: 'V_Rueck', outputUnit: 'm³',
  }];
  return { fields, parameters, equations };
}

function reportGl10(grid: unknown, T_n_Ue: number | null, legacy?: { r_D_30: number; D_min: number }) {
  const { fields, parameters, equations } = reportFixture(grid, T_n_Ue, legacy);
  const res = evaluateWorksheetEquations('A138-26', equations, fields, parameters);
  return res.find((r) => r.equationId === GL10_ID)!.state;
}

describe('evaluateWorksheetEquations (report/PDF + recompute) — A138-26 Gl. 10 column', () => {
  it('T_n_Ue = 100 → V_Rück = 55.3057 m³ at D = 10080', () => {
    const s = reportGl10(GRID_30_100, 100);
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') {
      expect(s.value).toBeCloseTo(EXPECT_T100, 9);
      expect(s.substituted?.['Maßgebende Dauerstufe D (min)']).toBe(10080);
    }
  });
  it('T_n_Ue = 30 → unchanged 31.6401 m³', () => {
    const s = reportGl10(GRID_30_100, 30);
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') expect(s.value).toBeCloseTo(EXPECT_T30, 9);
  });
  it('T_n_Ue empty → T 30 column (31.6401 m³)', () => {
    const s = reportGl10(GRID_30_100, null);
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') expect(s.value).toBeCloseTo(EXPECT_T30, 9);
  });
  it('T_n_Ue = 100, grid without a 100 column → manual_required naming T_n = 100 a', () => {
    const s = reportGl10(GRID_30_ONLY, 100);
    expect(s.kind).toBe('manual_required');
    if (s.kind === 'manual_required') expect(s.reason).toMatch(/T_n = 100 a/);
  });
});

// ── Snapshot / save payload ───────────────────────────────────────────────
type FieldRow = Parameters<typeof buildSnapshotPayload>[0]['fields'][number];
type EquationRow = Parameters<typeof buildSnapshotPayload>[0]['equations'][number];
type ParameterRow = Parameters<typeof buildSnapshotPayload>[0]['parameters'][number];

function snapshotGl10(grid: unknown, T_n_Ue: number | null, legacy?: { r_D_30: number; D_min: number }) {
  const { fields, parameters } = reportFixture(grid, T_n_Ue, legacy);
  const fRows = fields.map((f) => ({
    id: f.id, worksheetTemplateId: 'tpl-a138-26', sectionId: null, labelDe: f.symbol, labelEn: null,
    unit: f.unit, isRequired: false, enumValues: null, validationRules: null, clauseReference: null,
    description: null, consumerWorksheets: null, orderIndex: 0, verificationStatus: 'imported_unverified',
    active: true, defaultValue: null, symbol: f.symbol, dataType: f.dataType,
  }) as unknown as FieldRow);
  const pRows = parameters.map((p) => ({
    id: `param-${p.fieldId}`, projectId: 'proj', fieldId: p.fieldId, sourceWorksheetInstanceId: null,
    valueNumber: p.valueNumber != null ? String(p.valueNumber) : null, valueText: null, valueEnum: null,
    valueDate: null, valueBoolean: null, valueJson: p.valueJson, sourceType: 'entered',
    citationSource: null, citationSources: [], enteredBy: 'u', enteredAt: new Date('2026-10-14'), isStale: false,
  }) as unknown as ParameterRow);
  const eRows = [{
    id: GL10_ID, worksheetTemplateId: 'tpl-a138-26', equationNumber: '10', formula: GL10_FORMULA,
    formulaLatex: null, inputSymbols: ['r_D(T_n_Ue)', 'A_E_b_a', 'C_S', 'A_VA', 'Q_S', 'Q_Dr', 'D', 'V_VA'],
    outputSymbol: 'V_Rueck', outputUnit: 'm³', clauseReference: null, description: null,
    verificationStatus: 'imported_unverified',
  } as unknown as EquationRow];
  const payload = buildSnapshotPayload({
    worksheetCode: 'A138-26', fields: fRows, equations: eRows, complianceRequirements: [], parameters: pRows,
  });
  return payload.equationOutputs['10'];
}

describe('buildSnapshotPayload (save/snapshot path) — A138-26 Gl. 10 column', () => {
  it('T_n_Ue = 100 → V_Rück = 55.3057 m³', () => {
    const s = snapshotGl10(GRID_30_100, 100);
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') expect(s.value).toBeCloseTo(EXPECT_T100, 9);
  });
  it('T_n_Ue = 30 → 31.6401 m³', () => {
    const s = snapshotGl10(GRID_30_100, 30);
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') expect(s.value).toBeCloseTo(EXPECT_T30, 9);
  });
  it('T_n_Ue empty → 31.6401 m³ (default 30)', () => {
    const s = snapshotGl10(GRID_30_100, null);
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') expect(s.value).toBeCloseTo(EXPECT_T30, 9);
  });
  it('T_n_Ue = 100 without a 100 column → manual_required', () => {
    const s = snapshotGl10(GRID_30_ONLY, 100);
    expect(s.kind).toBe('manual_required');
  });
});

// ── L-1 / L-2 (review round): T_n_Ue = 50 and legacy 1D tables ────────────
// SYNTHETIC test column: the '50' column below reuses the KOSTRA T 100 values
// purely as a probe (not a KOSTRA T 50 curve). Using it must give the T 100
// hand value; reading the 30 column instead would give 31.64….
const GRID_30_50 = {
  tables: [{
    id: 'k-synth-50',
    name: 'synthetic grid (30 + probe 50)',
    source: 'KOSTRA-DWD-2020',
    columns: [30, 50],
    rows: D.map((d, i) => ({ D_min: d, r: { '30': T30[i], '50': T100[i] } })),
  }],
};
// Legacy 1D carrier (design column only) — pre-F-A7 behaviour must hold for
// ANY T_n_Ue, including invalid values: the typed r_D_30 + D scalars decide.
const GRID_LEGACY = { rows: D.map((d, i) => ({ D_min: d, r_D_n: T30[i] })) };
const LEGACY_SCALARS = { r_D_30: 3.2, D_min: 10080 };

describe('resolveFloodColumn — T_n_Ue = 50 and legacy tables', () => {
  const t50 = resolveSelectedTable(normalizeRainfallCarrier(GRID_30_50), null)!;
  const t30_100 = resolveSelectedTable(normalizeRainfallCarrier(GRID_30_100), null)!;
  const legacy = resolveSelectedTable(normalizeRainfallCarrier(GRID_LEGACY), null)!;

  it('T_n_Ue = 50, column present → that column', () => {
    const r = resolveFloodColumn(t50, 50);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.T_n).toBe(50);
      expect(r.carrier.rows.find((x) => x.D_min === 10080)?.r_D_n).toBe(3.2);
    }
  });
  it('T_n_Ue = 50, column absent → missing naming T_n = 50 a', () => {
    const r = resolveFloodColumn(t30_100, 50);
    expect(r.status).toBe('missing');
    if (r.status === 'missing') expect(r.reason).toMatch(/T_n = 50 a/);
  });
  it('legacy table → legacy for T_n_Ue 100, 30, empty and invalid (0, −5, NaN)', () => {
    expect(legacy.legacyDesignColumn).toBe(true);
    for (const t of [100, 30, null, 0, -5, Number.NaN]) {
      expect(resolveFloodColumn(legacy, t).status).toBe('legacy');
    }
  });
});

describe('T_n_Ue = 50 on every server surface', () => {
  it('report evaluator: column present → 55.3056807744 m³', () => {
    const s = reportGl10(GRID_30_50, 50);
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') expect(s.value).toBeCloseTo(EXPECT_T100, 9);
  });
  it('report evaluator: column absent → manual_required naming T_n = 50 a', () => {
    const s = reportGl10(GRID_30_100, 50);
    expect(s.kind).toBe('manual_required');
    if (s.kind === 'manual_required') expect(s.reason).toMatch(/T_n = 50 a/);
  });
  it('snapshot payload: column present → 55.3056807744 m³; absent → manual_required', () => {
    const ok = snapshotGl10(GRID_30_50, 50);
    expect(ok.kind).toBe('computed');
    if (ok.kind === 'computed') expect(ok.value).toBeCloseTo(EXPECT_T100, 9);
    expect(snapshotGl10(GRID_30_100, 50).kind).toBe('manual_required');
  });
});

describe('legacy 1D table — unchanged typed-scalar path for any T_n_Ue', () => {
  // Typed r_D_30 = 3.2 @ D_min = 10080 → single eval = 55.3056807744 m³, as before F-A7.
  for (const t of [100, null, 0, Number.NaN]) {
    it(`report evaluator, T_n_Ue = ${t} → typed scalar result 55.3056807744 m³`, () => {
      const s = reportGl10(GRID_LEGACY, t, LEGACY_SCALARS);
      expect(s.kind).toBe('computed');
      if (s.kind === 'computed') expect(s.value).toBeCloseTo(EXPECT_T100, 9);
    });
    it(`snapshot payload, T_n_Ue = ${t} → typed scalar result 55.3056807744 m³`, () => {
      const s = snapshotGl10(GRID_LEGACY, t, LEGACY_SCALARS);
      expect(s.kind).toBe('computed');
      if (s.kind === 'computed') expect(s.value).toBeCloseTo(EXPECT_T100, 9);
    });
  }
});
