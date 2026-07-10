/**
 * Server-side evaluator used by the PDF report-generation path.
 *
 * Mirrors the runtime form's `useEquationEngine` + `compliance-block`
 * logic but as pure functions that operate on already-loaded data
 * (no React, no zustand store, no DB calls). The same evaluator
 * primitives drive both paths: `evaluateFormula` (arithmetic engine +
 * aggregators) and `evaluateCondition` (compliance DSL parser).
 *
 * SCOPE: equation results for every equation (the engine routes all except
 * the manual deny-set, see `equation-manual-denylist`) and compliance results
 * for every compliance row, both keyed for the per-worksheet report renderer.
 */
import { evaluateFormula, type EvalState } from './formula';
import { evaluateCondition, type EvalResult } from '../compliance/evaluate';
import { equationProfiles } from './equation-profiles';
import { rewriteRules } from './rewrites';
import { normalizeSymbols } from './normalize-formula';
import { shouldEngineEvaluate } from './equation-manual-denylist';
import { normalizeSurfaceCarrier } from './surface-inventory';
import {
  normalizeRainfallCarrier,
  resolveSelectedTable,
  resolveColumn,
  facilityReturnPeriod,
} from './rainfall-tables';
import type {
  SubAreasCarrier,
  KostraCarrier,
  FloodSubAreasCarrier,
  Gl8Scalars,
  Gl10Scalars,
} from './aggregators';

// A138-07 surface-producer equation ids (A_C, C_m, A_E_ba, A_E_nba, A_C_sealed, A_C_unsealed).
const A138_07_A_C_ID    = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';
const A138_07_C_M_ID    = 'a1380702-0000-4000-8000-000000000002';
const A138_07_A_E_BA_ID = 'a1380702-0000-4000-8000-000000000003';
const A138_07_A_E_NBA_ID = 'a1380702-0000-4000-8000-000000000004';
const A138_07_A_C_SEALED_ID = 'a1380702-0000-4000-8000-000000000005';
const A138_07_A_C_UNSEALED_ID = 'a1380702-0000-4000-8000-000000000006';
const A138_07_SURFACE_IDS = new Set([
  A138_07_A_C_ID,
  A138_07_C_M_ID,
  A138_07_A_E_BA_ID,
  A138_07_A_E_NBA_ID,
  A138_07_A_C_SEALED_ID,
  A138_07_A_C_UNSEALED_ID,
]);

const A138_10_GL2_ID = '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3';
const A138_13_GL8_ID = '69f31e6e-a755-4246-af10-ae46668b5c86';
const A138_26_GL10_ID = '8e3c7e22-e3c7-449a-b267-928332c89306';

export type ReportField = {
  id: string;
  symbol: string;
  unit: string | null;
  dataType: string;
};

export type ReportParameter = {
  fieldId: string;
  valueNumber: number | null;
  valueText: string | null;
  valueEnum: string | null;
  valueBoolean: boolean | null;
  valueDate: string | null;
  valueJson: unknown | null;
};

export type ReportEquation = {
  id: string;
  equationNumber: string;
  formula: string;
  inputSymbols: string[] | null;
  outputSymbol: string | null;
  outputUnit: string | null;
};

export type ReportComplianceRow = {
  id: string;
  code: string;
  titleDe: string;
  condition: string;
  severity: string;
  description: string | null;
  requiresAttestation: boolean;
};

export type EquationReportResult = {
  equationId: string;
  equationNumber: string;
  worksheetCode: string;
  formula: string;
  outputSymbol: string | null;
  outputUnit: string | null;
  state: EvalState;
};

export type ComplianceReportResult = {
  code: string;
  worksheetCode: string;
  titleDe: string;
  condition: string;
  severity: string;
  description: string | null;
  requiresAttestation: boolean;
  result: EvalResult;
};

/** Build a symbol→typed-value map from a worksheet's fields + project parameters. */
function buildValueMap(
  fields: ReportField[],
  parameters: ReportParameter[],
): {
  numByField: Map<string, number | null>;
  fieldBySymbol: Map<string, ReportField>;
  bySymbol: Map<string, number | string | boolean | null>;
  jsonBySymbol: Map<string, unknown>;
} {
  const fieldById = new Map(fields.map((f) => [f.id, f]));
  const fieldBySymbol = new Map<string, ReportField>();
  for (const f of fields) fieldBySymbol.set(f.symbol, f);

  const numByField = new Map<string, number | null>();
  const bySymbol = new Map<string, number | string | boolean | null>();
  const jsonBySymbol = new Map<string, unknown>();

  for (const p of parameters) {
    const f = fieldById.get(p.fieldId);
    if (!f) continue;
    switch (f.dataType) {
      case 'number':
        numByField.set(p.fieldId, p.valueNumber);
        if (p.valueNumber != null) bySymbol.set(f.symbol, p.valueNumber);
        break;
      case 'text':
        if (p.valueText != null) bySymbol.set(f.symbol, p.valueText);
        break;
      case 'enum':
        if (p.valueEnum != null) bySymbol.set(f.symbol, p.valueEnum);
        break;
      case 'boolean':
        if (p.valueBoolean != null) bySymbol.set(f.symbol, p.valueBoolean);
        break;
      case 'date':
        if (p.valueDate != null) bySymbol.set(f.symbol, p.valueDate);
        break;
      case 'json':
        if (p.valueJson != null) jsonBySymbol.set(f.symbol, p.valueJson);
        break;
    }
  }
  return { numByField, fieldBySymbol, bySymbol, jsonBySymbol };
}

/**
 * Evaluate every whitelisted equation on a worksheet against the
 * loaded fields + project parameters. Returns per-equation results.
 */
export function evaluateWorksheetEquations(
  worksheetCode: string,
  equations: ReportEquation[],
  fields: ReportField[],
  parameters: ReportParameter[],
): EquationReportResult[] {
  const { numByField, fieldBySymbol, bySymbol, jsonBySymbol } = buildValueMap(fields, parameters);

  // Aggregator context — built once per worksheet, reused per equation.
  const subAreasJson = jsonBySymbol.get('sub_areas_A138_10') as { rows?: unknown } | undefined;
  const subAreasCarrier: SubAreasCarrier | null = subAreasJson && Array.isArray(subAreasJson.rows)
    ? (subAreasJson as SubAreasCarrier)
    : null;

  // Multi-table rainfall carrier (Piece 2 → 2D grid): the facility's
  // `rainfall_table_ref` selects which table (id only); then resolveColumn
  // slices the 2D grid by the per-facility T_n (from facilityReturnPeriod).
  // On missing column → kostraWithheld is set so the A138-13 Gl.8 branch
  // produces manual_required instead of feeding the aggregator.
  const kostraField = fieldBySymbol.get('r_D_n_table');
  const kostraRaw = jsonBySymbol.get('r_D_n_table');
  const rainfallRefRaw = bySymbol.get('rainfall_table_ref');
  const rainfallTableRef = typeof rainfallRefRaw === 'string' && rainfallRefRaw ? rainfallRefRaw : null;

  // Build a pickNumberBySymbol for facilityReturnPeriod (server equivalent of
  // the client hook's closure over the React store values).
  const pickNum = (sym: string): number | null => {
    const f = fieldBySymbol.get(sym);
    if (!f) return null;
    return numByField.get(f.id) ?? null;
  };
  const pickBool = (sym: string): boolean | null => {
    const f = fieldBySymbol.get(sym);
    if (!f) return null;
    // booleans aren't tracked in numByField; pull from parameters directly
    const p = parameters.find((x) => x.fieldId === f.id);
    return p?.valueBoolean ?? null;
  };

  type KostraServerResolution =
    | { status: 'ok' | 'legacy'; carrier: KostraCarrier }
    | { status: 'missing'; reason: string }
    | { status: 'none' };

  const kostraResolution: KostraServerResolution = (() => {
    if (kostraRaw == null) return { status: 'none' };
    const selected = resolveSelectedTable(normalizeRainfallCarrier(kostraRaw), rainfallTableRef);
    if (!selected) return { status: 'none' };

    // Per-facility T_n resolution — same logic as the client hook.
    const T_n = facilityReturnPeriod(worksheetCode, pickNum);
    const col = resolveColumn(selected, T_n);

    if (col.status === 'missing') {
      const reason = T_n !== null
        ? `Regenspende r_D für T_n = ${T_n} a nicht in der Niederschlagstabelle erfasst`
        : 'Bemessungshäufigkeit n nicht verfügbar — T_n kann nicht bestimmt werden';
      return { status: 'missing', reason };
    }

    // ok or legacy — feed rows to the unchanged KostraCarrier.
    return { status: col.status, carrier: { rows: col.rows } };
  })();

  const kostraCarrier: KostraCarrier | null =
    kostraResolution.status === 'ok' || kostraResolution.status === 'legacy'
      ? kostraResolution.carrier
      : null;

  const floodJson = jsonBySymbol.get('sub_areas_A138_26') as { rows?: unknown } | undefined;
  const floodCarrier: FloodSubAreasCarrier | null = floodJson && Array.isArray(floodJson.rows)
    ? (floodJson as FloodSubAreasCarrier)
    : null;

  // Task 5 — Flood 30-column resolution (server path).
  // Resolve T_n=30 from the same KOSTRA grid, FIXED at 30 regardless of the
  // facility's design T_n (§5.3.4: T_n_Ue = 30 a). Uses the same selected
  // table as the basin (same `rainfallTableRef`).
  type FloodColServerResolution =
    | { status: 'ok';      carrier: KostraCarrier }
    | { status: 'missing'; reason: string }
    | { status: 'legacy' | 'none' };

  const floodColResolution: FloodColServerResolution = (() => {
    if (kostraRaw == null) return { status: 'none' };
    const selected = resolveSelectedTable(normalizeRainfallCarrier(kostraRaw), rainfallTableRef);
    if (!selected) return { status: 'none' };
    const col30 = resolveColumn(selected, 30);
    if (col30.status === 'ok') {
      return { status: 'ok', carrier: { rows: col30.rows } };
    }
    if (col30.status === 'missing') {
      return {
        status: 'missing',
        reason: 'Regenspende r_D für T_n = 30 a nicht in der Niederschlagstabelle erfasst (Hochwassernachweis Gl. 10)',
      };
    }
    return { status: 'legacy' };
  })();

  // A138-07 surface carrier: drives the four surface-producer aggregators.
  const surfaceCarrier = normalizeSurfaceCarrier(jsonBySymbol.get('surface_inventory'));

  const r_D_30_field = fieldBySymbol.get('r_D_30');

  const gl8Scalars: Gl8Scalars = {
    A_C: pickNum('A_C'),
    A_VA: pickNum('A_VA'),
    Q_S: pickNum('Q_S'),
    Q_Dr: pickNum('Q_Dr'),
    f_Z: pickNum('f_Z'),
    f_A: pickNum('f_A'),
    V_Zisterne: pickNum('V_Zisterne'),
    zisterne_zwangsentleerung: pickBool('zisterne_zwangsentleerung'),
  };
  const gl10Scalars: Gl10Scalars = {
    A_VA: pickNum('A_VA'),
    Q_S: pickNum('Q_S'),
    Q_Dr: pickNum('Q_Dr'),
    D: pickNum('D_min') ?? pickNum('D'),
    V_VA: pickNum('V_VA'),
    r_D_T_n_Ue: pickNum('r_D_30'),
  };

  const out: EquationReportResult[] = [];
  for (const eq of equations) {
    // Engine generalization (Layer 0): evaluate every equation except the
    // manual deny-set, mirroring the client gate. The evaluator fail-safe
    // blanks anything it cannot faithfully compute.
    if (!shouldEngineEvaluate(worksheetCode, eq.equationNumber)) continue;

    const rewrite = rewriteRules[eq.id];
    const profile = equationProfiles[eq.id];
    const neededSymbols = rewrite
      ? Object.values(rewrite.remap)
      : normalizeSymbols(eq.inputSymbols ?? []);

    const aliasFor = (sym: string): string => profile?.symbolAliases?.[sym] ?? sym;

    const evalInputs = neededSymbols.map((sym) => {
      const f = fieldBySymbol.get(aliasFor(sym));
      const num = f ? (numByField.get(f.id) ?? null) : null;
      return { symbol: sym, value: num, unit: f?.unit ?? null };
    });

    const expectedUnits: Record<string, string | null> = {};
    for (const sym of neededSymbols) {
      const f = fieldBySymbol.get(aliasFor(sym));
      expectedUnits[sym] = f?.unit ?? null;
    }

    // Task 4 withhold: when the resolved 2D column is missing (T_n column not
    // populated in a native grid), emit manual_required for A138-13 Gl.8
    // BEFORE calling the aggregator — do NOT feed rows for a wrong/missing column.
    // Matches the client hook's kostraResolution.status === 'missing' guard.
    if (eq.id === A138_13_GL8_ID && kostraResolution.status === 'missing') {
      out.push({
        equationId: eq.id,
        equationNumber: eq.equationNumber,
        worksheetCode,
        formula: eq.formula,
        outputSymbol: eq.outputSymbol,
        outputUnit: eq.outputUnit,
        state: { kind: 'manual_required', reason: kostraResolution.reason },
      });
      continue;
    }

    let aggregator: Parameters<typeof evaluateFormula>[0]['aggregator'];
    if (A138_07_SURFACE_IDS.has(eq.id)) {
      aggregator = { surfaceInventory: surfaceCarrier };
    } else if (eq.id === A138_10_GL2_ID) {
      aggregator = subAreasCarrier ? { subAreas: subAreasCarrier } : undefined;
    } else if (eq.id === A138_13_GL8_ID) {
      aggregator = {
        kostraTable: kostraCarrier,
        gl8Scalars,
        kostraUnit: kostraField?.unit ?? null,
      };
    } else if (eq.id === A138_26_GL10_ID) {
      // Task 5: thread the flood 30-column resolution into the aggregator.
      const flood30Carrier =
        floodColResolution.status === 'ok' ? floodColResolution.carrier : null;
      const missingFlood30Reason =
        floodColResolution.status === 'missing' ? floodColResolution.reason : null;
      aggregator = {
        floodSubAreas: floodCarrier,
        gl10Scalars,
        kostraUnit: r_D_30_field?.unit ?? null,
        floodKostra30Col: flood30Carrier,
        missingFlood30Reason,
      };
    }

    const state = evaluateFormula({
      equationId: eq.id,
      formula: eq.formula,
      inputSymbols: eq.inputSymbols ?? [],
      outputSymbol: eq.outputSymbol ?? '',
      expectedUnits,
      inputs: evalInputs,
      aggregator,
    });

    // Task 2 (A138-10 auto-Q_zu): basin Gl.8 materialises governing D + r_D
    // as derived field values on A138-13 under the symbols A138-10 consumes.
    // Inject into the mutable lookup maps so subsequent equations and compliance
    // conditions evaluated for this worksheet can read r_D_n / D_min.
    // When manual_required / derivedExtras absent: clear (write null) so stale
    // values don't persist in the symbol map.
    if (eq.id === A138_13_GL8_ID) {
      const extras = state.kind === 'computed' ? state.derivedExtras : undefined;
      const rDnField = fieldBySymbol.get('r_D_n');
      if (rDnField) {
        const rDnVal = extras !== undefined ? extras.r_D_gov : null;
        numByField.set(rDnField.id, rDnVal);
        if (rDnVal !== null) bySymbol.set('r_D_n', rDnVal);
        else bySymbol.delete('r_D_n');
      }
      const dMinField = fieldBySymbol.get('D_min');
      if (dMinField) {
        const dMinVal = extras !== undefined ? extras.D_gov : null;
        numByField.set(dMinField.id, dMinVal);
        if (dMinVal !== null) bySymbol.set('D_min', dMinVal);
        else bySymbol.delete('D_min');
      }
    }

    out.push({
      equationId: eq.id,
      equationNumber: eq.equationNumber,
      worksheetCode,
      formula: eq.formula,
      outputSymbol: eq.outputSymbol,
      outputUnit: eq.outputUnit,
      state,
    });
  }
  return out;
}

/**
 * Evaluate every compliance condition on a worksheet against the loaded
 * project parameters + the engine's computed outputs (so a condition can
 * reference an engine-produced value like V_VA).
 */
export function evaluateWorksheetCompliance(
  worksheetCode: string,
  rows: ReportComplianceRow[],
  fields: ReportField[],
  parameters: ReportParameter[],
  engineResults: EquationReportResult[],
): ComplianceReportResult[] {
  const { bySymbol } = buildValueMap(fields, parameters);

  // Overlay computed engine outputs onto the symbol lookup so conditions
  // can read e.g. `V_VA` even when the engineer hasn't manually entered it.
  for (const r of engineResults) {
    if (r.state.kind === 'computed' && r.outputSymbol) {
      bySymbol.set(r.outputSymbol, r.state.value);
    }
  }

  const lookup = (sym: string) => bySymbol.get(sym) ?? undefined;

  return rows.map((row) => {
    const result = evaluateCondition(row.condition, lookup);
    return {
      code: row.code,
      worksheetCode,
      titleDe: row.titleDe,
      condition: row.condition,
      severity: row.severity,
      description: row.description,
      requiresAttestation: row.requiresAttestation,
      result,
    };
  });
}
