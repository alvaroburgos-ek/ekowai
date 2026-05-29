/**
 * Formula evaluator for DB-driven equation rows.
 *
 * Built alongside (not replacing) the naive sum-evaluator in worksheet-form.tsx,
 * which exists for DIN-276 cost roll-ups and ignores `equations.formula`.
 *
 * This evaluator reads the formula string and evaluates it with mathjs against
 * resolved per-symbol values. It must return exactly one of three states:
 *
 *   - 'computed'        : value + the substituted inputs, ready to persist
 *   - 'manual_required' : the equation cannot be faithfully evaluated
 *                         (missing input, unit conflict, or a rewrite is
 *                         registered but the rewrite's inputs are also missing)
 *   - 'error'           : malformed formula or mathjs threw
 *
 * It NEVER returns a bare number that hides a problem. A `manual_required` or
 * `error` state surfaces in the UI as a "rechnerisch nicht bestätigt — manuell
 * prüfen" badge, not as a computed-looking value.
 */
// Small in-tree arithmetic expression evaluator. Avoids the Turbopack-vs-
// mathjs/expr-eval browser-bundle friction and keeps the engine's behavior
// fully auditable in this repo. Function calls (e.g. SUM(...)) throw —
// such formulas need a rewrite rule OR a registered aggregator.
import { evalExpression } from './arithmetic';
import { rewriteRules } from './rewrites';
import { aggregators, type AggregatorContext } from './aggregators';
import { equationProfiles } from './equation-profiles';

export type EvalInputValue = {
  /** the symbol the formula is expecting (already remapped if a rewrite applies) */
  symbol: string;
  value: number | null;
  /** unit as stored on the wizard field; null/undefined when the symbol is dimensionless */
  unit: string | null;
};

export type UnitConflict = {
  symbol: string;
  expected: string;
  actual: string;
};

export type Rewrite = {
  from: string;
  to: string;
  remap: Record<string, string>;
  reason: string;
};

export type EvalState =
  | {
      kind: 'computed';
      value: number;
      /** the values used as inputs, by symbol-after-rewrite */
      substituted: Record<string, number>;
      /** the formula RHS actually fed to mathjs (after rewrite + LHS stripping) */
      formulaEvaluated: string;
      /** present when a rewrite was applied */
      rewrite?: Rewrite;
    }
  | {
      kind: 'manual_required';
      reason: string;
      missing?: string[];
      unitConflicts?: UnitConflict[];
      /** if a rewrite was registered but couldn't be applied, surface it */
      rewrite?: Rewrite;
    }
  | {
      kind: 'error';
      message: string;
    };

export type EvalRequest = {
  equationId: string;
  formula: string;
  inputSymbols: string[];
  outputSymbol: string;
  /** expected unit per input symbol — drawn from fields.unit at the call site.
   * keys are the post-rewrite symbol names (the names that appear in the RHS
   * actually evaluated). */
  expectedUnits?: Record<string, string | null>;
  /** resolved values, keyed by the post-rewrite symbol name. Only relevant
   * for the arithmetic path; the aggregator path reads `aggregator`. */
  inputs: EvalInputValue[];
  /** Carrier data for the aggregator path. When the registered aggregator
   * for this equationId needs structured input (e.g. a sub-area array), the
   * caller passes it here. */
  aggregator?: AggregatorContext;
};

/** Strip the LHS `OUT =` if present so mathjs sees only the RHS expression. */
function rhs(formula: string): string {
  // collapse newlines to spaces so a single-line regex covers multi-line input
  const flat = formula.replace(/\s+/g, ' ');
  const m = flat.match(/^\s*[A-Za-z_][\w()]*\s*=\s*(.+)\s*$/);
  return (m ? m[1] : flat).trim();
}

/**
 * mathjs default builtin `sum(a, b, ...)` accepts a variadic numeric list. If
 * the formula contains a `SUM(...)` token over array-typed symbols that don't
 * exist (e.g. `SUM(A_E_b_a_i * C_i)`), there are no numeric arrays in scope
 * and mathjs will throw — which is what we want: it makes the engine fail
 * loud unless a rewrite is registered.
 */
export function evaluateFormula(req: EvalRequest): EvalState {
  // 0. Aggregator path — if a structured aggregator is registered for this
  // equation id, it handles the whole evaluation. The arithmetic path below
  // is bypassed entirely because the source formula uses array-over-i
  // notation that can only be evaluated against carrier data.
  const aggregator = aggregators[req.equationId];
  if (aggregator) {
    return aggregator.run(req);
  }

  // 1. Apply rewrite if registered for this equation id.
  const rewrite = rewriteRules[req.equationId];
  const formulaInUse = rewrite ? rewrite.to : req.formula;
  const symbolsNeeded = rewrite
    ? Object.values(rewrite.remap)
    : req.inputSymbols;

  // The equation profile holds source-context expected units and any
  // numeric constants the formula refers to by name (e.g. `pi`). It is the
  // authoritative source of truth for what units the equation expects —
  // the caller's expectedUnits (drawn from `fields.unit`) only applies
  // when no profile is registered.
  const profile = equationProfiles[req.equationId];

  // 2. Resolve each needed symbol from the supplied inputs.
  const substituted: Record<string, number> = {};
  const missing: string[] = [];
  const unitConflicts: UnitConflict[] = [];
  const valueBySymbol = new Map(req.inputs.map((i) => [i.symbol, i]));

  for (const sym of symbolsNeeded) {
    const found = valueBySymbol.get(sym);
    if (!found || found.value === null || !Number.isFinite(found.value)) {
      missing.push(sym);
      continue;
    }
    // Profile expected unit wins over caller-supplied expected unit. This
    // lets the engine catch a drift between a field's stored unit and the
    // equation's dimensional expectations (e.g. d_i stored as 'mm' on a
    // field when §6.4.2 specifies 'm').
    const expected =
      profile?.expectedUnits?.[sym] !== undefined
        ? profile.expectedUnits[sym]
        : req.expectedUnits?.[sym] ?? null;
    if (
      expected != null &&
      expected !== '' &&
      found.unit != null &&
      found.unit !== '' &&
      expected !== found.unit
    ) {
      unitConflicts.push({ symbol: sym, expected, actual: found.unit });
    }
    substituted[sym] = found.value;
  }

  if (missing.length > 0) {
    return {
      kind: 'manual_required',
      reason: `Fehlende oder leere Eingaben: ${missing.join(', ')}`,
      missing,
      rewrite: rewrite ?? undefined,
    };
  }
  if (unitConflicts.length > 0) {
    return {
      kind: 'manual_required',
      reason: 'Einheiten-Konflikt — die Eingaben passen nicht zu den erwarteten Einheiten.',
      unitConflicts,
      rewrite: rewrite ?? undefined,
    };
  }

  // 3. Evaluate the RHS via mathjs.
  const expression = rhs(formulaInUse);
  if (!expression) {
    return { kind: 'error', message: 'Konnte RHS nicht extrahieren.' };
  }

  // Constants (e.g. `pi`) are injected into the scope alongside the resolved
  // input values. They are NOT recorded as substituted inputs in the
  // returned state — the engineer-facing UI surfaces variable substitutions,
  // not language-level constants.
  const scope: Record<string, number> = profile?.constants
    ? { ...substituted, ...profile.constants }
    : substituted;

  try {
    const result = evalExpression(expression, scope);
    return {
      kind: 'computed',
      value: result,
      substituted,
      formulaEvaluated: expression,
      rewrite: rewrite ?? undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Formel-Auswertung fehlgeschlagen';
    // An unknown-symbol error from the arithmetic evaluator means the formula
    // references something the rewrite layer didn't supply — treat it as
    // manual_required, not error, so the engineer sees a useful badge.
    if (/Unbekanntes Symbol|Funktionsaufruf/.test(msg)) {
      return {
        kind: 'manual_required',
        reason: msg,
        rewrite: rewrite ?? undefined,
      };
    }
    return { kind: 'error', message: msg };
  }
}
