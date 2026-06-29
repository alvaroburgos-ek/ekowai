/**
 * Pure payload-builder for calculation snapshots. Lives in its own module
 * (separate from capture.ts, which imports `db` and is server-only) so unit
 * tests can exercise it without booting the env/db stack.
 *
 * Re-exported types are also imported by the diff utility (diff.ts).
 */

import { evaluateFormula, type EvalState } from '@/lib/eval/formula';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import { FORMULA_ENGINE_WHITELIST } from '@/lib/eval/whitelist';
import { normalizeSymbols } from '@/lib/eval/normalize-formula';
import { rewriteRules } from '@/lib/eval/rewrites';
import { equationProfiles } from '@/lib/eval/equation-profiles';
import { normalizeSurfaceCarrier } from '@/lib/eval/surface-inventory';
import {
  normalizeRainfallCarrier,
  resolveSelectedTable,
  resolveColumn,
  facilityReturnPeriod,
} from '@/lib/eval/rainfall-tables';
import type {
  SubAreasCarrier,
  KostraCarrier,
  Gl8Scalars,
  FloodSubAreasCarrier,
  Gl10Scalars,
} from '@/lib/eval/aggregators';
// Type-only schema imports — keeps this module free of any runtime `db`
// dependency so unit tests can call buildSnapshotPayload without env vars.
import type {
  fields as fieldsTable,
  equations as equationsTable,
  complianceRequirements as complianceRequirementsTable,
  projectParameters as projectParametersTable,
} from '@/lib/db/schema';

// Mirror the aggregator-id constants from use-equation-engine.ts.
// A138-07 surface-producer equation ids (A_C, C_m, A_E_ba, A_E_nba).
const A138_07_A_C_ID     = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';
const A138_07_C_M_ID     = 'a1380702-0000-4000-8000-000000000002';
const A138_07_A_E_BA_ID  = 'a1380702-0000-4000-8000-000000000003';
const A138_07_A_E_NBA_ID = 'a1380702-0000-4000-8000-000000000004';
const A138_07_SURFACE_IDS = new Set([
  A138_07_A_C_ID,
  A138_07_C_M_ID,
  A138_07_A_E_BA_ID,
  A138_07_A_E_NBA_ID,
]);

const A138_10_GL2_ID = '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3';
const A138_13_GL8_ID = '69f31e6e-a755-4246-af10-ae46668b5c86';
const A138_26_GL10_ID = '8e3c7e22-e3c7-449a-b267-928332c89306';

/** Stored JSONB shape — keep in lockstep with `calculation_snapshots` table comments. */
export type SnapshotParameterValue = {
  type: 'number' | 'text' | 'enum' | 'date' | 'boolean' | 'json';
  value: unknown;
  unit: string | null;
  citationSources: unknown;
};

export type SnapshotEquationOutput =
  | {
      kind: 'computed';
      value: number;
      formula: string;
      substituted: Record<string, number>;
    }
  | {
      kind: 'manual_required';
      manualRequiredReason: string;
      formula: string;
    }
  | {
      kind: 'error';
      manualRequiredReason: string;
      formula: string;
    }
  | {
      kind: 'skipped';
      manualRequiredReason: string;
      formula: string;
    };

export type SnapshotComplianceVerdict = 'pass' | 'fail' | 'open';

export type SnapshotPayload = {
  parameters: Record<string, SnapshotParameterValue>;
  equationOutputs: Record<string, SnapshotEquationOutput>;
  complianceResults: Record<string, SnapshotComplianceVerdict>;
};

export type SnapshotTrigger = 'submit_for_review' | 'approve' | 'manual';

// The schema module IS imported by tests, but only its type-level `$inferSelect`
// is referenced here — no runtime db import is forced.
export type FieldRow = typeof fieldsTable.$inferSelect;
export type EquationRow = typeof equationsTable.$inferSelect;
export type ComplianceRow = typeof complianceRequirementsTable.$inferSelect;
export type ParameterRow = typeof projectParametersTable.$inferSelect;

function readNumber(p: ParameterRow): number | null {
  if (p.valueNumber == null) return null;
  const n = Number(p.valueNumber);
  return Number.isFinite(n) ? n : null;
}

function readValue(
  p: ParameterRow,
  dataType: string,
): { type: SnapshotParameterValue['type']; value: unknown } | null {
  switch (dataType) {
    case 'number':
      return p.valueNumber == null
        ? null
        : { type: 'number', value: Number(p.valueNumber) };
    case 'text':
      return p.valueText == null ? null : { type: 'text', value: p.valueText };
    case 'enum':
      return p.valueEnum == null ? null : { type: 'enum', value: p.valueEnum };
    case 'date':
      return p.valueDate == null ? null : { type: 'date', value: p.valueDate };
    case 'boolean':
      return p.valueBoolean == null
        ? null
        : { type: 'boolean', value: p.valueBoolean };
    case 'json':
      return p.valueJson == null ? null : { type: 'json', value: p.valueJson };
    default:
      return null;
  }
}

function toSnapshotOutput(state: EvalState, formula: string): SnapshotEquationOutput {
  switch (state.kind) {
    case 'computed':
      return {
        kind: 'computed',
        value: state.value,
        formula: state.formulaEvaluated ?? formula,
        substituted: state.substituted ?? {},
      };
    case 'manual_required':
      return {
        kind: 'manual_required',
        manualRequiredReason: state.reason,
        formula,
      };
    case 'error':
      return {
        kind: 'error',
        manualRequiredReason: state.message,
        formula,
      };
  }
}

/**
 * Build the JSONB snapshot payload for one worksheet instance. Pure data
 * shaping — no DB calls.
 *
 * Strategy for equations:
 *   - Whitelisted equations are re-evaluated via `evaluateFormula`.
 *   - Aggregator-driven equations (Gl. 2 / Gl. 8) receive their JSON carriers
 *     (sub_areas / kostra table) from the matching field, mirroring how the
 *     client hook plumbs them.
 *   - Non-whitelisted equations are stored as `skipped` so the diff renderer
 *     can show "engine not wired" rather than missing the equation entirely.
 *
 * Strategy for compliance:
 *   - Every requirement is evaluated with the current parameter values.
 *   - `pending` (missing inputs) and `manual` (unparseable condition) are
 *     flattened to `open` so the diff shows a single "needs decision" state.
 */
export function buildSnapshotPayload(args: {
  fields: FieldRow[];
  equations: EquationRow[];
  complianceRequirements: ComplianceRow[];
  parameters: ParameterRow[];
  worksheetCode: string;
  /** Symbol → producing-worksheet-codes when an inherited symbol has >1
   *  producer. Mirrors the live hook's ambiguity guard so the snapshot
   *  doesn't silently pick a winner and label it `computed`. */
  ambiguousSymbols?: Map<string, string[]>;
}): SnapshotPayload {
  const { fields: fieldList, equations: equationList, complianceRequirements: crList } = args;
  const ambiguousSymbols = args.ambiguousSymbols ?? new Map<string, string[]>();
  const paramByFieldId = new Map(args.parameters.map((p) => [p.fieldId, p]));
  const fieldBySymbol = new Map(fieldList.map((f) => [f.symbol, f]));

  // ---- parameters ------------------------------------------------------
  const parameters: Record<string, SnapshotParameterValue> = {};
  for (const f of fieldList) {
    const p = paramByFieldId.get(f.id);
    if (!p) continue;
    const v = readValue(p, f.dataType);
    if (!v) continue;
    parameters[f.id] = {
      type: v.type,
      value: v.value,
      unit: f.unit,
      citationSources: p.citationSources ?? [],
    };
  }

  // ---- equation outputs -------------------------------------------------
  const numberBySymbol = (sym: string): number | null => {
    const f = fieldBySymbol.get(sym);
    if (!f) return null;
    const p = paramByFieldId.get(f.id);
    if (!p) return null;
    return readNumber(p);
  };

  // Carriers for aggregator-driven equations. The JSON value's shape is
  // checked at the aggregator boundary — if the carrier is malformed, the
  // aggregator reports manual_required and the snapshot captures that.
  // A138-07 surface carrier: drives the four surface-producer aggregators.
  // normalizeSurfaceCarrier never returns null — an empty/missing carrier
  // produces { rows: [] }, which causes the aggregator to return manual_required.
  const surfaceInventoryField = fieldList.find((f) => f.symbol === 'surface_inventory');
  const surfaceCarrier = (() => {
    if (!surfaceInventoryField) return normalizeSurfaceCarrier(null);
    const p = paramByFieldId.get(surfaceInventoryField.id);
    return normalizeSurfaceCarrier(p?.valueJson ?? null);
  })();

  const subAreasField = fieldList.find((f) => f.symbol.startsWith('sub_areas_'));
  const subAreasCarrier: SubAreasCarrier | null = (() => {
    if (!subAreasField) return null;
    const p = paramByFieldId.get(subAreasField.id);
    if (!p || p.valueJson == null) return { rows: [] };
    const raw = p.valueJson as { rows?: unknown };
    if (!raw || !Array.isArray(raw.rows)) return { rows: [] };
    return raw as SubAreasCarrier;
  })();

  // Multi-table rainfall carrier (Piece 2 → 2D grid): the facility's
  // `rainfall_table_ref` selects which table (id only); then resolveColumn
  // slices the 2D grid by the per-facility T_n (from facilityReturnPeriod).
  // On missing column → kostraSnapshotResolution carries the reason so the
  // A138-13 Gl.8 branch produces manual_required instead of calling the aggregator.
  const kostraField = fieldList.find((f) => f.symbol === 'r_D_n_table');
  const rainfallRefField = fieldList.find((f) => f.symbol === 'rainfall_table_ref');
  const rainfallTableRef = (() => {
    if (!rainfallRefField) return null;
    const p = paramByFieldId.get(rainfallRefField.id);
    const v = p?.valueText ?? p?.valueEnum ?? null;
    return typeof v === 'string' && v ? v : null;
  })();

  // Build a pickNumberBySymbol for facilityReturnPeriod (snapshot equivalent
  // of the client hook's closure over the React store values).
  const pickNumBySymbol = (sym: string): number | null => {
    const f = fieldBySymbol.get(sym);
    if (!f) return null;
    const p = paramByFieldId.get(f.id);
    if (!p) return null;
    return readNumber(p);
  };

  type KostraSnapshotResolution =
    | { status: 'ok' | 'legacy'; carrier: KostraCarrier }
    | { status: 'missing'; reason: string }
    | { status: 'none' };

  const kostraSnapshotResolution: KostraSnapshotResolution = (() => {
    if (!kostraField) return { status: 'none' };
    const p = paramByFieldId.get(kostraField.id);
    if (!p || p.valueJson == null) return { status: 'none' };
    const selected = resolveSelectedTable(normalizeRainfallCarrier(p.valueJson), rainfallTableRef);
    if (!selected) return { status: 'none' };

    // Per-facility T_n resolution — same logic as client + server paths.
    const T_n = facilityReturnPeriod(args.worksheetCode, pickNumBySymbol);
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
    kostraSnapshotResolution.status === 'ok' || kostraSnapshotResolution.status === 'legacy'
      ? kostraSnapshotResolution.carrier
      : null;

  // Flood sub-area carrier (A138-26 Gl.10).
  const floodSubAreasField = fieldList.find((f) => f.symbol === 'sub_areas_A138_26');
  const floodCarrier: FloodSubAreasCarrier | null = (() => {
    if (!floodSubAreasField) return null;
    const p = paramByFieldId.get(floodSubAreasField.id);
    if (!p || p.valueJson == null) return { rows: [] };
    const raw = p.valueJson as { rows?: unknown };
    if (!raw || !Array.isArray(raw.rows)) return { rows: [] };
    return raw as FloodSubAreasCarrier;
  })();

  // Task 5 — Flood 30-column resolution (snapshot path).
  // T_n=30 is FIXED for the flood case (§5.3.4), regardless of facility T_n.
  type FloodColSnapshotResolution =
    | { status: 'ok';      carrier: KostraCarrier }
    | { status: 'missing'; reason: string }
    | { status: 'legacy' | 'none' };

  const floodColResolution: FloodColSnapshotResolution = (() => {
    if (!kostraField) return { status: 'none' };
    const p = paramByFieldId.get(kostraField.id);
    if (!p || p.valueJson == null) return { status: 'none' };
    const selected = resolveSelectedTable(normalizeRainfallCarrier(p.valueJson), rainfallTableRef);
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

  const r_D_30_field_snap = fieldList.find((f) => f.symbol === 'r_D_30');

  // Gl.10 scalar resolution.
  const gl10Scalars: Gl10Scalars = {
    A_VA: numberBySymbol('A_VA'),
    Q_S: numberBySymbol('Q_S'),
    Q_Dr: numberBySymbol('Q_Dr'),
    D: numberBySymbol('D_min') ?? numberBySymbol('D'),
    V_VA: numberBySymbol('V_VA'),
    r_D_T_n_Ue: numberBySymbol('r_D_30'),
  };

  // Gl8 scalar resolution: null out any symbol with >1 producer so the
  // aggregator sees missing-input and produces manual_required instead of
  // silently picking one source.
  const gl8Pick = (sym: string): number | null => {
    const origins = ambiguousSymbols.get(sym);
    if (origins && origins.length > 1) return null;
    return numberBySymbol(sym);
  };
  const gl8Scalars: Gl8Scalars = {
    A_C: gl8Pick('A_C'),
    A_VA: gl8Pick('A_VA'),
    Q_S: gl8Pick('Q_S'),
    Q_Dr: gl8Pick('Q_Dr'),
    f_Z: gl8Pick('f_Z'),
    f_A: gl8Pick('f_A'),
  };

  const equationOutputs: Record<string, SnapshotEquationOutput> = {};
  for (const eq of equationList) {
    const key = `${args.worksheetCode}:${eq.equationNumber}`;
    if (!FORMULA_ENGINE_WHITELIST.has(key)) {
      equationOutputs[eq.equationNumber] = {
        kind: 'skipped',
        manualRequiredReason: 'Engine nicht für diese Gleichung verdrahtet',
        formula: eq.formula,
      };
      continue;
    }

    const rewrite = rewriteRules[eq.id];
    const profile = equationProfiles[eq.id];
    const neededSymbols = rewrite
      ? Object.values(rewrite.remap)
      : normalizeSymbols(eq.inputSymbols ?? []);

    const aliasFor = (sym: string): string =>
      profile?.symbolAliases?.[sym] ?? sym;

    // Ambiguity guard — parity with the live engine hook. When a consumed
    // symbol has >1 producing worksheet the snapshot must NOT silently pick
    // a winner. Emit manual_required with the symbol named, so the diff
    // viewer mirrors what the engineer saw on the form.
    const conflicts: Array<{ symbol: string; origins: string[] }> = [];
    for (const sym of neededSymbols) {
      const origins = ambiguousSymbols.get(aliasFor(sym));
      if (origins && origins.length > 1) {
        conflicts.push({ symbol: sym, origins });
      }
    }
    if (conflicts.length > 0) {
      const reason = conflicts
        .map((c) => `mehrdeutige Quelle für ${c.symbol} (${c.origins.join(', ')})`)
        .join(' · ');
      equationOutputs[eq.equationNumber] = toSnapshotOutput(
        { kind: 'manual_required', reason },
        eq.formula,
      );
      continue;
    }

    const evalInputs = neededSymbols.map((sym) => {
      const f = fieldBySymbol.get(aliasFor(sym));
      const p = f ? paramByFieldId.get(f.id) : undefined;
      const num = p ? readNumber(p) : null;
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
    // Matches the client hook's and server evaluator's kostraResolution guard.
    if (eq.id === A138_13_GL8_ID && kostraSnapshotResolution.status === 'missing') {
      equationOutputs[eq.equationNumber] = toSnapshotOutput(
        { kind: 'manual_required', reason: kostraSnapshotResolution.reason },
        eq.formula,
      );
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
        kostraUnit: r_D_30_field_snap?.unit ?? null,
        floodKostra30Col: flood30Carrier,
        missingFlood30Reason,
      };
    }

    const state: EvalState = evaluateFormula({
      equationId: eq.id,
      formula: eq.formula,
      inputSymbols: eq.inputSymbols ?? [],
      outputSymbol: eq.outputSymbol ?? '',
      expectedUnits,
      inputs: evalInputs,
      aggregator,
    });

    equationOutputs[eq.equationNumber] = toSnapshotOutput(state, eq.formula);
  }

  // ---- compliance --------------------------------------------------------
  const lookupForCompliance = (
    sym: string,
  ): number | string | boolean | null | undefined => {
    const f = fieldBySymbol.get(sym);
    if (!f) return undefined;
    const p = paramByFieldId.get(f.id);
    if (!p) return undefined;
    const v = readValue(p, f.dataType);
    if (!v) return undefined;
    // json values are not comparable in compliance conditions — treat as
    // "missing" so the verdict comes out as `open`, never silently `pass`.
    if (v.type === 'json') return undefined;
    return v.value as number | string | boolean | null;
  };

  const complianceResults: Record<string, SnapshotComplianceVerdict> = {};
  for (const req of crList) {
    const res = evaluateCondition(req.condition, lookupForCompliance);
    switch (res.kind) {
      case 'pass':
        complianceResults[req.id] = 'pass';
        break;
      case 'fail':
        complianceResults[req.id] = 'fail';
        break;
      case 'pending':
      case 'manual':
        complianceResults[req.id] = 'open';
        break;
    }
  }

  return { parameters, equationOutputs, complianceResults };
}
