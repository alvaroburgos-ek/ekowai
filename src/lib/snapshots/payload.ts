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
import type {
  SubAreasCarrier,
  KostraCarrier,
  Gl8Scalars,
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
const A138_10_GL2_ID = '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3';
const A138_13_GL8_ID = '69f31e6e-a755-4246-af10-ae46668b5c86';

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
}): SnapshotPayload {
  const { fields: fieldList, equations: equationList, complianceRequirements: crList } = args;
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
  const subAreasField = fieldList.find((f) => f.symbol.startsWith('sub_areas_'));
  const subAreasCarrier: SubAreasCarrier | null = (() => {
    if (!subAreasField) return null;
    const p = paramByFieldId.get(subAreasField.id);
    if (!p || p.valueJson == null) return { rows: [] };
    const raw = p.valueJson as { rows?: unknown };
    if (!raw || !Array.isArray(raw.rows)) return { rows: [] };
    return raw as SubAreasCarrier;
  })();

  const kostraField = fieldList.find((f) => f.symbol === 'r_D_n_table');
  const kostraCarrier: KostraCarrier | null = (() => {
    if (!kostraField) return null;
    const p = paramByFieldId.get(kostraField.id);
    if (!p || p.valueJson == null) return { rows: [] };
    const raw = p.valueJson as { rows?: unknown };
    if (!raw || !Array.isArray(raw.rows)) return { rows: [] };
    return raw as KostraCarrier;
  })();

  const gl8Scalars: Gl8Scalars = {
    A_C: numberBySymbol('A_C'),
    A_VA: numberBySymbol('A_VA'),
    Q_S: numberBySymbol('Q_S'),
    Q_Dr: numberBySymbol('Q_Dr'),
    f_Z: numberBySymbol('f_Z'),
    f_A: numberBySymbol('f_A'),
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

    let aggregator: Parameters<typeof evaluateFormula>[0]['aggregator'];
    if (eq.id === A138_10_GL2_ID) {
      aggregator = subAreasCarrier ? { subAreas: subAreasCarrier } : undefined;
    } else if (eq.id === A138_13_GL8_ID) {
      aggregator = {
        kostraTable: kostraCarrier,
        gl8Scalars,
        kostraUnit: kostraField?.unit ?? null,
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
