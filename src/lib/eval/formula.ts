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
// fully auditable in this repo. Unsupported function calls (e.g. SUM(...))
// throw — such formulas need a rewrite rule OR a registered aggregator.
// Plan 2a: row functions (`sum_rows(...)` etc.) evaluate against prepared
// registers passed in `EvalRequest.registers`.
import { evalExpression } from './arithmetic';
import { rewriteRules } from './rewrites';
import { aggregators, type AggregatorContext } from './aggregators';
import { equationProfiles } from './equation-profiles';
import { normalizeFormula, normalizeSymbols } from './normalize-formula';
import { triageParseFailure } from './parse-failure-triage';
import {
  EXPR_FUNCTION_NAMES,
  isConditionNode,
  parseExpression,
  type PreparedRegister,
  type Scope,
} from '@/lib/expr';

/** Whitespace-insensitive equality for the rewrite-bridge guard. */
const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();

/**
 * Calls that mark an expression as a unified-language expression (row / logic /
 * rounding functions). The classic seven math names are excluded so a plain
 * arithmetic formula like `sqrt(a) > b` keeps the legacy criterion sniff.
 * Built from the evaluator's own registry so it cannot drift.
 */
const CLASSIC_MATH = new Set(['ln', 'log10', 'sqrt', 'exp', 'abs', 'min', 'max']);
const CALL_NAMES = [...EXPR_FUNCTION_NAMES].filter((n) => !CLASSIC_MATH.has(n));
const HAS_CALL = new RegExp(`\\b(?:${CALL_NAMES.join('|')})\\s*\\(`, 'i');

/** Failure messages of the unified tokenizer / parser (src/lib/expr/tokens.ts, parser.ts). */
const PARSE_FAILURE =
  /^(?:Unerwartetes Zeichen|Unerwartetes Token am Ende|Ungültige Zahl|Nicht abgeschlossene Zeichenkette|Fehlende schließende Klammer|Ausdruck endet vorzeitig|Ausdruck erwartet|Ausdruck zu tief verschachtelt)/;

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

/** Structured governing-duration outputs produced by the basin (A138-13) Gl.8
 * engine when it successfully iterates. Consumers (A138-10 and downstream)
 * read these values by reference instead of re-running the iteration. Only
 * present on the `computed` path when the basin profile successfully iterates
 * (i.e. NOT on the `manual_required` / cistern-only / error paths). */
export type AggregatorDerivedExtras = {
  /** Governing duration [min] — the duration that maximises V_VA. */
  D_gov: number;
  /** Design rainfall intensity at the governing duration [l/(s·ha)]. */
  r_D_gov: number;
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
      /** Structured governing-duration extras from the basin Gl.8 aggregator.
       * Present only when the basin successfully iterates (not on manual_required
       * or error paths). Consumers read D_gov / r_D_gov by reference. */
      derivedExtras?: AggregatorDerivedExtras;
      /** Non-blocking caveats on an otherwise-computed value (e.g. the governing
       *  duration is boundary-limited). Rendered as an amber note, NOT a hard stop. */
      warnings?: string[];
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
  /** Plan 2a: prepared registers by symbol (row sets for `sum_rows()` & co.).
   * A symbol present here is NOT looked up as a number and NOT reported as a
   * missing input. */
  registers?: Record<string, PreparedRegister>;
  /** Regulation-table lookup for `lookup()` inside the formula. */
  tableLookup?: Scope['table'];
  /** Raw json carriers by symbol for `contains()` / `cell()`. */
  carriers?: Record<string, unknown>;
};

/** Strip the LHS up to the first comparison operator so the parser sees
 * only the RHS expression. Handles `=`, `>=`, `<=`, `>`, `<` — equations
 * of the form `<lhs> ≥ <rhs>` are interpreted as "the engine returns the
 * RHS value", which is exactly the minimum (≥) or maximum (≤) the engineer
 * must satisfy. */
function rhs(formula: string): string {
  // collapse newlines to spaces so a single-line regex covers multi-line input
  const flat = formula.replace(/\s+/g, ' ');
  const m = flat.match(/^\s*[A-Za-z_][\w()]*\s*(?:>=|<=|=|>|<)\s*(.+)\s*$/);
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

  // 1. Apply rewrite if registered for this equation id. A deploy-safety
  // bridge (rewrites.ts) is skipped once the stored formula already equals
  // its `to` (whitespace-insensitive) — after the migration lands the card
  // shows no substitution.
  const bridge = rewriteRules[req.equationId];
  const rewrite = bridge && norm(bridge.to) !== norm(req.formula) ? bridge : undefined;
  const formulaInUse = rewrite ? rewrite.to : req.formula;
  // Normalise the formula's input-symbol list (source-formatting quirks like
  // `r_D(n)` → `r_D_n`) so callers can pass the raw DB list verbatim and the
  // evaluator's lookups still match what the parsed expression sees.
  const symbolsNeeded = rewrite
    ? Object.values(rewrite.remap)
    : normalizeSymbols(req.inputSymbols);

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
    // Registers / raw carriers are row sets, not numbers: they are resolved
    // by the expression evaluator itself and never enter `substituted`.
    if (req.registers?.[sym] !== undefined || req.carriers?.[sym] !== undefined) continue;
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

  // 3. Evaluate the RHS via the in-tree arithmetic engine. Pre-normalise
  // source-formatting quirks like `r_D(n)` → `r_D_n` so the parser doesn't
  // mistake them for unsupported function calls.
  const expression = normalizeFormula(rhs(formulaInUse));
  if (!expression) {
    return { kind: 'error', message: 'Konnte RHS nicht extrahieren.' };
  }

  // A formula whose extracted RHS is fundamentally a COMPARISON / BOOLEAN CRITERION rather than a
  // computable arithmetic value — a two-sided range (`a <= x <= b`), an `AND`/`OR` conjunction, a
  // conditional (`when`/`then`), a multi-variant (`|`), or a chemical reaction (`->`) — is not an
  // equation the engine can evaluate to a number; it is a check the engineer verifies (usually also
  // enforced by a compliance gate / field validation). Classify it as manual_required (an actionable
  // "manuell prüfen" badge) instead of a hard red "error" pill. A valid computable RHS never contains
  // a comparison operator or a boolean/conditional keyword (min/max use `,`; powers use `^`).
  //
  // Plan 2a: an expression that uses a row/logic/rounding call (`if(a > b, a, b)`,
  // `sum_rows(reg, if(kind == 'paved', …))`) legitimately contains comparison
  // operators. For those the classification comes from the parser: the parsed
  // root is a condition node ⇒ criterion; otherwise it is a numeric expression.
  // A parse failure falls back to the textual sniff (and then to the evaluator's
  // own error, which surfaces as `error`).
  const parsed = HAS_CALL.test(expression) ? parseExpression(expression) : null;
  const isCriterion = parsed
    ? isConditionNode(parsed)
    : /[<>]|\bAND\b|\bOR\b|\bwhen\b|\bthen\b|\|/i.test(expression);
  if (isCriterion) {
    return {
      kind: 'manual_required',
      reason: 'Vergleichs-/Kriteriumsformel — kein berechenbarer Zahlenwert; manuell prüfen.',
      rewrite: rewrite ?? undefined,
    };
  }

  // Constants (e.g. `pi`) are injected into the scope alongside the resolved
  // input values. They are NOT recorded as substituted inputs in the
  // returned state — the engineer-facing UI surfaces variable substitutions,
  // not language-level constants.
  const scope: Record<string, number> = profile?.constants
    ? { ...substituted, ...profile.constants }
    : substituted;

  try {
    const result = evalExpression(expression, scope, {
      registers: req.registers,
      table: req.tableLookup,
      carriers: req.carriers,
    });
    return {
      kind: 'computed',
      value: result,
      substituted,
      formulaEvaluated: expression,
      rewrite: rewrite ?? undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Formel-Auswertung fehlgeschlagen';
    // Engineer-recoverable conditions (the formula is sound, the inputs land
    // it in an undefined-numeric corner) become manual_required so the
    // engineer sees an actionable badge instead of a red "error" pill:
    //   - Unbekanntes Symbol / Funktionsaufruf : rewrite layer didn't supply
    //     a referenced symbol
    //   - Division durch Null                  : a denominator hit 0 — likely
    //     a missing or placeholder input value
    //   - Nicht-endliches Ergebnis             : 0^(neg), (-x)^fractional,
    //     and similar pow/log domain edges
    //   - Keine vollständigen Zeilen / Fehlende Eingabe / lookup() /
    //     stdev_rows() / Operand ist keine Zahl : Plan 2a row-function data
    //     conditions (empty register, null cell, no table row) — data, not
    //     a malformed formula
    //   - Erwarte … Argument(e)                : a supported call with the wrong
    //     arity. Legacy parity holds only for calls the legacy engine did NOT
    //     know (every Plan-2a registry function — `lookup`, `if`, the row
    //     functions — failed there as `Funktionsaufruf …` = manual_required;
    //     pinned by DWA-M-1200-1 EQ-001 in formula-parse-failure-triage.test.ts).
    //     A mis-arity LEGACY math call (`sqrt(a, b)`, `min(a)`) was a parse
    //     failure in the old engine (`Erwarte ',' …` / `Fehlende schließende
    //     Klammer …` → error); it is manual_required here on purpose — an
    //     authoring defect the engineer can act on, not an engine fault
    if (
      /Unbekanntes Symbol|Funktionsaufruf|Division durch Null|Nicht-endliches Ergebnis|Keine vollständigen Zeilen|Fehlende Eingabe|lookup\(\)|stdev_rows\(\)|Operand ist keine Zahl|^Erwarte .*Argument\(e\)/.test(
        msg,
      )
    ) {
      return {
        kind: 'manual_required',
        reason: msg,
        rewrite: rewrite ?? undefined,
      };
    }
    // A tokenizer/parser failure: the legacy engine failed EAGERLY (unsupported
    // call / unknown symbol in left-to-right order, before later garbage), and
    // those two conditions were manual_required. Replay that order so the
    // classification of a malformed source formula does not depend on which
    // grammar reports first (fix-wave item 2; DWA-M-816 ×19, DWA-A-272E RULE-11).
    if (PARSE_FAILURE.test(msg)) {
      const known = (sym: string): boolean =>
        Object.hasOwn(scope, sym) || req.registers?.[sym] !== undefined || req.carriers?.[sym] !== undefined;
      const triaged = triageParseFailure(expression, known);
      if (triaged) {
        return { kind: 'manual_required', reason: triaged.reason, rewrite: rewrite ?? undefined };
      }
    }
    return { kind: 'error', message: msg };
  }
}
