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
  KostraCarrier,
  Gl8Scalars,
} from '@/lib/eval/aggregators';
import type { SurfaceInventoryCarrier } from '@/lib/eval/surface-types';
// Type-only schema imports — keeps this module free of any runtime `db`
// dependency so unit tests can call buildSnapshotPayload without env vars.
import type {
  fields as fieldsTable,
  equations as equationsTable,
  complianceRequirements as complianceRequirementsTable,
  projectParameters as projectParametersTable,
} from '@/lib/db/schema';

// Mirror the aggregator-id constants from use-equation-engine.ts.
const A138_07_GL2_PRELIM_ID = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';
// A138-10 A_C — recomputed from the inherited surface_inventory carrier
// (Pile-14, single-source). Aggregator keyed to the same shared body as
// A138-07's A_C_preliminary; NOT a passthrough of the A_C_preliminary scalar.
const A138_10_AC_ID = '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3';
const A138_10_SIGMA_SEALED_ID = 'd1a38110-0000-0000-0000-000000000001';
const A138_10_SIGMA_UNSEALED_ID = 'd1a38110-0000-0000-0000-000000000002';
const A138_10_C_M_ID = 'd1a38110-0000-0000-0000-000000000003';
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

/** One active documented deviation frozen into the approval snapshot. */
export type SnapshotDeviation = {
  id: string;
  requirementId: string;
  requirementCode: string;
  justification: string;
  basisCitations: unknown;
  authorityRef: string | null;
};

export type SnapshotPayload = {
  parameters: Record<string, SnapshotParameterValue>;
  equationOutputs: Record<string, SnapshotEquationOutput>;
  complianceResults: Record<string, SnapshotComplianceVerdict>;
  /** Active documented deviations at approval time. Only present on `approve`
   *  trigger snapshots. Undefined on submit/manual snapshots. */
  deviations?: SnapshotDeviation[];
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
  /** Active documented deviations to freeze into the payload. Only passed
   *  on `approve` trigger captures. */
  deviations?: SnapshotDeviation[];
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
  const surfaceInventoryField = fieldList.find((f) => f.symbol === 'surface_inventory');
  const surfaceInventoryCarrier: SurfaceInventoryCarrier | null = (() => {
    if (!surfaceInventoryField) return null;
    const p = paramByFieldId.get(surfaceInventoryField.id);
    if (!p || p.valueJson == null) return { rows: [] };
    const raw = p.valueJson as { rows?: unknown };
    if (!raw || !Array.isArray(raw.rows)) return { rows: [] };
    return raw as SurfaceInventoryCarrier;
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

    let aggregator: Parameters<typeof evaluateFormula>[0]['aggregator'];
    if (
      eq.id === A138_07_GL2_PRELIM_ID ||
      eq.id === A138_10_AC_ID ||
      eq.id === A138_10_SIGMA_SEALED_ID ||
      eq.id === A138_10_SIGMA_UNSEALED_ID ||
      eq.id === A138_10_C_M_ID
    ) {
      // A138-10's A_C (1a48af79) recomputes from the SAME inherited
      // surface_inventory carrier as A138-07's A_C_preliminary (Pile-14).
      aggregator = surfaceInventoryCarrier
        ? { surfaceInventory: surfaceInventoryCarrier }
        : undefined;
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
    // F2: existence checks (IS NOT NULL / IS NOT EMPTY) need to see the
    // symbol as present for json carriers; arithmetic against the
    // non-numeric sentinel still degrades to fail (toNumber returns null).
    // Same contract as compliance-block.tsx + approval-gate.ts +
    // evaluate-for-report.ts.
    if (v.type === 'json') return '__present__';
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

  const result: SnapshotPayload = { parameters, equationOutputs, complianceResults };
  if (args.deviations !== undefined) {
    result.deviations = args.deviations;
  }
  return result;
}
